from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.person import Person


async def list_people(
    user_id: UUID,
    relationship_type: str | None,
    search: str | None,
    archived: bool,
    page: int,
    page_size: int,
    db: AsyncSession,
) -> tuple[list[Person], int]:
    stmt = select(Person).where(Person.user_id == user_id)
    if archived:
        stmt = stmt.where(Person.archived_at.isnot(None))
    else:
        stmt = stmt.where(Person.archived_at.is_(None))
    if relationship_type:
        stmt = stmt.where(Person.relationship_type == relationship_type)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(Person.name.ilike(pattern), func.similarity(Person.name, search) > 0.2)
        )

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    items = (
        (
            await db.execute(
                stmt.order_by(Person.name.asc()).offset((page - 1) * page_size).limit(page_size)
            )
        )
        .scalars()
        .all()
    )
    return items, total


async def get_by_id(person_id: UUID, user_id: UUID, db: AsyncSession) -> Person | None:
    result = await db.execute(
        select(Person).where(Person.id == person_id, Person.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create(data: dict, user_id: UUID, db: AsyncSession) -> Person:
    person = Person(user_id=user_id, **data)
    db.add(person)
    await db.flush()
    return person


async def update(person: Person, data: dict, db: AsyncSession) -> Person:
    for key, value in data.items():
        setattr(person, key, value)
    person.updated_at = datetime.now(UTC)
    await db.flush()
    return person


async def soft_archive(person: Person, db: AsyncSession) -> Person:
    person.archived_at = datetime.now(UTC)
    person.next_nudge_at = None
    await db.flush()
    return person


async def drifting_away(user_id: UUID, limit: int, db: AsyncSession) -> list[Person]:
    now_day = datetime.now(UTC).date()
    stmt = select(Person).where(
        Person.user_id == user_id,
        Person.archived_at.is_(None),
        Person.contact_cadence_days.isnot(None),
    )
    people = (await db.execute(stmt)).scalars().all()
    filtered = []
    for person in people:
        if person.last_talked_at is None:
            filtered.append(person)
            continue
        gap_days = (now_day - person.last_talked_at).days
        if person.contact_cadence_days is not None and gap_days > person.contact_cadence_days:
            filtered.append(person)
    filtered.sort(key=lambda item: item.last_talked_at or now_day.replace(year=1900))
    return filtered[:limit]


async def new_people(user_id: UUID, db: AsyncSession) -> list[Person]:
    stmt = select(Person).where(
        Person.user_id == user_id,
        Person.archived_at.is_(None),
        Person.relationship_type == "new_person",
    )
    return (await db.execute(stmt)).scalars().all()


async def get_timeline(person_id: UUID, user_id: UUID, db: AsyncSession):
    from app.repositories import journal_repository

    return await journal_repository.reverse_timeline_for_person(person_id, user_id, db)
