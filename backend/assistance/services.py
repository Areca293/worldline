import json
import logging
import time
from contextlib import contextmanager
from datetime import timedelta

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone
from django.utils.crypto import salted_hmac

from . import providers
from .models import QuotaDay, ResultCache, UsageEvent
from .providers import AssistanceError

logger = logging.getLogger("assistance")
PROMPT_VERSION = "m3-evidence-v1"


def capabilities():
    model = bool(settings.AI_ENABLED and settings.OPENAI_API_KEY and settings.OPENAI_MODEL)
    search = bool(settings.AI_ENABLED and settings.BRAVE_SEARCH_API_KEY)
    return {"web_search": search, "answers": search and model, "reading_help": model}


def allowance(user):
    used = QuotaDay.objects.filter(scope=f"user:{user.pk}", day=timezone.now().date()).first()
    return {
        "daily_limit": settings.AI_USER_DAILY_LIMIT,
        "remaining": max(0, settings.AI_USER_DAILY_LIMIT - (used.admitted if used else 0)),
        "resets": "00:00 UTC",
    }


@contextmanager
def user_request_lock(user):
    # Session advisory lock spans provider calls without holding a transaction.
    # This two-int namespace is separate from feed imports' bigint namespace.
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_try_advisory_lock(7703, %s)", [user.pk])
        acquired = cursor.fetchone()[0]
    if not acquired:
        raise AssistanceError(
            "busy", "Another assistance request is still running. Please wait.", 409
        )
    try:
        yield
    finally:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_unlock(7703, %s)", [user.pk])


@transaction.atomic
def reserve(user):
    day = timezone.now().date()
    # Every worker locks the global row first, before inspecting the user's quota.
    QuotaDay.objects.get_or_create(scope="global", day=day)
    total = QuotaDay.objects.select_for_update().get(scope="global", day=day)
    own, _ = QuotaDay.objects.get_or_create(scope=f"user:{user.pk}", day=day)
    if (
        total.admitted >= settings.AI_GLOBAL_DAILY_LIMIT
        or own.admitted >= settings.AI_USER_DAILY_LIMIT
    ):
        raise AssistanceError(
            "daily_limit", "The daily assistance limit has been reached. Try after 00:00 UTC.", 429
        )
    for row in (total, own):
        row.admitted += 1
        row.save(update_fields=["admitted"])


def execute(user, operation, inputs, run, ttl):
    # Only an HMAC is persisted; changing credentials also invalidates old output.
    key = salted_hmac(
        "worldline-assistance",
        json.dumps(
            [
                PROMPT_VERSION,
                operation,
                inputs,
                settings.OPENAI_MODEL,
                settings.OPENAI_API_KEY,
                settings.BRAVE_SEARCH_API_KEY,
                ttl,
            ],
            sort_keys=True,
        ),
        algorithm="sha256",
    ).hexdigest()
    with user_request_lock(user):
        ResultCache.objects.filter(expires_at__lte=timezone.now()).delete()
        cached = ResultCache.objects.filter(user=user, key=key).first() if ttl else None
        if cached:
            return {**cached.payload, "cached": True, "allowance": allowance(user)}
        reserve(user)
        started = time.monotonic()
        metrics = {"search_calls": 0, "model_calls": 0, "input_tokens": None, "output_tokens": None}
        outcome = "internal_error"
        try:
            payload = run(metrics)
            outcome = payload["answer_status"]
            if ttl and outcome in {
                "complete",
                "insufficient_evidence",
                "no_results",
                "not_configured",
            }:
                ResultCache.objects.update_or_create(
                    user=user,
                    key=key,
                    defaults={
                        "payload": payload,
                        "expires_at": timezone.now() + timedelta(seconds=ttl),
                    },
                )
            return {**payload, "cached": False, "allowance": allowance(user)}
        except AssistanceError as exc:
            outcome = exc.code
            raise
        finally:
            elapsed = int((time.monotonic() - started) * 1000)
            UsageEvent.objects.create(
                user=user, operation=operation, outcome=outcome, elapsed_ms=elapsed, **metrics
            )
            logger.info(
                "operation=%s outcome=%s elapsed_ms=%s search_calls=%s model_calls=%s input_tokens=%s output_tokens=%s",
                operation,
                outcome,
                elapsed,
                metrics["search_calls"],
                metrics["model_calls"],
                metrics["input_tokens"],
                metrics["output_tokens"],
            )


def research(user, query, window):
    if not capabilities()["web_search"]:
        raise AssistanceError(
            "not_configured",
            "Web research is not configured. Collected-story search is still available.",
        )

    def run(metrics):
        metrics["search_calls"] = 1
        evidence = providers.search_web(query, window)
        result = {
            "sources": evidence,
            "retrieved_at": timezone.now().isoformat(),
            "generated_at": None,
            "window": window,
            "answer": None,
            "answer_status": "no_results" if not evidence else "not_configured",
            "message": "No search results were returned."
            if not evidence
            else "AI answers are not configured. You can still inspect the search results.",
        }
        if not evidence or not capabilities()["answers"]:
            return result
        if not any(row["text"] for row in evidence):
            return {
                **result,
                "answer_status": "insufficient_evidence",
                "message": "The results contain no usable snippets to support an answer.",
            }
        metrics["model_calls"] = 1
        try:
            answer, tokens = providers.generate("answer", query, evidence)
        except AssistanceError as exc:
            return {**result, "answer_status": exc.code, "message": exc.message}
        metrics.update(tokens)
        return {
            **result,
            "answer": answer,
            "answer_status": "complete"
            if answer["evidence_sufficient"]
            else "insufficient_evidence",
            "generated_at": timezone.now().isoformat(),
            "message": "",
        }

    return execute(user, "research", [query, window], run, settings.AI_WEB_CACHE_SECONDS)


def reading_help(user, article, mode):
    if not capabilities()["reading_help"]:
        raise AssistanceError(
            "not_configured",
            "Reading assistance is not configured. The source excerpt remains available.",
        )
    if article.is_sample:
        raise AssistanceError(
            "sample_content",
            "Reading assistance is available for collected content, not demo stories.",
            400,
        )
    text = providers.plain(article.summary, 8000)
    if not text:
        raise AssistanceError(
            "no_text", "This source provided no excerpt to process. Open the original article.", 422
        )
    source = {
        "id": 1,
        "title": article.title,
        "url": providers.public_url(article.original_url),
        "publisher": article.source.name,
        "text": text,
        "kind": "repository_description" if hasattr(article, "repository") else "feed_excerpt",
        "published_at": article.published_at.isoformat() if article.published_at else None,
    }
    if not source["url"]:
        raise AssistanceError("invalid_source", "This item's source URL is unavailable.", 422)

    def run(metrics):
        metrics["model_calls"] = 1
        answer, tokens = providers.generate(mode, "Process only the provided text.", [source])
        metrics.update(tokens)
        return {
            "answer": answer,
            "answer_status": "complete"
            if answer["evidence_sufficient"]
            else "insufficient_evidence",
            "sources": [source],
            "generated_at": timezone.now().isoformat(),
            "mode": mode,
            "input_truncated": len(article.summary) > 8000,
            "message": "",
            "retrieved_at": None,
        }

    return execute(user, mode, source, run, 86400)
