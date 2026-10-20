from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import IntegrityError, transaction
from django.utils import timezone

from news.catalog import FEEDS
from news.feeds import FeedError, canonical_url, fetch_feed, import_feed, parse_entries
from news.models import Article, Source, Topic


def rss(*items):
    return (
        '<rss version="2.0"><channel><title>Test</title>' + "".join(items) + "</channel></rss>"
    ).encode()


def item(
    url="https://example.com/story",
    uid="one",
    date="Tue, 20 Oct 2026 10:00:00 GMT",
    summary="Short source excerpt.",
    title="Original title",
):
    return f"<item><title>{title}</title><link>{url}</link><guid>{uid}</guid><description>{summary}</description><pubDate>{date}</pubDate></item>"


@pytest.fixture
def source(db):
    topic = Topic.objects.create(name="Technology", slug="technology")
    return Source.objects.create(
        name="Test publisher",
        website_url="https://example.com/",
        feed_url=FEEDS[0]["feed_url"],
        topic=topic,
        is_active=True,
    )


def test_repeat_import_and_stable_id_url_change_preserve_collection_and_bookmarks(
    source, django_user_model
):
    first = rss(item(url="https://EXAMPLE.com/story?utm_source=rss#top"))
    assert import_feed(source, first).created == 1
    article = Article.objects.get()
    collected = article.collected_at
    pk, slug = article.pk, article.slug
    user = django_user_model.objects.create_user(username="reader", password="test-only-password")
    article.bookmarks.create(user=user)
    assert import_feed(source, first).unchanged == 1
    assert (
        import_feed(
            source, rss(item(url="https://example.com/corrected", title="Corrected title"))
        ).updated
        == 1
    )
    article.refresh_from_db()
    assert (article.pk, article.slug, article.collected_at) == (pk, slug, collected)
    assert article.bookmarks.filter(user=user).exists()
    assert article.original_url == "https://example.com/corrected"
    assert article.published_at.isoformat() == "2026-10-20T10:00:00+00:00"
    assert Article.objects.count() == 1


def test_missing_or_invalid_dates_and_html_are_not_invented(source):
    data = rss(
        item(
            date="not a date",
            summary="&lt;script&gt;bad()&lt;/script&gt;&lt;b&gt;Safe &amp;amp; plain&lt;/b&gt;",
        )
    )
    import_feed(source, data)
    article = Article.objects.get()
    assert article.published_at is None
    assert article.summary == "Safe & plain"
    assert article.collected_at <= timezone.now()
    assert "<" not in article.summary and "bad()" not in article.summary


def test_atom_updated_is_not_a_publication_date_and_no_full_body_fallback(source):
    atom = b"""<feed xmlns="http://www.w3.org/2005/Atom"><title>Test</title>
      <entry><id>atom-one</id><title>Atom story</title><link href="https://example.com/atom"/>
      <updated>2026-10-19T15:30:00Z</updated><summary>Atom excerpt.</summary></entry>
      <entry><id>atom-two</id><title>No excerpt</title><link href="https://example.com/no-excerpt"/>
      <content type="html">A full article body must not be saved.</content></entry></feed>"""
    assert import_feed(source, atom).created == 2
    article = Article.objects.get(source_entry_id="atom-one")
    assert article.published_at is None
    assert article.source_updated_at.isoformat() == "2026-10-19T15:30:00+00:00"
    assert Article.objects.get(source_entry_id="atom-two").summary == ""


def test_normalized_url_dedup_and_conflicting_identity_are_safe(source):
    assert import_feed(source, rss(item(uid=""))).created == 1
    assert (
        import_feed(
            source, rss(item(uid="", url="https://example.com/story?utm_medium=rss"))
        ).unchanged
        == 1
    )
    assert import_feed(source, rss(item(uid="one"))).updated == 1
    assert import_feed(source, rss(item(uid="different", title="Wrong replacement"))).skipped == 1
    assert Article.objects.get().title == "Original title"
    with pytest.raises(IntegrityError), transaction.atomic():
        Article.objects.create(
            title="duplicate",
            original_url="https://example.com/another",
            source=source,
            topic=source.topic,
            source_entry_hash=Article.objects.get().source_entry_hash,
        )


def test_bad_entry_does_not_discard_good_entries_or_existing_articles(source):
    result = import_feed(source, rss(item(url="javascript:alert(1)"), item(uid="good")))
    assert result.created == 1 and result.skipped == 1
    with pytest.raises(FeedError):
        import_feed(source, b"<html>Not a feed</html>")
    assert Article.objects.count() == 1


def test_failure_of_one_source_does_not_prevent_another(source):
    other = Source.objects.create(
        name="Other",
        website_url="https://example.org/",
        topic=source.topic,
        is_active=True,
        feed_url=FEEDS[1]["feed_url"],
    )
    with patch(
        "news.management.commands.import_feeds.fetch_feed",
        side_effect=[FeedError("Timeout."), rss(item())],
    ):
        with pytest.raises(CommandError, match="1 source"):
            call_command("import_feeds", stdout=StringIO(), stderr=StringIO())
    assert Article.objects.get().source == other


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "https://example.com/feed",
        "file:///etc/passwd",
        FEEDS[0]["feed_url"] + "?url=http://localhost",
    ],
)
def test_fetch_rejects_unreviewed_urls_before_dns(url):
    with patch("news.feeds.socket.getaddrinfo") as lookup:
        with pytest.raises(FeedError):
            fetch_feed(url)
        lookup.assert_not_called()


def test_fetch_rejects_private_dns_and_pins_public_ip_with_verified_tls():
    with patch("news.feeds.socket.getaddrinfo", return_value=[(0, 0, 0, "", ("127.0.0.1", 443))]):
        with pytest.raises(FeedError, match="non-public"):
            fetch_feed(FEEDS[0]["feed_url"])
    with (
        patch("news.feeds.socket.getaddrinfo", return_value=[(0, 0, 0, "", ("8.8.8.8", 443))]),
        patch("news.feeds.urllib3.HTTPSConnectionPool") as pool,
    ):
        response = pool.return_value.__enter__.return_value.urlopen.return_value
        response.status, response.headers = 302, {"Location": "http://127.0.0.1/"}
        with pytest.raises(FeedError, match="redirects"):
            fetch_feed(FEEDS[0]["feed_url"])
        assert pool.call_args.args[0] == "8.8.8.8"
        assert pool.call_args.kwargs["server_hostname"] == "www.nasa.gov"
        assert pool.call_args.kwargs["cert_reqs"] == "CERT_REQUIRED"
        assert (
            pool.return_value.__enter__.return_value.urlopen.call_args.kwargs["redirect"] is False
        )


@pytest.mark.parametrize(
    "payload",
    [b'<!DOCTYPE rss [<!ENTITY x "bad">]><rss/>', b"<rss><broken>", b"x" * (2 * 1024 * 1024 + 1)],
)
def test_reject_unsafe_malformed_and_oversized_xml(payload):
    with pytest.raises(FeedError):
        parse_entries(payload)


def test_canonicalization_preserves_meaningful_queries():
    assert (
        canonical_url("https://EXAMPLE.com:443/a?id=3&utm_source=rss#top")
        == "https://example.com/a?id=3"
    )
    assert canonical_url("https://example.com/a?id=4") != canonical_url(
        "https://example.com/a?id=3"
    )
