"""Same-origin HTTPS behind the repository's Caddy proxy only."""

import os
import re

from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F403

DEBUG = False
domain = os.environ.get("APP_DOMAIN", "")
if not re.fullmatch(r"[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?", domain):
    raise ImproperlyConfigured("APP_DOMAIN must be a hostname without a scheme or port.")
if len(SECRET_KEY) < 50 or len(set(SECRET_KEY)) < 5 or "local-development" in SECRET_KEY:  # noqa: F405
    raise ImproperlyConfigured(
        "Production requires a unique random DJANGO_SECRET_KEY of at least 50 characters."
    )
ALLOWED_HOSTS = [domain]
CSRF_TRUSTED_ORIGINS = [f"https://{domain}"]
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
# Do not commit sibling subdomains to HTTPS or request browser preload implicitly.
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.environ.get("CACHE_URL", "redis://redis:6379/1"),
        "KEY_PREFIX": "worldline",
        "OPTIONS": {"socket_connect_timeout": 3, "socket_timeout": 3},
    }
}
REST_FRAMEWORK = {**REST_FRAMEWORK, "NUM_PROXIES": 1}  # noqa: F405
