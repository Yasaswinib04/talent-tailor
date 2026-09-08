# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Talent Tailor — an HR candidate-shortlisting app. React (CRA) + FastAPI + MongoDB.
Product context lives in `memory/PRD.md`, pricing reasoning in `specs/PRICING.md`, QA in `specs/`,
and open work in `specs/BACKLOG.md`.

**Read `docs/session-log.md` before re-opening any product decision.** It is the decision
record, newest-first — the first entry mentioning a topic is the current position on it, and
it deliberately records the *no* decisions too. Check it before proposing something that may
already have been considered and declined, and add an entry when a session settles something.

## Commands

The repo does **not** boot as cloned: `backend/server.py` reads `MONGO_URL` and `DB_NAME`
via `os.environ[...]` at import time and crashes without them. Copy the two blocks in
`.env.example` into `backend/.env` and `frontend/.env` first.

```bash
# Mongo (brew services start fails with a launchctl bootstrap error — run it directly)
mongod --dbpath ~/data/mongo-talent-tailor

# Backend, port 8000
cd backend && venv/bin/uvicorn server:app --port 8000 --reload

# Frontend, port 3000
cd frontend && npm start
```

Tests are **integration tests against a running server**, not unit tests. They read
`REACT_APP_BACKEND_URL` (default `http://127.0.0.1:8000`) and sign in as a real account,
creating one on first run. Start the backend before running them.

```bash
cd backend && venv/bin/pytest tests/backend_test.py -q          # all 28
cd backend && venv/bin/pytest tests/backend_test.py -q -k locked  # one test / group
```

CI (`.github/workflows/smoke-test.yml`) runs the same suite against the deployed API on
pushes touching `backend/**`. It **fails** rather than skips when the repo Actions
variables (`API_URL`, `TT_TEST_EMAIL`) and secret (`TT_TEST_PASSWORD`) are unset.

## Architecture

### One paywall path — do not add a second

Access is **time on the workspace**, never a flag on a role or a person: `users.access_until`
is an ISO date, and `_has_access()` parses it (never string-compares — `now_iso()` and
`grant_access()` write different ISO spellings and a lexical compare grants access forever).
`grant_access()` only ever moves the expiry forward, capped at `MAX_BANKED_DAYS`.

Every read of candidate identity goes through `_visible_ids()` → `_visible_candidate()`.
There used to be two disagreeing paths, so the same person showed a full name on one screen
and "Candidate #7" on another. If you add an endpoint that returns candidate data, route it
through `_visible_candidate()`.

The free-preview slots (`users.preview_candidate_ids`) are **assigned once and persisted,
never recomputed**. That is the anti-harvesting defence, not an optimisation: every input to
a live top-N ranking is client-controlled (`role_ids`, `scoring_weights`, `skills` are all
patchable; roles can be deleted and recreated), so a recomputed preview lets a lapsed
workspace walk the whole pool three names at a time. `FREE_ROLE_LIMIT` caps role creation
for the same reason; the public apply link is deliberately uncapped.

`_redact()` runs server-side. A blurred `<div>` is not a paywall.

### Two matching mechanisms, deliberately separate

- **Hard filters** — `_filter_failures()`. Publishing a role runs them across the pool and
  attaches everyone who clears them. The "N will pass" preview and the resulting shortlist
  call the same function, so they cannot disagree.
- **Scoring** — `_score_components()` scores five dimensions 0–100 independently;
  `_score_candidate()` combines them by the role's weights, so moving a slider genuinely
  reorders the list. Education is a floor (`_education_level`): a master's satisfies a
  bachelor's requirement.

### LLM with a heuristic floor

`backend/llm.py` calls OpenRouter for `extract_jd()` (JD → rubric) and `parse_resume()`
(resume text → structured fields). Both default to the Opus tier: extraction quality *is* the
product, and a fully parsed role costs a small fraction of the unlock price — don't downgrade
the tier to save pennies per role. Without `OPENROUTER_API_KEY`, or on any failure, both fall
back to `SKILL_DICTIONARY` (`server.py`). An outage degrades quality, never availability —
preserve that shape.

