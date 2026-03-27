import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_people_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/v1/people")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_people_crud_and_timeline(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    created = await api_client.post(
        "/api/v1/people",
        json={
            "name": "Pat",
            "relationship_type": "friend",
            "location": "NYC",
            "contact_cadence_days": 7,
        },
        headers=auth_headers,
    )
    assert created.status_code == 201
    person_id = created.json()["id"]

    listed = await api_client.get("/api/v1/people", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["meta"]["total"] >= 1

    fetched = await api_client.get(
        f"/api/v1/people/{person_id}", headers=auth_headers
    )
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Pat"

    updated = await api_client.patch(
        f"/api/v1/people/{person_id}",
        json={"name": "Pat Updated"},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Pat Updated"

    timeline = await api_client.get(
        f"/api/v1/people/{person_id}/timeline",
        headers=auth_headers,
    )
    assert timeline.status_code == 200
    assert "data" in timeline.json()

    new_people = await api_client.get("/api/v1/people/new", headers=auth_headers)
    assert new_people.status_code == 200

    drifting = await api_client.get("/api/v1/people/drifting-away", headers=auth_headers)
    assert drifting.status_code == 200

    archived = await api_client.delete(
        f"/api/v1/people/{person_id}",
        headers=auth_headers,
    )
    assert archived.status_code == 204


@pytest.mark.asyncio
async def test_people_filters_and_not_found(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    missing = await api_client.get(
        "/api/v1/people/00000000-0000-0000-0000-000000000999",
        headers=auth_headers,
    )
    assert missing.status_code == 404

    p1 = await api_client.post(
        "/api/v1/people",
        json={"name": "Filter One", "relationship_type": "friend"},
        headers=auth_headers,
    )
    p2 = await api_client.post(
        "/api/v1/people",
        json={"name": "Filter Two", "relationship_type": "new_person"},
        headers=auth_headers,
    )
    assert p1.status_code == 201 and p2.status_code == 201

    by_relationship = await api_client.get(
        "/api/v1/people",
        params={"relationship_type": "new_person"},
        headers=auth_headers,
    )
    assert by_relationship.status_code == 200
    assert all(
        item["relationship_type"] == "new_person" for item in by_relationship.json()["data"]
    )

    await api_client.delete(
        f"/api/v1/people/{p1.json()['id']}", headers=auth_headers
    )
    archived_only = await api_client.get(
        "/api/v1/people", params={"archived": "true"}, headers=auth_headers
    )
    assert archived_only.status_code == 200
    assert any(item["id"] == p1.json()["id"] for item in archived_only.json()["data"])
