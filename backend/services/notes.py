from datetime import datetime
from uuid import UUID

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from repositories import note_chunks as chunks_repository
from repositories import notes as notes_repository
from schemas import NoteUpdate
from services import embedding

_STALE_ACTION_DETAIL = (
    "Note changed since this action was proposed. Review it and try again."
)


def create_note(
    db: Session,
    clerk_user_id: str,
    background: BackgroundTasks,
    title: str = "",
    content: str = "",
):
    note = notes_repository.create_note(db, clerk_user_id, title, content)
    background.add_task(embedding.sync_note_in_background, note.id)
    return note


def get_note(db: Session, note_id: UUID, clerk_user_id: str):
    note = notes_repository.get_note(db, note_id, clerk_user_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


def list_notes(
    db: Session, clerk_user_id: str, state: str, query: str | None
):
    if state == "deleted":
        notes_repository.purge_expired_notes(db, clerk_user_id)
    return notes_repository.list_notes(db, clerk_user_id, state, query)


def update_note(
    db: Session,
    note_id: UUID,
    clerk_user_id: str,
    changes: NoteUpdate,
    background: BackgroundTasks,
    expected_updated_at: datetime | None = None,
):
    note = get_note(db, note_id, clerk_user_id)
    if expected_updated_at is not None and note.updated_at != expected_updated_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_STALE_ACTION_DETAIL,
        )
    if note.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deleted notes cannot be edited",
        )
    values = changes.model_dump(exclude_unset=True)
    values["content_hash"] = embedding.compute_hash(
        values.get("title", note.title), values.get("content", note.content)
    )
    updated = notes_repository.update_note(
        db,
        note_id,
        clerk_user_id,
        values,
        expected_state="not_deleted",
        expected_updated_at=expected_updated_at,
    )
    if updated is None:
        current = notes_repository.get_note(db, note_id, clerk_user_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
            )
        if (
            expected_updated_at is not None
            and current.updated_at != expected_updated_at
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_STALE_ACTION_DETAIL,
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deleted notes cannot be edited",
        )
    background.add_task(embedding.sync_note_in_background, note_id)
    return updated


def _transition(
    db: Session,
    note_id: UUID,
    clerk_user_id: str,
    *,
    expected: str,
    changes: dict[str, object],
    expected_updated_at: datetime | None = None,
):
    note = get_note(db, note_id, clerk_user_id)
    if expected_updated_at is not None and note.updated_at != expected_updated_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_STALE_ACTION_DETAIL,
        )
    valid = (
        expected == "active"
        and note.deleted_at is None
        and note.archived_at is None
    ) or (
        expected == "archived"
        and note.deleted_at is None
        and note.archived_at is not None
    ) or (expected == "deleted" and note.deleted_at is not None)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invalid note state transition",
        )
    updated = notes_repository.update_note(
        db,
        note_id,
        clerk_user_id,
        changes,
        expected_state=expected,
        expected_updated_at=expected_updated_at,
    )
    if updated is None:
        current = notes_repository.get_note(db, note_id, clerk_user_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
            )
        if (
            expected_updated_at is not None
            and current.updated_at != expected_updated_at
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_STALE_ACTION_DETAIL,
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invalid note state transition",
        )
    return updated


def archive_note(
    db: Session,
    note_id: UUID,
    clerk_user_id: str,
    expected_updated_at: datetime | None = None,
):
    return _transition(
        db,
        note_id,
        clerk_user_id,
        expected="active",
        changes={"archived_at": func.now()},
        expected_updated_at=expected_updated_at,
    )


def unarchive_note(db: Session, note_id: UUID, clerk_user_id: str):
    return _transition(
        db,
        note_id,
        clerk_user_id,
        expected="archived",
        changes={"archived_at": None},
    )


def delete_note(
    db: Session,
    note_id: UUID,
    clerk_user_id: str,
    expected_updated_at: datetime | None = None,
):
    note = get_note(db, note_id, clerk_user_id)
    if expected_updated_at is not None and note.updated_at != expected_updated_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_STALE_ACTION_DETAIL,
        )
    if note.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Note is already deleted",
        )
    updated = notes_repository.update_note(
        db,
        note_id,
        clerk_user_id,
        {"deleted_at": func.now()},
        expected_state="not_deleted",
        expected_updated_at=expected_updated_at,
    )
    if updated is None:
        current = notes_repository.get_note(db, note_id, clerk_user_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
            )
        if (
            expected_updated_at is not None
            and current.updated_at != expected_updated_at
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_STALE_ACTION_DETAIL,
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Note is already deleted",
        )
    chunks_repository.delete_chunks(db, note_id)
    return updated


def restore_note(db: Session, note_id: UUID, clerk_user_id: str):
    return _transition(
        db,
        note_id,
        clerk_user_id,
        expected="deleted",
        changes={"deleted_at": None, "archived_at": None},
    )


def permanently_delete_note(db: Session, note_id: UUID, clerk_user_id: str) -> None:
    get_note(db, note_id, clerk_user_id)
    if not notes_repository.permanently_delete_note(db, note_id, clerk_user_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only deleted notes can be permanently deleted",
        )
