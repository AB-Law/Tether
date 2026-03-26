"""journal entry people table

Revision ID: 0010_journal_entry_people_table
Revises: 0009_journal_entries_table
Create Date: 2026-03-26 14:02:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0010_journal_entry_people_table"
down_revision: str | Sequence[str] | None = "0009_journal_entries_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "journal_entry_people",
        sa.Column("journal_entry_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["journal_entry_id"], ["journal_entries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("journal_entry_id", "person_id"),
    )
    op.create_index(
        "ix_journal_entry_people_person_id_journal_entry_id",
        "journal_entry_people",
        ["person_id", "journal_entry_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_journal_entry_people_person_id_journal_entry_id",
        table_name="journal_entry_people",
    )
    op.drop_table("journal_entry_people")
