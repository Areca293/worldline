# M3 local assistance: setup and acceptance

Local implementation supports **LM Studio**, official OpenAI, and an optional
allowlisted **relay** Chat Completions adapter. Relay code is implemented but real
access/schema/quality/cost acceptance is pending; see [relay setup and rollback](CLAUDE_RELAY.md).
As of the latest 2026-10-27 check, the ignored local `.env` selects relay /
`claude-sonnet-5` and contains a nonempty relay key. A fresh Django process reports
all three capabilities enabled. Before the user's subsequent restart, the existing
server on port 8000 reported `answers=false` and `reading_help=false`.
After restart the reading form is available, but two submitted summaries failed
answer validation; see the relay diagnostics below. Fully stop the original `runserver`
with Ctrl+C and start it again from its terminal; refreshing the browser or
reloading Python source is not a reliable way to reload `.env`. If the mismatch
persists, check environment variables exported by that terminal or service:
`load_dotenv` preserves existing process environment values, including empty ones.
The user's subsequent diagnostic response confirms a billed model response, but
that response violated the requested strict schema. The latest prompt improvements
below have only synthetic contract-test coverage; live success remains unverified.
The installed
Spark model has been exercised through real API requests and the webpage; the small
corpus and known wording limitations are recorded in [local acceptance](LOCAL_MODEL_ACCEPTANCE.md).
A user-provided Brave key was configured locally on 2026-10-26. One real browser
research request returned five web sources and a cited answer from the local model
in 15.409 seconds. This verifies connectivity, not broad answer quality or cost.
Automated provider tests remain explicitly synthetic. Public deployment is outside
this delivery.

## Local-model startup on this Mac (optional rollback)

When choosing `AI_MODEL_PROVIDER=lmstudio`, keep Bionic (the installed LM Studio-compatible app) running with the existing
`spark-x2.6-4b` model loaded. Preserve the user's saved temperature 0.2, output cap
1200 and thinking-off settings. No need to download another model. In a terminal:

```sh
"$HOME/.lmstudio/bin/lms" ps
"$HOME/.lmstudio/bin/lms" server status
# Only if stopped; current machine uses 1235, not the common default 1234:
"$HOME/.lmstudio/bin/lms" server start --bind 127.0.0.1 --port 1235
```

If the model is not listed by `lms ps`, load the same downloaded model from the app's
model selector using its saved configuration. Then start Worldline normally:

```sh
cd /Users/a11/Desktop/worldline
docker compose up -d --wait db redis
# Backend terminal (skip if already running):
cd backend
uv run python manage.py runserver 127.0.0.1:8000
# Separate frontend terminal:
cd /Users/a11/Desktop/worldline/frontend
npm run dev
```

For local-model rollback, restore the following values in the ignored `.env`.
The current selection is relay; the local settings and downloaded weights were preserved:

```dotenv
AI_ENABLED=true
AI_MODEL_PROVIDER=lmstudio
LM_STUDIO_BASE_URL=http://127.0.0.1:1235/v1
LM_STUDIO_MODEL=spark-x2.6-4b
LM_STUDIO_TIMEOUT_SECONDS=60
LM_STUDIO_CONFIG_REVISION=spark-q4km-llamacpp264-thinkingoff-v1
```

No OpenAI key is needed in this mode. `LM_STUDIO_API_KEY` is optional and only needed
if you later enable API authentication in LM Studio. After changing `.env`, restart
Django. Do not overwrite the rest of the file. The source default remains opt-in/off.

At `http://127.0.0.1:5173`, sign in and open an article with a source excerpt. Expand
**Reading assistance**, select **Summarize excerpt**, **Translate to Chinese** or
**Explain in simple English**, then **Process excerpt**. Check **Text used for this
response** and the citation against the saved source. Repeating the same task should
show **Cached result** with its original timestamp. Successful uncached requests and
failed attempts count toward the existing allowance.

The fourth function, evidence-based web answers, is under **Web research**. On this
Mac, Brave is now configured: sign in, enter a question, select a page-age range and
choose **Search the web**. The page displays actual search snippets alongside the
local model's cited answer. For the first live check, “What are Agent Skills in
GitHub Copilot?” with **Any time** returned five sources. Inspect the snippets:
valid citation IDs do not prove every interpretation is correct. Do not interpret
`reading_help: true` as search availability or a model health check.

The current Django server is **native macOS** and reaches the host's loopback directly.
Inside a Docker API container, `127.0.0.1` would mean that container. The adapter also
permits a server-configured `host.docker.internal` gateway, but that path requires
separate connectivity verification. No container model integration or wider bind was
enabled; do not switch to `0.0.0.0` to work around it in this local setup. Keep CORS off:
the browser talks to Django, not directly to the model.

