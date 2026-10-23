"""Retention and usage reporting against disposable database records."""

from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from assistance.models import QuotaDay, ResultCache, UsageEvent


@pytest.mark.django_db
def test_pruning_preserves_current_results_counters_and_users(django_user_model):
    user = django_user_model.objects.create_user(username="retention-fixture")
    now = timezone.now()
    for key, expiry in (
        ("expired", now - timedelta(seconds=1)),
        ("fresh", now + timedelta(hours=1)),
    ):
        ResultCache.objects.create(user=user, key=key, payload={}, expires_at=expiry)
    for days in (31, 0):
        QuotaDay.objects.create(scope="global", day=(now - timedelta(days=days)).date(), admitted=1)
        event = UsageEvent.objects.create(
            user=user, operation="research", outcome="complete", elapsed_ms=1
        )
        UsageEvent.objects.filter(pk=event.pk).update(created_at=now - timedelta(days=days))
    call_command("prune_assistance", stdout=StringIO())
    assert list(ResultCache.objects.values_list("key", flat=True)) == ["fresh"]
    assert list(QuotaDay.objects.values_list("day", flat=True)) == [now.date()]
    assert UsageEvent.objects.count() == 1
    assert django_user_model.objects.filter(pk=user.pk).exists()


@pytest.mark.django_db
def test_usage_report_keeps_unknown_tokens_unknown_and_omits_private_data(django_user_model):
    user = django_user_model.objects.create_user(username="private-user-marker")
    ResultCache.objects.create(
        user=user,
        key="private-key-marker",
        payload={"answer": "private-answer-marker"},
        expires_at=timezone.now() + timedelta(hours=1),
    )
    UsageEvent.objects.create(
        user=user,
        operation="research",
        outcome="timeout",
        elapsed_ms=30,
        search_calls=1,
        model_calls=1,
    )
    output = StringIO()
    call_command("assistance_usage", stdout=output)
    text = output.getvalue()
    assert "'input_tokens': None" in text and "'model_calls': 1" in text
    assert "Provider invoices are authoritative" in text
    assert "private-" not in text
