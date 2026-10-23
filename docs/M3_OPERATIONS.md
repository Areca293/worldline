# M3 local assistance: setup and acceptance

Local implementation is ready. **Real provider access, answer quality, freshness,
translation fidelity and cost have not been accepted:** no keys were available.
Automated provider responses are explicitly synthetic test fixtures. Public
deployment is outside this delivery.

## Use without keys

Start the existing Django and Vite servers as described in the README. Apply
`uv run python manage.py migrate` from `backend` when upgrading. Migration
`assistance.0001` adds quota, cache and usage tables; it does not replace reading data.

- `/research`: a separate **Web research** page, explicitly unconfigured. The usual
  **Search stories** still searches collected content, without any external service.
- `/articles/:slug`: expand **Reading assistance**. Original excerpts remain readable;
  processing is disabled until a model is configured. Demo stories are excluded.
- Home: five verified public-domain quotations rotate by UTC date, with author,
  work, chapter and original-edition link. No model or external daily fetch is used.

No provider calls occur on page load. A reader must sign in and explicitly submit.
Admin and reader sessions remain independent.

## Configure later, only when ready to use the services

Keep keys in the existing root `.env`, never in frontend variables, Git, screenshots
or chat. Merge the optional fields from `.env.example`; **do not overwrite an
existing `.env`**. Review provider pricing, account budgets and applicable data terms
before enabling calls. This work does not create provider accounts or buy credits.

| Setting | Default | Purpose |
| --- | --- | --- |
| `AI_ENABLED` | `false` | Master switch; set `true` to enable configured services |
| `BRAVE_SEARCH_API_KEY` | empty | Brave Web Search access |
| `OPENAI_API_KEY` | empty | OpenAI Responses access |
| `OPENAI_MODEL` | empty | Account-available model supporting Responses structured outputs |
| `AI_USER_DAILY_LIMIT` | `10` | Admitted requests per reader, maximum 100 |
| `AI_GLOBAL_DAILY_LIMIT` | `50` | Admitted requests across all readers, maximum 1,000 |
| `AI_MAX_OUTPUT_TOKENS` | `1200` | Model output budget, bounded to 256–4,096 |
| `AI_WEB_CACHE_SECONDS` | `0` | Web result cache disabled; maximum 3,600 seconds if storage rights permit |

Restart Django after changing settings. Model access and schema compatibility must
be tested using your chosen account/model; the status API only checks that required
configuration exists, **not** that credentials or billing work. Search-only setup is
supported with a Brave key; reading-only setup needs the model key and model name.
`AI_ENABLED=false` disables both while retaining ordinary reading and quotations.

