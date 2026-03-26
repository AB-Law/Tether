"""journal entries table

Revision ID: 0009_journal_entries_table
Revises: 0008_tags_table
Create Date: 2026-03-26 14:01:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0009_journal_entries_table"
down_revision: str | Sequence[str] | None = "0008_tags_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "journal_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("mood", sa.SmallInteger(), nullable=True),
        sa.Column("ai_prompt_used", sa.Text(), nullable=True),
        sa.Column("latest_ai_reflection", sa.Text(), nullable=True),
        sa.Column("latest_ai_reflected_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.CheckConstraint("mood between 1 and 5", name="ck_journal_entries_mood_range"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_journal_entries_user_id_entry_date_desc",
        "journal_entries",
        ["user_id", "entry_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_journal_entries_user_id_entry_date_desc", table_name="journal_entries")
    op.drop_table("journal_entries")
