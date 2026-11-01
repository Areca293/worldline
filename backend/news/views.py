from django.db import DatabaseError, connection
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.api import DatabaseErrorMixin

from .models import Article, Bookmark, Source, Topic
from .pagination import ReadingPagination
from .queries import articles_for, discover_articles, saved_articles
from .serializers import ArticleSerializer, SourceStatusSerializer, TopicSerializer


@api_view(["GET"])
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return Response({"status": "unavailable", "database": "unavailable"}, status=503)
    return Response({"status": "ok", "database": "connected", "stage": "M3"})


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
        articles, self.approximate_search = discover_articles(
            self.request.user, self.request.query_params
        )
        return articles


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
        articles, self.approximate_search = saved_articles(
            self.request.user, self.request.query_params.get("q", "")
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
