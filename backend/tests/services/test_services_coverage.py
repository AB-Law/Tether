from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core import exceptions, security
from app.domain.people.rules import SentimentEnum
from app.services import (
    auth_service,
    moment_service,
    people_service,
    reminder_service,
    warmth_service,
)
from tests.helpers import ExecuteResult, FakeSession


@pytest.mark.asyncio
async def test_services_cover_happy_and_error_paths(monkeypatch):
    uid = uuid4()
    pid = uuid4()
    mid = uuid4()
    db = FakeSession([ExecuteResult(one_or_none=None)])
    monkeypatch.setattr(auth_service.user_repository, "get_by_email", AsyncMock(return_value=None))
    with pytest.raises(exceptions.AppException):
        await auth_service.login("a@b.com", "pw", db)  # type: ignore[arg-type]
    user = SimpleNamespace(id=uid, password_hash=security.hash_password("pw"), is_active=True)
    monkeypatch.setattr(auth_service.user_repository, "get_by_email", AsyncMock(return_value=user))
    a_tok, r_tok = await auth_service.login("a@b.com", "pw", db)  # type: ignore[arg-type]
    assert a_tok and r_tok
    bad_row = SimpleNamespace(revoked_at=None, expires_at=datetime.now(UTC) - timedelta(days=1))
    db2 = FakeSession([ExecuteResult(one_or_none=bad_row)])
    with pytest.raises(exceptions.AppException):
        await auth_service.refresh("x", db2)  # type: ignore[arg-type]
    good_row = SimpleNamespace(
        user_id=uid,
        revoked_at=None,
        expires_at=datetime.now(UTC) + timedelta(days=1),
        last_used_at=None,
    )
    db3 = FakeSession([ExecuteResult(one_or_none=good_row)])
    at, rt = await auth_service.refresh("x", db3)  # type: ignore[arg-type]
    assert at and rt
    db4 = FakeSession([ExecuteResult(one_or_none=SimpleNamespace(revoked_at=None))])
    await auth_service.logout("x", db4)  # type: ignore[arg-type]
    monkeypatch.setattr(auth_service, "decode_access_token", lambda _t: {})
    with pytest.raises(exceptions.AppException):
        await auth_service.get_current_user("t", db4)  # type: ignore[arg-type]
    monkeypatch.setattr(auth_service, "decode_access_token", lambda _t: {"sub": str(uid)})
    monkeypatch.setattr(auth_service.user_repository, "get_by_id", AsyncMock(return_value=None))
    with pytest.raises(exceptions.AppException):
        await auth_service.get_current_user("t", db4)  # type: ignore[arg-type]
    monkeypatch.setattr(
        auth_service.user_repository,
        "get_by_id",
        AsyncMock(return_value=SimpleNamespace(is_active=False)),
    )
    with pytest.raises(exceptions.AppException):
        await auth_service.get_current_user("t", db4)  # type: ignore[arg-type]
    active_user = SimpleNamespace(is_active=True)
    monkeypatch.setattr(
        auth_service.user_repository, "get_by_id", AsyncMock(return_value=active_user)
    )
    assert await auth_service.get_current_user("t", db4) is active_user  # type: ignore[arg-type]
    monkeypatch.setattr(moment_service.person_repository, "get_by_id", AsyncMock(return_value=None))
    with pytest.raises(exceptions.AppException):
        await moment_service.list_moments(pid, uid, db4)  # type: ignore[arg-type]
    monkeypatch.setattr(
        moment_service.person_repository, "get_by_id", AsyncMock(return_value=SimpleNamespace())
    )
    monkeypatch.setattr(
        moment_service.moment_repository, "list_by_person", AsyncMock(return_value=[1])
    )
    assert await moment_service.list_moments(pid, uid, db4) == [1]  # type: ignore[arg-type]
    monkeypatch.setattr(moment_service.moment_repository, "get_by_id", AsyncMock(return_value=None))
    with pytest.raises(exceptions.AppException):
        await moment_service.get_moment(mid, uid, db4)  # type: ignore[arg-type]
    moment_obj = SimpleNamespace(person_id=pid, occurred_on=date.today())
    monkeypatch.setattr(
        moment_service.moment_repository, "get_by_id", AsyncMock(return_value=moment_obj)
    )
    assert await moment_service.get_moment(mid, uid, db4) is moment_obj  # type: ignore[arg-type]
    person_obj = SimpleNamespace(last_talked_at=None, id=pid)
    monkeypatch.setattr(
        moment_service.person_repository, "get_by_id", AsyncMock(return_value=person_obj)
    )
    monkeypatch.setattr(
        moment_service.moment_repository, "create", AsyncMock(return_value=moment_obj)
    )
    monkeypatch.setattr(
        moment_service,
        "warmth_service",
        SimpleNamespace(recalculate_for_person=AsyncMock()),
    )
    monkeypatch.setattr(
        moment_service,
        "reminder_service",
        SimpleNamespace(schedule_nudge=AsyncMock()),
    )
    await moment_service.create_moment({"person_id": pid}, uid, db4)  # type: ignore[arg-type]
    monkeypatch.setattr(moment_service.person_repository, "get_by_id", AsyncMock(return_value=None))
    with pytest.raises(exceptions.AppException):
        await moment_service.create_moment({"person_id": pid}, uid, db4)  # type: ignore[arg-type]
    monkeypatch.setattr(
        moment_service.moment_repository, "update", AsyncMock(return_value=moment_obj)
    )
    await moment_service.update_moment(mid, uid, {"x": 1}, db4)  # type: ignore[arg-type]
    monkeypatch.setattr(
        moment_service.moment_repository, "soft_delete", AsyncMock(return_value=moment_obj)
    )
    await moment_service.delete_moment(mid, uid, db4)  # type: ignore[arg-type]
    monkeypatch.setattr(
        people_service.person_repository, "list_people", AsyncMock(return_value=(["p"], 7))
    )
    listed = await people_service.list_people(uid, None, None, False, 1, 20, db4)  # type: ignore[arg-type]
    assert listed["meta"].total == 7
    monkeypatch.setattr(people_service.person_repository, "get_by_id", AsyncMock(return_value=None))
    with pytest.raises(exceptions.AppException):
        await people_service.get_person(pid, uid, db4)  # type: ignore[arg-type]
    monkeypatch.setattr(
        people_service.person_repository,
        "get_by_id",
        AsyncMock(return_value=SimpleNamespace(id=pid)),
    )
    person_created = SimpleNamespace(id=pid, contact_cadence_days=3)
    monkeypatch.setattr(
        people_service.person_repository, "create", AsyncMock(return_value=person_created)
    )
    monkeypatch.setattr(people_service.reminder_service, "schedule_nudge", AsyncMock())
    await people_service.create_person({"name": "x"}, uid, db4)  # type: ignore[arg-type]
    monkeypatch.setattr(
        people_service.person_repository, "update", AsyncMock(return_value=person_created)
    )
    monkeypatch.setattr(
        people_service.person_repository, "soft_archive", AsyncMock(return_value=person_created)
    )
    await people_service.update_person(pid, uid, {"name": "y"}, db4)  # type: ignore[arg-type]
    await people_service.archive_person(pid, uid, db4)  # type: ignore[arg-type]
    monkeypatch.setattr(
        people_service.person_repository, "drifting_away", AsyncMock(return_value=[])
    )
    monkeypatch.setattr(people_service.person_repository, "new_people", AsyncMock(return_value=[]))
    await people_service.get_drifting_away(uid, db4)  # type: ignore[arg-type]
    await people_service.get_new_people(uid, db4)  # type: ignore[arg-type]
    person = SimpleNamespace(
        archived_at=None,
        contact_cadence_days=2,
        last_talked_at=date.today(),
        next_nudge_at=None,
    )
    monkeypatch.setattr(reminder_service, "get_by_id", AsyncMock(return_value=person))
    monkeypatch.setattr(
        reminder_service.reminder_repository, "cancel_pending_for_entity", AsyncMock()
    )
    monkeypatch.setattr(reminder_service.reminder_repository, "create", AsyncMock())
    await reminder_service.schedule_nudge(pid, uid, db4)  # type: ignore[arg-type]
    monkeypatch.setattr(reminder_service, "get_by_id", AsyncMock(return_value=None))
    await reminder_service.schedule_nudge(pid, uid, db4)  # type: ignore[arg-type]
    monkeypatch.setattr(warmth_service.person_repository, "get_by_id", AsyncMock(return_value=None))
    assert abs(await warmth_service.recalculate_for_person(pid, uid, db4)) < 1e-9  # type: ignore[arg-type]
    target_person = SimpleNamespace(warmth_score=0.0)
    monkeypatch.setattr(
        warmth_service.person_repository, "get_by_id", AsyncMock(return_value=target_person)
    )
    monkeypatch.setattr(
        warmth_service.moment_repository,
        "list_active_for_person",
        AsyncMock(
            return_value=[
                SimpleNamespace(sentiment=SentimentEnum.WARM.value, occurred_on=date.today())
            ]
        ),
    )
    assert await warmth_service.recalculate_for_person(pid, uid, db4) >= 0.0  # type: ignore[arg-type]
    inactive = SimpleNamespace(id=uid, password_hash=security.hash_password("pw"), is_active=False)
    monkeypatch.setattr(
        auth_service.user_repository, "get_by_email", AsyncMock(return_value=inactive)
    )
    with pytest.raises(exceptions.AppException):
        await auth_service.login("a@b.com", "pw", db)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_reminder_service_and_poll_sleep_path(monkeypatch):
    uid = uuid4()
    pid = uuid4()
    db = FakeSession([])
    monkeypatch.setattr(reminder_service, "get_by_id", AsyncMock(return_value=None))
    await reminder_service.schedule_nudge(pid, uid, db)  # type: ignore[arg-type]
    archived = SimpleNamespace(
        archived_at=datetime.now(UTC),
        contact_cadence_days=None,
        last_talked_at=None,
        next_nudge_at="x",
    )
    monkeypatch.setattr(reminder_service, "get_by_id", AsyncMock(return_value=archived))
    monkeypatch.setattr(
        reminder_service.reminder_repository, "cancel_pending_for_entity", AsyncMock()
    )
    monkeypatch.setattr(reminder_service.reminder_repository, "create", AsyncMock())
    await reminder_service.schedule_nudge(pid, uid, db)  # type: ignore[arg-type]
    assert archived.next_nudge_at is None
    active = SimpleNamespace(
        archived_at=None,
        contact_cadence_days=2,
        last_talked_at=None,
        next_nudge_at=None,
    )
    monkeypatch.setattr(reminder_service, "get_by_id", AsyncMock(return_value=active))
    await reminder_service.schedule_nudge(pid, uid, db)  # type: ignore[arg-type]
    assert active.next_nudge_at is not None
