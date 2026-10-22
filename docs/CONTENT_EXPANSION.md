# Content expansion plan

Requested 2026-10-22: about ten topics, broader reviewed sources, AI company/model
news and discovery of popular GitHub projects and agent skills.

1. Expand the reviewed publisher catalog and idempotent topic seeding. Verify real
   endpoints and the existing bounded RSS importer; commit after catalog/feed tests.
2. Add official GitHub repository-search collections and hourly star observations.
   Preserve creation dates and article/bookmark identities. Calculate net star
   change only when an actual prior observation exists; no invented history or
   claims of a comprehensive GitHub Trending ranking. Verify adapter, duplicate,
   retry, time-window and search/filter behavior; commit backend changes.
3. Integrate repository metrics and ordering into the current reading pages, adapt
   ten-topic navigation and copy, and run browser/production-build regressions.
   Seed/import real sources, verify repeated imports, rebuild the scheduler and
   record coverage/limits; commit the verified UI and operations documentation.

Retain all existing routes, source settings, articles and accounts. No AI model
calls, paid API, code downloads/execution, public deployment or push. Search remains
keyword search over collected data. Model launch timing comes from attributed
announcements, never speculation presented as confirmed news.

## Component design

Keep the established reading desk, Archivo/Literata and Mist/Deep ink/Petroleum
palette in DESIGN.md. This is a component extension, not a new page direction.
The reader's question is: which collected projects deserve a closer look, and what
supports that interest? Keep the repository name/description primary; add total
stars and measured net change beside its source information, with actual observation
and baseline dates on detail. Missing growth is plain explanatory text, never zero.
One existing-style select offers reading order, total stars or observed growth.
At phone width, ten topic buttons scroll within their own row instead of pushing
reading several rows down. No charts, new fonts, decorative badges or new motion.
