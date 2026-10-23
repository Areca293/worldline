# M2 operations

Status: local development and deployment preparation. No public server/domain has
been provisioned and no physical iPhone Safari acceptance has been claimed.

## Scheduled updates on a development machine

From the root, start `docker compose up -d --wait db redis`. Apply migrations from
`backend` before starting workers. Keep the existing frontend and Django servers
running. Start the optional scheduler profile:

```sh
docker compose --profile scheduler up -d --build worker beat
docker compose logs --tail=100 worker beat
```

Run exactly **one Beat instance per environment**. Stop with
`docker compose --profile scheduler stop worker beat`. A sleeping/offline laptop
or stopped Docker cannot keep updating. Rebuild these containers after backend
code changes. The first hourly dispatch may take an hour; from `backend`, request
an immediate queued update with:

```sh
uv run python manage.py shell -c 'from news.tasks import dispatch_feeds; dispatch_feeds.delay()'
```

Manual `uv run python manage.py import_feeds` still works without Redis. Scheduled
updates use the Linux container worker's prefork pool and time limits. Native macOS
prefork execution failed during acceptance, so Docker is the verified local path;
do not start a second native Beat alongside the container. Each source
gets an independent job. Known feed/database/time-limit failures retry three times,
after 60, 120 and 240 seconds. Later hourly jobs try again after retry exhaustion.
Tasks expire instead of building an unlimited backlog. Import writes and success
timestamps commit together. A per-source PostgreSQL session lock spans download and
write; manual and worker updates share it. If a worker is killed, the next update
marks its unfinished run interrupted. No update changes the source publication date
unless the source itself provides a corrected date.

`Source updates` displays each active source's last successful check. More than two
hours without success is delayed, not proof of failure. Legacy M1 imports have no
historical run record, so their initial timestamp is unknown until the next success.
In admin, inspect Sources and Feed runs. Error records contain safe categories,
not response bodies. If PostgreSQL is unavailable, the attempt cannot be persisted;
consult worker logs. Disabling a source prevents new queued attempts from fetching it.

## Search and optional images

Apply migrations 0006 (the trusted PostgreSQL `pg_trgm` extension) and 0007 (optional
image metadata) before restarting API/worker containers. The database migration role
needs permission to create this extension; no separate search server is needed.
Spelling fallback runs only when scoped normal search returns no rows and is bounded
to eight words. It scans the filtered collection; at much larger data volumes, measure
latency before introducing a dedicated trigram vocabulary/index.

A normal `import_feeds` refresh fills optional image URLs for the four reviewed
media-capable feeds. It preserves article identity and bookmarks. Image files are
never fetched by the worker; browsers load them lazily from reviewed publisher hosts.
An unavailable image leaves the article readable with its existing source link.

## Repository observations

After upgrading, run migrations and `seed_sources` before rebuilding the scheduler.
The catalog has 14 RSS feeds and two GitHub API collections. The GitHub collections
share the existing source locks, audited imports and retry handling; normal operation
adds two unauthenticated search requests per hour, plus bounded retries. Incomplete
API results are failures, not successful empty updates. Do not add arbitrary API URLs.

Each sampled repository retains one observation per hour. Successful repository
imports remove observations older than eight days, while retaining articles and
bookmarks. Growth requires a real baseline 24–26 hours older than the latest
observation; the first day cannot show measured growth. A sleeping laptop, an API
failure or a repository leaving the limited candidate sample can interrupt tracking.
Observations over two hours old are marked stale and excluded from growth ordering.
The worker must keep running for history to accumulate; restarting it does not reset
stored observations. Repository metadata and observations are included in PostgreSQL
backups. No GitHub token is required by the current collectors.

## Production preparation

Use one Linux server with Docker Engine/Compose, persistent disk, a DNS hostname
pointing to it, and inbound TCP 80/443. Keep SSH access restricted. The supplied
configuration puts Caddy directly on the Internet; if adding a CDN/load balancer,
review trusted-proxy/IP handling before relying on login throttles.

Only Caddy publishes ports. PostgreSQL, Redis, Gunicorn, worker and Beat stay on
the internal Docker network. The separate production Compose project/volumes do
not reuse development data. Django runs with DEBUG off, secure cookies, same-origin
CSRF, HTTPS redirects and Redis shared throttles. Caddy overwrites forwarded client
IP/scheme headers. The API is not safe to expose directly with this proxy trust.
HSTS applies to this hostname; subdomain inclusion/preload are deliberately off.
`check --deploy` reports those two optional warnings until the operator explicitly
chooses a domain-wide policy. Rate limiting is basic abuse protection, not DDoS protection.

Before deployment: choose/review the repository license if publishing source;
review publisher usage terms; configure credentials privately; schedule backups.
Registration has no email verification/password reset yet. Do not claim either.

Prepare `.env.production` using `deploy/.env.example`. Set a unique random Django
secret of at least 50 characters and a different random database password. Store
them in a password manager. Do not put real values in shell history or commit them.

After server/domain approval, run on that server from the project root:

```sh
docker compose --env-file .env.production -f compose.production.yaml config --quiet
docker compose --env-file .env.production -f compose.production.yaml build
docker compose --env-file .env.production -f compose.production.yaml up -d --wait db redis
docker compose --env-file .env.production -f compose.production.yaml run --rm api python manage.py migrate --noinput
docker compose --env-file .env.production -f compose.production.yaml run --rm api python manage.py check --deploy
docker compose --env-file .env.production -f compose.production.yaml run --rm api python manage.py seed_sources
docker compose --env-file .env.production -f compose.production.yaml run --rm api python manage.py createsuperuser
docker compose --env-file .env.production -f compose.production.yaml up -d --wait api worker beat web
docker compose --env-file .env.production -f compose.production.yaml exec api python manage.py shell -c 'from news.tasks import dispatch_feeds; dispatch_feeds.delay()'
```

