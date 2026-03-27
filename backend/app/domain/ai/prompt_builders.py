from app.models.journal_entry import JournalEntry
from app.models.person import Person
from app.repositories import (
    almanac_repository,
    journal_repository,
    moment_repository,
    person_repository,
)

MAX_PROMPT_CHARS = 12000


def _join_lines(lines: list[str], fallback: str) -> str:
    return "\n".join(lines) if lines else fallback


def _trim_text(text: str, limit: int) -> str:
    clean = text.strip().replace("\n", " ")
    if len(clean) <= limit:
        return clean
    return f"{clean[: limit - 3]}..."


def _enforce_budget(text: str) -> str:
    if len(text) <= MAX_PROMPT_CHARS:
        return text
    return f"{text[: MAX_PROMPT_CHARS - 19]}\n\n[truncated for budget]"


def build_reflection_prompt(entry: JournalEntry, recent_entries: list[JournalEntry]) -> str:
    people = ", ".join(person.name for person in entry.people) if entry.people else "None"
    mood = str(entry.mood) if entry.mood is not None else "Not provided"
    context_lines: list[str] = []
    for recent in recent_entries[:5]:
        excerpt = recent.body.strip().replace("\n", " ")
        if len(excerpt) > 180:
            excerpt = f"{excerpt[:177]}..."
        context_lines.append(f"- {recent.entry_date.isoformat()}: {excerpt}")
    context_block = "\n".join(context_lines) if context_lines else "- No recent entries."
    return (
        "You are a private reflective assistant for the user's personal journal.\n\n"
        "Current entry:\n"
        f"Date: {entry.entry_date.isoformat()}\n"
        f"Mood: {mood}\n"
        f"People tagged: {people}\n"
        f"Body:\n{entry.body}\n\n"
        "Recent context entries:\n"
        f"{context_block}\n\n"
        "Reflect on emotional themes, patterns, and relational signals. "
        "Offer one or two thoughtful questions to sit with. "
        "Keep response warm, concise, and practical."
    )


async def build_weekly_digest_prompt(user_id, db) -> str:
    recent_entries = await journal_repository.list_recent_non_deleted(user_id, 50, db)
    moments = []
    for entry in recent_entries:
        for person in entry.people:
            moments.extend(await moment_repository.list_by_person(person.id, user_id, db))
    almanac_entries, _ = await almanac_repository.list_entries(user_id, {}, 1, 50, db)

    entry_summaries: list[str] = []
    moods: list[int] = []
    people_names: set[str] = set()
    for item in recent_entries:
        if item.mood is not None:
            moods.append(item.mood)
        for person in item.people:
            people_names.add(person.name)
        entry_summaries.append(f"- {item.entry_date.isoformat()}: {_trim_text(item.body, 200)}")
    excerpts_block = _join_lines(entry_summaries, "- No recent journal entries.")
    avg_mood = round(sum(moods) / len(moods), 2) if moods else "n/a"
    mood_trajectory = "mixed"
    if len(moods) >= 2:
        mood_trajectory = "upward" if moods[-1] >= moods[0] else "downward"
    prompt = (
        "System: You are a private weekly reflection assistant.\n\n"
        "Data summary (past 7 days):\n"
        f"- Journal entries: {len(recent_entries)}\n"
        f"- Mood average: {avg_mood}\n"
        f"- Mood trajectory: {mood_trajectory}\n"
        f"- People tagged: {', '.join(sorted(people_names)) if people_names else 'None'}\n"
        f"- Moments logged: {len(moments)}\n"
        f"- Almanac captures: {len(almanac_entries)}\n\n"
        "Journal excerpts:\n"
        f"{excerpts_block}\n\n"
        "Task: Surface recurring themes/patterns, frequently appearing relationships, "
        "and mood trends. "
        "Close with one or two reflection questions for next week."
    )
    return _enforce_budget(prompt)


async def build_dynamic_prompt(user_id, db) -> str | None:
    recent_entries = await journal_repository.list_recent_non_deleted(user_id, 5, db)
    if len(recent_entries) < 2:
        return None
    excerpts = [
        f"- {item.entry_date.isoformat()}: {_trim_text(item.body, 150)}"
        for item in recent_entries[:5]
    ]
    prompt = (
        "System: Generate one journaling question personalized from recent writing.\n\n"
        "Recent entries:\n"
        f"{chr(10).join(excerpts)}\n\n"
        "Return exactly one short open-ended question under 25 words. Do not add explanation."
    )
    return _enforce_budget(prompt)


async def build_nudge_prompt(user_id, person_id, db) -> str | None:
    person: Person | None = await person_repository.get_by_id(person_id, user_id, db)
    if person is None:
        return None
    moments = await moment_repository.list_by_person(person_id, user_id, db)
    journal_entries = await journal_repository.reverse_timeline_for_person(person_id, user_id, db)
    if not moments and not journal_entries:
        return None
    recent_moments = moments[:3]
    recent_entries = journal_entries[:2]
    moments_block = (
        "\n".join(
            (
                f"- {m.occurred_on.isoformat()}: sentiment={m.sentiment}; "
                f"{_trim_text(m.what_happened or '', 140)}"
            )
            for m in recent_moments
        )
        or "- No moments."
    )
    entries_block = "\n".join(
        f"- {e.entry_date.isoformat()}: {_trim_text(e.body, 140)}" for e in recent_entries
    ) or "- No journal references."
    prompt = (
        "System: Help the user reflect on a specific relationship.\n\n"
        f"Person: {person.name}\n"
        f"Relationship: {person.relationship_type}\n"
        f"Last talked: "
        f"{person.last_talked_at.isoformat() if person.last_talked_at else 'unknown'}\n\n"
        "Recent moments:\n"
        f"{moments_block}\n\n"
        "Recent journal references:\n"
        f"{entries_block}\n\n"
        'Return one sentence starting with '
        f'"What\'s on your mind about {person.name}?" '
        "and then one specific follow-up question. "
        "Output plain text only."
    )
    return _enforce_budget(prompt)
