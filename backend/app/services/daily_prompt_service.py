from datetime import datetime
from zoneinfo import ZoneInfo

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


def get_daily_prompt(timezone: str | None) -> str:
    tz = timezone or "UTC"
    today = datetime.now(ZoneInfo(tz))
    return PROMPTS[today.timetuple().tm_yday % len(PROMPTS)]
