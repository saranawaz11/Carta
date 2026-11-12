"""Create note_summaries and tasks.source_note_id.

Revision ID: 0004_note_summaries
Revises: 0003_create_tasks
Create Date: 2026-10-13
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0004_note_summaries"
down_revision: Union[str, None] = "0003_create_tasks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "note_summaries",
        sa.Column("note_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("clerk_user_id", sa.Text(), nullable=False),
        sa.Column("overview", sa.Text(), nullable=False),
        sa.Column("key_points", postgresql.JSONB(), nullable=False),
        sa.Column("deadlines", postgresql.JSONB(), nullable=False),
        sa.Column("connections", postgresql.JSONB(), nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("note_id"),
    )
    op.create_index(
        "ix_note_summaries_clerk_user_id", "note_summaries", ["clerk_user_id"]
    )
    op.add_column("tasks", sa.Column("source_note_id", sa.Uuid(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_tasks_source_note_id",
        "tasks",
        "notes",
        ["source_note_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_tasks_source_note_id", "tasks", type_="foreignkey")
    op.drop_column("tasks", "source_note_id")
    op.drop_index("ix_note_summaries_clerk_user_id", table_name="note_summaries")
    op.drop_table("note_summaries")
