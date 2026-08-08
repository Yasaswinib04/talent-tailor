# UAT Report — CRED HR Talent Engine

**Date:** 2026-08-08 · **Build:** `8141bb8` · **Target release:** 2026-08-09
**Tester:** QA pass against the production build + live API

---

## QA Gate: **FAIL — critical bugs found**

The current build cannot be deployed successfully. The frontend production
bundle ships with a literal `undefined` in its API base URL, so the app makes
zero successful backend calls once deployed. Separately, `.env.example`
documents four environment variables that no code reads while omitting all three
that are required — so a deployer following the repo would configure the wrong
things and the backend would not start either.

Beyond deployability, the app has no authentication of any kind, and every
candidate's name, personal email, phone number, current employer, expected CTC
and recruiter notes is served from public unauthenticated endpoints.

---

## Summary

| Suite | Total | Pass | Fail |
|---|---|---|---|
| Backend API (`/api/*`, live server) | 35 | 22 | 13 |
| Browser end-to-end (Chromium, prod build) | 30 | 17 | 13 |
| **Total** | **65** | **39** | **26** |

| Severity | Count | Meaning |
|---|---|---|
| **P0 — Blocker** | 5 | App does not work, or leaks PII. Must fix before deploy. |
| **P1 — Critical** | 8 | Data loss / corruption, or a broken flagship flow. |
| **P2 — Major** | 13 | Visible defects and dead UI. |

### Note on the previous test report

`test_reports/iteration_1.json` records "100% (14/14)", zero critical issues and
zero action items. That run exercised happy paths only, against a hosted preview
URL hardcoded in `backend/tests/backend_test.py`. It did not cover
configuration, auth, invalid input, error states, or lifecycle. It should not be
read as launch evidence.

---

## P0 — Launch blockers

### P0-1 · The deployed frontend calls `undefined/api` and nothing works

`frontend/src/lib/api.js:3` reads `process.env.REACT_APP_BACKEND_URL`. That
variable is set nowhere — there is no `.env`, and `.gitignore` excludes all
`.env*` files. CRA inlines env vars at build time, so an unset variable becomes
the string `"undefined"`.

**Evidence** — building the repo exactly as committed:

```
$ npx react-scripts build && grep -o 'baseURL:"[^"]*"' build/static/js/main.*.js
baseURL:"undefined/api"
```

Every request goes to `https://<host>/undefined/api/...`. Dashboard, Job Setup,
Candidate Profile and Public Apply are all completely non-functional, and
because there is no error handling (P1-6) the user sees an empty shell rather
than an error.

### P0-2 · `.env.example` documents the wrong variables entirely

| `.env.example` says | Code actually reads |
|---|---|
| `GEMINI_API_KEY` | *(never read — skill extraction is a local dictionary in `server.py:352`)* |
| `DATABASE_URL` (PostgreSQL) | *(never read — the backend is MongoDB)* |
| `SUPABASE_URL` | *(never read)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(never read)* |
| — | **`MONGO_URL`** (`server.py:19`, `os.environ[...]`) |
| — | **`DB_NAME`** (`server.py:20`, `os.environ[...]`) |
| — | **`REACT_APP_BACKEND_URL`** (build-time, frontend) |

Both backend variables are read with bracket subscript, so a missing one is a
hard `KeyError` at import — the server does not start and gives no usable
message. Anyone deploying from this repo tomorrow will set four irrelevant
secrets and hit a crash.

### P0-3 · No authentication; candidate PII is publicly readable

There is no auth anywhere in the codebase — zero matches for
`auth|login|token|session|jwt|password` across `backend/server.py` and
`frontend/src`. `memory/test_credentials.md` confirms: *"no auth in this build."*

`GET /api/candidates` returns, for all 20+ candidates, full name, personal
email, phone, current employer, expected CTC, education and recruiter notes. The
entire recruiter console at `/app` is reachable by URL alone. CORS is
`allow_origins=["*"]` **with** `allow_credentials=True` (`server.py:27-33`), so
any origin can read it from a browser.

This is real candidate data about identifiable individuals. Publishing it
without access control is a DPDP Act exposure, not only a security bug.

### P0-4 · `POST /api/jobs` returns 500 on a documented-optional payload

`JobCreate` declares `filters: Optional[dict] = None` and
`scoring_weights: Optional[dict] = None` (`server.py:72-73`), but `create_job`
then does `Job(**payload.model_dump())` and `Job` requires both to be dicts
(`server.py:53-54`). Omitting either raises `ValidationError` → 500.

```
POST /api/jobs {"title":"QA Role","department":"Engineering","location":"Bengaluru"}
→ 500 Internal Server Error
```

