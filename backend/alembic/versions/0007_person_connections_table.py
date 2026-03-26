"""person connections table

Revision ID: 0007_person_connections_table
Revises: 0006_reminders_table
Create Date: 2026-03-26 12:45:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_person_connections_table"
down_revision: str | Sequence[str] | None = "0006_reminders_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "person_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connected_person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["connected_person_id"], ["people.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("person_id <> connected_person_id", name="ck_person_connections_distinct"),
    )
    op.create_index(
        "uq_person_connections_undirected",
        "person_connections",
        [sa.text("LEAST(person_id, connected_person_id)"), sa.text("GREATEST(person_id, connected_person_id)")],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_person_connections_undirected", table_name="person_connections")
    op.drop_table("person_connections")
