# Talent Tailor — UAT log

The running record of every UAT round. One file, appended per round. Older
round-specific reports (`uat-report-2026-08-08.md`) stay where they are; new
rounds go here so there is one place to look. Ideas parked for later live in
[`BACKLOG.md`](BACKLOG.md).

**Status legend:** `OPEN` · `AGREED` (signed off, not built) · `FIXED` · `DEFERRED` · `WONTFIX`

---

## Round 2 — 2026-09-06

Tester: Sweety (PM). Environment: https://talent-engine.yomnita.com, signed-in
account with an **empty candidate pool**. Focus: sidebar navigation and the
new-role flow.

Proposal + before/after mockups: https://claude.ai/code/artifact/1e7dce7a-bfa6-426e-8a4d-d76af6c57b7d

| ID | Sev | Summary | Where | Status |
|----|-----|---------|-------|--------|
| UAT-01 | Blocker | "Publish role" is unclickable and never says why | `frontend/src/pages/JobSetup.js:168` | **FIXED** 2026-09-06 |
| UAT-02 | Blocker | No publish CTA at the bottom, where the form ends | `frontend/src/pages/JobSetup.js:155` | **FIXED** 2026-09-12 |
| UAT-03 | High | Overview / Roles / Candidates render the identical page | `frontend/src/pages/Dashboard.js:10`, `AppShell.js:19` | **FIXED** 2026-09-06 |
| UAT-04 | High | Pool is filtered live during role setup — remove it; eligible candidates surface after publish | `frontend/src/pages/JobSetup.js:546`, `:526` | **PARTIAL** — empty-pool false alarm killed; preview not yet moved to role page |
| UAT-05 | High | Right panel never says what it is, or that it's working | `frontend/src/pages/JobSetup.js:420` | **PARTIAL** — panel renamed "reading your JD"; loader/skeletons still to do |
| UAT-06 | Medium | Helper line under the JD box — delete it rather than rewrite it | `frontend/src/pages/JobSetup.js:247` | **FIXED** 2026-09-06 — line deleted |
| UAT-07 | Medium | Sidebar "New role" button sits below the fold | `frontend/src/components/AppShell.js:11` | **FIXED** 2026-09-06 |
| UAT-08 | Medium | Split is welded at 50/50 — needs a draggable splitter, default 62/38 | `frontend/src/pages/JobSetup.js:184` | OPEN |
| UAT-09 | Medium | Manually-added must-have skills don't join "Skills detected" and never score | `frontend/src/pages/JobSetup.js:311`, `:537` | OPEN |
| UAT-10 | Low | Product name appears three times in the top-left | `frontend/src/components/AppShell.js:13` | **FIXED** 2026-09-06 |
| UAT-13 | Blocker | Candidate can be in many roles but has one shared stage and one shared match score | `backend/server.py:219`, `:1141`, `:566` | OPEN |
| UAT-12 | High | Fields look pre-filled: placeholders read as values, and real defaults reject candidates on load | `frontend/src/pages/JobSetup.js:38`, `:194` | **PARTIAL** — "e.g." placeholder + permissive filter defaults shipped; `default` tags still to do |
| UAT-11 | Low | Collapsible sidebar | `frontend/src/components/AppShell.js:11` | DEFERRED → [BL-02](BACKLOG.md) |

### Detail

**UAT-01 · Publish is dead, silently.**
Button is `disabled={saving || !form.title}`. The title field was empty — the
visible "Senior Frontend Engineer" is placeholder text at 20% opacity, easily
read as a filled value. Fix: placeholder prefixed "e.g.", `required` marker on
the label, and the button stops being disabled — clicking with a missing field
scrolls to it, focuses it, and shows an inline warning.

**UAT-02 · Nothing to click where the work ends.**
The only Publish lives in the sticky top bar, four scroll-screens above where
the form finishes. Nothing states what publishing does.

