from io import StringIO

import pytest
from django.core.management import call_command

from news.catalog import FEEDS, TOPICS
from news.models import Source, Topic


@pytest.mark.django_db
def test_catalog_seed_is_repeatable_and_preserves_operator_settings():
    call_command("seed_sources", stdout=StringIO())
    assert Topic.objects.count() == len(TOPICS) == 10
    assert Source.objects.count() == len(FEEDS)
    source = Source.objects.get(feed_url=FEEDS[0]["feed_url"])
    source.is_active = False
    source.usage_notes = "Operator policy"
    source.save()
    call_command("seed_sources", stdout=StringIO())
    source.refresh_from_db()
    assert not source.is_active and source.usage_notes == "Operator policy"
    assert Source.objects.count() == len(FEEDS)
    for source in Source.objects.all():
        source.full_clean()
