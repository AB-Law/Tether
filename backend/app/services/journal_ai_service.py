import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.domain.ai.prompt_builders import build_reflection_prompt
from app.repositories import journal_repository
from app.services.ai_client import generate_text
from app.services.ai_types import AIGenerationError

DEFAULT_REFLECTION_TEXT = (
    "You seem to be noticing meaningful emotional patterns in this moment. "
    "What feeling wants your attention most right now, and what would a kind next step look like?"
)


def _generate_reflection(prompt: str) -> tuple[str, int | None, int | None]:
    try:
        result = generate_text(prompt, max_tokens=800)
        text = result.text.strip() or DEFAULT_REFLECTION_TEXT
        return text, result.tokens_input, result.tokens_output
    except AIGenerationError:
        return DEFAULT_REFLECTION_TEXT, None, None


async def _prepare_reflection_run(
    entry_id: UUID,
    mode: str,
    user_id: UUID,
    db: AsyncSession,
):
    entry = await journal_repository.get_by_id(entry_id, user_id, db)
    if entry is None:
        raise AppException(
            code="journal_entry_not_found",
            message="Journal entry not found",
            status_code=404,
        )

    recent = await journal_repository.list_recent_non_deleted(user_id, 5, db)
    prompt = build_reflection_prompt(entry, recent)
    run = await journal_repository.create_ai_run(
        {
            "user_id": user_id,
            "journal_entry_id": entry.id,
            "run_type": mode,
            "status": "running",
            "prompt_text": prompt,
            "model_name": "claude-3-5-sonnet-latest",
            "provider": "anthropic",
            "started_at": datetime.now(UTC),
        },
        db,
    )
    return entry, prompt, run


async def trigger_reflection(
    entry_id: UUID,
    mode: str,
    user_id: UUID,
    db: AsyncSession,
):
    entry, prompt, run = await _prepare_reflection_run(entry_id, mode, user_id, db)
    reflection, tokens_input, tokens_output = _generate_reflection(prompt)
    await journal_repository.update_ai_run(
        run,
        {
            "status": "completed",
            "response_text": reflection,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "completed_at": datetime.now(UTC),
        },
        db,
    )
    entry.latest_ai_reflection = reflection
    entry.latest_ai_reflected_at = datetime.now(UTC)
    entry.ai_prompt_used = prompt
    await db.flush()
    return run


async def stream_reflection(
    entry_id: UUID,
    mode: str,
    user_id: UUID,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    entry, prompt, run = await _prepare_reflection_run(entry_id, mode, user_id, db)
    reflection, tokens_input, tokens_output = _generate_reflection(prompt)
    assembled = ""
    for token in reflection.split(" "):
        assembled = f"{assembled} {token}".strip()
        yield f"event: chunk\ndata: {json.dumps({'text': token})}\n\n"
    await journal_repository.update_ai_run(
        run,
        {
            "status": "completed",
            "response_text": assembled,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "completed_at": datetime.now(UTC),
        },
        db,
    )
    entry.latest_ai_reflection = assembled
    entry.latest_ai_reflected_at = datetime.now(UTC)
    entry.ai_prompt_used = prompt
    await db.flush()
    done_payload = {
        "run_id": str(run.id),
        "status": "completed",
        "tokens_input": tokens_input,
        "tokens_output": tokens_output,
    }
    yield f"event: done\ndata: {json.dumps(done_payload)}\n\n"
