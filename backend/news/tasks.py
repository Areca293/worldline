import logging

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from django.db import DatabaseError

from .feeds import FeedError
from .ingestion import refresh_source
from .models import Source

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, acks_late=True)
def update_source(self, source_id):
    try:
        refresh_source(source_id, trigger="scheduled", attempt=self.request.retries + 1)
    except (FeedError, DatabaseError, SoftTimeLimitExceeded):
        # No original exception in the broker payload or task failure log.
        raise self.retry(countdown=60 * 2**self.request.retries, expires=1800)


@shared_task(bind=True, max_retries=3)
def dispatch_feeds(self):
    try:
        ids = list(Source.objects.filter(is_active=True).values_list("pk", flat=True))
    except DatabaseError:
        raise self.retry(countdown=60 * 2**self.request.retries)
    failed = False
    for source_id in ids:
        try:
            update_source.apply_async(args=[source_id], expires=3600, retry=False)
        except Exception:
            failed = True
            logger.error("feed source=%s status=enqueue-failed", source_id)
    if failed:
        raise self.retry(countdown=60 * 2**self.request.retries)