*Revised 2026-09-06.* First proposal kept Save draft at the top and moved Publish
to the bottom. Tester flagged that **splitting related actions across two ends of
the screen is its own problem** — it makes people hunt for controls.

Fix: **one sticky bottom bar** holding Cancel, Save draft, Publish role, primary
bottom-right. **Nothing duplicated at the top** — the top bar becomes pure
context (back, "new role · draft", title), with room for a quiet "saved 2s ago"
once drafts autosave. Plus the readiness line and one sentence saying what
publish does.

**Shipped 2026-09-12.** One sticky bottom bar, `sticky bottom-0` so it pins while
the four-screen form scrolls and settles at the true bottom. Cancel and Publish
role (primary, bottom-right) are there and **nowhere else** — the top bar is now
back, "new role · draft" and the title, nothing clickable. The readiness line
above the buttons states what publishing will do with what you have typed so far:

| State | Line |
|---|---|
| No title | `Add a role title to publish` (amber) |
| Extracting | `Reading your job description…` |
| No skills, no JD | `No job description yet — without skills, every candidate scores the same` |
| No skills, JD given | `No skills detected — candidates will be ranked on experience and filters alone` |
| Ready | `6 skills · 1 screening question` (brand) |

Only the title gates publishing; the rest are statements, not gates. Under it, the
sentence the screen never had: *"Publishing creates the role, opens its apply
link, and adds everyone already in your pool who clears the filters. You can edit
all of it afterwards."* The publish error (the 402 free-role cap, most often) moved
into this bar too — it used to render under the top bar, four screens away from
the button you just pressed.

**Save draft is deliberately not in the bar.** The decision above lists it, but
there is no draft in the data model: `Job.status` defaults to `"open"`, `JobCreate`
does not accept `status` at all, and `POST /api/jobs` runs
`_attach_matching_candidates` and increments `jobs_created_total` against the free
role cap on every create. A "Save draft" button today would publish the role and
spend a role from the recruiter's allowance while saying it did neither — exactly
the dead-and-dishonest affordance decision 1 and UAT-01 were about. Making it real
means draft semantics in the backend (skip attach, decide whether a draft consumes
the cap) plus the Published / Drafts grouping in UAT-03, which is batch 2. Both
should land together; neither is a 75-minute change.

Verified in a browser at 1440×900: bar pins while scrolling (`bottom: 899.5` in a
900px viewport), Publish with an empty title still scrolls to the field and warns,
and the readiness line tracks extraction. Build clean, no new warnings.

**UAT-03 · Three tabs, one page.**
Two bugs, one symptom. `const tab = params.get("tab")` is computed on
Dashboard.js:10 and never used, so all three URLs render the same tree. And
`NavLink` ignores query strings when matching, so all three rail links highlight
at once. *Revised 2026-09-06 — tester asked whether Roles and Candidates need more than a
filtered dashboard. They do; "the same page with bits removed" is a split, not a
design.*

- **Overview** — as originally proposed and accepted: KPI band, compact roles
  strip, top few candidates.
- **Roles** — answers *"how is each role doing?"*. A role is a pipeline, not a
  row: status, candidate count, shortlisted count, days open, per-role actions.
  **Grouped Published / Drafts** — drafts matter now that UAT-02 makes saving one
  a real action.
- **Candidates** — answers *"who do I have?"* across every role. Full width,
  existing search/stage/role filters and bulk actions, plus sorting.

Active state matched on `?tab=`.

*Open:* the **match** column. `server.py:1054` only recomputes match scores when a
role is specified — its own comment says without a role there is no basis for
weighting. On an all-candidates view there is no role, so the column shows a
stored number that answers "match against what?" Options: hide until a role is
picked (preferred) or relabel as a general strength score.

**UAT-04 · Don't filter the pool while the role is being written.**
*Rewritten 2026-09-06 — tester's call, and it is a bigger fix than the one
proposed here before.* Earlier drafts of this entry kept iterating on better
wording for the alarm. The tester pointed at the alarm itself: **the pool should
not be filtered at all during setup.** That deletes the false-positive problem
rather than describing it more carefully.

