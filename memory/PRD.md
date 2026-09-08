# Talent Tailor — Candidate Shortlisting Engine

## Original problem statement
An HR app to evaluate 100s of candidates faster. The original design wasn't good from a UX perspective: onboarding was chaotic, setting up a job role was confusing (e.g. the Extract Skills button was hidden). Beta users asked for: (1) auto-apply from the shareable link and (2) one profile assignable to multiple roles.

Expected outcome: a UX report on the changes + a new, easy-to-use template prototype.

## User choices captured
- Scope: **Both** — interactive prototype **and** UX report page.
- Screens: HR Onboarding · Job Setup · Candidate Dashboard · Candidate Profile · Public Apply link.
- AI features: **Mocked** but realistic (Indian names / Indian salary ranges).
- Visual direction: designer's call.

## Design direction — corrected Sep 2026
The brief "think like a principal product designer at CRED / Swiggy" was **misread as a styling instruction**. `design_guidelines.json` had literally carried `"brand": "CRED"`, an "archetype" label, obsidian + copper + Cormorant Garamond — copying the *surface* of a product built for a different user with a different job.

The correction: borrow the **reasoning**, not the look. CRED's design works because its job-to-be-done is emotional (a boring, slightly shameful bill → ceremony and restraint). Swiggy's works because its job is anxious and time-boxed (→ live state, big legible numbers, instant reversibility). Neither look transfers; the method does.

**Our user**: an in-house recruiter screening hundreds of applicants per role, in daylight, alongside an ATS tab and a PDF resume. **Their job**: get to a shortlist they can defend to a hiring manager without missing someone good. **Dominant emotions**: overwhelm at volume, fear of being wrong about a person. **The test**: every decision must reduce one of those two, or it's cost, not polish.

The eight principles derived from that now live in `design_guidelines.json` and constrain future work:
never show a number you can't explain · colour means state, not brand · undo over confirm · show uncertainty rather than fake confidence · density with escape hatches · affordances must be real · empty and error states are primary screens · ask at activation, not at the door.

## Architecture
- **Frontend**: React 18 (CRA) + Tailwind + Framer Motion + Radix UI + lucide-react. Routes: `/` (landing), `/report` (UX report), `/onboarding`, `/app`, `/app/jobs/new`, `/app/jobs/:id`, `/app/candidates/:cid`, `/apply/:slug`, `/themes`.
- **Backend**: FastAPI + MongoDB (motor). Routes prefixed `/api`. Seeds 4 jobs + 20 realistic Indian candidates on startup.
- **Design tokens** in `design_guidelines.json`: colour named by *role* (action / pass / attention / fail), so the planned light-first surface changes values without touching components. Cabinet Grotesk (display), Satoshi (body), JetBrains Mono (machine values only), Cormorant Garamond (report page only).

## What's been implemented
- ✅ Landing page at `/`; UX report moved to `/report`
- ✅ 3-step onboarding (company → first role → invite; heavily simplified from prior chaos)
- ✅ Job setup wizard with **live skill extraction** — inline on right, no hidden button
- ✅ **Deep advanced criteria** (progressive disclosure, optional): mandatory filters (min experience, education, notice period, must-have skills, preferred companies, locations) + scoring weights (5 sliders, system-recommended with `RECOMMENDED · APPLIED` badge, `↻ restore recommended` link)
- ✅ **Live "will pass" counter** — as HR edits any filter, backend previews how many candidates would clear the bar + per-filter breakdown of who fails and why
- ✅ Command-center dashboard with keyboard nav (J/K/↵/N/X), bulk stage actions, funnel KPIs
- ✅ Candidate profile with **multi-role assignment** (chips + toggle menu), stage, rating, notes, activity, tabs
- ✅ Public shareable job link with **auto-apply** (upload → scan animation → auto-filled form → 1-click submit + match score)
- ✅ **Theme explorations page** (`/themes`) — 6 side-by-side previews
- ✅ Activation capture — sign-in asked at first meaningful action, not at the door
- ✅ **Explainable match scores** (PR #6) — `/api/candidates` and `/api/candidates/{cid}` return `score_evidence`: each dimension's sub-score, the weight it carried, and the fact behind it ("1 of 3 role skills — missing Kafka, gRPC"), plus `scored_against` naming the role. Dashboard rows expand in place; profile shows it inline. Missing data reports itself in words rather than scoring silently.
- ✅ **Undo on bulk stage changes** (PR #6) — prior stages captured before the write; a specific 12s undo bar replaces any confirm dialog
- ✅ Backend endpoints: /jobs (with filters + scoring_weights), /jobs/share/{slug}, /extract-skills, /candidates/preview-filter, /candidates, /candidates/{id}, /candidates/{id}/stage, /candidates/{id}/assign-roles, /apply/{slug}, /analytics/summary
- ✅ Deploy blueprint: free Render + MongoDB Atlas (`render.yaml`, `DEPLOY.md`)

## Bugs found and fixed
- **Notice period units ignored** (Sep 2026, PR #6) — `_parse_notice_days` took the first integer and called it days, so `"2 months"` → 2 and a two-month notice outranked a thirty-day one in *both* the live filter and the match score. Now honours months/weeks. Found by rendering the score's reasoning in plain language, which read `"2 months notice period (2 days)"`.
- **Fake ⌘K affordance** — the badge was removed from AppShell earlier; the `/report` copy still advertised it and now doesn't.

## Prioritized backlog
- **P1** — **Light-first surface swap.** The largest remaining item from the design review. Nothing in the recruiter's job justifies obsidian: they stare at a dense table for hours, in daylight, next to other tabs. Token renaming in `design_guidelines.json` is already done as groundwork; dark becomes a preference, not the default. Editorial serif stays confined to `/report`.
- **P1** — **Extraction confidence in Job Setup.** Extraction is a heuristic dictionary; presenting every chip with equal confidence is the product quietly lying. Low-confidence extractions should look different and invite correction, and corrections should visibly move the "will pass" count.
- **P1** — **Day-one empty state.** A recruiter with zero candidates currently sees the least-designed screen in the app; that's where trust is won or lost.
- **P1** — Persist onboarding to backend (currently client-only; skip button jumps directly to app)
- **P2** — Command palette (`⌘K`) — ship it properly or leave the affordance absent
- **P2** — Real resume parsing (PDF.js on candidate side) instead of simulated scan
- **P2** — Interviewer assignment + calendar sync
- **P2** — Analytics deep-dive page (funnel, time-in-stage, source ROI)
- **P3** — Email drip templates for candidates
- **P3** — Multi-recruiter collaboration (mentions, approvals)

## Testing status
- Backend suite: 14/14 passing as of the last full run (`backend/tests/backend_test.py`).
- ⚠️ **PR #6 was not covered by that run.** The dev container has no MongoDB and a broken `cryptography`/pyo3 build, so `motor` was stubbed to reach the pure scoring functions. Verified directly: full candidate 70, sparse candidate 29, weights sum to 100, evidence renders on the no-weights/no-skills fallback, notice parsing correct across Immediate/15 days/30 days/1 month/2 months/3 weeks/unknown. All 11 JSX files parse clean.
- **Needs a UAT pass before merging #6**: the score expand-row interaction and the bulk-undo flow, in a browser against real data.

## Next tasks
- UAT the PR #6 interactions, then merge
- Light-first surface swap (P1 above) — its own PR
- Extraction confidence + day-one empty state
- Integrate real Gemini/Claude for skill extraction if desired (currently heuristic dictionary)
