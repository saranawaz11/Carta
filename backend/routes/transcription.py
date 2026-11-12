import asyncio
import json
from contextlib import suppress

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.auth import verify_clerk_token
from services.transcription import relay_transcription

router = APIRouter()


@router.websocket("/ws/transcribe")
async def transcribe(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        auth_text = await asyncio.wait_for(websocket.receive_text(), timeout=5)
        auth_message = json.loads(auth_text)
        if (
            not isinstance(auth_message, dict)
            or auth_message.get("type") != "auth"
            or not isinstance(auth_message.get("token"), str)
        ):
            await websocket.close(code=4401)
            return
    except (TimeoutError, ValueError, TypeError, WebSocketDisconnect):
        with suppress(RuntimeError):
            await websocket.close(code=4401)
        return
    try:
        clerk_user_id = verify_clerk_token(auth_message["token"])
    except Exception:
        with suppress(RuntimeError):
            await websocket.close(code=4401)
        return

    try:
        await relay_transcription(websocket, clerk_user_id)
    finally:
        with suppress(RuntimeError):
            await websocket.close()
