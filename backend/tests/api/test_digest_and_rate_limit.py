from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from starlette.responses import Response

from app.api.v1.endpoints import digest
from app.core.rate_limit import RateLimiter
from app.workers import weekly_digest_jobs


@pytest.mark.asyncio
async def test_get_latest_digest(monkeypatch):
    user = SimpleNamespace(id=uuid4())
    run = SimpleNamespace(id=uuid4(), created_at=datetime.now(UTC), response_text="digest text")

    class _Result:
        @staticmethod
        def scalar_one_or_none():
            return run

    db = SimpleNamespace(execute=AsyncMock(return_value=_Result()))
    out = await digest.get_latest_digest(user, db)  # type: ignore[arg-type]
    assert out["data"]["text"] == "digest text"


@pytest.mark.asyncio
async def test_rate_limiter_exceeds():
    limiter = RateLimiter("k", max_calls=1, window_seconds=3600)
    response = Response()
    user = SimpleNamespace(id=uuid4())
    await limiter(response, user, SimpleNamespace())  # type: ignore[arg-type]
    with pytest.raises(HTTPException):
        await limiter(response, user, SimpleNamespace())  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_weekly_digest_once(monkeypatch):
    user = SimpleNamespace(id=uuid4(), is_active=True)

    class _ExecuteResult:
        @staticmethod
        def scalars():
            return SimpleNamespace(all=lambda: [user])

    class _Session:
        def __init__(self):
            self.add = lambda _obj: None
            self.commit = AsyncMock()
            self.flush = AsyncMock()
            self.execute = AsyncMock(return_value=_ExecuteResult())

        async def __aenter__(self):
            return self

        async def __aexit__(self, _exc_type, _exc, _tb):
            return False

    monkeypatch.setattr(weekly_digest_jobs, "AsyncSessionLocal", lambda: _Session())
    monkeypatch.setattr(
        weekly_digest_jobs,
        "build_weekly_digest_prompt",
        AsyncMock(return_value="prompt"),
    )
    monkeypatch.setattr(
        weekly_digest_jobs,
        "generate_text",
        lambda *_args, **_kwargs: SimpleNamespace(
            text="digest",
            model_name="m",
            provider="anthropic",
            tokens_input=1,
            tokens_output=2,
            request_id="req",
            latency_ms=1,
            base_url_fingerprint="default",
            finish_reason="stop",
        ),
    )
    await weekly_digest_jobs.run_weekly_digest_once()

