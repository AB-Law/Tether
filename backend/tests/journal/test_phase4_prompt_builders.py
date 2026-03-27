from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.domain.ai import prompt_builders


@pytest.mark.asyncio
async def test_phase4_prompt_builders(monkeypatch):
    uid = uuid4()
    pid = uuid4()
    person = SimpleNamespace(
        name="Alex",
        id=pid,
        relationship_type="friend",
        last_talked_at=date.today(),
    )
    journal_entries = [
        SimpleNamespace(entry_date=date.today(), body="x" * 300, mood=3, people=[person]),
        SimpleNamespace(entry_date=date.today(), body="y" * 120, mood=4, people=[]),
    ]
    moments = [
        SimpleNamespace(
            occurred_on=date.today(),
            sentiment="warm",
            what_happened="Had tea and caught up.",
        )
    ]
    almanac_entries = [SimpleNamespace(id=uuid4())]

    monkeypatch.setattr(
        prompt_builders.journal_repository,
        "list_recent_non_deleted",
        AsyncMock(return_value=journal_entries),
    )
    monkeypatch.setattr(
        prompt_builders.moment_repository,
        "list_by_person",
        AsyncMock(return_value=moments),
    )
    monkeypatch.setattr(
        prompt_builders.almanac_repository,
        "list_entries",
        AsyncMock(return_value=(almanac_entries, 1)),
    )
    monkeypatch.setattr(
        prompt_builders.person_repository,
        "get_by_id",
        AsyncMock(return_value=person),
    )
    monkeypatch.setattr(
        prompt_builders.journal_repository,
        "reverse_timeline_for_person",
        AsyncMock(return_value=journal_entries),
    )

    weekly_prompt = await prompt_builders.build_weekly_digest_prompt(uid, SimpleNamespace())
    dynamic_prompt = await prompt_builders.build_dynamic_prompt(uid, SimpleNamespace())
    nudge_prompt = await prompt_builders.build_nudge_prompt(uid, pid, SimpleNamespace())

    assert "weekly reflection assistant" in weekly_prompt
    assert dynamic_prompt is not None and "one short open-ended question" in dynamic_prompt
    assert nudge_prompt is not None and "What's on your mind about Alex?" in nudge_prompt


@pytest.mark.asyncio
async def test_phase4_prompt_builder_none_paths(monkeypatch):
    uid = uuid4()
    pid = uuid4()
    monkeypatch.setattr(
        prompt_builders.journal_repository,
        "list_recent_non_deleted",
        AsyncMock(
            return_value=[
                SimpleNamespace(
                    entry_date=date.today(),
                    body="x",
                    mood=2,
                    people=[],
                )
            ]
        ),
    )
    monkeypatch.setattr(
        prompt_builders.person_repository, "get_by_id", AsyncMock(return_value=None)
    )
    assert await prompt_builders.build_dynamic_prompt(uid, SimpleNamespace()) is None
    assert await prompt_builders.build_nudge_prompt(uid, pid, SimpleNamespace()) is None

