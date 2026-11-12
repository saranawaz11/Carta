from datetime import date, datetime, time
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import llm
from repositories import tasks as tasks_repository
from schemas import TaskCandidate
from services import date_hints


class TaskDateResolutionError(ValueError):
    pass


def _get(db: Session, task_id: UUID, clerk_user_id: str):
    task = tasks_repository.get_task(db, task_id, clerk_user_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return task


def list_tasks(db: Session, clerk_user_id: str):
    return tasks_repository.list_tasks(db, clerk_user_id)


def _resolve_candidate_dates(
    candidate: TaskCandidate, timezone_name: str
) -> tuple[datetime | None, datetime | None, bool]:
    """
    Resolve task candidate dates into (due_at, due_end_at, due_has_time).
    Returns parsed datetime objects or None if undated.
    """
    if candidate.date_status == "clarify":
        timezone = ZoneInfo(timezone_name)
        named = date_hints.find_named_date(
            f"{candidate.source_text or ''} {candidate.title}",
            datetime.now(timezone).date(),
        )
        if named is None:
            raise TaskDateResolutionError(
                candidate.message
                or "I couldn't confidently identify that due date. Please specify a date."
            )
        return datetime.combine(named, time(hour=12), tzinfo=timezone), None, False

    if candidate.date_status == "no_date":
        timezone = ZoneInfo(timezone_name)
        named = date_hints.find_named_date(
            f"{candidate.source_text or ''} {candidate.title}",
            datetime.now(timezone).date(),
        )
        if named is None:
            return None, None, False
        return datetime.combine(named, time(hour=12), tzinfo=timezone), None, False

    if candidate.date_status != "resolved" or candidate.due_at is None:
        raise TaskDateResolutionError(
            "I couldn't confidently identify that due date. Please specify a date."
        )

    timezone = ZoneInfo(timezone_name)
    due_at: datetime | None = None
    due_end_at: datetime | None = None
    due_has_time = candidate.due_has_time

    try:
        due_date = date.fromisoformat(candidate.due_at)
    except ValueError:
        if not candidate.due_has_time:
            raise TaskDateResolutionError(
                "I couldn't confidently identify that due date. Please specify a date."
            )
        try:
            due_at = datetime.fromisoformat(candidate.due_at)
        except ValueError as error:
            raise TaskDateResolutionError(
                "I couldn't confidently identify that due date. Please specify a date."
            ) from error
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=timezone)
        else:
            due_at = due_at.astimezone(timezone)
    else:
        if due_has_time:
            raise TaskDateResolutionError(
                "I couldn't confidently identify that due date. Please specify a date and time."
            )
        due_at = datetime.combine(due_date, time(hour=12), tzinfo=timezone)

        if candidate.due_end_at is not None:
            try:
                due_end_date = date.fromisoformat(candidate.due_end_at)
            except ValueError:
                raise TaskDateResolutionError(
                    "I couldn't parse the end date. Please specify a date range."
                )
            if due_end_date < due_date:
                raise TaskDateResolutionError(
                    "End date cannot precede start date."
                )
            due_end_at = datetime.combine(due_end_date, time(hour=12), tzinfo=timezone)

    return due_at, due_end_at, due_has_time


def create_task_from_candidate(
    db: Session,
    clerk_user_id: str,
    candidate: TaskCandidate,
    timezone_name: str,
) -> "models.Task":
    """Create a task from a TaskCandidate, resolving dates and applying shared interpretation."""
    due_at, due_end_at, due_has_time = _resolve_candidate_dates(candidate, timezone_name)
    title = (
        date_hints.strip_date_phrase(candidate.title)
        if due_at is not None
        else candidate.title
    )

    return create_task(
        db,
        clerk_user_id,
        title,
        due_at,
        due_end_at,
        due_has_time,
        source_text=candidate.source_text,
    )


