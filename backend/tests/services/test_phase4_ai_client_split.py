from types import SimpleNamespace

import pytest

from app.services import ai_client
from app.services.ai_types import AIGenerationError


def test_ai_client_normalization_helpers():
    assert ai_client._base_url_fingerprint(None) == "default"
    assert ai_client._base_url_fingerprint("http://localhost:1234/v1/") == "http://localhost:1234/v1"
    assert ai_client._normalize_finish_reason(None) is None
    assert ai_client._normalize_finish_reason("UNMAPPED_REASON") == "unknown"
    assert ai_client._extract_text(SimpleNamespace()) == ""
    assert ai_client._extract_text(SimpleNamespace(text="  hi ")) == "hi"


def test_ai_client_retryable_classification():
    assert ai_client._error_is_retryable(Exception("temporary timeout")) is True
    assert ai_client._error_is_retryable(
        SimpleNamespace(status_code=401, __str__=lambda self: "x")
    ) is False


def test_ai_client_build_error_retryable():
    class _BadStatus(Exception):
        status_code = 500

    err = ai_client._build_error(_BadStatus("boom"), "anthropic", "m")
    assert err.retryable is True


def test_ai_client_generate_text_retry_path(monkeypatch):
    class _BadStatus(Exception):
        status_code = 500

    err = ai_client._build_error(_BadStatus("boom"), "anthropic", "m")
    original_attempt = ai_client._attempt_generate_text

    def _raise_err(*_args, **_kwargs):
        raise err

    monkeypatch.setattr(ai_client, "_attempt_generate_text", _raise_err)
    monkeypatch.setattr(ai_client.time, "sleep", lambda *_args, **_kwargs: None)
    with pytest.raises(AIGenerationError):
        ai_client.generate_text("x")
    monkeypatch.setattr(ai_client, "_attempt_generate_text", original_attempt)


def test_ai_client_create_client_uses_base_url(monkeypatch):
    import sys

    class _Client:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    sys.modules["anthropic"] = SimpleNamespace(Anthropic=lambda **kwargs: _Client(**kwargs))
    monkeypatch.setattr(ai_client.settings, "anthropic_base_url", "http://localhost:1234/v1")
    client = ai_client._create_client()
    assert client.kwargs["base_url"] == "http://localhost:1234/v1"


def test_ai_client_generate_text_no_retry_slots(monkeypatch):
    original_delays = ai_client._RETRY_DELAYS_SECONDS
    monkeypatch.setattr(ai_client, "_RETRY_DELAYS_SECONDS", ())
    with pytest.raises(RuntimeError):
        ai_client.generate_text("x")
    monkeypatch.setattr(ai_client, "_RETRY_DELAYS_SECONDS", original_delays)


def test_ai_client_attempt_includes_system(monkeypatch):
    captured: dict[str, object] = {}

    class _Messages:
        @staticmethod
        def create(**kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                content=[],
                text="ok",
                usage=SimpleNamespace(input_tokens=1, output_tokens=1),
                stop_reason="stop",
                id="rid",
            )

    monkeypatch.setattr(ai_client, "_create_client", lambda: SimpleNamespace(messages=_Messages()))
    result = ai_client._attempt_generate_text("prompt", 10, system="sys-msg")
    assert result.text == "ok"
    assert captured["system"] == "sys-msg"


def test_ai_client_attempt_wraps_exception(monkeypatch):
    def _raise_runtime_error():
        raise RuntimeError("bad")

    monkeypatch.setattr(ai_client, "_create_client", _raise_runtime_error)
    with pytest.raises(AIGenerationError):
        ai_client._attempt_generate_text("prompt", 8, system="sys")

