# Launch Fix Plan — 2026-08-09

Companion to [`uat-report-2026-08-08.md`](./uat-report-2026-08-08.md).
Deployment is handled separately; this plan covers code and config only.

## The one decision that changes this plan

The PRD describes this as a **design prototype plus UX report** — mocked AI,
20 seeded candidates with fabricated Indian names, no auth by design. The fix
list looks very different depending on which of these you are launching:

| | **Scenario A — public prototype / case study** | **Scenario B — real recruiters, real candidates** |
|---|---|---|
| Data | Seeded, synthetic only | Real applicants via the share link |
| Auth (P0-3) | Not a blocker. Gate `/app` behind one shared password so the demo isn't scraped, and label the data as sample. | **Hard blocker.** Real accounts, sessions, per-org data isolation. |
| P1 data-integrity items | Fix the ones visible in a demo; the rest can wait | All of them, before any candidate applies |
| Realistic timeline | **Tomorrow is achievable** | Not tomorrow — days, not hours |

Everything in Track 0 is required either way. **If Scenario B is the intent, my
recommendation is to delay the launch** — shipping an unauthenticated endpoint
serving real candidates' phone numbers and salary expectations is not a risk
worth taking for one day of schedule, and it isn't fixable properly overnight.

---

## Done since this plan was written

### Track B, part 1 — the four pipeline-integrity issues

| | Fix |
|---|---|
| **P1-1** blank applications | `CandidateApply` now validates: name must contain letters, email must be a real address, experience 0–60, CTC non-negative. Mirrored client-side with per-field inline errors, so a candidate is told *which* field is wrong instead of getting "try again" for something a retry can't fix. FastAPI's 422 detail lists are also now translated into readable text app-wide. |
| **P1-2** duplicate applicants | Re-applying updates the existing candidate and attaches the role rather than creating a second record — matched on lower-cased email. Their details refresh, but the recruiter's own stage, rating and notes are never overwritten. The confirmation says "Updated" and explains what happened. |
| **P1-4** role delete orphaning | `DELETE /api/jobs/{id}` now `$pull`s the role from every candidate and recomputes all counts, returning how many it detached. Candidates are never deleted along with a role. Anyone left with no role appears under a new **Unassigned** filter on the dashboard and is tagged in their row, so they stay reachable (this also closes **P1-8**). |
| **P1-5** filters rejecting everyone | The recommendation is now checked against the real pool and backs off through tiers until it leaves a workable shortlist (≥15% or 3 candidates). On the app's own sample JD it went from **0 of 20** to **4 of 20**. `/extract-skills` returns `filter_impact` so the UI can say so up front. |

**Missing data no longer auto-rejects.** This mattered more than expected once
real resumes are parsed: unknown education, notice period or location used to
fail their filters silently, which would have dropped good candidates over a
parsing miss. `_parse_notice_days` returns `None` rather than `999` (reject) or
`0` (the old "—" behaviour, which marked every self-applied candidate an
immediate joiner). Unknowns are counted separately and shown in the UI as
"passing on missing data", so the recruiter can see how much is being taken on
trust. This closes the filtering half of **P1-7**.

One more substring bug of the same family as the earlier `B.E.`/`Bengaluru`
one: `"mba"` matched inside `"IIT Bo(mba)y"`, so a B.Tech passed a "Master's or
higher" filter. Education tokens are now matched with letter boundaries.

**Verification:** 101 backend tests (28 new), plus 13 browser cases covering
junk applications refused with per-field guidance, re-application updating
rather than duplicating, role deletion detaching without deleting people,
orphans reachable via the Unassigned filter, and every role count still matching
reality afterwards.

---


### Authentication — P0-3 closed

The console now requires a sign-in. Per-recruiter accounts rather than a shared
password, because in hiring you need to know who moved a candidate to Rejected.

- **Sessions** are opaque server-side tokens in an `httpOnly` cookie — page
  JavaScript, and therefore XSS, cannot read them. Only a SHA-256 fingerprint is
  stored, so a database dump yields no usable sessions. Sign-out and revocation
  take effect immediately, which a JWT would not give us.
- **Passwords** are bcrypt hashed, minimum 12 characters, with obvious choices
  refused. Failed sign-ins are throttled (5 per 15 min per IP+email), and the
  throttle is not bypassable by then supplying the correct password.
