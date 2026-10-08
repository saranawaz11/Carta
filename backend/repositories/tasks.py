from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from models import Task


def list_tasks(db: Session, clerk_user_id: str) -> list[Task]:
    return list(
        db.scalars(
            select(Task)
            .where(Task.clerk_user_id == clerk_user_id)
            .order_by(
                Task.completed_at.is_not(None),
                Task.due_at.is_(None),
                Task.due_at,
                Task.created_at.desc(),
            )
        )
    )


def get_task(db: Session, task_id: UUID, clerk_user_id: str) -> Task | None:
    return db.scalar(
        select(Task).where(Task.id == task_id, Task.clerk_user_id == clerk_user_id)
    )


def create_task(
    db: Session,
    clerk_user_id: str,
    title: str,
    due_at: datetime | None,
    due_has_time: bool,
) -> Task:
    task = Task(
        clerk_user_id=clerk_user_id,
        title=title,
        due_at=due_at,
        due_has_time=due_has_time,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def set_completed(db: Session, task: Task, completed: bool) -> Task:
    task.completed_at = datetime.now(timezone.utc) if completed else None
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: UUID, clerk_user_id: str) -> None:
    db.execute(
        delete(Task).where(Task.id == task_id, Task.clerk_user_id == clerk_user_id)
    )
    db.commit()
