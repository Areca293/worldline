from django.conf import settings
from django.db import models


class QuotaDay(models.Model):
    scope = models.CharField(max_length=80)
    day = models.DateField()
    admitted = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["scope", "day"], name="ai_quota_scope_day")]


class ResultCache(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    key = models.CharField(max_length=64)
    payload = models.JSONField()
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "key"], name="ai_cache_user_key")]


class UsageEvent(models.Model):
    """Operational metrics only. Never store submitted questions or source text here."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    operation = models.CharField(max_length=20)
    outcome = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    elapsed_ms = models.PositiveIntegerField()
    search_calls = models.PositiveSmallIntegerField(default=0)
    model_calls = models.PositiveSmallIntegerField(default=0)
    input_tokens = models.PositiveIntegerField(null=True)
    output_tokens = models.PositiveIntegerField(null=True)
