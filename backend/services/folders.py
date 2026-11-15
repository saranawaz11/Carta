from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models import Folder, Note
from repositories import folders as folders_repository
from repositories import notes as notes_repository
from schemas import FolderOut

MAX_FOLDER_NAME_LENGTH = 60

_DUPLICATE_NAME_DETAIL = "A folder with this name already exists"


def normalize_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Folder name cannot be empty",
        )
    if len(cleaned) > MAX_FOLDER_NAME_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Folder name must be {MAX_FOLDER_NAME_LENGTH} characters or fewer",
        )
    return cleaned


def ensure_unique_name(
    db: Session, clerk_user_id: str, name: str, exclude_id: UUID | None = None
) -> None:
    if folders_repository.find_folder_by_name(db, clerk_user_id, name, exclude_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=_DUPLICATE_NAME_DETAIL
        )


def get_owned_folder(db: Session, folder_id: UUID, clerk_user_id: str) -> Folder:
    folder = folders_repository.get_folder(db, folder_id, clerk_user_id)
    if folder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found"
        )
    return folder


def _to_out(folder: Folder, note_count: int) -> FolderOut:
    return FolderOut(
        id=folder.id,
        name=folder.name,
        note_count=note_count,
        created_at=folder.created_at,
        updated_at=folder.updated_at,
    )


def list_folders(db: Session, clerk_user_id: str) -> list[FolderOut]:
    return [
        _to_out(folder, count)
        for folder, count in folders_repository.list_folders_with_counts(
            db, clerk_user_id
        )
    ]


def create_folder(db: Session, clerk_user_id: str, name: str) -> FolderOut:
    cleaned = normalize_name(name)
    ensure_unique_name(db, clerk_user_id, cleaned)
    try:
        folder = folders_repository.create_folder(db, clerk_user_id, cleaned)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=_DUPLICATE_NAME_DETAIL
        )
    return _to_out(folder, 0)


def rename_folder(
    db: Session, folder_id: UUID, clerk_user_id: str, name: str
) -> FolderOut:
    folder = get_owned_folder(db, folder_id, clerk_user_id)
    cleaned = normalize_name(name)
    ensure_unique_name(db, clerk_user_id, cleaned, exclude_id=folder.id)
    try:
        folder = folders_repository.rename_folder(db, folder, cleaned)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=_DUPLICATE_NAME_DETAIL
        )
    count = folders_repository.count_folder_notes(db, folder.id, clerk_user_id)
    return _to_out(folder, count)


def delete_folder(db: Session, folder_id: UUID, clerk_user_id: str) -> None:
    get_owned_folder(db, folder_id, clerk_user_id)
    folders_repository.delete_folder(db, folder_id, clerk_user_id)


def list_folder_notes(
    db: Session,
    folder_id: UUID,
    clerk_user_id: str,
    limit: int,
    offset: int,
) -> list[Note]:
    get_owned_folder(db, folder_id, clerk_user_id)
    return folders_repository.list_folder_notes(
        db, folder_id, clerk_user_id, limit=limit, offset=offset
    )


def get_folder_context_notes(
    db: Session, folder_id: UUID, clerk_user_id: str
) -> list[Note]:
    get_owned_folder(db, folder_id, clerk_user_id)
    return folders_repository.list_folder_notes(db, folder_id, clerk_user_id)


def move_note(
    db: Session, note_id: UUID, clerk_user_id: str, folder_id: UUID | None
) -> Note:
    note = notes_repository.get_note(db, note_id, clerk_user_id)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )
    if note.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deleted notes cannot be moved",
        )
    if folder_id is not None:
        get_owned_folder(db, folder_id, clerk_user_id)
    return folders_repository.set_note_folder(db, note_id, clerk_user_id, folder_id)
