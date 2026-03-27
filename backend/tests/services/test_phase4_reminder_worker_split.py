import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories import reminder_repository
from app.services.ai_types import AIGenerationError
from app.workers import reminder_jobs
from tests.helpers import ExecuteResult, FakeSession


@pytest.mark.asyncio
async def test_reminder_repository_list_for_user_and_invalid_limit():
    uid = uuid4()
    db = FakeSession([ExecuteResult(rows=[]), ExecuteResult(rows=[])])
    await reminder_repository.list_for_user(uid, db, "pending", 1, 20)  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        await reminder_repository.get_due(datetime.now(UTC), db, limit=0)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_reminder_worker_nudge_ai_fallback(monkeypatch):
    uid = uuid4()
    reminder = SimpleNamespace(
        id=uuid4(),
        user_id=uid,
        entity_type="person",
        entity_id=uuid4(),
        reminder_type="nudge",
        payload={},
        scheduled_for=datetime.now(UTC),
        status="pending",
        failure_reason=None,
    )
    sess = FakeSession([])

    class _Ctx:
        async def __aenter__(self):
            return sess

        async def __aexit__(self, _exc_type, _exc, _tb):
            return False

    monkeypatch.setattr(reminder_jobs, "AsyncSessionLocal", lambda: _Ctx())
    monkeypatch.setattr(
        reminder_jobs.reminder_repository, "get_due", AsyncMock(side_effect=[[reminder], []])
    )
    monkeypatch.setattr(
        reminder_jobs.person_repository,
        "get_by_id",
        AsyncMock(return_value=SimpleNamespace(name="Alex")),
    )
    monkeypatch.setattr(reminder_jobs, "build_nudge_prompt", AsyncMock(return_value="prompt"))
    monkeypatch.setattr(
        reminder_jobs,
        "generate_text",
        _raise_generation_error,
    )
    monkeypatch.setattr(
        reminder_jobs.reminder_repository,
        "mark_sent",
        AsyncMock(return_value=None),
    )
    await reminder_jobs.process_due_reminders()


@pytest.mark.asyncio
async def test_reminder_worker_marks_failed_after_max_attempts(monkeypatch):
    uid = uuid4()
    sess = FakeSession([])

    class _Ctx:
        async def __aenter__(self):
            return sess

        async def __aexit__(self, _exc_type, _exc, _tb):
            return False

    monkeypatch.setattr(reminder_jobs, "AsyncSessionLocal", lambda: _Ctx())
    failing = SimpleNamespace(
        id=uuid4(),
        user_id=uid,
        entity_type="person",
        entity_id=uuid4(),
        reminder_type="nudge",
        payload={"attempt_count": 2},
        scheduled_for=datetime.now(UTC),
        status="pending",
        failure_reason=None,
    )
    monkeypatch.setattr(
        reminder_jobs.reminder_repository, "get_due", AsyncMock(side_effect=[[failing], []])
    )
    monkeypatch.setattr(
        reminder_jobs.reminder_repository,
        "mark_sent",
        AsyncMock(side_effect=RuntimeError("delivery failed")),
    )
    monkeypatch.setattr(
        reminder_jobs.reminder_repository,
        "mark_failed",
        AsyncMock(return_value=None),
    )
    await reminder_jobs.process_due_reminders()


def test_reminder_worker_sanitize_nudge_text():
    assert reminder_jobs._sanitize_nudge_text("", "Alex") is None
    assert "about Alex" in (reminder_jobs._sanitize_nudge_text("Ping", "Alex") or "")


@pytest.mark.asyncio
async def test_reminder_worker_no_due_items(monkeypatch):
    sess = FakeSession([])

    class _Ctx:
        async def __aenter__(self):
            return sess

        async def __aexit__(self, _exc_type, _exc, _tb):
            return False

    monkeypatch.setattr(reminder_jobs, "AsyncSessionLocal", lambda: _Ctx())
    monkeypatch.setattr(
        reminder_jobs.reminder_repository, "get_due", AsyncMock(return_value=[])
    )
    await reminder_jobs.process_due_reminders()


