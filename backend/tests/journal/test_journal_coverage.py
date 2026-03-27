from datetime import UTC, date, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.api.v1.endpoints import journal, tags
from app.core.exceptions import AppException
from app.domain.ai import prompt_builders
from app.domain.almanac.rules import EntryTypeEnum
from app.repositories import (
    almanac_repository,
    journal_repository,
    person_repository,
    tag_repository,
)
from app.services import (
    almanac_service,
    daily_prompt_service,
    journal_ai_service,
    journal_service,
    people_service,
    tag_service,
)
from app.workers import reminder_jobs
from tests.helpers import ExecuteResult, FakeSession


@pytest.mark.asyncio
async def test_journal_and_tags_endpoints(monkeypatch):
    uid = uuid4()
    eid = uuid4()
    user = SimpleNamespace(id=uid, timezone="UTC")
    db = SimpleNamespace(commit=AsyncMock(), flush=AsyncMock())

    entry = SimpleNamespace(
        id=eid,
        user_id=uid,
        entry_date=date.today(),
        body="entry",
        mood=3,
        ai_prompt_used=None,
        latest_ai_reflection=None,
        latest_ai_reflected_at=None,
        deleted_at=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        tags=[],
        people=[],
    )
    monkeypatch.setattr(
        journal.journal_service,
        "list_entries",
        AsyncMock(return_value={"data": [entry], "meta": {"page": 1, "page_size": 20, "total": 1}}),
    )
    monkeypatch.setattr(journal.JournalEntryResponse, "model_validate", staticmethod(lambda x: x))
    listed = await journal.list_entries(user, db)
    assert listed.meta.total == 1

    payload = SimpleNamespace(
        model_dump=lambda **_kwargs: {"entry_date": date.today(), "body": "x"}
    )
    monkeypatch.setattr(journal.journal_service, "create_entry", AsyncMock(return_value=entry))
    await journal.create_entry(payload, user, db)
    monkeypatch.setattr(journal.journal_service, "get_entry", AsyncMock(return_value=entry))
    await journal.get_entry(eid, user, db)
    monkeypatch.setattr(journal.journal_service, "update_entry", AsyncMock(return_value=entry))
    await journal.update_entry(eid, payload, user, db)
    monkeypatch.setattr(journal.journal_service, "delete_entry", AsyncMock(return_value=None))
    await journal.delete_entry(eid, user, db)

    async def _fake_daily_prompt(_user, _db):
        return {"prompt": "prompt", "source": "ai"}

    monkeypatch.setattr(journal.daily_prompt_service, "get_daily_prompt", _fake_daily_prompt)
    assert (await journal.get_daily_prompt(user, db))["data"].prompt == "prompt"

    run = SimpleNamespace(
        id=uuid4(),
        status="completed",
        response_text="reflection",
        tokens_input=1,
        tokens_output=2,
        error_message=None,
    )
    monkeypatch.setattr(
        journal.journal_ai_service, "trigger_reflection", AsyncMock(return_value=run)
    )
    reflect_payload = SimpleNamespace(mode="entry_plus_recent_context")
    reflected = await journal.reflect_entry(eid, reflect_payload, user, db)
    assert reflected["data"].status == "completed"

    async def fake_chunks(_entry_id, _mode, _user_id, _db):
        yield 'event: chunk\ndata: {"text":"one"}\n\n'

    monkeypatch.setattr(journal.journal_ai_service, "stream_reflection", fake_chunks)
    stream_response = await journal.stream_reflection(eid, user, db)
    chunks = []
    async for chunk in stream_response.body_iterator:
        chunks.append(chunk)
    assert any("[DONE]" in chunk for chunk in chunks)
    db.commit.assert_awaited()

    monkeypatch.setattr(
        journal.journal_repository,
        "get_by_id_including_deleted",
        AsyncMock(return_value=None),
    )
    with pytest.raises(AppException):
        await journal.list_ai_runs(eid, user, db)
    monkeypatch.setattr(
        journal.journal_repository,
        "get_by_id_including_deleted",
        AsyncMock(return_value=entry),
    )
    monkeypatch.setattr(
        journal.journal_repository,
        "list_ai_runs",
        AsyncMock(return_value=[run]),
    )
    monkeypatch.setattr(journal.JournalAiRunResponse, "model_validate", staticmethod(lambda x: x))
    runs = await journal.list_ai_runs(eid, user, db)
    assert len(runs["data"]) == 1
    assert (await journal.journal_stub())["status"] == "not_implemented"

    monkeypatch.setattr(
        tags.tag_service,
        "list_for_user",
        AsyncMock(return_value=[SimpleNamespace(id=uuid4(), name="work")]),
    )
    monkeypatch.setattr(tags.TagResponse, "model_validate", staticmethod(lambda x: x))
    out = await tags.list_tags(user, db)
    assert len(out["data"]) == 1


