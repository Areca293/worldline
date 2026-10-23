from django.core.management.base import BaseCommand
from django.db.models import Count, Sum
from django.utils import timezone

from assistance.models import UsageEvent


class Command(BaseCommand):
    help = "Show today's assistance metrics without questions, responses or credentials."

    def handle(self, *args, **options):
        today = timezone.now().date()
        rows = (
            UsageEvent.objects.filter(created_at__date=today)
            .values("operation", "outcome")
            .annotate(
                requests=Count("id"),
                search_calls=Sum("search_calls"),
                model_calls=Sum("model_calls"),
                input_tokens=Sum("input_tokens"),
                output_tokens=Sum("output_tokens"),
            )
            .order_by("operation", "outcome")
        )
        self.stdout.write(
            f"Assistance usage for {today} UTC. Token totals include reported usage only."
        )
        for row in rows:
            self.stdout.write(str(row))
        self.stdout.write(
            "Provider invoices are authoritative for cost; failed calls may still be billed."
        )
