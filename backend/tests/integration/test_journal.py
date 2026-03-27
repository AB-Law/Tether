from datetime import date

import pytest
from httpx import AsyncClient


async def _auth_for(api_client: AsyncClient, create_user, email: str) -> dict[str, str]:
    await create_user(email=email, password="password123")
    login = await api_client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password123"}
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.asyncio
async def test_journal_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/v1/journal/entries")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_journal_crud_prompt_reflect_and_runs(
    api_client: AsyncClient, auth_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    create = await api_client.post(
        "/api/v1/journal/entries",
        json={
            "entry_date": date.today().isoformat(),
            "body": "Journal integration entry",
            "mood": 4,
            "tag_names": ["daily"],
        },
        headers=auth_headers,
    )
    assert create.status_code == 201
    entry_id = create.json()["id"]

    listed = await api_client.get("/api/v1/journal/entries", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["meta"]["total"] >= 1

    fetched = await api_client.get(f"/api/v1/journal/entries/{entry_id}", headers=auth_headers)
    assert fetched.status_code == 200
    assert fetched.json()["body"] == "Journal integration entry"

    updated = await api_client.patch(
        f"/api/v1/journal/entries/{entry_id}",
        json={"body": "Updated journal body", "mood": 5},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["body"] == "Updated journal body"

    prompt = await api_client.get("/api/v1/journal/prompts/daily", headers=auth_headers)
    assert prompt.status_code == 200
    assert "prompt" in prompt.json()["data"]

    from app.services import journal_ai_service

    monkeypatch.setattr(
        journal_ai_service, "_generate_reflection", lambda _prompt: ("stub reflection", 7, 9)
    )

    reflect = await api_client.post(
        f"/api/v1/journal/entries/{entry_id}/reflect",
        json={"mode": "entry_plus_recent_context"},
        headers=auth_headers,
    )
    assert reflect.status_code == 200
    assert reflect.json()["data"]["status"] == "completed"

    stream = await api_client.get(
        f"/api/v1/journal/entries/{entry_id}/reflect/stream",
        params={"mode": "entry_plus_recent_context"},
        headers=auth_headers,
    )
    assert stream.status_code == 200
    assert "event: done" in stream.text
    assert "[DONE]" in stream.text

    runs = await api_client.get(f"/api/v1/journal/entries/{entry_id}/ai-runs", headers=auth_headers)
    assert runs.status_code == 200
    assert len(runs.json()["data"]) >= 1

    deleted = await api_client.delete(f"/api/v1/journal/entries/{entry_id}", headers=auth_headers)
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_journal_validation_filters_and_errors(
    api_client: AsyncClient, auth_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    invalid = await api_client.post(
        "/api/v1/journal/entries",
        json={"entry_date": date.today().isoformat(), "body": "bad mood", "mood": 9},
        headers=auth_headers,
    )
    assert invalid.status_code == 422

    a = await api_client.post(
        "/api/v1/journal/entries",
        json={"entry_date": date.today().isoformat(), "body": "alpha unique token"},
        headers=auth_headers,
    )
    b = await api_client.post(
        "/api/v1/journal/entries",
        json={"entry_date": date.today().isoformat(), "body": "beta unique token"},
        headers=auth_headers,
    )
    assert a.status_code == 201 and b.status_code == 201

    filtered = await api_client.get(
        "/api/v1/journal/entries",
        params={"search": "alpha unique token"},
        headers=auth_headers,
    )
    assert filtered.status_code == 200
    assert filtered.json()["meta"]["total"] >= 1
    assert any("alpha unique token" in item["body"] for item in filtered.json()["data"])

    missing_id = "00000000-0000-0000-0000-000000000123"
    reflect_missing = await api_client.post(
        f"/api/v1/journal/entries/{missing_id}/reflect",
        json={"mode": "entry_plus_recent_context"},
        headers=auth_headers,
    )
    assert reflect_missing.status_code == 404

    runs_missing = await api_client.get(
        f"/api/v1/journal/entries/{missing_id}/ai-runs", headers=auth_headers
    )
    assert runs_missing.status_code == 404

    from app.services import journal_ai_service

    monkeypatch.setattr(journal_ai_service, "_generate_reflection", lambda _prompt: ("ok", 1, 1))


@pytest.mark.asyncio
async def test_journal_forbidden_person_link(api_client: AsyncClient, create_user) -> None:
    owner_headers = await _auth_for(api_client, create_user, "journal-owner@example.com")
    other_headers = await _auth_for(api_client, create_user, "journal-other@example.com")

    person = await api_client.post(
        "/api/v1/people",
        json={"name": "Private person", "relationship_type": "friend"},
        headers=other_headers,
    )
    assert person.status_code == 201
    person_id = person.json()["id"]

    linked = await api_client.post(
        "/api/v1/journal/entries",
        json={
            "entry_date": date.today().isoformat(),
            "body": "attempt invalid link",
            "person_ids": [person_id],
        },
        headers=owner_headers,
    )
    assert linked.status_code == 403
