# M2 delivery plan

Scope agreed on 2026-10-22: complete local development and deployment preparation.
The server/domain are not available yet. Public HTTPS and physical iPhone Safari
acceptance remain pending; local tests must not be presented as those checks.

1. Scheduled ingestion: Celery, Redis and one Beat scheduler; hourly dispatch of
   independent source tasks, bounded exponential retries, PostgreSQL attempt records,
   source last-success timestamps and overlap protection shared with manual imports.
   Verify success/failure isolation, retries, stale runs, duplicates and timestamps.
2. Reading: PostgreSQL English keyword search over stored titles/excerpts; preserve
   topic and page controls in URLs, private saved-story search, source update status,
   clear loading/empty/offline/server-error states. Keep the existing reading design.
   Verify API filtering/ranking/privacy and desktop/mobile workflows.
3. Operations: GitHub Actions, production Docker/Compose and same-origin Caddy HTTPS,
   shared throttling cache, safe production settings, log retention and documented
   PostgreSQL backup/restore. Build and smoke-test locally using disposable services;
   document the exact outstanding deployment and device checks.

Each stage gets its own Conventional Commit after relevant checks. No push,
production deployment, real-account changes, feed expansion, AI or M3 work.