@pytest.mark.asyncio
async def test_reminder_worker_person_lookup_failure_still_sends(monkeypatch):
    uid = uuid4()
    sess = FakeSession([])

    class _Ctx:
        async def __aenter__(self):
            return sess

        async def __aexit__(self, _exc_type, _exc, _tb):
            return False

    monkeypatch.setattr(reminder_jobs, "AsyncSessionLocal", lambda: _Ctx())
    reminder2 = SimpleNamespace(
        id=uuid4(),
        user_id=uid,
        entity_type="person",
        entity_id=uuid4(),
        reminder_type="nudge",
        payload={},
        scheduled_for=datetime.now(UTC),
        status="pending",
        failure_reason=None,
    )
    monkeypatch.setattr(
        reminder_jobs.reminder_repository, "get_due", AsyncMock(side_effect=[[reminder2], []])
    )
    monkeypatch.setattr(
        reminder_jobs.person_repository,
        "get_by_id",
        AsyncMock(side_effect=RuntimeError("lookup failed")),
    )
    monkeypatch.setattr(
        reminder_jobs.reminder_repository,
        "mark_sent",
        AsyncMock(return_value=None),
    )
    await reminder_jobs.process_due_reminders()


@pytest.mark.asyncio
async def test_reminder_worker_successful_nudge_injects_payload(monkeypatch):
    uid = uuid4()
    sess = FakeSession([])

    class _Ctx:
        async def __aenter__(self):
            return sess

        async def __aexit__(self, _exc_type, _exc, _tb):
            return False

    monkeypatch.setattr(reminder_jobs, "AsyncSessionLocal", lambda: _Ctx())
    reminder3 = SimpleNamespace(
        id=uuid4(),
        user_id=uid,
        entity_type="person",
        entity_id=uuid4(),
        reminder_type="nudge",
        payload={},
        scheduled_for=datetime.now(UTC),
        status="pending",
        failure_reason=None,
    )
    monkeypatch.setattr(
        reminder_jobs.reminder_repository, "get_due", AsyncMock(side_effect=[[reminder3], []])
    )
    monkeypatch.setattr(
        reminder_jobs.person_repository,
        "get_by_id",
        AsyncMock(return_value=SimpleNamespace(name="Alex")),
    )
    monkeypatch.setattr(reminder_jobs, "build_nudge_prompt", AsyncMock(return_value="prompt"))
    monkeypatch.setattr(
        reminder_jobs,
        "generate_text",
        lambda *_args, **_kwargs: SimpleNamespace(text="Specific thought?"),
    )
    monkeypatch.setattr(
        reminder_jobs.reminder_repository,
        "mark_sent",
        AsyncMock(return_value=None),
    )
    await reminder_jobs.process_due_reminders()
    assert "nudge_text" in reminder3.payload


def _raise_generation_error(*_args, **_kwargs):
    raise AIGenerationError("fail", True, "anthropic", "m")


@pytest.mark.asyncio
async def test_generate_nudge_text_fallback_when_prompt_missing(monkeypatch):
    reminder = SimpleNamespace(user_id=uuid4(), entity_id=uuid4())
    person = SimpleNamespace(name="Alex")
    monkeypatch.setattr(reminder_jobs, "build_nudge_prompt", AsyncMock(return_value=None))

    text = await reminder_jobs._generate_nudge_text(reminder, person, SimpleNamespace())

    assert text == "Time to reach out to Alex."


@pytest.mark.asyncio
async def test_maybe_attach_nudge_payload_skips_non_nudge():
    reminder = SimpleNamespace(
        reminder_type="general",
        entity_type="person",
        payload={},
    )

    await reminder_jobs._maybe_attach_nudge_payload(reminder, SimpleNamespace())

    assert reminder.payload == {}


@pytest.mark.asyncio
async def test_handle_processing_error_reschedules_when_under_limit():
    flush_mock = AsyncMock(return_value=None)
    reminder = SimpleNamespace(payload={}, scheduled_for=None, status="sent", failure_reason=None)

    await reminder_jobs._handle_processing_error(
        reminder, 1, RuntimeError("temporary"), SimpleNamespace(flush=flush_mock)
    )

    assert reminder.payload["attempt_count"] == 2
    assert reminder.status == "pending"
    assert reminder.failure_reason == "temporary"
    assert reminder.scheduled_for is not None
    flush_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_poll_loop_logs_errors_and_sleeps(monkeypatch):
    monkeypatch.setattr(
        reminder_jobs, "process_due_reminders", AsyncMock(side_effect=RuntimeError("boom"))
    )
    exception_logger = MagicMock()
    monkeypatch.setattr(reminder_jobs.logger, "exception", exception_logger)
    sleep_mock = AsyncMock(side_effect=asyncio.CancelledError())
    monkeypatch.setattr(reminder_jobs.asyncio, "sleep", sleep_mock)

    with pytest.raises(asyncio.CancelledError):
        await reminder_jobs.run_poll_loop(interval_seconds=1)

    exception_logger.assert_called_once()
    sleep_mock.assert_awaited_once_with(1)

