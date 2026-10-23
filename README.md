# Worldline

A mobile-first English reading home for news, AI and open-source discovery across ten topics.
Worldline is a replaceable working name.

**M2 local development and deployment preparation, plus expanded content coverage:**
14 official RSS feeds and two GitHub repository collections, observed star growth,
scheduled updates/retries, source status, keyword search, registration and private bookmarks.
Production containers and CI are included. Public HTTPS deployment and physical
iPhone Safari acceptance await a server/domain; AI and iOS packaging remain later work.

## Architecture

```text
Browser → React / TypeScript / Vite → /api/ → Django REST Framework → PostgreSQL
Celery Beat → Redis → Celery workers → reviewed RSS / GitHub API endpoints → PostgreSQL
Manual import command → the same audited import path
```

Vite proxies `/api/` to Django on port 8000, preserving the browser's Host for
same-origin CSRF checks. All data access goes through Django. There are no paid
services or external API keys. Production must also use a same-origin deployment;
use `compose.production.yaml` for Caddy HTTPS, Gunicorn, workers and private data services.

```text
frontend/src/App.tsx          Reading pages and topic navigation
frontend/src/account.tsx      Registration, sign-in and bookmark controls
frontend/src/api.ts           Typed API calls and CSRF-protected writes
backend/news/models.py       Reading data, repositories and star observations
backend/news/feeds.py        Bounded download, parse and idempotent import
backend/news/catalog.py      Reviewed source allowlist and usage notes
backend/news/repositories.py Validated GitHub metadata and measured star change
backend/news/ingestion.py    Audited attempts and per-source overlap protection
backend/news/tasks.py        Hourly dispatch and bounded retries
backend/news/search.py       PostgreSQL keyword search and ranking
backend/news/auth.py         Django session authentication
backend/news/tests/          PostgreSQL, security and browser tests
frontend/e2e/                Real-browser reading workflow
compose.yaml                 Local PostgreSQL and Redis
compose.production.yaml      Prepared production stack (not deployed)
.github/workflows/ci.yml      Automated verification
```

## Prerequisites

