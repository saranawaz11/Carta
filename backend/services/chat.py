from collections.abc import Iterator
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

import llm
from repositories import note_chunks as chunks_repository
from repositories import notes as notes_repository
from schemas import ChatRequest, NoteUpdate
from services import embedding, notes as notes_service

SYNC_BATCH = 5


def ask(
    db: Session,
    clerk_user_id: str,
    request: ChatRequest,
    background: BackgroundTasks,
) -> Iterator[dict[str, Any]]:
    for note_id in chunks_repository.notes_needing_sync(
        db, clerk_user_id, SYNC_BATCH
    ):
        embedding.sync_note(db, note_id)

    def search(vector: list[float], limit: int, user_id: str) -> list[dict]:
        return chunks_repository.similar_chunks(db, user_id, vector, limit)

    def create(title: str, content: str, user_id: str):
        return notes_service.create_note(
            db, user_id, background, title=title, content=content
        )

    def get_note(note_id: UUID, user_id: str):
        return notes_repository.get_note(db, note_id, user_id)

    pending = request.pending_action

    def resolve(decision: str) -> dict[str, Any]:
        if pending is None or decision != "confirm":
            return {
                "decision": "cancel",
                "executed": False,
                "message": "Okay, I left the note unchanged.",
            }
        try:
            result = confirm(
                db,
                clerk_user_id,
                pending.action,
                pending.note_id,
                pending.expected_updated_at,
                pending.changes,
                background,
            )
        except HTTPException as error:
            return {
                "decision": "confirm",
                "executed": False,
                "message": f"Could not apply the action: {error.detail}",
            }
        return {
            "decision": "confirm",
            "executed": True,
            "message": result["message"],
        }

    configurable = {
        "user_id": clerk_user_id,
        "similar_chunks": search,
        "create_note": create,
        "get_note": get_note,
        "resolve_action": resolve,
        "pending_action": pending.model_dump(mode="json") if pending else None,
    }
    yield from llm.stream_chat_graph(
        request.question,
        [message.model_dump() for message in request.history[-6:]],
        configurable,
    )


def confirm(
    db: Session,
    user_id: str,
    action: str,
    note_id: UUID,
    expected_updated_at: datetime,
    changes: dict[str, str],
    background: BackgroundTasks,
) -> dict[str, Any]:
    if action not in {"update", "archive", "delete"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unknown note action",
        )

    note = notes_service.get_note(db, note_id, user_id)
    if note.updated_at != expected_updated_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Note changed since this action was proposed. Review it and try again.",
        )
    if action == "update":
        note = notes_service.update_note(
            db,
            note_id,
            user_id,
            NoteUpdate.model_validate(changes),
            background,
            expected_updated_at,
        )
        message = "Note updated."
    elif action == "archive":
        note = notes_service.archive_note(
            db, note_id, user_id, expected_updated_at
        )
        message = "Note archived."
    else:
        note = notes_service.delete_note(
            db, note_id, user_id, expected_updated_at
        )
        message = "Note deleted."
    return {"message": message, "note": note}
