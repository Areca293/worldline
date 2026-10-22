"""One audited import path for manual runs and Celery tasks."""

import logging

from django.db import DatabaseError, connection, transaction
from django.utils import timezone

from .feeds import FeedError, fetch_feed, import_feed
from .models import FeedRun, Source

logger = logging.getLogger(__name__)


def refresh_source(source_id, *, trigger="manual", attempt=1):
    # Session lock spans the network fetch without holding a database transaction.
    # A killed worker releases the lock when PostgreSQL closes its connection.
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_try_advisory_lock(%s, %s)", [73121, source_id])
        if not cursor.fetchone()[0]:
            logger.info("feed source=%s status=busy", source_id)
            return None
    try:
        source = Source.objects.filter(pk=source_id, is_active=True).first()
        if source is None:
            return None
        now = timezone.now()
        # Any running record left behind by a terminated process is now abandoned:
        # acquiring this lock proves no supported importer is still working on it.
        FeedRun.objects.filter(source=source, status="running").update(
            status="failed", finished_at=now, error="Previous update was interrupted."
        )
        run = FeedRun.objects.create(
            source=source, trigger=trigger, attempt=attempt, status="running"
        )
        Source.objects.filter(pk=source_id).update(last_attempt_at=run.started_at)
        try:
            data = fetch_feed(source.feed_url)
            with transaction.atomic():
                result = import_feed(source, data)
                finished = timezone.now()
                counts = {
                    key: getattr(result, key)
                    for key in ("created", "updated", "unchanged", "skipped")
                }
                FeedRun.objects.filter(pk=run.pk).update(
                    status="success", finished_at=finished, **counts
                )
                Source.objects.filter(pk=source_id).update(last_success_at=finished, last_error="")
        except Exception as exc:
            # Do not store response bodies, raw DB exceptions, URLs or credentials.
            error = (
                "Feed update failed."
                if isinstance(exc, FeedError)
                else "Update could not complete."
            )
            try:
                with transaction.atomic():
                    FeedRun.objects.filter(pk=run.pk).update(
                        status="failed", finished_at=timezone.now(), error=error
                    )
                    Source.objects.filter(pk=source_id).update(last_error=error)
            except DatabaseError:
                logger.error("feed source=%s status=record-unavailable", source_id)
            logger.warning("feed source=%s status=failed kind=%s", source_id, type(exc).__name__)
            raise
        logger.info(
            "feed source=%s status=success created=%s updated=%s unchanged=%s skipped=%s",
            source_id,
            result.created,
            result.updated,
            result.unchanged,
            result.skipped,
        )
        return result
    finally:
        # Database outages may have dropped the connection (and its session lock).
        if connection.connection is not None and connection.is_usable():
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_advisory_unlock(%s, %s)", [73121, source_id])
