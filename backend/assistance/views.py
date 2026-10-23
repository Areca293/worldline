from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from news.models import Article
from news.views import DatabaseErrorMixin

from . import services
from .providers import AssistanceError
from .quotes import quotation_for


class AssistanceThrottle(UserRateThrottle):
    rate = "10/min"
    scope = "assistance"


class SearchInput(serializers.Serializer):
    query = serializers.CharField(min_length=3, max_length=300)
    window = serializers.ChoiceField(choices=["any", "day", "week", "month"], default="week")


class ReadingInput(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["summarize", "translate", "explain"])


@method_decorator(never_cache, name="dispatch")
class AssistanceView(DatabaseErrorMixin, APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AssistanceThrottle]

    def handle_exception(self, exc):
        if isinstance(exc, AssistanceError):
            return Response({"code": exc.code, "detail": exc.message}, status=exc.status)
        return super().handle_exception(exc)


class StatusView(AssistanceView):
    permission_classes = []
    throttle_classes = []

    def get(self, request):
        return Response(
            {
                **services.capabilities(),
                "allowance": services.allowance(request.user)
                if request.user.is_authenticated
                else None,
            }
        )


class ResearchView(AssistanceView):
    def post(self, request):
        data = SearchInput(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(services.research(request.user, **data.validated_data))


class ReadingView(AssistanceView):
    def post(self, request, slug):
        data = ReadingInput(data=request.data)
        data.is_valid(raise_exception=True)
        article = get_object_or_404(
            Article.objects.select_related("source", "repository"), slug=slug
        )
        return Response(services.reading_help(request.user, article, data.validated_data["mode"]))


@method_decorator(never_cache, name="dispatch")
class DailyQuoteView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response(quotation_for(timezone.now().date()))
