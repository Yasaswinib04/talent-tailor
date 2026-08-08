# UAT Test Plan — CRED HR Talent Engine

**Version:** 1.0 · **Date:** 2026-08-08 · **Target release:** 2026-08-09

## Scope

Covers the five product surfaces named in the PRD — HR Onboarding, Job Setup,
Candidate Dashboard, Candidate Profile, Public Apply — plus the backend API that
serves them. Every case below covers happy path, empty state, error state, or
cross-session persistence.

## Environment under test

| Component | Configuration |
|---|---|
| Frontend | Production CRA build (`react-scripts build`), served as a static SPA on `:3000` |
| Backend | `backend/server.py` (FastAPI) on `:8001`, in-memory Mongo, seed data on startup |
| Browser | Chromium 1194, 1440×900 desktop and 390×844 mobile |
| Auth | None — the build ships without any (`memory/test_credentials.md`) |

Two environment caveats, called out so they are not mistaken for product defects:
the sandbox proxy blocks Google Fonts, Fontshare, Unsplash and Pexels, so custom
fonts and avatars fall back in screenshots; and MongoDB is substituted with an
in-memory driver of the same interface. Neither affects any finding below.

## Test cases

### A. Configuration & deployability

| ID | Case | Expected |
|---|---|---|
| CFG-01 | Build frontend with no `REACT_APP_BACKEND_URL` | Build fails loudly, or API base falls back to a working default |
| CFG-02 | Start backend with only the variables in `.env.example` set | Server starts |
| CFG-03 | `.env.example` lists every variable the code reads | 1:1 match with `os.environ` / `process.env` usage |

### B. Report & Onboarding

| ID | Case | Expected |
|---|---|---|
| ONB-01 | Load `/`, click "Enter the app" | Dashboard renders |
| ONB-02 | Complete all 3 onboarding steps | Company, role and invites persist; role appears in Roles |
| ONB-03 | Reload after onboarding | Entered data still present |

### C. Job Setup

| ID | Case | Expected |
|---|---|---|
| JS-01 | Paste a JD, pause | Skills, salary, questions, filters, weights populate live |
| JS-02 | Apply the system-recommended filters unchanged | A workable share of the pool passes; the counter is non-zero |
| JS-03 | Drag scoring weights so the total ≠ 100% | Publish is blocked until corrected |
| JS-04 | Publish with a blank / whitespace-only title | Rejected with an inline message |
| JS-05 | Publish with `salary_min > salary_max` | Rejected |
| JS-06 | Publish a valid role | Redirects to Job Detail; role appears on the dashboard |
| JS-07 | `POST /api/jobs` omitting optional `filters` / `scoring_weights` | 200, defaults applied |

### D. Candidate Dashboard

| ID | Case | Expected |
|---|---|---|
| DSH-01 | Load `/app` | KPIs, role cards and candidate table populate |
| DSH-02 | Role-card candidate counts | Match the true number of assigned candidates |
| DSH-03 | Sidebar → Roles, then Candidates | Each shows a distinct view; only the current one is highlighted |
| DSH-04 | Type into the top-bar global search | Results filter |
| DSH-05 | Type into the table search | Results filter; the match pill updates |
| DSH-06 | `J`/`K`/`↵`/`X`/`N` shortcuts | Row cursor, open, select, new role |
| DSH-07 | Type `n` inside a text field | Does **not** navigate away |
| DSH-08 | Select rows, bulk Reject | Confirmation prompt, then stage change with feedback |
| DSH-09 | Filter to a combination with no matches | Empty state, not a blank table |
| DSH-10 | View at 390 px | Usable; no horizontal page scroll |

### E. Candidate Profile

| ID | Case | Expected |
|---|---|---|
| CP-01 | Open a candidate | Identity, match, stage, roles, tabs render |
| CP-02 | Assign to a second role | Chip appears; candidate shows under both roles |
| CP-03 | Remove every role | Prevented, or the candidate stays reachable |
| CP-04 | Write a note, navigate away, reload | Note persists |
| CP-05 | Set rating out of range via API | Rejected |
| CP-06 | Set an invalid stage via API | Rejected |
| CP-07 | Open an unknown candidate id | Not-found state, not an endless spinner |

### F. Public Apply

| ID | Case | Expected |
|---|---|---|
| PA-01 | Open a valid share link | Job details render |
| PA-02 | Open an unknown slug | "No longer active" message |
| PA-03 | Upload a real resume file | Fields reflect **that file's** contents |
| PA-04 | Submit the auto-filled form | Confirmation with a match score; candidate reaches the pipeline |
| PA-05 | Submit with name and email cleared | Rejected with inline validation |
| PA-06 | Submit negative experience / CTC | Rejected |
| PA-07 | Apply twice with the same email | De-duplicated to one candidate record |

### G. Cross-cutting: resilience, security, lifecycle

| ID | Case | Expected |
|---|---|---|
| X-01 | Hit `/api/*` and `/app` with no credentials | Denied — candidate PII is not public |
| X-02 | Kill the backend, reload the dashboard | Visible error state with a retry path |
| X-03 | Navigate to an unknown URL | 404 page |
| X-04 | `PATCH` a job/candidate with `{"id": "spoofed"}` | Rejected; immutable fields protected |
| X-05 | Delete a role that has candidates | Candidate `role_ids` cleaned up |
| X-06 | `/themes` in a production build | Not routable |
| X-07 | Store markup in a job title, view on the public page | Escaped or rejected |

## Exit criteria

Ship when every P0 is closed, no P1 remains open without a written owner and
date, and CFG-01→03 pass against the real deployment target.
