from datetime import date

import pytest
from httpx import AsyncClient


async def _auth_for(api_client: AsyncClient, create_user, email: str) -> dict[str, str]:
    await create_user(email=email, password="password123")
    login = await api_client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.asyncio
async def test_moments_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/v1/moments/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_moments_crud(api_client: AsyncClient, auth_headers: dict[str, str]) -> None:
    person = await api_client.post(
        "/api/v1/people",
        json={"name": "Morgan", "relationship_type": "friend"},
        headers=auth_headers,
    )
    assert person.status_code == 201
    person_id = person.json()["id"]

    created = await api_client.post(
        f"/api/v1/people/{person_id}/moments",
        json={
            "person_id": person_id,
            "title": "Coffee chat",
            "moment_type": "conversation",
            "sentiment": "warm",
            "occurred_on": date.today().isoformat(),
            "what_happened": "Had a good catch-up",
        },
        headers=auth_headers,
    )
    assert created.status_code == 201
    moment_id = created.json()["id"]

    listed = await api_client.get(f"/api/v1/people/{person_id}/moments", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) >= 1

    fetched = await api_client.get(f"/api/v1/moments/{moment_id}", headers=auth_headers)
    assert fetched.status_code == 200

    updated = await api_client.patch(
        f"/api/v1/moments/{moment_id}",
        json={"notes": "Updated note"},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["notes"] == "Updated note"

    deleted = await api_client.delete(f"/api/v1/moments/{moment_id}", headers=auth_headers)
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_moment_not_found_and_missing_person(api_client: AsyncClient, auth_headers: dict[str, str]) -> None:
    missing_get = await api_client.get(
        "/api/v1/moments/00000000-0000-0000-0000-000000000789",
        headers=auth_headers,
    )
    assert missing_get.status_code == 404

    bad_create = await api_client.post(
        "/api/v1/people/00000000-0000-0000-0000-000000000111/moments",
        json={
            "person_id": "00000000-0000-0000-0000-000000000111",
            "title": "No person",
            "moment_type": "conversation",
            "sentiment": "warm",
            "occurred_on": date.today().isoformat(),
            "what_happened": "none",
        },
        headers=auth_headers,
    )
    assert bad_create.status_code == 404


@pytest.mark.asyncio
async def test_moment_cross_user_access_blocked(api_client: AsyncClient, create_user) -> None:
    owner_headers = await _auth_for(api_client, create_user, "moment-owner@example.com")
    other_headers = await _auth_for(api_client, create_user, "moment-other@example.com")

    person = await api_client.post(
        "/api/v1/people",
        json={"name": "Moment Owner Person", "relationship_type": "friend"},
        headers=owner_headers,
    )
    assert person.status_code == 201
    person_id = person.json()["id"]

    created = await api_client.post(
        f"/api/v1/people/{person_id}/moments",
        json={
            "person_id": person_id,
            "title": "Private moment",
            "moment_type": "conversation",
            "sentiment": "warm",
            "occurred_on": date.today().isoformat(),
            "what_happened": "private",
        },
        headers=owner_headers,
    )
    assert created.status_code == 201
    moment_id = created.json()["id"]

    forbidden = await api_client.get(f"/api/v1/moments/{moment_id}", headers=other_headers)
    assert forbidden.status_code == 404
