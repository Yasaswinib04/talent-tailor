# UAT — readiness for the first set of users

Ran against the real stack: FastAPI backend booted and seeded, production React
build served, driven end-to-end in Chromium. Every finding below was reproduced
by running the app, not by reading it.

**Verdict before this pass: not shippable.** Two findings would have caused real
harm on day one (candidate PII readable by anyone; the apply form filling in a
stranger's identity). Both are fixed. Everything marked ✅ is fixed and covered
by a regression test.

---

## P0 — would have caused harm on day one

### 1. ✅ Every candidate's personal data was readable by anyone

`memory/test_credentials.md` said *"no auth in this build"* — accurately. There
was no authentication on any endpoint, and CORS was `allow_origins=["*"]`.

`GET /api/candidates` returned, for all 20 seeded candidates and every real
applicant: full name, email, phone number, current employer, expected CTC,
education, and the recruiter's private notes. `PATCH` and `DELETE` were equally
open — anyone could reject every candidate or delete a role.

The moment a real person applied through the public link, that was a data breach.

**Fixed.** All recruiter endpoints now require an `X-Access-Code` header matched
against `HR_ACCESS_CODE`, and CORS is restricted to `ALLOWED_ORIGINS`. Recruiters
type the code once per tab (`AccessGate`); it lives in `sessionStorage` and is
never baked into the JS bundle. Candidate-facing routes — viewing a shared job,
applying, health — stay public.

> This is a **shared team code, not per-user authentication.** There are no
> individual accounts, permissions, or audit trail. It is the right stopgap for a
> handful of trusted recruiters; it is not what you want at 50 users.

Verified: recruiter endpoints return 401 to an anonymous or wrong-code caller and
the error body leaks nothing; `/api/jobs/share/{slug}` and `/api/apply/{slug}`
still return 200 with no code.

### 2. ✅ The apply form filled in a fabricated identity

Uploading a resume ignored the file entirely and pre-filled a hardcoded persona:

```
Uploaded: Priya Nair · priya.nair@gmail.com · Zomato
Form showed: Aarav Menon · aarav.menon@email.in · Razorpay
```

Every real applicant either noticed and lost all trust, or didn't notice and
submitted an application under someone else's name and email. This was the
beta users' #1 requested feature.

**Fixed.** `.txt` resumes are genuinely parsed (name, email, phone, years of
experience) and the form states what was read: *"Read 4 fields from
Priya_Nair_resume.txt. Please check them and fill in the rest."* PDF/DOCX say so
plainly and leave the form blank rather than inventing data. The sample persona
survives only behind the explicit "try with a demo resume" link, labelled as
sample data. The scanning animation no longer claims to have extracted fields it
never read.

### 3. ✅ A candidate's application could vanish silently

`submit()` had no error handling, no in-flight state, and no error UI. With the
API unreachable, the candidate clicked Submit and *nothing happened* — no
message, no spinner. They closed the tab believing they had applied.

**Fixed.** Errors surface inline ("Can't reach the server. Check your connection
and try again."), the button disables and shows "Submitting…", and required
fields are checked before the request. The same silent-failure pattern existed on
Publish role, stage moves, ratings, notes, and role assignment — all now report
failures.

### 4. ✅ The app could not be deployed from its own documentation

`.env.example` documented `GEMINI_API_KEY`, `DATABASE_URL` (Postgres) and
`SUPABASE_*` — none of which this app uses. The README was for a different
project ("Run and deploy your AI Studio app", `npm run dev` — a script that
doesn't exist). Neither mentioned the variables the app actually needs.

Meanwhile the backend did `os.environ["MONGO_URL"]`, so a missing variable
produced a bare `KeyError: 'MONGO_URL'` traceback, and the frontend silently
built a base URL of `undefined/api`.

**Fixed.** `.env.example` and README now describe this app, split by backend and
frontend. Missing variables produce an actionable message naming the variable and
what it's for. The frontend build fails fast when `REACT_APP_BACKEND_URL` is
absent.

---

## P1 — core promises were broken

### 5. ✅ The flagship "will pass" counter read **0 pass** on the happy path

Paste the sample JD, open *Mandatory criteria*, and the marquee feature reported
`0 of 20 candidates would pass`. The recommended filters auto-applied the top 3
extracted skills as `must_have_skills`, which is a strict AND (`issubset`) — 17
of 20 candidates failed on that alone.

The first thing a recruiter saw from the headline feature was "your product
filtered out everyone."

**Fixed.** `must_have_skills` is no longer auto-applied. The skills are returned
as `suggested_must_have_skills` and rendered as one-click `+ React` chips the
recruiter opts into. Same JD now reads **5 pass**.

### 6. ✅ Every public applicant was auto-filtered out of the pool

The apply endpoint stored `education`, `location` and `notice_period` as the
literal string `"—"`. The recommended education filter then excluded them. So
auto-applied candidates — the entire point of the feature — never appeared in a
filtered view, and their profile showed "Notice: —" to the recruiter.

**Fixed.** The apply form now collects location, education and notice period, and
a missing education no longer excludes anyone: we surface them and let the
recruiter decide rather than silently dropping them.

### 7. ✅ `POST /api/jobs` returned 500 on its documented happy path

`JobCreate` declared `filters`/`scoring_weights` as `Optional[dict] = None`, but
`Job` required real dicts — so `Job(**payload.model_dump())` raised an unhandled
`ValidationError`. Creating a job with only the required fields was a 500. The UI
happened to always send both, which is why this was never noticed.

**Fixed.** `None` is coerced to `{}`.

### 8. ✅ The public endpoint accepted junk into the recruiter's pool

Unauthenticated, and unvalidated. All of these were accepted with HTTP 200:
blank name, `not-an-email` as an email, `experience_years: -5`,
`expected_ctc: -100`. Applying twice with the same email created two separate
profiles.

**Fixed.** Name/title/company must be non-blank, email must be well-formed,
experience and CTC are range-checked. Re-applying with the same email updates the
existing profile and adds the role instead of duplicating it (the confirmation
screen says so).

### 9. ✅ A typo'd stage made a candidate disappear

`POST /candidates/{id}/stage` accepted any string. Setting `"Bogus"` removed the
candidate from every board column with no way to find them in the UI, and broke
the funnel totals — analytics reported 23 candidates across stages against a
total of 24.

**Fixed.** Stage is a `Literal` enum; invalid values are rejected with 422, and
the funnel now always sums to the total.

### 10. ✅ `PATCH /candidates/{id}` was a raw `$set`

Any field, any type. It accepted `match_score: "not-a-number"` and rewrote the
record's `id`, permanently orphaning it.

**Fixed.** A `CandidateUpdate` model with `extra: "forbid"` allows only stage,
rating, notes, tags and role_ids. Role IDs are checked to exist.

### 11. ✅ Deleting a role orphaned its candidates

Candidates kept a `role_ids` entry pointing at the deleted job. Their role chip
rendered as nothing, and they were unreachable via the role filter.

**Fixed.** Deleting a job pulls its id from every candidate; deleting a
nonexistent job is a 404 rather than a silent success.

---

## P2 — visible rough edges, also fixed

| Finding | State |
| --- | --- |
| All three sidebar links highlighted as active at once (`NavLink` can't match on query strings) | ✅ matches on the `tab` param; exactly one active |
| Top-bar global search did nothing — typing "Rohan" left all 20 rows | ✅ searches candidates on Enter, syncs to `?q=` |
| `⌘K` badge was decorative | ✅ focuses the search field |
| Dashboard with the API down rendered a full, empty shell with no error | ✅ error state with a retry, and a note that no data was lost |
| Activity tab showed hardcoded "Yesterday" / "3 days ago" for someone who applied seconds ago | ✅ real `applied_at` timestamp; states that a full audit trail isn't recorded |
| Onboarding discarded the company name and role title; job setup opened blank | ✅ role title/department/location carry through |
| No way to lock the workspace | ✅ sign-out in the top bar |

---

## Deliberately not fixed

- **Real PDF/DOCX resume parsing.** Needs a parsing library and a decision about
  storing uploaded files. The flow is now honest about the limitation, which is
  enough to ship.
- **Per-user accounts.** The shared access code covers a small trusted group.
  Real auth is a project, not an overnight fix.
- **Onboarding persistence.** The company name is kept client-side only; it
  doesn't appear anywhere that matters yet.
- **Command palette.** `⌘K` focuses search instead. A real palette is a feature,
  not a fix.
- **`navigator.clipboard` for the share link** fails silently on non-HTTPS
  origins while still showing "Copied". Serve over HTTPS and this is a non-issue;
  worth a fallback if you ever serve the app over plain HTTP.

---

## How this was verified

| Check | Result |
| --- | --- |
| `backend/tests/backend_test.py` | 39 passed (14 pre-existing + 25 new regression tests) |
| Standalone end-to-end API sweep | 34/34 checks pass (was 12 failures) |
| Chromium walkthrough of every screen | all flows pass, no JS errors |
| `npm run build` | compiles (lint warnings only) |

The pre-existing suite reported "14/14 pass" while all of the above was broken,
because every test was a happy-path `GET` against a hardcoded preview URL, with
no validation, permission, or failure-path coverage. It now points at
`localhost` by default and sends an access code.

## Before you let users in

1. Set `HR_ACCESS_CODE` to a long random value and share it out of band.
   `python3 -c "import secrets; print(secrets.token_urlsafe(24))"`
2. Set `ALLOWED_ORIGINS` to the real frontend origin — not `*`.
3. Set `REACT_APP_BACKEND_URL` before building the frontend.
4. Serve over HTTPS, so the share-link copy button works.
5. Rotate the access code when the pilot group changes.
