"""Shared API infrastructure, independent of news and assistance business modules."""

from django.db import DatabaseError
from redis.exceptions import RedisError
from rest_framework import status
from rest_framework.response import Response


class DatabaseErrorMixin:
    def handle_exception(self, exc):
        if isinstance(exc, (DatabaseError, RedisError)):
            return Response(
                {"detail": "Content is temporarily unavailable. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().handle_exception(exc)
