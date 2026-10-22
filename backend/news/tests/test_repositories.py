import json
from datetime import timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from news.catalog import GITHUB_COLLECTIONS
from news.feeds import FeedError, import_feed
from news.models import Article, Repository, Source, StarObservation, Topic
from news.repositories import collection_url


def payload(stars=100, name="test/agent-skills", **extra):
    item = dict(
        id=123,
        full_name=name,
        html_url=f"https://github.com/{name}",
        stargazers_count=stars,
        license={"spdx_id": "MIT"},
        private=False,
        archived=False,
        fork=False,
        description="Agent tools",
        topics=["agent-skills"],
        created_at="2025-01-01T00:00:00Z",
        pushed_at="2026-10-22T09:00:00Z",
    )
    item.update(extra)
    return json.dumps({"incomplete_results": False, "items": [item]}).encode()


@pytest.fixture
def source(db):
    return Source.objects.create(
        name="GitHub Skills fixture",
        topic=Topic.objects.create(name="Agents & Skills", slug="agents-skills"),
        website_url="https://github.com/",
        feed_url=next(iter(GITHUB_COLLECTIONS)),
        is_active=True,
    )


def test_observed_growth_requires_history_and_preserves_identity(source, django_user_model):
    now = timezone.now()
    with patch("news.repositories.timezone.now", return_value=now):
        assert import_feed(source, payload()).created == 1
        assert import_feed(source, payload()).unchanged == 1
    article = Article.objects.get()
    user = django_user_model.objects.create_user(username="collector")
    article.bookmarks.create(user=user)
    slug = article.slug
    assert Repository.objects.get().star_change is None
    assert StarObservation.objects.count() == 1
    with patch("news.repositories.timezone.now", return_value=now + timedelta(hours=24, minutes=5)):
        assert import_feed(source, payload(stars=130, name="test/renamed")).updated == 1
    repo = Repository.objects.get()
    assert repo.star_change == 30 and repo.baseline_at == now
    assert repo.article.slug == slug and repo.article.bookmarks.count() == 1
    assert repo.article.published_at.year == 2025
    with patch("news.repositories.timezone.now", return_value=now + timedelta(hours=25)):
        import_feed(source, payload(stars=90, name="test/renamed"))
    assert Repository.objects.get().star_change == -10
    with patch("news.repositories.timezone.now", return_value=now + timedelta(days=4)):
        import_feed(source, payload(stars=150, name="test/renamed"))
    assert Repository.objects.get().star_change is None


@pytest.mark.parametrize(
    "extra",
    [
        {"html_url": "https://evil.example/code"},
        {"private": True},
        {"fork": True},
        {"archived": True},
        {"license": None},
        {"license": {"spdx_id": "NOASSERTION"}},
        {"stargazers_count": True},
        {"stargazers_count": -1},
        {"id": "123"},
    ],
)
def test_repository_validation_skips_unsafe_or_unlicensed_records(source, extra):
    assert import_feed(source, payload(**extra)).skipped == 1
    assert not Article.objects.exists()


def test_incomplete_or_invalid_responses_do_not_erase_old_data(source):
    import_feed(source, payload())
    for data in [b"bad", b"[]", b'{"incomplete_results":true,"items":[]}', b'{"items":[]}']:
        with pytest.raises(FeedError):
            import_feed(source, data)
    assert Repository.objects.get().stars == 100
    assert import_feed(source, b'{"incomplete_results":false,"items":[]}').created == 0
    assert Article.objects.count() == 1


def test_collection_request_is_fixed_host_and_controlled_date():
    now = timezone.now()
    with patch("news.repositories.timezone.now", return_value=now):
        url = collection_url(next(iter(GITHUB_COLLECTIONS)))
    assert urlsplit(url).netloc == "api.github.com"
    query = parse_qs(urlsplit(url).query)
    assert query["per_page"] == ["30"]
    assert f"pushed:>={(now - timedelta(days=30)).date()}" in query["q"][0]
    with pytest.raises(KeyError):
        collection_url("https://attacker.example/")


def test_repository_sort_search_and_stale_growth(source):
    import_feed(source, payload())
    client = APIClient()
    assert client.get("/api/articles/?sort=stars").json()["count"] == 1
    assert client.get("/api/articles/?sort=growth").json()["count"] == 0
    repo = Repository.objects.get()
    repo.star_change = 30
    repo.baseline_at = repo.observed_at - timedelta(hours=24)
    repo.save()
    response = client.get("/api/articles/?sort=growth&q=skills&topic=agents-skills").json()
    assert response["count"] == 1 and response["results"][0]["repository"]["star_change"] == 30
    assert client.get("/api/articles/?sort=growth&topic=music").json()["count"] == 0
    assert client.get("/api/articles/?q=GitHub").json()["count"] == 1
    repo.observed_at = timezone.now() - timedelta(hours=3)
    repo.save()
    assert client.get("/api/articles/?sort=growth").json()["count"] == 0
    assert client.get("/api/articles/?sort=stars").json()["results"][0]["repository"]["is_stale"]
    assert client.get("/api/articles/?sort=unsafe").status_code == 400


def test_ranked_results_use_numbers_and_do_not_mix_with_rss(source):
    import_feed(source, payload(stars=10))
    import_feed(source, payload(stars=200, name="test/second", id=456))
    Article.objects.create(
        source=source,
        topic=source.topic,
        title="An RSS story",
        original_url="https://example.com/story",
    )
    client = APIClient()
    results = client.get("/api/articles/?sort=stars").json()["results"]
    assert [item["repository"]["stars"] for item in results] == [200, 10]
    for repo, change in zip(Repository.objects.order_by("stars"), [80, 4]):
        repo.star_change = change
        repo.baseline_at = repo.observed_at - timedelta(hours=24)
        repo.save()
    results = client.get("/api/articles/?sort=growth").json()["results"]
    assert [item["repository"]["star_change"] for item in results] == [80, 4]


def test_github_download_uses_fixed_host_accept_and_does_not_follow_redirects():
    from news.feeds import fetch_feed

    with (
        patch("news.feeds.socket.getaddrinfo", return_value=[(0, 0, 0, "", ("8.8.8.8", 443))]),
        patch("news.feeds.urllib3.HTTPSConnectionPool") as pool,
    ):
        request = pool.return_value.__enter__.return_value.urlopen
        response = request.return_value
        response.status, response.headers = 200, {}
        response.stream.return_value = [b'{"items":[],"incomplete_results":false}']
        fetch_feed(next(iter(GITHUB_COLLECTIONS)))
        assert pool.call_args.kwargs["server_hostname"] == "api.github.com"
        assert request.call_args.kwargs["headers"]["Accept"] == "application/vnd.github+json"
        assert request.call_args.kwargs["redirect"] is False
        assert "pushed" in request.call_args.args[1]