@pytest.mark.asyncio
async def test_prompt_builders_and_daily_prompt():
    entry = SimpleNamespace(
        entry_date=date.today(),
        mood=3,
        body="hello",
        people=[SimpleNamespace(name="Alex")],
    )
    recent = [SimpleNamespace(entry_date=date.today(), body="x" * 400)]
    text = prompt_builders.build_reflection_prompt(entry, recent)
    assert "People tagged: Alex" in text
    assert "..." in text
    assert daily_prompt_service._static_prompt("UTC")


@pytest.mark.asyncio
async def test_tag_repository_and_service():
    uid = uuid4()
    existing = SimpleNamespace(id=uuid4(), name="work", user_id=uid)
    db = FakeSession([ExecuteResult(one_or_none=existing)])
    assert await tag_repository.get_or_create("work", uid, db) is existing  # type: ignore[arg-type]

    db2 = FakeSession([ExecuteResult(one_or_none=None)])
    created = await tag_repository.get_or_create("work", uid, db2)  # type: ignore[arg-type]
    assert created.name == "work"
    with pytest.raises(ValueError):
        await tag_repository.get_or_create("   ", uid, db2)  # type: ignore[arg-type]

    db3 = FakeSession([ExecuteResult(rows=[existing])])
    assert await tag_repository.list_for_user(uid, db3) == [existing]  # type: ignore[arg-type]
    db4 = FakeSession([ExecuteResult(rows=[existing])])
    assert await tag_service.list_for_user(uid, db4) == [existing]  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_journal_repository_coverage():
    uid = uuid4()
    eid = uuid4()
    pid = uuid4()
    entry = SimpleNamespace(
        id=eid, user_id=uid, entry_date=date.today(), updated_at=datetime.now(UTC)
    )
    run = SimpleNamespace(id=uuid4(), created_at=datetime.now(UTC))

    db = FakeSession(
        [
            ExecuteResult(one=1),
            ExecuteResult(rows=[entry]),
            ExecuteResult(rows=[entry]),
            ExecuteResult(one_or_none=entry),
            ExecuteResult(one_or_none=entry),
            ExecuteResult(rows=[entry]),
            ExecuteResult(rows=[run]),
        ]
    )
    rows, total = await journal_repository.list_entries(
        uid,
        {
            "start_date": date.today(),
            "end_date": date.today(),
            "moods": [3],
            "search": "entry",
            "person_id": pid,
            "tag": "work",
        },
        1,
        20,
        db,
    )  # type: ignore[arg-type]
    assert total == 1
    assert rows == [entry]
    assert await journal_repository.list_recent_non_deleted(uid, 5, db) == [entry]  # type: ignore[arg-type]
    assert await journal_repository.get_by_id(eid, uid, db) == entry  # type: ignore[arg-type]
    assert await journal_repository.get_by_id_including_deleted(eid, uid, db) == entry  # type: ignore[arg-type]

    db_write = FakeSession([])
    created = await journal_repository.create(
        {"entry_date": date.today(), "body": "b"}, uid, db_write
    )  # type: ignore[arg-type]
    assert created.user_id == uid
    updated = await journal_repository.update(created, {"body": "new"}, db_write)  # type: ignore[arg-type]
    assert updated.body == "new"
    deleted = await journal_repository.soft_delete(updated, db_write)  # type: ignore[arg-type]
    assert deleted.deleted_at is not None
    assert await journal_repository.reverse_timeline_for_person(pid, uid, db) == [entry]  # type: ignore[arg-type]
    created_run = await journal_repository.create_ai_run(
        {"user_id": uid, "journal_entry_id": eid}, db_write
    )  # type: ignore[arg-type]
    assert created_run.user_id == uid
    updated_run = await journal_repository.update_ai_run(
        created_run, {"status": "completed"}, db_write
    )  # type: ignore[arg-type]
    assert updated_run.status == "completed"
    assert await journal_repository.list_ai_runs(eid, uid, db) == [run]  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_journal_repository_non_search_order_branch():
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


