"""The shared error boundary must stay active on each business API surface."""

from unittest.mock import patch

import pytest
from django.db import OperationalError
from redis.exceptions import ConnectionError as RedisConnectionError
from rest_framework.test import APIClient


@pytest.mark.parametrize("failure", [OperationalError, RedisConnectionError])
@pytest.mark.parametrize(
    "url, dependency",
    [
        ("/api/articles/", "news.views.discover_articles"),
        ("/api/auth/session/", "news.auth.session_data"),
        ("/api/ai/status/", "assistance.services.capabilities"),
    ],
)
def test_database_and_cache_failures_remain_safe_across_apis(url, dependency, failure):
    with patch(dependency, side_effect=failure("private infrastructure diagnostic")) as called:
        response = APIClient().get(url)
    called.assert_called_once()
    assert response.status_code == 503
    assert response.json() == {
        "detail": "Content is temporarily unavailable. Please try again later."
    }
