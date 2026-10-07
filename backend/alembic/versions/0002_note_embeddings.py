"""Add note embeddings.

Revision ID: 0002_note_embeddings
Revises: 0001_create_notes
Create Date: 2026-10-07
"""

from typing import Sequence, Union

from alembic import op
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa


revision: str = "0002_note_embeddings"
down_revision: Union[str, None] = "0001_create_notes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.add_column("notes", sa.Column("content_hash", sa.Text(), nullable=True))
    op.add_column("notes", sa.Column("embedded_hash", sa.Text(), nullable=True))
    op.create_table(
        "note_chunks",
        sa.Column(
            "id",
            sa.Uuid(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("note_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("clerk_user_id", sa.Text(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_note_chunks_clerk_user_id", "note_chunks", ["clerk_user_id"])


def downgrade() -> None:
    op.drop_index("ix_note_chunks_clerk_user_id", table_name="note_chunks")
    op.drop_table("note_chunks")
    op.drop_column("notes", "embedded_hash")
    op.drop_column("notes", "content_hash")
