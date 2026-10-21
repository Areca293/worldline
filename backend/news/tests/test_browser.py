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

from news.models import Article, Source, Topic


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
        name="Browser test publisher", website_url="https://example.com/"
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