- **Every** `/api` route requires a session except three that are public by
  design: `/api/health`, `/api/jobs/share/{slug}` and `/api/apply/{slug}` —
  candidates applying through a share link have no account.
- **Bootstrap** from `ADMIN_EMAIL`/`ADMIN_PASSWORD` on first startup, with no
  default password. An app shipping known credentials is no better off than one
  with no login. Admins can add accounts; recruiters cannot.
- **Frontend**: login screen, session context, route guard, sign-out, and a 401
  interceptor that routes to login when a session ends mid-use. Deep links are
  remembered across the redirect. `/themes` is now behind the gate too (P2-8).

One trap found while testing, now guarded: with `CORS_ORIGINS="*"` the browser
refuses to send the session cookie cross-origin, so sign-in fails looking like a
network error. The API warns loudly at startup if the origin is a wildcard, and
`.env.example` explains it.

**Verification:** 23 auth tests, including one that walks the app's own route
table so a future endpoint added without a guard fails the build. Plus 17
browser cases: signed-out redirect, no candidate data in the page, deep-link
memory, wrong password, httpOnly cookie invisible to JS, session surviving
reload, revocation mid-session, sign-out, and candidates still applying with no
account. 73 backend tests pass in total.

---


### Track 0 — complete (all five P0s closed)

| Item | What changed |
|---|---|
| **0.1** P0-1 | `npm run build` now **fails** via a `prebuild` guard if `REACT_APP_BACKEND_URL` is missing or malformed (no scheme, or a stray `/api`). `frontend/.env.production` is committed as a working default. If a bad bundle ever does ship, `index.js` renders a config-error screen naming the variable instead of a blank page. Verified: the built bundle contains the real URL and zero occurrences of `undefined/api`. |
| **0.2** P0-2 | `.env.example` rewritten to the four variables the code actually reads — `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL` — with the build-time caveat spelled out. Missing backend config now raises a message naming the variable instead of a bare `KeyError`. `README.md` rewritten with real run/deploy/test instructions. |
| **0.3** P0-4 | `JobCreate.filters` / `scoring_weights` default to `{}` via `default_factory`, so a payload omitting them returns 200 instead of 500. |
| **0.4** P0-5 | Both PATCH routes take closed `JobUpdate` / `CandidateUpdate` models (`extra="forbid"`). `id`, `share_slug`, `created_at`, `match_score`, `auto_applied` and `source` are no longer writable; `rating` is bounded 0–5 and `experience_years` 0–60. An empty patch is a 400, an unknown id a 404. |
| **0.5** P1-6 | Every data-loading screen has an error state with Retry: Dashboard, JobDetail, CandidateProfile. A 404 renders "doesn't exist" rather than an endless "Loading…". Writes (stage, rating, notes, roles, bulk actions, publish, apply) surface failures instead of looking like no-ops. `PublicApply` keeps the candidate's details on the review step so they can retry. Added a top-level error boundary and a catch-all 404 route. `alert()` replaced with an inline message. |

Also closed while in the area, because leaving them half-done would have been
worse than not starting: **CORS** no longer pairs `allow_origins=["*"]` with
`allow_credentials=True` (P0-3 partial — origins are configurable and
credentials are disabled under a wildcard), and **stage is now a `Literal`** on
both `PATCH` and `POST /stage` (P1-3) — free text let `"Banana"` through, after
which the candidate matched no funnel bucket and no dashboard filter.
`backend_test.py` no longer targets a hardcoded `emergentagent.com` preview
host; it takes `TEST_API_URL` and skips cleanly when nothing is running.

**Verification:** 50 backend tests pass (`backend/tests/`), plus 12 browser
cases covering each fix end to end — API-down error state and recovery via
Retry, unknown candidate/role/route, failed application preserving its data,
and the rebuilt bundle calling the real backend.

---

### Recruiter bulk resume upload — added on request

`POST /api/jobs/{id}/bulk-upload` plus a
drag-and-drop panel on the role page. Up to 10 resumes per batch, capped both
client-side and server-side (413), with a 12-batch/minute rate limit. Real
PDF/DOCX/TXT parsing extracts name, email, phone, title, company, years, CTC,
notice and skills; each candidate is scored against the role. Per-file results
mean one unreadable resume never fails a batch, and re-uploading someone already
in the system attaches them to the role instead of duplicating. Covered by 18
local tests in `backend/tests/test_bulk_upload.py`.

