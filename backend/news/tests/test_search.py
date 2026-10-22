from datetime import timedelta
from unittest.mock import patch

import pytest
from django.db import DatabaseError
from django.utils import timezone
from rest_framework.test import APIClient

from news.models import Article, Bookmark, Source, Topic


@pytest.fixture
def articles(db):
    topic = Topic.objects.create(name="Technology", slug="technology")
    other = Topic.objects.create(name="Music", slug="music")
    source = Source.objects.create(
        name="Search publisher", website_url="https://example.com", is_active=True
    )
    return [
        Article.objects.create(
            title=title,
            summary=summary,
            topic=category,
            source=source,
            original_url=f"https://example.com/{i}",
            published_at=timezone.now() - timedelta(days=i),
        )
        for i, (title, summary, category) in enumerate(
            [
                ("Space exploration", "A short excerpt.", topic),
                ("New research", "Scientists explore space.", topic),
                ("Music in space", "An exploration of music.", other),
                ("Unrelated", "No matching words.", topic),
            ]
        )
    ]


def test_search_title_summary_stemming_ranking_topic_and_pagination(articles):
    client = APIClient()
    result = client.get("/api/articles/", {"q": "exploring space", "page_size": 1}).json()
    assert result["count"] == 3 and result["total_pages"] == 3
    assert result["results"][0]["id"] == articles[0].pk
    page2 = client.get("/api/articles/", {"q": "exploring space", "page_size": 1, "page": 2}).json()
    assert page2["results"][0]["id"] != articles[0].pk
    music = client.get(
        "/api/articles/", {"q": "space", "topic": "music", "page_size": "all"}
    ).json()
    assert [row["id"] for row in music["results"]] == [articles[2].pk]
    Article.objects.filter(pk=articles[2].pk).update(is_sample=True)
    assert client.get("/api/articles/?q=space").json()["count"] == 2
    assert client.get("/api/articles/?q=the").json()["count"] == 0
    assert client.get("/api/articles/?q=nonexistent").json()["count"] == 0
    assert client.get("/api/articles/?q=%20%20").json()["count"] == 3
    assert client.get("/api/articles/", {"q": "x" * 201}).status_code == 400
    assert client.get("/api/articles/", {"q": "\x00"}).status_code == 400
    # Functional index reflects edits without a separate search-indexing job.
    Article.objects.filter(pk=articles[0].pk).update(title="Changed", summary="Different")
    assert client.get("/api/articles/?q=space").json()["count"] == 1


def test_saved_search_is_private(articles, django_user_model):
    alice = django_user_model.objects.create_user(username="alice")
    bob = django_user_model.objects.create_user(username="bob")
    Bookmark.objects.create(user=alice, article=articles[0])
    Bookmark.objects.create(user=bob, article=articles[1])
    client = APIClient()
    assert client.get("/api/bookmarks/?q=space").status_code == 403
    client.force_authenticate(alice)
    result = client.get(
        "/api/bookmarks/", {"q": "space", "user": bob.pk, "page_size": "all"}
    ).json()
    assert [row["id"] for row in result["results"]] == [articles[0].pk]


def test_source_status_does_not_invent_success_or_leak_error_details(articles):
    source = articles[0].source
    client = APIClient()
    assert client.get("/api/sources/").json()[0]["status"] == "pending"
    old = timezone.now() - timedelta(days=1)
    Source.objects.filter(pk=source.pk).update(last_success_at=old)
    assert client.get("/api/sources/").json()[0]["status"] == "stale"
    Source.objects.filter(pk=source.pk).update(last_error="private diagnostics")
    response = client.get("/api/sources/")
    assert response.json()[0]["status"] == "failed"
    assert "private" not in response.content.decode()
    assert response.json()[0]["last_success_at"] is not None
    with patch("news.views.SourceStatusList.get_queryset", side_effect=DatabaseError()):
        assert client.get("/api/sources/").status_code == 503
    assert client.get("/api/articles/").json()["count"] == 4


def test_typo_fallback_is_ranked_scoped_and_keeps_exact_results(articles, django_user_model):
    story = articles[0]
    story.title = "ChatGPT releases new tools"
    story.save()
    articles[1].summary = "ChatGPT research updates"
    articles[1].save()
    client = APIClient()
    typo = client.get("/api/articles/", {"q": "chatgpd", "page_size": 1}).json()
    assert typo["approximate_search"] is True
    assert typo["count"] == 2 and typo["total_pages"] == 2
    assert client.get("/api/articles/", {"q": "chatgpd", "topic": "music"}).json()["count"] == 0
    assert client.get("/api/articles/", {"q": "chatgpd releases"}).json()["count"] == 1
    assert client.get("/api/articles/", {"q": "chatgpd nonexistent"}).json()["count"] == 0
    assert client.get("/api/articles/", {"q": "xyz"}).json()["count"] == 0
    exact = client.get("/api/articles/", {"q": "ChatGPT"}).json()
    assert exact["count"] == 2 and exact["approximate_search"] is False
    alice = django_user_model.objects.create_user(username="typo-alice")
    bob = django_user_model.objects.create_user(username="typo-bob")
    Bookmark.objects.create(user=alice, article=story)
    Bookmark.objects.create(user=bob, article=articles[1])
    client.force_authenticate(alice)
    saved = client.get("/api/bookmarks/", {"q": "chatgpd"}).json()
    assert saved["approximate_search"] is True
    assert [a["id"] for a in saved["results"]] == [story.pk]
