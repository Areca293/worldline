"""Official public metadata only. No code execution, tokens or stargazer identities."""

import hashlib
import json
import re
from datetime import timedelta
from urllib.parse import parse_qs, urlencode, urlsplit

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .catalog import GITHUB_COLLECTIONS
from .feeds import MAX_FEED_BYTES, FeedError, ImportResult, plain_text
from .models import Article, Repository, Source, StarObservation


def collection_url(endpoint):
    query = GITHUB_COLLECTIONS[endpoint]
    since = (timezone.now() - timedelta(days=30)).date().isoformat()
    return "https://api.github.com/search/repositories?" + urlencode(
        {
            "q": f"{query} pushed:>={since}",
            "sort": parse_qs(urlsplit(endpoint).query)["sort"][0],
            "order": "desc",
            "per_page": 30,
        }
    )


def api_date(value):
    if not isinstance(value, str):
        return None
    try:
        date = parse_datetime(value)
        return date if date and timezone.is_aware(date) else None
    except ValueError:
        return None


def parse_repositories(data):
    if len(data) > MAX_FEED_BYTES:
        raise FeedError("Repository response exceeds the 2 MiB limit.")
    try:
        payload = json.loads(data)
    except (ValueError, UnicodeError):
        raise FeedError("Repository response is not valid JSON.") from None
    if (
        not isinstance(payload, dict)
        or payload.get("incomplete_results") is not False
        or not isinstance(payload.get("items"), list)
        or len(payload["items"]) > 30
    ):
        raise FeedError("Repository search returned an incomplete or invalid result.")
    return payload["items"]


def validated_item(item):
    if not isinstance(item, dict):
        return None
    name = item.get("full_name")
    stars, github_id = item.get("stargazers_count"), item.get("id")
    license = item.get("license")
    if (
        not isinstance(name, str)
        or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", name)
        or len(name) > 240
        or item.get("html_url") != f"https://github.com/{name}"
        or type(stars) is not int
        or not 0 <= stars <= 2147483647
        or type(github_id) is not int
        or not 0 < github_id <= 9223372036854775807
        or item.get("private") is not False
        or item.get("archived") is not False
        or item.get("fork") is not False
        or not isinstance(license, dict)
        or not isinstance(license.get("spdx_id"), str)
        or license["spdx_id"] in {"", "NOASSERTION"}
        or len(license["spdx_id"]) > 100
    ):
        return None
    return name, stars, github_id, license["spdx_id"]


@transaction.atomic
def import_repositories(source, data):
    items = parse_repositories(data)
    source = Source.objects.select_for_update().get(pk=source.pk)
    if not source.is_active or not source.topic_id:
        raise FeedError("Source is inactive or has no topic.")
    now = timezone.now()
    result = ImportResult()
    for item in items:
        valid = validated_item(item)
        if valid is None:
            result.skipped += 1
            continue
        name, stars, github_id, license = valid
        identity = f"github:{github_id}"
        repo = Repository.objects.select_related("article").filter(github_id=github_id).first()
        url = f"https://github.com/{name}"
        # A transfer/rename keeps its stable GitHub identity. Never merge foreign stories.
        if (
            Article.objects.filter(original_url=url)
            .exclude(pk=repo.article_id if repo else None)
            .exists()
        ):
            result.skipped += 1
            continue
        if repo and repo.article.source_id != source.pk:
            result.skipped += 1
            continue
        topics = item.get("topics")
        tags = (
            " ".join(t for t in topics[:20] if isinstance(t, str))
            if isinstance(topics, list)
            else ""
        )
        summary = plain_text(item.get("description"), 450)
        if tags:
            summary = plain_text(f"{summary} Topics: {tags}", 600)
        values = {
            "title": name,
            "summary": summary,
            "original_url": url,
            "source_updated_at": api_date(item.get("pushed_at")),
        }
        if repo is None:
            article = Article.objects.create(
                source=source,
                topic=source.topic,
                source_entry_id=identity,
                source_entry_hash=hashlib.sha256(identity.encode()).hexdigest(),
                published_at=api_date(item.get("created_at")),
                **values,
            )
            repo = Repository.objects.create(
                article=article,
                github_id=github_id,
                full_name=name,
                stars=stars,
                license=license,
                observed_at=now,
            )
            result.created += 1
        else:
            changed = [k for k, v in values.items() if getattr(repo.article, k) != v]
            if changed:
                for key in changed:
                    setattr(repo.article, key, values[key])
                repo.article.save(update_fields=changed)
            if changed or repo.stars != stars:
                result.updated += 1
            else:
                result.unchanged += 1
        baseline = (
            repo.observations.filter(
                observed_at__lte=now - timedelta(hours=24),
                observed_at__gte=now - timedelta(hours=26),
            )
            .order_by("-observed_at")
            .first()
        )
        repo.full_name, repo.stars, repo.license = name, stars, license
        repo.pushed_at, repo.observed_at = api_date(item.get("pushed_at")), now
        repo.baseline_at = baseline.observed_at if baseline else None
        repo.star_change = stars - baseline.stars if baseline else None
        repo.save()
        StarObservation.objects.get_or_create(
            repository=repo,
            hour=now.replace(minute=0, second=0, microsecond=0),
            defaults={"observed_at": now, "stars": stars},
        )
    # Keep the measurements needed for the 24–26h baseline without unbounded history.
    StarObservation.objects.filter(observed_at__lt=now - timedelta(days=8)).delete()
    return result
