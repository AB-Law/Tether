from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reminder import Reminder


async def create(data: dict, user_id: UUID, db: AsyncSession) -> Reminder:
    reminder = Reminder(user_id=user_id, **data)
    db.add(reminder)
    await db.flush()
    return reminder


async def list_pending_for_user(user_id: UUID, db: AsyncSession) -> list[Reminder]:
    stmt = (
        select(Reminder)
        .where(Reminder.user_id == user_id, Reminder.status == "pending")
        .order_by(Reminder.scheduled_for.asc())
    )
    return (await db.execute(stmt)).scalars().all()


async def list_for_user(
    user_id: UUID,
    db: AsyncSession,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> list[Reminder]:
    stmt = select(Reminder).where(Reminder.user_id == user_id)
    if status:
        stmt = stmt.where(Reminder.status == status)
    stmt = (
        stmt.order_by(Reminder.scheduled_for.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return (await db.execute(stmt)).scalars().all()


async def get_due(now: datetime, db: AsyncSession, limit: int = 50) -> list[Reminder]:
    if limit <= 0:
        raise ValueError("limit must be greater than zero")
    stmt = (
        select(Reminder)
        .where(Reminder.status == "pending", Reminder.scheduled_for <= now)
        .order_by(Reminder.scheduled_for.asc(), Reminder.id.asc())
        .with_for_update(skip_locked=True)
        .limit(limit)
    )
    return (await db.execute(stmt)).scalars().all()


async def get_for_user(reminder_id: UUID, user_id: UUID, db: AsyncSession) -> Reminder | None:
    stmt = select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def mark_sent(reminder: Reminder, db: AsyncSession) -> None:
    reminder.status = "sent"
    reminder.sent_at = datetime.now(UTC)
    await db.flush()


async def mark_failed(reminder: Reminder, reason: str, db: AsyncSession) -> None:
    reminder.status = "failed"
    reminder.failed_at = datetime.now(UTC)
    reminder.failure_reason = reason
    await db.flush()


async def snooze(reminder: Reminder, until: datetime, db: AsyncSession) -> Reminder:
    reminder.scheduled_for = until
    reminder.status = "pending"
    await db.flush()
    return reminder


async def cancel_pending_for_entity(
    entity_type: str, entity_id: UUID, user_id: UUID, db: AsyncSession
) -> None:
    stmt = select(Reminder).where(
        Reminder.user_id == user_id,
        Reminder.entity_type == entity_type,
        Reminder.entity_id == entity_id,
        Reminder.status == "pending",
    )
    reminders = (await db.execute(stmt)).scalars().all()
    for reminder in reminders:
        reminder.status = "failed"
        reminder.failed_at = datetime.now(UTC)
        reminder.failure_reason = "cancelled"
    await db.flush()
