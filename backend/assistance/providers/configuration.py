"""Server-only endpoint validation and request-affecting cache configuration."""

import re
from urllib.parse import urlsplit

from django.conf import settings

from .errors import AssistanceError

RELAY_PROMPT_VERSION = "relay-evidence-v2-explicit-contract"


def local_endpoint():
    """Allow only literal loopback or Docker Desktop's explicit host gateway.

    Never accept a request-supplied endpoint, redirects, userinfo or URL parameters.
    Docker's gateway is supported for a future container setup, not selected here.
    """
    try:
        raw = settings.LM_STUDIO_BASE_URL
        parts = urlsplit(raw)
        if (
            parts.scheme not in {"http", "https"}
            or parts.hostname not in {"127.0.0.1", "localhost", "::1", "host.docker.internal"}
            or parts.username is not None
            or parts.password is not None
            or parts.query
            or parts.fragment
            or parts.path.rstrip("/") != "/v1"
            or re.search(r"[\x00-\x20\\]", raw)
            or not parts.port
        ):
            raise ValueError
        return raw.rstrip("/") + "/chat/completions"
    except (ValueError, TypeError):
        raise AssistanceError(
            "not_configured", "The local model endpoint is not configured correctly."
        ) from None


def relay_endpoint():
    """Require an explicit HTTPS relay origin and exactly one /v1 suffix.

    A full match also rejects empty query/fragment delimiters, userinfo, encoded
    paths, whitespace and extra slashes. Never accept a target from request data.
    """
    raw = settings.RELAY_BASE_URL
    if not isinstance(raw, str) or not re.fullmatch(
        r"https://(?:code|cncode)\.anyxml\.com(?::443)?/v1/?", raw
    ):
        raise AssistanceError("not_configured", "The relay endpoint is not configured correctly.")
    return f"https://{urlsplit(raw).hostname}/v1/chat/completions"


def model_configuration():
    """Fingerprint all request-affecting settings; never expose this to the API."""
    if settings.AI_MODEL_PROVIDER == "relay":
        return {
            "provider": "relay",
            "model": settings.RELAY_MODEL,
            "endpoint": relay_endpoint(),
            "key": settings.RELAY_API_KEY,
            "temperature": 0.2,
            "timeout": settings.RELAY_TIMEOUT_SECONDS,
            "revision": settings.RELAY_CONFIG_REVISION,
            "max_tokens": settings.AI_MAX_OUTPUT_TOKENS,
            "output_format": "json_schema-strict-v1",
            "prompt_version": RELAY_PROMPT_VERSION,
            "stream": False,
        }
    if settings.AI_MODEL_PROVIDER == "lmstudio":
        return {
            "provider": "lmstudio",
            "model": settings.LM_STUDIO_MODEL,
            "endpoint": local_endpoint(),
            "key": settings.LM_STUDIO_API_KEY,
            "temperature": 0.2,
            "timeout": settings.LM_STUDIO_TIMEOUT_SECONDS,
            "revision": settings.LM_STUDIO_CONFIG_REVISION,
            "max_tokens": settings.AI_MAX_OUTPUT_TOKENS,
        }
    if settings.AI_MODEL_PROVIDER != "openai":
        raise AssistanceError("not_configured", "The model provider is not configured correctly.")
    return {
        "provider": "openai",
        "model": settings.OPENAI_MODEL,
        "endpoint": "https://api.openai.com/v1/responses",
        "key": settings.OPENAI_API_KEY,
        "max_tokens": settings.AI_MAX_OUTPUT_TOKENS,
    }


def model_configured():
    try:
        config = model_configuration()
        return bool(config["model"] and (config["provider"] == "lmstudio" or config["key"]))
    except AssistanceError:
        return False
