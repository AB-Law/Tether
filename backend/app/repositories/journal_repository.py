from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.journal_ai_run import JournalAiRun
from app.models.journal_entry import JournalEntry
from app.models.tag import Tag


async def list_entries(
    user_id: UUID,
    filters: dict,
    page: int,
    page_size: int,
    db: AsyncSession,
) -> tuple[list[JournalEntry], int]:
    stmt = select(JournalEntry).where(
        JournalEntry.user_id == user_id,
        JournalEntry.deleted_at.is_(None),
    )
    if start_date := filters.get("start_date"):
        stmt = stmt.where(JournalEntry.entry_date >= start_date)
    if end_date := filters.get("end_date"):
        stmt = stmt.where(JournalEntry.entry_date <= end_date)
    if moods := filters.get("moods"):
        stmt = stmt.where(JournalEntry.mood.in_(moods))
    if search := filters.get("search"):
        stmt = stmt.where(
            func.to_tsvector("simple", func.coalesce(JournalEntry.body, "")).op("@@")(
                func.plainto_tsquery("simple", search)
            )
        )
    if person_id := filters.get("person_id"):
        stmt = stmt.where(JournalEntry.people.any(id=person_id))
    if tag_name := filters.get("tag"):
        stmt = stmt.where(JournalEntry.tags.any(func.lower(Tag.name) == tag_name.lower()))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    result = await db.execute(
        stmt.options(selectinload(JournalEntry.people), selectinload(JournalEntry.tags))
        .order_by(desc(JournalEntry.entry_date), desc(JournalEntry.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all(), total


async def list_recent_non_deleted(
    user_id: UUID, limit: int, db: AsyncSession
) -> list[JournalEntry]:
    result = await db.execute(
        select(JournalEntry)
        .where(JournalEntry.user_id == user_id, JournalEntry.deleted_at.is_(None))
        .order_by(JournalEntry.entry_date.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def get_by_id(entry_id: UUID, user_id: UUID, db: AsyncSession) -> JournalEntry | None:
    result = await db.execute(
        select(JournalEntry)
        .where(
            JournalEntry.id == entry_id,
            JournalEntry.user_id == user_id,
            JournalEntry.deleted_at.is_(None),
        )
        .options(selectinload(JournalEntry.people), selectinload(JournalEntry.tags))
    )
    return result.scalar_one_or_none()


async def get_by_id_including_deleted(
    entry_id: UUID, user_id: UUID, db: AsyncSession
) -> JournalEntry | None:
    result = await db.execute(
        select(JournalEntry)
        .where(JournalEntry.id == entry_id, JournalEntry.user_id == user_id)
        .options(selectinload(JournalEntry.people), selectinload(JournalEntry.tags))
    )
    return result.scalar_one_or_none()


async def create(data: dict, user_id: UUID, db: AsyncSession) -> JournalEntry:
    entry = JournalEntry(user_id=user_id, **data)
    db.add(entry)
    await db.flush()
    return entry


async def update(entry: JournalEntry, data: dict, db: AsyncSession) -> JournalEntry:
    for key, value in data.items():
        setattr(entry, key, value)
    entry.updated_at = datetime.now(UTC)
    await db.flush()
    return entry


async def soft_delete(entry: JournalEntry, db: AsyncSession) -> JournalEntry:
    now = datetime.now(UTC)
    entry.deleted_at = now
    entry.updated_at = now
    await db.flush()
    return entry


async def reverse_timeline_for_person(
    person_id: UUID, user_id: UUID, db: AsyncSession
) -> list[JournalEntry]:
    result = await db.execute(
        select(JournalEntry)
        .where(
            JournalEntry.user_id == user_id,
            JournalEntry.deleted_at.is_(None),
            JournalEntry.people.any(id=person_id),
        )
        .options(selectinload(JournalEntry.people), selectinload(JournalEntry.tags))
        .order_by(JournalEntry.entry_date.desc())
    )
    return result.scalars().all()


async def create_ai_run(data: dict, db: AsyncSession) -> JournalAiRun:
    run = JournalAiRun(**data)
    db.add(run)
    await db.flush()
    return run


async def update_ai_run(run: JournalAiRun, data: dict, db: AsyncSession) -> JournalAiRun:
    for key, value in data.items():
        setattr(run, key, value)
    await db.flush()
    return run


async def list_ai_runs(entry_id: UUID, user_id: UUID, db: AsyncSession) -> list[JournalAiRun]:
    result = await db.execute(
        select(JournalAiRun)
        .where(
            and_(JournalAiRun.journal_entry_id == entry_id, JournalAiRun.user_id == user_id)
        )
        .order_by(JournalAiRun.created_at.desc())
    )
    return result.scalars().all()
