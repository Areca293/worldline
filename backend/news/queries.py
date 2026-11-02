"""Reader-scoped article selection, discovery ordering and bookmark search."""

from datetime import timedelta

from django.db.models import BooleanField, Exists, F, OuterRef, Value, Window
from django.db.models.functions import RowNumber
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Article, Bookmark
from .search import search_articles


def articles_for(user):
    saved = (
        Exists(Bookmark.objects.filter(user=user, article=OuterRef("pk")))
        if user.is_authenticated
        else Value(False, output_field=BooleanField())
    )
    return Article.objects.select_related("topic", "source", "repository").annotate(
        is_bookmarked=saved
    )


def discover_articles(user, params):
    articles = articles_for(user).filter(is_sample=params.get("samples") == "1")
    topic = params.get("topic")
    if topic:
        articles = articles.filter(topic__slug=topic)
    query = params.get("q", "").strip()
    sort = params.get("sort", "")
    if sort not in {"", "stars", "growth"}:
        raise ValidationError({"sort": "Choose stars or growth, or leave sort empty."})
    if sort:
        articles = articles.filter(repository__isnull=False)
        if sort == "growth":
            articles = articles.filter(
                repository__observed_at__gte=timezone.now() - timedelta(hours=2),
                repository__star_change__isnull=False,
            )
            articles, approximate_search = search_articles(articles, query)
            return articles.order_by(
                "-repository__star_change", "-repository__stars", "id"
            ), approximate_search
        articles, approximate_search = search_articles(articles, query)
        return articles.order_by("-repository__stars", "id"), approximate_search
    articles, approximate_search = search_articles(articles, query)
    if query:
        return articles, approximate_search
    if topic:
        return articles, approximate_search
    # Round-robin across topics, newest published story within each topic first.
    # No click tracking or collection timestamp masquerading as publication time.
    articles = articles.annotate(
        topic_rank=Window(
            expression=RowNumber(),
            partition_by=[F("topic_id")],
            order_by=[F("published_at").desc(nulls_last=True), F("id").desc()],
        )
    ).order_by("topic_rank", F("published_at").desc(nulls_last=True), "-id")
    return articles, approximate_search


def saved_articles(user, query):
    articles = (
        articles_for(user)
        .filter(bookmarks__user=user)
        .order_by("-bookmarks__created_at", "-bookmarks__id")
    )
    articles, approximate_search = search_articles(articles, query)
    return articles, approximate_search
