# Content sources and import policy

Expanded and checked on 2026-10-22 for a local, personal reading application.
This is a small official-source selection, not broad news coverage. Source terms
and availability can change; review again before public or commercial deployment.

| Topic | Publisher / feed | Usage basis and scope |
| --- | --- | --- |
| Technology | [NASA RSS](https://www.nasa.gov/feed/) | [NASA usage guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/). Attributed NASA text excerpts; no logos, photos or third-party media. Includes space, science and engineering, not just consumer technology. |
| Economy | [BEA news releases](https://apps.bea.gov/rss/rss.xml) | [BEA developer resources](https://www.bea.gov/resources/for-developers) offer a news-release feed for summaries and data. Store a short source excerpt and link to the release. |
| Finance | [Federal Reserve press releases](https://www.federalreserve.gov/feeds/press_all.xml) | [Official feed documentation](https://www.federalreserve.gov/feeds/feeds.htm) describes reader/aggregator use for headlines, links and brief summaries. Covers monetary and regulatory announcements. |
| Music | [Library of Congress: In the Muse](https://blogs.loc.gov/music/feed/) | [LOC RSS guidance](https://loc.gov/rss/faq.html) and [copyright guidance](https://www.loc.gov/legal/security-copyright-and-privacy/understanding-copyright/). Official blog excerpts with attribution; item-specific third-party rights remain applicable. No scores, lyrics, collection images, audio or full posts. |

The initial four US institutions remain enabled. The additional publisher feeds
below widen coverage to company announcements, models, European space research,
security and developer tooling. Corporate feeds are first-party statements, not
independent reporting or evidence of unannounced release dates. Music posts may be weeks old;
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
see [operations](OPERATIONS.md). Only reviewed catalog endpoints are enabled.
There is still no full-text scraper. Timestamp tracking starts with M2; it does not
invent success times for historical imports.

## Acceptance evidence

On 2026-10-20 the four feeds yielded 87 stored articles: NASA 10, BEA 47, Federal
Reserve 20, LOC 10. A second unchanged import created zero rows. One BEA entry had
no acceptable original URL and was skipped; no link or content was invented.
All 87 stored records had source publication dates. Database rows stay local and
are not committed as repository fixtures. Automated feed tests use original,
minimal RSS/Atom samples written inside the test code.

## Expansion reviewed on 2026-10-22

| Topic | Official feed | Policy / scope |
| --- | --- | --- |
| AI Companies | [OpenAI News](https://openai.com/news/rss.xml) | [Terms](https://openai.com/policies/terms-of-use/); publisher-provided RSS headlines, links and feed excerpts for personal reading only. |
| AI Companies | [Google AI](https://blog.google/innovation-and-ai/technology/ai/rss/) | [Terms](https://policies.google.com/terms); product/company announcements. |
| AI Models | [DeepMind](https://deepmind.google/blog/rss.xml) | [Terms](https://policies.google.com/terms); research/model announcements, not a release calendar. |
| AI Models | [Hugging Face](https://huggingface.co/blog/feed.xml) | [Terms](https://huggingface.co/terms-of-service); model/tooling blog, including contributed posts. |
| AI Models | [Mistral](https://mistral.ai/news/rss) | [Terms](https://legal.mistral.ai/terms/eu-consumers-terms-of-service/); official announcements. |
| Science | [Microsoft Research](https://www.microsoft.com/en-us/research/feed/) | [Copyright](https://www.microsoft.com/en-us/legal/intellectualproperty/copyright); research feed excerpts only. |
| Science | [MIT Research](https://news.mit.edu/rss/research) | [RSS syndication terms](https://news.mit.edu/terms-of-use); attribution and original links retained, no photos. |
| Science | [ESA Space Science](https://www.esa.int/rssfeed/Our_Activities/Space_Science) | [Terms](https://www.esa.int/Services/Terms_and_conditions); attributed personal reading, no media. |
| Technology | [NVIDIA Developer](https://developer.nvidia.com/blog/feed/) | [Terms](https://www.nvidia.com/en-us/about-nvidia/legal-info/); engineering and AI infrastructure, feed excerpts only. |
| Security | [Cloudflare](https://blog.cloudflare.com/rss/) | [Terms](https://www.cloudflare.com/website-terms/); security and network engineering, includes company product news. |

Only explicit RSS descriptions/Atom summaries are retained (up to 600 characters),
not content:encoded, page bodies, code, images or model weights. Availability of a
feed does not grant a general redistribution license. Review terms before public
use; these additions are scoped to the existing local personal reader.

Rejected candidates: Anthropic's guessed news RSS returned 404, Microsoft's old AI
feed returned 410, ECB failed certificate validation, and the old Google Security
feed redirected to HTTP. No TLS or URL safeguards were relaxed. Anthropic company
news is not covered by a direct news feed in this catalog.
