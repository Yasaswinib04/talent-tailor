# CRED HR — Talent Engine (Redesign)

## Original problem statement
Principal Product Designer at CRED launching an HR app to evaluate 100s of candidates faster. The current design isn't good from a UX perspective. Onboarding is chaotic. Setting up a job role is confusing (e.g. Extract Skills button is hidden). Beta users asked for: (1) auto-apply from the shareable link and (2) one profile assignable to multiple roles.

Expected outcome: a UX report on the changes + a new, easy-to-use template prototype.

## User choices captured
- Scope: **Both** — interactive prototype **and** UX report page.
- Screens: HR Onboarding · Job Setup · Candidate Dashboard · Candidate Profile · Public Apply link.
- AI features: **Mocked** but realistic (Indian names / Indian salary ranges).
- Visual direction: designer's call — chose **CRED-inspired dark, editorial, mono accents** with copper (#B28A5D) accents.

## Architecture
- **Frontend**: React 18 (CRA) + Tailwind + Framer Motion + Radix UI + lucide-react. Routes: `/` (report), `/onboarding`, `/app`, `/app/jobs/new`, `/app/jobs/:id`, `/app/candidates/:cid`, `/apply/:slug`.
- **Backend**: FastAPI + MongoDB (motor). Routes prefixed `/api`. Seeds 4 jobs + 20 realistic Indian candidates on startup.
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

**Remaining (P2, none launch-blocking):** dead sidebar nav and non-functional
global search, no confirm on bulk reject, publish allowed with weights ≠ 100%,
unusable on mobile, no pagination past 1000, share_slug uniqueness. Track B in
the fix plan.

## Prioritized backlog
- **P1** — Persist onboarding to backend (currently client-only; skip button jumps directly to app)
- **P1** — Command palette (`⌘K`) — currently visual affordance only
- **P2** — Real resume parsing (PDF.js on candidate side) instead of simulated scan
- **P2** — Interviewer assignment + calendar sync
- **P2** — Analytics deep-dive page (funnel, time-in-stage, source ROI)
- **P3** — Email drip templates for candidates
- **P3** — Multi-recruiter collaboration (mentions, approvals)

## Next tasks
- User review of the prototype
- Any refinement to specific screens the user wants
- Integrate real Gemini/Claude for skill extraction if desired (currently heuristic dictionary)
