from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from models import Folder, Note


def _note_count_subquery(clerk_user_id: str):
    return (
        select(func.count(Note.id))
        .where(
            Note.folder_id == Folder.id,
            Note.clerk_user_id == clerk_user_id,
            Note.deleted_at.is_(None),
        )
        .correlate(Folder)
        .scalar_subquery()
    )


def get_folder(db: Session, folder_id: UUID, clerk_user_id: str) -> Folder | None:
    return db.scalar(
        select(Folder).where(
            Folder.id == folder_id,
            Folder.clerk_user_id == clerk_user_id,
        )
    )


def find_folder_by_name(
    db: Session, clerk_user_id: str, name: str, exclude_id: UUID | None = None
) -> Folder | None:
    statement = select(Folder).where(
        Folder.clerk_user_id == clerk_user_id,
        func.lower(Folder.name) == func.lower(name),
    )
    if exclude_id is not None:
        statement = statement.where(Folder.id != exclude_id)
    return db.scalar(statement)


def list_folders_with_counts(
    db: Session, clerk_user_id: str
) -> list[tuple[Folder, int]]:
    statement = (
        select(Folder, _note_count_subquery(clerk_user_id))
        .where(Folder.clerk_user_id == clerk_user_id)
        .order_by(Folder.updated_at.desc())
    )
    return [(folder, count) for folder, count in db.execute(statement).all()]


def count_folder_notes(db: Session, folder_id: UUID, clerk_user_id: str) -> int:
    return db.scalar(
        select(func.count(Note.id)).where(
            Note.folder_id == folder_id,
            Note.clerk_user_id == clerk_user_id,
            Note.deleted_at.is_(None),
        )
    )


def list_folder_notes(
    db: Session,
    folder_id: UUID,
    clerk_user_id: str,
    limit: int | None = None,
    offset: int = 0,
) -> list[Note]:
    statement = (
        select(Note)
        .where(
            Note.folder_id == folder_id,
            Note.clerk_user_id == clerk_user_id,
            Note.deleted_at.is_(None),
        )
        .order_by(Note.updated_at.desc())
        .offset(offset)
    )
    if limit is not None:
        statement = statement.limit(limit)
    return list(db.scalars(statement))


def create_folder(db: Session, clerk_user_id: str, name: str) -> Folder:
    folder = Folder(clerk_user_id=clerk_user_id, name=name)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


def rename_folder(db: Session, folder: Folder, name: str) -> Folder:
    folder.name = name
    db.commit()
    db.refresh(folder)
    return folder


def delete_folder(db: Session, folder_id: UUID, clerk_user_id: str) -> bool:
    result = db.execute(
        delete(Folder).where(
            Folder.id == folder_id,
            Folder.clerk_user_id == clerk_user_id,
        )
    )
    db.commit()
    return result.rowcount == 1


def set_note_folder(
    db: Session, note_id: UUID, clerk_user_id: str, folder_id: UUID | None
) -> Note | None:
    note = db.scalar(
        select(Note).where(Note.id == note_id, Note.clerk_user_id == clerk_user_id)
    )
    if note is None:
        return None
    previous_folder_id = note.folder_id
    # Keep the note's own updated_at: moving it must not reorder notes or change its version
    db.execute(
        update(Note)
        .where(Note.id == note_id)
        .values(folder_id=folder_id, updated_at=Note.updated_at)
    )
    touched = {fid for fid in (previous_folder_id, folder_id) if fid is not None}
    if touched:
        db.execute(
            update(Folder)
            .where(Folder.id.in_(touched), Folder.clerk_user_id == clerk_user_id)
            .values(updated_at=func.now())
        )
    db.commit()
    db.refresh(note)
    return note
