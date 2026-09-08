# Session log

A running record of working sessions — what we wrestled with, what got settled,
and what is still open. The point is not minutes; it is **not re-litigating
decisions six months from now** because nobody wrote down why we said no.

**How to use it:** at the end of a working session, copy the template at the
bottom, fill it in, and add it to the top of the entries. The sections that
earn their keep are §5 and §6 — open questions and decisions. Everything above
them is context for reading those two correctly.

### Rules that keep this usable

1. **Newest first.** Scanning top-down, the first entry that mentions a topic
   is the current position on it. No exceptions to the ordering.
2. **All timestamps are UTC**, `YYYY-MM-DD HH:MM`. One timezone, sortable, no
   date-rollover confusion. Convert when reading, not when writing.
3. **Every entry carries its session id and link**, so any decision can be
   traced back to the conversation that produced it.
4. **Record the *no* decisions, not just the *yes* ones.** A feature
   deliberately scoped out is the entry you will want most later.
5. **An open question belongs to a person with a next action.** "We should
   think about pricing" is not an open question; "Ask 10 HRs how many roles
   they hire per quarter" is.

### Resolving conflicting decisions

When a session reverses an earlier call, do both of these:

- Fill the new entry's **Supersedes** field: `Entry 002 §6 — model default`.
- Add a one-line pointer under the old decision: `→ Superseded by Entry 004`.

That way the conflict is visible from either direction. If two entries disagree
and neither declares supersession, the later **Recorded** timestamp wins — but
treat that as a defect in the log and add the markers retroactively, because
recency alone doesn't tell you whether the reversal was deliberate or whether
the second session simply forgot the first.

---

## Entry 006 — ICP lock-in, GTM execution tooling

