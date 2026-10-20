from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .views import DatabaseErrorMixin


def session_data(request):
    user = request.user
    return {
        "user": {"id": user.pk, "username": user.username} if user.is_authenticated else None,
        "csrfToken": get_token(request),
    }


class Credentials(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=1024, trim_whitespace=False, write_only=True)


@method_decorator(never_cache, name="dispatch")
class SessionView(DatabaseErrorMixin, APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(session_data(request))


@method_decorator(never_cache, name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class LoginView(DatabaseErrorMixin, APIView):
    # Anonymous login still needs CSRF; DRF SessionAuthentication alone does not enforce it.
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        credentials = Credentials(data=request.data)
        credentials.is_valid(raise_exception=True)
        user = authenticate(request=request._request, **credentials.validated_data)
        if user is None:
            return Response({"detail": "Invalid username or password."}, status=400)
        login(request._request, user)
        return Response(session_data(request._request))


@method_decorator(never_cache, name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class LogoutView(DatabaseErrorMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request._request)
        return Response(session_data(request._request))
