from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request
from starlette.responses import Response

from app.api import cors_diagnostics, deps, error_handlers
from app.api.v1.endpoints import almanac, health, journal
from app.core import exceptions


@pytest.mark.asyncio
async def test_deps_helpers(monkeypatch):
    session = object()
    async for item in deps.get_db(session):  # type: ignore[arg-type]
        assert item is session

    expected_user = object()
    get_current = AsyncMock(return_value=expected_user)
    monkeypatch.setattr(deps.auth_service, "get_current_user", get_current)
    user = await deps.get_current_user("token", "db")  # type: ignore[arg-type]
    assert user is expected_user
    get_current.assert_awaited_once()


def test_error_response_and_handlers():
    app = FastAPI()
    error_handlers.register_exception_handlers(app)

    @app.get("/app")
    async def app_exc():
        raise exceptions.AppException(code="x", message="bad", status_code=418, details={"a": 1})

    @app.get("/validation/{item_id}")
    async def val(item_id: int):
        return {"item_id": item_id}

    @app.get("/http")
    async def http_exc():
        raise StarletteHTTPException(status_code=404, detail="missing")

    @app.get("/boom")
    async def boom():
        raise RuntimeError("oops")

    client = TestClient(app, raise_server_exceptions=False)
    r1 = client.get("/app", headers={"x-request-id": "req-1"})
    assert r1.status_code == 418
    assert r1.json()["error"]["request_id"] == "req-1"
    assert r1.json()["error"]["details"] == {"a": 1}
    assert client.get("/validation/not-int").status_code == 422
    assert client.get("/http").json()["error"]["code"] == "not_found"
    assert client.get("/boom").json()["error"]["code"] == "internal_server_error"


@pytest.mark.asyncio
async def test_cors_middleware_dispatch_and_origin_check(monkeypatch):
    middleware = cors_diagnostics.CorsDiagnosticsMiddleware(app=FastAPI())
    req = Request(
        {
            "type": "http",
            "method": "OPTIONS",
            "path": "/x",
            "headers": [
                (b"origin", b"http://localhost:5173"),
                (b"access-control-request-method", b"GET"),
            ],
        }
    )
    call_next = AsyncMock(return_value=Response(status_code=200))
    logger_info = Mock()
    logger_warn = Mock()
    monkeypatch.setattr(cors_diagnostics.logger, "info", logger_info)
    monkeypatch.setattr(cors_diagnostics.logger, "warning", logger_warn)
    await middleware.dispatch(req, call_next)
    logger_info.assert_called_once()
    req_400 = Request(
        {
            "type": "http",
            "method": "OPTIONS",
            "path": "/x",
            "headers": [
                (b"origin", b"http://evil.com"),
                (b"access-control-request-method", b"GET"),
                (b"access-control-request-headers", b"X-Thing"),
            ],
        }
    )
    await middleware.dispatch(req_400, AsyncMock(return_value=Response(status_code=400)))
    logger_warn.assert_called_once()
    non_preflight = Request({"type": "http", "method": "GET", "path": "/x", "headers": []})
    res = await middleware.dispatch(
        non_preflight, AsyncMock(return_value=Response(status_code=204))
    )
    assert res.status_code == 204
    monkeypatch.setattr(cors_diagnostics.settings, "cors_origins", ["http://ok"])
    monkeypatch.setattr(
        cors_diagnostics.settings, "cors_origin_regex", r"^https://.*\.example\.com$"
    )
    assert cors_diagnostics.CorsDiagnosticsMiddleware._is_origin_allowed(None) is False
    assert cors_diagnostics.CorsDiagnosticsMiddleware._is_origin_allowed("http://ok") is True
    assert (
        cors_diagnostics.CorsDiagnosticsMiddleware._is_origin_allowed("https://a.example.com")
        is True
    )
    assert cors_diagnostics.CorsDiagnosticsMiddleware._is_origin_allowed("http://bad") is False
    monkeypatch.setattr(cors_diagnostics.settings, "cors_origin_regex", None)
    assert (
        cors_diagnostics.CorsDiagnosticsMiddleware._is_origin_allowed("http://still-bad") is False
    )


@pytest.mark.asyncio
async def test_health_and_simple_stubs():
    assert await almanac.almanac_stub() == {"status": "not_implemented"}
    assert await journal.journal_stub() == {"status": "not_implemented"}
    assert await health.healthcheck() == {"status": "ok"}
    session = SimpleNamespace(execute=AsyncMock(return_value=None))
    assert (await health.readiness_check(session)).status_code == 200  # type: ignore[arg-type]
    session_bad = SimpleNamespace(execute=AsyncMock(side_effect=RuntimeError("db down")))
    assert (await health.readiness_check(session_bad)).status_code == 503  # type: ignore[arg-type]
