from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from core.auth import get_current_user_id
from core.db import get_db
from schemas import FolderCreate, FolderOut, FolderUpdate, NoteOut
from services import folders as folders_service

router = APIRouter(prefix="/api/folders", tags=["folders"])


@router.get("", response_model=list[FolderOut])
def list_folders(
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return folders_service.list_folders(db, clerk_user_id)


@router.post("", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
def create_folder(
    body: FolderCreate,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return folders_service.create_folder(db, clerk_user_id, body.name)


@router.patch("/{folder_id}", response_model=FolderOut)
def rename_folder(
    folder_id: UUID,
    body: FolderUpdate,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return folders_service.rename_folder(db, folder_id, clerk_user_id, body.name)


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: UUID,
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    folders_service.delete_folder(db, folder_id, clerk_user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{folder_id}/notes", response_model=list[NoteOut])
def list_folder_notes(
    folder_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return folders_service.list_folder_notes(
        db, folder_id, clerk_user_id, limit=limit, offset=offset
    )
