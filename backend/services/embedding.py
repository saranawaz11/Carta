import hashlib
from uuid import UUID

from sqlalchemy.orm import Session

import llm
from repositories import note_chunks as chunks_repository
from repositories import notes as notes_repository


def compute_hash(title: str, content: str) -> str:
    return hashlib.sha256(f"{title}\n{content}".encode()).hexdigest()


def sync_note(db: Session, note_id: UUID) -> None:
    note = notes_repository.get_note_by_id(db, note_id)
    if note is None or note.deleted_at is not None:
        return
    digest = compute_hash(note.title, note.content)
    if note.embedded_hash == digest:
        return
    pieces = llm.split_note(note.title, note.content)
    vectors = llm.embed_texts(pieces)
    chunks_repository.replace_chunks(
        db, note.id, note.clerk_user_id, list(zip(pieces, vectors)), digest
    )


def sync_note_in_background(note_id: UUID) -> None:
    from core.db import new_session

    with new_session() as db:
        try:
            sync_note(db, note_id)
        except Exception:
            pass
