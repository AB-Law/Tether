import asyncio
from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core import enums, exceptions
from app.domain.people.rules import SentimentEnum, compute_warmth_score
from app.repositories import (
    moment_repository,
    person_repository,
    reminder_repository,
    user_repository,
)
from app.schemas.common import NotImplementedResponse
from app.workers import reminder_jobs
from tests.helpers import ExecuteResult, FakeSession


@pytest.mark.asyncio
async def test_repositories_models_rules_and_worker(monkeypatch):
    uid = uuid4()
    pid = uuid4()
    mid = uuid4()
    rid = uuid4()
    db = FakeSession(
        [
            ExecuteResult(one_or_none="u"),
            ExecuteResult(one_or_none="u2"),
            ExecuteResult(one=3),
            ExecuteResult(rows=["p1", "p2"]),
            ExecuteResult(one_or_none="person"),
            ExecuteResult(
                rows=[
                    SimpleNamespace(last_talked_at=None, contact_cadence_days=2),
                    SimpleNamespace(
                        last_talked_at=date.today() - timedelta(days=5), contact_cadence_days=2
                    ),
                    SimpleNamespace(last_talked_at=date.today(), contact_cadence_days=2),
                ]
            ),
            ExecuteResult(rows=["pb"]),
            ExecuteResult(rows=["m1"]),
            ExecuteResult(one_or_none="m"),
            ExecuteResult(rows=["m2"]),
            ExecuteResult(rows=["r1"]),
            ExecuteResult(rows=["r2"]),
            ExecuteResult(one_or_none="r3"),
            ExecuteResult(
                rows=[SimpleNamespace(status="pending"), SimpleNamespace(status="pending")]
            ),
        ]
    )
    assert await user_repository.get_by_email("a@b.com", db) == "u"  # type: ignore[arg-type]
    assert await user_repository.get_by_id(uid, db) == "u2"  # type: ignore[arg-type]
    created_user = await user_repository.create("e", "h", "n", db)  # type: ignore[arg-type]
    assert created_user.email == "e"
    items, total = await person_repository.list_people(uid, "friend", "a", False, 1, 10, db)  # type: ignore[arg-type]
    assert total == 3
    assert items == ["p1", "p2"]
    assert await person_repository.get_by_id(pid, uid, db) == "person"  # type: ignore[arg-type]
    p = await person_repository.create({"name": "A"}, uid, db)  # type: ignore[arg-type]
    p = await person_repository.update(p, {"name": "B"}, db)  # type: ignore[arg-type]
    p = await person_repository.soft_archive(p, db)  # type: ignore[arg-type]
    assert p.archived_at is not None
    drifting = await person_repository.drifting_away(uid, 10, db)  # type: ignore[arg-type]
    assert len(drifting) == 2
    assert await person_repository.new_people(uid, db) == ["pb"]  # type: ignore[arg-type]
    db_archived = FakeSession([ExecuteResult(one=1), ExecuteResult(rows=["archived"])])
    archived_items, archived_total = await person_repository.list_people(
        uid,
        None,
        None,
        True,
        1,
        10,
        db_archived,  # type: ignore[arg-type]
    )
    assert archived_total == 1
    assert archived_items == ["archived"]
    assert await moment_repository.list_by_person(pid, uid, db) == ["m1"]  # type: ignore[arg-type]
    assert await moment_repository.get_by_id(mid, uid, db) == "m"  # type: ignore[arg-type]
    m = await moment_repository.create({"person_id": pid, "occurred_on": date.today()}, uid, db)  # type: ignore[arg-type]
    m = await moment_repository.update(m, {"notes": "x"}, db)  # type: ignore[arg-type]
    m = await moment_repository.soft_delete(m, db)  # type: ignore[arg-type]
    assert m.deleted_at is not None
    assert await moment_repository.list_active_for_person(pid, db) == ["m2"]  # type: ignore[arg-type]
    r = await reminder_repository.create(
        {
            "entity_type": "person",
            "entity_id": pid,
            "reminder_type": "nudge",
            "scheduled_for": datetime.now(UTC),
            "status": "pending",
            "channel": "in_app",
            "payload": None,
        },
        uid,
        db,  # type: ignore[arg-type]
    )
    assert r.user_id == uid
    assert await reminder_repository.list_pending_for_user(uid, db) == ["r1"]  # type: ignore[arg-type]
    assert await reminder_repository.get_due(datetime.now(UTC), db) == ["r2"]  # type: ignore[arg-type]
    assert await reminder_repository.get_for_user(rid, uid, db) == "r3"  # type: ignore[arg-type]
    await reminder_repository.mark_sent(r, db)  # type: ignore[arg-type]
    await reminder_repository.mark_failed(r, "x", db)  # type: ignore[arg-type]
    await reminder_repository.snooze(r, datetime.now(UTC) + timedelta(days=1), db)  # type: ignore[arg-type]
    await reminder_repository.cancel_pending_for_entity("person", pid, uid, db)  # type: ignore[arg-type]
    assert NotImplementedResponse().status == "not_implemented"
    assert enums.AppEnv.DEVELOPMENT == "development"
    exc = exceptions.AppException(code="c", message="m", status_code=409, details={"x": 1})
    assert exc.status_code == 409
    score = compute_warmth_score(
        [
            (SentimentEnum.WARM.value, date.today()),
            (SentimentEnum.HURTFUL.value, date.today() - timedelta(days=3)),
            ("unknown", date.today()),
        ]
    )
    assert -100.0 <= score <= 100.0
    from app.models.person_connection import PersonConnection

    conn = PersonConnection(user_id=uid, person_id=pid, connected_person_id=uuid4())
    assert conn.user_id == uid
    due = [
        SimpleNamespace(
            id=uuid4(),
            user_id=uuid4(),
            entity_type="person",
            entity_id=pid,
            reminder_type="nudge",
            payload={"attempt_count": 0},
        ),
        SimpleNamespace(
            id=uuid4(),
            user_id=uuid4(),
            entity_type="person",
            entity_id=uuid4(),
            reminder_type="nudge",
            payload={"attempt_count": 0},
        ),
    ]
    sess = FakeSession([])

    class Ctx:
        async def __aenter__(self):
            return sess

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(reminder_jobs, "AsyncSessionLocal", lambda: Ctx())
    monkeypatch.setattr(reminder_jobs.reminder_repository, "get_due", AsyncMock(return_value=due))
    monkeypatch.setattr(reminder_jobs.reminder_repository, "mark_sent", AsyncMock())
    await reminder_jobs.process_due_reminders()
    assert reminder_jobs.reminder_repository.mark_sent.await_count == 2  # type: ignore[attr-defined]
    async def failing_process():
        raise RuntimeError("process-failed")

    monkeypatch.setattr(reminder_jobs, "process_due_reminders", failing_process)
    monkeypatch.setattr(asyncio, "sleep", AsyncMock(side_effect=RuntimeError("stop")))
    with pytest.raises(RuntimeError):
        await reminder_jobs.run_poll_loop(interval_seconds=0)


@pytest.mark.asyncio
async def test_worker_poll_sleep_path(monkeypatch):
    monkeypatch.setattr(reminder_jobs, "process_due_reminders", AsyncMock(return_value=None))
    monkeypatch.setattr(asyncio, "sleep", AsyncMock(side_effect=RuntimeError("stop")))
    with pytest.raises(RuntimeError):
        await reminder_jobs.run_poll_loop(interval_seconds=0)
