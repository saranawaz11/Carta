from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from models import NoteSummary


def get_summary(db: Session, note_id: UUID, clerk_user_id: str) -> NoteSummary | None:
    return db.scalar(
        select(NoteSummary).where(
            NoteSummary.note_id == note_id, NoteSummary.clerk_user_id == clerk_user_id
        )
    )


def upsert_summary(
    db: Session, note_id: UUID, clerk_user_id: str, values: dict
) -> NoteSummary:
    statement = insert(NoteSummary).values(
        note_id=note_id, clerk_user_id=clerk_user_id, **values
    )
    statement = statement.on_conflict_do_update(
        index_elements=[NoteSummary.note_id],
        set_={**values, "generated_at": func.now()},
        where=NoteSummary.clerk_user_id == clerk_user_id,
    )
    db.execute(statement)
    db.commit()
    return get_summary(db, note_id, clerk_user_id)


def set_deadlines(db: Session, summary: NoteSummary, deadlines: list) -> NoteSummary:
    summary.deadlines = deadlines
    db.commit()
    db.refresh(summary)
    return summary


def delete_summary(db: Session, note_id: UUID, clerk_user_id: str) -> None:
    db.execute(
        delete(NoteSummary).where(
            NoteSummary.note_id == note_id, NoteSummary.clerk_user_id == clerk_user_id
        )
    )
    db.commit()
