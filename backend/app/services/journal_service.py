from datetime import date
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.pagination import PaginationMeta
from app.repositories import journal_repository, person_repository, tag_repository

MAX_PERSON_LINKS_PER_ENTRY = 50


def _validate_person_ids(person_ids: list[UUID]) -> list[UUID]:
    deduped = list(dict.fromkeys(person_ids))
    if len(deduped) > MAX_PERSON_LINKS_PER_ENTRY:
        raise AppException(
            code="too_many_people_links",
            message="Too many people linked to a journal entry",
            status_code=422,
        )
    return deduped


async def list_entries(
    user_id: UUID,
    filters: dict,
    page: int,
    page_size: int,
    db: AsyncSession,
):
    entries, total = await journal_repository.list_entries(user_id, filters, page, page_size, db)
    return {
        "data": entries,
        "meta": PaginationMeta(page=page, page_size=page_size, total=total),
    }


async def get_entry(entry_id: UUID, user_id: UUID, db: AsyncSession):
    entry = await journal_repository.get_by_id(entry_id, user_id, db)
    if entry is None:
        raise AppException(
            code="journal_entry_not_found",
            message="Journal entry not found",
            status_code=404,
        )
    return entry


async def _resolve_people(person_ids: list[UUID], user_id: UUID, db: AsyncSession):
    people = []
    for person_id in _validate_person_ids(person_ids):
        person = await person_repository.get_by_id(person_id, user_id, db)
        if person is None:
            raise AppException(code="forbidden", message="Invalid person link", status_code=403)
        if person.archived_at is not None:
            raise AppException(
                code="archived_person",
                message="Cannot link archived person",
                status_code=422,
            )
        people.append(person)
    return people


async def _resolve_tags(tag_names: list[str], user_id: UUID, db: AsyncSession):
    tags = []
    for raw_name in tag_names:
        if raw_name.strip():
            tags.append(await tag_repository.get_or_create(raw_name, user_id, db))
    return tags


def _touch_last_talked(people: list, entry_date: date):
    for person in people:
        if person.last_talked_at is None or person.last_talked_at < entry_date:
            person.last_talked_at = entry_date


async def create_entry(data: dict, user_id: UUID, db: AsyncSession):
    person_ids = data.pop("person_ids", [])
    tag_names = data.pop("tag_names", [])
    entry = await journal_repository.create(data, user_id, db)
    # Reload once so relationship collections are loaded before assignment.
    # This avoids async lazy-load attempts during relationship replacement.
    entry = await get_entry(entry.id, user_id, db)
    people = await _resolve_people(person_ids, user_id, db)
    tags = await _resolve_tags(tag_names, user_id, db)
    entry.people = people
    entry.tags = tags
    _touch_last_talked(people, entry.entry_date)
    await db.flush()
    return entry


async def update_entry(entry_id: UUID, user_id: UUID, data: dict, db: AsyncSession):
    entry = await get_entry(entry_id, user_id, db)
    person_ids = data.pop("person_ids", None)
    tag_names = data.pop("tag_names", None)
    entry = await journal_repository.update(entry, data, db)
    if person_ids is not None:
        people = await _resolve_people(person_ids, user_id, db)
        entry.people = people
        _touch_last_talked(people, entry.entry_date)
    if tag_names is not None:
        entry.tags = await _resolve_tags(tag_names, user_id, db)
    await db.flush()
    return entry


async def delete_entry(entry_id: UUID, user_id: UUID, db: AsyncSession):
    entry = await get_entry(entry_id, user_id, db)
    return await journal_repository.soft_delete(entry, db)
