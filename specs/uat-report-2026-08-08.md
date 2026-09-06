# UAT Report — Talent Tailor (Talent Engine)

> **Status: all findings below were fixed and retested on 2026-08-08.**
> See [Retest](#retest--2026-08-08) at the end for verified results. The original findings are
> kept as written so the before/after is auditable.

**Date:** 2026-08-08
**Build:** `main` @ 8141bb8
**Environment:** local — FastAPI `:8000`, React `:3000`, MongoDB `localhost:27017` / db `talent_tailor`
**Tested by:** QA pass against `specs/uat-test-plan.md`

---

## Summary

| Result | Count | Test cases |
|---|---|---|
| **Pass** | 12 | TC-01, TC-03, TC-04, TC-05, TC-06, TC-10, TC-12, TC-13, TC-15, TC-16, TC-18, TC-21 |
| **Fail** | 6 | TC-08, TC-09, TC-17, TC-20, plus two defects found outside the numbered plan (D-01, D-02) |
| **Partial** | 1 | TC-11 |
| **Blocked** | 3 | TC-02, TC-19, TC-22 |

### QA gate: **FAIL — do not present this as a working shortlisting product.**

The gate required TC-01, TC-04, TC-07, TC-12, TC-13, TC-15, TC-18 to pass. TC-07 passes mechanically but the shipped defaults make it produce a nonsense answer, and the two defects below break the product's core promise.

**The build is solid as a UX prototype and unsafe as a product demo.** The interface, information architecture, and interaction design are genuinely good — the redesign brief has been delivered. What is missing is the engine underneath: nothing in this build actually shortlists anyone.

---

## Blocking defects

### D-01 · Publishing a role produces a shortlist of zero — CRITICAL

The job setup screen tells the user "**2 of 20 candidates in your pool would pass these**" and renders a filter-impact breakdown. On publish, the role is created with `candidates_count: 0` and `GET /api/candidates?job_id=<new>` returns an empty list.

The filters are a **preview only**. They are stored on the job and never applied to assign, rank, or shortlist anyone. The advertised loop — *define criteria → get the right candidates* — is not connected end to end.

**Evidence:** published a Senior Frontend Engineer role via the UI with recommended filters applied; job `97dcd6e9` created with all filters and weights persisted correctly, and zero candidates attached.

**Impact:** this is the single sentence an HR will ask about. There is no answer in the current build.

---

### D-02 · "Bachelor's degree or equivalent" rejects every master's-degree candidate — CRITICAL

`_matches_education()` (`backend/server.py:456`) tests the bachelor's preference against the tokens `b.tech, b.e., b.sc, b.des, bachelor, b.a.` only. Anyone whose listed qualification is a master's has none of those tokens and is rejected.

**Evidence:** with only the education filter applied, 8 of 20 candidates fail — every one of them because their highest degree is *higher* than the requirement:

| Rejected | Qualification |
|---|---|
| Anand Iyer | M.Tech, IIT Madras |
| Aditya Bhatia | M.Tech, IIT Roorkee |
| Priya Desai | MBA, IIM Ahmedabad |
| Meera Krishnan | MBA, ISB Hyderabad |
| Nikhil Verma | MBA, IIM Bangalore |
| Kavita Rangan | M.Des, IDC IIT Bombay |
| Pooja Agarwal | M.Des, IIT Guwahati |
| Ananya Reddy | M.Sc., Srishti Institute |

This filter is **applied by default** on every new role. An HR will spot it within seconds, and it disqualifies the strongest people in the pool.

---

## Failed test cases

### TC-09 · Scoring weights do not affect anything — FAIL, HIGH

The 5 weight sliders (skills / experience / education / notice / cultural fit) save to the job and are read by nothing. `match_score` is a fixed integer baked into the seed data; candidate lists sort on that stored value.

**Evidence:** set `skills:100` (all others 0) → top 6 order unchanged. Set `education:100` (all others 0) → identical order. Verified the weights persisted on the job between runs.

```
baseline        skills=100      education=100
92 Rohan        92 Rohan        92 Rohan
90 Neha         90 Neha         90 Neha
86 Siddharth    86 Siddharth    86 Siddharth
```

Aggravating factor: the section is labelled "**How the match score is calculated**" and carries a `RECOMMENDED · APPLIED` badge. The UI states something untrue rather than merely omitting a feature.

---

### TC-08 · Adding "Remote" silently disables location filtering — FAIL, HIGH

In `preview_filter()` (`backend/server.py:508`), when `remote` appears in the accepted locations the entire location check is skipped for every candidate.

**Evidence:**

| Filter | Passing | Expected |
|---|---|---|
| `[Bengaluru]` | 15/20 | 15 ✓ |
| `[Bengaluru, Remote]` | **20/20** | 18 — Noida and Gurgaon candidates wrongly pass |
| `[Mars]` | 0/20 | 0 ✓ |
| `[Mars, Remote]` | **20/20** | 3 |

`["Bengaluru", "Remote"]` is the **recommended default** on every role, so the location filter never rejects anyone out of the box.

---

### TC-17 · No server-side validation on public apply — FAIL, HIGH

`POST /api/apply/{slug}` with `{"name": "", "email": "not-an-email"}` returns **200 OK** and writes the candidate. A nameless row with an invalid email appeared in the pipeline and on the dashboard.

There is no validation beyond Pydantic type-checking, and no delete-candidate endpoint, so bad rows cannot be removed through the product. (The test row was removed directly in MongoDB during cleanup.)

---

### TC-20 · No error state when the backend is unreachable — FAIL, MEDIUM

With uvicorn stopped, `/app` renders an unhandled `AxiosError: Network Error`, the KPI band disappears, and the candidate table shows "**No candidates match these filters**" — telling the user their filters excluded everyone when in fact the server is down.

The red stack-trace overlay is CRA's dev-mode overlay and will not appear in a production build. The unhandled rejection, the absent error state, and the misleading empty-state copy will.

---

## Partial

### TC-11 · Keyboard navigation — PARTIAL

`J` / `K` / `↵` / `N` / `X` all work correctly; `X` selects and the bulk action bar appears. **`⌘K` does nothing** — `AppShell.js:74` renders the badge as a static `<span>` with no handler. It is advertised prominently in the search bar. Do not press it during a demo.

Minor: the bulk action bar overlays the selected row and covers its "Current" column.

---

## Additional findings

- **Auto-applied candidates are unfilterable.** `POST /api/apply` writes `location: "—"`, `education: "—"`, `notice_period: "—"` — the exact three fields the mandatory filters screen on. Every candidate who arrives via the shareable link therefore fails the role's own education and location filters. The intake half and the shortlisting half of the product do not share a data contract.
- **Must-have skills use a strict subset test.** The recommended default sets must-haves to the JD's top 3 skills and requires *all* of them, so 18 of 20 candidates fail. Combined with D-02, the shipped defaults take a 20-person pool down to 2.
- **An unrecognised JD recommends must-haves that nobody can satisfy** — Communication / Problem Solving / Collaboration are not in any candidate record, so the live counter reads 0 will pass on a first run with a plain-English JD.
- **`no_gaps_over_months`** is returned in recommended filters and never evaluated. Dead filter.
- **`AVATAR_POOL[hash(email) % len]`** uses Python's randomised string `hash()`, so an auto-applied candidate's avatar changes on every backend restart.
- Repo hygiene: `README.md` is unmodified AI Studio boilerplate with wrong run instructions; `.env.example` describes Gemini + Postgres + Supabase while the app actually needs `MONGO_URL` + `DB_NAME`; no `.env` files were committed, so the backend crashes on import out of the box. Working `.env` files were created during setup.

---

## Blocked

- **TC-02 / TC-19 / TC-22** — the automated browser pane runs with `document.visibilityState: "hidden"`, which throttles framer-motion. Entrance animations do not complete, so step transitions and empty states could not be judged reliably. Observed step-content desync during onboarding is **an artifact of this, not a confirmed defect**. Click through onboarding manually before relying on it.

---

## What passed, and passed well

- **TC-04 live skill extraction** — genuinely good. 8 skills, salary band, screening questions and recommended filters all appear as you stop typing, with no button to hunt for. This is the brief's central complaint, fixed.
- **TC-06 progressive disclosure** and the filter-impact panel (`20→2 pass`, with `−10 experience / −8 education / −18 must-have` attribution) are a strong piece of interaction design. The presentation is right; only the numbers underneath are wrong.
- **TC-13 multi-role assignment** — assign and unassign keep `candidates_count` correct across all 5 jobs. One of the two explicitly beta-requested features, working.
- **TC-15 auto-apply** — public link → demo resume → auto-filled form → submit → scored candidate on the dashboard, count incremented. The other beta-requested feature, working end to end.
- **TC-12 bulk stage actions** and **TC-18 persistence** across both browser and backend restart, with no seed duplication.
- **TC-01** cold-start seeding, **TC-16** 404s on bad slugs, **TC-21** report page.

---

## Recommended fix order

**Before showing it to anyone as a product** (est. half a day):

1. **D-02** — make education preference a floor, not an exact match: treat a master's/PhD as satisfying "bachelor's or equivalent" (`server.py:456`).
2. **D-01** — on publish, apply the filters and attach passing candidates to the role, so "2 will pass" produces an actual shortlist.
3. **TC-08** — treat `Remote` as one accepted location, not a wildcard that skips the check (`server.py:508`).
4. Soften the must-have default — require *any* of the top skills, or default the list to empty.

**Before claiming AI shortlisting** (est. 1 day):

5. **TC-09** — compute `match_score` per role from the weights, or remove the sliders and the "how the match score is calculated" copy.
6. **TC-17** — validate name and email server-side; return 422 on bad input.

**Demo hygiene** (est. 1 hour):

7. Hide the `⌘K` badge until it works.
8. Add an error state for backend-unreachable, and distinguish it from "no results".
9. Fix `README.md` and `.env.example` so a second machine can run this.

---

# Retest — 2026-08-08

Every item above was fixed and reverified. **QA gate: PASS.**
Backend suite `backend/tests/backend_test.py`: **14/14 passing**.

## Blocking defects

| ID | Fix | Verified |
|---|---|---|
| **D-01** publish yields no shortlist | Publishing now runs the role's filters across the pool and attaches everyone who clears them. Preview and publish share one code path (`_filter_failures`), so they cannot disagree. Editing a role's filters re-runs the attach. | Published from the UI: preview said "9 will pass" → role created with `candidates_count: 9` → 9 candidates actually attached. |
| **D-02** bachelor's rejects master's | Education is now a *floor* via `_education_level()` (none/bachelor/master/doctorate). A master's satisfies "bachelor's or equivalent"; "master's or higher" still excludes bachelor's-only. | "Bachelor's or equivalent" 12/20 → **20/20**. "Master's or higher" correctly returns 11. All 8 wrongly-rejected candidates now pass. |

## Failed cases

| ID | Fix | Verified |
|---|---|---|
| **TC-09** dead scoring sliders | Real scoring engine. Five dimensions scored 0–100 independently (`_score_components`), combined by the role's weights (`_score_candidate`), computed per role at query time. Responses include a `score_breakdown`. | Ranking now genuinely reorders: `education=100` puts M.Tech/MBA on top; `notice=100` puts short-notice candidates on top; `skills=100` puts full-skill matches at 100. |
| **TC-08** Remote wildcard | Each accepted location is matched on its own merits; Remote is one of them, not a bypass. | `[Bengaluru,Remote]` 20/20 → **18/20** (Noida and Gurgaon correctly excluded). `[Mars,Remote]` 20/20 → **3/20**. |
| **TC-17** no apply validation | Pydantic `field_validator`s on name, title, company, email, and experience range. UI surfaces the message and keeps the candidate on the form. | Blank name / bad email / negative experience all return **422**; zero blank rows written. UI shows "name is required" inline. |
| **TC-20** no backend-down state | `load()` catches failures and renders a "Couldn't load your pipeline" banner with a Retry button; the table no longer claims the filters excluded everyone. | Verified with the backend stopped, and Retry recovers cleanly once it is back. |
| **TC-11** dead ⌘K badge | Badge removed from the top bar until a palette exists. `J/K/↵/N/X` legend kept — those work. | No `.kbd` element remains in the top bar. |

## Also fixed

- **Auto-applied candidates are now filterable** — the apply form captures location, highest qualification, and notice period, and the API stores them. These candidates are scored against the role on the same basis as everyone else (verified: Aarav Menon scored 78, ranked correctly mid-pack).
- **Must-have skills default to empty** — pre-filling the top 3 as a strict AND was disqualifying 18 of 20. Extracted skills still drive the score; a hard requirement is now opt-in. Net effect on a senior frontend role: **2 of 20 → 9 of 20** pass the recommended defaults.
- **Missing data never rejects a candidate** — an unknown education, location, or notice period surfaces the person for the recruiter to judge rather than silently dropping them. In *scoring*, unknown is neutral (not best), so missing data cannot out-rank a declared value.
- **Job creation without filters** — pre-existing 500 (`JobCreate` sends `None`, `Job` requires dicts). This was failing the repo's own `test_create_job` before any of this work. Fixed.
- **Non-deterministic avatars** — `hash()` (randomised per process) replaced with `zlib.crc32`, so an applicant's avatar survives a restart.
- **Dead `no_gaps_over_months` filter** removed — it was returned in recommendations and never evaluated.
- **Repo hygiene** — `README.md` rewritten with real setup, run, and matching-behaviour docs; `.env.example` now describes the variables the app actually reads; `backend_test.py` no longer defaults to a dead Emergent preview URL.

## Still open (unchanged, and by design)

- Skill extraction is a keyword dictionary, not an LLM. Resume parsing on the apply page is simulated — the uploaded file is not read. Both are documented in the README; describe them accurately rather than demonstrating them as AI.
- Onboarding is still client-only and not persisted (PRD P1).
- TC-02 / TC-19 / TC-22 remain unverified by automation for the reason given above; click through onboarding manually.
