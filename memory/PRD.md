# CRED HR — Talent Engine (Redesign)

## Original problem statement
Principal Product Designer at CRED launching an HR app to evaluate 100s of candidates faster. The current design isn't good from a UX perspective. Onboarding is chaotic. Setting up a job role is confusing (e.g. Extract Skills button is hidden). Beta users asked for: (1) auto-apply from the shareable link and (2) one profile assignable to multiple roles.

Expected outcome: a UX report on the changes + a new, easy-to-use template prototype.

## User choices captured
- Scope: **Both** — interactive prototype **and** UX report page.
- Screens: HR Onboarding · Job Setup · Candidate Dashboard · Candidate Profile · Public Apply link.
- AI features: originally **mocked**. Now real — resume parsing (pypdf/python-docx), weighted match scoring, and a proper skill taxonomy (`backend/skills.py`: 119 skills, 365 aliases, 50 groups) with token-boundary matching, context-aware weighting and equivalent/adjacent suggestions. Deterministic and offline; an LLM would add nuance but is no longer needed for correctness.
- Visual direction: designer's call — chose **CRED-inspired dark, editorial, mono accents** with copper (#B28A5D) accents.

## Architecture
- **Frontend**: React 18 (CRA) + Tailwind + Framer Motion + Radix UI + lucide-react. Routes: `/` (report), `/onboarding`, `/app`, `/app/jobs/new`, `/app/jobs/:id`, `/app/candidates/:cid`, `/apply/:slug`.
- **Backend**: FastAPI + MongoDB (motor). Routes prefixed `/api`. Optional demo seed (4 jobs + 20 sample candidates) behind `SEED_DEMO_DATA`, off by default.
- **Design tokens** in `/app/design_guidelines.json`: Cormorant Garamond (editorial), Cabinet Grotesk (display), Satoshi (body), JetBrains Mono (labels/keyboard).

## What's been implemented (Jan 2026)
- ✅ UX Report page — hero, metrics band, diagnosis/fix lists, before/after cards, principles, CTA
- ✅ 3-step onboarding (company → first role → invite; heavily simplified from prior chaos)
- ✅ Job setup wizard with **live skill extraction** — inline on right, no hidden button
- ✅ **Deep advanced criteria** (progressive disclosure, optional): mandatory filters (min experience, education, notice period, must-have skills, preferred companies, locations) + scoring weights (5 sliders, system-recommended with `RECOMMENDED · APPLIED` badge, `↻ restore recommended` link)
- ✅ **Live "will pass" counter** — as HR edits any filter, backend previews how many candidates from the current pool would clear the bar + per-filter breakdown of who fails and why
- ✅ Command-center dashboard with keyboard nav (J/K/↵/N/X), bulk stage actions, funnel KPIs
- ✅ Candidate profile with **multi-role assignment** (chips + toggle menu), stage, rating, notes, activity, tabs, Airbnb-style humane portrait banner
- ✅ Public shareable job link with **auto-apply** (upload → scan animation → auto-filled form → 1-click submit + match score)
- ✅ **Recruiter bulk resume upload** (Aug 2026) — drag/drop up to **10 resumes per batch** against a role. Real parsing of PDF/DOCX/TXT (pypdf + python-docx): name, email, phone, title, company, years, CTC, notice, education, skills. Each file reported individually so one bad resume never fails the batch; existing candidates are attached to the role rather than duplicated. Batch cap and a 12-batch/minute rate limit are enforced server-side, not just in the UI.
- ✅ **Theme explorations page** (`/themes`) — 6 side-by-side previews
- ✅ **Theme rebuild**: Linear-inspired indigo (`#5E6AD2`) analytical aesthetic across the app with Airbnb humane touch on candidate portraits; editorial serif reserved for report hero
- ✅ Backend endpoints: /jobs (with filters + scoring_weights), /jobs/share/{slug}, /jobs/{id}/bulk-upload (recruiter batch intake), /extract-skills (returns recommended_filters + recommended_weights), /candidates/preview-filter (live filter impact preview), /candidates, /candidates/{id}/stage, /candidates/{id}/assign-roles, /apply/{slug}, /analytics/summary
- ✅ Bulk upload tests: 18/18 pass locally (`backend/tests/test_bulk_upload.py`, no server needed)

