from types import SimpleNamespace

import pytest

from app.services import ai_client


def test_generate_text_success(monkeypatch):
    class _Messages:
        @staticmethod
        def create(**_kwargs):
            usage = SimpleNamespace(input_tokens=10, output_tokens=20)
            return SimpleNamespace(
                id="req_1",
                content=[SimpleNamespace(text="hello world")],
                usage=usage,
                stop_reason="end_turn",
            )

    monkeypatch.setattr(ai_client, "_create_client", lambda: SimpleNamespace(messages=_Messages()))
    result = ai_client.generate_text("prompt", max_tokens=32)
    assert result.text == "hello world"
    assert result.tokens_input == 10
    assert result.finish_reason == "stop"


def test_generate_text_retry(monkeypatch):
    attempts = {"count": 0}

    class _Retryable(Exception):
        status_code = 429

    def _attempt(*_args, **_kwargs):
        attempts["count"] += 1
        if attempts["count"] < 2:
            raise ai_client._build_error(_Retryable("rate"), "anthropic", "m")
        return SimpleNamespace(
            text="ok",
            provider="anthropic",
            model_name="m",
            tokens_input=None,
            tokens_output=None,
            finish_reason="stop",
            request_id=None,
            latency_ms=1,
            base_url_fingerprint="default",
            raw_error_code=None,
            raw_error_type=None,
        )

    monkeypatch.setattr(ai_client, "_attempt_generate_text", _attempt)
    monkeypatch.setattr(ai_client.time, "sleep", lambda *_args, **_kwargs: None)
    result = ai_client.generate_text("prompt")
    assert result.text == "ok"
    assert attempts["count"] == 2


def test_generate_text_non_retryable(monkeypatch):
    class _BadReq(Exception):
        status_code = 400

    monkeypatch.setattr(
        ai_client,
        "_attempt_generate_text",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            ai_client._build_error(_BadReq("bad"), "anthropic", "m")
        ),
    )
    with pytest.raises(ai_client.AIGenerationError):
        ai_client.generate_text("prompt")

