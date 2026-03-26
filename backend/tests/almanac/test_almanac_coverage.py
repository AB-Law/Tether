from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.api.v1.endpoints import almanac
from app.core.exceptions import AppException
from app.domain.almanac.rules import EntryTypeEnum, validate_task_fields
from app.repositories import almanac_repository
from app.services import almanac_service
from tests.helpers import ExecuteResult, FakeSession


@pytest.mark.asyncio
async def test_almanac_endpoints_and_domain_rules(monkeypatch):
    uid = uuid4()
    eid = uuid4()
    user = SimpleNamespace(id=uid)
    db = SimpleNamespace(commit=AsyncMock(), flush=AsyncMock())
    entry = SimpleNamespace(
        id=eid,
        user_id=uid,
        entry_type=EntryTypeEnum.TASK.value,
        title="Title",
        body="Body",
        due_date=None,
        reminder_at=None,
        is_completed=False,
        completed_at=None,
        source="manual",
        deleted_at=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        tags=[],
    )

    monkeypatch.setattr(
        almanac.almanac_service,
        "list_entries",
        AsyncMock(return_value={"data": [entry], "meta": {"page": 1, "page_size": 20, "total": 1}}),
    )
    monkeypatch.setattr(almanac.AlmanacEntryResponse, "model_validate", staticmethod(lambda x: x))
    listed = await almanac.list_entries(user, db)
    assert listed.meta.total == 1

    monkeypatch.setattr(almanac.almanac_service, "create_entry", AsyncMock(return_value=entry))
    payload = SimpleNamespace(model_dump=lambda: {"entry_type": "idea", "title": "x"})
    await almanac.create_entry(payload, user, db)

    monkeypatch.setattr(almanac.almanac_service, "capture", AsyncMock(return_value=entry))
    capture_payload = SimpleNamespace(model_dump=lambda: {"title": "quick"})
    await almanac.quick_capture(capture_payload, user, db)

    monkeypatch.setattr(almanac.almanac_service, "get_entry", AsyncMock(return_value=entry))
    await almanac.get_entry(eid, user, db)

    monkeypatch.setattr(almanac.almanac_service, "update_entry", AsyncMock(return_value=entry))
    update_payload = SimpleNamespace(model_dump=lambda exclude_unset: {"title": "updated"})
    await almanac.update_entry(eid, update_payload, user, db)

    monkeypatch.setattr(almanac.almanac_service, "delete_entry", AsyncMock(return_value=None))
    await almanac.delete_entry(eid, user, db)

    monkeypatch.setattr(almanac.almanac_service, "complete_entry", AsyncMock(return_value=entry))
    await almanac.complete_entry(eid, user, db)

    with pytest.raises(AppException):
        validate_task_fields(
            {"entry_type": "idea", "title": "x", "due_date": datetime.now(UTC).date()}
        )
    with pytest.raises(AppException):
        validate_task_fields(
            {
                "entry_type": "task",
                "title": "x",
                "is_completed": False,
                "completed_at": datetime.now(UTC),
            }
        )
    valid = validate_task_fields(
        {"entry_type": "task", "title": "x", "is_completed": True, "completed_at": None}
    )
    assert valid["completed_at"] is not None
    non_task_valid = validate_task_fields({"entry_type": "idea", "title": "x"})
    assert non_task_valid["is_completed"] is False
    assert non_task_valid["completed_at"] is None


@pytest.mark.asyncio
async def test_almanac_repository_and_service_paths(monkeypatch):
    uid = uuid4()
    eid = uuid4()
    db = SimpleNamespace(flush=AsyncMock())
    entry = SimpleNamespace(
        id=eid,
        user_id=uid,
        entry_type=EntryTypeEnum.TASK.value,
        title="Title",
        body="Body",
        due_date=None,
        reminder_at=None,
        is_completed=False,
        completed_at=None,
        tags=[],
        updated_at=datetime.now(UTC),
    )

    db_repo = FakeSession([ExecuteResult(one=1), ExecuteResult(rows=[entry])])
    rows, total = await almanac_repository.list_entries(
        uid,
        {
            "entry_type": "task",
            "tag": "work",
            "is_completed": False,
            "due_date_before": datetime.now(UTC).date(),
            "due_date_after": datetime.now(UTC).date(),
            "search": "hello",
        },
        1,
        20,
        db_repo,
    )  # type: ignore[arg-type]
    assert total == 1
    assert rows == [entry]
    rows_no_search, _ = await almanac_repository.list_entries(
        uid,
        {"entry_type": "task"},
        1,
        20,
        FakeSession([ExecuteResult(one=1), ExecuteResult(rows=[entry])]),
    )  # type: ignore[arg-type]
    assert rows_no_search == [entry]

    assert await almanac_repository.get_by_id(
        eid, uid, FakeSession([ExecuteResult(one_or_none=entry)])
    ) == entry  # type: ignore[arg-type]
    assert await almanac_repository.get_by_id_including_deleted(
        eid, uid, FakeSession([ExecuteResult(one_or_none=entry)])
    ) == entry  # type: ignore[arg-type]
    assert await almanac_repository.get_by_id_any_user(
        eid, FakeSession([ExecuteResult(one_or_none=entry)])
    ) == entry  # type: ignore[arg-type]

    writable_db = FakeSession([])
    created = await almanac_repository.create(
        {"entry_type": "idea", "title": "x", "body": None}, uid, writable_db
    )  # type: ignore[arg-type]
    assert created.user_id == uid
    updated = await almanac_repository.update(created, {"title": "y"}, writable_db)  # type: ignore[arg-type]
    assert updated.title == "y"
    deleted = await almanac_repository.soft_delete(updated, writable_db)  # type: ignore[arg-type]
    assert deleted.deleted_at is not None
    completed = await almanac_repository.complete(updated, writable_db)  # type: ignore[arg-type]
    assert completed.is_completed is True

    monkeypatch.setattr(
        almanac_service.almanac_repository, "get_by_id", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        almanac_service.almanac_repository, "get_by_id_any_user", AsyncMock(return_value=None)
    )
    with pytest.raises(AppException):
        await almanac_service.get_entry(eid, uid, db)

    monkeypatch.setattr(
        almanac_service.almanac_repository, "create", AsyncMock(return_value=entry)
    )
    monkeypatch.setattr(
        almanac_service.tag_repository,
        "get_or_create",
        AsyncMock(return_value=SimpleNamespace(id=uuid4(), name="x")),
    )
    monkeypatch.setattr(
        almanac_service.reminder_repository,
        "cancel_pending_for_entity",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        almanac_service.reminder_repository, "create", AsyncMock(return_value=None)
    )
    entry.reminder_at = datetime.now(UTC)
    captured = await almanac_service.capture({"title": "quick", "entry_type": "task"}, uid, db)
    assert captured is entry

    non_task = SimpleNamespace(id=eid, entry_type="idea")
    monkeypatch.setattr(almanac_service, "get_entry", AsyncMock(return_value=non_task))
    with pytest.raises(AppException):
        await almanac_service.complete_entry(eid, uid, db)


@pytest.mark.asyncio
async def test_journal_repository_non_search_order_branch():
    from app.repositories import journal_repository

    uid = uuid4()
    entry = SimpleNamespace(
        id=uuid4(),
        user_id=uid,
        entry_date=datetime.now(UTC).date(),
    )
    rows, total = await journal_repository.list_entries(
        uid,
        {},
        1,
        20,
        FakeSession([ExecuteResult(one=1), ExecuteResult(rows=[entry])]),
    )  # type: ignore[arg-type]
    assert total == 1
    assert rows == [entry]
