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
- ✅ Command-center dashboard with keyboard nav (J/K/↵/N/X), bulk stage actions, funnel KPIs
- ✅ Candidate profile with **multi-role assignment** (chips + toggle menu), stage, rating, notes, activity, tabs
- ✅ Public shareable job link with **auto-apply** (upload → scan animation → auto-filled form → 1-click submit + match score)
- ✅ Mock heuristic skill extractor + salary suggestion + screening question generator
- ✅ Backend endpoints: /jobs, /jobs/{id}, /jobs/share/{slug}, /extract-skills, /candidates, /candidates/{id}/stage, /candidates/{id}/assign-roles, /apply/{slug}, /analytics/summary
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
