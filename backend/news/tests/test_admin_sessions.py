import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from news.models import Article, Bookmark, Source, Topic
from news.tests.test_accounts import sign_in


def admin_sign_in(client):
    assert client.get("/admin/login/").status_code == 200
    token = client.cookies["worldline_admin_csrf"].value
    response = client.post(
        "/admin/login/",
        {"username": "admin", "password": "test-only-password", "csrfmiddlewaretoken": token},
    )
    assert response.status_code == 302
    assert "sessionid" not in response.cookies
    assert "csrftoken" not in response.cookies
    return client.cookies["worldline_admin_csrf"].value


@pytest.mark.parametrize("admin_first", [False, True])
@pytest.mark.django_db
def test_admin_and_reader_login_logout_and_csrf_are_independent(django_user_model, admin_first):
    cache.clear()
    alice = django_user_model.objects.create_user(username="alice", password="test-only-password")
    article = Article.objects.create(
        title="Session isolation fixture",
        original_url="https://example.com/session-test",
        source=Source.objects.create(name="Test publisher", website_url="https://example.com"),
        topic=Topic.objects.create(name="Technology", slug="technology"),
    )
    django_user_model.objects.create_superuser(username="admin", password="test-only-password")
    client = APIClient(enforce_csrf_checks=True)
    if admin_first:
        admin_token = admin_sign_in(client)
        assert client.get("/api/auth/session/").json()["user"] is None
        reader_token = sign_in(client, "alice")
    else:
        reader_token = sign_in(client, "alice")
        reader_session = client.cookies["sessionid"].value
        admin_token = admin_sign_in(client)
        assert client.cookies["sessionid"].value == reader_session

    assert client.get("/api/auth/session/").json()["user"]["id"] == alice.pk
    assert client.get("/admin/").status_code == 200
    endpoint = f"/api/articles/{article.slug}/bookmark/"
    # Tokens from the other surface must not authorize writes.
    assert client.put(endpoint, HTTP_X_CSRFTOKEN=admin_token).status_code == 403
    assert client.post("/admin/logout/", HTTP_X_CSRFTOKEN=reader_token).status_code == 403
    assert client.put(endpoint, HTTP_X_CSRFTOKEN=reader_token).status_code == 200
    assert Bookmark.objects.get(article=article).user_id == alice.pk

    if admin_first:
        assert client.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=reader_token).status_code == 200
        assert client.get("/admin/").status_code == 200
        assert client.get("/api/auth/session/").json()["user"] is None
        assert client.post("/admin/logout/", HTTP_X_CSRFTOKEN=admin_token).status_code == 200
    else:
        response = client.post("/admin/logout/", HTTP_X_CSRFTOKEN=admin_token)
        assert response.status_code == 200
        assert response.cookies["worldline_admin_session"]["max-age"] == 0
        assert response.cookies["worldline_admin_session"]["path"] == "/admin/"
        assert "sessionid" not in response.cookies
        assert client.get("/api/auth/session/").json()["user"]["id"] == alice.pk
        assert client.delete(endpoint, HTTP_X_CSRFTOKEN=reader_token).status_code == 200
    assert client.get("/admin/").status_code == 302


@pytest.mark.django_db
def test_admin_does_not_inherit_reader_staff_login_and_preserves_cookie_flags(
    django_user_model, settings
):
    cache.clear()
    settings.SESSION_COOKIE_SECURE = True
    settings.CSRF_COOKIE_SECURE = True
    django_user_model.objects.create_superuser(username="admin", password="test-only-password")
    client = APIClient(enforce_csrf_checks=True)
    sign_in(client, "admin")
    assert client.get("/admin/").status_code == 302
    admin_sign_in(client)
    for name in ("worldline_admin_session", "worldline_admin_csrf"):
        assert client.cookies[name]["path"] == "/admin/"
        assert client.cookies[name]["secure"]
        assert client.cookies[name]["samesite"] == "Lax"
    assert client.cookies["worldline_admin_session"]["httponly"]
