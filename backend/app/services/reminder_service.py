from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import reminder_repository
from app.repositories.person_repository import get_by_id


async def schedule_nudge(person_id: UUID, user_id: UUID, db: AsyncSession) -> None:
    person = await get_by_id(person_id, user_id, db)
    if person is None:
        return

    await reminder_repository.cancel_pending_for_entity("person", person_id, user_id, db)

    if person.archived_at is not None or person.contact_cadence_days is None:
        person.next_nudge_at = None
        await db.flush()
        return

    base_date = person.last_talked_at or datetime.now(UTC).date()
    scheduled_for = datetime.combine(base_date, datetime.min.time(), tzinfo=UTC) + timedelta(
        days=person.contact_cadence_days
    )
    person.next_nudge_at = scheduled_for
    await reminder_repository.create(
        data={
            "entity_type": "person",
            "entity_id": person_id,
            "reminder_type": "nudge",
            "scheduled_for": scheduled_for,
            "status": "pending",
            "channel": "in_app",
            "payload": {
                "person_id": str(person_id),
                "person_name": getattr(person, "name", "Connection"),
            },
        },
        user_id=user_id,
        db=db,
    )
    await db.flush()
