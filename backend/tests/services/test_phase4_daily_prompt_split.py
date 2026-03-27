from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.services import daily_prompt_service
from app.services.ai_types import AIGenerationError


@pytest.mark.asyncio
async def test_daily_prompt_service_all_paths(monkeypatch):
    user = SimpleNamespace(
        id=uuid4(),
        timezone="UTC",
        dynamic_prompt_cached_date=datetime.now(UTC).date(),
        dynamic_prompt_cache="cached prompt?",
    )
    db = SimpleNamespace(flush=AsyncMock())
    cached = await daily_prompt_service.get_daily_prompt(user, db)  # type: ignore[arg-type]
    assert cached["source"] == "ai"

    user.dynamic_prompt_cached_date = None
    user.dynamic_prompt_cache = None
    monkeypatch.setattr(daily_prompt_service, "build_dynamic_prompt", AsyncMock(return_value=None))
    static_res = await daily_prompt_service.get_daily_prompt(user, db)  # type: ignore[arg-type]
    assert static_res["source"] == "static"

    monkeypatch.setattr(
        daily_prompt_service,
        "build_dynamic_prompt",
        AsyncMock(return_value="prompt"),
    )
    monkeypatch.setattr(
        daily_prompt_service,
        "generate_text",
        _raise_generation_error,
    )
    fallback = await daily_prompt_service.get_daily_prompt(user, db)  # type: ignore[arg-type]
    assert fallback["source"] == "static"

    monkeypatch.setattr(
        daily_prompt_service,
        "generate_text",
        lambda *_args, **_kwargs: SimpleNamespace(text="ok"),
    )
    invalid = await daily_prompt_service.get_daily_prompt(user, db)  # type: ignore[arg-type]
    assert invalid["source"] == "static"

    monkeypatch.setattr(
        daily_prompt_service,
        "generate_text",
        lambda *_args, **_kwargs: SimpleNamespace(
            text="What is one thing you want to revisit from today and why?"
        ),
    )
    valid = await daily_prompt_service.get_daily_prompt(user, db)  # type: ignore[arg-type]
    assert valid["source"] == "ai"
    assert daily_prompt_service._sanitize_dynamic_prompt("") is None
    assert daily_prompt_service._sanitize_dynamic_prompt("Tiny.") is None
    long_prompt = " ".join(["word"] * 40)
    assert len((daily_prompt_service._sanitize_dynamic_prompt(long_prompt) or "").split()) <= 25
    assert (
        daily_prompt_service._sanitize_dynamic_prompt(
            "What did you avoid saying today and why did that feel important."
        )
        or ""
    ).endswith("?")


def _raise_generation_error(*_args, **_kwargs):
    raise AIGenerationError("e", True, "anthropic", "m")

