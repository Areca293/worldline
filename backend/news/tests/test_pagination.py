import pytest
from rest_framework.test import APIClient

from news.models import Article, Bookmark, Source, Topic


@pytest.fixture
def stories(db):
    topic = Topic.objects.create(name="Music", slug="music")
    source = Source.objects.create(name="Pagination publisher", website_url="https://example.com")
    return Article.objects.bulk_create(
        [
            Article(
                title=f"Story {n}",
                topic=topic,
                source=source,
                original_url=f"https://example.com/{n}",
            )
            for n in range(27)
        ]
    )


def test_numbered_pages_custom_size_all_and_filtered_empty(stories):
    client = APIClient()
    first = client.get("/api/articles/?page_size=10").json()
    second = client.get("/api/articles/?page_size=10&page=2").json()
    assert first["count"] == 27 and first["total_pages"] == 3 and first["page"] == 1
    assert len(first["results"]) == len(second["results"]) == 10
    assert not {a["id"] for a in first["results"]} & {a["id"] for a in second["results"]}
    last = client.get("/api/articles/?page_size=10&page=999").json()
    assert last["page"] == 3 and len(last["results"]) == 7
    custom = client.get("/api/articles/?page_size=7&page=2").json()
    assert custom["page_size"] == 7 and len(custom["results"]) == 7
    all_stories = client.get("/api/articles/?page_size=all&page=20").json()
    assert len(all_stories["results"]) == 27
    assert all_stories["total_pages"] == all_stories["page"] == 1
    assert all_stories["page_size"] is None and all_stories["next"] is None
    empty = client.get("/api/articles/?page_size=all&topic=missing").json()
    assert empty["count"] == 0 and empty["results"] == []


@pytest.mark.parametrize(
    "query",
    [
        "page_size=0",
        "page_size=-1",
        "page_size=1.5",
        "page_size=bad",
        "page_size=1000000000",
        "page=0",
        "page=bad",
    ],
)
def test_invalid_pagination_has_clear_validation(stories, query):
    response = APIClient().get(f"/api/articles/?{query}")
    assert response.status_code == 400


def test_all_bookmarks_stays_private_and_shrinking_pages_remain_valid(stories, django_user_model):
    a = django_user_model.objects.create_user(username="a")
    b = django_user_model.objects.create_user(username="b")
    Bookmark.objects.bulk_create([Bookmark(user=a, article=article) for article in stories[:11]])
    Bookmark.objects.create(user=b, article=stories[-1])
    client = APIClient()
    client.force_authenticate(a)
    all_saved = client.get(f"/api/bookmarks/?page_size=all&user={b.pk}").json()
    assert all_saved["count"] == len(all_saved["results"]) == 11
    assert stories[-1].pk not in {a["id"] for a in all_saved["results"]}
    last = client.get("/api/bookmarks/?page_size=10&page=2").json()["results"][0]
    client.delete(f"/api/articles/{last['slug']}/bookmark/")
    refreshed = client.get("/api/bookmarks/?page_size=10&page=2").json()
    assert refreshed["page"] == 1 and len(refreshed["results"]) == 10
    assert Bookmark.objects.filter(user=b).count() == 1
