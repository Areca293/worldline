from django.core.management.base import BaseCommand
from django.db import transaction

from news.catalog import FEEDS, TOPICS
from news.models import Source, Topic


class Command(BaseCommand):
    help = "Add reviewed official feeds without overwriting existing admin changes."

    @transaction.atomic
    def handle(self, *args, **options):
        for name, slug in TOPICS:
            Topic.objects.get_or_create(slug=slug, defaults={"name": name})
        created = 0
        for item in FEEDS:
            topic, _ = Topic.objects.get_or_create(
                slug=item["slug"], defaults={"name": item["topic"]}
            )
            _, new = Source.objects.get_or_create(
                feed_url=item["feed_url"],
                defaults={
                    "name": item["name"],
                    "website_url": item["website_url"],
                    "topic": topic,
                    "is_active": True,
                    "terms_url": item["terms_url"],
                    "usage_notes": item["usage_notes"],
                },
            )
            created += new
        self.stdout.write(
            self.style.SUCCESS(f"Created {created} sources. Existing settings preserved.")
        )
