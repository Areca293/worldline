from django.core.management.base import BaseCommand
from django.db import transaction

from news.models import Article, Source, Topic

SAMPLES = [
    (
        "Technology",
        "technology",
        "A closer look at the ideas shaping our digital world",
        "Explore the tools, research and small breakthroughs behind a changing digital landscape. "
        "This original demo text previews the reading experience; it does not report an actual event.",
        "https://developer.mozilla.org/en-US/",
    ),
    (
        "Economy",
        "economy",
        "Making sense of the economy, one indicator at a time",
        "A space for context on growth, work and the global economy. This is original placeholder "
        "copy, not a summary of a published article. The reference link opens the World Bank data site.",
        "https://data.worldbank.org/",
    ),
    (
        "Finance",
        "finance",
        "The bigger picture behind the market numbers",
        "Follow the questions behind financial headlines. This original demo text contains no "
        "market data or investment recommendations. The reference link opens an educational resource.",
        "https://www.investor.gov/introduction-investing",
    ),
    (
        "Music",
        "music",
        "Beyond the release: the stories that give music its meaning",
        "A place for listening, discovery and the people behind the sound. This original demo text "
        "is not a review or a news report. The reference link opens the MusicBrainz project.",
        "https://musicbrainz.org/",
    ),
]


class Command(BaseCommand):
    help = "Create clearly labeled, original demo content. Safe to run repeatedly."

    @transaction.atomic
    def handle(self, *args, **options):
        source, _ = Source.objects.get_or_create(
            name="Worldline demo",
            defaults={"website_url": "https://example.com/"},
        )
        created = 0
        for name, slug, title, summary, url in SAMPLES:
            topic, _ = Topic.objects.get_or_create(slug=slug, defaults={"name": name})
            _, is_new = Article.objects.get_or_create(
                slug=f"demo-{slug}",
                defaults={
                    "topic": topic,
                    "source": source,
                    "title": title,
                    "summary": summary,
                    "original_url": url,
                    "published_at": None,
                    "is_sample": True,
                    "featured": slug == "technology",
                },
            )
            created += is_new
        self.stdout.write(self.style.SUCCESS(f"Created {created} demo articles (not live news)."))