Web result storage requires explicit rights under the chosen Brave plan. Leave its
TTL at zero unless those rights are confirmed. Consult the official
[Brave documentation](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started),
[storage FAQ](https://brave.com/search/api/) and
[OpenAI structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

## Data flow and limits

Research sends the submitted question to Brave and, when configured, that question
plus returned titles/URLs/snippets to OpenAI. Reading assistance sends only saved
source metadata and up to 8,000 characters of the excerpt/repository description.
Do not enter private information in research. There is no arbitrary URL fetch,
full-article scraping, model tool access or automatic background generation.

Research accepts 3–300 characters and returns at most five public-link results with
snippets capped at 1,200 characters each. Page-age filters are any time, past day,
week or month; a provider page update is not proof of publication. Unknown publication
dates remain unknown. Retrieval and generation timestamps record actual operations;
cached output retains its original timestamps.

The model must return structured paragraphs with server-assigned evidence IDs. Invalid
or absent citations, refusals, incomplete output and malformed responses fail closed.
Source links are supplied by search or stored article records, not invented by the
model. **A valid citation ID does not establish that the cited text supports a claim.**
Human evidence checking remains necessary. A model failure preserves available web
results; no evidence means no generated answer. Translation is Simplified Chinese;
summary, simpler-English output and all controls/operational messages are English.

Provider transport uses fixed HTTPS endpoints, no redirects or automatic retries,
a 3-second connect timeout, 25-second read timeout, a 30-second urllib3 total timeout
configuration and a 1 MB response cap. These are transport limits, not a hard
end-to-end wall-clock deadline for both providers. Repeated manual retries can incur
additional provider charges.

PostgreSQL atomically reserves daily global and reader quotas. Every admitted uncached
attempt counts, including failures; cache hits do not. Counters roll over at 00:00 UTC.
One request per reader may run at a time, and the API also throttles to 10 requests/minute.
A research attempt makes at most one search and one model call; reading makes at most
one model call. Global exhaustion may block a reader who still has a personal allowance.
These request limits are **not a currency spending cap**. Configure provider-side budgets
where available and inspect invoices.

Reading results are cached for 24 hours, scoped to the authenticated user, source
text/metadata, task, model, credentials and prompt version. Web caching is opt-in as
above. Cache keys are HMACs; cached payloads contain source text and generated results
and can incidentally repeat question terms. Questions are not kept as a separate
history, URL query, browser local-storage item or log field. Signing out clears the
current private UI; server cache rows expire rather than being deleted on sign-out.
Deleting a user cascades their cached results. Backups may retain earlier data.

OpenAI requests set `store: false`; this is not a promise of zero provider retention.
Provider policies still apply. Application usage logs omit questions, excerpts,
responses, credentials and raw provider diagnostics. They record operation, outcome,
elapsed time, call counts and available input/output token counts. Missing token
usage is unknown, never assumed to mean a free request.

## Local operations

From `backend`, with the database running:

```sh
uv run python manage.py assistance_usage
uv run python manage.py prune_assistance
```

The first command reports today's admitted, uncached attempts grouped by outcome.
It is not an invoice or a complete access audit. The second deletes expired result
rows and quota/usage records older than 30 days. Run it periodically when assistance
is in use; no new scheduler is installed. Normal requests also prune expired results.
Retention tests verify current entries and accounts survive cleanup.

`GET /api/ai/status/` exposes configured capabilities and the authenticated reader's
allowance, never keys. `POST /api/ai/research/` accepts `query` and `window`.
`POST /api/ai/articles/<slug>/` accepts `mode` (`summarize`, `translate`, `explain`).
Both POST routes require reader authentication and CSRF. `GET /api/quotes/today/`
is public. Health's `stage: M3` identifies installed code; its SQL check does not
assert provider access, answer quality, worker health or content freshness.

## Fixed live acceptance set — pending keys

Use one signed-in test reader, a small daily limit and a recorded UTC evaluation date.
Do not change stored real articles to manufacture a desired result. For excerpt tasks,
choose a collected item containing numbers and uncertainty and record its slug and
exact source text for repeat comparisons. Only run after deciding to spend provider
credits; this table has **not** been run against real services.

| Case | Input/action | Acceptance criterion |
| --- | --- | --- |
| Current announcement | `What has OpenAI announced in the past week?`, week filter | Compare each claim with its linked snippet and original page; no unsupported release dates; unknown dates remain unknown |
| Project discovery | `Which recently discussed open-source agent skills projects have public repositories?`, week filter | Real repository/source links; no claim of complete GitHub coverage or measured star growth from snippets |
| Unsupported forecast | `What exact date will the next unannounced frontier model launch?` | Insufficient evidence or explicitly supported announced facts only, no fabricated prediction |
| Missing evidence | `worldline-m3-no-results-7b40f19c` | If provider returns zero results, no model call; if it returns irrelevant text, answer must acknowledge insufficient evidence |
| Summary | Summarize the chosen collected excerpt | All factual claims supported; preserve numbers, names, negation and uncertainty; never describe an unseen full article |
| Translation | Translate the same excerpt | Simplified Chinese faithfully preserves claims, quantities and caveats; no additions or omitted negation |
| Simple English | Explain the same excerpt | Easier vocabulary and sentence structure without new facts |
| Cache | Repeat the identical excerpt task | Cached label and original generation time; no extra admission or provider call |
| Failure | Invalid local test credential or temporarily unavailable service | Honest failure; no fake answer; source results survive a model-only failure; manually restore valid configuration |
| Quota | Reach a deliberately small test-reader limit | 429 and visible limit text; no extra provider call; refresh allowance |

Record provider/model, UTC timestamps, retrieved URLs, correctness findings, token
counts, call count, latency and provider-reported charges. Check **every** output claim
against evidence and retain failed cases; one good answer does not establish reliability.
Provider content and pricing can change, so do not turn sample findings into guarantees.

Automated checks cover these state/contract boundaries using fixtures, plus private
cache isolation, concurrent admission, CSRF, unsafe citations, malformed/refused output,
transport errors, retention and responsive layouts. They do not measure real language
quality or real cost. Run database suites sequentially (default, browser, integration)
because they use the same disposable test database name. Exact completed runs are in
[PROGRESS.md](PROGRESS.md).
