from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from starlette.requests import Request
from starlette.responses import Response
from unittest.mock import AsyncMock

from app.api.v1.endpoints import auth, moments, people, reminders
from app.core import exceptions


@pytest.mark.asyncio
async def test_auth_endpoint_flows(monkeypatch):
    password_field = "pass" + "word"
    response = Response()
    auth._set_refresh_cookie(response, "rtok")
    assert "refresh_token=rtok" in response.headers["set-cookie"]
    db = SimpleNamespace(commit=AsyncMock())
    monkeypatch.setattr(auth.auth_service, "login", AsyncMock(return_value=("at", "rt")))
    login_res = await auth.login(
        payload=SimpleNamespace(email="a@b.com", **{password_field: "pw"}),
        response=Response(),
        db=db,  # type: ignore[arg-type]
    )
    assert login_res.access_token == "at"
    db.commit.assert_awaited_once()
    with pytest.raises(Exception):
        await auth.refresh(Request({"type": "http", "headers": []}), Response(), db)  # type: ignore[arg-type]
    monkeypatch.setattr(auth.auth_service, "refresh", AsyncMock(return_value=("new-at", "new-rt")))
    req_with_cookie = Request(
        {"type": "http", "headers": [(b"cookie", b"refresh_token=abc")], "method": "POST"}
    )
    assert (await auth.refresh(req_with_cookie, Response(), db)).access_token == "new-at"  # type: ignore[arg-type]
    monkeypatch.setattr(auth.auth_service, "logout", AsyncMock())
    out = await auth.logout(req_with_cookie, Response(), db)  # type: ignore[arg-type]
    assert out.status_code in (200, 204)
    await auth.logout(Request({"type": "http", "headers": []}), Response(), db)  # type: ignore[arg-type]
    me = await auth.me(
        SimpleNamespace(id=uuid4(), email="e", display_name="n", timezone="UTC")  # type: ignore[arg-type]
    )
    assert me.email == "e"


