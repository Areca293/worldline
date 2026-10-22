from datetime import timedelta

from django.db import DatabaseError, connection
from django.db.models import BooleanField, Exists, F, OuterRef, Value, Window
from django.db.models.functions import RowNumber
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from redis.exceptions import RedisError
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article, Bookmark, Source, Topic
from .pagination import ReadingPagination
from .search import search_articles
from .serializers import ArticleSerializer, SourceStatusSerializer, TopicSerializer


@api_view(["GET"])
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return Response({"status": "unavailable", "database": "unavailable"}, status=503)
    return Response({"status": "ok", "database": "connected", "stage": "M2"})


class DatabaseErrorMixin:
    def handle_exception(self, exc):
        if isinstance(exc, (DatabaseError, RedisError)):
            return Response(
                {"detail": "Content is temporarily unavailable. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().handle_exception(exc)


def articles_for(user):
    saved = (
        Exists(Bookmark.objects.filter(user=user, article=OuterRef("pk")))
        if user.is_authenticated
        else Value(False, output_field=BooleanField())
    )
    return Article.objects.select_related("topic", "source", "repository").annotate(
        is_bookmarked=saved
    )


class TopicList(DatabaseErrorMixin, generics.ListAPIView):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    pagination_class = None


@method_decorator(never_cache, name="dispatch")
class SourceStatusList(DatabaseErrorMixin, generics.ListAPIView):
    queryset = Source.objects.filter(is_active=True).order_by("pk")
    serializer_class = SourceStatusSerializer
    pagination_class = None


@method_decorator(never_cache, name="dispatch")
class ArticleList(DatabaseErrorMixin, generics.ListAPIView):
    pagination_class = ReadingPagination
    serializer_class = ArticleSerializer

    def get_queryset(self):
        articles = articles_for(self.request.user).filter(
            is_sample=self.request.query_params.get("samples") == "1"
        )
        topic = self.request.query_params.get("topic")
        if topic:
            articles = articles.filter(topic__slug=topic)
        query = self.request.query_params.get("q", "").strip()
        sort = self.request.query_params.get("sort", "")
        if sort not in {"", "stars", "growth"}:
            raise ValidationError({"sort": "Choose stars or growth, or leave sort empty."})
        if sort:
            articles = articles.filter(repository__isnull=False)
            if sort == "growth":
                articles = articles.filter(
                    repository__observed_at__gte=timezone.now() - timedelta(hours=2),
                    repository__star_change__isnull=False,
                )
                articles, self.approximate_search = search_articles(articles, query)
                return articles.order_by("-repository__star_change", "-repository__stars", "id")
            articles, self.approximate_search = search_articles(articles, query)
            return articles.order_by("-repository__stars", "id")
        articles, self.approximate_search = search_articles(articles, query)
        if query:
            return articles
        if topic:
            return articles
        # Round-robin across topics, newest published story within each topic first.
        # No click tracking or collection timestamp masquerading as publication time.
        return articles.annotate(
            topic_rank=Window(
                expression=RowNumber(),
                partition_by=[F("topic_id")],
                order_by=[F("published_at").desc(nulls_last=True), F("id").desc()],
            )
        ).order_by("topic_rank", F("published_at").desc(nulls_last=True), "-id")


@method_decorator(never_cache, name="dispatch")
class ArticleDetail(DatabaseErrorMixin, generics.RetrieveAPIView):
    serializer_class = ArticleSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return articles_for(self.request.user)


@method_decorator(never_cache, name="dispatch")
class BookmarkList(DatabaseErrorMixin, generics.ListAPIView):
    pagination_class = ReadingPagination
    permission_classes = [IsAuthenticated]
    serializer_class = ArticleSerializer

    def get_queryset(self):
        articles = (
            articles_for(self.request.user)
            .filter(bookmarks__user=self.request.user)
            .order_by("-bookmarks__created_at", "-bookmarks__id")
        )
        articles, self.approximate_search = search_articles(
            articles, self.request.query_params.get("q", "")
        )
        return articles


@method_decorator(never_cache, name="dispatch")
class BookmarkDetail(DatabaseErrorMixin, APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, slug):
        article = get_object_or_404(Article, slug=slug)
        Bookmark.objects.get_or_create(user=request.user, article=article)
        return Response({"is_bookmarked": True})

    def delete(self, request, slug):
        article = get_object_or_404(Article, slug=slug)
        Bookmark.objects.filter(user=request.user, article=article).delete()
        return Response({"is_bookmarked": False})
