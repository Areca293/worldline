# Worldline

A mobile-first English reading home for technology, economy, finance and music.
Worldline is a replaceable working name.

**Status: M0 scaffold implemented; PostgreSQL acceptance is still pending.**
The interface uses clearly labeled original sample copy, not live news. Real feeds,
login, bookmarks, search, AI assistance and deployment are later milestones.

## Architecture

```text
Browser → React / TypeScript / Vite → /api/ → Django REST Framework → PostgreSQL
```

The Vite development server proxies `/api/` to Django on port 8000. The browser
does not connect to the database. There are no external API keys or AI calls.
Production should serve the frontend and API from the same origin; this repository
does not yet contain a production deployment configuration.

```text
frontend/src/App.tsx      Pages, topic navigation and query states
frontend/src/api.ts       API types, HTTP requests and safe external links
frontend/src/styles.css   Responsive editorial layout
backend/config/          Django settings and URL configuration
backend/news/            Models, read-only API, admin, demo command and tests
compose.yaml             Local PostgreSQL with a persistent named volume
docs/                    Requirements, actual progress and learning notes
```

## Prerequisites

- Node.js **24 LTS** and npm (Node version hint: `.nvmrc`).
- [uv](https://docs.astral.sh/uv/getting-started/installation/); it manages Python **3.12** locally.
- [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/), installed and running.
- Git. VS Code is optional but recommended for editing.

Do not use the macOS system Python. No paid service, domain or AI key is needed.

## First start

Run from this repository root:

```sh
test -f .env || cp .env.example .env
docker compose up -d --wait db
```

`.env` is ignored by Git. Its example credentials are for local development only.
The database port is bound to loopback, not the local network. If port 5432 is
occupied, change `POSTGRES_PORT` in `.env`; Compose and Django read the same value.

Backend terminal:

```sh
cd backend
uv sync --locked
uv run python manage.py migrate
uv run python manage.py seed_demo
uv run python manage.py runserver 127.0.0.1:8000
```

Frontend terminal, starting from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open [the local app](http://127.0.0.1:5173). Use `127.0.0.1` consistently.
There should be four sample articles and an “API & database connected” footer.
If a request fails, the interface shows a retry action; it never silently inserts
hardcoded stories. Unknown publication dates remain unknown.

`npm run build` produces static files. `npm run preview` only previews that build;
it does **not** proxy Django. Use `npm run dev` for the local full-stack workflow.

Optional Django admin:

```sh
cd backend
uv run python manage.py createsuperuser
```

Open [Django admin](http://127.0.0.1:8000/admin/). This is developer administration,
not a product login or registration feature.

## Verification

With PostgreSQL running:

```sh
cd backend
uv run python manage.py check
uv run python manage.py makemigrations --check --dry-run
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

The local PostgreSQL user must be able to create a test database. Compose's initial
user can do this. Tests use a separate test database, not the normal article tables.
Tests cover repeatable demo seeding, topic filtering, missing articles, read-only
endpoints, empty results and safe handling of database failures.

```sh
cd frontend
npm test
npm run build
```

Frontend tests cover unavailable services, empty results, unknown dates and unsafe
external URL schemes. Browser-based checks and their limits are in `docs/PROGRESS.md`.

```sh
curl -f http://127.0.0.1:5173/api/health/
curl -f http://127.0.0.1:5173/api/articles/
```

Health must return `{"status":"ok","database":"connected","stage":"M0"}`.
Health uses a real PostgreSQL query; it does not assert that migrations or feeds are
up to date. Run migrations and check articles too. Run `seed_demo` twice: the
second run must report zero created articles.

## Stop and restart

Stop the frontend/backend with Ctrl+C in their terminals. From the repository root:

```sh
docker compose stop db
# Later:
docker compose up -d --wait db
```

The named volume preserves the database. `docker compose down -v` deletes that
volume and its data; it is not part of the normal restart workflow.

## Troubleshooting

- **Command not found:** install the prerequisites, open a fresh terminal and check
  `node --version`, `npm --version`, `uv --version` and `docker compose version`.
- **Cannot connect to Docker:** launch Docker Desktop and wait until its engine is ready.
- **Database connection refused:** run `docker compose ps` and `docker compose logs db`.
  Check `.env` and port availability before starting Django.
- **Missing tables:** run `uv run python manage.py migrate` from `backend`.
- **Empty home:** run `uv run python manage.py seed_demo`; do not expect live RSS in M0.
- **Frontend request failed:** verify both servers are running and inspect `/api/health/`.

## Scope and content

Sample text is written for this project. Reference links point to related public
resources; those sites did not publish these sample headlines or descriptions.
There are no copied articles, photos or generated news facts. `published_at` is
nullable and is kept separate from `collected_at`.

M1 will add approved RSS/Atom sources, stable import deduplication, login and private
bookmarks. M2 adds scheduled updates, search, CI and deployment. M3 adds cited AI
answers and language tools. See `docs/PROJECT_CONTEXT.md` for the full product plan.

No repository has been published. An open-source license must be chosen before
public release. The supplied context document is retained locally; review its
personal/background sections before making a public repository.
