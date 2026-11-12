import re
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

import llm
from repositories import note_chunks as chunks_repository
from repositories import notes as notes_repository
from repositories import tasks as tasks_repository
from schemas import CaptureRequest, CaptureCreated
from services import embedding, notes as notes_service, tasks as tasks_service
from services.tasks import TaskDateResolutionError

SYNC_BATCH = 5


def _clean_title(title: str | None) -> str:
    title = (title or "").strip().strip("\"'").rstrip(".")
    return title[:80].rstrip()


def _derive_title(content: str) -> str:
    first = re.split(r"(?<=[.!?])\s|\n", content.strip(), maxsplit=1)[0].strip()
    return first if len(first) <= 60 else first[:57].rstrip() + "..."


def _is_multi_part(text: str) -> bool:
    """True when the capture has several paragraphs/sentences, so it is more than a bare reminder."""
    stripped = text.strip()
    if "\n" in stripped:
        return True
    return len(re.findall(r"[.!?](?:\s|$)", stripped)) > 1


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

    try:
        extraction = llm.extract_capture(
            request.text,
            request.now.isoformat(),
            request.timezone,
        )
    except Exception as error:
        return {
            "outcome": "message",
            "message": f"I couldn't process that capture: {str(error)}",
        }

    if extraction.clarification:
        return {
            "outcome": "message",
            "message": extraction.clarification,
        }

    created_note = None
    created_tasks = []
    partial_errors = []

    note_content = extraction.note_content
    if not note_content and _is_multi_part(request.text):
        note_content = request.text.strip()

    if note_content:
        try:
            created_note = notes_service.create_note(
                db,
                clerk_user_id,
                background,
                title=_clean_title(extraction.note_title) or _derive_title(note_content),
                content=note_content,
            )
        except Exception as error:
            partial_errors.append(f"Note creation failed: {str(error)}")

    for candidate in extraction.tasks:
        try:
            task = tasks_service.create_task_from_candidate(
                db, clerk_user_id, candidate, request.timezone
            )
            created_tasks.append(task)
        except TaskDateResolutionError as error:
            partial_errors.append(f"Task '{candidate.title}' failed: {str(error)}")
        except Exception as error:
            partial_errors.append(f"Task '{candidate.title}' failed: {str(error)}")

    if created_note or created_tasks:
        result = {
            "outcome": "capture_created",
            "capture": CaptureCreated(
                note=created_note,
                tasks=created_tasks,
            ),
        }
        if partial_errors:
            result["message"] = "; ".join(partial_errors)
        return result

    if partial_errors:
        return {
            "outcome": "message",
            "message": "; ".join(partial_errors),
        }

    return {
        "outcome": "message",
        "message": "I couldn't match that to exactly one note.",
    }
