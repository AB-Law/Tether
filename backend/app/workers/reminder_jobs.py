import asyncio
from datetime import UTC, datetime, timedelta

from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.repositories import reminder_repository

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
                    attempt_count = _get_attempt_count(reminder)
                    try:
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
                        await reminder_repository.mark_sent(reminder, session)
                    except Exception as exc:  # pragma: no cover - defensive path
                        updated_attempts = attempt_count + 1
                        _set_attempt_count(reminder, updated_attempts)
                        if updated_attempts >= MAX_ATTEMPTS:
                            await reminder_repository.mark_failed(reminder, str(exc), session)
                        else:
                            # Phase 3 polling scheduler; move to durable queue in Phase 4.
                            reminder.scheduled_for = datetime.now(UTC) + timedelta(
                                seconds=2**updated_attempts * POLL_INTERVAL_SECONDS
                            )
                            reminder.status = "pending"
                            reminder.failure_reason = str(exc)
                            await session.flush()
                if len(due) < BATCH_SIZE:
                    break


async def run_poll_loop(interval_seconds: int = POLL_INTERVAL_SECONDS) -> None:
    while True:
        try:
            await process_due_reminders()
        except Exception:  # pragma: no cover - defensive path
            logger.exception("Reminder polling failed; retrying")
        await asyncio.sleep(interval_seconds)
