"""Evidence text/link handling and strict answer validation; never output repair."""

import ipaddress
import json
import logging
import re
from urllib.parse import urlsplit, urlunsplit

from django.utils.html import strip_tags

from .errors import AssistanceError

logger = logging.getLogger("assistance")


def public_url(value):
    if not isinstance(value, str) or len(value) > 2048 or re.search(r"[\x00-\x20\\]", value):
        return None
    try:
        parts = urlsplit(value)
        host = (parts.hostname or "").lower().rstrip(".")
        if parts.scheme not in {"http", "https"} or parts.username or parts.password:
            return None
        if not host or "." not in host or host.endswith((".local", ".localhost", ".internal")):
            return None
        if parts.port not in {None, 80, 443}:
            return None
        try:
            if not ipaddress.ip_address(host).is_global:
                return None
        except ValueError:
            pass
        return urlunsplit(parts._replace(fragment=""))
    except ValueError:
        return None


def plain(value, limit):
    if not isinstance(value, str):
        return ""
    # Limit before parsing too; provider text is untrusted and size bounded.
    return " ".join(strip_tags(value[: limit * 2]).split())[:limit]


def invalid_answer(reason="response_shape"):
    # Only internal categories: never log provider text, exceptions or credentials.
    logger.warning("model_response_rejected reason=%s", reason)
    return AssistanceError(
        "invalid_answer",
        "The answer could not be verified against its sources. Please try again.",
        502,
    )


def validated_tokens(usage):
    tokens = {key: usage.get(key) for key in ("input_tokens", "output_tokens")}
    if any(
        v is not None and (type(v) is not int or not 0 <= v <= 2147483647) for v in tokens.values()
    ):
        raise ValueError("usage")
    return tokens


def validate_answer(text, usage, ids):
    reason = "invalid_json"
    try:
        result = json.loads(text)
        reason = "answer_shape"
        if not isinstance(result, dict) or set(result) != {
            "paragraphs",
            "evidence_sufficient",
            "limitations",
        }:
            raise ValueError("shape")
        paragraphs = result["paragraphs"]
        sufficient = result["evidence_sufficient"]
        if type(sufficient) is not bool or not isinstance(paragraphs, list) or len(paragraphs) > 8:
            raise ValueError("shape")
        reason = "evidence_consistency"
        if bool(paragraphs) != sufficient or not isinstance(result["limitations"], str):
            raise ValueError("evidence")
        for p in paragraphs:
            reason = "paragraph_shape"
            if (
                not isinstance(p, dict)
                or set(p) != {"text", "source_ids"}
                or not isinstance(p["text"], str)
                or not p["text"].strip()
                or not isinstance(p["source_ids"], list)
                or not p["source_ids"]
            ):
                raise ValueError("paragraph")
            reason = "invalid_citations"
            if any(type(i) is not int or i not in ids for i in p["source_ids"]):
                raise ValueError("citation")
        reason = "answer_length"
        if len(result["limitations"]) > 1500 or sum(len(p["text"]) for p in paragraphs) > 8000:
            raise ValueError("length")
        reason = "invalid_usage"
        tokens = validated_tokens(usage)
        return {
            "paragraphs": paragraphs,
            "limitations": result["limitations"],
            "evidence_sufficient": sufficient,
        }, tokens
    except (ValueError, TypeError, KeyError, AttributeError):
        raise invalid_answer(reason) from None