| | |
|---|---|
| **Recorded** | 2026-09-08 19:37 UTC |
| **Session window** | 2026-08-28 → 2026-09-08 |
| **Session** | `session_01TshCk7SpbZGDfTsJqYKH56` · [open](https://claude.ai/code/session_01TshCk7SpbZGDfTsJqYKH56) |
| **Commits** | `d1c57c5` (2026-08-28) — draft PR #4, branch `claude/icp-gtm-strategy-on7l0u` |
| **Production at close** | `4605cd6` — corroborated independently here and by Entry 005 §3, both reading `origin/main` directly rather than trusting an earlier session's claim |
| **Supersedes** | — |

A different track from Entries 001–005: this session is go-to-market, not
engineering, and ran mostly in parallel with them without visibility into
their work. Drafted once as "Entry 003", then renumbered twice more — to
005, then to 006 — as two, then three, other sessions landed entries on this
branch in the same window before this one's push went through. Direct,
small-scale experience of the drift Entry 004 §3 and Entry 005's ordering
note both describe from the inside. Zero paying customers, zero locked ICP,
zero demand-generation motion at session start.

### 1. Problems at hand
- No locked ICP — candidate segments (SMB in-house TA, staffing agencies,
  enterprise, outside India) all still open, with no evidence ranking them.
- No answer for why buyers would actually pay, whether ₹1,999 was the right
  number, or whether the HRMS-export friction the founder was anxious about
  was a real blocker or an imagined one.
- No north star or funnel metrics defined for a pre-PMF stage.
- A written plan existed but nothing to execute or track it against, on a
  real constraint of 2–3 weekday slots/week rather than full-time.
- Mid-session: a full week (the plan's original Week 1) elapsed with zero
  execution, partly because Google Calendar task creation never went through.
- End-of-session: pushing this entry collided three times with other
  sessions writing the same file in the same hour (see the renumbering
  above) — this session's own encounter with the cross-session drift Entry
  004 §3 names generally.

### 2. What was discussed
- ICP candidates and why each was ranked in, tested, or parked: in-house
  TA/recruiter at a 30–500-person Indian company vs. staffing agencies vs.
  enterprise (Workday/Greenhouse) vs. outside India vs. friends & family.
- Evidence audit — which claims about buyer pain were actually validated
  (shortlisting pain, "top-N" framing) vs. assumed (skills-matching, repeat
  purchase) vs. completely untested (willingness to pay ₹1,999 at all).
- The HRMS-export anxiety specifically — whether it's a real deal-killer for
  the chosen ICP or a founder-side worry not backed by the one real data point.
- Pricing, asked to be answered honestly: is ₹1,999 correct, and by what
  mechanism would it change.
- A realistic 4-week execution cadence built around 2–3 slots/week (not the
  doc's ideal 5/week), and what tooling would make it trackable day to day.
- Whether to build a spreadsheet, an interactive tracker, Google Calendar
  tasks, or push tracking data into Google Sheets — and what this session's
  tool access actually allows for each.

### 3. What was concluded
- **ICP v1 locked**: in-house recruiter/TA at an Indian startup or mid-size
  company (~30–500 employees), screening 100+ applicants/role, 1–5 person TA
  team, no HRMS, actively hiring multiple roles, can pay without procurement.
  Secondary segment (staffing agencies): test with 3–5 conversations, don't
  chase yet. Enterprise, outside India, and friends/family as "customers" are
  explicitly parked for 90 days — full reasoning in `gtm/ICP.md` §2. **This
  is now load-bearing for other sessions**: Entry 005 §3 cites this doc's
  India-only, 90-day scope directly as the reason to scope out international
  payment rails. It also **agrees with Entry 003 §3's independent
  agency-beachhead call**, reached the same day from a different conversation
  and evidence base — corroboration, not yet confirmation; both are still
  waiting on the same roles-per-quarter data.
- **Strongest use case is already decided by the evidence**: high-inbound role
  triage (100s of applicants → ranked top-N with skill-match reasons), not the
  auto-apply link, which is the second act, not the pitch.
- **The HRMS anxiety doesn't apply to ICP v1.** The one real data point
  contradicts it (the target user offered to drag-and-drop resumes himself);
  it belongs to the enterprise segment that's already parked.
- **₹1,999 is a probe, not a settled price.** Consistent with Entries 002 and
  003's separate decisions to hold it there — the number's job right now is
  to make "will anyone pay?" a cheap, real experiment, not to be
  revenue-optimal. Explicit trigger to raise it: three unlocks where nobody
  flinches. This session assumed the live product is the per-role one-time
  unlock described in `gtm/ICP.md` — which Entries 004 and 005 independently
  confirm `origin/main` actually runs, so the assumption held, but only by
  chance relative to what Entry 003 briefly believed had shipped instead.
- **North star = paid role unlocks/month.** Full funnel (Learn → Try → Value →
  Pay → Retain → Refer) already written into `gtm/ICP.md` §8; this session
  added a realistic day-30 pacing layer on top of the doc's 90-day targets,
  since 2–3 slots/week reaches the full 20-conversation / 5-unlock target
  closer to week 6, not week 4.
- **A slipped week gets re-dated, not rationalized.** When the plan's first
  week passed with no execution, the honest move was to shift all remaining
  dates forward to start from the actual current week, not to backfill fake
  progress or leave the tooling showing a plan that had already failed.

### 4. What we achieved
- `gtm/ICP.md` written and committed (`d1c57c5`); draft PR #4 opened on
  `claude/icp-gtm-strategy-on7l0u` (not merged — docs only, no app code
  touched, production unaffected).
- Published a shareable ICP one-pager as a Claude Artifact.
- Built `Talent_Tailor_GTM_Tracker.xlsx` (delivered as a file, not committed
  to the repo): a Dashboard wired with live formulas against the funnel, plus
  4-Week Plan, Conversations log, Pilots & Pricing log, Evidence snapshot, and
  ICP reference tabs. Caught and fixed a real formula bug pre-ship (a column
  collision was silently counting shortlist-views as payment-asks); verified
  with a LibreOffice recalculation pass after installing the missing
  `libreoffice-calc` package in the sandbox — zero formula errors on the
  shipped file.
- Built and published the "GTM Cockpit" — a self-persisting interactive
  Artifact (plan checklist, conversation/pilot logs, live funnel dashboard)
  using the `artifact` runtime capability, so it survives across sessions and
  devices instead of living in browser storage. Caught and fixed a real
  re-render bug pre-ship (changing a conversation's status silently didn't
  refresh the visible funnel numbers) via a headless-browser (Playwright)
  interaction test.
- Re-dated both the workbook and the Cockpit forward by one week (plan now
  runs Sep 7 → Oct 2) once a full week passed with no execution.
- Google Calendar: attempted to create the 4-week plan as 12 calendar events
  (Mon/Wed/Fri, 8:00 AM IST) twice — both attempts, before and after the
  re-date, failed with the same `Google_Calendar` OAuth token expiry. **No
  calendar events exist.** Blocked on the user reconnecting the connector.
- Google Sheets: no Drive upload/create tool was available in this session
  (only share / rename / trash on existing files, no Sheets connector at
  all) — could not push the workbook to Drive. User opted to upload the
  `.xlsx` manually instead.
- This entry — drafted as "Entry 003", pushed as Entry 005, landed as
  Entry 006, after three rounds of fetch-and-renumber against concurrent
  sessions (§1, §6).

### 5. Open questions — for Yasaswini
| Question | Why it matters | Next action |
|---|---|---|
| Is the Google Calendar connector reconnected? | The 12 plan events still don't exist; nothing is scheduled | Reconnect under claude.ai → Settings → Connectors, then ask Claude to retry `create_event` |
| Did the Aug 31 call with the cousin (Rohan) happen, and what was the outcome? | The Cockpit still shows it as "Booked" and now stale | Log the real outcome in the Cockpit's Conversations tab |
| Was making the GTM Cockpit artifact publicly shared deliberate? | It holds real names and pricing-strategy notes | Check its share menu; revert to owner-only if not intended |
| What's the modal profile of the recruiter-email list (company size, in-house vs. agency split)? | Per `gtm/ICP.md` §1, this is supposed to *define* ICP v1 and hasn't been done yet. It is also the fastest way to test Entry 003 §3's agency-beachhead hypothesis against this session's independent one | Export and profile the list (Week 1 Slot A in the shifted plan) |
| Have the 3–5 agency/consultant conversations happened yet? | Secondary segment is "test, don't chase" in this entry, primary beachhead in Entry 003 — untested either way | Book them this week per the shifted plan |
| Merge draft PR #4? | It's docs-only, non-conflicting, and Entry 005 §3 already treats its ICP scope as settled fact | Review and merge, or say why not |
| One GTM/strategy session at a time on shared docs, or accept the renumbering overhead? | This entry collided three times with other sessions on the same file in the same hour; Entry 004 §5 already asks the general version of this question | Pick a convention and say so here |

### 6. Decisions made

**Scoped out (deliberate no — revisit only on evidence):**
- **Selling outside India, the enterprise/Workday-Greenhouse segment, and
  friends/family as validation.** All parked for the next 90 days — full
  reasoning in `gtm/ICP.md` §2. Revisit at 10 paying customers (outside
  India) or when 3+ ICP-fit people separately cite HRMS export as a blocker
  (enterprise).
- **Moving off the manual UPI/unlock-code payment bridge to full self-serve
  Razorpay checkout.** Deliberately kept — every manual payment currently
  forces a conversation with a paying customer, which is more valuable right
  now than removing friction.
- **Discounting the ₹1,999 unlock for friends or family.** A discounted
  unlock produces no usable pricing signal; adopted as a standing rule
  ("no friend discounts"), not just a one-off call.

**Feature calls:**
- **Two execution tools, not one** — a workbook (offline review/sharing) and
  a self-persisting interactive Cockpit (daily execution) — both computing
  the same funnel from the same field definitions, so they can't silently
  drift out of agreement with each other.
- **₹1,999 held**, consistent with Entries 002, 003, and 005 — reframed
  explicitly as a probe with a stated raise trigger, not re-opened as a live
  pricing decision.

**Prioritisation:**
- Real discovery conversations and pilots ranked above tooling polish — the
  workbook and Cockpit were scoped to *support* the plan, not to gate it.
- Re-dating the plan to the actual current week ranked above preserving the
  original Aug 31 start date — a stale, unexecuted plan was judged worse than
  a shifted, honest one.
- On the push conflicts themselves: re-fetching and renumbering each time
  ranked above force-pushing any of the three drafts — the log's own rules
  (supersession markers, newest-first ordering) only work if entries don't
  clobber each other, and this session had no more claim to "first" than the
  two it collided with.

---

## Entry 005 — Launch blockers, deferred

| | |
|---|---|
| **Recorded** | 2026-09-08 19:34 UTC |
| **Session window** | 2026-09-08 |
| **Session** | `session_01WzUrGzicSpGjLZmYiDQMzp` · [open](https://claude.ai/code/session_01WzUrGzicSpGjLZmYiDQMzp) |
| **Commits** | `034e424` → merged to `main` as `5b2f96d` — PR #8 |
| **Production at close** | `origin/main` read as `d934f7a`; last deploy *observed in-session* was `4605cd6`. Whether prod followed the merges is unverified — see §5 |
| **Supersedes** | — · Entry 004 (written concurrently) already corrects Entry 003 §3; §3 below concurs from the remote side and extends the retraction to Entry 002 §6 |

> **Ordering note.** Entries 004 and 005 were written by two sessions running at
> the same time, and 004's own §3 records that one machine's clock is skewed.
> Their recorded minutes are therefore not reliably orderable. Read by entry
> number, not by timestamp, for these two.

Launch-day session. The ask was narrow: what is actually pending on me to put
this in front of users today, and park everything else in writing.

### 1. Problems at hand
- No written separation between *blocks launch today* and *feels urgent*. Every
  prior entry mixes them.
- Render env config was unknown territory. The API had been running on defaults
  with nobody able to say which of the ten variables the code reads were set.
- The manual UPI rail had **no fulfilment step**. With `UPI_VPA` set and Razorpay
  unset — the exact launch configuration — the modal told a buyer to "WhatsApp
  the payment screenshot" and named no number anywhere in the app.
- Launching a monetised side product while employed, without the current
  employer becoming a problem.
- Still no demo asset, and the live-key resume parse still unrun.

### 2. What was discussed
- Render Blueprint sync vs. hand-entered variables; why `sync: false` keys never
  populate themselves.
- Dodo Payments as a merchant-of-record for international buyers.
- Emailing receipts automatically, and what that would actually cost to build.
- Whether `CORS_ORIGINS` blocks launch.
- Rotating the Atlas password after it appeared in a shared screenshot.
- Recording a product walkthrough with Playwright; real vs. synthetic test data.

### 3. What was concluded
- **The launch-blocking set was five environment variables, not a feature list:**
  `UPI_VPA`, `UPI_PAYEE_NAME`, `UNLOCK_CODE`, `OPENROUTER_API_KEY`,
  `SUPPORT_CONTACT`. Everything else deferred, recorded in §6.
- **The missing variables were not a failed Blueprint sync.** The sync *had* run
  — the model vars carry `render.yaml` values, which only exist post-`4605cd6`.
  Only `sync: false` secrets were missing, because Render prompts for those
  rather than reading them, and the prompt had been skipped. Diagnosis matters:
  the fix is five dashboard entries, not a re-sync.
- **`CORS_ORIGINS` does not block launch** — asserted as required earlier in this
  session and corrected on reading the middleware. `allow_credentials=False` with
  Bearer-token auth makes the `"*"` default valid and already working. The
  exposure is the unauthenticated surface only; no cookie exists for a hostile
  page to ride. Hardening, not a blocker.
- **The one real code blocker was in the rail nobody had touched.** The dead-end
  contact copy shipped in `4605cd6` and survived every review since, because
  attention followed the newest diff. Generalises: on a manual payment rail, the
  fulfilment step is the part with no test.
- **Dodo Payments: not now.** ICP is India-only for 90 days (PR #4). MoR fees and
  a checkout rewrite buy nothing until international buyers exist.
- **Auto-receipts: not now, and would be thrown away.** The backend has zero
  email capability, the long pole is SPF/DKIM on `yomnita.com` rather than code,
  and **Razorpay issues its own receipts** the moment that rail turns on. At
  concierge volume the reply carrying the unlock code already *is* the receipt.
- **Entry 003's production claim fails from the remote side too.** Entry 004 §3
  establishes that `07954d1` was never pushed and lives on one laptop. Confirmed
  independently here: it is not a valid object in any ref, and `origin/main`
  still describes itself as "a per-role paywall (top-3 free preview, unlock for
  the rest)", with unlock setting a per-job `unlocked` flag against a one-time
  `UNLOCK_PRICE_INR`. **Extending Entry 004's correction:** Entry 002 §6 carried a
  marker saying its subscription scope-out had been superseded by that commit.
  It had not. That marker is now retracted in place and **the scope-out stands.**
- **Real JDs are safe test data; resumes are a different question.** A JD is a
  company document. A resume is personal data — and what breaks parsers is
  *layout*, not content, so a real resume with identity fields swapped keeps all
  its test value. A synthetic resume is clean text and teaches nothing.
- **Production is unreachable from Claude Code sessions.** The egress proxy
  returns 403 to CONNECT for `*.onrender.com` at organisation-policy level. Live
  verification and demo recording have to run from Yasaswini's machine. This is
  permanent, not transient — plan verification around it.

### 4. What we achieved
- **PR #8 shipped and merged** (`5b2f96d`): `SUPPORT_CONTACT` surfaced through
  `/api/billing/config`, rendered as `mailto:` or `wa.me` by shape, with unset a
  supported state that stops promising a channel rather than naming a missing
  one. Frontend build verified against the `render.yaml` command.
- Five Render variables set by the operator; the missing-variable diagnosis above.
- `.env.example` records why `UPI_PAYEE_NAME` matters — the buyer's UPI app shows
  the name registered against the VPA, and a mismatch reads as fraud at the
  moment of payment.
- Entry 002 §6's false supersession marker retracted.
- No demo assets written — paused pending real JDs.

### 5. Open questions — for Yasaswini
| Question | Why it matters | Next action |
|---|---|---|
| Does a real resume parse correctly with a live key? | **Open across five entries now.** Every commercial claim rests on it, and it is the least-exercised path in the product | Upload 5 real resumes. Still the highest-value hour available |
| What sha is production actually serving? | `origin/main` moved four commits during this session; the only deploy observed was `4605cd6`. Entry 004 read prod as `253182f`, this session read `origin/main` as `d934f7a` — both true at different minutes, neither is a deploy confirmation | Open the Render dashboard and read the deployed sha |
| Where do the real resumes come from? | If they are the current employer's candidate data they are out of bounds — same exposure as §6's identity call. Own network or Talent Tailor's own applicants are fine | State the source before uploading |
| Rotate the Atlas password? | It was legible in a screenshot shared this session | Rotate — **but set `SECRET_KEY` first**, or the rotation signs out every existing user through the derived-key coupling |
| How many roles does each HR hire per quarter? | Carried from Entry 002 §5 and Entry 003 §5, still unanswered | Ask all 10 during UAT |

### 6. Decisions made

**Scoped out (deliberate no — revisit only on evidence):**
- **Dodo Payments / international rails.** Revisit when a non-Indian buyer
  actually appears. The ICP lock makes this free to defer.
- **Automated email receipts.** Revisit only if the manual rail outlives Razorpay
  adoption — Razorpay makes this free when it lands.
- **`CORS_ORIGINS` hardening.** Not a blocker; do it whenever. Recorded so the
  next session doesn't re-escalate it into one.
- **WhatsApp as the support channel.** Rejected on identity exposure, not on
  mechanics — `wa.me` works fine with a personal account, Business is not
  required, and that misconception nearly parked the fix on false grounds.

**Feature calls:**
- **One `SUPPORT_CONTACT` variable, shape-detected.** `@` → `mailto`, otherwise
  `wa.me`. Chosen over two variables so the channel changes without a deploy.
  Wrong only if both channels ever need to appear at once.
- **Unset is a supported state, not a broken one.** The copy adapts. That is what
  let the code merge before the operator had chosen a contact.

**Prioritisation:**
- **Config outranked code.** Four of five launch blockers were dashboard entries.
  The instinct to look for something to build was the wrong instinct.
- **Verification still outranks everything.** Unchanged since Entry 003, and now
  worse: this session added a fifth reason to run the live-key parse and still
  did not run it.

**Identity / employment:**
- **The operator's name and number stay off the product.** Payments route to a
  family UPI ID under that person's real registered name; support is
  `hello@yomnita.com`, never the personal Gmail — which is the operator's full
  name and would be shown to every buyer. Recorded because it constrains future
  work: anything surfacing an operator identity has to respect it.

---

## Entry 004 — Branding cleanup, repo drift

| | |
|---|---|
| **Recorded** | 2026-09-08 19:35 UTC |
| **Session window** | 2026-09-08 |
| **Session** | `c2824133-43b4-4ddc-9c74-b7557275771d` (local Claude Code session; no claude.ai link recorded) |
| **Commits** | `dcf50a1` — pushed straight to `main`, no PR. Its git author date reads `2026-09-06`; the machine clock is skewed and the commit was made during this session |
| **Production at close** | `253182f` (moved from `4605cd6` via three merges *during* this session — PRs #8, #1, #9) |
| **Supersedes** | Entry 003 §3 — "Production is now workspace-wide time-boxed access". It is not. See §3 |

Opened as a one-line status check — "did we push the design changes and remove
the CRED references?" — and the check was worth more than the cleanup.

### 1. Problems at hand
- Unclear whether earlier design work (readability pass, CRED de-branding) had
  actually been pushed or was still sitting on the laptop.
- CRED branding believed removed. Residue unmeasured.

### 2. What was discussed
- Push state of the two design commits.
- Which surviving references a user can actually see, versus internal docs.
- Whether a seed candidate's *employer* counts as branding.
- An uncommitted paywall fix found in the working tree that belonged to nobody
  in this conversation.

### 3. What was concluded
- **The design work was already pushed.** `c2fd444` (real landing page at `/`,
  design report moved to `/report`) and `cdf26f4` (capture at activation, drop
  CRED branding) were both on `origin`. Nothing was stranded.
- **The de-branding was partial, not done.** 16 references survived. PR #3 had
  silently finished part of the job — README, `frontend/package.json`, and the
  `.env.example` DB name were already clean — so the residue was smaller than a
  stale grep suggested, and re-measuring beat trusting the earlier report.
- **Only 3 of the 16 were user-visible.** The rest were docs, specs, and test
  fixtures. Still worth removing: internal docs are how branding gets re-seeded
  by the next person who greps for a pattern and copies what they find.
- **A seed candidate's employer is demo data, not branding.** Two seed
  candidates list CRED as a *previous employer*. That reads as a plausible
  Bengaluru résumé, not as a logo, and it stays.
- **The repo has several sessions writing to it at once, and the drift is fast
  enough to invalidate facts mid-conversation.** Inside this one session:
  `main` went from "behind 1" to in-sync without a pull; `.env.example` fixed
  itself; an unattributed paywall fix appeared in the working tree and later
  vanished into a commit; three PRs merged to `main`; Entry 003 appeared on this
  branch; and the primary working directory was switched off `main` onto this
  branch. **Any session that reads repo state at the start and acts on it at the
  end is acting on stale facts.**
- **`07954d1` was never pushed, so the workspace access model is not in
  production.** This corrects Entry 003 §3, which states that production is
  "workspace-wide time-boxed access: ₹1,999 / 30 days, 14-day full trial". It is
  not. `origin/main` still runs the per-role `UNLOCK_CODE` model — `access_until`
  appears **zero** times in `backend/server.py` on the remote and 16 times
  locally. `CLAUDE.md` documents the access model as current architecture and is
  wrong in the same direction. The pricing shape Entry 003 reasoned from is
  written but not shipped.
- **`main` has diverged.** Local `main` carries two unpushed commits (`1e494b5`,
  `07954d1`); `origin/main` carries three the laptop does not (`5b2f96d`,
  `8a630f7`, `253182f`). A plain `git push` will be rejected, and the workspace
  access model exists on exactly one disk.

### 4. What we achieved
- `dcf50a1` pushed to `main`: eight files de-branded. User-visible — the
  `/report` footer no longer signs off as `cred.hr` / "the CRED talent org", and
  the onboarding invite placeholder uses a neutral domain. Internal —
  `design_guidelines.json` (brand is now "Talent Tailor"), `memory/PRD.md`, both
  `specs/uat-*` files, the backend test docstring, `test_reports/iteration_1.json`.
- Verified rather than assumed: both edited JSON files still parse, the edited
  test file still compiles, and a full grep now returns only the two seed
  employer entries.
- `backend/server.py` deliberately left out of the commit (§6).
- This entry.

### 5. Open questions — for Yasaswini
| Question | Why it matters | Next action |
|---|---|---|
| Push local `main`, and how? | `07954d1` — the workspace access model, and the architecture `CLAUDE.md` describes as current — exists only on this laptop. `origin/main` has moved three commits since, so the branches have diverged and a plain push is refused | Rebase local `main` onto `origin/main` and push. Do this before any more work lands on either side |
| Is production supposed to be on the access model or the unlock-code model? | Entry 003's whole pricing argument assumes ₹1,999/30 days is live. It is not — the deployed API sells per-role unlocks | Decide, then either push `07954d1` or correct Entry 003's premise |
| Should `CLAUDE.md` be corrected now or after the push? | It documents `access_until` as the one paywall path. Any session reading it will write code against an architecture the remote does not have | Fix as part of the rebase |
| Are the parallel sessions coordinated? | Four sessions touched this repo today, two of them writing to the same files. The `_visible_candidate` paywall fix was witnessed as an unattributed working-tree diff before it was committed — that could as easily have been lost as landed | Decide on a convention: one session per branch, or one at a time |
| Is PR #5 (this branch) still mergeable? | It is now several commits behind a `main` that gained analytics, a UAT port, and this cleanup | Rebase before merging |
| Should `/report` stay publicly routed? | It is a design-review artefact, reachable by anyone and now signed "talent tailor" | Decide whether it is a portfolio asset or noise |

### 6. Decisions made

**Scoped out (deliberate no — revisit only on evidence):**
- **Seed employer names in `backend/server.py`.** Left as-is. They read as a
  candidate's job history, not as branding. Revisit if a demo audience misreads
  them.
- **`test_reports/` as a historical record.** Edited anyway, so the grep stays
  clean; it is regenerated output, so nothing is lost if a future run overwrites it.

**Feature calls:**
- **De-brand internal docs, not just the visible surface.** The user-visible
  three were the point; the other five were the prevention.

**Prioritisation:**
- **Verify push state before editing anything.** The session's opening question
  was answered by `git`, not by memory, and the answer ("already pushed, but the
  cleanup was partial and the remote has moved") was not what either side
  assumed.
- **Never bundle an unattributed change into an unrelated commit.** The
  `_visible_candidate` paywall fix — locked candidate names leaking out of
  `update_candidate` / `assign_roles` / `set_stage`, so moving someone to
  "Interview" unmasked them for free — was found unstaged in the working tree and
  left exactly where it was found. It has since been committed by its owner as
  part of `1e494b5`. Leaving it alone cost nothing and kept the branding commit
  reviewable.

---

## Entry 003 — Revenue motion, not breakeven

| | |
|---|---|
| **Recorded** | 2026-09-08 19:28 UTC |
| **Session window** | 2026-09-08 |
| **Session** | `4062c3f9-5926-4dde-ad39-a3866f35a468` (local Claude Code session; no claude.ai link recorded) |
| **Commits** | none — strategy only, no code changed |
| **Production at close** | `07954d1` (moved from `4605cd6` in an unlogged session — see §3) |
| **Supersedes** | Entry 002 §6 — "subscription pricing model, not built" · see §3 |

Strategy conversation, no build. Opened as "how do we make money beyond
breakeven"; most of the value was in rejecting that framing.

### 1. Problems at hand
- No repeatable revenue motion. Not "no revenue" — no path where someone pays a
  *second* time without being chased.
- "Beyond breakeven" is a meaningless target on free Render + Atlas M0. Breakeven
  is the first ₹500, so the phrase hides the real question.
- Which segment actually pays was still unsettled — Entry 001 explored personas
  and deliberately declined to lock one, and that debt came due here.
- Two stale premises were carried into the conversation and had to be corrected
  mid-session (§3).

### 2. What was discussed
- Three segments and their economics: recruitment agencies, SMB HRs / founders
  hiring without an ATS, enterprise HR.
- Hiring *frequency* as the hidden driver of subscription retention.
- A concierge / productized-service model as a pre-SaaS revenue motion.
- What price anchor a buyer holds in their head: another ₹999/mo tool, versus
  the ~₹80k+ an agency placement costs.
- Whether the goal is income or portfolio credibility — the two strategies
  diverge immediately and the goal was never stated.

### 3. What was concluded
- **Breakeven is the wrong milestone; a repeatable motion is the right one.**
  Working target named: **~₹50k/month recurring** ≈ 15 paid shortlists or ~10
  subscriptions. The value of naming it is that it reveals how *few* customers
  are actually being hunted.
- **Agencies are the better beachhead than SMB HRs.** SMB HRs hire 2–5 roles a
  quarter, so they buy once, hire, and churn — subscription retention is
  structurally impossible with them. Agencies hire constantly and shortlisting
  speed maps directly onto their placement fee. This is a *hypothesis about
  frequency*, and Entry 002's still-open roles-per-quarter question is the
  measurement that confirms or kills it.
- **Enterprise HR is out.** Six-month sales cycles, procurement, and an
  incumbent ATS.
- **The riskiest assumption is not technical.** It is whether an HR trusts a
  machine-ranked shortlist enough to pay for it. No amount of building answers
  that; one invoice does.
- **Two stale premises were corrected mid-session, both in the direction of
  "further along than assumed":**
  - *"Resume parsing is simulated."* False since `4605cd6` (Entry 001). Real LLM
    parsing is shipped and live. The accurate state is **shipped but never
    executed against a live key** — Entry 002 §5 carries it as the only untested
    path in the product. That is a verification task, not a build task, and the
    distinction changes what has to happen before charging.
  - *"Pricing is per-role one-time."* False since `07954d1`. Production is now
    workspace-wide time-boxed access: **₹1,999 / 30 days, 14-day full trial from
    signup, lapsed workspaces capped at 2 roles.** Entry 002 scoped a
    subscription model *out*; it shipped anyway in a session that was never
    logged. **That commit, not this session, is what supersedes Entry 002 §6.**
    → **Corrected by Entry 004 §3:** `07954d1` was never pushed. `origin/main`
    still runs the per-role `UNLOCK_CODE` model, so the time-boxed access model
    is written but *not* in production.
- **Consequence of the above:** the per-role pricing shape argued for early in
  this session is already contradicted by shipped code. The live product is
  subscription-shaped, which — usefully — is the shape that *fits agencies* and
  fits SMB HRs badly. The segment call and the shipped pricing model agree.
- **The sellable differentiator is the pair of UAT design rules**, not a feature:
  missing data never rejects a candidate, and must-haves default to empty.
  "We surface the candidates other tools silently drop" is a line an ATS keyword
  filter cannot say.

### 4. What we achieved
- Nothing shipped. No code, no PR, no test change.
- Session moved into the `talent-tailor` repo (it had been running in an
  unrelated project directory).
- This entry.

### 5. Open questions — for Yasaswini
| Question | Why it matters | Next action |
|---|---|---|
| Do you know 3+ people at recruitment agencies? | Decides whether the agency beachhead is one WhatsApp message away or needs cold outreach. If the network is all in-house HRs, the beachhead call flips | Count them, honestly |
| Income, or portfolio/buildathon credibility? | A self-serve payment gateway *looks* better while converting worse. The two strategies diverge immediately and the goal has never been stated in writing | Decide and record it here |
| What is the actual revenue number? | ₹50k/mo was assigned in this session, not chosen by you. The number sets how many customers to hunt | Confirm or replace |
| Does a concierge offer conflict with the shipped self-serve product? | Production already sells ₹1,999/30 days self-serve. Running a manual "send me your JD, get a shortlist in 24h" offer alongside it is a second, unpriced motion — it may be the faster learning instrument or it may split focus | Decide before offering it to anyone |
| Does a real resume parse correctly with a live key? | **Unchanged and unanswered since Entry 001.** Still the only untested path. Everything in this entry assumes it works | Upload 5 real resumes. This is the single highest-value hour available |
| How many roles does each HR hire per quarter? | Carried from Entry 002 §5. Now doubly important: it is also the measurement that confirms or kills the agency-beachhead hypothesis | Ask all 10 during UAT |

### 6. Decisions made

**Scoped out (deliberate no — revisit only on evidence):**
- **Enterprise HR as an early segment.** Sales cycle and incumbency. Revisit only
  if one walks in with a signed cheque.
- **Any pricing change this session.** Held at ₹1,999/30 days. Same call as
  Entry 002, for the same reason: the roles-per-quarter data is not in yet.

**Feature calls:**
- None. No code was written or specified.

**Prioritisation:**
- **Verification still outranks strategy.** The live-key parse test has now been
  open across three entries. Nothing in this entry is actionable if the engine
  does not parse a real resume, and every session that discusses positioning
  instead of running that test is choosing the pleasant task.
- **Segment evidence outranks segment argument.** The agency hypothesis was
  reasoned, not observed. It stays a hypothesis until the UAT data lands.

**Recorded but not decided:**
- **Concierge productized service** — "send your JD and resume pile, get a ranked
  shortlist in 24h", ₹2,000–5,000 per role, run manually behind the product.
  Proposed as a 60-day instrument for testing the pay-for-a-shortlist
  assumption. **Not adopted** — it conflicts with the shipped self-serve motion
  (§5), and that conflict was surfaced rather than resolved.

---

## Entry 002 — Cost visibility, model tier, pricing shape

| | |
|---|---|
| **Recorded** | 2026-09-08 18:59 UTC |
| **Session window** | 2026-08-28 → 2026-09-08 |
| **Session** | `session_0179T2yRdNCGRtT5o6sDGp4A` · [open](https://claude.ai/code/session_0179T2yRdNCGRtT5o6sDGp4A) |
| **Commits** | `2c1eb7c` (2026-08-28), `0860fe7` (2026-09-08) — draft PR #5 |
| **Production at close** | `4605cd6` (unchanged this session) |
| **Supersedes** | Entry 001 §6 — the two-tier model split |

### 1. Problems at hand
- No visibility into what AI actually costs — per call, per role, or per customer. Impossible to reason about unit economics or answer "how good a model can I afford?"
- Model selection unsettled and repeatedly wrong (three rejected defaults before landing).
- ₹1,999/role suspected to be the wrong number *and* possibly the wrong shape.
- Launch readiness for a UAT with 10 HRs: unclear what was ready vs. still config.
- No single reference for where AI lives in the product — every conversation restarted from scratch.

### 2. What was discussed
- Full inventory of LLM steps and the deliberate non-AI decisions (file parsing, scoring, redaction, auth/payments).
- Whether `pypdf` is good enough vs. an AI/vision parser; where it actually fails (scanned PDFs, not two-column layouts).
- Model tiers and real cost per resume across Opus / Sonnet / GPT-5 / Gemini classes.
- LinkedIn + personal-website enrichment: feasibility, ToS/cost constraints, and its effect on score comparability.
- Pricing: what ₹1,999 buys (per role, one-time, permanent), approval-friction thresholds in Indian SMBs, per-role vs subscription vs hybrid.
- Render's three-tier architecture — why secrets live on the API service and not the frontend.
- Free-tier cold start as a live UAT risk.

### 3. What was concluded
- **The AI surface is only two jobs, three call sites.** JD → rubric, and resume → structured fields (bulk + apply). Nothing else calls a model.
- **`pypdf` is sufficient.** Digital-native resumes carry a text layer; the LLM downstream absorbs reading-order jumbling. The real gap is scanned PDFs, which no parsing library solves.
- **LLM spend is ~7% of revenue at the top tier** (~₹125–150 per fully parsed role against ₹1,999). Cost anxiety is not a valid reason to pick a worse model here.
- **The two-model split lost its rationale** once candidate flows were parked — it existed to protect a bouncing applicant from latency.
- **Pricing: the number is defensible, the shape is not.** ₹1,999 sits inside the Naukri per-posting comparable, but a one-time per-role transaction cannot produce the recurring revenue that was the stated goal.
- **The UAT is a price-discovery instrument, not just a demo.** One number decides the pricing shape: roles hired per quarter.

### 4. What we achieved
- Shipped per-call cost telemetry: every OpenRouter call logs model, tokens, and OpenRouter's own reported USD cost, tagged by account / job / step.
- Three new views: Dashboard AI-spend tile, `GET /api/analytics/llm-usage` (per account, split by step), `GET /api/admin/llm-usage` (operator rollup per customer, `ADMIN_KEY`-gated).
- Model defaults moved to `anthropic/claude-opus-5` for both jobs.
- Test suite 47 → 55, all passing; frontend builds.
- Draft PR #5 opened. Production unchanged.
- Published a living architecture reference (LLM inventory, non-AI decisions, model swap playbook, failure ladder).

### 5. Open questions — for Yasaswini
| Question | Why it matters | Next action |
|---|---|---|
| Does `anthropic/claude-opus-5` exist under that exact id on OpenRouter? | Wrong id = silent fallback to keyword heuristic | Check OpenRouter dashboard before setting the env var |
| Does `/api/health` return `"llm": true`? | The single fastest signal that extraction is real | Open it in a browser |
| Does a real resume parse correctly with a live key? | **Never executed anywhere.** The only untested path in the product | Upload 5 real resumes, check names/skills/scores |
| Merge PR #5, or set the model via env vars only? | Env vars override code defaults; merging also brings cost tracking | Decide — both routes work |
| Hold at ₹1,999 or move to ₹999? | ₹2k crosses the SMB approval threshold; ₹999 was already the intended sale price | Currently **held at ₹1,999** by explicit decision |
| How many roles does each HR hire per quarter? | Median 1–2 → per-role is the only model. 5+ → subscription is obviously right | Ask all 10 during UAT |
| Razorpay KYC, or stay on UPI? | KYC takes 1–2 business days; UPI works today with zero setup | Start KYC now, run UAT on UPI |
| Upgrade API service to Starter (~$7/mo)? | Free tier sleeps after 15 min → 30–50s cold start on first visit | Decide before the UAT |
| Is `CORS_ORIGINS` set for `talent-engine.yominta.com`? | If it points at the old Render URL, the custom domain is blocked from the API | Check on `talent-tailor-api` |

### 6. Decisions made

**Scoped out (deliberate no — revisit only on evidence):**
- **OCR for scanned PDFs.** Real cost and native-dependency risk. Ship when data shows scanned resumes are a meaningful share of uploads.
- **LinkedIn / personal-site enrichment.** Post-revenue. LinkedIn scraping violates ToS; paid enrichment is ₹15–40/profile. When it does ship, it must land as a **non-scoring insights panel first** — silently changing score inputs breaks comparability between candidates ranked before and after.
- **Subscription pricing model.** Not built. Shipping an untested payment flow hours before a UAT is a bad trade; decide after the roles-per-quarter data lands.
  → ~~Superseded by commit `07954d1`; recorded in Entry 003 §3.~~
  **Supersession retracted — see Entry 004 §3 and Entry 005 §3.** That commit was
  never pushed, and no subscription code has shipped. **This scope-out still
  stands.**
- **Any price change this session.** Explicitly held at ₹1,999.
- **Candidate-facing flows.** Parked from active investment; still live in production.
- **Razorpay webhook automation, sticky reveals, free-tier caps, anti-abuse.** All deferred in favour of price discovery.

**Feature calls:**
- **One model, not two.** `claude-opus-5` for both resume parsing and JD extraction. *(Supersedes Entry 001's fast/big split.)*
- **No AI for file→text, match scoring, paywall redaction, or auth/payments.** Scoring stays deterministic so recruiters can trust and explain a rank; revenue and security logic must not be probabilistic.
- **Degrade quality, never availability.** Every LLM call site has an automatic fallback; an outage produces worse shortlists, never an error page.
- **Cost is tracked from OpenRouter's own accounting**, not a local price table that would drift.

**Prioritisation:**
- Config + one live smoke test ranked above any further building. The product is code-complete; what remains is verification.
- Cost *visibility* built before cost *optimisation* — no lever should be pulled without a measurement.

---

## Entry 001 — Demo → sellable product

| | |
|---|---|
| **Recorded** | 2026-09-08 18:59 UTC (retrospective) |
| **Session window** | 2026-08-08 → 2026-08-19 |
| **Session** | `session_0179T2yRdNCGRtT5o6sDGp4A` · [open](https://claude.ai/code/session_0179T2yRdNCGRtT5o6sDGp4A) |
| **Commits** | `0dc1de9` … `4605cd6` (2026-08-19) — PR #3, merged and deployed |
| **Supersedes** | — |

Written up after the fact, from the same session as Entry 002. Work predating
`0dc1de9` came from an earlier chat with no recorded id — treat anything
attributed to it as unverified.

### 1. Problems at hand
The app was a UAT-passed demo. Resume parsing was believed to be real outside the demo environment — it was not; simulation was the only code path. No accounts, no tenancy, no paywall, no way to take money.

### 2. What was discussed
Self-serve blockers; latency/accuracy/cost tradeoffs; free-tier abuse and rate limiting; user personas (agencies vs SMB HR vs founders) versus fixing a price model; the definition of activation and the first 90 seconds.

### 3. What was concluded
- Parsing had to become real before anything else could be sold.
- Persona exploration beats premature price-model lock-in.
- **Activation = a recruiter views a ranked shortlist containing ≥5 of their own candidates.** Bulk upload, not the apply link, is the path there.
- UAT with 10 HRs *is* the launch.

### 4. What we achieved
PR #3, merged and deployed (`4605cd6`): real LLM resume/JD extraction with heuristic fallback; accounts, auth, and multi-tenant scoping; per-role paywall with server-side redaction (top 3 free); bulk resume upload; three payment rails (Razorpay with server-verified signatures, UPI deep link, manual unlock code); 402-gated CSV export; 47 functional tests.

### 5. Open questions raised
Env var configuration on Render; live smoke test with real resumes; whether to upgrade off the free tier. *(All still open — carried into Entry 002 §5.)*

### 6. Decisions made
- Anti-abuse and free-tier caps deferred in favour of price discovery.
- Unlock-code bridge accepted as a legitimate payment rail, not a stopgap to be replaced before launch.
- Stdlib-only auth (scrypt + HMAC tokens) and pure-Python dependencies, to keep free-tier builds safe.
- **Two-model split**: fast tier for resumes (candidate-facing latency), bigger model for JD extraction. → **Superseded by Entry 002.**

---

## Entry 000 — UAT, first deploy, gate placement

| | |
|---|---|
| **Recorded** | 2026-09-09 00:00 UTC (retrospective) |
| **Session window** | 2026-08-08 → 2026-08-10 |
| **Session** | `d573784c-5f76-4052-9955-49745fa6294c` (local Claude Code session; no claude.ai link recorded) |
| **Commits** | `7a997b4` … `cdf26f4` (2026-08-08 → 08-09) — pushed straight to `main`, no PR |
| **Production at close** | `cdf26f4` — first public deploy (Render + Atlas M0) |
| **Supersedes** | — (earliest entry) |

Written up retrospectively on 2026-09-09 from the conversation transcript. **This
is the "earlier chat with no recorded id" that Entry 001 refers to** — it now has
an id and an entry, so work in this range is no longer unverified.

**Discrepancy with Entry 001, recorded here rather than corrected there.**
Entry 001 lists its commit range as `0dc1de9` … `4605cd6`. Three of those —
`0dc1de9`, `c2fd444`, `cdf26f4` — were produced by *this* session and are
listed above; Entry 001's own contribution is PR #3 (`4605cd6`). Entry 001 has
been left exactly as its session wrote it, on the principle that an entry is a
record of what that session concluded and should not be edited afterwards by a
different one. So this is the only place the overlap is noted: **if you are
reconciling commits to entries, trust this entry's range over Entry 001's for
anything dated on or before 2026-08-09.**

### 1. Problems at hand
- The repo **did not boot as cloned**: `server.py` reads `MONGO_URL`/`DB_NAME` via `os.environ[...]` and crashes without them, no `.env` was committed, and `README.md` / `.env.example` were boilerplate from a different scaffold (they described Gemini + Postgres + Supabase; the app is Mongo).
- **Nothing had ever been verified.** `memory/PRD.md` claimed "14/14 backend pass, 100% frontend flows verified"; the suite pointed at a dead Emergent preview URL and `test_create_job` had been failing all along.
- A conversation with HRs was planned for the next day with no idea whether the product survived contact.
- No public URL — nothing deployed anywhere.

### 2. What was discussed
Where the design came from (generated by an AI app-builder from a "Principal Product Designer at CRED" brief — hence the borrowed branding); UAT scope; the gate-placement argument twice over; the unit economics of gating; the demo-vs-signup distinction; how a demo user is converted to a signed-up one; free deploy topology on Render + Atlas.

### 3. What was concluded
- **A strong UX prototype with no working engine.** The interface, IA and interaction design delivered the redesign brief; underneath, nothing actually shortlisted anyone. QA gate: FAIL, 12 pass / 6 fail.
- **Publishing a role produced a shortlist of zero.** Filters were preview-only — stored on the job, never applied to attach anyone. The advertised loop (define criteria → get the right candidates) was not connected end to end.
- **The default education filter rejected every master's degree** — including M.Tech IIT Madras and MBA IIM Ahmedabad. It tested for bachelor's *tokens* rather than a level, so the strongest 8 of 20 candidates were silently dropped by the recommended defaults.
- **The five scoring sliders were decorative.** `match_score` was a fixed integer in the seed data; weights saved and were read by nothing. Aggravated by UI copy claiming "how the match score is calculated".
- Combined with a strict-AND must-have default, the shipped recommendations took a 20-person pool down to **2**.
- **A gate is a bad cost control.** Email is free to fake and infinitely repeatable; nothing stops `a@b.com` uploading 500 resumes. Quotas are the mechanism that limits spend; a gate only captures leads. Two jobs, two tools.
- **The demo/signup confusion had a concrete cause: there was no per-user data at all.** `GET /jobs` returned every job to everyone, no `user_id` on anything. "Sign up" was not unbuilt but *meaningless* — there was nothing to sign up to, and what got built was a guestbook, not a front door.
- **Conversion comes from a wall someone is already pressing against**, not an interruption. The strongest wall available is "run this on my own candidates"; the strongest mechanic is loss aversion on work already done ("keep this role").
- The landing page was a **design case study addressed to a design reviewer** — three scrolls before an HR could tell what the product did.
- The CRED identity was borrowed from the generation brief and had no business on a product shown to other companies.

### 4. What we achieved
- **UAT executed end to end**: 22-case test plan and report in `specs/` (`uat-test-plan.md`, `uat-report-2026-08-08.md`), with per-finding evidence and a fix order.
- **Every blocking defect fixed and retested** — gate moved FAIL → PASS, suite 14/14. Publish now attaches the shortlist (preview and publish share `_filter_failures`, so they cannot disagree); education became a floor via `_education_level`; a real per-role scoring engine (`_score_components` / `_score_candidate`) made the sliders reorder results; "Remote" stopped acting as a location wildcard; apply-endpoint validation (422, no junk rows); backend-unreachable error state; dead `no_gaps_over_months` filter removed; deterministic avatars.
- **First public deploy**: `render.yaml` blueprint + `DEPLOY.md`, Render free tier + Atlas M0, `certifi` pinned for Atlas TLS. API and web both live.
- Real landing page at `/`, design report moved to `/report`.
- Rebrand `cred.hr` → `talent.tailor` across UI, title and meta.
- Repo made runnable by a second person: accurate `README.md`, `.env.example`, `.gitignore`, and a test suite no longer pointing at a dead preview URL.

### 5. Open questions raised
| Question | Why it mattered | Where it went |
|---|---|---|
| Gate at the door, or capture at activation? | Reversed twice inside the session; Yasaswini pushed back on removing it and the session closed **unresolved** | Overtaken by Entry 001 — real accounts shipped, making it a genuine sign-up rather than a guestbook |
| Per-user workspaces | Nothing was scoped to anyone; every demo user shared one database | Built in Entry 001 (`4605cd6`) |
| Real resume parsing | The uploaded PDF was never read — `onFile` discarded it and used sample text | Built in Entry 001; **still never executed against a live key** (Entry 002 §5, Entry 003 §5) |
| Neutralise borrowed CRED branding | Someone else's brand on a product shown to other companies | Done this session |

### 6. Decisions made

**Scoped out (deliberate no — revisit only on evidence):**
- **Per-user accounts and auth.** Scoped and argued, not built — the demo framing was correct for a next-day HR conversation, and shipping tenancy overnight was the wrong trade.
- **Google sign-in.** Deferred deliberately: with no per-user data it would have protected nothing. It earns its place only once there is a workspace to own.
- **Real PDF reading / OCR.** Left simulated; flagged as the biggest credibility gap to *disclose* rather than hide during demos.
- **Onboarding persistence.** Left client-only; recommended skipping the screen in demos.

**Feature calls (product invariants established here):**
- **Missing candidate data never rejects on a filter.** An unknown education, location or notice period surfaces the person for the recruiter to judge. In *scoring* it is neutral, not best — missing data must not out-rank a declared value. *(Cited in Entry 003 §3 as half the sellable differentiator.)*
- **Must-have skills default to empty.** Pre-filling the top 3 as a strict AND disqualified 18 of 20. Extracted skills drive the score; a hard requirement is opt-in. *(The other half of the Entry 003 differentiator.)*
- **Education is a floor, not an exact match.** A master's satisfies a bachelor's requirement.
- **Scoring is deterministic and per-role.** Five dimensions scored 0–100 independently, combined by the role's weights at query time, with a returned breakdown — so a rank can be explained to a recruiter.
- **Preview and publish share one code path.** "N will pass" and the resulting shortlist are computed by the same function and cannot drift apart.
- **Capture at the activation moment, not at the door** — the ask trades on a delivered result and yields a qualified lead. *(Contested at session close; see §5.)*
- **The landing page is the product; the design report is a different audience** and lives at `/report`, unlinked.

**Prioritisation:**
- **Verification before building.** UAT ran before any feature work, and it is the reason the two criticals were found before an HR did.
- **Fix the engine before polishing the surface.** The UI was already good; the shortlisting underneath was not connected.

**Process note:** the automated browser pane runs with `document.visibilityState: "hidden"`, which throttles framer-motion — entrance animations never complete, so screens render faded and step transitions look stuck. Three test cases were marked *blocked*, not *failed*, because of it. Verify server-side rather than reporting these as product bugs.

---

## Template — copy for a new entry

```markdown
## Entry NNN — <three-word theme>

| | |
|---|---|
| **Recorded** | YYYY-MM-DD HH:MM UTC |
| **Session window** | YYYY-MM-DD → YYYY-MM-DD |
| **Session** | `session_xxx` · [open](https://claude.ai/code/session_xxx) |
| **Commits** | `sha` (date) — PR #N |
| **Production at close** | `sha` |
| **Supersedes** | Entry NNN §6 — <what changed> · or — |

### 1. Problems at hand
<What was actually broken, unknown, or blocking. Not "we worked on X".>

### 2. What was discussed
<The territory covered, including threads that went nowhere. Brief.>

### 3. What was concluded
<Findings and judgements. Each one a claim someone could disagree with.>

### 4. What we achieved
<Shipped artefacts: PRs, tests, docs. What is live vs. what is in draft.>

### 5. Open questions — for <name>
| Question | Why it matters | Next action |
|---|---|---|
| | | |

### 6. Decisions made

**Scoped out (deliberate no — revisit only on evidence):**
- <thing> — <why not now, and what evidence would change it>

**Feature calls:**
- <what was chosen, and the reasoning that would have to break for it to be wrong>

**Prioritisation:**
- <what was ranked above what, and why>
```
