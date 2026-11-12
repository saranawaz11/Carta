from uuid import UUID

from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.orm import aliased
from sqlalchemy.orm import Session

from models import Note, NoteChunk


def replace_chunks(
    db: Session,
    note_id: UUID,
    clerk_user_id: str,
    chunks: list[tuple[str, list[float]]],
    content_hash: str,
) -> None:
    """Swap a note's chunks and record its hashes in one transaction."""
    try:
        db.execute(delete(NoteChunk).where(NoteChunk.note_id == note_id))
        if chunks:
            db.execute(
                insert(NoteChunk),
                [
                    {
                        "note_id": note_id,
                        "clerk_user_id": clerk_user_id,
                        "chunk_index": index,
                        "content": text,
                        "embedding": vector,
                    }
                    for index, (text, vector) in enumerate(chunks)
                ],
            )
        db.execute(
            update(Note)
            .where(Note.id == note_id)
            .values(
                content_hash=content_hash,
                embedded_hash=content_hash,
                updated_at=Note.updated_at,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        raise


def delete_chunks(db: Session, note_id: UUID) -> None:
    db.execute(delete(NoteChunk).where(NoteChunk.note_id == note_id))
    db.execute(update(Note).where(Note.id == note_id).values(embedded_hash=None, updated_at=Note.updated_at)
    )
    db.commit()


def similar_chunks(
    db: Session, clerk_user_id: str, vector: list[float], k: int
) -> list[dict]:
    rows = db.execute(
        select(NoteChunk.content, Note.id, Note.title)
        .join(Note, Note.id == NoteChunk.note_id)
        .where(NoteChunk.clerk_user_id == clerk_user_id, Note.deleted_at.is_(None))
        .order_by(NoteChunk.embedding.cosine_distance(vector))
        .limit(k)
    )
    return [
        {"content": content, "note_id": note_id, "title": title}
        for content, note_id, title in rows
    ]


def similar_notes(
    db: Session, note_id: UUID, clerk_user_id: str, limit: int = 3
) -> list[dict]:
    """Other live, unarchived notes closest to this note's own chunk vectors."""
    own = aliased(NoteChunk)
    other = aliased(NoteChunk)
    distance = func.min(other.embedding.cosine_distance(own.embedding))
    rows = db.execute(
        select(Note.id, Note.title, Note.content)
        .select_from(other)
        .join(own, (own.note_id == note_id) & (own.clerk_user_id == clerk_user_id))
        .join(Note, Note.id == other.note_id)
        .where(
            other.clerk_user_id == clerk_user_id,
            other.note_id != note_id,
            Note.deleted_at.is_(None),
            Note.archived_at.is_(None),
        )
        .group_by(Note.id)
        .order_by(distance)
        .limit(limit)
    )
    return [{"id": id_, "title": title, "content": content} for id_, title, content in rows]


def notes_needing_sync(db: Session, clerk_user_id: str, limit: int) -> list[UUID]:
    return list(
        db.scalars(
            select(Note.id)
            .where(
                Note.clerk_user_id == clerk_user_id,
                Note.deleted_at.is_(None),
                (Note.content_hash.is_(None))
                | (Note.content_hash.is_distinct_from(Note.embedded_hash)),
            )
            .order_by(Note.updated_at.desc())
            .limit(limit)
        )
    )
