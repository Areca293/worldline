from django.core.management.base import BaseCommand, CommandError
from django.db import DatabaseError

from news.feeds import FeedError
from news.ingestion import refresh_source
from news.models import Source


class Command(BaseCommand):
    help = "Manually import active, reviewed RSS/Atom and GitHub sources. One failure does not block other sources."

    def add_arguments(self, parser):
        parser.add_argument("--source", type=int, help="Import a single source by its admin ID.")

    def handle(self, *args, **options):
        sources = Source.objects.filter(is_active=True).order_by("pk")
        if options["source"]:
            sources = sources.filter(pk=options["source"])
        if not sources.exists():
            raise CommandError(
                "No active sources found. Run seed_sources or check the admin settings."
            )
        failures = 0
        for source in sources:
            try:
                result = refresh_source(source.pk)
            except (FeedError, DatabaseError) as exc:
                failures += 1
                message = str(exc) if isinstance(exc, FeedError) else "Database write failed."
                self.stderr.write(f"Source {source.pk}: {message}")
                continue
            if result is None:
                self.stdout.write(f"{source.name}: skipped (inactive or update already running)")
                continue
            self.stdout.write(
                f"{source.name}: created={result.created}, updated={result.updated}, "
                f"unchanged={result.unchanged}, skipped={result.skipped}"
            )
        if failures:
            raise CommandError(
                f"{failures} source(s) failed. Other sources were processed; existing articles remain available."
            )
