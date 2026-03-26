"""tags table

Revision ID: 0008_tags_table
Revises: 0007_person_connections_table
Create Date: 2026-03-26 14:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0008_tags_table"
down_revision: str | Sequence[str] | None = "0007_person_connections_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_tags_user_id_name"),
    )
    op.create_index("ix_tags_user_id_name", "tags", ["user_id", "name"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_tags_user_id_name", table_name="tags")
    op.drop_table("tags")
