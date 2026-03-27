from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.api.v1.endpoints import digest
from app.core.exceptions import AppException
from app.domain.ai import prompt_builders


@pytest.mark.asyncio
async def test_digest_endpoint_404():
    user = SimpleNamespace(id=uuid4())

    class _Result:
        @staticmethod
        def scalar_one_or_none():
            return None

    db = SimpleNamespace(execute=AsyncMock(return_value=_Result()))
    with pytest.raises(AppException):
        await digest.get_latest_digest(user, db)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_prompt_builder_budget_and_nudge_none(monkeypatch):
    assert "[truncated for budget]" in prompt_builders._enforce_budget("x" * 13000)
    person = SimpleNamespace(
        name="Alex",
        relationship_type="friend",
        last_talked_at=date.today(),
    )
    monkeypatch.setattr(
        prompt_builders.person_repository,
        "get_by_id",
        AsyncMock(return_value=person),
    )
    monkeypatch.setattr(
        prompt_builders.moment_repository,
        "list_by_person",
        AsyncMock(return_value=[]),
    )
    monkeypatch.setattr(
        prompt_builders.journal_repository,
        "reverse_timeline_for_person",
        AsyncMock(return_value=[]),
    )
    none_prompt = await prompt_builders.build_nudge_prompt(uuid4(), uuid4(), SimpleNamespace())
    assert none_prompt is None

