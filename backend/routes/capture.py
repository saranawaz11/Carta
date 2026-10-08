from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from core.auth import get_current_user_id
from core.db import get_db
from schemas import CaptureRequest, CaptureResponse
from services import capture as capture_service

router = APIRouter(prefix="/api/capture", tags=["capture"])


@router.post("", response_model=CaptureResponse)
def capture(
    request: CaptureRequest,
    background: BackgroundTasks,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return capture_service.capture(db, clerk_user_id, request, background)
