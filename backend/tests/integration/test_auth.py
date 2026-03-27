from http.cookies import SimpleCookie

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success_and_failure(api_client: AsyncClient, create_user) -> None:
    await create_user(email="auth@example.com", password="password123")

    success = await api_client.post(
        "/api/v1/auth/login",
        json={"email": "auth@example.com", "password": "password123"},
    )
    assert success.status_code == 200
    assert "access_token" in success.json()
    assert "refresh_token=" in success.headers.get("set-cookie", "")

    failure = await api_client.post(
        "/api/v1/auth/login",
        json={"email": "auth@example.com", "password": "wrong-password"},
    )
    assert failure.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_auth_and_returns_user(api_client: AsyncClient, create_user) -> None:
    unauth = await api_client.get("/api/v1/auth/me")
    assert unauth.status_code == 401

    await create_user(email="me@example.com", password="password123", display_name="Me")
    login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": "me@example.com", "password": "password123"},
    )
    token = login.json()["access_token"]

    me = await api_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == "me@example.com"
    assert me.json()["display_name"] == "Me"


@pytest.mark.asyncio
async def test_refresh_rotation_flow(api_client: AsyncClient, create_user) -> None:
    await create_user(email="refresh@example.com", password="password123")
    login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": "refresh@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    cookie = SimpleCookie()
    cookie.load(login.headers.get("set-cookie", ""))
    assert "refresh_token" in cookie
    refresh_cookie = cookie["refresh_token"].value

    refresh = await api_client.post(
        "/api/v1/auth/refresh",
        headers={"Cookie": f"refresh_token={refresh_cookie}"},
    )
    assert refresh.status_code == 200
    assert refresh.json()["access_token"]

    rotated_cookie = SimpleCookie()
    rotated_cookie.load(refresh.headers.get("set-cookie", ""))
    assert "refresh_token" in rotated_cookie
    rotated_refresh_cookie = rotated_cookie["refresh_token"].value
    assert rotated_refresh_cookie != refresh_cookie

    stale_refresh = await api_client.post(
        "/api/v1/auth/refresh",
        headers={"Cookie": f"refresh_token={refresh_cookie}"},
    )
    assert stale_refresh.status_code == 401


@pytest.mark.asyncio
async def test_refresh_requires_cookie_and_me_rejects_bad_token(api_client: AsyncClient) -> None:
    missing_cookie = await api_client.post("/api/v1/auth/refresh")
    assert missing_cookie.status_code == 401

    bad_token = await api_client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer invalid-token"}
    )
    assert bad_token.status_code == 401

    logout_without_cookie = await api_client.post("/api/v1/auth/logout")
    assert logout_without_cookie.status_code in (200, 204)
