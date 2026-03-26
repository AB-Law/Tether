"""moments table

Revision ID: 0005_moments_table
Revises: 0004_people_table
Create Date: 2026-03-26 12:43:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_moments_table"
down_revision: str | Sequence[str] | None = "0004_people_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SENTIMENT_TYPES = ("warm", "neutral", "hurtful", "complicated")
MOMENT_TYPES = ("conversation", "shared_experience", "act_of_care", "conflict", "milestone", "observation", "other")


def upgrade() -> None:
    op.create_table(
        "moments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("moment_type", sa.Text(), nullable=False),
        sa.Column("sentiment", sa.Text(), nullable=False),
        sa.Column("occurred_on", sa.Date(), nullable=False),
        sa.Column("what_happened", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(f"sentiment IN {SENTIMENT_TYPES}", name="ck_moments_sentiment"),
        sa.CheckConstraint(f"moment_type IN {MOMENT_TYPES}", name="ck_moments_moment_type"),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_moments_user_person_occurred", "moments", ["user_id", "person_id", "occurred_on"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_moments_user_person_occurred", table_name="moments")
    op.drop_table("moments")
