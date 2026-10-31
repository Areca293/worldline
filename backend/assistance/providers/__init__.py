"""Model dispatch only. Each adapter shares the same evidence contract."""

from django.conf import settings

from . import chat, openai
from .errors import AssistanceError
from .prompts import evidence_schema


def generate(operation, question, evidence):
    ids = [row["id"] for row in evidence if row["text"]]
    if not ids:
        raise AssistanceError("no_text", "There is no source text to process.", 422)
    schema = evidence_schema(ids, operation)
    if settings.AI_MODEL_PROVIDER == "relay":
        return chat.generate_relay(operation, question, evidence, schema, ids)
    if settings.AI_MODEL_PROVIDER == "lmstudio":
        return chat.generate_local(operation, question, evidence, schema, ids)
    return openai.generate_openai(operation, question, evidence, schema, ids)
