# Local model integration — 2026-10-23

Preserve existing code/data and the user's verified loaded-model settings. No paid
calls, public exposure, push, new agent framework or model downloads.

1. Inspect actual service/model/configuration and probe real API contracts. Add an
   optional LM Studio adapter, strict parsing, bounded timeouts and provider-aware
   cache configuration; add focused regression tests, then commit.
2. Enable local settings without overwriting unrelated `.env` values; evaluate real
   generated fixture outputs and real stored-article reading through the webpage.
   Verify unavailable/recovery and simulated malformed/timeout UI errors separately;
   address findings, test and commit the acceptance tooling/results.
3. Run sequential backend/browser/integration regressions, frontend checks, update
   operations/progress with evidence and remaining limits, then commit.

Initial findings: clean Git at ac5186d. Django is native macOS on 127.0.0.1:8000;
Docker runs PostgreSQL, Redis and scheduler only. The app installs as Bionic 1.1.9+6
and exposes LM Studio CLI/API. Model spark-x2.6-4b, XHToken GGUF Q4_K_M (4.4B),
3,543,441,312 bytes, loaded context 300544; selected GGUF engine llama.cpp 2.64.0.
Saved defaults: temperature 0.2, output 1200, thinking false. These remain unchanged.
API started via official CLI on its saved port 1235, bound only to 127.0.0.1;
model listing and generation work without authentication, CORS false.

Three initial real API calls took 4.473/2.116/2.277 seconds. A no-answer case
returned false with nonempty paragraphs: valid JSON but rejected by Worldline's
semantic shape contract. Keep this failure in acceptance history; strengthen the
prompt and retain strict rejection instead of silently rewriting the result.
No Brave key is configured. Real web research remains pending search access.

## Completed 2026-10-24

- Phase 1: `7d283c6 feat: support bounded local LM Studio inference`.
- Phase 2: `3595289 fix: validate local model language and recovery behavior`.
- Phase 3: full regression and current startup documentation completed; see
  [PROGRESS.md](PROGRESS.md) for actual counts and
  [LOCAL_MODEL_ACCEPTANCE.md](LOCAL_MODEL_ACCEPTANCE.md) for real outputs and limits.

All agreed independent local work is complete. Brave research, broad model quality
and cold model-load measurement remain explicitly unaccepted. No public deployment.
