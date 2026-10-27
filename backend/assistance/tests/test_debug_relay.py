"""Diagnostic command contracts; all provider responses are synthetic."""

import json
from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from assistance import providers
from assistance.management.commands.debug_relay import EVIDENCE
from assistance.tests.test_local_provider import reply


@pytest.fixture(autouse=True)
def configuration(settings):
    settings.DEBUG = True
    settings.AI_ENABLED = True
    settings.AI_MODEL_PROVIDER = "relay"
    settings.RELAY_BASE_URL = "https://code.anyxml.com/v1"
    settings.RELAY_MODEL = "fixture-model"
    settings.RELAY_API_KEY = "private-relay-key"
    settings.OPENAI_API_KEY = "private-openai-key"
    settings.BRAVE_SEARCH_API_KEY = "private-brave-key"
    settings.LM_STUDIO_API_KEY = "private-local-key"
    settings.SECRET_KEY = "private-django-key"


def test_preview_does_not_send_or_access_database():
    output = StringIO()
    with patch("assistance.providers.request_json") as request:
        call_command("debug_relay", stdout=output)
    request.assert_not_called()
    text = output.getvalue()
    assert "DRY RUN" in text and "Synthetic diagnostic fixture" in text
    assert "You are Worldline's reading assistant" in text
    assert '"strict": true' in text and "private-" not in text


@pytest.mark.parametrize("mode", ["summarize", "translate", "explain", "answer"])
def test_live_diagnostic_uses_identical_body_and_validation_once(mode):
    output = StringIO()
    with patch("assistance.providers.request_json", return_value=reply()) as request:
        call_command("debug_relay", send=True, mode=mode, stdout=output)
    request.assert_called_once()
    method, endpoint, headers, body = request.call_args.args
    assert method == "POST" and endpoint == "https://code.anyxml.com/v1/chat/completions"
    assert headers["Authorization"] == "Bearer private-relay-key"
    question = (
        "Summarize the supplied text." if mode == "answer" else "Process only the provided text."
    )
    assert body == providers.chat_request_body(
        mode,
        question,
        EVIDENCE,
        providers.evidence_schema([1], mode),
        providers.model_configuration(),
    )
    for message in body["messages"]:
        assert "OUTPUT CONTRACT" in message["content"]
        assert "Supported-output shape example:" in message["content"]
        assert "source_ids: a nonempty array of integer IDs" in message["content"]
        assert providers.instructions_for(mode) in message["content"]
    assert "Validation passed" in output.getvalue()
    assert "private-" not in output.getvalue()


@pytest.mark.parametrize("content", ["An ordinary English summary.", "```json\n{}\n```", ""])
def test_invalid_content_visible_without_repair_retry_or_reasoning(content, caplog):
    output = StringIO()
    with patch(
        "assistance.providers.request_json",
        return_value=reply(content=content, reasoning_content="private-reasoning"),
    ) as request:
        with pytest.raises(CommandError, match="Validation failed: invalid_answer"):
            call_command("debug_relay", send=True, stdout=output)
    request.assert_called_once()
    text = output.getvalue()
    assert json.dumps(content, ensure_ascii=False) in text
    assert "json_parse_error" in text and "reason=invalid_json" in caplog.text
    assert "private-reasoning" not in text


def test_echoed_credentials_and_terminal_controls_are_not_exposed():
    output = StringIO()
    content = "private-relay-key private-openai-key private-brave-key private-local-key private-django-key\x1b[31m"
    with patch("assistance.providers.request_json", return_value=reply(content=content)):
        with pytest.raises(CommandError):
            call_command("debug_relay", send=True, stdout=output)
    text = output.getvalue()
    assert "private-" not in text and "[REDACTED]" in text
    assert "\x1b" not in text and r"\u001b" in text


def test_unfenced_summary_shape_is_visible_but_rejected_once(caplog):
    output = StringIO()
    content = json.dumps({"summary": "Synthetic incorrect shape.", "limitations": "Excerpt only."})
    with patch("assistance.providers.request_json", return_value=reply(content=content)) as request:
        with pytest.raises(CommandError, match="Validation failed: invalid_answer"):
            call_command("debug_relay", send=True, stdout=output)
    request.assert_called_once()
    assert "Synthetic incorrect shape." in output.getvalue()
    assert "json_parse_error" not in output.getvalue()
    assert "reason=answer_shape" in caplog.text
    assert "Synthetic incorrect shape." not in caplog.text


@pytest.mark.parametrize(
    "field,value",
    [
        ("DEBUG", False),
        ("AI_ENABLED", False),
        ("RELAY_API_KEY", ""),
        ("AI_MODEL_PROVIDER", "openai"),
        ("RELAY_BASE_URL", "https://evil.example/v1"),
    ],
)
def test_disallowed_configuration_never_sends(settings, field, value):
    setattr(settings, field, value)
    with patch("assistance.providers.request_json") as request:
        with pytest.raises(CommandError):
            call_command("debug_relay", send=True, stdout=StringIO())
    request.assert_not_called()


def test_transport_error_does_not_expose_raw_diagnostics_or_retry():
    output = StringIO()
    with patch(
        "assistance.providers.request_json",
        side_effect=providers.AssistanceError("provider_access", "Provider access is unavailable."),
    ) as request:
        with pytest.raises(CommandError, match="Transport failed: provider_access"):
            call_command("debug_relay", send=True, stdout=output)
    request.assert_called_once()