@pytest.mark.asyncio
async def test_journal_service_coverage(monkeypatch):
    uid = uuid4()
    eid = uuid4()
    pid = uuid4()
    db = SimpleNamespace(flush=AsyncMock())
    person = SimpleNamespace(id=pid, archived_at=None, last_talked_at=None)
    archived_person = SimpleNamespace(id=pid, archived_at=datetime.now(UTC), last_talked_at=None)
    entry = SimpleNamespace(id=eid, entry_date=date.today(), people=[], tags=[])

    monkeypatch.setattr(
        journal_service.journal_repository,
        "list_entries",
        AsyncMock(return_value=([entry], 1)),
    )
    listed = await journal_service.list_entries(uid, {}, 1, 20, db)
    assert listed["meta"].total == 1

    monkeypatch.setattr(
        journal_service.journal_repository, "get_by_id", AsyncMock(return_value=None)
    )
    with pytest.raises(AppException):
        await journal_service.get_entry(eid, uid, db)
    monkeypatch.setattr(
        journal_service.journal_repository, "get_by_id", AsyncMock(return_value=entry)
    )
    assert await journal_service.get_entry(eid, uid, db) is entry

    with pytest.raises(AppException):
        journal_service._validate_person_ids(
            [uuid4() for _ in range(journal_service.MAX_PERSON_LINKS_PER_ENTRY + 1)]
        )

    monkeypatch.setattr(
        journal_service.person_repository, "get_by_id", AsyncMock(return_value=None)
    )
    with pytest.raises(AppException):
        await journal_service._resolve_people([pid], uid, db)
    monkeypatch.setattr(
        journal_service.person_repository, "get_by_id", AsyncMock(return_value=archived_person)
    )
    with pytest.raises(AppException):
        await journal_service._resolve_people([pid], uid, db)
    monkeypatch.setattr(
        journal_service.person_repository, "get_by_id", AsyncMock(return_value=person)
    )
    people = await journal_service._resolve_people([pid, pid], uid, db)
    assert len(people) == 1

    monkeypatch.setattr(
        journal_service.tag_repository,
        "get_or_create",
        AsyncMock(return_value=SimpleNamespace(name="x")),
    )
    tags_list = await journal_service._resolve_tags(["x", " "], uid, db)
    assert len(tags_list) == 1
    journal_service._touch_last_talked([person], date.today())
    assert person.last_talked_at == date.today()

    monkeypatch.setattr(journal_service.journal_repository, "create", AsyncMock(return_value=entry))
    created = await journal_service.create_entry(
        {"entry_date": date.today(), "body": "b", "person_ids": [pid], "tag_names": ["x"]},
        uid,
        db,
    )
    assert created is entry

    monkeypatch.setattr(journal_service.journal_repository, "update", AsyncMock(return_value=entry))
    updated = await journal_service.update_entry(
        eid,
        uid,
        {"body": "u", "person_ids": [pid], "tag_names": ["x"]},
        db,
    )
    assert updated is entry

    monkeypatch.setattr(
        journal_service.journal_repository, "soft_delete", AsyncMock(return_value=entry)
    )
    assert await journal_service.delete_entry(eid, uid, db) is entry


