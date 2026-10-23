from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.db import OperationalError
from rest_framework.test import APIClient

from news.models import Article


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
def test_seed_repeat_and_filter_preserve_sample_provenance(client):
    call_command("seed_demo")
    call_command("seed_demo")
    assert Article.objects.count() == 4
    response = client.get("/api/articles/?topic=music&samples=1")
    assert response.status_code == 200
    assert response.data["count"] == 1
    article = response.data["results"][0]
    assert article["is_sample"] is True
    assert article["published_at"] is None
    assert article["source"]["name"] == "Worldline demo"
    assert client.get(f"/api/articles/{article['slug']}/").status_code == 200
    assert client.get("/api/articles/does-not-exist/").status_code == 404
    assert client.post("/api/articles/", {}).status_code == 405


@pytest.mark.django_db
def test_empty_list_and_database_health(client):
    assert client.get("/api/articles/").data["results"] == []
    assert client.get("/api/health/").data == {
        "status": "ok",
        "database": "connected",
        "stage": "M3",
    }


def test_health_failure_returns_503_without_database_details(client):
    with patch("news.views.connection.cursor", side_effect=OperationalError("secret-host")):
        response = client.get("/api/health/")
    assert response.status_code == 503
    assert "secret-host" not in str(response.data)


def test_article_failure_returns_safe_english_error(client):
    with patch("news.views.ArticleList.get_queryset", side_effect=OperationalError("secret-host")):
        response = client.get("/api/articles/")
    assert response.status_code == 503
    assert response.data == {
        "detail": "Content is temporarily unavailable. Please try again later."
    }
