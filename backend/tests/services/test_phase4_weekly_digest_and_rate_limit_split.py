import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core.rate_limit import RateLimiter
from app.services.ai_types import AIGenerationError
from app.workers import weekly_digest_jobs


def test_weekly_digest_should_run_now_checks():
    assert weekly_digest_jobs._should_run_now(datetime(2026, 3, 30, 7, tzinfo=UTC)) is True
    assert weekly_digest_jobs._should_run_now(datetime(2026, 3, 30, 6, tzinfo=UTC)) is False


@pytest.mark.asyncio
async def test_weekly_digest_loop_no_schedule_sleeps(monkeypatch):
    monkeypatch.setattr(weekly_digest_jobs, "_should_run_now", lambda _now: False)
    monkeypatch.setattr(
        asyncio,
        "sleep",
        AsyncMock(side_effect=RuntimeError("stop")),
    )
    with pytest.raises(RuntimeError):
        await weekly_digest_jobs.run_digest_loop(interval_seconds=0)


@pytest.mark.asyncio
async def test_weekly_digest_loop_scheduled_run_then_sleep(monkeypatch):
    toggles = iter([True, False])
    monkeypatch.setattr(weekly_digest_jobs, "_should_run_now", lambda _now: next(toggles))
    monkeypatch.setattr(weekly_digest_jobs, "run_weekly_digest_once", AsyncMock(return_value=None))
    monkeypatch.setattr(
        asyncio,
        "sleep",
        AsyncMock(side_effect=[None, RuntimeError("stop-loop")]),
    )
    with pytest.raises(RuntimeError):
        await weekly_digest_jobs.run_digest_loop(interval_seconds=0)


@pytest.mark.asyncio
async def test_weekly_digest_once_with_generate_error(monkeypatch):
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
        _raise_generation_error,
    )
    await weekly_digest_jobs.run_weekly_digest_once()


@pytest.mark.asyncio
async def test_weekly_digest_loop_handles_exception(monkeypatch):
    monkeypatch.setattr(weekly_digest_jobs, "_should_run_now", lambda _now: True)
    monkeypatch.setattr(
        weekly_digest_jobs,
        "run_weekly_digest_once",
        AsyncMock(side_effect=RuntimeError("loop failure")),
    )
    monkeypatch.setattr(
        asyncio,
        "sleep",
        AsyncMock(side_effect=RuntimeError("stop-again")),
    )
    with pytest.raises(RuntimeError):
        await weekly_digest_jobs.run_digest_loop(interval_seconds=0)


@pytest.mark.asyncio
async def test_rate_limiter_cleanup_branch():
    limiter = RateLimiter("cleanup-key", max_calls=1, window_seconds=2)
    user = SimpleNamespace(id=uuid4())
    key = (str(user.id), "cleanup-key")
    limiter._hits[key].append(1.0)
    response = SimpleNamespace(headers={})

    import app.core.rate_limit as rl

    class _FakeDatetime(datetime):
        @classmethod
        def now(cls, tz=None):  # type: ignore[override]
            return datetime.fromtimestamp(10, tz=UTC)

    original_datetime = rl.datetime
    rl.datetime = _FakeDatetime  # type: ignore[assignment]
    try:
        await limiter(response, user, SimpleNamespace())  # type: ignore[arg-type]
        assert len(limiter._hits[key]) == 1
    finally:
        rl.datetime = original_datetime  # type: ignore[assignment]


@pytest.mark.asyncio
async def test_weekly_digest_failure_branch(monkeypatch):
    user = SimpleNamespace(id=uuid4(), is_active=True)
    added: list[object] = []

    class _ExecuteResult:
        @staticmethod
        def scalars():
            return SimpleNamespace(all=lambda: [user])

    class _Session:
        def __init__(self):
            self.commit = AsyncMock()
            self.flush = AsyncMock()
            self.execute = AsyncMock(return_value=_ExecuteResult())

        def add(self, obj):
            added.append(obj)

        async def __aenter__(self):
            return self

        async def __aexit__(self, _exc_type, _exc, _tb):
            return False

    monkeypatch.setattr(weekly_digest_jobs, "AsyncSessionLocal", lambda: _Session())
    monkeypatch.setattr(
        weekly_digest_jobs, "build_weekly_digest_prompt", AsyncMock(return_value="prompt")
    )

    def _raise(*_args, **_kwargs):
        raise AIGenerationError("provider down", True, "anthropic", "m")

    monkeypatch.setattr(weekly_digest_jobs, "generate_text", _raise)
    await weekly_digest_jobs.run_weekly_digest_once()
    assert added
    assert getattr(added[0], "status", "") == "failed"


def _raise_generation_error(*_args, **_kwargs):
    raise AIGenerationError("x", True, "anthropic", "m")

