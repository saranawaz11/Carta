import json
from collections.abc import Iterator

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.auth import get_current_user_id
from core.db import get_db
from schemas import ChatRequest, ConfirmRequest, ConfirmResponse
from services import chat as chat_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
def chat(
    request: ChatRequest,
    background: BackgroundTasks,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    events = chat_service.ask(db, clerk_user_id, request, background)

    def ndjson() -> Iterator[str]:
        try:
            for event in events:
                yield json.dumps(event, ensure_ascii=False) + "\n"
        except Exception:
            yield json.dumps({"error": "The assistant failed. Please try again."}) + "\n"

    return StreamingResponse(ndjson(), media_type="application/x-ndjson")


@router.post("/confirm", response_model=ConfirmResponse)
def confirm(
    request: ConfirmRequest,
    background: BackgroundTasks,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict:
    return chat_service.confirm(
        db,
        clerk_user_id,
        request.action,
        request.note_id,
        request.expected_updated_at,
        request.changes,
        background,
    )