def create_task_from_text(
    db: Session,
    clerk_user_id: str,
    text: str,
    now: datetime,
    timezone_name: str,
):
    """Create a task with natural language date resolution (direct entry path)."""
    resolution = llm.resolve_task_date(text, now.isoformat(), timezone_name)
    if resolution.date_status == "clarify":
        named = date_hints.find_named_date(text, now.astimezone(ZoneInfo(timezone_name)).date())
        if named is not None:
            resolution = resolution.model_copy(
                update={"date_status": "no_date", "due_at": None, "due_has_time": False}
            )
        else:
            raise TaskDateResolutionError(
                resolution.message
                or "I couldn't confidently identify that due date. Please specify a date."
            )

    due_at: datetime | None = None
    due_end_at: datetime | None = None
    if resolution.date_status == "no_date":
        timezone = ZoneInfo(timezone_name)
        named = date_hints.find_named_date(
            text, now.astimezone(timezone).date()
        )
        if named is not None:
            due_at = datetime.combine(named, time(hour=12), tzinfo=timezone)
    if resolution.date_status == "resolved":
        if resolution.due_at is None:
            raise TaskDateResolutionError(
                "I couldn't confidently identify that due date. Please specify a date."
            )
        try:
            due_date = date.fromisoformat(resolution.due_at)
        except ValueError:
            if not resolution.due_has_time:
                raise TaskDateResolutionError(
                    "I couldn't confidently identify that due date. Please specify a date."
                )
            try:
                due_at = datetime.fromisoformat(resolution.due_at)
            except ValueError as error:
                raise TaskDateResolutionError(
                    "I couldn't confidently identify that due date. Please specify a date."
                ) from error
            if due_at.tzinfo is None:
                due_at = due_at.replace(tzinfo=ZoneInfo(timezone_name))
            else:
                timezone = ZoneInfo(timezone_name)
                due_at = due_at.astimezone(timezone)
        else:
            if resolution.due_has_time:
                raise TaskDateResolutionError(
                    "I couldn't confidently identify that due date. Please specify a date and time."
                )
            timezone = ZoneInfo(timezone_name)
            due_at = datetime.combine(due_date, time(hour=12), tzinfo=timezone)

    title = (
        date_hints.strip_date_phrase(resolution.title)
        if due_at is not None
        else resolution.title
    )
    return create_task(
        db,
        clerk_user_id,
        title,
        due_at,
        due_end_at,
        resolution.due_has_time,
    )


def create_task(
    db: Session,
    clerk_user_id: str,
    title: str,
    due_at: datetime | None = None,
    due_end_at: datetime | None = None,
    due_has_time: bool = False,
    source_note_id: UUID | None = None,
    source_text: str | None = None,
):
    title = title.strip()
    existing = tasks_repository.find_duplicate(db, clerk_user_id, title, due_at)
    if existing is not None:
        return existing
    return tasks_repository.create_task(
        db, clerk_user_id, title, due_at, due_end_at, due_has_time, source_note_id, source_text
    )


def find_duplicate(
    db: Session, clerk_user_id: str, title: str, due_at: datetime | None
):
    return tasks_repository.find_duplicate(db, clerk_user_id, title, due_at)


def set_completed(db: Session, task_id: UUID, clerk_user_id: str, completed: bool):
    return tasks_repository.set_completed(
        db, _get(db, task_id, clerk_user_id), completed
    )


def update_deadline(
    db: Session,
    task_id: UUID,
    clerk_user_id: str,
    due_at: datetime | None,
    due_end_at: datetime | None,
    due_has_time: bool | None,
):
    """Update task deadline fields, preserving completion state."""
    task = _get(db, task_id, clerk_user_id)
    return tasks_repository.update_deadline(
        db, task, due_at, due_end_at, due_has_time
    )


def delete_task(db: Session, task_id: UUID, clerk_user_id: str) -> None:
    _get(db, task_id, clerk_user_id)
    tasks_repository.delete_task(db, task_id, clerk_user_id)
