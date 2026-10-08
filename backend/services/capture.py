from typing import Any
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

import llm
from repositories import note_chunks as chunks_repository
from repositories import notes as notes_repository
from repositories import tasks as tasks_repository
from schemas import CaptureRequest
from services import embedding, notes as notes_service, tasks as tasks_service

SYNC_BATCH = 5


def capture(
    db: Session,
    clerk_user_id: str,
    request: CaptureRequest,
    background: BackgroundTasks,
) -> dict[str, Any]:
    for note_id in chunks_repository.notes_needing_sync(
        db, clerk_user_id, SYNC_BATCH
    ):
        embedding.sync_note(db, note_id)

    configurable = {
        "user_id": clerk_user_id,
        "similar_chunks": lambda vector, limit, user_id: (
            chunks_repository.similar_chunks(db, user_id, vector, limit)
        ),
        "create_note": lambda title, content, user_id: notes_service.create_note(
            db, user_id, background, title=title, content=content
        ),
        "create_task": lambda title, due_at, due_has_time, user_id: (
            tasks_service.create_task(db, user_id, title, due_at, due_has_time)
        ),
        "get_note": lambda note_id, user_id: notes_repository.get_note(
            db, note_id, user_id
        ),
    }
    result = llm.run_capture_graph(
        request.text, request.now.isoformat(), request.timezone, configurable
    )

    if result["pending_action"]:
        return {
            "outcome": "pending_action",
            "pending_action": result["pending_action"],
            "message": result["message"] or None,
        }
    if result["task_id"]:
        task = tasks_repository.get_task(db, UUID(result["task_id"]), clerk_user_id)
        return {"outcome": "task_created", "task": task}
    if result["note_id"]:
        note = notes_repository.get_note(db, UUID(result["note_id"]), clerk_user_id)
        return {"outcome": "note_created", "note": note}
    return {
        "outcome": "message",
        "message": result["message"] or "I couldn't match that to exactly one note.",
    }
