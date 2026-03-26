from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.pagination import PaginationMeta
from app.repositories import person_repository
from app.services import reminder_service


async def list_people(
    user_id: UUID,
    relationship_type: str | None,
    search: str | None,
    archived: bool,
    page: int,
    page_size: int,
    db: AsyncSession,
):
    items, total = await person_repository.list_people(
        user_id=user_id,
        relationship_type=relationship_type,
        search=search,
        archived=archived,
        page=page,
        page_size=page_size,
        db=db,
    )
    return {"data": items, "meta": PaginationMeta(page=page, page_size=page_size, total=total)}


async def get_person(person_id: UUID, user_id: UUID, db: AsyncSession):
    person = await person_repository.get_by_id(person_id, user_id, db)
    if person is None:
        raise AppException(code="person_not_found", message="Person not found", status_code=404)
    return person


async def create_person(data: dict, user_id: UUID, db: AsyncSession):
    person = await person_repository.create(data, user_id, db)
    if person.contact_cadence_days:
        await reminder_service.schedule_nudge(person.id, user_id, db)
    return person


async def update_person(person_id: UUID, user_id: UUID, data: dict, db: AsyncSession):
    person = await get_person(person_id, user_id, db)
    person = await person_repository.update(person, data, db)
    await reminder_service.schedule_nudge(person.id, user_id, db)
    return person


async def archive_person(person_id: UUID, user_id: UUID, db: AsyncSession):
    person = await get_person(person_id, user_id, db)
    person = await person_repository.soft_archive(person, db)
    await reminder_service.schedule_nudge(person.id, user_id, db)
    return person


async def get_drifting_away(user_id: UUID, db: AsyncSession):
    return await person_repository.drifting_away(user_id=user_id, limit=100, db=db)


async def get_new_people(user_id: UUID, db: AsyncSession):
    return await person_repository.new_people(user_id=user_id, db=db)


async def get_timeline(person_id: UUID, user_id: UUID, db: AsyncSession):
    await get_person(person_id, user_id, db)
    return await person_repository.get_timeline(person_id, user_id, db)
