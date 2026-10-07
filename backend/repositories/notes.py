from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from models import Note


def create_note(
    db: Session, clerk_user_id: str, title: str = "", content: str = ""
) -> Note:
    note = Note(clerk_user_id=clerk_user_id, title=title, content=content)
    db.add(note)
    db.flush()
    note_id = note.id
    db.commit()
    created = get_note(db, note_id, clerk_user_id)
    if created is None:
        raise RuntimeError("Created note could not be retrieved")
    return created


def get_note(db: Session, note_id: UUID, clerk_user_id: str) -> Note | None:
    return db.scalar(
        select(Note).where(
            Note.id == note_id,
            Note.clerk_user_id == clerk_user_id,
        )
    )


def list_notes(
    db: Session, clerk_user_id: str, status: str, query: str | None
) -> list[Note]:
    statement = select(Note).where(Note.clerk_user_id == clerk_user_id)
    if status == "active":
        statement = statement.where(
            Note.archived_at.is_(None), Note.deleted_at.is_(None)
        )
    elif status == "archived":
        statement = statement.where(
            Note.archived_at.is_not(None), Note.deleted_at.is_(None)
        )
    else:
        statement = statement.where(Note.deleted_at.is_not(None))
    if query:
        escaped_query = (
            query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        )
        pattern = f"%{escaped_query}%"
        statement = statement.where(
            or_(
                Note.title.ilike(pattern, escape="\\"),
                Note.content.ilike(pattern, escape="\\"),
            )
        )
    statement = statement.order_by(Note.updated_at.desc())
    return list(db.scalars(statement))


def purge_expired_notes(db: Session, clerk_user_id: str) -> None:
    expired_before = datetime.now(timezone.utc) - timedelta(days=15)
    db.execute(
        delete(Note).where(
            Note.clerk_user_id == clerk_user_id,
            Note.deleted_at.is_not(None),
            Note.deleted_at < expired_before,
        )
    )
    db.commit()


def update_note(
    db: Session,
    note_id: UUID,
    clerk_user_id: str,
    values: dict[str, object],
    expected_state: str,
    expected_updated_at: datetime | None = None,
) -> Note | None:
    statement = update(Note).where(
        Note.id == note_id,
        Note.clerk_user_id == clerk_user_id,
    )
    if expected_state == "active":
        statement = statement.where(
            Note.archived_at.is_(None), Note.deleted_at.is_(None)
        )
    elif expected_state == "archived":
        statement = statement.where(
            Note.archived_at.is_not(None), Note.deleted_at.is_(None)
        )
    elif expected_state == "deleted":
        statement = statement.where(Note.deleted_at.is_not(None))
    elif expected_state == "not_deleted":
        statement = statement.where(Note.deleted_at.is_(None))
    if expected_updated_at is not None:
        statement = statement.where(Note.updated_at == expected_updated_at)
    result = db.execute(statement.values(**values, updated_at=func.now()))
    if result.rowcount != 1:
        db.rollback()
        return None
    db.commit()
    return get_note(db, note_id, clerk_user_id)


def permanently_delete_note(
    db: Session, note_id: UUID, clerk_user_id: str
) -> bool:
    result = db.execute(
        delete(Note).where(
            Note.id == note_id,
            Note.clerk_user_id == clerk_user_id,
            Note.deleted_at.is_not(None),
        )
    )
    db.commit()
    return result.rowcount == 1


def get_note_by_id(db: Session, note_id: UUID) -> Note | None:
    return db.get(Note, note_id)
