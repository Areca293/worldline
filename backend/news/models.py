import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from .catalog import APPROVED_FEED_URLS


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
        indexes = [models.Index(fields=["topic", "-published_at"], name="article_topic_published")]

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
