from app.models.journal_entry import JournalEntry


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
