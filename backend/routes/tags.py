from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.auth import get_current_user_id
from core.db import get_db
from services import notes as service

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=list[str])
def list_tags(
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return service.list_tags(db, clerk_user_id)
