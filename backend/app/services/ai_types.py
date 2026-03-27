from dataclasses import dataclass


@dataclass(slots=True)
class AIResult:
    text: str
    provider: str
    model_name: str
    tokens_input: int | None = None
    tokens_output: int | None = None
    finish_reason: str | None = None
    request_id: str | None = None
    latency_ms: int = 0
    base_url_fingerprint: str = "default"
    raw_error_code: str | None = None
    raw_error_type: str | None = None


@dataclass(slots=True)
class AIGenerationError(Exception):
    message: str
    retryable: bool
    provider: str
    model_name: str
    request_id: str | None = None
    raw_error_code: str | None = None
    raw_error_type: str | None = None

