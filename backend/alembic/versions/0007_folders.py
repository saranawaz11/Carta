"""Add folders and notes.folder_id.

Revision ID: 0007_folders
Revises: 0006_intelligent_capture
Create Date: 2026-11-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0007_folders"
down_revision: Union[str, None] = "0006_intelligent_capture"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "folders",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("clerk_user_id", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "uq_folders_clerk_user_id_lower_name",
        "folders",
        ["clerk_user_id", sa.text("lower(name)")],
        unique=True,
    )
    op.add_column(
        "notes",
        sa.Column(
            "folder_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("folders.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_notes_clerk_user_id_folder_id",
        "notes",
        ["clerk_user_id", "folder_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_notes_clerk_user_id_folder_id", table_name="notes")
    op.drop_column("notes", "folder_id")
    op.drop_index("uq_folders_clerk_user_id_lower_name", table_name="folders")
    op.drop_table("folders")
