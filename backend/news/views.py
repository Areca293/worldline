from django.db import DatabaseError, connection
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Article, Topic
from .serializers import ArticleSerializer, TopicSerializer


@api_view(["GET"])
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return Response({"status": "unavailable", "database": "unavailable"}, status=503)
    return Response({"status": "ok", "database": "connected", "stage": "M0"})


class DatabaseErrorMixin:
    def handle_exception(self, exc):
        if isinstance(exc, DatabaseError):
            return Response(
                {"detail": "Content is temporarily unavailable. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().handle_exception(exc)


class TopicList(DatabaseErrorMixin, generics.ListAPIView):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    pagination_class = None


class ArticleList(DatabaseErrorMixin, generics.ListAPIView):
    serializer_class = ArticleSerializer

    def get_queryset(self):
        articles = Article.objects.select_related("topic", "source")
        topic = self.request.query_params.get("topic")
        return articles.filter(topic__slug=topic) if topic else articles.all()


class ArticleDetail(DatabaseErrorMixin, generics.RetrieveAPIView):
    queryset = Article.objects.select_related("topic", "source")
    serializer_class = ArticleSerializer
    lookup_field = "slug"
