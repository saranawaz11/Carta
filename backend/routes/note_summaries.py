from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.auth import get_current_user_id
from core.db import get_db
from schemas import DeadlineOut, SummaryOut, SummaryRequest
from services import note_summaries as service

router = APIRouter(prefix="/api/notes/{note_id}/summary", tags=["summaries"])


@router.get("", response_model=SummaryOut | None)
def get_summary(
    note_id: UUID,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return service.get(db, note_id, clerk_user_id)


@router.post("", response_model=SummaryOut)
def generate_summary(
    note_id: UUID,
    request: SummaryRequest,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return service.generate(db, note_id, clerk_user_id, request.now, request.timezone)


@router.delete("/deadlines/{index}", response_model=list[DeadlineOut])
def remove_deadline(
    note_id: UUID,
    index: int,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return service.remove_deadline(db, note_id, clerk_user_id, index)


@router.post("/deadlines/{index}/task", response_model=list[DeadlineOut])
def add_deadline_task(
    note_id: UUID,
    index: int,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return service.add_deadline_task(db, note_id, clerk_user_id, index)