- Node.js **24 LTS**, npm and [uv](https://docs.astral.sh/uv/getting-started/installation/).
- Python **3.12**, managed by uv; do not modify macOS system Python.
- [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/), running.
- Git. VS Code setup is described in `docs/GETTING_STARTED_ZH.md`.

## Start locally

From the repository root:

```sh
test -f .env || cp .env.example .env
docker compose up -d --wait db redis
```

The local `.env` is ignored by Git. Example credentials are for local development.
If port 5432 is occupied, change `POSTGRES_PORT` in `.env`; Compose and Django read
that same value. Do not delete the existing database volume when upgrading.

Backend terminal:

```sh
cd backend
uv sync --locked
uv run python manage.py migrate
uv run python manage.py seed_sources
uv run python manage.py import_feeds
uv run python manage.py runserver 127.0.0.1:8000
```

Frontend terminal, from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open [Worldline](http://127.0.0.1:5173). Use `127.0.0.1` consistently. If these
servers are already running, do not start another copy on the same ports.

To refresh content later, run `uv run python manage.py import_feeds` from `backend`.
Repeated imports update matching records and preserve their article IDs/bookmarks.
One source failing does not block other sources or delete existing content.
To enable hourly updates, keep one Celery worker and one Beat process running as
described in [operations](docs/OPERATIONS.md). Running Django alone does not schedule
updates. Feed run records are available in admin; source last-success times appear
under **Source updates**. Missing historical records are shown as unknown.

## Accounts and saved stories

Create your local administrator interactively:

```sh
cd backend
uv run python manage.py createsuperuser
```

Readers can use the independent [registration page](http://127.0.0.1:5173/register)
with a username, email, password and password confirmation. Registration validates
password strength, creates a normal reader and signs them in. Email is stored privately;
email verification and password recovery are not implemented yet. Existing users can
[sign in](http://127.0.0.1:5173/login). Administrators may also create reader accounts
in [Django admin](http://127.0.0.1:8000/admin/). There is no default product password.

Select the **star** (Save story), then **Saved stories**. Reloading retains your bookmarks.
Select the filled star (Remove bookmark) to remove only your own bookmark. Sign-out clears the client
cache of personalized content. Anonymous requests cannot list or change bookmarks;
user IDs supplied in query strings or bodies do not select another user's records.

Reader sessions use Django's HttpOnly cookie. Admin uses separate session and CSRF
cookies scoped to `/admin/`; signing in or out on either surface leaves the other
account and its CSRF token intact. The admin requires a separate login even if a
staff account is signed into the reader. After upgrading, sign into admin again;
if the old shared session already replaced your reader account, sign out of the
reader and sign back into your own account once. Existing bookmarks are retained.
Login, logout and bookmark writes require
CSRF protection, including anonymous registration. Login has a 10-per-minute IP
throttle and registration a 5-per-minute IP throttle. Local development uses a local
cache; the production settings use shared Redis behind a single trusted Caddy proxy.

## Reading controls

The responsive Modern Obsidian interface uses local DM Serif Display italic,
Geist Mono and Inter fonts with their bundled licenses. Desktop filters scroll
independently within the viewport; mobile topics scroll horizontally inside their
own row. Source updates sit after the content and pagination, so an expanded source
list cannot stretch the sidebar. Real content is never clipped to fit equal cards.

**Search stories** searches stored titles and descriptions using English keyword
matching (including word stems), with titles ranked above descriptions. All significant
words must match those fields; a source name or repository name containing the search
text also matches. Try `OpenAI`, `Mistral`, or `skills`. It does not search the web,
unavailable full articles, or answer natural-language questions with AI. Searches
accept up to 200 characters, combine with topics and pagination, and persist in the
URL. **Search saved stories** only searches the signed-in reader's collection.
If normal matching finds nothing within the current scope, English words of 4–40
characters (at most eight words) get a conservative spelling-similarity fallback.
This combines word similarity with a single-letter substitution, insertion, deletion
or adjacent-letter swap, including typos near the start of a word. For example,
`chatgpd`, `cjatgpt` and `cahtgpt` can find collected ChatGPT stories. All query words must still
match; the page explicitly labels similar spellings and preserves the original URL
query. Short terms and non-English queries do not expand. This is approximate keyword
matching, not automatic correction or semantic AI search. Private searches only use
the signed-in reader's bookmarks. PostgreSQL `pg_trgm` is installed by migration 0006.
Clear search restores browsing. Offline and failed requests have retry guidance.

Article and repository titles open the in-app detail. The diagonal arrow opens the source
in a new tab. The star at the lower right, aligned with the publication date, saves
or removes a bookmark; unsigned readers are directed to sign in.

Home and Saved stories provide numbered pages with the current page highlighted.
**Stories per page** offers 10, 20, 50, 100, a custom positive number, or **All (unlimited)**.
The URL retains the selection across reloads; changing the topic or size resets the
page. All loads the entire matching collection and can be slower for large libraries.

`/api/articles/` and `/api/bookmarks/` accept `q`, `page` and `page_size` (a positive integer
or `all`). Responses include `count`, `results`, `next`, `previous`, `page`, `page_size`
(null for All) and `total_pages`. Out-of-range pages resolve to the last available page,
including when removing bookmarks shrinks a collection. All still respects the topic
filter and the current user's bookmark permissions.

**Explore** switches between stories/projects, projects ordered by total stars, and
projects ordered by observed star growth. Combine it with **Agents & Skills** or
**Open Source**, a keyword and pagination; the URL retains the selection. Article
queries accept `sort=stars` or `sort=growth`. Repository details show the reported
license, creation/push dates, observation time and comparison baseline when available.

## Sources and dates

Ten topics: Technology, Economy, Finance, Music, AI Companies, AI Models,
Agents & Skills, Open Source, Science and Security. The original NASA, BEA, Federal
Reserve and Library of Congress feeds remain. New sources include OpenAI, Google AI,
DeepMind, Hugging Face, Mistral, Microsoft Research, MIT, ESA, NVIDIA Developer,
Cloudflare and two GitHub API collections. See [source scope and usage notes](docs/CONTENT_SOURCES.md).
Only short feed excerpts, repository metadata and optional reviewed thumbnail URLs
are stored; no article-body scraping, image archiving, audio, repository code or
AI-generated summaries. Google AI, DeepMind, MIT Research and Cloudflare feed images
can appear with source credit. Other feeds remain text-only. Failed images restore
the text layout. Images are loaded directly from reviewed media origins without a
referrer; they are not copied into the project or treated as reusable project assets.

GitHub collections sample up to 30 candidates each per hourly import, filtered for
recent activity and identified licenses. They are not a complete GitHub index or
global trending ranking. Total stars measure accumulated interest. Growth compares
actual observations 24–26 hours apart; a new project has no growth metric until that
history exists. Observations older than two hours are excluded from growth ordering.
The page distinguishes missing, zero, negative and stale growth. Projects outside
later samples remain readable with their last observation. Company feeds report
attributed announcements, not predictions of unannounced model release dates.

The all-topic view alternates across topics, ordering by source publication date
within each topic. Topic views show their newest published items first. Unknown
dates remain unknown, and older music posts keep their dates. This is a small
selection of institutional/company sources and repository metadata, not comprehensive news coverage.

Django admin maintains sources and articles. A new feed URL must first be added
to the reviewed allowlist in `backend/news/catalog.py`. Existing demo articles are
preserved but excluded from the normal feed; `seed_demo` and
`/api/articles/?samples=1` remain available for explicitly labeled learning samples.

## Verification

With PostgreSQL running, from `backend`:

```sh
uv run python manage.py check
uv run python manage.py makemigrations --check --dry-run
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

The PostgreSQL development user must have permission to create test databases.
Compose's initial user has it. Pytest creates and destroys a separate test database;
it does not run tests against normal reading data. Default tests cover RSS/Atom
provenance, duplicate imports, invalid feeds, safe network targets, CSRF, session
login, persistence and cross-user bookmark isolation. GitHub tests cover validation,
renames, repeat imports, real observation windows, stale data and combined search/sorting.

From `frontend`:

```sh
npm test
npm run build
```

For real-browser acceptance, install Chromium once with
`cd frontend && npx playwright install chromium`, then run from `backend`:

```sh
uv run pytest -m browser -q
# Alternatively, use an already-installed Google Chrome:
E2E_BROWSER_CHANNEL=chrome uv run pytest -m browser -q
```

This test harness creates isolated test users and an original test story in
Django's test database, starts a temporary Vite server, and exercises desktop and
mobile Chromium viewports. Screenshots/results go to pytest's OS temporary folder.
It does not modify your accounts or bookmarks. Mobile emulation is not an iPhone
Safari device test. Do not run `npm run test:e2e` directly; the harness supplies its
isolated API URL and temporary credentials.

```sh
curl -f http://127.0.0.1:5173/api/health/
curl -f http://127.0.0.1:5173/api/articles/
```

Health returns `{"status":"ok","database":"connected","stage":"M2"}` after a real
SQL query. It does not assert worker health or feed freshness. `/api/sources/` exposes
active sources' last attempt/success and status without private diagnostics.
Actual evidence and outstanding limits are in `docs/PROGRESS.md`.

Real Redis/Celery integration, production settings, HTTPS configuration, logs,
database backup/restore and device acceptance are documented in
[operations](docs/OPERATIONS.md). The integration test uses a separate Redis DB,
random queues, disposable PostgreSQL data and explicitly synthetic RSS fixtures.

## Stop, restart and troubleshoot

Stop frontend/backend with Ctrl+C in their terminals. If scheduled updates are enabled,
stop them first with `docker compose --profile scheduler stop worker beat`, then use
`docker compose stop db redis`. Restart data services with
`docker compose up -d --wait db redis`, then restart worker/Beat as described in
operations. Named volumes preserve data. `docker compose down -v` deletes that data
and is not a normal restart step.

- Database unavailable: check `docker compose ps` and `docker compose logs db`.
- Missing tables: run migrations before starting Django.
- Empty home: run `seed_sources` and `import_feeds`; samples are intentionally hidden.
- A feed fails: inspect Sources/Feed runs in admin. Scheduled tasks retry up to three
  times; manual commands exit nonzero after processing other sources. Old stories
  remain. Do not change publication dates to make old content look fresh.
- Sign-in fails: use a locally created active Django user; keep frontend and API
  on the documented origin. Do not disable CSRF to resolve a configuration problem.
- `npm run preview` serves build files only and does not proxy the API. Use the dev
  server for local full-stack work.

## Next milestones

M2 public deployment and physical Safari acceptance remain pending. M3 adds cited
AI search and language assistance. See
`docs/PROJECT_CONTEXT.md` for product scope. No repository or website has been
published by this work. Choose a license and review personal context documents
before making the repository public.
