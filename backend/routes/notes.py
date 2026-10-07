from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Response, status
from sqlalchemy.orm import Session

from core.auth import get_current_user_id
from core.db import get_db
from schemas import NoteOut, NoteUpdate
from services import notes as notes_service

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(
    background: BackgroundTasks,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return notes_service.create_note(db, clerk_user_id, background)


@router.get("", response_model=list[NoteOut])
def list_notes(
    status: Literal["active", "archived", "deleted"] = "active",
    q: str | None = None,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return notes_service.list_notes(db, clerk_user_id, status, q)


@router.get("/{note_id}", response_model=NoteOut)
def get_note(
    note_id: UUID,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return notes_service.get_note(db, note_id, clerk_user_id)


@router.patch("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: UUID,
    changes: NoteUpdate,
    background: BackgroundTasks,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return notes_service.update_note(db, note_id, clerk_user_id, changes, background)


@router.post("/{note_id}/archive", response_model=NoteOut)
def archive_note(
    note_id: UUID,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return notes_service.archive_note(db, note_id, clerk_user_id)


@router.post("/{note_id}/unarchive", response_model=NoteOut)
def unarchive_note(
    note_id: UUID,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return notes_service.unarchive_note(db, note_id, clerk_user_id)


@router.post("/{note_id}/delete", response_model=NoteOut)
def delete_note(
    note_id: UUID,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return notes_service.delete_note(db, note_id, clerk_user_id)


@router.post("/{note_id}/restore", response_model=NoteOut)
def restore_note(
    note_id: UUID,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return notes_service.restore_note(db, note_id, clerk_user_id)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def permanently_delete_note(
    note_id: UUID,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    notes_service.permanently_delete_note(db, note_id, clerk_user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
