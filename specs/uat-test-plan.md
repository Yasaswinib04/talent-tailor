# UAT Test Plan — Talent Tailor (Talent Engine)

**Build under test:** `main` @ 8141bb8
**Environment:** local — backend `http://localhost:8000`, frontend `http://localhost:3000`, MongoDB `localhost:27017` / db `talent_tailor`
**Auth:** none in this build
**Date:** 2026-08-08
**Goal:** clear the product for a live HR conversation on 2026-08-09.

---

## Scope

In scope: all 8 shipped flows in `memory/PRD.md`, plus persistence and error states.
Out of scope: real resume parsing, ⌘K command palette, interviewer/calendar, email drips (all backlog, not built).

## Legend

`PASS` outcome matches expected · `FAIL` differs · `BLOCKED` cannot run

---

## TC-01 — Backend boots and seeds

**Precondition:** Mongo running, `talent_tailor` database empty.
**Steps**
1. Start uvicorn on port 8000.
2. `GET /api/health`
3. `GET /api/jobs`
4. `GET /api/candidates`

**Expected:** health returns ok; exactly 4 jobs; exactly 20 candidates; every job has a non-empty `share_slug`; every candidate has ≥1 entry in `role_ids`.
**Acceptance:** counts are 4 and 20 on a cold database, and re-running startup does **not** duplicate the seed.

---

## TC-02 — Onboarding, 3 steps

**Precondition:** fresh browser, navigate to `/onboarding`.
**Steps**
1. Step 1 — enter company name, continue.
2. Step 2 — enter first role, continue.
3. Step 3 — invite teammate, finish.
4. Land on `/app`.
5. Reload the page.

**Expected:** each step advances with a visible progress indicator; finishing lands on the dashboard.
**Acceptance:** flow completes without a dead end.
**Known risk (PRD P1):** onboarding is client-only and is not persisted to the backend — step 5 is expected to lose the entered company/role. Record the actual behaviour; do not auto-pass.

---

## TC-03 — Onboarding skip

**Steps:** from `/onboarding`, use the skip affordance.
**Expected:** lands directly on `/app` with the seeded 4 jobs visible.
**Acceptance:** no blank screen, no console error.

---

## TC-04 — Job setup with live skill extraction

**Precondition:** on `/app/jobs/new`.
**Steps**
1. Fill title `Senior Frontend Engineer`, department, location.
2. Paste a JD containing: `React, TypeScript, Next.js, GraphQL, design systems, senior`.
3. Observe the right-hand panel without clicking any extract button.

**Expected:** skills appear inline as React / TypeScript / Next.js / GraphQL / Design Systems with weights 2–5; salary suggestion shifts to the senior band (₹35L–₹65L); at least one screening question about production React appears.
**Acceptance:** extraction is visible without hunting for a hidden button — this is the core UX fix the redesign claims.

---

## TC-05 — Skill extraction, no recognised skills

**Steps:** in a new job, paste a JD with no dictionary terms (e.g. `We want a kind person who writes well.`).
**Expected:** falls back to Communication / Problem Solving / Collaboration; salary defaults to ₹15L–₹30L; question is "Why are you excited about this role?".
**Acceptance:** no empty panel, no crash.

---

## TC-06 — Advanced criteria, progressive disclosure

**Steps:** expand advanced criteria on the job setup screen.
**Expected:** mandatory filters (min experience, education, notice period, must-have skills, preferred companies, locations) and 5 scoring-weight sliders are hidden until expanded; weights carry a `RECOMMENDED · APPLIED` badge; `↻ restore recommended` is present.
**Acceptance:** defaults are pre-filled from the JD, and restore returns them after manual edits.

---

## TC-07 — Live "will pass" counter

**Steps**
1. With advanced criteria open, set min experience to `0` and note the counter.
2. Raise min experience to `8`.
3. Set education preference to `Tier-1`.
4. Set notice period max to `30` days.
5. Add a must-have skill no candidate has (e.g. `Rust`).

**Expected:** the passing count drops monotonically as each filter tightens; the per-filter breakdown attributes failures to the right reason; step 5 drives the count to 0.
**Acceptance:** numbers reconcile against `POST /api/candidates/preview-filter` called directly with the same payload.

---

## TC-08 — Location filter correctness

**Steps**
1. Set locations to `Bengaluru` only. Note the count.
2. Set locations to `Bengaluru, Remote` (the recommended default). Note the count.
3. Set locations to `Gurgaon` only. Note the count.

**Expected:** step 1 excludes the Noida and Gurgaon candidates; step 3 returns roughly one candidate.
**Acceptance:** adding `Remote` widens the pool by the Remote candidates only — it must not disable location filtering altogether.
**Suspected defect:** the backend skips the entire location check whenever `Remote` is among the selected locations, so the recommended default never rejects anyone on location. Verify and record.

---

## TC-09 — Scoring weights actually affect ranking

**Steps**
1. Note the dashboard candidate order for a role.
2. Return to the job, set skills weight to 100 and all others to 0. Save.
3. Return to the dashboard for that role.
4. Repeat with education weight at 100.

