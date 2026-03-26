from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, date, datetime
from enum import StrEnum
from math import exp, log


class RelationshipTypeEnum(StrEnum):
    CLOSE_FRIEND = "close_friend"
    FRIEND = "friend"
    ACQUAINTANCE = "acquaintance"
    NEW_PERSON = "new_person"
    COMPLICATED = "complicated"
    FADED = "faded"


class MomentTypeEnum(StrEnum):
    CONVERSATION = "conversation"
    SHARED_EXPERIENCE = "shared_experience"
    ACT_OF_CARE = "act_of_care"
    CONFLICT = "conflict"
    MILESTONE = "milestone"
    OBSERVATION = "observation"
    OTHER = "other"


class SentimentEnum(StrEnum):
    WARM = "warm"
    NEUTRAL = "neutral"
    HURTFUL = "hurtful"
    COMPLICATED = "complicated"


SENTIMENT_WEIGHTS = {
    SentimentEnum.WARM.value: 1.0,
    SentimentEnum.NEUTRAL.value: 0.0,
    SentimentEnum.HURTFUL.value: -1.5,
    SentimentEnum.COMPLICATED.value: -0.5,
}
DECAY_LAMBDA = log(2) / 365


def compute_warmth_score(entries: Iterable[tuple[str, date]], today: date | None = None) -> float:
    ref_day = today or datetime.now(UTC).date()
    score = 0.0
    for sentiment, occurred_on in entries:
        weight = SENTIMENT_WEIGHTS.get(sentiment, 0.0)
        days_since = max((ref_day - occurred_on).days, 0)
        score += weight * exp(-DECAY_LAMBDA * days_since)
    return round(max(min(score, 100.0), -100.0), 2)
