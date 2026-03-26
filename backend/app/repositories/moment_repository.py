from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.moment import Moment


async def list_by_person(person_id: UUID, user_id: UUID, db: AsyncSession) -> list[Moment]:
    stmt = (
        select(Moment)
        .where(
            Moment.person_id == person_id, Moment.user_id == user_id, Moment.deleted_at.is_(None)
        )
        .order_by(Moment.occurred_on.desc())
    )
    return (await db.execute(stmt)).scalars().all()


async def get_by_id(moment_id: UUID, user_id: UUID, db: AsyncSession) -> Moment | None:
    stmt = select(Moment).where(Moment.id == moment_id, Moment.user_id == user_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def create(data: dict, user_id: UUID, db: AsyncSession) -> Moment:
    moment = Moment(user_id=user_id, **data)
    db.add(moment)
    await db.flush()
    return moment


async def update(moment: Moment, data: dict, db: AsyncSession) -> Moment:
    for key, value in data.items():
        setattr(moment, key, value)
    moment.updated_at = datetime.now(UTC)
    await db.flush()
    return moment


async def soft_delete(moment: Moment, db: AsyncSession) -> Moment:
    moment.deleted_at = datetime.now(UTC)
    await db.flush()
    return moment


async def list_active_for_person(person_id: UUID, db: AsyncSession) -> list[Moment]:
    stmt = select(Moment).where(Moment.person_id == person_id, Moment.deleted_at.is_(None))
    return (await db.execute(stmt)).scalars().all()
