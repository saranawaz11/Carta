from datetime import date, datetime, time
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import llm
from repositories import tasks as tasks_repository


class TaskDateResolutionError(ValueError):
    pass


def _get(db: Session, task_id: UUID, clerk_user_id: str):
    task = tasks_repository.get_task(db, task_id, clerk_user_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return task


def list_tasks(db: Session, clerk_user_id: str):
    return tasks_repository.list_tasks(db, clerk_user_id)


def create_task_from_text(
    db: Session,
    clerk_user_id: str,
    text: str,
    now: datetime,
    timezone_name: str,
):
    timezone = ZoneInfo(timezone_name)
    resolution = llm.resolve_task_date(text, now.isoformat(), timezone_name)
    if resolution.date_status == "clarify":
        raise TaskDateResolutionError(
            resolution.message
            or "I couldn't confidently identify that due date. Please specify a date."
        )

    due_at: datetime | None = None
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
                due_at = due_at.replace(tzinfo=timezone)
            else:
                due_at = due_at.astimezone(timezone)
        else:
            if resolution.due_has_time:
                raise TaskDateResolutionError(
                    "I couldn't confidently identify that due date. Please specify a date and time."
                )
            due_at = datetime.combine(due_date, time(hour=12), tzinfo=timezone)

    return create_task(
        db,
        clerk_user_id,
        resolution.title,
        due_at,
        resolution.due_has_time,
    )


def create_task(
    db: Session,
    clerk_user_id: str,
    title: str,
    due_at: datetime | None = None,
    due_has_time: bool = False,
    source_note_id: UUID | None = None,
):
    title = title.strip()
    existing = tasks_repository.find_duplicate(db, clerk_user_id, title, due_at)
    if existing is not None:
        return existing
    return tasks_repository.create_task(
        db, clerk_user_id, title, due_at, due_has_time, source_note_id
    )


def find_duplicate(
    db: Session, clerk_user_id: str, title: str, due_at: datetime | None
):
    return tasks_repository.find_duplicate(db, clerk_user_id, title, due_at)


def set_completed(db: Session, task_id: UUID, clerk_user_id: str, completed: bool):
    return tasks_repository.set_completed(
        db, _get(db, task_id, clerk_user_id), completed
    )


def delete_task(db: Session, task_id: UUID, clerk_user_id: str) -> None:
    _get(db, task_id, clerk_user_id)
    tasks_repository.delete_task(db, task_id, clerk_user_id)
