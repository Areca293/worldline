import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from news.models import Article, Bookmark, Source, Topic


@pytest.fixture
def readers(db, django_user_model):
    cache.clear()
    a = django_user_model.objects.create_user(username="alice", password="test-only-password")
    b = django_user_model.objects.create_user(username="bob", password="test-only-password")
    topic = Topic.objects.create(name="Music", slug="music")
    source = Source.objects.create(name="Publisher", website_url="https://example.com")
    article = Article.objects.create(
        title="Music story", original_url="https://example.com/story", source=source, topic=topic
    )
    return a, b, article


def csrf(client):
    return client.get("/api/auth/session/").json()["csrfToken"]


def sign_in(client, username):
    response = client.post(
        "/api/auth/login/",
        {"username": username, "password": "test-only-password"},
        format="json",
        HTTP_X_CSRFTOKEN=csrf(client),
    )
    assert response.status_code == 200
    return response.json()["csrfToken"]


def test_login_requires_csrf_and_session_cookie_is_http_only(readers):
    client = APIClient(enforce_csrf_checks=True)
    assert (
        client.post(
            "/api/auth/login/", {"username": "alice", "password": "test-only-password"}
        ).status_code
        == 403
    )
    token = csrf(client)
    assert (
        client.post(
            "/api/auth/login/",
            {"username": "alice", "password": "test-only-password"},
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="https://evil.example",
        ).status_code
        == 403
    )
    new_token = sign_in(client, "alice")
    assert new_token != token
    assert client.cookies["sessionid"]["httponly"]
    assert client.get("/api/auth/session/").json()["user"]["username"] == "alice"
    assert client.get("/api/auth/logout/").status_code == 405
    assert client.post("/api/auth/logout/").status_code == 403
    assert client.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=csrf(client)).status_code == 200
    assert client.get("/api/auth/session/").json()["user"] is None


def test_bookmarks_persist_and_other_users_cannot_read_or_delete_them(readers):
    alice, bob, article = readers
    a, b = APIClient(enforce_csrf_checks=True), APIClient(enforce_csrf_checks=True)
    endpoint = f"/api/articles/{article.slug}/bookmark/"
    assert a.get("/api/bookmarks/").status_code == 403
    assert a.put(endpoint).status_code == 403
    sign_in(a, "alice")
    assert a.put(endpoint).status_code == 403
    for _ in range(2):
        assert (
            a.put(endpoint, {"user": bob.pk}, format="json", HTTP_X_CSRFTOKEN=csrf(a)).status_code
            == 200
        )
    assert Bookmark.objects.filter(user=alice).count() == 1
    # A new browser client using the persisted session sees the same bookmark.
    refreshed = APIClient(enforce_csrf_checks=True)
    refreshed.cookies = a.cookies
    saved = refreshed.get("/api/bookmarks/")
    assert saved.json()["count"] == 1
    assert saved.json()["results"][0]["is_bookmarked"] is True
    assert "no-store" in saved["Cache-Control"]
    sign_in(b, "bob")
    assert b.get(f"/api/bookmarks/?user={alice.pk}").json()["count"] == 0
    assert b.get(f"/api/articles/{article.slug}/").json()["is_bookmarked"] is False
    assert b.delete(endpoint, HTTP_X_CSRFTOKEN=csrf(b)).status_code == 200
    assert Bookmark.objects.filter(user=alice).count() == 1
    assert b.put(endpoint, HTTP_X_CSRFTOKEN=csrf(b)).status_code == 200
    for _ in range(2):
        assert a.delete(endpoint, HTTP_X_CSRFTOKEN=csrf(a)).status_code == 200
    assert Bookmark.objects.filter(user=bob).count() == 1
    assert a.get("/api/bookmarks/").json()["count"] == 0


def test_invalid_and_inactive_login_do_not_create_a_session(readers):
    alice, _, _ = readers
    client = APIClient(enforce_csrf_checks=True)
    data = {"username": "alice", "password": "wrong"}
    assert client.post("/api/auth/login/", data, HTTP_X_CSRFTOKEN=csrf(client)).status_code == 400
    alice.is_active = False
    alice.save()
    data["password"] = "test-only-password"
    assert client.post("/api/auth/login/", data, HTTP_X_CSRFTOKEN=csrf(client)).status_code == 400
    assert client.get("/api/auth/session/").json()["user"] is None


def test_login_is_throttled(readers):
    client = APIClient(enforce_csrf_checks=True)
    token = csrf(client)
    for _ in range(10):
        assert (
            client.post(
                "/api/auth/login/",
                {"username": "no-one", "password": "wrong"},
                HTTP_X_CSRFTOKEN=token,
            ).status_code
            == 400
        )
    assert (
        client.post(
            "/api/auth/login/", {"username": "no-one", "password": "wrong"}, HTTP_X_CSRFTOKEN=token
        ).status_code
        == 429
    )


def test_normal_feed_hides_samples_and_balances_topics(readers):
    _, _, article = readers
    Article.objects.create(
        title="Sample",
        slug="demo",
        original_url="https://example.com/demo",
        topic=article.topic,
        source=article.source,
        is_sample=True,
    )
    for n in range(5):
        Article.objects.create(
            title=f"Music {n}",
            original_url=f"https://example.com/{n}",
            topic=article.topic,
            source=article.source,
        )
    other = Topic.objects.create(name="Technology", slug="technology")
    Article.objects.create(
        title="Tech", original_url="https://example.com/tech", topic=other, source=article.source
    )
    client = APIClient()
    data = client.get("/api/articles/").json()
    assert data["count"] == 7
    assert len({row["topic"]["slug"] for row in data["results"][:2]}) == 2
    assert not any(row["is_sample"] for row in data["results"])
    assert client.get("/api/articles/?topic=technology").json()["count"] == 1
