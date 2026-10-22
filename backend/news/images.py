"""Publisher-supplied feed media only; no page scraping or server image fetching."""

from urllib.parse import urlsplit

# Exact publisher paths seen in the reviewed feeds. Shared CDNs are path-scoped.
IMAGE_ORIGINS = {
    "https://blog.google/innovation-and-ai/technology/ai/rss/": {
        "storage.googleapis.com": "/gweb-uniblog-publish-prod/images/",
    },
    "https://deepmind.google/blog/rss.xml": {"lh3.googleusercontent.com": "/"},
    "https://news.mit.edu/rss/research": {"news.mit.edu": "/sites/default/files/"},
    "https://blog.cloudflare.com/rss/": {
        "blog.cloudflare.com": "/_emdash/api/media/file/",
        "cf-assets.www.cloudflare.com": "/",
    },
}


def safe_image_url(value, feed_url):
    if not isinstance(value, str) or len(value) > 2048 or any(ord(c) < 33 for c in value):
        return ""
    try:
        url = urlsplit(value)
        prefix = IMAGE_ORIGINS.get(feed_url, {}).get(url.hostname)
        if (
            url.scheme != "https"
            or not prefix
            or not url.path.startswith(prefix)
            or url.username
            or url.password
            or url.port not in {None, 443}
            or "\\" in value
            or url.path.lower().endswith((".svg", ".gif"))
        ):
            return ""
        return value
    except ValueError:
        return ""


def feed_image(entry, source):
    from .feeds import plain_text

    candidates = [m.get("url") for m in entry.get("media_thumbnail", [])]
    candidates += [
        m.get("url")
        for m in entry.get("media_content", [])
        if m.get("medium") == "image" or m.get("type", "").startswith("image/")
    ]
    candidates += [
        m.get("href")
        for m in entry.get("links", [])
        if m.get("rel") == "enclosure" and m.get("type", "").startswith("image/")
    ]
    for candidate in candidates:
        url = safe_image_url(candidate, source.feed_url)
        if url:
            credit = plain_text(
                " · ".join(m.get("content", "") for m in entry.get("media_credit", [])), 240
            )
            return url, credit or f"Via {source.name}"
    return "", ""
