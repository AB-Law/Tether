import asyncio
from datetime import UTC, datetime

from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.repositories import reminder_repository

logger = get_logger(__name__)


async def process_due_reminders() -> None:
    async with AsyncSessionLocal() as session:
        due = await reminder_repository.get_due(datetime.now(UTC), session)
        for reminder in due:
            logger.info("Processing reminder", extra={"reminder_id": str(reminder.id)})
            await reminder_repository.mark_sent(reminder, session)
        await session.commit()


async def run_poll_loop(interval_seconds: int = 30) -> None:
    while True:
        await process_due_reminders()
        await asyncio.sleep(interval_seconds)
