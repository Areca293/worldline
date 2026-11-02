"""Brave snippets become evidence; result URLs are never fetched."""

from urllib.parse import urlencode, urlsplit

from django.conf import settings

from . import transport
from .errors import AssistanceError
from .evidence import plain, public_url


def search_web(query, window):
    params = {
        "q": query,
        "count": 5,
        "search_lang": "en",
        "text_decorations": "false",
        "spellcheck": "false",
        "safesearch": "moderate",
        "result_filter": "web",
    }
    if window != "any":
        params["freshness"] = {"day": "pd", "week": "pw", "month": "pm"}[window]
    data = transport.request_json(
        "GET",
        "https://api.search.brave.com/res/v1/web/search?" + urlencode(params),
        {"X-Subscription-Token": settings.BRAVE_SEARCH_API_KEY},
    )
    web = data.get("web") or {}
    rows = web.get("results", []) if isinstance(web, dict) else None
    if not isinstance(rows, list):
        raise AssistanceError("invalid_response", "Search results could not be read.", 502)
    evidence, seen = [], set()
    for row in rows[:5]:
        if not isinstance(row, dict):
            continue
        url = public_url(row.get("url"))
        title = plain(row.get("title"), 300)
        if not url or not title or url in seen:
            continue
        seen.add(url)
        evidence.append(
            {
                "id": len(evidence) + 1,
                "title": title,
                "url": url,
                "publisher": urlsplit(url).hostname,
                "text": plain(row.get("description"), 1200),
                "kind": "search_snippet",
                "published_at": None,
            }
        )
    return evidence