This also closes **P2-6** (upload theatre) for the recruiter path and adds an
initials-avatar fallback, since uploaded candidates have no portrait URL. The
candidate-side `PublicApply` upload still discards the file — A.6 below.

---

## Track 0 — Required for any launch ✅ DONE

Without these the deployed app is dead on arrival. Kept below as the record of
what was planned; see the summary table above for what actually shipped.

### 0.1 · Fix the API base URL — P0-1 · 20 min
- Add `frontend/.env.production` with `REACT_APP_BACKEND_URL` (and commit it —
  it's a public URL, not a secret; loosen the `.gitignore` `.env*` glob to keep
  ignoring `.env.local`).
- In `frontend/src/lib/api.js`, fail loudly instead of silently stringifying:
  throw at module load if the variable is missing or literally `"undefined"`, so
  a misconfigured build never reaches production again.
- **Verify:** `grep -o 'baseURL:"[^"]*"' build/static/js/main.*.js` shows the
  real URL.

### 0.2 · Correct `.env.example` — P0-2 · 15 min
- Replace the four unused variables (`GEMINI_API_KEY`, `DATABASE_URL`,
  `SUPABASE_*`) with the three the code actually reads: `MONGO_URL`, `DB_NAME`,
  `REACT_APP_BACKEND_URL`. Note that the last is **build-time**, not runtime.
- Read them via `os.environ.get(...)` with a clear startup error rather than
  bracket subscript, so a missing variable produces a message instead of a
  `KeyError` traceback.
- Add a short "Deploying" section to `README.md` — the current one describes an
  AI Studio / Gemini app that doesn't match this repo at all.

### 0.3 · Stop the 500 on job creation — P0-4 · 10 min
- In `JobCreate`, default `filters` and `scoring_weights` to
  `Field(default_factory=dict)` instead of `None`.
- **Verify:** `POST /api/jobs` with only title/department/location returns 200.

### 0.4 · Lock down `PATCH` — P0-5 · 45 min
- Replace `payload: dict` on both PATCH routes with explicit `JobUpdate` /
  `CandidateUpdate` Pydantic models using `model_config = ConfigDict(extra="forbid")`
  and `exclude_unset=True`.
- Never allow `id`, `share_slug`, `created_at`, `applied_at` or `auto_applied`
  through.
- **Verify:** `PATCH {"id":"spoofed"}` → 422; the record stays reachable.

### 0.5 · Frontend doesn't die silently — P1-6 · 60 min
- Wrap the `load()` functions in Dashboard, JobDetail and CandidateProfile in
  try/catch with an error state and a Retry button.
- CandidateProfile / JobDetail: distinguish 404 → "Candidate not found" from a
  network failure. Kill the infinite "Loading…".
- `PublicApply.submit()`: catch, show the failure, keep the form filled and let
  them retry. A candidate silently losing an application is the worst failure
  mode in the product.
- Add a top-level React error boundary in `App.js`.
- Add a catch-all `<Route path="*">` 404 page — P2-9.

---

## Track A — Ship-quality for a public prototype (~3–4 hours)

Do these too if launching tomorrow under Scenario A.

### A.1 · Gate the recruiter console · 45 min
Single shared password over `/app` and the write endpoints (HTTP basic at the
edge is fine, or one env-var token checked in a FastAPI dependency). Tighten
CORS from `allow_origins=["*"]` to the actual frontend origin — with
`allow_credentials=True`, the wildcard is the worst of both worlds.

### A.2 · Fix the recommended filters — P1-5 · 30 min
This is the single most damaging *product* bug: the first thing a new HR sees is
"0 of 20 candidates would pass", produced by the app's own recommendation.
- Derive `must_have_skills` from the top **1** skill, not the top 3 — or switch
  `preview_filter` from `issubset` (all) to "at least N of" semantics.
- Add a guard: if the recommendation would pass fewer than ~15% of the pool,
  relax it before applying and don't badge it `RECOMMENDED · APPLIED`.
- **Verify:** the sample JD's defaults pass a non-trivial share of the 20 seeded
  candidates.

### A.3 · Validate what candidates submit — P1-1 · 45 min
- `CandidateApply`: non-empty `name`, `EmailStr` email, `experience_years` in
  0–60, `expected_ctc` ≥ 0.