The current Job Setup screen always sends both, which masks it — but any other
client, and the onboarding flow when it is wired up, hits an unhandled 500.

### P0-5 · `PATCH` accepts a raw dict and `$set`s it verbatim — the primary key can be overwritten

`update_job` and `update_candidate` (`server.py:336-342`, `546-558`) take an
untyped `payload: dict` and pass it straight into `$set`. Nothing is validated,
whitelisted or immutable.

```
POST  /api/jobs                          → job id 3f2a…
PATCH /api/jobs/3f2a… {"id":"spoofed","share_slug":"aaaa","evil":true}
      → 200, response body: null
GET   /api/jobs/3f2a…                    → 404
GET   /api/jobs                          → still lists it, now with id "spoofed"
```

The record is corrupted and unreachable at its own URL while still appearing in
lists. `share_slug`, `match_score` and `auto_applied` are equally rewritable,
and arbitrary new fields can be injected. Unauthenticated (P0-3), this is
one-request data destruction by anyone who knows a URL.

---

## P1 — Critical

### P1-1 · Public apply accepts empty name and email

`CandidateApply` (`server.py:110-118`) has no validators. Verified in the
browser: cleared name and email on the review step, clicked Submit, got the
"Applied." confirmation, and the record landed in HR's dashboard as a blank row
(screenshot `08-blank-apply.png`, `09-dashboard-after.png`). The API also
accepts `experience_years: -5` and `expected_ctc: -100` with a 200.

### P1-2 · No de-duplication — the same person applies twice, gets two records

Two identical `POST /api/apply/{slug}` calls create two candidates with the same
email. Auto-apply is the headline beta feature and the UX report claims
"Duplicate profiles: 1 per 3 roles → **0**". The share link reintroduces exactly
the duplication the redesign says it removed.

### P1-3 · Stage is free text — candidates silently vanish from the pipeline

`StageUpdate.stage` is an unconstrained `str`. All of these return 200 and
persist:

```
stage='Banana'    → 200, stored 'Banana'
stage=''          → 200, stored ''
stage='<script>'  → 200, stored '<script>'
```

The candidate then appears in **no** funnel bucket and matches **no** dashboard
stage filter — effectively deleted from the recruiter's view while still in the
database. Confirmed against `/api/analytics/summary`, whose totals no longer
account for them.

### P1-4 · Deleting a role orphans its candidates

`DELETE /api/jobs/{id}` (`server.py:345-348`) removes only the job document.
Verified: 5 candidates still carried the deleted role in `role_ids` afterwards.
Their role chips disappear from the dashboard and they are unreachable from any
Job Detail page. `candidates_count` on other roles is not recomputed either.

### P1-5 · The system-recommended filters reject 100% of the pool

Using the app's own "fill with sample" JD and the defaults the UI labels
**RECOMMENDED · APPLIED**, the live counter reads:

> **0 of 20 candidates in your pool would pass these.**

Cause: `recommended_filters.must_have_skills` is the top-3 extracted skills
(`server.py:415`), and `preview_filter` requires all of them via
`must_have.issubset(cand_skills)` (`server.py:505`). For the sample JD that
demands `Design Systems` **and** `UPI / Payments` **and** `React` on one CV; the
API breakdown attributes `failed_must_have: 20`. A first-time HR's very first
screen tells them nobody qualifies, using settings the product recommended.
Screenshot `05-criteria.png`.

### P1-6 · The frontend has essentially no error handling

One `.catch()` exists across all nine page/component files (`PublicApply.js:30`).
Every other `api.get`/`api.post` is unguarded, so any failure is an unhandled
promise rejection.

- Backend unreachable → dashboard renders a complete empty shell: "0 ACTIVE",
  no candidates, **no error message and no retry** (screenshot `12-backend-down.png`).
- `/app/candidates/<unknown-id>` → the 404 rejects, `setC` never runs, and the
  page shows "Loading…" **forever** (screenshot `13-404.png`).
- `PublicApply.submit()` is unguarded — a failed application looks like a dead button.

### P1-7 · Auto-applied candidates are second-class records that skew filtering

`apply_to_job` (`server.py:602-620`) hardcodes `location="—"`,
`education="—"`, `notice_period="—"`, and `skills=["General"]` when nothing
matches the dictionary. Consequences:

- `_parse_notice_days("—")` returns **0**, so every auto-applicant is scored as
  an immediate joiner and passes any notice-period filter.
- They fail every education and location filter, permanently.
- `avatar` is picked with `hash(email)` — Python randomises string hashing per
  process, so an auto-applicant's avatar changes on every server restart.

The candidates produced by the flagship feature are the ones the filtering
engine handles worst.

