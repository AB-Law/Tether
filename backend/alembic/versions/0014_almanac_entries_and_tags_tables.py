"""almanac entries and tags tables

Revision ID: 0014_almanac_entries_tags
Revises: 0013_journal_entries_fts_index
Create Date: 2026-03-27 10:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0014_almanac_entries_tags"
down_revision: str | Sequence[str] | None = "0013_journal_entries_fts_index"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "almanac_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entry_type", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("reminder_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source", sa.Text(), nullable=False, server_default=sa.text("'manual'")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_almanac_entries_user_entry_type_created_at",
        "almanac_entries",
        ["user_id", "entry_type", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_almanac_entries_user_due_date",
        "almanac_entries",
        ["user_id", "due_date"],
        unique=False,
    )

    op.create_table(
        "almanac_entry_tags",
        sa.Column("almanac_entry_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["almanac_entry_id"], ["almanac_entries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("almanac_entry_id", "tag_id"),
    )


def downgrade() -> None:
    op.drop_table("almanac_entry_tags")
    op.drop_index("ix_almanac_entries_user_due_date", table_name="almanac_entries")
    op.drop_index("ix_almanac_entries_user_entry_type_created_at", table_name="almanac_entries")
    op.drop_table("almanac_entries")
