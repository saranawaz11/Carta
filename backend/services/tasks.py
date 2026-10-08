from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from repositories import tasks as tasks_repository


def _get(db: Session, task_id: UUID, clerk_user_id: str):
    task = tasks_repository.get_task(db, task_id, clerk_user_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return task


def list_tasks(db: Session, clerk_user_id: str):
    return tasks_repository.list_tasks(db, clerk_user_id)


def create_task(
    db: Session,
    clerk_user_id: str,
    title: str,
    due_at: datetime | None = None,
    due_has_time: bool = False,
):
    return tasks_repository.create_task(
        db, clerk_user_id, title.strip(), due_at, due_has_time
    )


def set_completed(db: Session, task_id: UUID, clerk_user_id: str, completed: bool):
    return tasks_repository.set_completed(
        db, _get(db, task_id, clerk_user_id), completed
    )


def delete_task(db: Session, task_id: UUID, clerk_user_id: str) -> None:
    _get(db, task_id, clerk_user_id)
    tasks_repository.delete_task(db, task_id, clerk_user_id)
