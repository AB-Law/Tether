"""almanac entries fts index

Revision ID: 0015_almanac_entries_fts_index
Revises: 0014_almanac_entries_tags
Create Date: 2026-03-27 10:05:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0015_almanac_entries_fts_index"
down_revision: str | Sequence[str] | None = "0014_almanac_entries_tags"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_almanac_entries_fts ON almanac_entries "
        "USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, '')))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_almanac_entries_fts")
