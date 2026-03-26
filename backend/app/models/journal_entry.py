import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Table, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

journal_entry_people = Table(
    "journal_entry_people",
    Base.metadata,
    Column(
        "journal_entry_id",
        UUID(as_uuid=True),
        ForeignKey("journal_entries.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "person_id",
        UUID(as_uuid=True),
        ForeignKey("people.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

journal_entry_tags = Table(
    "journal_entry_tags",
    Base.metadata,
    Column(
        "journal_entry_id",
        UUID(as_uuid=True),
        ForeignKey("journal_entries.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    entry_date: Mapped[date] = mapped_column(Date)
    body: Mapped[str] = mapped_column(Text)
    mood: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_prompt_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    latest_ai_reflection: Mapped[str | None] = mapped_column(Text, nullable=True)
    latest_ai_reflected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    people = relationship(
        "Person",
        secondary=journal_entry_people,
        back_populates="journal_entries",
        lazy="selectin",
    )
    tags = relationship(
        "Tag",
        secondary=journal_entry_tags,
        back_populates="entries",
        lazy="selectin",
    )
    ai_runs = relationship("JournalAiRun", back_populates="journal_entry", lazy="selectin")
