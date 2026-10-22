import pytest
from rest_framework.test import APIClient

from news.feeds import import_feed
from news.images import safe_image_url
from news.models import Article, Source, Topic

FEED = "https://news.mit.edu/rss/research"
IMAGE = "https://news.mit.edu/sites/default/files/research.jpg"


@pytest.mark.parametrize(
    "url",
    [
        "http://news.mit.edu/sites/default/files/a.jpg",
        "https://news.mit.edu.evil.test/sites/default/files/a.jpg",
        "https://127.0.0.1/a.jpg",
        "data:image/svg+xml,anything",
        "https://news.mit.edu@evil.test/sites/default/files/a.jpg",
        "https://news.mit.edu:8443/sites/default/files/a.jpg",
        "https://news.mit.edu/sites/default/files/a.svg",
        "https://news.mit.edu/sites/default/files/a.gif",
        "https://news.mit.edu/elsewhere/a.jpg",
    ],
)
def test_rejects_unreviewed_media(url):
    assert safe_image_url(url, FEED) == ""
    assert safe_image_url(IMAGE, "https://unreviewed.test/rss") == ""


def test_optional_images_preserve_article_identity_credit_and_plain_text(db):
    source = Source.objects.create(
        name="MIT Research",
        feed_url=FEED,
        is_active=True,
        topic=Topic.objects.create(name="Science", slug="science"),
    )

    def feed(media):
        return f"""<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
        <channel><item><guid>stable</guid><title>Real source title</title>
        <link>https://news.mit.edu/story</link><description>Short source excerpt</description>
        {media}</item></channel></rss>""".encode()

    media = (
        f'<media:content medium="image" url="{IMAGE}"/><media:credit>Research team</media:credit>'
    )
    assert import_feed(source, feed(media)).created == 1
    article = Article.objects.get()
    assert article.image_url == IMAGE and article.image_credit == "Research team"
    assert import_feed(source, feed(media)).unchanged == 1
    data = APIClient().get(f"/api/articles/{article.slug}/").json()
    assert data["image_url"] == IMAGE and data["summary"] == "Short source excerpt"
    assert import_feed(source, feed("")).updated == 1
    article.refresh_from_db()
    assert article.image_url == "" and Article.objects.count() == 1
    article.image_url = "https://127.0.0.1/private.png"
    article.save()
    assert APIClient().get(f"/api/articles/{article.slug}/").json()["image_url"] == ""