@pytest.mark.asyncio
async def test_journal_ai_service_and_timeline(monkeypatch):
    uid = uuid4()
    eid = uuid4()
    pid = uuid4()
    db = SimpleNamespace(flush=AsyncMock())
    entry = SimpleNamespace(
        id=eid,
        entry_date=date.today(),
        body="entry",
        mood=4,
        people=[],
        latest_ai_reflection=None,
        latest_ai_reflected_at=None,
        ai_prompt_used=None,
    )
    run = SimpleNamespace(id=uuid4(), status="running", response_text=None)

    monkeypatch.setattr(
        journal_ai_service,
        "generate_text",
        lambda _prompt, max_tokens=800: SimpleNamespace(
            text="ok", tokens_input=11, tokens_output=22
        ),
    )
    reflection_text, t_in, t_out = journal_ai_service._generate_reflection("prompt")
    assert reflection_text == "ok"
    assert t_in == 11
    assert t_out == 22

    class _Err(Exception):
        pass

    monkeypatch.setattr(
        journal_ai_service,
        "generate_text",
        lambda _prompt, max_tokens=800: (_ for _ in ()).throw(
            journal_ai_service.AIGenerationError(
                message="boom", retryable=True, provider="anthropic", model_name="m"
            )
        ),
    )
    fallback_text, fallback_in, fallback_out = journal_ai_service._generate_reflection("prompt")
    assert fallback_text == journal_ai_service.DEFAULT_REFLECTION_TEXT
    assert fallback_in is None
    assert fallback_out is None

    monkeypatch.setattr(
        journal_ai_service.journal_repository, "get_by_id", AsyncMock(return_value=None)
    )
    with pytest.raises(AppException):
        await journal_ai_service.trigger_reflection(eid, "m", uid, db)
    with pytest.raises(AppException):
        await anext(journal_ai_service.stream_reflection(eid, "m", uid, db))

    monkeypatch.setattr(
        journal_ai_service.journal_repository, "get_by_id", AsyncMock(return_value=entry)
    )
    monkeypatch.setattr(
        journal_ai_service.journal_repository,
        "list_recent_non_deleted",
        AsyncMock(return_value=[entry]),
    )
    monkeypatch.setattr(
        journal_ai_service.journal_repository, "create_ai_run", AsyncMock(return_value=run)
    )
    monkeypatch.setattr(
        journal_ai_service.journal_repository, "update_ai_run", AsyncMock(return_value=run)
    )
    monkeypatch.setattr(
        journal_ai_service, "_generate_reflection", lambda _prompt: ("hello world", 10, 20)
    )
    reflected = await journal_ai_service.trigger_reflection(eid, "mode", uid, db)
    assert reflected is run
    chunks = []
    async for chunk in journal_ai_service.stream_reflection(eid, "mode", uid, db):
        chunks.append(chunk)
    assert any("event: done" in chunk for chunk in chunks)

    monkeypatch.setattr(
        person_repository, "get_by_id", AsyncMock(return_value=SimpleNamespace(id=pid))
    )
    monkeypatch.setattr(person_repository, "get_timeline", AsyncMock(return_value=[entry]))
    assert await people_service.get_timeline(pid, uid, db) == [entry]


@pytest.mark.asyncio
async def test_person_repository_get_timeline_bridge(monkeypatch):
    uid = uuid4()
    pid = uuid4()
    entry = SimpleNamespace(id=uuid4())

    from app import repositories as repositories_pkg

    monkeypatch.setattr(
        repositories_pkg.journal_repository,
        "reverse_timeline_for_person",
        AsyncMock(return_value=[entry]),
    )
    db = SimpleNamespace()
    assert await person_repository.get_timeline(pid, uid, db) == [entry]