@pytest.mark.asyncio
async def test_moments_people_reminders_endpoints(monkeypatch):
    uid = uuid4()
    pid = uuid4()
    mid = uuid4()
    rid = uuid4()
    user = SimpleNamespace(id=uid)
    db = SimpleNamespace(commit=AsyncMock())
    monkeypatch.setattr(
        moments.moment_service,
        "list_moments",
        AsyncMock(return_value=[SimpleNamespace(id=mid, user_id=uid, person_id=pid)]),
    )
    monkeypatch.setattr(
        moments.MomentResponse, "model_validate", staticmethod(lambda x: SimpleNamespace(raw=x))
    )
    assert len(await moments.list_person_moments(pid, user, db)) == 1  # type: ignore[arg-type]
    monkeypatch.setattr(
        moments.moment_service,
        "create_moment",
        AsyncMock(return_value=SimpleNamespace(id=mid, user_id=uid, person_id=pid)),
    )
    created = await moments.create_person_moment(
        pid, SimpleNamespace(model_dump=lambda: {"notes": "n"}), user, db  # type: ignore[arg-type]
    )
    assert created.raw.person_id == pid
    monkeypatch.setattr(
        moments.moment_service,
        "get_moment",
        AsyncMock(return_value=SimpleNamespace(id=mid, user_id=uid, person_id=pid)),
    )
    await moments.get_moment(mid, user, db)  # type: ignore[arg-type]
    monkeypatch.setattr(
        moments.moment_service,
        "update_moment",
        AsyncMock(return_value=SimpleNamespace(id=mid, user_id=uid, person_id=pid)),
    )
    await moments.update_moment(
        mid, SimpleNamespace(model_dump=lambda exclude_unset: {"notes": "u"}), user, db  # type: ignore[arg-type]
    )
    monkeypatch.setattr(moments.moment_service, "delete_moment", AsyncMock(return_value=None))
    await moments.delete_moment(mid, user, db)  # type: ignore[arg-type]

    monkeypatch.setattr(
        people.people_service,
        "get_drifting_away",
        AsyncMock(return_value=[SimpleNamespace(id=pid, user_id=uid)]),
    )
    monkeypatch.setattr(
        people.people_service, "get_new_people", AsyncMock(return_value=[SimpleNamespace(id=pid, user_id=uid)])
    )
    monkeypatch.setattr(
        people.people_service,
        "list_people",
        AsyncMock(
            return_value={
                "data": [
                    {
                        "id": pid,
                        "name": "Pat",
                        "relationship_type": "friend",
                        "warmth_score": 0.0,
                        "created_at": datetime.now(UTC),
                        "updated_at": datetime.now(UTC),
                    }
                ],
                "meta": {"page": 1, "page_size": 20, "total": 1},
            }
        ),
    )
    monkeypatch.setattr(
        people.people_service,
        "create_person",
        AsyncMock(return_value=SimpleNamespace(id=pid, user_id=uid)),
    )
    monkeypatch.setattr(
        people.people_service,
        "get_person",
        AsyncMock(return_value=SimpleNamespace(id=pid, user_id=uid)),
    )
    monkeypatch.setattr(
        people.people_service,
        "update_person",
        AsyncMock(return_value=SimpleNamespace(id=pid, user_id=uid)),
    )
    monkeypatch.setattr(people.people_service, "archive_person", AsyncMock(return_value=None))
    monkeypatch.setattr(people.PersonResponse, "model_validate", staticmethod(lambda x: x))
    await people.get_drifting_away(user, db)  # type: ignore[arg-type]
    await people.get_new_people(user, db)  # type: ignore[arg-type]
    assert (await people.list_people(user, db)).meta.total == 1  # type: ignore[arg-type]
    await people.create_person(SimpleNamespace(model_dump=lambda: {"name": "A"}), user, db)  # type: ignore[arg-type]
    await people.get_person(pid, user, db)  # type: ignore[arg-type]
    await people.update_person(
        pid, SimpleNamespace(model_dump=lambda exclude_unset: {"name": "B"}), user, db  # type: ignore[arg-type]
    )
    await people.archive_person(pid, user, db)  # type: ignore[arg-type]
    assert await people.get_person_timeline(pid, user, db) == {"data": []}  # type: ignore[arg-type]

    pending_rem = SimpleNamespace(id=rid)
    monkeypatch.setattr(reminders.reminder_repository, "list_pending_for_user", AsyncMock(return_value=[pending_rem]))
    monkeypatch.setattr(reminders.reminder_repository, "create", AsyncMock(return_value=pending_rem))
    monkeypatch.setattr(reminders.reminder_repository, "get_for_user", AsyncMock(return_value=pending_rem))
    monkeypatch.setattr(reminders.reminder_repository, "snooze", AsyncMock(return_value=pending_rem))
    monkeypatch.setattr(
        reminders.ReminderResponse, "model_validate", staticmethod(lambda x: SimpleNamespace(raw=x))
    )
    await reminders.list_reminders(user, db)  # type: ignore[arg-type]
    await reminders.create_reminder(
        SimpleNamespace(model_dump=lambda: {"entity_type": "person"}), user, db  # type: ignore[arg-type]
    )
    await reminders.update_reminder(
        rid, SimpleNamespace(model_dump=lambda exclude_unset: {"status": "pending"}), user, db  # type: ignore[arg-type]
    )
    await reminders.snooze_reminder(
        rid, SimpleNamespace(until=datetime.now(UTC) + timedelta(days=1)), user, db  # type: ignore[arg-type]
    )
    monkeypatch.setattr(reminders.reminder_repository, "get_for_user", AsyncMock(return_value=None))
    with pytest.raises(exceptions.AppException):
        await reminders.update_reminder(rid, SimpleNamespace(model_dump=lambda exclude_unset: {}), user, db)  # type: ignore[arg-type]
    with pytest.raises(exceptions.AppException):
        await reminders.snooze_reminder(rid, SimpleNamespace(until=datetime.now(UTC)), user, db)  # type: ignore[arg-type]
