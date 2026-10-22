"""Real Redis messages and Celery worker; fixture RSS is not live publisher data."""

import os
import time
import uuid
from unittest.mock import patch

import pytest
from celery.beat import ScheduleEntry, Scheduler
from celery.contrib.testing.worker import start_worker
from django.db import connections

from config.celery import app
from news.catalog import FEEDS
from news.feeds import FeedError
from news.models import Article, FeedRun, Source, Topic
from news.tests.test_feeds import item, rss


@pytest.mark.integration
@pytest.mark.django_db(transaction=True)
def test_beat_dispatch_worker_retry_and_persisted_result(settings):
    broker = os.environ.get("TEST_REDIS_URL")
    if not broker:
        pytest.skip("Set TEST_REDIS_URL to an isolated Redis database.")
    settings.FEED_RETRY_BASE_SECONDS = 1
    queue = f"worldline-test-{uuid.uuid4().hex}"
    previous = {
        key: app.conf[key] for key in ("broker_url", "task_default_queue", "task_always_eager")
    }
    app.conf.update(broker_url=broker, task_default_queue=queue, task_always_eager=False)
    topic = Topic.objects.create(name="Technology", slug="technology")
    source = Source.objects.create(
        name="Worker fixture",
        website_url="https://example.com",
        topic=topic,
        feed_url=FEEDS[0]["feed_url"],
        is_active=True,
    )
    try:
        with patch(
            "news.ingestion.fetch_feed", side_effect=[FeedError("test failure"), rss(item())]
        ):
            with start_worker(
                app, pool="solo", concurrency=1, queues=[queue], perform_ping_check=False
            ):
                scheduler = Scheduler(app=app, lazy=True)
                scheduler.apply_async(
                    ScheduleEntry(
                        name="test-hourly",
                        app=app,
                        task="news.tasks.dispatch_feeds",
                        schedule=3600,
                        options={"queue": queue},
                    )
                )
                deadline = time.monotonic() + 20
                while not FeedRun.objects.filter(source=source, status="success").exists():
                    assert time.monotonic() < deadline, "Worker did not persist a successful retry."
                    time.sleep(0.1)
        runs = list(FeedRun.objects.order_by("started_at"))
        assert [(run.status, run.attempt) for run in runs] == [("failed", 1), ("success", 2)]
        assert Article.objects.count() == 1
        source.refresh_from_db()
        assert source.last_success_at and not source.last_error
        assert Article.objects.get().published_at.year == 2026
    finally:
        # Only this test's randomly named queue is removed; never FLUSHDB/FLUSHALL.
        with app.connection_for_write() as conn:
            conn.default_channel.queue_delete(queue)
        app.conf.update(previous)
        connections.close_all()
