from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domain.ai.prompt_builders import build_dynamic_prompt
from app.models.user import User
from app.services.ai_client import generate_text
from app.services.ai_types import AIGenerationError

logger = get_logger(__name__)

PROMPTS = [
    "What felt most alive in your relationships today?",
    "Where did you feel seen, and where did you feel unseen?",
    "What conversation stayed with you after it ended?",
    "What did you avoid saying, and why?",
    "What act of care mattered more than expected?",
    "Who felt close today, and what created that closeness?",
    "Where did tension show up in your interactions?",
    "What emotion kept returning throughout the day?",
    "What surprised you about someone you know well?",
    "What felt unfinished in your connections today?",
    "Which relationship would benefit from one honest message?",
    "What story are you telling yourself about someone right now?",
    "Where did you offer generosity, and where did you hold back?",
    "What boundary felt healthy today?",
    "What made you feel grounded in the present moment?",
    "What memory resurfaced today, and why might it matter?",
    "What pattern do you notice in how you reach out to others?",
    "What tiny step could strengthen an important relationship?",
    "Where did gratitude show up naturally today?",
    "What interaction felt draining, and what did it reveal?",
    "What did you learn about how you handle conflict?",
    "When did you feel most connected to yourself today?",
    "What expectation shaped your interactions today?",
    "What would compassion for yourself look like tonight?",
    "Who might appreciate hearing from you this week?",
    "What did you need that you did not ask for?",
    "Where did you experience mutual understanding?",
    "What recurring concern is asking for attention?",
    "What relationship pattern are you ready to change?",
    "What is one gentle truth you can acknowledge right now?",
]


def _static_prompt(timezone: str | None) -> str:
    tz = timezone or "UTC"
    today = datetime.now(ZoneInfo(tz))
    return PROMPTS[today.timetuple().tm_yday % len(PROMPTS)]


def _sanitize_dynamic_prompt(text: str) -> str | None:
    stripped = " ".join(text.strip().split())
    if not stripped:
        return None
    if not stripped.endswith("?"):
        stripped = f"{stripped.rstrip('.!')}?"
    words = stripped.split()
    if len(words) > 25:
        stripped = " ".join(words[:25]).rstrip(".,!") + "?"
    if len(stripped.split()) < 3:
        return None
    return stripped


async def get_daily_prompt(user: User, db: AsyncSession) -> dict[str, str]:
    today = datetime.now(UTC).date()
    if user.dynamic_prompt_cached_date == today and user.dynamic_prompt_cache:
        return {"prompt": user.dynamic_prompt_cache, "source": "ai"}

    prompt = await build_dynamic_prompt(user.id, db)
    if prompt is None:
        return {"prompt": _static_prompt(user.timezone), "source": "static"}

    try:
        ai_result = generate_text(prompt, max_tokens=80)
    except AIGenerationError:
        logger.warning("Dynamic prompt generation failed", extra={"user_id": str(user.id)})
        return {"prompt": _static_prompt(user.timezone), "source": "static"}

    sanitized = _sanitize_dynamic_prompt(ai_result.text)
    if sanitized is None:
        logger.warning("Dynamic prompt validation failed", extra={"user_id": str(user.id)})
        return {"prompt": _static_prompt(user.timezone), "source": "static"}

    user.dynamic_prompt_cache = sanitized
    user.dynamic_prompt_cached_date = today
    await db.flush()
    return {"prompt": sanitized, "source": "ai"}
