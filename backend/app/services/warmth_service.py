from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.people.rules import compute_warmth_score
from app.repositories import moment_repository, person_repository


async def recalculate_for_person(person_id: UUID, user_id: UUID, db: AsyncSession) -> float:
    person = await person_repository.get_by_id(person_id, user_id, db)
    if person is None:
        return 0.0
    moments = await moment_repository.list_active_for_person(person_id, db)
    entries = [(moment.sentiment, moment.occurred_on) for moment in moments]
    person.warmth_score = compute_warmth_score(entries)
    await db.flush()
    return person.warmth_score