Per-call token/cost telemetry lands in `db.llm_usage` via `llm.usage_logger`, which
`server.py` assigns at import time (`_log_llm_usage`); `/api/analytics/llm-usage` reads it
back and converts USD → INR at `USD_INR`.

### Auth and tenancy

`backend/security.py` issues HMAC-signed bearer tokens; the frontend keeps them in
`localStorage` and attaches them via an axios interceptor (`frontend/src/lib/api.js`), which
also bounces expired sessions to sign-in. Every document carries `owner_id`; `_owned_job()`
and `_owned_candidate()` are the tenancy gate. `startup` runs idempotent migrations
(`_backfill_trials`, `_migrate_unlocked_jobs_to_access`).

### Frontend

Single `App.js` route table; authenticated `/app/*` routes nest inside `AppShell`. Public
routes (`/`, `/apply/:slug`, `/report`, `/themes`) make unauthenticated calls. Dark theme
only — colors and fonts are Tailwind theme extensions (`frontend/tailwind.config.js`), with
the visual system described in `design_guidelines.json`. `REACT_APP_BACKEND_URL` is baked
into the bundle at build time, so the API must be deployed before the web build (see
`render.yaml` and `DEPLOY.md`) and `npm start` must be restarted after changing it.

## Product invariants

These are decisions, not accidents — check before "fixing" them:

- **Missing candidate data never rejects on a filter.** Surface the candidate and let the
  recruiter judge. It scores *neutral*, not best.
- **Must-have skills default to empty.** Pre-filling the top 3 as a strict AND disqualified
  18 of 20 candidates.
- **A zero result is not evidence of a misconfiguration.** Zero candidates passing has three
  causes — an empty pool, a pool with nobody in that function, or genuinely tight filters —
  and only the third justifies telling the recruiter to relax anything. When the product
  cannot distinguish the causes, compute the distinguishing signal or stay neutral.

## Gotchas

- **The automated browser pane runs with `document.visibilityState: "hidden"`**, which
  throttles framer-motion. Entrance animations never complete, so screens render faded and
  step transitions look stuck. That is a harness artifact, not a product bug — verify
  server-side instead.
- **`README.md`'s "Monetization" section is stale.** It describes a one-time per-role unlock;
  the code has been workspace-wide time-boxed access (`access_until`, `PLANS`) since
  commit `07954d1`.
- Render's free tier gives **750 instance-hours per account, not per service**, and a month
  is ~730 — only one backend can be kept awake. Static sites don't consume the quota.

## Working agreements

Reach for these without being asked — the trigger is the situation, not a typed command:

| When | Do this |
|---|---|
| A change touches `_visible_ids`, `_redact`, `_has_access`, `grant_access` or billing | Run the backend suite against a local server before claiming it works, and say which tests covered it |
| Any diff is ready to commit | Run `/code-review low` on it first and report what came back |
| The user pastes interview notes, survey answers or support messages | `product-management:synthesize-research` |
| The user describes a feature idea in prose | `product-management:write-spec`, output into `specs/` |
| Items move in or out of `specs/BACKLOG.md` | `product-management:roadmap-update` |
| A change touches auth, payments, or candidate visibility | Offer `/security-review` before it ships |
| A new user-facing flow lands | Note whether anything records it — this app has no analytics SDK, which is a known gap, not an oversight to re-discover |

And two standing rules:

- **Never report a UI bug observed only in the automated browser pane.** Confirm it server-side
  first (see Gotchas). Faded screens and stuck transitions are the harness, not the product.
- **Never describe CI as passing** without checking that `API_URL`, `TT_TEST_EMAIL` and
  `TT_TEST_PASSWORD` are actually configured on the repo. Until they are, the job is red.
