from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_reminders_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/v1/reminders")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_reminders_crud_like_flow(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    person = await api_client.post(
        "/api/v1/people",
        json={"name": "Jamie", "relationship_type": "friend"},
        headers=auth_headers,
    )
    assert person.status_code == 201
    person_id = person.json()["id"]

    created = await api_client.post(
        "/api/v1/reminders",
        json={
            "entity_type": "person",
            "entity_id": person_id,
            "reminder_type": "nudge",
            "scheduled_for": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "channel": "in_app",
            "payload": {"source": "integration-test"},
        },
        headers=auth_headers,
    )
    assert created.status_code == 201
    reminder_id = created.json()["id"]

    listed = await api_client.get("/api/v1/reminders", headers=auth_headers)
    assert listed.status_code == 200
    assert any(item["id"] == reminder_id for item in listed.json())

    updated = await api_client.patch(
        f"/api/v1/reminders/{reminder_id}",
        json={"channel": "sms"},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["channel"] == "sms"

    snoozed = await api_client.post(
        f"/api/v1/reminders/{reminder_id}/snooze",
        json={"until": (datetime.now(UTC) + timedelta(days=2)).isoformat()},
        headers=auth_headers,
    )
    assert snoozed.status_code == 200


@pytest.mark.asyncio
async def test_reminders_not_found_paths(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    missing_id = "00000000-0000-0000-0000-000000000555"
    update_missing = await api_client.patch(
        f"/api/v1/reminders/{missing_id}",
        json={"channel": "email"},
        headers=auth_headers,
    )
    assert update_missing.status_code == 404

    snooze_missing = await api_client.post(
        f"/api/v1/reminders/{missing_id}/snooze",
        json={"until": (datetime.now(UTC) + timedelta(days=2)).isoformat()},
        headers=auth_headers,
    )
    assert snooze_missing.status_code == 404
