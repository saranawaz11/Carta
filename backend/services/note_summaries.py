from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import llm
from repositories import note_chunks as chunks_repository
from repositories import notes as notes_repository
from repositories import note_summaries as summaries_repository
from services import embedding
from services import notes as notes_service
from services import tasks as tasks_service

SNIPPET_CHARS = 200


def _live_note(db: Session, note_id: UUID, clerk_user_id: str):
    note = notes_service.get_note(db, note_id, clerk_user_id)
    if note.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")
    return note


def _deadlines_out(db: Session, clerk_user_id: str, deadlines: list[dict]) -> list[dict]:
    return [
        {
            **item,
            "already_in_tasks": tasks_service.find_duplicate(
                db, clerk_user_id, item["title"], datetime.fromisoformat(item["due_at"])
            )
            is not None,
        }
        for item in deadlines
    ]


def _present(db: Session, note, summary, clerk_user_id: str) -> dict:
    connections = []
    for item in summary.connections:
        other = notes_repository.get_note(
            db, UUID(item["note_id"]), clerk_user_id
        )
        if other is not None and other.deleted_at is None:
            connections.append(
                {"note_id": other.id, "title": other.title, "reason": item["reason"]}
            )
    return {
        "overview": summary.overview,
        "key_points": summary.key_points,
        "deadlines": _deadlines_out(db, clerk_user_id, summary.deadlines),
        "connections": connections,
        "stale": summary.content_hash
        != embedding.compute_hash(note.title, note.content),
        "generated_at": summary.generated_at,
    }


def get(db: Session, note_id: UUID, clerk_user_id: str) -> dict | None:
    note = _live_note(db, note_id, clerk_user_id)
    summary = summaries_repository.get_summary(db, note_id, clerk_user_id)
    return _present(db, note, summary, clerk_user_id) if summary else None


def _clean_deadlines(items, zone: ZoneInfo) -> list[dict]:
    cleaned = []
    for item in items:
        try:
            due = datetime.fromisoformat(item.due_at)
        except ValueError:
            continue
        if due.tzinfo is None:
            due = due.replace(tzinfo=zone)
        due = due.astimezone(zone)
        if not item.due_has_time:
            due = due.replace(hour=0, minute=0, second=0, microsecond=0)
        title = item.title.strip()
        if title:
            cleaned.append(
                {"title": title, "due_at": due.isoformat(), "due_has_time": item.due_has_time}
            )
    return cleaned


def generate(
    db: Session, note_id: UUID, clerk_user_id: str, now: datetime, timezone_name: str
) -> dict:
    note = _live_note(db, note_id, clerk_user_id)
    if not note.content.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Note is empty")
    embedding.sync_note(db, note_id)
    candidates = [
        {
            "id": str(c["id"]),
            "title": c["title"],
            "snippet": c["content"][:SNIPPET_CHARS],
        }
        for c in chunks_repository.similar_notes(db, note_id, clerk_user_id, 3)
    ]
    result = llm.summarize_note(
        note.title, note.content, now.isoformat(), timezone_name, candidates
    )
    allowed = {c["id"] for c in candidates}
    seen: set[str] = set()
    connections = []
    for item in result.connections:
        if item.note_id in allowed and item.note_id not in seen:
            seen.add(item.note_id)
            connections.append({"note_id": item.note_id, "reason": item.reason})
    summary = summaries_repository.upsert_summary(
        db,
        note_id,
        clerk_user_id,
        {
            "overview": result.overview,
            "key_points": result.key_points,
            "deadlines": _clean_deadlines(result.deadlines, ZoneInfo(timezone_name)),
            "connections": connections[:3],
            "content_hash": embedding.compute_hash(note.title, note.content),
        },
    )
    return _present(db, note, summary, clerk_user_id)


def _summary_and_deadline(db: Session, note_id: UUID, clerk_user_id: str, index: int):
    _live_note(db, note_id, clerk_user_id)
    summary = summaries_repository.get_summary(db, note_id, clerk_user_id)
    if summary is None or not 0 <= index < len(summary.deadlines):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deadline not found")
    return summary, summary.deadlines[index]


def remove_deadline(
    db: Session, note_id: UUID, clerk_user_id: str, index: int
) -> list[dict]:
    summary, _ = _summary_and_deadline(db, note_id, clerk_user_id, index)
    remaining = [d for i, d in enumerate(summary.deadlines) if i != index]
    summaries_repository.set_deadlines(db, summary, remaining)
    return _deadlines_out(db, clerk_user_id, remaining)


def add_deadline_task(
    db: Session, note_id: UUID, clerk_user_id: str, index: int
) -> list[dict]:
    summary, deadline = _summary_and_deadline(db, note_id, clerk_user_id, index)
    tasks_service.create_task(
        db,
        clerk_user_id,
        deadline["title"],
        datetime.fromisoformat(deadline["due_at"]),
        deadline["due_has_time"],
        source_note_id=note_id,
    )
    return _deadlines_out(db, clerk_user_id, summary.deadlines)
