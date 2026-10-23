"""Synthetic adapter contracts, separate from real local model acceptance."""

import json
from unittest.mock import Mock, patch

import pytest

from assistance import providers, services
from assistance.providers import AssistanceError
from assistance.tests.test_assistance import ANSWER, EVIDENCE


@pytest.fixture
def local(settings):
    settings.AI_ENABLED = True
    settings.AI_MODEL_PROVIDER = "lmstudio"
    settings.LM_STUDIO_BASE_URL = "http://127.0.0.1:1235/v1"
    settings.LM_STUDIO_MODEL = "fixture-model"
    settings.LM_STUDIO_API_KEY = ""
    settings.OPENAI_API_KEY = ""
    settings.LM_STUDIO_TIMEOUT_SECONDS = 60
    settings.AI_MAX_OUTPUT_TOKENS = 1200
    settings.BRAVE_SEARCH_API_KEY = ""


def reply(content=None, finish="stop", **message):
    return {
        "choices": [
            {
                "finish_reason": finish,
                "message": {
                    "role": "assistant",
                    "content": json.dumps(ANSWER) if content is None else content,
                    **message,
                },
            }
        ],
        "usage": {"prompt_tokens": 150, "completion_tokens": 80},
    }


def test_local_contract_without_openai_key(local):
    assert services.capabilities() == {"web_search": False, "answers": False, "reading_help": True}
    with patch(
        "assistance.providers.request_json",
        return_value=reply(reasoning_content="private thinking"),
    ) as request:
        answer, usage = providers.generate("translate", "Only supplied text", EVIDENCE)
    assert answer == ANSWER and usage == {"input_tokens": 150, "output_tokens": 80}
    method, url, headers, body = request.call_args.args
    assert method == "POST" and url == "http://127.0.0.1:1235/v1/chat/completions"
    assert "Authorization" not in headers and "tools" not in body
    assert body["model"] == "fixture-model" and body["temperature"] == 0.2
    assert body["max_tokens"] == 1200 and body["stream"] is False
    assert body["response_format"]["json_schema"]["strict"] is True
    assert body["response_format"]["json_schema"]["schema"] == providers.evidence_schema([1])
    assert "Never convert currencies" in body["messages"][0]["content"]
    assert "false ALWAYS means paragraphs=[]" in body["messages"][0]["content"]
    assert request.call_args.kwargs["timeout_seconds"] == 60
    assert "private thinking" not in str(answer)


@pytest.mark.parametrize(
    "url",
    [
        "http://evil.example/v1",
        "http://127.0.0.1.evil.example:1234/v1",
        "http://127.0.0.1:1234/v1?target=evil",
        "http://user:secret@127.0.0.1:1234/v1",
        "http://127.0.0.1:1234/v1#fragment",
        "file:///v1",
        "http://127.0.0.1:1234/admin",
        "http://192.168.1.20:1234/v1",
        "http://localhost:bad/v1",
    ],
)
def test_local_endpoint_rejects_unapproved_destinations(local, settings, url):
    settings.LM_STUDIO_BASE_URL = url
    assert not providers.model_configured()
    with patch("assistance.providers.request_json") as request:
        with pytest.raises(AssistanceError, match="not_configured"):
            providers.generate("summarize", "a question", EVIDENCE)
        request.assert_not_called()


@pytest.mark.parametrize("host", ["localhost", "[::1]", "host.docker.internal"])
def test_explicit_local_hosts_supported(local, settings, host):
    settings.LM_STUDIO_BASE_URL = f"http://{host}:1234/v1/"
    assert providers.local_endpoint() == f"http://{host}:1234/v1/chat/completions"


@pytest.mark.parametrize(
    "data,code",
    [
        (reply(finish="length"), "incomplete"),
        (reply(finish="tool_calls"), "incomplete"),
        (reply(content="not json"), "invalid_answer"),
        (reply(content="<think>private</think>" + json.dumps(ANSWER)), "invalid_answer"),
        (reply(content=json.dumps({**ANSWER, "evidence_sufficient": False})), "invalid_answer"),
        (
            reply(
                content=json.dumps(
                    {**ANSWER, "paragraphs": [{"text": "Wrong", "source_ids": [99]}]}
                )
            ),
            "invalid_answer",
        ),
        (reply(tool_calls=[{"name": "unsafe"}]), "invalid_answer"),
        (reply(refusal="No"), "refused"),
        ({"choices": []}, "invalid_answer"),
        ({**reply(), "usage": {"prompt_tokens": -1}}, "invalid_answer"),
    ],
)
def test_local_incomplete_untrusted_and_malformed_output_is_not_salvaged(local, data, code):
    with patch("assistance.providers.request_json", return_value=data):
        with pytest.raises(AssistanceError, match=code):
            providers.generate("summarize", "a question", EVIDENCE)


def test_missing_usage_and_optional_local_auth(local, settings):
    settings.LM_STUDIO_API_KEY = "synthetic-private-key"
    data = reply()
    data.pop("usage")
    with patch("assistance.providers.request_json", return_value=data) as request:
        _, usage = providers.generate("explain", "a question", EVIDENCE)
    assert usage == {"input_tokens": None, "output_tokens": None}
    assert request.call_args.args[2]["Authorization"] == "Bearer synthetic-private-key"


@pytest.mark.django_db
def test_cache_changes_with_provider_model_and_inference_settings(
    local, settings, django_user_model
):
    user = django_user_model.objects.create_user(username="local-cache-fixture")
    run = Mock(return_value={"answer_status": "complete", "answer": ANSWER})

    def execute():
        return services.execute(user, "summarize", EVIDENCE, run, 3600)

    assert not execute()["cached"]
    assert execute()["cached"]
    for key, value in [
        ("LM_STUDIO_MODEL", "second-model"),
        ("LM_STUDIO_CONFIG_REVISION", "2"),
        ("AI_MAX_OUTPUT_TOKENS", 1300),
        ("LM_STUDIO_BASE_URL", "http://127.0.0.1:1236/v1"),
        ("LM_STUDIO_TIMEOUT_SECONDS", 90),
        ("LM_STUDIO_API_KEY", "synthetic-key"),
        ("AI_MODEL_PROVIDER", "openai"),
    ]:
        setattr(settings, key, value)
        assert not execute()["cached"]
    assert run.call_count == 8