**Expected:** the ranked order changes between steps 2 and 4.
**Acceptance:** the 5 sliders demonstrably change who is at the top.
**Suspected defect:** `scoring_weights` is persisted on the job but never read by any scoring code. `match_score` is a fixed number baked into the seed data, and candidate lists sort on it. If confirmed, the sliders are decorative and this is the highest-severity finding in the build.

---

## TC-10 — Dashboard, funnel and list

**Steps:** open `/app`; check KPI band against `GET /api/analytics/summary`.
**Expected:** total jobs 4, total candidates 20, funnel counts across New / Shortlisted / Interview / Offer / Rejected sum to 20.
**Acceptance:** displayed numbers equal API numbers.

---

## TC-11 — Dashboard keyboard navigation

**Steps:** press `J`, `K`, `↵`, `N`, `X` in turn.
**Expected:** J/K move selection, ↵ opens the profile, N starts a new job, X applies the bulk/stage action per the on-screen legend.
**Acceptance:** every documented key does something; none throws a console error.
**Note:** ⌘K is a visual affordance only (PRD P1). Confirm it is not advertised as working, and do **not** demo it.

---

## TC-12 — Bulk stage actions

**Steps:** select 3 candidates, move them to `Shortlisted`.
**Expected:** all 3 update, the funnel KPI shifts by 3, and the change survives a reload.
**Acceptance:** `GET /api/candidates?stage=Shortlisted` reflects the new count.

---

## TC-13 — Candidate profile, multi-role assignment

**Steps**
1. Open a candidate.
2. Assign them to a second and third role via the chips/toggle menu.
3. Return to the dashboard and check each role's candidate count.
4. Remove one role.

**Expected:** chips reflect all assigned roles; each affected job's `candidates_count` increments and decrements correctly.
**Acceptance:** counts stay consistent across all 4 jobs after assign and unassign — this is one of the two features beta users explicitly asked for.

---

## TC-14 — Candidate profile, stage / rating / notes

**Steps:** change stage, set a rating, add a note, switch tabs, reload.
**Expected:** stage and rating persist. Notes: confirm whether they persist — there is no notes field on the `Candidate` model, so they may be client-only.
**Acceptance:** record persistence truthfully for each of the three.

---

## TC-15 — Public apply link, auto-apply (happy path)

**Steps**
1. Copy a job's share link and open `/apply/{slug}` in a clean window.
2. Upload a resume file.
3. Watch the scan animation, then the auto-filled form.
4. Submit.

**Expected:** job title and details render for the correct role; form auto-fills; submit returns a match score; the candidate appears on the dashboard for that role with stage `New` and an auto-applied marker.
**Acceptance:** end-to-end from public link to dashboard row, with the job's candidate count incremented by 1.
**Note:** the "scan" is simulated — skills are matched from typed text, not from the uploaded PDF's contents (PRD P2). Verify what the uploaded file actually contributes.

---

## TC-16 — Public apply, invalid slug

**Steps:** open `/apply/doesnotexist`.
**Expected:** a clean "job not found" state, not a stack trace or an infinite spinner.
**Acceptance:** the page degrades gracefully.

---

## TC-17 — Public apply, empty / malformed submission

**Steps:** submit with a blank name and a malformed email.
**Expected:** validation blocks the submit with a readable message.
**Acceptance:** no 500 from `POST /api/apply/{slug}`, no partial candidate written to the database.

---

## TC-18 — Cross-session persistence

**Steps**
1. Create a job, shortlist 2 candidates, assign one to a second role.
2. Quit the browser entirely and reopen `/app`.
3. Restart the backend process and reload.

**Expected:** all three changes survive both the browser restart and the backend restart; the seeder does not re-run or duplicate data.
**Acceptance:** counts and stages identical before and after.

---

## TC-19 — Empty states

**Steps:** filter the dashboard to a stage with no candidates; search for a nonsense string.
**Expected:** a designed empty state with a next action, not a blank panel.
**Acceptance:** no layout collapse.

---

## TC-20 — Backend down

**Steps:** stop uvicorn, then load `/app` and click through.
**Expected:** a visible error state telling the user something is wrong.
**Acceptance:** the app does not sit on a permanent skeleton loader with a silent console error.

---

## TC-21 — Report page

**Steps:** open `/`.
**Expected:** hero, metrics band, diagnosis/fix lists, before/after cards, principles, CTA all render; no broken images; nav to `/app` works.
**Acceptance:** presentable on a shared screen at 1440px.

---

## TC-22 — Responsive check at demo resolution

**Steps:** view `/app` and a candidate profile at 1440×900 and at 1280×800.
**Expected:** no horizontal scroll, no clipped controls.
**Acceptance:** safe to screen-share.

---

## QA gate

Ship to an HR conversation only if: TC-01, TC-04, TC-07, TC-12, TC-13, TC-15, TC-18 all pass.
TC-09 failing does not block a *discovery* conversation, but the scoring behaviour must be described accurately rather than demonstrated as working.
