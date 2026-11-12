"""Add notes.tags.

Revision ID: 0005_note_tags
Revises: 0004_note_summaries
Create Date: 2026-10-13
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0005_note_tags"
down_revision: Union[str, None] = "0004_note_summaries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notes",
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'"),
        ),
    )
    op.create_index("ix_notes_tags", "notes", ["tags"], postgresql_using="gin")


def downgrade() -> None:
    op.drop_index("ix_notes_tags", table_name="notes")
    op.drop_column("notes", "tags")