For endpoint verification without credentials, use `curl http://127.0.0.1:1235/v1/models`
and `curl http://127.0.0.1:5173/api/ai/status/`. The verified local configuration on 2026-10-26 was
`web_search=true`, `answers=true`, `reading_help=true`. With the current relay selection
and a nonempty relay key, a fresh process reports all three capabilities enabled;
the earlier server needed a complete restart to match. Availability only verifies
configuration. A stopped server produces a visible failure when a noncached task is
submitted; restart it and use **Try assistance again**. Cache hits can still work
while it is stopped. No automatic retries or public exposure are enabled.

## If an assistance action is unavailable

- **No saved excerpt:** the article shows an explanation and **Open original article**
  instead of a disabled task form. A title or a link is not an excerpt. Summarizing,
  translating and simplifying work only on the saved source text; Worldline does not
  fetch the full page as a fallback. Choose an article with a source excerpt or a
  repository with a description.
- **Web research not configured:** the local model is not a web search engine. Set
  your existing Brave key in the root `.env` as `BRAVE_SEARCH_API_KEY`, preserving
  other values. Restart Django, then use **Check availability again** on `/research`.
  No OpenAI key is required when the local model is selected. Never enter keys into
  the browser or chat. Configuration success does not verify provider credentials;
  an actual research submission is needed to verify access.
- **Reading assistance not configured:** check the local model settings above,
  restart Django after configuration changes, and use **Check availability again**.
- **Relay key filled but still unconfigured:** compare the running server's
  `/api/ai/status/` with a fresh process loading the same root `.env`. On
  2026-10-27 the running server returned `web_search=true`, `answers=false`,
  `reading_help=false`, while the fresh process returned all three as true.
  This failure occurs before a provider request, so it does not establish a bad
  key, insufficient balance or unsupported model. Fully stop and restart the
  original backend, then refresh status before attempting one real task.
- **Account/status could not be checked:** use **Retry account** or **Retry status**.
  Anonymous readers get a sign-in link returning to the current page. Once the
  account and configuration are available, the task form appears.
- **A submitted request fails:** keep the real error visible. Restore the model or
  search connection, then use the retry action. Do not reset quota counters to hide
  failed attempts. A successful retry may consume another daily request.

### Relay response diagnostics

`invalid_answer` means the response failed the local output contract. This includes
JSON, field types, source IDs and usage shape; it is not a semantic fact-checking
result. Provider usage or billing does not establish that its output is valid.

On 2026-10-27 both inspected failed calls used the `claude性价比` group and their
provider details reported a `system` parameter override enforcing a Windows GBK
terminal and ASCII-only output. This conflicts with the application's instructions
and Chinese translation. Those inspected details did not include answer text.
Subsequently, the user supplied a real `debug_relay --send` result: finish_reason
was stop, but content was a fenced JSON object with summary/limitations rather than
evidence_sufficient/paragraphs/limitations and cited source_ids. It failed JSON parsing
at position 0; even without fences the field structure would fail validation.
This proves the observed call did not honor the strict output contract. It does not
identify which layer ignored Schema, or prove the system override is the sole cause.
No raw response is retained in this document.

The project now repeats a complete Relay-only output contract in both system and
user messages: exact fields/types, actual nonempty-evidence IDs, supported and
insufficient-evidence shape examples, length bounds, language/task rules and an
explicit ban on fences, preambles and extra fields. The serialized question and
evidence remain untrusted data; example text is explicitly not evidence to copy.
This reduces dependence on response_format enforcement and on the original system
message surviving the relay. It cannot guarantee compliance with rewritten upstream
instructions. response_format=json_schema and strict=true remain in every request.

Translation prompts describe standard JSON Unicode escapes for ASCII-only output:
one JSON decode must yield actual Simplified Chinese, with equivalent amounts
(USD $12 million = 1200 万美元), original currency, negation and uncertainty retained.
This is normal JSON string decoding, not a second unescaping pass or output repair.
Double-escaped text and English substitutions are not evidence of successful Chinese
translation; human language review remains required. The parser checks structure and
IDs, not semantic entailment, language quality or exact translation completeness.

There is no new permissive parser mode: fences, wrong summary fields, missing/invalid
citations and damaged or partial JSON still fail. No normalization, citation filling,
automatic retry, group/model switch or provider fallback was added. More prompt text
may increase input tokens; Unicode escapes may use more output tokens. The existing
1200-token cap remains unchanged, so truncation still fails rather than silently
raising the limit. Relay cache configuration now includes prompt_version
`relay-evidence-v2-explicit-contract`; old relay cache keys differ without clearing
data. Official OpenAI and LM Studio prompts and cache fingerprints are unchanged
by this particular update.

