import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

from redis.exceptions import ConnectionError
from rest_framework.test import APIClient


def test_production_rejects_local_key_and_applies_https_defaults():
    env = {
        **os.environ,
        "DJANGO_SETTINGS_MODULE": "config.production",
        "APP_DOMAIN": "reader.example.com",
        "DJANGO_SECRET_KEY": "too-short",
    }
    script = "from django.conf import settings; print(settings.DEBUG)"
    root = Path(__file__).resolve().parents[2]
    bad = subprocess.run(
        [sys.executable, "-c", script], cwd=root, env=env, capture_output=True, text=True
    )
    assert bad.returncode != 0 and "unique random" in bad.stderr
    env["DJANGO_SECRET_KEY"] = "test-only-production-check-0123456789-abcdefghijklmnopqrstuvwxyz"
    check = """from django.conf import settings as s
assert not s.DEBUG and s.SECURE_SSL_REDIRECT
assert s.SESSION_COOKIE_SECURE and s.CSRF_COOKIE_SECURE
assert s.ALLOWED_HOSTS == ['reader.example.com']
assert s.REST_FRAMEWORK['NUM_PROXIES'] == 1
assert s.CACHES['default']['BACKEND'].endswith('RedisCache')
"""
    subprocess.run(
        [sys.executable, "-c", check], cwd=root, env=env, check=True, capture_output=True
    )


def test_shared_throttle_outage_returns_safe_error():
    with patch(
        "rest_framework.throttling.SimpleRateThrottle.allow_request",
        side_effect=ConnectionError("secret-redis"),
    ):
        response = APIClient().post(
            "/api/auth/login/", {"username": "reader", "password": "unused"}
        )
    assert response.status_code == 503
    assert "secret" not in response.content.decode()
