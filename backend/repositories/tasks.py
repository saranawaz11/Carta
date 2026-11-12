from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, func, select
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
    due_end_at: datetime | None = None,
    due_has_time: bool = False,
    source_note_id: UUID | None = None,
    source_text: str | None = None,
) -> Task:
    task = Task(
        clerk_user_id=clerk_user_id,
        title=title,
        due_at=due_at,
        due_end_at=due_end_at,
        due_has_time=due_has_time,
        source_note_id=source_note_id,
        source_text=source_text,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def find_duplicate(
    db: Session, clerk_user_id: str, title: str, due_at: datetime | None
) -> Task | None:
    return db.scalar(
        select(Task)
        .where(
            Task.clerk_user_id == clerk_user_id,
            func.lower(func.trim(Task.title)) == title.strip().lower(),
            Task.due_at.is_(None) if due_at is None else Task.due_at == due_at,
        )
        .order_by(Task.created_at)
        .limit(1)
    )


def set_completed(db: Session, task: Task, completed: bool) -> Task:
    task.completed_at = datetime.now(timezone.utc) if completed else None
    db.commit()
    db.refresh(task)
    return task


def update_deadline(
    db: Session,
    task: Task,
    due_at: datetime | None,
    due_end_at: datetime | None,
    due_has_time: bool | None,
) -> Task:
    if due_at is not None or due_end_at is not None or due_has_time is not None:
        task.due_at = due_at
        task.due_end_at = due_end_at
        if due_has_time is not None:
            task.due_has_time = due_has_time
        db.commit()
        db.refresh(task)
    return task


def cleanup_expired_tasks(db: Session) -> int:
    """Delete tasks completed more than 7 days ago. Returns count of deleted tasks."""
    cutoff = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    from datetime import timedelta
    cutoff = cutoff - timedelta(days=7)
    
    result = db.execute(
        delete(Task).where(
            Task.completed_at.is_not(None),
            Task.completed_at <= cutoff,
        )
    )
    db.commit()
    return result.rowcount


def delete_task(db: Session, task_id: UUID, clerk_user_id: str) -> None:
    db.execute(
        delete(Task).where(Task.id == task_id, Task.clerk_user_id == clerk_user_id)
    )
    db.commit()
