import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_tags_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/v1/tags")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_tags_list_after_data_creation(
    api_client: AsyncClient, auth_headers: dict[str, str], today_str: str
) -> None:
    create_entry = await api_client.post(
        "/api/v1/journal/entries",
        json={
            "entry_date": today_str,
            "body": "Create tags from journal entry",
            "tag_names": ["work", "integration"],
        },
        headers=auth_headers,
    )
    assert create_entry.status_code == 201

    tags = await api_client.get("/api/v1/tags", headers=auth_headers)
    assert tags.status_code == 200
    names = [item["name"] for item in tags.json()["data"]]
    assert "work" in names


@pytest.mark.asyncio
async def test_tags_sorted_and_empty_for_new_user(
    api_client: AsyncClient, create_user
) -> None:
    email = "fresh-tags@example.com"
    await create_user(email=email, password="password123")
    login = await api_client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    empty = await api_client.get("/api/v1/tags", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["data"] == []

    await api_client.post(
        "/api/v1/journal/entries",
        json={
            "entry_date": "2026-01-01",
            "body": "sorted tags",
            "tag_names": ["zulu", "alpha", "beta"],
        },
        headers=headers,
    )
    populated = await api_client.get("/api/v1/tags", headers=headers)
    names = [item["name"] for item in populated.json()["data"]]
    assert names == sorted(names)
