"""journal entry tags table

Revision ID: 0011_journal_entry_tags_table
Revises: 0010_journal_entry_people_table
Create Date: 2026-03-26 14:03:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0011_journal_entry_tags_table"
down_revision: str | Sequence[str] | None = "0010_journal_entry_people_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "journal_entry_tags",
        sa.Column("journal_entry_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["journal_entry_id"], ["journal_entries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("journal_entry_id", "tag_id"),
    )


def downgrade() -> None:
    op.drop_table("journal_entry_tags")
