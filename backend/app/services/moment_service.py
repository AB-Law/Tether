from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.repositories import moment_repository, person_repository
from app.services import reminder_service, warmth_service


async def list_moments(person_id: UUID, user_id: UUID, db: AsyncSession):
    person = await person_repository.get_by_id(person_id, user_id, db)
    if person is None:
        raise AppException(code="person_not_found", message="Person not found", status_code=404)
    return await moment_repository.list_by_person(person_id, user_id, db)


async def get_moment(moment_id: UUID, user_id: UUID, db: AsyncSession):
    moment = await moment_repository.get_by_id(moment_id, user_id, db)
    if moment is None:
        raise AppException(code="moment_not_found", message="Moment not found", status_code=404)
    return moment


async def create_moment(data: dict, user_id: UUID, db: AsyncSession):
    person = await person_repository.get_by_id(data["person_id"], user_id, db)
    if person is None:
        raise AppException(code="person_not_found", message="Person not found", status_code=404)
    moment = await moment_repository.create(data, user_id, db)
    if person.last_talked_at is None or moment.occurred_on > person.last_talked_at:
        person.last_talked_at = moment.occurred_on
    await warmth_service.recalculate_for_person(moment.person_id, user_id, db)
    await reminder_service.schedule_nudge(moment.person_id, user_id, db)
    return moment


async def update_moment(moment_id: UUID, user_id: UUID, data: dict, db: AsyncSession):
    moment = await get_moment(moment_id, user_id, db)
    moment = await moment_repository.update(moment, data, db)
    await warmth_service.recalculate_for_person(moment.person_id, user_id, db)
    await reminder_service.schedule_nudge(moment.person_id, user_id, db)
    return moment


async def delete_moment(moment_id: UUID, user_id: UUID, db: AsyncSession):
    moment = await get_moment(moment_id, user_id, db)
    moment = await moment_repository.soft_delete(moment, db)
    await warmth_service.recalculate_for_person(moment.person_id, user_id, db)
    await reminder_service.schedule_nudge(moment.person_id, user_id, db)
    return moment
