from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Article, Repository, Source, Topic


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ["name", "slug"]


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = ["name", "website_url"]


class SourceStatusSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    def get_status(self, source):
        if source.last_error:
            return "failed"
        if source.last_success_at is None:
            return "pending"
        if source.last_success_at < timezone.now() - timedelta(hours=2):
            return "stale"
        return "ok"

    class Meta:
        model = Source
        fields = ["id", "name", "website_url", "last_attempt_at", "last_success_at", "status"]


class RepositorySerializer(serializers.ModelSerializer):
    is_stale = serializers.SerializerMethodField()

    def get_is_stale(self, repo):
        return repo.observed_at < timezone.now() - timedelta(hours=2)

    class Meta:
        model = Repository
        fields = [
            "full_name",
            "stars",
            "license",
            "observed_at",
            "pushed_at",
            "baseline_at",
            "star_change",
            "is_stale",
        ]


class ArticleSerializer(serializers.ModelSerializer):
    repository = RepositorySerializer(read_only=True)

    topic = TopicSerializer(read_only=True)
    source = SourceSerializer(read_only=True)
    is_bookmarked = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = Article
        fields = [
            "id",
            "slug",
            "title",
            "topic",
            "source",
            "summary",
            "original_url",
            "published_at",
            "source_updated_at",
            "collected_at",
            "is_sample",
            "featured",
            "is_bookmarked",
            "repository",
        ]
