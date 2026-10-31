"""Official OpenAI Responses request and completion envelope validation."""

import json

from django.conf import settings

from . import transport
from .errors import AssistanceError
from .evidence import invalid_answer, validate_answer
from .prompts import instructions_for


def generate_openai(operation, question, evidence, schema, ids):
    data = transport.request_json(
        "POST",
        "https://api.openai.com/v1/responses",
        {"Authorization": f"Bearer {settings.OPENAI_API_KEY}", "Content-Type": "application/json"},
        {
            "model": settings.OPENAI_MODEL,
            "store": False,
            "max_output_tokens": settings.AI_MAX_OUTPUT_TOKENS,
            "instructions": instructions_for(operation),
            "input": json.dumps(
                {"operation": operation, "question": question, "evidence": evidence}
            ),
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "evidence_answer",
                    "strict": True,
                    "schema": schema,
                }
            },
        },
    )
    if data.get("status") != "completed":
        raise AssistanceError(
            "incomplete", "The model did not finish an answer. Please try again.", 502
        )
    texts = []
    try:
        for item in data.get("output", []):
            if item.get("type") != "message":
                continue
            for content in item.get("content", []):
                if content.get("type") == "refusal":
                    raise AssistanceError(
                        "refused", "The model declined this request. Try a different question.", 422
                    )
                if content.get("type") == "output_text":
                    texts.append(content["text"])
        return validate_answer("".join(texts), data.get("usage") or {}, ids)
    except (ValueError, TypeError, KeyError, AttributeError):
        raise invalid_answer() from None
