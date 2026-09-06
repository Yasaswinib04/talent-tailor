# Talent Tailor — Talent Engine (Redesign)

## Original problem statement
Principal Product Designer launching an HR app to evaluate 100s of candidates faster. The current design isn't good from a UX perspective. Onboarding is chaotic. Setting up a job role is confusing (e.g. Extract Skills button is hidden). Beta users asked for: (1) auto-apply from the shareable link and (2) one profile assignable to multiple roles.

Expected outcome: a UX report on the changes + a new, easy-to-use template prototype.

## User choices captured
- Scope: **Both** — interactive prototype **and** UX report page.
- Screens: HR Onboarding · Job Setup · Candidate Dashboard · Candidate Profile · Public Apply link.
- AI features: **Mocked** but realistic (Indian names / Indian salary ranges).
- Visual direction: designer's call — chose **dark, editorial, mono accents** with copper (#B28A5D) accents.

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
- ✅ **Theme explorations page** (`/themes`) — 6 side-by-side previews
- ✅ **Theme rebuild**: Linear-inspired indigo (`#5E6AD2`) analytical aesthetic across the app with Airbnb humane touch on candidate portraits; editorial serif reserved for report hero
- ✅ Backend endpoints: /jobs (with filters + scoring_weights), /jobs/share/{slug}, /extract-skills (returns recommended_filters + recommended_weights), /candidates/preview-filter (live filter impact preview), /candidates, /candidates/{id}/stage, /candidates/{id}/assign-roles, /apply/{slug}, /analytics/summary
- ✅ End-to-end tests: 14/14 backend pass, 100% frontend flows verified

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