Caddy obtains/renews a public certificate only after DNS and ports work. Preserve
its data/config volumes. Frontend route refreshes fall back to index.html; API and
admin requests proxy to Django; Django admin static files ship in the web image.
No production dev server, frontend secrets or cross-origin cookie workaround.
Health checks execute a real PostgreSQL query; they do not prove queue freshness.
Inspect Feed runs and worker/Beat logs for that separately.

For an upgrade, take a backup, stop worker/Beat, build images, run migrations once,
then recreate API/worker/Beat/web. Keep the previous image and backup available.
Do not run `down -v`, reset the database, or run migrations in every web worker.
If a migration fails, stop and investigate before starting the new workers.

## Logs and maintenance

```sh
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs --tail=100 api worker beat web
docker compose --env-file .env.production -f compose.production.yaml exec worker celery -A config inspect ping
```

Container logs rotate at 10 MB, three files per service. Ingestion logs use source
IDs, outcome, error class and counts. Gunicorn logs method/path/status/duration,
excluding query strings, cookies and request bodies. Caddy access logging is off.
Do not enable verbose request logging with real credentials. FeedRun rows live in
PostgreSQL and can be retained for 90 days, then older completed runs deleted via
admin after reviewing the date filter; do not delete sources/articles for log cleanup.

If Redis is down, existing articles remain readable; scheduled jobs wait for broker
recovery and throttled account actions return a safe failure. Restart Redis and
worker, check logs, and enqueue a manual dispatch if necessary. If a source alone
fails, inspect its availability/policy, leave old articles intact and allow retry.
Do not loosen the URL allowlist to silence an error.

## PostgreSQL backup and recovery

Backups contain usernames, emails and private bookmarks. Keep the directory mode
700, files mode 600, encrypt off-host copies and limit access. A Docker volume on
the same server is not a backup. Example daily dump (run in a shell with `set -e`):

```sh
set -e
umask 077
mkdir -p backups
backup_file="backups/worldline-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose --env-file .env.production -f compose.production.yaml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "$backup_file.partial"
mv "$backup_file.partial" "$backup_file"
docker compose --env-file .env.production -f compose.production.yaml exec -T db pg_restore --list < "$backup_file" > /dev/null
```

Schedule this on the eventual server, alert on nonzero exit or missing/empty dump,
and copy encrypted backups off-host. Keep daily backups for 7 days and weekly ones
for 4 weeks if storage permits; review before removing older copies. Preserve the
matching app revision and secret configuration separately. Redis is not the source
of truth for articles/bookmarks; do not restore old queued jobs into a new deployment.

**First rehearse restoration into a new database**, never overwrite the live one:

```sh
docker compose --env-file .env.production -f compose.production.yaml exec -T db sh -c 'createdb -U "$POSTGRES_USER" worldline_restore_check'
docker compose --env-file .env.production -f compose.production.yaml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d worldline_restore_check --no-owner --no-acl --exit-on-error' < "$backup_file"
docker compose --env-file .env.production -f compose.production.yaml exec -T db sh -c 'psql -U "$POSTGRES_USER" -d worldline_restore_check -c "SELECT count(*) FROM news_article; SELECT count(*) FROM news_bookmark;"'
```

An existing restore database makes `createdb` fail safely; choose a new name.
Validate accounts, bookmark ownership, article dates, schema and counts using an
isolated app pointed at the restored database. For real recovery, stop all writers,
take a fresh pre-recovery snapshot, restore to a new database, change `POSTGRES_DB`
to that name, run compatible migrations and restart. Keep the old database until
the restored service is accepted. Rehearse at least monthly and after schema changes.

## Verification and pending acceptance

CI runs locked installs, Django checks/migration consistency, Ruff, PostgreSQL unit
tests, actual Redis/Celery integration, frontend tests/build, desktop/mobile browser
tests and Docker build. The broker test uses original fixture RSS in a disposable
database; it does not claim a real publisher download. To run it locally:

```sh
cd backend
TEST_REDIS_URL=redis://127.0.0.1:6379/15 uv run pytest -m integration -q
```

The test uses a random queue and never flushes Redis. Use a dedicated test Redis DB.
Browser test commands remain in README. A local HTTPS smoke test can use
`APP_DOMAIN=localhost`, `HTTP_BIND=127.0.0.1`, HTTP_PORT=18080 and HTTPS_PORT=18443
in a **separate** environment/project. Caddy uses its local CA; verify with that
test CA via `curl --cacert`, without changing system trust or ignoring TLS errors.
This does not validate public DNS, public certificates or an actual iPhone.

Once a domain/server is available, verify public certificate/redirects, register,
sign in/out, CSRF, search/filter/pagination, save/reload/remove, source failures and
backups. On a physical iPhone Safari, check keyboard/zoom, portrait/landscape,
safe areas, source-tab navigation, session persistence and offline recovery. Record
device/OS, site URL, date and results in PROGRESS before marking deployed M2 complete.

Implementation references: [Celery periodic tasks](https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html),
[Django PostgreSQL search](https://docs.djangoproject.com/en/5.2/ref/contrib/postgres/search/),
[Django production settings](https://docs.djangoproject.com/en/5.2/ref/settings/),
[Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).
