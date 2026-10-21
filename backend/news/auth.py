from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
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


class Registration(serializers.ModelSerializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=1024, trim_whitespace=False, write_only=True)
    password_confirm = serializers.CharField(
        max_length=1024, trim_whitespace=False, write_only=True
    )

    class Meta:
        model = get_user_model()
        fields = ["username", "email", "password", "password_confirm"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        user = get_user_model()(username=attrs["username"], email=attrs["email"])
        try:
            validate_password(attrs["password"], user)
        except ValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        return attrs


@method_decorator(never_cache, name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class RegisterView(DatabaseErrorMixin, APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        if request.user.is_authenticated:
            return Response({"detail": "Sign out before creating another account."}, status=400)
        registration = Registration(data=request.data)
        registration.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                user = get_user_model().objects.create_user(**registration.validated_data)
        except IntegrityError:
            # The username constraint also protects simultaneous registrations.
            return Response({"username": ["This username is already taken."]}, status=400)
        login(request._request, user)
        return Response(session_data(request._request), status=201)
