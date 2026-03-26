"""people table

Revision ID: 0004_people_table
Revises: 0003_refresh_tokens_table
Create Date: 2026-03-26 12:42:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004_people_table"
down_revision: str | Sequence[str] | None = "0003_refresh_tokens_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


RELATIONSHIP_TYPES = (
    "close_friend",
    "friend",
    "acquaintance",
    "new_person",
    "complicated",
    "faded",
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.create_table(
        "people",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("relationship_type", sa.Text(), nullable=False),
        sa.Column("birthday", sa.Date(), nullable=True),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("contact_cadence_days", sa.Integer(), nullable=True),
        sa.Column("warmth_score", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("last_talked_at", sa.Date(), nullable=True),
        sa.Column("next_nudge_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.CheckConstraint(
            f"relationship_type IN {RELATIONSHIP_TYPES}",
            name="ck_people_relationship_type",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_people_user_archived_name", "people", ["user_id", "archived_at", "name"], unique=False
    )
    op.create_index(
        "ix_people_user_next_nudge", "people", ["user_id", "next_nudge_at"], unique=False
    )
    op.create_index(
        "ix_people_user_last_talked", "people", ["user_id", "last_talked_at"], unique=False
    )
    op.create_index(
        "ix_people_name_trgm",
        "people",
        ["name"],
        unique=False,
        postgresql_using="gin",
        postgresql_ops={"name": "gin_trgm_ops"},
    )


def downgrade() -> None:
    op.drop_index("ix_people_name_trgm", table_name="people", postgresql_using="gin")
    op.drop_index("ix_people_user_last_talked", table_name="people")
    op.drop_index("ix_people_user_next_nudge", table_name="people")
    op.drop_index("ix_people_user_archived_name", table_name="people")
    op.drop_table("people")
