# Project guidance

- Read `docs/PROGRESS.md` first, then `docs/PROJECT_CONTEXT.md` for product scope.
- Keep React/TypeScript + Django REST Framework + PostgreSQL. Build one milestone at a time.
- Product UI, errors, code names and public README are English. Explain development in Chinese.
- Never present demo fixtures as live content or a mock response as a database check.
- Keep keys server-side and `.env` out of Git. Do not publish without authorization.
- Verified: `cd frontend && npm test`, `npm run build`; `cd backend && uv run python manage.py check`,
  `uv run ruff check .`, `uv run ruff format --check .`, `uv run pytest`.
- M1 PostgreSQL migrations and repeat RSS import are verified. Manual update: `uv run python manage.py import_feeds`.
- Browser acceptance: `cd backend && E2E_BROWSER_CHANNEL=chrome uv run pytest -m browser -q`
  (or install Playwright Chromium and omit the environment variable). Uses a disposable test database.
- Read `docs/CONTENT_SOURCES.md` before changing feeds. Keep URLs allowlisted and never store full feed content as a fallback summary.
- Update `docs/PROGRESS.md` with actual test results and remaining limits.
- M2: `TEST_REDIS_URL=redis://127.0.0.1:6379/15 uv run pytest -m integration -q`
  verifies real Redis/Celery with isolated fixture data. Read `docs/OPERATIONS.md` for
  scheduling, production setup and backup/restore. Public deployment/device acceptance
  remains pending until a server/domain and a physical iPhone are available.
