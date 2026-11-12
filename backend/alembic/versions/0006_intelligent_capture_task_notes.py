"""Add rich note content and task date ranges.

Revision ID: 0006_intelligent_capture
Revises: 0005_note_tags
Create Date: 2026-11-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0006_intelligent_capture"
down_revision: Union[str, None] = "0005_note_tags"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notes",
        sa.Column(
            "content_rich",
            postgresql.JSONB(),
            nullable=True,
        ),
    )
    op.add_column(
        "tasks",
        sa.Column(
            "due_end_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "tasks",
        sa.Column(
            "source_text",
            sa.Text(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("tasks", "source_text")
    op.drop_column("tasks", "due_end_at")
    op.drop_column("notes", "content_rich")
