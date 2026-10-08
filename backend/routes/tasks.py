from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from core.auth import get_current_user_id
from core.db import get_db
from schemas import TaskCreate, TaskOut, TaskUpdate
from services import tasks as tasks_service

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskOut])
def list_tasks(
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return tasks_service.list_tasks(db, clerk_user_id)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    request: TaskCreate,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return tasks_service.create_task(
        db, clerk_user_id, request.title, request.due_at, request.due_has_time
    )


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: UUID,
    request: TaskUpdate,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return tasks_service.set_completed(db, task_id, clerk_user_id, request.completed)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: UUID,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> Response:
    tasks_service.delete_task(db, task_id, clerk_user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
