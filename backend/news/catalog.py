"""Reviewed public feed endpoints. Add sources here only after reviewing their terms."""

FEEDS = [
    {
        "name": "NASA",
        "topic": "Technology",
        "slug": "technology",
        "website_url": "https://www.nasa.gov/",
        "feed_url": "https://www.nasa.gov/feed/",
        "terms_url": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
        "usage_notes": "NASA RSS text excerpts with attribution and links. No images, logos or full articles. Third-party material may have separate rights.",
    },
    {
        "name": "U.S. Bureau of Economic Analysis",
        "topic": "Economy",
        "slug": "economy",
        "website_url": "https://www.bea.gov/",
        "feed_url": "https://apps.bea.gov/rss/rss.xml",
        "terms_url": "https://www.bea.gov/resources/for-developers",
        "usage_notes": "Official news-release RSS for readers/developers. Store attributed titles and brief feed excerpts; link to the original release.",
    },
    {
        "name": "Federal Reserve Board",
        "topic": "Finance",
        "slug": "finance",
        "website_url": "https://www.federalreserve.gov/",
        "feed_url": "https://www.federalreserve.gov/feeds/press_all.xml",
        "terms_url": "https://www.federalreserve.gov/feeds/feeds.htm",
        "usage_notes": "Official RSS explicitly offered to readers and aggregators for headlines, links and brief summaries. No third-party images or full text.",
    },
    {
        "name": "Library of Congress — In the Muse",
        "topic": "Music",
        "slug": "music",
        "website_url": "https://blogs.loc.gov/music/",
        "feed_url": "https://blogs.loc.gov/music/feed/",
        "terms_url": "https://www.loc.gov/legal/security-copyright-and-privacy/understanding-copyright/",
        "usage_notes": "Official performing-arts blog RSS. Attributed brief feed excerpts only; no collection images, scores, recordings, lyrics or full text. Item-specific restrictions still apply.",
    },
]
APPROVED_FEED_URLS = frozenset(item["feed_url"] for item in FEEDS)
