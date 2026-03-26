"""journal entries body fts index

Revision ID: 0013_journal_entries_fts_index
Revises: 0012_journal_ai_runs_table
Create Date: 2026-03-26 14:05:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0013_journal_entries_fts_index"
down_revision: str | Sequence[str] | None = "0012_journal_ai_runs_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_journal_entries_body_fts ON journal_entries "
        "USING GIN (to_tsvector('simple', coalesce(body, '')))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_journal_entries_body_fts")
