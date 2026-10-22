# Content sources and import policy

Reviewed and fetched on 2026-10-20 for a local, personal reading application.
This is a small official-source selection, not broad news coverage. Source terms
and availability can change; review again before public or commercial deployment.

| Topic | Publisher / feed | Usage basis and scope |
| --- | --- | --- |
| Technology | [NASA RSS](https://www.nasa.gov/feed/) | [NASA usage guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/). Attributed NASA text excerpts; no logos, photos or third-party media. Includes space, science and engineering, not just consumer technology. |
| Economy | [BEA news releases](https://apps.bea.gov/rss/rss.xml) | [BEA developer resources](https://www.bea.gov/resources/for-developers) offer a news-release feed for summaries and data. Store a short source excerpt and link to the release. |
| Finance | [Federal Reserve press releases](https://www.federalreserve.gov/feeds/press_all.xml) | [Official feed documentation](https://www.federalreserve.gov/feeds/feeds.htm) describes reader/aggregator use for headlines, links and brief summaries. Covers monetary and regulatory announcements. |
| Music | [Library of Congress: In the Muse](https://blogs.loc.gov/music/feed/) | [LOC RSS guidance](https://loc.gov/rss/faq.html) and [copyright guidance](https://www.loc.gov/legal/security-copyright-and-privacy/understanding-copyright/). Official blog excerpts with attribution; item-specific third-party rights remain applicable. No scores, lyrics, collection images, audio or full posts. |

These are four US institutions. Broader geography and independent editorial
perspectives remain future source-selection work. Music posts may be weeks old;
the app shows their actual publication dates, with no claim that they are today's news.

## What is stored

- Source, topic, original link, title and a plain-text feed description/Atom summary
  limited to 600 characters. Longer excerpts end with an ellipsis.
- Original source GUID/Atom ID and its SHA-256 key; canonical URL with fragment,
  default port and known tracking parameters removed. Meaningful query parameters remain.
- `published_at`, `source_updated_at` and `collected_at` are separate. Missing or
  invalid publication dates remain null. An Atom update is not a publication date.
- HTML is converted to text, script/style content is discarded, and React renders
  text without `dangerouslySetInnerHTML`. A missing summary stays empty. The parser's
  implicit full-content fallback is explicitly disabled by checking XML provenance.
- Feed responses and article bodies are not archived. Nothing in an article is
  interpreted as a developer or model instruction. No AI is called.

## Operator workflow

Run `uv run python manage.py seed_sources`, then `uv run python manage.py import_feeds`
from `backend`. The first command preserves existing source settings. The second
reports created/updated/unchanged/skipped counts for each source; `--source ID`
selects one active source. A failed source does not erase stored articles or block
other sources; the command exits unsuccessfully after reporting all sources.

Use Django admin to enable/disable a source, change its topic, inspect policy notes
or inspect imported records. Active sources require a topic, feed and policy URL.
New network endpoints must also be reviewed and added to `news/catalog.py` before
admin accepts them. Readers cannot submit arbitrary URLs for backend fetching.

Only the exact reviewed HTTPS endpoints are fetched. DNS results must be public
addresses; the connection is pinned to the validated IP while retaining TLS
hostname verification. Redirects and compressed responses are rejected. Each feed
has a 2 MiB limit, a 100-entry limit, connection/read timeouts and a download-time
budget. DTDs/entities are rejected before parsing. OS-level DNS resolution timing
is separate from the download budget.

A per-source database lock serializes overlapping imports. Database unique
constraints protect canonical URLs, source identities and user/article bookmarks.
Conflicting IDs/URLs are skipped rather than silently merging different stories
or replacing their source attribution. Cross-source event clustering is not implemented.

Manual runs fetch the current feed window, not an exhaustive archive. M2 adds hourly
Celery dispatch, bounded per-source retries and audited attempts/last-success times;
see [operations](OPERATIONS.md). Feed endpoints and content policy are unchanged.
There is still no full-text scraper. Timestamp tracking starts with M2; it does not
invent success times for historical imports.

## Acceptance evidence

On 2026-10-20 the four feeds yielded 87 stored articles: NASA 10, BEA 47, Federal
Reserve 20, LOC 10. A second unchanged import created zero rows. One BEA entry had
no acceptable original URL and was skipped; no link or content was invented.
All 87 stored records had source publication dates. Database rows stay local and
are not committed as repository fixtures. Automated feed tests use original,
minimal RSS/Atom samples written inside the test code.