The clincher: `server.py:559–569` — **publish already runs the filters and
attaches the matching candidates**, and the comment there says the preview exists
so the two can't disagree. The live counter on the setup screen is a redundant
echo of a computation that already runs correctly a few seconds later, on a 350ms
debounce, once per keystroke, asking the recruiter to react to a number that
means nothing until the role exists.

Fix:
- **Delete the live preview from JobSetup** — the debounced `preview-filter`
  call (JobSetup.js:96–110), the "N will pass" readout, the amber warning, and
  the "0 of 0 candidates would pass these" subtitle. Step 03 keeps its chips as a
  plain summary of what the role asks for.
- **Role page gains an eligible-candidates section**, surfaced automatically
  after publish. Splitting the tester's two options rather than picking one:
  *who matches* is a read-only fact and appears on its own; *moving them to
  Shortlisted* changes candidate records and stays behind an explicit CTA.
  Nothing changes a candidate's stage because a page rendered.
- **The four states aren't thrown away — they relocate** to the role page, where
  they get much easier: one message, shown once, against a role that exists,
  rather than a live meter reacting to a half-typed form. Empty pool → neutral;
  nobody in that function → neutral (the designers-and-developers case); people
  exist but filters exclude them → the one real warning, naming the filter; some
  eligible → the list. The `relevant` count (~15 lines in `preview_filter`) is
  still what separates the two neutral cases from the warning.
- Net effect: setup gets quieter and faster (no request per keystroke), and the
  answer appears once, where it is actionable.

**UAT-05 · The right panel is unnamed and silent.**
Headed "live extraction" (system vocabulary); the only in-progress signal is a
10px "scanning" chip. Fix: header becomes "Reading your JD"; skeleton rows with
shimmer plus the word "extracting…" while it runs; a settled state reading
"updated just now" that states the re-read-as-you-type behaviour in the place it
actually happens.

