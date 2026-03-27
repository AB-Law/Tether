import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.domain.ai.prompt_builders import build_weekly_digest_prompt
from app.models.digest_run import DigestRun
from app.models.user import User
from app.services.ai_client import generate_text
from app.services.ai_types import AIGenerationError

logger = get_logger(__name__)


def _sanitize_digest_text(text: str) -> str:
    return " ".join(text.strip().split())


def _should_run_now(now: datetime) -> bool:
    return now.weekday() == 0 and now.hour == 7


async def run_weekly_digest_once() -> None:
    processed = 0
    successes = 0
    failures = 0
    async with AsyncSessionLocal() as session:
        users = (
            await session.execute(select(User).where(User.is_active.is_(True)))
        ).scalars().all()
        for user in users:
            processed += 1
            started_at = datetime.now(UTC)
            prompt = await build_weekly_digest_prompt(user.id, session)
            try:
                result = generate_text(prompt, max_tokens=1200)
                response_text = _sanitize_digest_text(result.text)
                run = DigestRun(
                    user_id=user.id,
                    run_type="weekly",
                    status="completed",
                    prompt_text=prompt,
                    response_text=response_text,
                    model_name=result.model_name,
                    provider=result.provider,
                    tokens_input=result.tokens_input,
                    tokens_output=result.tokens_output,
                    started_at=started_at,
                    completed_at=datetime.now(UTC),
                    provider_request_id=result.request_id,
                    latency_ms=result.latency_ms,
                    base_url_fingerprint=result.base_url_fingerprint,
                    finish_reason=result.finish_reason,
                )
                session.add(run)
                successes += 1
            except AIGenerationError as exc:
                run = DigestRun(
                    user_id=user.id,
                    run_type="weekly",
                    status="failed",
                    prompt_text=prompt,
                    response_text=None,
                    model_name=exc.model_name,
                    provider=exc.provider,
                    started_at=started_at,
                    completed_at=datetime.now(UTC),
                    error_message=exc.message,
                    provider_request_id=exc.request_id,
                    raw_error_code=exc.raw_error_code,
                    raw_error_type=exc.raw_error_type,
                )
                session.add(run)
                failures += 1
            await session.flush()
        await session.commit()
    logger.info(
        "Weekly digest run complete",
        extra={"processed": processed, "successes": successes, "failures": failures},
    )


async def run_digest_loop(interval_seconds: int = 300) -> None:
    while True:
        try:
            now = datetime.now(UTC)
            if _should_run_now(now):
                await run_weekly_digest_once()
                await asyncio.sleep(timedelta(hours=1).total_seconds())
                continue
        except Exception:
            logger.exception("Weekly digest loop failed; retrying")
        await asyncio.sleep(interval_seconds)

