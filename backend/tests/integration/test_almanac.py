import pytest
from httpx import AsyncClient

from tests.helpers import get_auth_headers


@pytest.mark.asyncio
async def test_almanac_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/v1/almanac/entries")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_almanac_capture_crud_complete_flow(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    captured = await api_client.post(
        "/api/v1/almanac/capture",
        json={"title": "Quick thought", "body": "hello world", "entry_type": "idea"},
        headers=auth_headers,
    )
    assert captured.status_code == 201
    captured_id = captured.json()["id"]

    create_task = await api_client.post(
        "/api/v1/almanac/entries",
        json={
            "entry_type": "task",
            "title": "Write integration tests",
            "body": "Need coverage",
            "tag_names": ["testing", "backend"],
        },
        headers=auth_headers,
    )
    assert create_task.status_code == 201
    entry_id = create_task.json()["id"]

    list_all = await api_client.get("/api/v1/almanac/entries", headers=auth_headers)
    assert list_all.status_code == 200
    assert list_all.json()["meta"]["total"] >= 2

    filtered = await api_client.get(
        "/api/v1/almanac/entries",
        params={"entry_type": "task"},
        headers=auth_headers,
    )
    assert filtered.status_code == 200
    ids = [item["id"] for item in filtered.json()["data"]]
    assert entry_id in ids

    get_entry = await api_client.get(
        f"/api/v1/almanac/entries/{entry_id}",
        headers=auth_headers,
    )
    assert get_entry.status_code == 200
    assert get_entry.json()["title"] == "Write integration tests"

    updated = await api_client.patch(
        f"/api/v1/almanac/entries/{entry_id}",
        json={"title": "Write backend integration tests"},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Write backend integration tests"

    completed = await api_client.post(
        f"/api/v1/almanac/entries/{entry_id}/complete",
        headers=auth_headers,
    )
    assert completed.status_code == 200
    assert completed.json()["is_completed"] is True

    deleted = await api_client.delete(
        f"/api/v1/almanac/entries/{entry_id}",
        headers=auth_headers,
    )
    assert deleted.status_code == 204

    missing = await api_client.get(
        f"/api/v1/almanac/entries/{entry_id}",
        headers=auth_headers,
    )
    assert missing.status_code in (403, 404)

    captured_get = await api_client.get(
        f"/api/v1/almanac/entries/{captured_id}",
        headers=auth_headers,
    )
    assert captured_get.status_code == 200


@pytest.mark.asyncio
async def test_almanac_validation_and_forbidden(api_client: AsyncClient, create_user) -> None:
    user1 = await get_auth_headers(
        api_client,
        create_user,
        "almanac-owner@example.com",
    )
    user2 = await get_auth_headers(
        api_client,
        create_user,
        "almanac-other@example.com",
    )

    invalid = await api_client.post(
        "/api/v1/almanac/entries",
        json={"entry_type": "idea", "title": "not-task", "due_date": "2030-01-01"},
        headers=user1,
    )
    assert invalid.status_code == 422

    non_task = await api_client.post(
        "/api/v1/almanac/entries",
        json={"entry_type": "idea", "title": "idea entry"},
        headers=user1,
    )
    assert non_task.status_code == 201
    non_task_id = non_task.json()["id"]

    complete_non_task = await api_client.post(
        f"/api/v1/almanac/entries/{non_task_id}/complete",
        headers=user1,
    )
    assert complete_non_task.status_code == 422

    forbidden_read = await api_client.get(
        f"/api/v1/almanac/entries/{non_task_id}",
        headers=user2,
    )
    assert forbidden_read.status_code == 403