## Known state (UAT, Aug 2026)
A full UAT found 5 P0 and 8 P1 issues — see `specs/uat-report-2026-08-08.md` and
`specs/launch-fix-plan.md`. **All five P0s are now fixed** (Track 0): the
build-time backend URL, `.env.example`, the job-create 500, unvalidated PATCH,
and missing frontend error states. 50 backend tests pass.

**Authentication shipped (P0-3 closed).** Per-recruiter accounts, bcrypt
passwords, opaque server-side sessions in an httpOnly cookie, login throttling,
admin-only account creation. Every `/api` route requires a session except
`/api/health`, `/api/jobs/share/{slug}` and `/api/apply/{slug}` — candidates
applying via a share link have no account. First admin is bootstrapped from
ADMIN_EMAIL/ADMIN_PASSWORD; there is no default password.

Note: `CORS_ORIGINS` must name the frontend's exact origin. Cookies are not sent
to a wildcard origin, so `"*"` makes sign-in fail like a network error. The API
warns at startup.

**Pipeline integrity fixed (Track B part 1).** The public apply path validates
name/email/experience/CTC with inline per-field errors; re-applying updates the
existing candidate and attaches the role instead of duplicating; deleting a role
detaches it from candidates rather than orphaning them, with an Unassigned
filter keeping them reachable; and recommended filters are verified against the
real pool and back off until they leave a shortlist (0 of 20 → 4 of 20 on the
sample JD). Unknown education/notice/location no longer auto-reject — they are
counted and surfaced instead, which matters once real resumes are parsed.

**Nothing is mocked any more (Aug 2026).** Demo seed data is behind
`SEED_DEMO_DATA` and off by default; candidate-side resume upload parses the
real file instead of a hardcoded sample; the scoring weights actually compute
the match score and rescore on edit; dashboard KPIs are computed and return null
rather than inventing numbers; the activity feed is a real event log with actor
and timestamp; onboarding persists and creates the first role. Sidebar tabs,
global search and ⌘K work. Candidate lists are paginated.

**Skill extraction rebuilt (Aug 2026).** The old 56-alias substring matcher
produced phantom skills on nearly every JD — "HTML" yielded Machine Learning,
"JavaScript" yielded Java, "you will go deep" yielded Golang — and those fed
straight into must_have_skills. Replaced with `backend/skills.py`: token-boundary
matching, case-sensitive guards for ambiguous aliases (Go/ML/AI/C#/C++),
line-scoped must-have vs nice-to-have weighting, and equivalent/adjacent skill
suggestions. The role editor lets a recruiter rename any extracted skill, accept
or dismiss suggestions, and type-ahead against the taxonomy.

**Responsive (Aug 2026).** The sidebar is an off-canvas drawer below `md`; the
candidate table scrolls in its own container and sheds columns by breakpoint;
every screen fits 375/390/768px with no horizontal page scroll. Desktop layout
is unchanged. No known non-working features remain.

## Prioritized backlog
- **P2** — ⌘K opens a full command palette rather than only focusing search
- **P2** — Interviewer assignment + calendar sync
- **P2** — Analytics deep-dive page (funnel, time-in-stage, source ROI)
- **P2** — Self-host fonts and imagery; today they load from Google Fonts,
  Fontshare, Unsplash and Pexels with no fallback
- **P3** — Email drip templates for candidates
- **P3** — Multi-recruiter collaboration (mentions, approvals)
- **P3** — LLM-backed skill extraction as a *supplement* to the taxonomy, for
  skills outside it and for reading unusual phrasing

## Done, previously on this list
- ✅ Persist onboarding to the backend
- ✅ Real resume parsing on the candidate side
- ✅ Responsive layout down to 375px
