import uuid

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .catalog import APPROVED_FEED_URLS
from .search import article_vector


class Topic(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class Source(models.Model):
    name = models.CharField(max_length=120, unique=True)
    website_url = models.URLField()
    feed_url = models.URLField(max_length=500, blank=True)
    topic = models.ForeignKey(Topic, on_delete=models.PROTECT, null=True, blank=True)
    is_active = models.BooleanField(default=False)
    terms_url = models.URLField(max_length=500, blank=True)
    usage_notes = models.TextField(blank=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=120, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["feed_url"], condition=~models.Q(feed_url=""), name="unique_source_feed"
            )
        ]

    def clean(self):
        if self.feed_url and self.feed_url not in APPROVED_FEED_URLS:
            raise ValidationError({"feed_url": "Use a reviewed endpoint from news/catalog.py."})
        if self.is_active and (not self.feed_url or not self.topic_id or not self.terms_url):
            raise ValidationError("Active sources require a feed, topic and usage-policy URL.")

    def __str__(self):
        return self.name


class Article(models.Model):
    title = models.CharField(max_length=300)
    slug = models.SlugField(unique=True, default=uuid.uuid4)
    topic = models.ForeignKey(Topic, on_delete=models.PROTECT)
    source = models.ForeignKey(Source, on_delete=models.PROTECT)
    summary = models.TextField(blank=True)
    original_url = models.URLField(max_length=2048, unique=True)
    source_entry_id = models.TextField(blank=True)
    source_entry_hash = models.CharField(max_length=64, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    source_updated_at = models.DateTimeField(null=True, blank=True)
    collected_at = models.DateTimeField(auto_now_add=True)
    is_sample = models.BooleanField(default=False)
    featured = models.BooleanField(default=False)

    class Meta:
        ordering = [models.F("published_at").desc(nulls_last=True), "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "source_entry_hash"],
                condition=~models.Q(source_entry_hash=""),
                name="unique_source_entry",
            )
        ]
        indexes = [
            models.Index(fields=["topic", "-published_at"], name="article_topic_published"),
            GinIndex(article_vector(), name="article_search_document"),
        ]

    def __str__(self):
        return self.title


class Bookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="bookmarks")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "article"], name="unique_user_bookmark")
        ]
        ordering = ["-created_at", "-id"]


class FeedRun(models.Model):
    source = models.ForeignKey(Source, on_delete=models.CASCADE, related_name="feed_runs")
    trigger = models.CharField(
        max_length=12, choices=[("manual", "Manual"), ("scheduled", "Scheduled")]
    )
    attempt = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(
        max_length=12,
        choices=[("running", "Running"), ("success", "Success"), ("failed", "Failed")],
    )
    started_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)
    error = models.CharField(max_length=120, blank=True)
    created = models.PositiveIntegerField(default=0)
    updated = models.PositiveIntegerField(default=0)
    unchanged = models.PositiveIntegerField(default=0)
    skipped = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-started_at", "-id"]
        indexes = [models.Index(fields=["source", "-started_at"], name="feed_run_source_started")]


class Repository(models.Model):
    article = models.OneToOneField(Article, on_delete=models.CASCADE, related_name="repository")
    github_id = models.PositiveBigIntegerField(unique=True)
    full_name = models.CharField(max_length=240)
    stars = models.PositiveIntegerField()
    license = models.CharField(max_length=100)
    observed_at = models.DateTimeField()
    pushed_at = models.DateTimeField(null=True, blank=True)
    baseline_at = models.DateTimeField(null=True, blank=True)
    star_change = models.IntegerField(null=True, blank=True)


class StarObservation(models.Model):
    repository = models.ForeignKey(
        Repository, on_delete=models.CASCADE, related_name="observations"
    )
    hour = models.DateTimeField()
    observed_at = models.DateTimeField()
    stars = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["repository", "hour"], name="unique_repo_hour")
        ]
        indexes = [models.Index(fields=["repository", "observed_at"], name="repo_observed_at")]
