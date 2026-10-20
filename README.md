# Worldline

A mobile-first English reading home for technology, economy, finance and music.
Worldline is a replaceable working name.

**M1 is implemented and locally verified:** official RSS imports, attributed source
excerpts, topic browsing, session sign-in and persistent private bookmarks. Updates
are manual. Scheduled updates, search, AI, public hosting and iOS remain later work.

## Architecture

```text
Browser → React / TypeScript / Vite → /api/ → Django REST Framework → PostgreSQL
Manual import command → reviewed RSS endpoints → PostgreSQL
```

Vite proxies `/api/` to Django on port 8000, preserving the browser's Host for
same-origin CSRF checks. All data access goes through Django. There are no paid
services or external API keys. Production must also use a same-origin deployment;
this repository currently contains local development configuration only.

```text
frontend/src/App.tsx          Reading pages and topic navigation
frontend/src/account.tsx      Sign-in, sign-out and bookmark controls
frontend/src/api.ts           Typed API calls and CSRF-protected writes
backend/news/models.py       Source, Topic, Article and Bookmark
backend/news/feeds.py        Bounded download, parse and idempotent import
backend/news/catalog.py      Reviewed source allowlist and usage notes
backend/news/auth.py         Django session authentication
backend/news/tests/          PostgreSQL, security and browser tests
frontend/e2e/                Real-browser reading workflow
compose.yaml                 Local persistent PostgreSQL
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
docker compose up -d --wait db
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

## Accounts and saved stories

Create your local administrator interactively:

```sh
cd backend
uv run python manage.py createsuperuser
```

Use [Django admin](http://127.0.0.1:8000/admin/) → Users to create normal reader
accounts without staff/superuser permissions. Existing Django users can sign in
at [the app login page](http://127.0.0.1:5173/login). Passwords are chosen locally;
there is no default product password, automatic account creation or public registration.

Select **Save story**, then **Saved stories**. Reloading retains your bookmarks.
**Remove bookmark** removes only your own bookmark. Sign-out clears the client
cache of personalized content. Anonymous requests cannot list or change bookmarks;
user IDs supplied in query strings or bodies do not select another user's records.

Sessions use Django's HttpOnly cookie. Login, logout and bookmark writes require
CSRF protection. Login has a basic 10-per-minute IP throttle using Django's local
cache; a shared throttle store and production hardening are needed before public deployment.

## Sources and dates

Initial feeds are NASA, BEA, Federal Reserve and Library of Congress music blog.
See [source scope and usage notes](docs/CONTENT_SOURCES.md). Only feed excerpts are
stored; no article-body scraping, photos, audio or AI-generated summaries.

The all-topic view alternates across topics, ordering by source publication date
within each topic. Topic views show their newest published items first. Unknown
dates remain unknown, and older music posts keep their dates. This is a small
selection of official institutional sources, not comprehensive news coverage.

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
login, persistence and cross-user bookmark isolation.

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

Health returns `{"status":"ok","database":"connected","stage":"M1"}` after a real
SQL query. It does not assert feed freshness; check source dates and import output.
Actual evidence and outstanding limits are in `docs/PROGRESS.md`.

## Stop, restart and troubleshoot

Stop frontend/backend with Ctrl+C in their terminals. Use `docker compose stop db`
to stop PostgreSQL, then `docker compose up -d --wait db` to restart it. The named
volume preserves data. `docker compose down -v` deletes that data and is not a
normal restart step.

- Database unavailable: check `docker compose ps` and `docker compose logs db`.
- Missing tables: run migrations before starting Django.
- Empty home: run `seed_sources` and `import_feeds`; samples are intentionally hidden.
- A feed fails: the command reports the source and exits nonzero after processing
  the remaining sources. Check its URL/availability; retry manually later.
- Sign-in fails: use a locally created active Django user; keep frontend and API
  on the documented origin. Do not disable CSRF to resolve a configuration problem.
- `npm run preview` serves build files only and does not proxy the API. Use the dev
  server for local full-stack work.

## Next milestones

M2 adds scheduled updates/retries, last-success visibility, search, CI and HTTPS
deployment. M3 adds cited AI search and language assistance. See
`docs/PROJECT_CONTEXT.md` for product scope. No repository or website has been
published by this work. Choose a license and review personal context documents
before making the repository public.
