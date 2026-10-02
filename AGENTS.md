# Project guidance

- Read `docs/PROGRESS.md` first, then `docs/PROJECT_CONTEXT.md` for product scope.
- Keep React/TypeScript + Django REST Framework + PostgreSQL. Build one milestone at a time.
- Product UI, errors, code names and public README are English. Explain development in Chinese.
- Never present demo fixtures as live content or a mock response as a database check.
- Keep keys server-side and `.env` out of Git. Do not publish without authorization.
- Verified: `cd frontend && npm test`, `npm run build`; `cd backend && uv run python manage.py check`,
  `uv run ruff check .`, `uv run ruff format --check .`, `uv run pytest -k failure`.
- Pending environment acceptance: PostgreSQL migrations, `seed_demo` twice, complete `uv run pytest`.
- Update `docs/PROGRESS.md` with actual test results and remaining limits.