New failures log only a static category in the Django terminal:

```text
model_response_rejected reason=invalid_json
```

| Reason | Meaning |
| --- | --- |
| `invalid_json` | Answer content cannot be parsed as JSON, including fenced JSON |
| `answer_shape` | Top-level fields or types do not match the contract |
| `evidence_consistency` | Evidence flag, paragraphs or limitations are inconsistent |
| `paragraph_shape` | A paragraph is missing required text or source IDs |
| `invalid_citations` | A source ID is not an allowed integer evidence ID |
| `answer_length` | Answer text exceeds the existing length limits |
| `invalid_usage` | Reported token usage is malformed |
| `response_shape` | Provider message/choices envelope is malformed or unsupported |
| `scope_language` | Local translation scope note fails its English/ASCII constraint |

These warnings omit keys, questions, evidence, model output and raw provider errors.
Earlier failures cannot be classified retrospectively because their bodies were
not saved. Observe one deliberate request after loading the updated backend code;
do not repeatedly retry or weaken validation without the actual failure category.

### Inspect model presets and returned content locally

Worldline already supplies system instructions and operation-specific prompts for
all four tasks, plus temperature, output cap and a strict evidence JSON Schema.
They are sent on every request; there is no separate model-training or dashboard
preset step. A relay can still rewrite or ignore these parameters.

From `backend`, preview the actual Chat Completions request body without sending:

```sh
uv run python manage.py debug_relay
```

To send exactly one diagnostic request with the selected relay configuration:

```sh
uv run python manage.py debug_relay --send
```

For the first post-change check, run that single summary request only. Look for
finish_reason=stop and `Validation passed`, then inspect the returned object's three
fields and each paragraph's integer source_ids (the diagnostic fixture uses ID 1).
Check the synthetic excerpt's $12 million, 12 participants, preliminary results and
the absence of established safety/effectiveness. Valid JSON and IDs alone do not
prove factual support. A fence or summary field is still a genuine failure: stop
and retain only the safe failure category/token counts, rather than repeatedly
spending credits. Translation, simple-English and Brave Research remain separate
later evaluations, not implicitly validated by a successful summary.

The command starts its own process and reads the existing root `.env`; it does not
need a web-server restart. Live diagnostics require the existing local DEBUG=true
configuration and relay selection. Do not enable DEBUG on a production server.
The input is a clearly labeled fictional research excerpt, not a database article.
No search, database, account quota or cache is used; these calls do not appear in
Worldline UsageEvent statistics, but can be billed and appear at the provider.

Read the `RESPONSE` section: `content` is the returned message text, JSON-escaped
for terminal safety and redacted for configured credentials. It is not repaired,
stripped of Markdown or accepted automatically. A preview over 20,000 characters
is explicitly marked truncated. `finish_reason`, reported model, token usage and
JSON error location help distinguish plain prose, fenced JSON, extra explanations,
truncation and empty content. Reasoning text and raw transport diagnostics are not
printed. The same response validator used by the webpage runs after display and
returns a nonzero exit on failure.

Raw message content is visible only in this deliberate command, not in normal web
logs or public API responses. Old response bodies were not stored and cannot be
recovered with this command. Use the returned content to choose a targeted prompt
or adapter change rather than assuming the relay preserves system/Schema settings.

## Use with assistance disabled

Start the existing Django and Vite servers as described in the README. Apply
`uv run python manage.py migrate` from `backend` when upgrading. Migration
`assistance.0001` adds quota, cache and usage tables; it does not replace reading data.

- `/research`: a separate **Web research** page, unconfigured without Brave. The usual
  **Search stories** still searches collected content, without any external service.
