from unittest.mock import patch

import pytest
from celery.exceptions import Retry
from django.db import connection

from news.catalog import FEEDS
from news.feeds import FeedError
from news.ingestion import refresh_source
from news.models import Article, FeedRun, Source, Topic
from news.tasks import dispatch_feeds, update_source
from news.tests.test_feeds import item, rss


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


def test_success_failure_and_recovery_preserve_content_and_success_time(source):
    with patch("news.ingestion.fetch_feed", return_value=rss(item())):
        assert refresh_source(source.pk).created == 1
    source.refresh_from_db()
    succeeded = source.last_success_at
    article = Article.objects.get()
    publication, collection = article.published_at, article.collected_at
    with patch("news.ingestion.fetch_feed", side_effect=FeedError("secret-body")):
        with pytest.raises(FeedError):
            refresh_source(source.pk, trigger="scheduled", attempt=2)
    source.refresh_from_db()
    assert source.last_success_at == succeeded
    assert source.last_error == "Feed update failed."
    run = FeedRun.objects.first()
    assert run.status == "failed" and run.attempt == 2 and run.finished_at
    assert "secret" not in run.error
    with patch("news.ingestion.fetch_feed", return_value=rss(item())):
        assert refresh_source(source.pk).unchanged == 1
    source.refresh_from_db()
    assert source.last_success_at >= succeeded and not source.last_error
    article.refresh_from_db()
    assert (article.published_at, article.collected_at) == (publication, collection)
    assert Article.objects.count() == 1 and FeedRun.objects.count() == 3


def test_retry_backoff_is_bounded_and_disabled_sources_are_not_fetched(source):
    with patch("news.tasks.refresh_source", side_effect=FeedError("failed")):
        for attempt in range(3):
            update_source.push_request(retries=attempt, called_directly=False)
            try:
                with patch.object(update_source, "apply_async") as queued:
                    with pytest.raises(Retry):
                        update_source.run(source.pk)
                    assert queued.call_args.kwargs["countdown"] == 60 * 2**attempt
            finally:
                update_source.pop_request()
    Source.objects.filter(pk=source.pk).update(is_active=False)
    with patch("news.ingestion.fetch_feed") as fetch:
        assert refresh_source(source.pk) is None
        fetch.assert_not_called()


def test_dispatch_attempts_other_sources_even_if_enqueue_fails(source):
    other = Source.objects.create(name="Other", website_url="https://example.org", is_active=True)
    with (
        patch.object(update_source, "apply_async", side_effect=[OSError(), None]) as enqueue,
        patch.object(dispatch_feeds, "retry", side_effect=Retry()) as retry,
    ):
        with pytest.raises(Retry):
            dispatch_feeds.run()
        assert {call.kwargs["args"][0] for call in enqueue.call_args_list} == {source.pk, other.pk}
        retry.assert_called_once()


def test_overlap_does_not_fetch_and_abandoned_record_is_recovered(source):
    # A second real PostgreSQL session owns the same advisory lock.
    other = connection.copy()
    try:
        with other.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_lock(%s, %s)", [73121, source.pk])
        with patch("news.ingestion.fetch_feed") as fetch:
            assert refresh_source(source.pk) is None
            fetch.assert_not_called()
    finally:
        other.close()
    stale = FeedRun.objects.create(source=source, trigger="scheduled", status="running")
    with patch("news.ingestion.fetch_feed", return_value=rss(item())):
        refresh_source(source.pk)
    stale.refresh_from_db()
    assert stale.status == "failed" and stale.finished_at
    assert FeedRun.objects.first().status == "success"
