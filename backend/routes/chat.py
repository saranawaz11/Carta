import json
import logging
from collections.abc import Iterator
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.auth import get_current_user_id
from core.db import get_db
from schemas import (
    ChatHistoryIn,
    ChatRequest,
    ConfirmRequest,
    ConfirmResponse,
    TitleSuggestionRequest,
    TitleSuggestionResponse,
)
from services import chat as chat_service
from services import redis_service

logger = logging.getLogger(__name__)

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
            logger.exception("Chat stream failed")
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


@router.post("/suggest-title", response_model=TitleSuggestionResponse)
def suggest_title(
    request: TitleSuggestionRequest,
    _clerk_user_id: str = Depends(get_current_user_id),
) -> dict[str, str]:
    return {"title": chat_service.generate_title_suggestion(request.content, request.avoid)}


@router.get("/history")
def get_chat_history(
    clerk_user_id: str = Depends(get_current_user_id),
) -> dict[str, list[dict[str, Any]]]:
    return {"messages": redis_service.get_chat_history(clerk_user_id)}


@router.put("/history", status_code=status.HTTP_204_NO_CONTENT)
def save_chat_history(
    request: ChatHistoryIn,
    clerk_user_id: str = Depends(get_current_user_id),
) -> None:
    if not redis_service.save_chat_history(clerk_user_id, request.messages):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat history storage is unavailable",
        )