- `/articles/:slug`: expand **Reading assistance**. Original excerpts remain readable;
  the processing form appears once a local or remote model is configured and the reader signs in. Demo stories are excluded.
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
| `AI_MODEL_PROVIDER` | `openai` | `openai`, `lmstudio` or `relay`; explicit provider, no silent fallback |
| `BRAVE_SEARCH_API_KEY` | empty | Brave Web Search access |
| `OPENAI_API_KEY` | empty | OpenAI Responses access |
| `OPENAI_MODEL` | empty | Account-available model supporting Responses structured outputs |
| `AI_USER_DAILY_LIMIT` | `100` | Current branch code default, maximum 100; `.env.example` recommends 10 |
| `AI_GLOBAL_DAILY_LIMIT` | `50` | Admitted requests across all readers, maximum 1,000 |
| `AI_MAX_OUTPUT_TOKENS` | `1200` | Model output budget, bounded to 256–4,096 |
| `AI_WEB_CACHE_SECONDS` | `0` | Web result cache disabled; maximum 3,600 seconds if storage rights permit |
| `LM_STUDIO_BASE_URL` | `http://127.0.0.1:1234/v1` | Server-only local endpoint; this Mac overrides port to 1235 |
| `LM_STUDIO_MODEL` | empty | Actual identifier from `/v1/models` |
| `LM_STUDIO_API_KEY` | empty | Optional local server token; never an OpenAI key requirement |
| `LM_STUDIO_TIMEOUT_SECONDS` | `60` | Transport timeout, 1–180 seconds |
| `LM_STUDIO_CONFIG_REVISION` | `1` | Bump after changing weights or saved inference defaults, including thinking |
| `RELAY_BASE_URL` | `https://code.anyxml.com/v1` | Must include `/v1`; only this HTTPS host or `cncode.anyxml.com` |
| `RELAY_API_KEY` | empty | Required relay credential; never reuse the local endpoint configuration |
| `RELAY_MODEL` | `claude-sonnet-5` | Candidate routing name, not independent model-identity proof |
| `RELAY_TIMEOUT_SECONDS` | `60` | Transport timeout, 1–180 seconds |
| `RELAY_CONFIG_REVISION` | `1` | Bump when changing key group/routing without key rotation |

Restart Django after changing settings. Model access and schema compatibility must
be tested using your chosen account/model; the status API only checks that required
configuration exists, **not** that credentials or billing work. Search-only setup is
supported with a Brave key; remote reading needs the selected OpenAI or relay key/model, while local
reading needs a configured local server/model and no key unless local auth is enabled.
`AI_ENABLED=false` disables both while retaining ordinary reading and quotations.

Web result storage requires explicit rights under the chosen Brave plan. Leave its
TTL at zero unless those rights are confirmed. Consult the official
[Brave documentation](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started),
[storage FAQ](https://brave.com/search/api/) and
[OpenAI structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

## Data flow and limits

Research sends the submitted question to Brave and, when configured, that question
plus returned titles/URLs/snippets to the selected model provider. Reading assistance sends only saved
source metadata and up to 8,000 characters of the excerpt/repository description.
Local model requests stay on the configured local endpoint; choosing OpenAI sends
them to OpenAI instead; choosing relay sends them to the relay and its upstream,
without automatic fallback. Do not enter private information
in research. There is no arbitrary URL fetch,
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

External provider transport uses fixed or explicitly allowlisted HTTPS endpoints.
Relay base paths are exactly `/v1` with one optional trailing slash and optional port 443.
Local transport accepts only
server-configured loopback hosts or the explicit Docker host gateway, a port and `/v1`;
no userinfo, query, fragment or request-supplied target is accepted. No redirects or
automatic retries are enabled. Connect timeout is at most 3 seconds; read/total timeout
configuration is 30 seconds for Brave/OpenAI and 60 seconds for relay/local (configurable up to 180),
with a 1 MB response cap. These are transport limits, not a hard
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
text/metadata, task, provider, model, endpoint, credentials, token limit, relay/local timeout,
configuration revision, output settings and prompt version. Changing LM Studio settings outside
Worldline is not automatically detected; increment `LM_STUDIO_CONFIG_REVISION` and
restart Django after such changes. Web caching is opt-in as
above. Cache keys are HMACs; cached payloads contain source text and generated results
and can incidentally repeat question terms. Questions are not kept as a separate
history, URL query, browser local-storage item or log field. Signing out clears the
current private UI; server cache rows expire rather than being deleted on sign-out.
Deleting a user cascades their cached results. Backups may retain earlier data.

OpenAI requests set `store: false`; this is not a promise of zero provider retention.
Provider policies still apply. LM Studio can retain its own debugging logs; Worldline's
safe logging does not control the app's logging preferences. Application usage logs omit questions, excerpts,
responses, credentials and raw provider diagnostics. They record operation, outcome,
elapsed time, call counts and available input/output token counts. Missing token
usage is unknown, never assumed to mean a free request. Chat Completions failures retain
valid token counts when supplied, including truncated or invalid answers. Relay does
not promise zero retention; its schema, routing and billing still require live acceptance.

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

## Further live acceptance

Use one signed-in test reader, a small daily limit and a recorded UTC evaluation date.
Do not change stored real articles to manufacture a desired result. For excerpt tasks,
choose a collected item containing numbers and uncertainty and record its slug and
exact source text for repeat comparisons. Only run after deciding to spend provider
credits. One local-model Brave request was verified on 2026-10-26, but the broader web
cases below and all relay calls remain pending; the separate
[local acceptance record](LOCAL_MODEL_ACCEPTANCE.md) documents actual local reading,
fixture evidence, errors and recovery already exercised, including failures.

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
