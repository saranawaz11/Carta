import asyncio
import base64
import json
import logging
from contextlib import suppress
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from websockets.exceptions import ConnectionClosed

from llm import open_transcription_session

MAX_FRAME_BYTES = 64 * 1024
SESSION_SECONDS = 5 * 60
logger = logging.getLogger(__name__)
_active_users: set[str] = set()
_active_users_lock = asyncio.Lock()


async def _notify(websocket: WebSocket, message: str) -> None:
    with suppress(WebSocketDisconnect, RuntimeError):
        await websocket.send_json({"type": "error", "message": message})


async def relay_transcription(websocket: WebSocket, clerk_user_id: str) -> None:
    async with _active_users_lock:
        if clerk_user_id in _active_users:
            await _notify(websocket, "A dictation session is already active.")
            await websocket.close(code=4409)
            return
        _active_users.add(clerk_user_id)

    upstream = None
    try:
        try:
            upstream = await open_transcription_session()
        except Exception:
            logger.exception("Could not open OpenAI transcription session")
            await _notify(websocket, "Unable to connect to the transcription service.")
            await websocket.close(code=1011)
            return
        await websocket.send_json({"type": "ready"})

        audio_state: dict[str, Any] = {
            "bytes": 0,
            "items": set(),
            "committed": asyncio.Event(),
            "condition": asyncio.Condition(),
        }
        ordered_items: list[str] = []
        item_orders: dict[str, int] = {}

        async def receive_client() -> None:
            while True:
                frame = await websocket.receive()
                if frame["type"] == "websocket.disconnect":
                    return
                if frame.get("bytes") is not None:
                    audio = frame["bytes"]
                    if len(audio) > MAX_FRAME_BYTES or len(audio) % 2:
                        await _notify(websocket, "Invalid or oversized audio frame.")
                        await websocket.close(code=1009)
                        return
                    audio_state["bytes"] += len(audio)
                    await upstream.send(
                        json.dumps(
                            {
                                "type": "input_audio_buffer.append",
                                "audio": base64.b64encode(audio).decode("ascii"),
                            }
                        )
                    )
                    continue
                text = frame.get("text")
                if text is None:
                    continue
                try:
                    message = json.loads(text)
                except json.JSONDecodeError:
                    await _notify(websocket, "Invalid transcription control message.")
                    return
                if message.get("type") != "stop":
                    await _notify(websocket, "Unsupported transcription control message.")
                    return

                if audio_state["bytes"]:
                    audio_state["committed"].clear()
                    await upstream.send(json.dumps({"type": "input_audio_buffer.commit"}))
                    try:
                        await asyncio.wait_for(audio_state["committed"].wait(), timeout=5)
                    except TimeoutError:
                        await _notify(websocket, "The final phrase could not be confirmed.")
                        return
                condition: asyncio.Condition = audio_state["condition"]
                try:
                    async with condition:
                        await asyncio.wait_for(
                            condition.wait_for(lambda: not audio_state["items"]),
                            timeout=5,
                        )
                except TimeoutError:
                    await _notify(websocket, "The final phrase could not be confirmed.")
                    return
                await websocket.send_json({"type": "stopped"})
                return

        async def receive_upstream() -> None:
            async for raw_event in upstream:
                try:
                    event = json.loads(raw_event)
                except (TypeError, json.JSONDecodeError):
                    continue
                event_type = event.get("type")
                if event_type == "input_audio_buffer.committed":
                    audio_state["bytes"] = 0
                    item_id = event.get("item_id")
                    if isinstance(item_id, str):
                        previous_id = event.get("previous_item_id")
                        if item_id not in ordered_items:
                            if previous_id in ordered_items:
                                ordered_items.insert(ordered_items.index(previous_id) + 1, item_id)
                            else:
                                ordered_items.append(item_id)
                            item_orders.update(
                                {known_id: index for index, known_id in enumerate(ordered_items)}
                            )
                        audio_state["items"].add(item_id)
                        audio_state["committed"].set()
                    continue
                if event_type == "conversation.item.input_audio_transcription.delta":
                    item_id = event.get("item_id")
                    if not isinstance(item_id, str):
                        continue
                    await websocket.send_json(
                        {
                            "type": "delta",
                            "item_id": item_id,
                            "text": event.get("delta", ""),
                            "order": item_orders.get(item_id, len(item_orders)),
                        }
                    )
                elif event_type == "conversation.item.input_audio_transcription.completed":
                    item_id = event.get("item_id")
                    if not isinstance(item_id, str):
                        continue
                    await websocket.send_json(
                        {
                            "type": "completed",
                            "item_id": item_id,
                            "text": event.get("transcript", ""),
                            "order": item_orders.get(item_id, len(item_orders)),
                        }
                    )
                    condition = audio_state["condition"]
                    async with condition:
                        audio_state["items"].discard(item_id)
                        condition.notify_all()
                elif event_type == "error":
                    await _notify(websocket, "The transcription service returned an error.")
                    return

        client_task = asyncio.create_task(receive_client())
        upstream_task = asyncio.create_task(receive_upstream())
        try:
            done, _ = await asyncio.wait(
                {client_task, upstream_task},
                timeout=SESSION_SECONDS,
                return_when=asyncio.FIRST_COMPLETED,
            )
            if not done:
                await _notify(websocket, "Dictation session limit reached (5 minutes).")
                try:
                    await asyncio.wait_for(client_task, timeout=5)
                except TimeoutError:
                    await websocket.close(code=4408)
                return
            for task in done:
                try:
                    task.result()
                except (WebSocketDisconnect, ConnectionClosed):
                    pass
        finally:
            for task in (client_task, upstream_task):
                if not task.done():
                    task.cancel()
            await asyncio.gather(client_task, upstream_task, return_exceptions=True)
    except (WebSocketDisconnect, ConnectionClosed):
        pass
    except Exception:
        logger.exception("Transcription relay failed")
        await _notify(websocket, "The transcription connection was lost. Start again.")
    finally:
        if upstream is not None:
            with suppress(Exception):
                await upstream.close()
        async with _active_users_lock:
            _active_users.discard(clerk_user_id)
