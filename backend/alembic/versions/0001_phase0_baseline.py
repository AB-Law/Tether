"""phase 0 baseline

Revision ID: 0001_phase0_baseline
Revises:
Create Date: 2026-03-26 00:00:00
"""

from collections.abc import Sequence

revision: str = "0001_phase0_baseline"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
