# Session log

Running record of Claude Code sessions on this repo: what was asked, what
shipped, and what was left open. Newest first.

Complements `PRD.md`, which describes the product; this file describes the work.

---

## 2026-08-28 → 09-08 — Product analytics (PostHog) + session replay

**Asked:** "Do we have analytics setup? How do I understand user behaviour?"

### Finding: no product analytics existed

`GET /api/analytics/summary` (`backend/server.py`) is named "analytics" but
reports *pipeline state* — job counts, candidate counts, stage funnel. It says
nothing about how the app is used.

Nothing else was instrumented. No PostHog/Mixpanel/Amplitude/GA/Segment, no
tracking snippet in `frontend/public/index.html`, no error monitoring.

The paid funnel was entirely dark: no way to tell whether anyone opened the
unlock modal and abandoned at the price.

### Finding: the old PostHog key never existed

Commit `2266e16` (May 2026, the pre-rewrite Vite/TS app) did wire up
`posthog-js` with a `PostHogProvider` — but the key was the literal placeholder
`phc_mock_key_replace_me`. Every commit on every ref was searched: that mock
string is the only `phc_...` value this repo has ever contained.

The rewrite in `4605cd6` deleted that frontend. A real key was never committed;
if a PostHog project exists, its key lives only in a deploy dashboard.

### Shipped — PR #7, branch `claude/analytics-user-behavior-ozto1v`

Two layers, both disabled unless a key is set:

- **`backend/analytics.py`** — PostHog capture over `httpx` (no new dependency;
  matches how the repo already hand-rolls its Razorpay call). Fire-and-forget:
  the POST runs after the response has gone out, exceptions are swallowed, and
  tasks are held in a module-level set so a capture can't be GC'd mid-flight.
- **`frontend/src/lib/analytics.js`** — `posthog-js` for pageviews (sent on
  route change, since CRA is a SPA) and session replay.

Ten events. The ones that were previously invisible: `unlock_modal_opened`,
`payment_started`, `payment_abandoned`, `payment_verification_failed`,
`shortlist_unlocked`.

**Privacy.** Candidate resumes are personal data under DPDP and these
properties leave our infrastructure, so events carry counts, ids and enums
only. Replay masks all text inputs, and candidate identity is marked
`data-private` and masked too. **New candidate-identity UI must carry
`data-private`** or replay will start recording names.

Also deleted the root `package-lock.json` — an orphan from the Vite app
removed in `4605cd6`; there is no root `package.json`.

### Testing

`backend/tests/test_analytics.py` (6 tests) needs no running API and no
database, unlike `backend_test.py`. The one that matters is
`test_unreachable_posthog_never_raises`: if a future change lets a dead PostHog
surface to the caller, a missing data point becomes a failed signup.

The real endpoints were also exercised over ASGI against an in-memory Mongo
with a stub PostHog — signup → `job_created` → `shortlist_unlocked` all fire
with the right shape and no PII in the payloads.

### Environment note for future sessions

`import pymongo` fails in the remote container with a `pyo3` panic from a
broken system `cffi`. It is **not** a repo problem and it is repairable:

    pip install --force-reinstall cffi

After that `server.py` imports fine. `mongomock_motor` + `httpx.ASGITransport`
then let you exercise real endpoints without a live Mongo.

### Open items — need a human

1. **Merge PR #7.** Marked ready for review 09-08; no CI gates it (see below).
2. **Set the keys in Render:** `POSTHOG_API_KEY` and `REACT_APP_POSTHOG_KEY`.
   Until then every call is a deliberate no-op. CRA bakes `REACT_APP_*` in at
   build time, so it must be set *before* the web service builds.
3. **Enable session replay** in PostHog → Settings → Project → Session Replay.
   The key alone does not start recording.

### Gotcha worth remembering

**No CI runs on pull requests here.** `.github/workflows/smoke-test.yml` fires
only on `push` to `main` under `backend/**`. An empty check list on a PR is
expected, not a failure. That smoke test also self-skips unless the `API_URL`
repo variable is set.

Adding a `pull_request` trigger that runs the frontend build plus
`pytest backend/tests/test_analytics.py` would be a small, self-contained
change — not done, out of scope.

### Process note

The PR was watched with an hourly check-in plus a webhook subscription. Nothing
ever changed (it was waiting on a human, and no CI exists to react to), so the
polling produced ~20 "no change" messages before being killed at the user's
request. Both the trigger and the subscription are gone. **Don't re-arm
recurring polling on a PR whose only blocker is a human decision.**