### P1-8 · A candidate can be unassigned from every role and lost

Removing role chips one by one leaves "Not assigned to any role yet."
(screenshot `11-orphan.png`). The candidate is now absent from every Job Detail
page and reachable only from the unfiltered All Candidates table.

---

## P2 — Major

| # | Finding | Evidence |
|---|---|---|
| P2-1 | Sidebar **Roles** and **Candidates** go nowhere. `?tab=` is read into `tab` (`Dashboard.js:10`) and never used — the build's own eslint flags it as unused. All three links render the identical Overview page. | UI-04 |
| P2-2 | All three sidebar links are highlighted as active **at once** — `NavLink` ignores query strings, so `/app`, `/app?tab=jobs` and `/app?tab=candidates` all match. | UI-05, `navcheck` |
| P2-3 | Top-bar global search and the `⌘K` badge are decoration — the input has no state and no handler. Typing filters nothing. | UI-06 |
| P2-4 | Bulk **Reject** fires instantly on click: no confirmation, no undo, no toast. The most destructive action in the app is the least protected. | UI-11 |
| P2-5 | Publish is allowed with scoring weights ≠ 100%. The "(should be 100%)" warning is cosmetic. | UI-14 |
| P2-6 | Resume upload is theatre: the file is discarded (`PublicApply.js:58` passes `""`) while the UI animates "Extracted name and contact / skills / education". Uploading a CV for "Priya Nair" produced a form for "Aarav Menon". | UI-19, `07-apply-fake-parse.png` |
| P2-7 | Unusable on mobile: `scrollWidth` 832 px in a 390 px viewport, fixed 224 px sidebar, KPI labels overlapping their values. | UI-27, `14-mobile.png` |
| P2-8 | `/themes` — six internal design explorations — is publicly routable in the production build. | UI-28 |
| P2-9 | No catch-all route in `App.js`; unknown URLs render a completely blank page. | UI-29 |
| P2-10 | Blank/whitespace-only job titles accepted (`title: "   "` → 200). Markup in a title is stored raw; React escapes it on render so it is inert today, but it flows through to the public apply page. | Probes B, C |
| P2-11 | `salary_min > salary_max` and negative salaries accepted without validation. | Probes D, E |
| P2-12 | `to_list(1000)` on every list endpoint, no pagination. Silently truncates past 1000 candidates — for a product pitched on "evaluate 100s of candidates". | `server.py:309, 476, 530` |
| P2-13 | `share_slug` is 8 hex chars with no uniqueness index; a collision silently hijacks another role's apply link. Also guessable by enumeration given P0-3. | Probe G |

### Smaller items

- `backend/requirements.txt` omits `pytest` and `requests`, and
  `backend_test.py:6` defaults to a hardcoded `…emergentagent.com` preview URL —
  the suite cannot run against a local or production deployment as committed.
- No lockfile for the frontend (`frontend/package-lock.json` is absent; the
  530 KB `package-lock.json` at the repo root does not correspond to it) — builds
  are not reproducible.
- Onboarding is client-only; everything entered across the three steps is
  discarded on "Finish". Already tracked as P1 in the PRD backlog.
- Fonts (Google Fonts, Fontshare) and all imagery (Unsplash avatars, a Pexels
  hero) load from third-party CDNs with no fallback.
- No favicon, `manifest.json`, or `robots.txt`.
- `"1 candidates"` on role cards.

---

## What passed

Worth stating plainly — the core product ideas hold up under test:

- Live skill extraction from a pasted JD works and feels immediate (UI-12).
- The "will pass" preview counter is genuinely responsive and its per-filter
  breakdown is accurate — the numbers it reports are correct; it is the
  *recommended defaults* feeding it that are wrong (P1-5).
- Multi-role assignment works end to end, in the UI and the API, and
  `candidates_count` stays consistent through assignment (TC-05, TC-29, CP-02).
- Notes persist correctly across a full page reload (CP-04).
- Keyboard navigation works, and text inputs are correctly guarded against
  shortcut hijacking (UI-08, UI-09).
- Publishing a role and applying through its share link works end to end, and
  the applicant appears under the correct role with a consistent count
  (UI-16→18, TC-22, TC-23).
- Seeding, sorting, stage filtering and job-scoped candidate queries are correct.
- The production build compiles clean (warnings only) at 135 KB gzipped JS.

---

## Recommendation

Do not deploy this build. P0-1 and P0-2 alone mean tomorrow's launch produces a
dead app; both are small, mechanical fixes measured in minutes. P0-3 is the one
that needs a product decision rather than a patch — see the fix plan.

Fix plan and sequencing: **[`specs/launch-fix-plan.md`](./launch-fix-plan.md)**.
