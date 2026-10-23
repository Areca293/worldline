# M3 — local research and reading assistance

## Scope and delivery

The user confirmed no provider keys are available. Build working local integration
paths and explicit unconfigured states; do not buy services, make paid calls, deploy
publicly, or claim live model quality/cost acceptance. Preserve all reader/admin
sessions, articles, bookmarks, routes and the existing collected-content search.

1. Backend: Brave Web Search and OpenAI Responses adapters behind fixed endpoints;
   evidence-only answers and reading transformations; authentication/CSRF, bounded
   inputs/output, timeouts, atomic daily quotas, private expiring caches, safe metrics.
   Test provider contracts with explicitly synthetic responses; commit.
2. Product: separate Web research route, article reading assistance, source-linked
   daily quotation. Build honest loading, unavailable, no-evidence, failure and quota
   states in the existing Modern Obsidian UI. Test and commit.
3. Acceptance: backend/frontend/browser regression, real local unconfigured checks,
   setup and evaluation documentation, progress and limitations; commit.

## Decisions

- Only explicit signed-in submissions may call providers. No AI work on page load.
- Brave returns at most five public web results; never fetch result URLs or full pages.
  Freshness is a provider page-age filter, not verified publication dates.
- Answers cite server-assigned evidence IDs. URLs and titles always come from the
  search response, never model-generated citations. Invalid citations/refusals fail
  closed. Prompts treat search snippets and source text as untrusted data, with no tools.
- Reading help processes only the saved excerpt/repository description (up to 8,000
  characters), not an invented full article. Summary/simple English are English;
  the requested translation is Simplified Chinese, while controls remain English.
- No chosen model default: OPENAI_MODEL must identify a model available to the user's
  account supporting Responses structured outputs. No claim about current pricing.
- Per-user and global daily admission quotas are PostgreSQL-locked and count failed
  attempts conservatively. One request per user can run at once. Max one search and
  one model call per admitted research request; no automatic retries.
- Cache keys are HMACs scoped by user, operation, evidence, model and prompt version.
  Reading results expire after 24h. Web caching defaults off: Brave requires explicit
  storage rights; enable a bounded TTL only after checking the chosen plan.
- Logs/usage records contain operation, safe outcome, duration, call counts and token
  usage, never query text, prompts, excerpts, responses, credentials or provider errors.
- Daily quotes are a small curated rotation from verified public-domain works, UTC
  dated, with work/chapter/source links; never generated or presented as news.

## UI inventory and design

The audience is a reader on a phone who wants to investigate a topic, inspect the
evidence, or understand an English excerpt. The screen's question is: what do the
retrieved sources support, and where can I check it?

Objects: submitted query; page-age window; up to five result titles/URLs/snippets;
unknown source publication dates; actual retrieval/generation times; cited answer
paragraphs; excerpt scope; requested transformation; current user's remaining daily
allowance; configured/unconfigured providers; an attributed daily quotation.

Use design-taste-frontend's app-screen workflow, retaining the existing True-black
flat direction (seed 1754154410) and user-approved three fonts/silver palette. No
redraw or rebranding. The signature is an answer beside its numbered evidence; on
phones they stack in reading order. A 92vw frame holds a readable answer column and
source column separated by 24px; below 900px use one column. No decorative imagery,
new marketing hero, charts, fake search results or ornamental animation. Existing
44px controls, natural text wrapping, focus outlines and reduced motion remain.

## External references checked 2026-10-23

- [Brave Web Search](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started)
- [Brave storage rights FAQ](https://brave.com/search/api/)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)

Live evaluation remains pending: provider access, factual entailment, freshness,
translation fidelity and invoice cost cannot be proven with mocked provider replies.

## Delivery status — 2026-10-23

All three local phases are complete. Backend integration: `6b1cf83`; interface and
quotations: `01b5ef2`. Final verification and provider setup/acceptance instructions
are recorded in [PROGRESS.md](PROGRESS.md) and [M3_OPERATIONS.md](M3_OPERATIONS.md).
This completes the agreed no-key local scope; it does not complete live-provider
quality/cost acceptance or authorize deployment.