- Mirror it client-side in `PublicApply` — disable Submit and show inline errors
  rather than letting the request fail.
- **Verify:** blank name/email is rejected in the browser, no blank row reaches
  the dashboard.

### A.4 · Constrain stage, protect bulk actions — P1-3, P2-4 · 45 min
- Make stage a `Literal["New","Shortlisted","Interview","Offer","Rejected"]`.
- Add a confirm step to bulk Reject, plus a toast with an Undo. Right now the
  most destructive action is the only one with no friction.

### A.5 · Remove the dead UI — P2-1, P2-2, P2-3 · 45 min
Three things in the chrome are visibly non-functional and will be the first
thing anyone clicks in a demo:
- Sidebar **Roles** / **Candidates** render the identical Overview page (`tab`
  is parsed and never used). Either wire them to scroll/filter, or drop them to
  a single "Overview" item.
- All three links highlight as active simultaneously — match on `tab` rather
  than relying on `NavLink`, which ignores query strings.
- The top-bar search and `⌘K` badge do nothing. Wire the input to the existing
  candidate filter — the logic already exists in `Dashboard.js` — or remove it.

### A.6 · Honest resume upload — P2-6 · 30 min
Uploading a CV for one person and getting a form for someone else is the kind of
thing a reviewer will notice immediately. Cheapest honest fix: parse `.txt`
client-side with `FileReader` for the fields you can, and relabel the animation
to "Preparing your details" instead of claiming extraction that isn't happening.
Real PDF parsing (PDF.js) stays a post-launch item.

### A.7 · Un-ship `/themes` — P2-8 · 10 min
Route it behind the same gate as `/app`, or exclude it from the production build.

---

## Track B — Before any real candidate applies

Not achievable tomorrow. Sequence after launch, or before, if Scenario B.

1. **Real authentication and per-org data isolation** — P0-3. Everything else in
   this list is downstream of it.
2. **De-duplicate applications** by email per role — P1-2. Unique index plus an
   upsert path; decide whether a re-application updates the existing record.
3. **Referential integrity on role delete** — P1-4. `$pull` the job id from every
   candidate's `role_ids` in the same operation, and recompute counts.
4. **Fix auto-applied candidate defaults** — P1-7. `None` rather than `"—"`;
   make `_parse_notice_days` return "unknown" (excluded) instead of `0`
   (immediate joiner); replace `hash(email)` with a stable digest.
5. **Prevent orphaned candidates** — P1-8. Block removing the last role, or add
   an explicit "Unassigned" view.
6. **Pagination** on `/api/candidates` and `/api/jobs` — P2-12. The `to_list(1000)`
   cap silently truncates, in a product sold on volume.
7. **Unique index on `share_slug`** and a longer slug — P2-13.
8. **Server-side validation** of job titles and salary ranges — P2-10, P2-11.
9. **Responsive dashboard** — P2-7. Currently 832 px wide in a 390 px viewport;
   collapse the sidebar and let the candidate table scroll in its own container.
10. **Persist onboarding** — already P1 in the PRD backlog; today all three steps
    are discarded.
11. **Test infrastructure**: add `pytest` and `requests` to `requirements.txt`,
    remove the hardcoded `emergentagent.com` URL from `backend_test.py`, commit
    `frontend/package-lock.json`, and add negative-path cases so the suite can
    fail.
12. **Self-host fonts and avatars**, add a favicon and `manifest.json`.

---

## Suggested order for tomorrow (Scenario A)

| Slot | Work | Cumulative |
|---|---|---|
| 1 | Track 0 — 0.1 → 0.4 (config + API hardening) | ~1h 30m |
| 2 | Track 0 — 0.5 (error states, 404, boundary) | ~2h 30m |
| 3 | A.2 + A.3 (recommended filters, apply validation) | ~3h 45m |
| 4 | A.1 + A.7 (gate `/app` and `/themes`, tighten CORS) | ~4h 40m |
| 5 | A.4 + A.5 + A.6 (stage enum, bulk confirm, dead UI, upload) | ~7h |
| 6 | Re-run this UAT plan against the deployment target | ~8h |

Re-running the suite against the real deployed URL is the step to protect —
CFG-01→03 can only be verified there, and P0-1 is exactly the class of bug that
only appears in a real build.
