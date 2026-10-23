"""Opt-in real-browser test, with Django's disposable PostgreSQL test database.

Run: uv run pytest -m browser -q
Requires frontend npm ci and either Playwright Chromium or E2E_BROWSER_CHANNEL=chrome.
"""

import os
import secrets
import socket
import subprocess
from datetime import timedelta
from pathlib import Path

import pytest
from django.utils import timezone

from news.catalog import TOPICS
from news.models import Article, Repository, Source, Topic


@pytest.mark.browser
@pytest.mark.django_db(transaction=True)
def test_reading_in_real_browser(live_server, django_user_model, settings, tmp_path):
    settings.ALLOWED_HOSTS = [*settings.ALLOWED_HOSTS, "127.0.0.1"]
    settings.SESSION_COOKIE_SECURE = False
    settings.CSRF_COOKIE_SECURE = False
    password = secrets.token_urlsafe(24)
    for name in ("browser-alice", "browser-bob"):
        django_user_model.objects.create_user(username=name, password=password)
    topic = Topic.objects.create(name="Music", slug="music")
    source = Source.objects.create(
        name="Browser test publisher", website_url="https://example.com/", is_active=True
    )
    Article.objects.create(
        title="Browser test story",
        slug="browser-test-story",
        topic=topic,
        source=source,
        summary="An original fixture used only in the disposable browser-test database.",
        original_url="https://example.com/story",
        published_at=timezone.now(),
    )
    Article.objects.bulk_create(
        [
            Article(
                title=f"Archive story {n:02d}",
                slug=f"browser-archive-{n}",
                topic=topic,
                source=source,
                summary="Original pagination fixture in the disposable database.",
                original_url=f"https://example.com/archive/{n}",
                published_at=timezone.now() - timedelta(days=n + 1),
            )
            for n in range(24)
        ]
    )
    # Original repository fixtures, only in this disposable browser-test database.
    for name, slug in TOPICS:
        Topic.objects.get_or_create(slug=slug, defaults={"name": name})
    repo_source = Source.objects.create(
        name="GitHub browser fixture", website_url="https://github.com/"
    )
    for name, stars, change, stale, topic_slug in [
        ("fixture/agent-skill", 120, None, False, "agents-skills"),
        ("fixture/growing-project", 300, 30, False, "open-source"),
        ("fixture/stale-project", 1000, 200, True, "open-source"),
    ]:
        article = Article.objects.create(
            title=name,
            source=repo_source,
            topic=Topic.objects.get(slug=topic_slug),
            original_url=f"https://github.com/{name}",
            summary="Original repository fixture for browser acceptance.",
            published_at=timezone.now() - timedelta(days=365),
        )
        observed = timezone.now() - timedelta(hours=3 if stale else 0)
        Repository.objects.create(
            article=article,
            github_id=stars,
            full_name=name,
            stars=stars,
            license="MIT",
            observed_at=observed,
            star_change=change,
            baseline_at=observed - timedelta(hours=24) if change is not None else None,
        )
    image_source = Source.objects.create(
        name="MIT image fixture",
        website_url="https://news.mit.edu/",
        feed_url="https://news.mit.edu/rss/research",
    )
    Article.objects.create(
        title="ChatGPT research with a publisher image",
        slug="browser-image-story",
        source=image_source,
        topic=Topic.objects.get(slug="science"),
        original_url="https://news.mit.edu/fixture-story",
        summary="Original image layout fixture.",
        image_url="https://news.mit.edu/sites/default/files/worldline-fixture.png",
        image_credit="Original browser test image",
        published_at=timezone.now() - timedelta(days=400),
    )
    with socket.socket() as available:
        available.bind(("127.0.0.1", 0))
        port = available.getsockname()[1]
    env = {
        **os.environ,
        "E2E_PASSWORD": password,
        "API_PROXY_TARGET": live_server.url,
        "E2E_PORT": str(port),
        "E2E_ARTIFACT_DIR": str(tmp_path),
    }
    frontend = Path(__file__).resolve().parents[3] / "frontend"
    # The node runner's servers terminate on exit; pytest tears down the test database.
    subprocess.run(["npm", "run", "test:e2e"], cwd=frontend, env=env, check=True, timeout=120)
