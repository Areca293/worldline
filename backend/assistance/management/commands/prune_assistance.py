from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from assistance.models import QuotaDay, ResultCache, UsageEvent


class Command(BaseCommand):
    help = "Delete expired AI results and operational counters older than 30 days."

    def handle(self, *args, **options):
        now = timezone.now()
        for name, rows in (
            ("expired results", ResultCache.objects.filter(expires_at__lte=now)),
            (
                "old quota counters",
                QuotaDay.objects.filter(day__lt=(now - timedelta(days=30)).date()),
            ),
            (
                "old usage events",
                UsageEvent.objects.filter(created_at__lt=now - timedelta(days=30)),
            ),
        ):
            count, _ = rows.delete()
            self.stdout.write(f"Removed {count} {name}.")
