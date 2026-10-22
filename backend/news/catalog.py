"""Reviewed public feed endpoints. Add sources here only after reviewing their terms."""

from urllib.parse import urlencode

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

# Publisher-provided feeds for personal reading, not a full-text redistribution license.
FEEDS += [
    {
        "name": "OpenAI News",
        "topic": "AI Companies",
        "slug": "ai-companies",
        "website_url": "https://openai.com/",
        "feed_url": "https://openai.com/news/rss.xml",
        "terms_url": "https://openai.com/policies/terms-of-use/",
        "usage_notes": "Publisher-provided RSS for personal reading. Attributed titles, links and explicit feed excerpts only; no full text or media. Review terms again before public redistribution.",
    },
    {
        "name": "Google AI",
        "topic": "AI Companies",
        "slug": "ai-companies",
        "website_url": "https://blog.google/innovation-and-ai/technology/ai/",
        "feed_url": "https://blog.google/innovation-and-ai/technology/ai/rss/",
        "terms_url": "https://policies.google.com/terms",
        "usage_notes": "Publisher-provided RSS for personal reading. Attributed titles, links and explicit feed excerpts only; no full text or media. Review terms again before public redistribution.",
    },
    {
        "name": "Google DeepMind",
        "topic": "AI Models",
        "slug": "ai-models",
        "website_url": "https://deepmind.google/",
        "feed_url": "https://deepmind.google/blog/rss.xml",
        "terms_url": "https://policies.google.com/terms",
        "usage_notes": "Publisher-provided RSS for personal reading. Attributed titles, links and explicit feed excerpts only; no full text or media. Review terms again before public redistribution.",
    },
    {
        "name": "Hugging Face",
        "topic": "AI Models",
        "slug": "ai-models",
        "website_url": "https://huggingface.co/blog",
        "feed_url": "https://huggingface.co/blog/feed.xml",
        "terms_url": "https://huggingface.co/terms-of-service",
        "usage_notes": "Publisher-provided RSS for personal reading. Attributed titles, links and explicit feed excerpts only; no full text or media. Review terms again before public redistribution.",
    },
    {
        "name": "Mistral AI",
        "topic": "AI Models",
        "slug": "ai-models",
        "website_url": "https://mistral.ai/news",
        "feed_url": "https://mistral.ai/news/rss",
        "terms_url": "https://legal.mistral.ai/terms/eu-consumers-terms-of-service/",
        "usage_notes": "Publisher-provided RSS for personal reading. Attributed titles, links and explicit feed excerpts only; no full text or media. Review terms again before public redistribution.",
    },
    {
        "name": "Microsoft Research",
        "topic": "Science",
        "slug": "science",
        "website_url": "https://www.microsoft.com/en-us/research/",
        "feed_url": "https://www.microsoft.com/en-us/research/feed/",
        "terms_url": "https://www.microsoft.com/en-us/legal/intellectualproperty/copyright",
        "usage_notes": "Publisher-provided RSS for personal reading. Attributed titles, links and explicit feed excerpts only; no full text or media. Review terms again before public redistribution.",
    },
    {
        "name": "MIT Research",
        "topic": "Science",
        "slug": "science",
        "website_url": "https://news.mit.edu/",
        "feed_url": "https://news.mit.edu/rss/research",
        "terms_url": "https://news.mit.edu/terms-of-use",
        "usage_notes": "Publisher-provided RSS for personal reading. Attributed titles, links and explicit feed excerpts only; no full text or media. Review terms again before public redistribution.",
    },
    {
        "name": "ESA Space Science",
        "topic": "Science",
        "slug": "science",
        "website_url": "https://www.esa.int/Science_Exploration/Space_Science",
        "feed_url": "https://www.esa.int/rssfeed/Our_Activities/Space_Science",
        "terms_url": "https://www.esa.int/Services/Terms_and_conditions",
        "usage_notes": "Publisher-provided RSS for personal reading. Attributed titles, links and explicit feed excerpts only; no full text or media. Review terms again before public redistribution.",
    },
    {
        "name": "NVIDIA Developer",
        "topic": "Technology",
        "slug": "technology",
        "website_url": "https://developer.nvidia.com/blog/",
        "feed_url": "https://developer.nvidia.com/blog/feed/",
        "terms_url": "https://www.nvidia.com/en-us/about-nvidia/legal-info/",
        "usage_notes": "Publisher-provided RSS for personal reading. Attributed titles, links and explicit feed excerpts only; no full text or media. Review terms again before public redistribution.",
    },
    {
        "name": "Cloudflare Blog",
        "topic": "Security",
        "slug": "security",
        "website_url": "https://blog.cloudflare.com/",
        "feed_url": "https://blog.cloudflare.com/rss/",
        "terms_url": "https://www.cloudflare.com/website-terms/",
        "usage_notes": "Publisher-provided RSS for personal reading. Attributed titles, links and explicit feed excerpts only; no full text or media. Review terms again before public redistribution.",
    },
]

TOPICS = [
    ("Technology", "technology"),
    ("Economy", "economy"),
    ("Finance", "finance"),
    ("Music", "music"),
    ("AI Companies", "ai-companies"),
    ("AI Models", "ai-models"),
    ("Agents & Skills", "agents-skills"),
    ("Open Source", "open-source"),
    ("Science", "science"),
    ("Security", "security"),
]

# Stable source identities; the downloader adds a server-controlled 30-day activity window.

GITHUB_COLLECTIONS = {}
for name, topic, slug, query in [
    (
        "GitHub Agent Skills",
        "Agents & Skills",
        "agents-skills",
        "topic:agent-skills stars:>=10 archived:false fork:false",
    ),
    (
        "GitHub Active Open Source",
        "Open Source",
        "open-source",
        "stars:>=100 archived:false fork:false",
    ),
]:
    sort = "stars" if slug == "agents-skills" else "updated"
    endpoint = "https://api.github.com/search/repositories?" + urlencode(
        {"q": query, "sort": sort, "order": "desc", "per_page": 30}
    )
    GITHUB_COLLECTIONS[endpoint] = query
    FEEDS.append(
        {
            "name": name,
            "topic": topic,
            "slug": slug,
            "website_url": "https://github.com/",
            "feed_url": endpoint,
            "terms_url": "https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#h-api-terms",
            "usage_notes": "Official public repository search API. Up to 30 recently pushed candidates per collection: skills by total stars, general projects by recent update; only repositories with an identified license. Metadata and hourly aggregate star snapshots only, no code or stargazer identities. Not GitHub Trending or a comprehensive ranking.",
        }
    )

APPROVED_FEED_URLS = frozenset(item["feed_url"] for item in FEEDS)
