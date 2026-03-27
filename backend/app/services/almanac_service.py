from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.pagination import PaginationMeta
from app.domain.almanac.rules import EntryTypeEnum, validate_task_fields
from app.repositories import almanac_repository, reminder_repository, tag_repository


async def list_entries(
    user_id: UUID,
    filters: dict,
    page: int,
    page_size: int,
    db: AsyncSession,
):
    entries, total = await almanac_repository.list_entries(user_id, filters, page, page_size, db)
    return {
        "data": entries,
        "meta": PaginationMeta(page=page, page_size=page_size, total=total),
    }


async def get_entry(entry_id: UUID, user_id: UUID, db: AsyncSession):
    entry = await almanac_repository.get_by_id(entry_id, user_id, db)
    if entry is None:
        maybe_entry = await almanac_repository.get_by_id_any_user(entry_id, db)
        if maybe_entry is not None:
            raise AppException(code="forbidden", message="Forbidden", status_code=403)
        raise AppException(
            code="almanac_entry_not_found",
            message="Entry not found",
            status_code=404,
        )
    return entry


async def _resolve_tags(tag_names: list[str], user_id: UUID, db: AsyncSession):
    tags = []
    for raw_name in tag_names:
        if raw_name.strip():
            tags.append(await tag_repository.get_or_create(raw_name, user_id, db))
    return tags


async def _sync_reminder(entry, user_id: UUID, db: AsyncSession) -> None:
    await reminder_repository.cancel_pending_for_entity("almanac_entry", entry.id, user_id, db)
    if entry.entry_type == EntryTypeEnum.TASK.value and entry.reminder_at is not None:
        await reminder_repository.create(
            data={
                "entity_type": "almanac_entry",
                "entity_id": entry.id,
                "reminder_type": "task",
                "scheduled_for": entry.reminder_at,
                "status": "pending",
                "channel": "in_app",
                "payload": {"almanac_entry_id": str(entry.id), "attempt_count": 0},
            },
            user_id=user_id,
            db=db,
        )


async def create_entry(data: dict, user_id: UUID, db: AsyncSession):
    payload = validate_task_fields(data)
    tag_names = payload.pop("tag_names", [])
    entry = await almanac_repository.create(payload, user_id, db)
    entry.tags = await _resolve_tags(tag_names, user_id, db)
    await _sync_reminder(entry, user_id, db)
    await db.flush()
    return entry


async def capture(data: dict, user_id: UUID, db: AsyncSession):
    capture_payload = {
        "title": data["title"],
        "body": data.get("body"),
        "entry_type": str(data.get("entry_type") or EntryTypeEnum.RANDOM_THOUGHT.value),
        "tag_names": [],
        "source": "quick_capture",
    }
    return await create_entry(capture_payload, user_id, db)


async def update_entry(entry_id: UUID, user_id: UUID, data: dict, db: AsyncSession):
    entry = await get_entry(entry_id, user_id, db)
    tag_names = data.pop("tag_names", None)
    merged = {
        "entry_type": data.get("entry_type", entry.entry_type),
        "due_date": data.get("due_date", entry.due_date),
        "reminder_at": data.get("reminder_at", entry.reminder_at),
        "is_completed": data.get("is_completed", entry.is_completed),
        "completed_at": data.get("completed_at", entry.completed_at),
    }
    validate_task_fields(merged)
    data["entry_type"] = merged["entry_type"]
    data["due_date"] = merged["due_date"]
    data["reminder_at"] = merged["reminder_at"]
    data["is_completed"] = merged["is_completed"]
    data["completed_at"] = merged["completed_at"]
    entry = await almanac_repository.update(entry, data, db)
    if tag_names is not None:
        entry.tags = await _resolve_tags(tag_names, user_id, db)
    await _sync_reminder(entry, user_id, db)
    await db.flush()
    return entry


async def delete_entry(entry_id: UUID, user_id: UUID, db: AsyncSession):
    entry = await get_entry(entry_id, user_id, db)
    await reminder_repository.cancel_pending_for_entity("almanac_entry", entry.id, user_id, db)
    return await almanac_repository.soft_delete(entry, db)


async def complete_entry(entry_id: UUID, user_id: UUID, db: AsyncSession):
    entry = await get_entry(entry_id, user_id, db)
    if entry.entry_type != EntryTypeEnum.TASK.value:
        raise AppException(
            code="invalid_entry_type",
            message="Only task entries can be completed",
            status_code=422,
        )
    entry = await almanac_repository.complete(entry, db)
    await reminder_repository.cancel_pending_for_entity("almanac_entry", entry.id, user_id, db)
    return entry
