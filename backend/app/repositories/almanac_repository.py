from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.almanac_entry import AlmanacEntry
from app.models.tag import Tag


async def list_entries(
    user_id: UUID,
    filters: dict,
    page: int,
    page_size: int,
    db: AsyncSession,
) -> tuple[list[AlmanacEntry], int]:
    rank_expr = None
    stmt = select(AlmanacEntry).where(
        AlmanacEntry.user_id == user_id,
        AlmanacEntry.deleted_at.is_(None),
    )
    if entry_type := filters.get("entry_type"):
        stmt = stmt.where(AlmanacEntry.entry_type == str(entry_type))
    if tag_name := filters.get("tag"):
        stmt = stmt.where(AlmanacEntry.tags.any(func.lower(Tag.name) == tag_name.lower()))
    if (is_completed := filters.get("is_completed")) is not None:
        stmt = stmt.where(AlmanacEntry.is_completed == is_completed)
    if due_before := filters.get("due_date_before"):
        stmt = stmt.where(AlmanacEntry.due_date <= due_before)
    if due_after := filters.get("due_date_after"):
        stmt = stmt.where(AlmanacEntry.due_date >= due_after)
    if search := filters.get("search"):
        combined_text = (
            func.coalesce(AlmanacEntry.title, "")
            + " "
            + func.coalesce(AlmanacEntry.body, "")
        )
        vector = func.to_tsvector(
            "simple",
            combined_text,
        )
        query = func.plainto_tsquery("simple", search)
        rank_expr = func.ts_rank(vector, query)
        stmt = stmt.where(vector.op("@@")(query))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    ordered_stmt = stmt.options(selectinload(AlmanacEntry.tags))
    if rank_expr is not None:
        ordered_stmt = ordered_stmt.order_by(desc(rank_expr), desc(AlmanacEntry.created_at))
    else:
        ordered_stmt = ordered_stmt.order_by(desc(AlmanacEntry.created_at))
    result = await db.execute(ordered_stmt.offset((page - 1) * page_size).limit(page_size))
    return result.scalars().all(), total


async def get_by_id(entry_id: UUID, user_id: UUID, db: AsyncSession) -> AlmanacEntry | None:
    result = await db.execute(
        select(AlmanacEntry)
        .where(
            AlmanacEntry.id == entry_id,
            AlmanacEntry.user_id == user_id,
            AlmanacEntry.deleted_at.is_(None),
        )
        .options(selectinload(AlmanacEntry.tags))
    )
    return result.scalar_one_or_none()


async def get_by_id_including_deleted(
    entry_id: UUID, user_id: UUID, db: AsyncSession
) -> AlmanacEntry | None:
    result = await db.execute(
        select(AlmanacEntry)
        .where(AlmanacEntry.id == entry_id, AlmanacEntry.user_id == user_id)
        .options(selectinload(AlmanacEntry.tags))
    )
    return result.scalar_one_or_none()


async def get_by_id_any_user(entry_id: UUID, db: AsyncSession) -> AlmanacEntry | None:
    result = await db.execute(select(AlmanacEntry).where(AlmanacEntry.id == entry_id))
    return result.scalar_one_or_none()


async def create(data: dict, user_id: UUID, db: AsyncSession) -> AlmanacEntry:
    # Initialize relationship collection to avoid async lazy-load on first assignment.
    entry = AlmanacEntry(user_id=user_id, tags=[], **data)
    db.add(entry)
    await db.flush()
    return entry


async def update(entry: AlmanacEntry, data: dict, db: AsyncSession) -> AlmanacEntry:
    for key, value in data.items():
        setattr(entry, key, value)
    entry.updated_at = datetime.now(UTC)
    await db.flush()
    return entry


async def soft_delete(entry: AlmanacEntry, db: AsyncSession) -> AlmanacEntry:
    now = datetime.now(UTC)
    entry.deleted_at = now
    entry.updated_at = now
    await db.flush()
    return entry


async def complete(entry: AlmanacEntry, db: AsyncSession) -> AlmanacEntry:
    now = datetime.now(UTC)
    entry.is_completed = True
    entry.completed_at = now
    entry.updated_at = now
    await db.flush()
    return entry
