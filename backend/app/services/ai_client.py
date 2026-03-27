import random
import time
from typing import Any
from urllib.parse import urlparse

from app.core.config import settings
from app.services.ai_types import AIGenerationError, AIResult

_RETRY_DELAYS_SECONDS = (0.5, 1.5, 3.0)


def _base_url_fingerprint(base_url: str | None) -> str:
    if not base_url:
        return "default"
    parsed = urlparse(base_url)
    path = parsed.path.rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def _normalize_finish_reason(raw_reason: str | None) -> str | None:
    if raw_reason is None:
        return None
    normalized = raw_reason.lower()
    mapping = {
        "end_turn": "stop",
        "stop": "stop",
        "stop_sequence": "stop",
        "length": "length",
        "max_tokens": "length",
        "content_filter": "content_filter",
        "tool_use": "tool_use",
    }
    return mapping.get(normalized, "unknown")


def _extract_text(result: Any) -> str:
    content = getattr(result, "content", None)
    if isinstance(content, list):
        chunks: list[str] = []
        for item in content:
            text = getattr(item, "text", None)
            if isinstance(text, str):
                chunks.append(text)
        if chunks:
            return "".join(chunks).strip()
    text = getattr(result, "text", None)
    if isinstance(text, str):
        return text.strip()
    return ""


def _error_is_retryable(exc: Exception) -> bool:
    status_code = getattr(exc, "status_code", None) or getattr(exc, "status", None)
    if isinstance(status_code, int):
        if status_code == 429 or 500 <= status_code <= 504:
            return True
        if status_code in {400, 401, 403, 404, 409, 422}:
            return False
    message = str(exc).lower()
    retry_markers = ("timeout", "timed out", "connection reset", "temporar", "rate limit")
    return any(marker in message for marker in retry_markers)


def _build_error(exc: Exception, provider: str, model_name: str) -> AIGenerationError:
    return AIGenerationError(
        message=str(exc),
        retryable=_error_is_retryable(exc),
        provider=provider,
        model_name=model_name,
        request_id=getattr(exc, "request_id", None),
        raw_error_code=str(getattr(exc, "status_code", "")) or None,
        raw_error_type=exc.__class__.__name__,
    )


def _create_client() -> Any:
    import anthropic  # type: ignore

    kwargs: dict[str, Any] = {}
    if settings.anthropic_base_url:
        kwargs["base_url"] = settings.anthropic_base_url
    return anthropic.Anthropic(api_key=settings.anthropic_api_key, **kwargs)


def _attempt_generate_text(prompt: str, max_tokens: int, system: str | None = None) -> AIResult:
    provider = settings.ai_provider
    model_name = settings.ai_model
    start = time.monotonic()
    try:
        client = _create_client()
        request: dict[str, Any] = {
            "model": model_name,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
            "timeout": settings.ai_timeout_seconds,
        }
        if system:
            request["system"] = system
        result = client.messages.create(**request)
        usage = getattr(result, "usage", None)
        latency_ms = int((time.monotonic() - start) * 1000)
        return AIResult(
            text=_extract_text(result),
            provider=provider,
            model_name=model_name,
            tokens_input=getattr(usage, "input_tokens", None),
            tokens_output=getattr(usage, "output_tokens", None),
            finish_reason=_normalize_finish_reason(getattr(result, "stop_reason", None)),
            request_id=getattr(result, "id", None),
            latency_ms=latency_ms,
            base_url_fingerprint=_base_url_fingerprint(settings.anthropic_base_url),
        )
    except Exception as exc:
        raise _build_error(exc, provider, model_name) from exc


def generate_text(prompt: str, max_tokens: int = 800, system: str | None = None) -> AIResult:
    last_error: AIGenerationError | None = None
    for idx, delay in enumerate(_RETRY_DELAYS_SECONDS):
        try:
            return _attempt_generate_text(prompt, max_tokens=max_tokens, system=system)
        except AIGenerationError as exc:
            last_error = exc
            if not exc.retryable:
                raise
            if idx == len(_RETRY_DELAYS_SECONDS) - 1:
                break
            time.sleep(delay + random.uniform(0, 0.25))
    if last_error is None:
        raise RuntimeError("AI generation failed without captured error")
    raise last_error

