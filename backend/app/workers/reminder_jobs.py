import asyncio
from datetime import UTC, datetime, timedelta

from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.domain.ai.prompt_builders import build_nudge_prompt
from app.repositories import person_repository, reminder_repository
from app.services.ai_client import generate_text
from app.services.ai_types import AIGenerationError

logger = get_logger(__name__)


MAX_ATTEMPTS = 3
BATCH_SIZE = 50
POLL_INTERVAL_SECONDS = 60


def _get_attempt_count(reminder) -> int:
    payload = getattr(reminder, "payload", None) or {}
    value = payload.get("attempt_count", 0)
    return value if isinstance(value, int) and value >= 0 else 0


def _set_attempt_count(reminder, count: int) -> None:
    payload = dict(getattr(reminder, "payload", None) or {})
    payload["attempt_count"] = count
    reminder.payload = payload


def _sanitize_nudge_text(text: str, person_name: str) -> str | None:
    stripped = " ".join(text.strip().split())
    if not stripped:
        return None
    if f"about {person_name}" not in stripped:
        stripped = f"What's on your mind about {person_name}? {stripped}"
    return stripped


async def _load_person(reminder, session):
    try:
        return await person_repository.get_by_id(reminder.entity_id, reminder.user_id, session)
    except Exception:
        return None


async def _generate_nudge_text(reminder, person, session) -> str:
    nudge_text = f"Time to reach out to {person.name}."
    prompt = await build_nudge_prompt(reminder.user_id, reminder.entity_id, session)
    if prompt is None:
        return nudge_text
    try:
        generated = generate_text(prompt, max_tokens=120)
        validated = _sanitize_nudge_text(generated.text, person.name)
        if validated:
            return validated
    except AIGenerationError:
        logger.warning(
            "Nudge generation failed; using fallback",
            extra={
                "user_id": str(reminder.user_id),
                "person_id": str(reminder.entity_id),
            },
        )
    return nudge_text


async def _maybe_attach_nudge_payload(reminder, session) -> None:
    if reminder.reminder_type != "nudge" or reminder.entity_type != "person":
        return
    person = await _load_person(reminder, session)
    if person is None:
        return
    payload = dict(reminder.payload or {})
    payload["nudge_text"] = await _generate_nudge_text(reminder, person, session)
    reminder.payload = payload


def _log_delivery(reminder, attempt_count: int) -> None:
    logger.info(
        "Delivering in-app reminder",
        extra={
            "user_id": str(reminder.user_id),
            "entity_type": reminder.entity_type,
            "entity_id": str(reminder.entity_id),
            "reminder_type": reminder.reminder_type,
            "attempt_count": attempt_count + 1,
        },
    )


async def _handle_processing_error(reminder, attempt_count: int, exc: Exception, session) -> None:
    updated_attempts = attempt_count + 1
    _set_attempt_count(reminder, updated_attempts)
    if updated_attempts >= MAX_ATTEMPTS:
        await reminder_repository.mark_failed(reminder, str(exc), session)
        return
    # Phase 3 polling scheduler; move to durable queue in Phase 4.
    reminder.scheduled_for = datetime.now(UTC) + timedelta(
        seconds=2**updated_attempts * POLL_INTERVAL_SECONDS
    )
    reminder.status = "pending"
    reminder.failure_reason = str(exc)
    await session.flush()


async def _process_single_reminder(reminder, session) -> None:
    attempt_count = _get_attempt_count(reminder)
    try:
        await _maybe_attach_nudge_payload(reminder, session)
        _log_delivery(reminder, attempt_count)
        await reminder_repository.mark_sent(reminder, session)
    except Exception as exc:  # pragma: no cover - defensive path
        await _handle_processing_error(reminder, attempt_count, exc, session)


async def process_due_reminders() -> None:
    async with AsyncSessionLocal() as session:
        while True:
            async with session.begin():
                due = await reminder_repository.get_due(
                    datetime.now(UTC), session, limit=BATCH_SIZE
                )
                if not due:
                    break
                for reminder in due:
                    await _process_single_reminder(reminder, session)
                if len(due) < BATCH_SIZE:
                    break


async def run_poll_loop(interval_seconds: int = POLL_INTERVAL_SECONDS) -> None:
    while True:
        try:
            await process_due_reminders()
        except Exception:  # pragma: no cover - defensive path
            logger.exception("Reminder polling failed; retrying")
        await asyncio.sleep(interval_seconds)