@pytest.mark.asyncio
async def test_almanac_service_and_repository_coverage(monkeypatch):
    uid = uuid4()
    eid = uuid4()
    db = SimpleNamespace(flush=AsyncMock())
    entry = SimpleNamespace(
        id=eid,
        user_id=uid,
        entry_type=EntryTypeEnum.TASK.value,
        title="T",
        body="B",
        due_date=None,
        reminder_at=None,
        is_completed=False,
        completed_at=None,
        tags=[],
        created_at=datetime.now(UTC),
    )

    monkeypatch.setattr(
        almanac_service.almanac_repository,
        "list_entries",
        AsyncMock(return_value=([entry], 1)),
    )
    listed = await almanac_service.list_entries(uid, {}, 1, 20, db)
    assert listed["meta"].total == 1

    monkeypatch.setattr(
        almanac_service.almanac_repository, "get_by_id", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        almanac_service.almanac_repository, "get_by_id_any_user", AsyncMock(return_value=entry)
    )
    with pytest.raises(AppException):
        await almanac_service.get_entry(eid, uid, db)

    monkeypatch.setattr(
        almanac_service.almanac_repository, "get_by_id", AsyncMock(return_value=entry)
    )
    monkeypatch.setattr(
        almanac_service.tag_repository,
        "get_or_create",
        AsyncMock(return_value=SimpleNamespace(id=uuid4(), name="x")),
    )
    monkeypatch.setattr(
        almanac_service.almanac_repository, "create", AsyncMock(return_value=entry)
    )
    monkeypatch.setattr(
        almanac_service.reminder_repository,
        "cancel_pending_for_entity",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        almanac_service.reminder_repository, "create", AsyncMock(return_value=None)
    )
    created = await almanac_service.create_entry(
        {"entry_type": EntryTypeEnum.TASK.value, "title": "x", "tag_names": ["x"]},
        uid,
        db,
    )
    assert created is entry

    monkeypatch.setattr(almanac_service.almanac_repository, "update", AsyncMock(return_value=entry))
    updated = await almanac_service.update_entry(
        eid,
        uid,
        {"title": "u", "entry_type": EntryTypeEnum.TASK.value, "tag_names": ["x"]},
        db,
    )
    assert updated is entry

    monkeypatch.setattr(
        almanac_service.almanac_repository, "soft_delete", AsyncMock(return_value=entry)
    )
    assert await almanac_service.delete_entry(eid, uid, db) is entry
    monkeypatch.setattr(
        almanac_service.almanac_repository, "complete", AsyncMock(return_value=entry)
    )
    assert await almanac_service.complete_entry(eid, uid, db) is entry

    db_repo = FakeSession([ExecuteResult(one=1), ExecuteResult(rows=[entry])])
    rows, total = await almanac_repository.list_entries(
        uid,
        {"entry_type": "task", "search": "x", "is_completed": False},
        1,
        20,
        db_repo,
    )  # type: ignore[arg-type]
    assert total == 1
    assert rows == [entry]
    assert await almanac_repository.get_by_id(
        eid, uid, FakeSession([ExecuteResult(one_or_none=entry)])
    ) == entry  # type: ignore[arg-type]
    assert await almanac_repository.get_by_id_including_deleted(
        eid, uid, FakeSession([ExecuteResult(one_or_none=entry)])
    ) == entry  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_reminder_worker_poll_loop(monkeypatch):
    reminder = SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        entity_type="almanac_entry",
        entity_id=uuid4(),
        reminder_type="task",
        payload={"attempt_count": 0},
    )
    class _FakeSession:
        def __init__(self) -> None:
            self.commit = AsyncMock()
            self.flush = AsyncMock()

        def begin(self):
            return self

        async def __aenter__(self):
            return self

        async def __aexit__(self, _exc_type, _exc, _tb):
            return False

    fake_session = _FakeSession()

    class SessionFactory:
        def __call__(self):
            class _Ctx:
                async def __aenter__(self_nonlocal):
                    return fake_session

                async def __aexit__(self_nonlocal, exc_type, exc, tb):
                    return False

            return _Ctx()

    monkeypatch.setattr(reminder_jobs, "AsyncSessionLocal", SessionFactory())
    monkeypatch.setattr(
        reminder_jobs.reminder_repository, "get_due", AsyncMock(return_value=[reminder])
    )
    monkeypatch.setattr(
        reminder_jobs.reminder_repository, "mark_sent", AsyncMock(return_value=None)
    )
    await reminder_jobs.process_due_reminders()
    reminder_jobs.reminder_repository.mark_sent.assert_awaited_once()  # type: ignore[attr-defined]