**UAT-06 · Helper copy — delete, don't rewrite.**
*Revised 2026-09-06.* A first rewrite ("Stop typing for a second and we'll read
it") was rejected by the tester against the bar **"HRs should find it easy the
first time, and only the first time."**

The insight: a caption in the left column explaining what a *different* column
does is a smell — it means that column is mute. The line exists only because the
right panel says nothing about itself while it works. Fix the panel (UAT-05) and
the caption has no job.

What teaches it instead: you paste a JD, and the panel beside you says
*extracting…*, shimmers three skeleton rows, and fills in. That is the
explanation — demonstrated in a second, understood once, never re-read. The
pre-paste instruction already exists in the right place, inside the panel:
"Paste a job description on the left. Skills, salary, filters and screening
questions appear here."

Fix: **remove the line, no replacement.** Manual re-read becomes a small `↻` icon
in the panel's status line, not prose. Costs nothing extra — the panel states are
already batch 4.

**UAT-07 · Sidebar CTA below the fold.**
`<aside class="w-56 flex flex-col">` inside a `min-h-screen flex` row: flex
children stretch, so the rail grows to the height of the *page content*, not the
window, pushing the bottom-pinned button off screen on long pages. Fix:
`h-screen sticky top-0` on the aside, nav scrolls internally.

**UAT-08 · Split is welded shut.**
`grid md:grid-cols-2` gives the output panel as much room as the four-step form,
and the ratio can't be changed. The JD textarea is cramped and scrolls
internally.

*Revised 2026-09-06 — tester asked for further left, and for it to be movable.*
The term is a **draggable splitter** (resize handle) between **resizable panes**.

- Default **62 / 38** (was 58/42). JD box gains ~140px over today and grows taller.
- Draggable divider clamped **50%–78%**; **double-click resets** to 62/38.
- Persisted per browser in `localStorage`.
- **Keyboard-operable** — handle takes focus, arrow keys nudge. A drag-only
  control is unusable without a mouse.
- ~40 lines of pointer-event handling, **no new dependency**.
- Below `md`, splitter disappears and the panel stacks.

**UAT-09 · Manual must-have skills — answered.**
Tester asked what happens to must-haves added by hand. Today: they live in
`filters.must_have_skills`, entirely separate from the scored `skills` array.
So (a) they never appear in "Skills detected" and carry **no scoring weight** —
they can reject a candidate but never reward one; (b) their chip row is wrapped
in `{extracted && …}`, so before a JD is pasted adding a must-have shows nothing
at all; (c) that row is `.slice(0, 3)` with no "+N", so the 4th and 5th vanish
silently. **Fix, revised 2026-09-06 after the tester's note that must-haves should only
come from the JD.** That constraint dissolves the bug rather than narrowing it:
if a must-have can only ever be a skill already in the detected list, there is no
second list to fall out of sync with. "Must-have" stops being a separate field
and becomes a *state* of a skill you already have.

- The free-text `TagInput` in step 03 is removed — it is exactly how a filter
  with no scoring counterpart gets created.
- Each skill row gets a **lock toggle**. Locked = rejects anyone missing it, and
  scores at full weight. Unlocking demotes it back to an ordinary scored skill
  rather than deleting it.
- Step 03 shows a **read-only summary** of what's locked, linking up to the
  skills list. One place to edit, one place to review.
- It is also the fairer rule: you cannot reject a candidate for a requirement
  that was never in the posting.

*Resolved 2026-09-06 — tester asked whether a detected-vs-added distinction is
needed at all. It isn't.* Under the JD-only constraint every must-have is
detected by definition, so a "detected" badge has no opposite to mark. The only
distinction still carrying information is must-have vs nice-to-have, and the lock
already says that. **Drop the badge.**

This also settles the strict-vs-softer question the other way from the earlier
recommendation here. The softer path is precisely what *re-creates* a
detected/added distinction — plus a badge, a warning state, and two kinds of
skill to hold in mind. Against "easy the first time" that's a bad trade for a
rare case. **Go strict:** must-haves come from the JD; to add one that isn't
there, put it in the JD — which is also where the candidate reading the posting
needs to see it.

**Either way, scoring must-haves at full weight reorders existing shortlists —
needs explicit sign-off before building.**

**UAT-10 · Name repetition.**
"talent.tailor" wordmark, "talent · engine" label directly beneath it, and
"Talent Tailor — Shortlist the right candidates in minutes" in the browser tab.
Fix: keep the wordmark, replace the sub-label with the workspace name (accounts
are real now), shorten the tab title to "Talent Tailor".

**UAT-13 · One stage and one score, shared across every role.**
Raised by the tester: candidates are commonly considered for several roles at
once — ten SDE2 openings across ten teams, one pool. The model half-supports
this. `server.py:221` even carries the comment
`role_ids: List[str] = []  # multiple roles!` — but two lines above it,
`match_score: int = 0` and `stage: str = "New"`. **The association is many; the
state is one.**

`/api/candidates/{cid}/stage` (`:1141`) writes `{"$set": {"stage": ...}}` on the
candidate document with no role in the request at all. Consequences:

- Reject someone for SDE2·Payments → they read as **Rejected on all ten roles**,
  including the eight that never looked at them.
- Shortlist for Growth → they appear Shortlisted to every other team.
- One match score, though each role has its own weights and must-haves — so it
  cannot be correct for more than one role at a time.

Not a rare collision either: `_attach_matching_candidates` (`:566`) does
`$addToSet` of the role id onto every candidate passing the filters, so
publishing ten similar SDE2 roles lands one strong candidate in all ten
automatically, on day one.

**Fix — a candidate is a person; an application is that person in a role.**
Stage and score belong to the application:

```
applications: [ { role_id, stage, match_score, scored_at }, ... ]
```

Embedded on the candidate document rather than a separate collection: Mongo
queries it fine with `$elemMatch`, it is a far smaller change, and nothing here
runs at a scale needing the join. `role_ids` stays, derived, so existing queries
keep working. Migration is one idempotent pass — build one application per
existing `role_id` carrying today's stage and score forward; a candidate in a
single role sees no change.

Downstream:
- `/candidates/{cid}/stage` takes a `role_id`; without one it is ambiguous and
  should be rejected rather than guessed.
- Bulk actions require a role context — "Shortlist" on an all-candidates view
  with no role chosen has no meaning.
- Candidates tab shows best-fit score **with the role named**, and the furthest
  stage with its role ("Interview · Growth, +2 roles").
- Candidate profile becomes a list of applications rather than one status.

**This supersedes the match-column question under UAT-03.** Hiding the column was
single-role reasoning; with per-application scores the better answer is to show
best fit and name the role — exactly what a ten-team pipeline asks.

**Sequencing:** batches 2 and 5 both render stage and match. Building them
against the current model means building them twice, so this has to land first.

**UAT-12 · Every field looks filled in; only half of them are.**
Raised by the tester after round-2 review, extending UAT-01. Two groups of
fields are visually identical and behave completely differently:

- *Group A — placeholders that read as values.* The role title placeholder is
  `"Senior Frontend Engineer"` (JobSetup.js:194): a complete, plausible job
  title, in the largest type on the page, on the one field that gates Publish.
  Note `Onboarding.js:117` already does this correctly as
  `"e.g. Senior Frontend Engineer"` — JobSetup just doesn't follow the pattern
  the codebase already established.
- *Group B — real values nobody chose.* Hardcoded in the initial form state
  (JobSetup.js:38–55): department `Engineering`, location `Bengaluru`,
  seniority `Senior`, salary `15L–30L`, and — the damaging ones —
  `min_experience_years: 3`, `education_preference: "Bachelor's degree or
  equivalent"`, `notice_period_max_days: 90`, `locations: ["Bengaluru"]`.

Group B matters more. Those last four are **hard filters that reject people**,
applied on page load before the recruiter types anything: everyone under 3
years, everyone without a bachelor's, everyone on a 91-day notice, and everyone
not in Bengaluru. This likely feeds UAT-04. Round 1 already settled the same
argument for the neighbouring field — must-have skills default to empty because
pre-filling the top three disqualified 18 of 20 — and the rule should extend to
the rest of the filters.

Fix, three parts:
1. Placeholders prefixed `e.g.` with a *list* rather than one plausible answer
   (`"e.g. SDE II · Product Manager · UX Designer"`), set italic.
2. Untouched defaults get a visible default treatment — dashed border, dimmed
   text, small `default` tag — all of which drop away the moment the field is
   edited. Three readable states: italic "e.g." = empty, dashed + tag = we chose
   it, solid = you chose it.
3. Filters default permissive (`0` / No preference / Flexible / `[]`). JD
   extraction then *recommends* tighter values under the existing
   "recommended · applied" badge, which is honest because at that point it
   genuinely is a recommendation. Role descriptors (department, seniority,
   salary) keep their defaults and just get the tag — they describe the job
   rather than reject people.

**Note: part 3 is a behaviour change — a new role would filter nobody until the
recruiter or the JD narrows it. Needs explicit sign-off.**

**UAT-11 · Collapsible rail — deferred.**
Tester asked to hold. Worth noting the UAT-07 pinning fix is the same groundwork
a collapse needs, so it gets cheaper after this round. Current 224px → 56px
icons-only, state remembered per browser.

### Shipped 2026-09-06 (10-minute launch triage)

Build verified green (`react-scripts build`, no new warnings). Everything else in
this round is untouched and still queued below.

| Fixed | What changed |
|-------|--------------|
| UAT-01 | Publish is clickable; a missing title scrolls to the field, focuses it, shows an inline warning. `alert()` gone. |
| UAT-03 | Overview / Roles / Candidates render different content; exactly one rail link lights up. |
| UAT-07 | Rail pinned to the viewport (`h-screen sticky top-0`) — "New role" always visible. |
| UAT-10 | "talent · engine" sub-label removed. |
| UAT-06 | "Everything on the right runs the moment you pause" deleted. |
| UAT-04 (part) | Empty pool gets its own neutral message; the "relax your filters" line no longer fires at 0 of 0. |
| UAT-05 (part) | Right panel header now reads "reading your JD". |
| UAT-12 (part) | Title placeholder is an example list; **filters now default permissive** (0y / No preference / Flexible / anywhere). |

**Deliberately not shipped** — needs more than 10 minutes and more than an
unverified push: UAT-02 (bottom action bar), UAT-08 (draggable splitter),
UAT-09 (must-have lock model), UAT-13 (per-role applications), and the rest of
UAT-04/05/12.

### Build order (remaining)

| Batch | Fixes | Files | Rough |
|-------|-------|-------|-------|
| 0 | UAT-13 — applications, not role ids; stage + score per role, one-pass migration | server.py, Dashboard.js, JobDetail.js, CandidateProfile.js | ~1 day |
| 1 | UAT-01, UAT-02, UAT-12 — unblock publishing; honest field states | JobSetup.js | ~75 min |
| 2 | UAT-03 — three real views, Roles grouped by status | Dashboard.js, AppShell.js | ~100 min |
| 3 | UAT-07, UAT-10 — fix the rail, de-dup the name | AppShell.js, index.html | ~20 min |
| 4 | UAT-05, UAT-06, UAT-08 — right panel states, draggable 62/38 splitter, delete helper line | JobSetup.js | ~80 min |
| 5 | UAT-04 — move filtering out of setup onto the role page | JobSetup.js, JobDetail.js, server.py | ~60 min |
| 6 | UAT-09 — must-have as a lock state on a skill row | JobSetup.js | ~30 min |

### Decisions

Settled 2026-09-06:

1. **Publish button** — enable with validation. Stays clickable; clicking with a
   missing field jumps there with an inline warning. No dead controls.
2. **One action bar**, at the bottom. Cancel / Save draft / Publish together;
   top bar keeps only context.
3. **Overview** as proposed; **Roles** and **Candidates** get real designs of
   their own (see UAT-03).
4. **No filtering during setup at all.** Eligible candidates surface on the role
   page after publish; shortlisting stays an explicit CTA.
5. **Must-haves are strict** (JD-detected only), and **no detected/added badge** —
   under the JD-only rule the distinction has nothing left to mark.

### Still open

1. **Batch 0 in this round, or its own?** UAT-13 is bigger than everything else
   combined and must come first. Either fold it in (~3 days for the round) or
   ship batches 1, 3 and 4 now — none of which touch stage or match — and give
   the applications work its own round. Recommend the latter: 1/3/4 fix
   everything currently blocking a recruiter from publishing a role.
   *(The match-column question previously here is resolved by UAT-13.)*
2. **Permissive filter defaults** (UAT-12 part 3) — still worth doing, since
   those defaults now bite at publish rather than during setup. Confirm.
3. **Must-haves scoring at full weight** — a ranking change that reorders
   existing shortlists. Confirm before batch 6.

---

## Round 1 — 2026-08-08

Full plan and report: [`uat-test-plan.md`](uat-test-plan.md),
[`uat-report-2026-08-08.md`](uat-report-2026-08-08.md).

12 findings, initial gate **FAIL** (strong UX prototype, no working engine). All
findings fixed and retested the same day; gate **PASS**, backend suite 14/14.

Two design rules established that round, still binding:

- Missing candidate data never *rejects* on a filter — surface the candidate and
  let the recruiter judge — but it scores **neutral**, not best.
- Must-have skills default to **empty**. Pre-filling the top 3 as a strict AND
  disqualified 18 of 20 candidates.
