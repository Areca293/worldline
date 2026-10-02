from rest_framework import serializers

from .models import Article, Source, Topic


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ["name", "slug"]


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = ["name", "website_url"]


class ArticleSerializer(serializers.ModelSerializer):
    topic = TopicSerializer(read_only=True)
    source = SourceSerializer(read_only=True)

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
            "collected_at",
            "is_sample",
            "featured",
        ]
