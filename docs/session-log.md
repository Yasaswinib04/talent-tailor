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

## Entry 003 — Design principles, not brand skin

| | |
|---|---|
| **Recorded** | 2026-09-08 19:28 UTC |
| **Session window** | 2026-09-08 |
| **Session** | `session_011D4Ej3odHzH4oygn1mR6Va` · [open](https://claude.ai/code/session_011D4Ej3odHzH4oygn1mR6Va) |
| **Commits** | `8784734`, `6dc1aaa` (2026-09-08) — draft PR #6 |
| **Production at close** | `4605cd6` (unchanged this session) |
| **Supersedes** | The CRED-derived visual direction recorded in `memory/PRD.md`, not in this log |

### 1. Problems at hand
- The brief "think like a principal product designer at CRED" had been executed as **"make it look like CRED"**. `design_guidelines.json` literally carried `"brand": "CRED"`, an archetype label, obsidian + copper + Cormorant Garamond. The design direction was a borrowed surface, not a derived one.
- A recruiter is shown a bare `92` next to a candidate's name with no way to interrogate it — a number they cannot defend to a hiring manager.
- Bulk stage changes were irreversible, in a workflow whose actual work is eliminating most of the pile.
- No written constraint existed that would have caught any of this: the guidelines file described a mood, so it could not reject a proposal.

### 2. What was discussed
- Why CRED's and Swiggy's design *works* — and that the two work for opposite reasons, which is the tell that neither look is transferable. CRED: an emotionally flat, mildly shameful task, answered with ceremony and restraint. Swiggy: an anxious, time-boxed one, answered with live state and instant reversibility.
- The recruiter's own job-to-be-done and the emotions actually in the room.
- Which review items were self-contained enough to ship in one PR, and which needed their own (the light-first re-theme).
- Whether the dark theme was defensible on its own merits. It is not, for this user.

### 3. What was concluded
- **The method transfers; the surface does not.** Copying a reference product's look imports decisions made for a different user with a different job — and is the one reliable way to *not* do what made that product good.
- **The recruiter's two emotions are overwhelm at volume and fear of being wrong about a person.** Every decision must reduce one of them or it is cost, not polish. This is now the design test.
- **An opaque number in a high-stakes judgement transfers risk to the user without giving them control.** They over-trust it or ignore it; both are failures. This is the single highest-risk element in the product.
- **The app was a good B2B tool wearing someone else's clothes.** Nothing in the recruiter's day — daylight, dense tables for hours, an ATS tab and a PDF alongside — justifies obsidian, copper, or an editorial serif on a candidate row.
- **A guidelines file that describes a mood cannot constrain anything.** Rewritten as principles that can reject a proposal.
- The existing live "will pass" counter was already the best idea in the product, for exactly the reason the new principles name — it shows the consequence of a choice as the choice is made. The rest of the product should be rebuilt around that pattern.

### 4. What we achieved
Draft PR #6, two commits, production untouched.

- `design_guidelines.json` rewritten: no brand, no archetype. Eight principles, each traceable to the user's job — never show a number you can't explain · colour means state, not brand · undo over confirm · show uncertainty rather than fake confidence · density with escape hatches · affordances must be real · empty and error states are primary screens · ask at activation, not at the door. Colour tokens renamed by role, as groundwork for the light-first swap.
- **Explainable scores.** `/api/candidates` and `/api/candidates/{cid}` now return `score_evidence` — each dimension's sub-score, the weight it carried, and the fact behind it ("1 of 3 role skills — missing Kafka, gRPC") — plus `scored_against` naming the role. Dashboard rows expand in place; the profile shows it inline. Missing data states itself in words ("Education not stated — scored neutral, not zero").
- Candidates listed without a role filter are now explained against the role they are assigned to, instead of showing an unattributable figure.
- **Undo replaces confirm** on bulk stage changes: prior stages captured before the write, specific 12s undo bar.
- **Bug fixed, found by the above:** `_parse_notice_days` took the first integer and called it days, so `"2 months"` → 2 — a two-month notice outranked a thirty-day one in *both* the live filter and the match score. Units now honoured. It was caught because the evidence line rendered as `"2 months notice period (2 days)"`; the opaque version had hidden it indefinitely.
- Removed the `/report` claim of a ⌘K palette that isn't wired up.
- `memory/PRD.md` brought current: design-direction correction, a bugs-found section, revised P1 backlog.

### 5. Open questions — for Yasaswini
| Question | Why it matters | Next action |
|---|---|---|
| Do the expand-row and undo interactions hold up in a browser? | **Not verified.** This container has no MongoDB and a broken `cryptography` build, so `motor` was stubbed to reach the pure scoring functions | UAT pass before merging PR #6 |
| Has the notice-period bug already skewed live shortlists? | It affected the live filter *and* the score, so any ranking produced to date with month-denominated notice periods was wrong | Re-check any shortlist already shown to a hiring manager |
| Merge PR #6 before or after the UAT with 10 HRs? | Explainable scores are a trust feature; showing recruiters a bare `92` in the UAT wastes the strongest question you could ask them | Decide — the change is self-contained |
| Does the light-first surface swap happen before the UAT? | It is the largest remaining review item and touches ~3,000 lines; doing it hurriedly before a launch is its own risk | Decide scope; token groundwork is already merged into the PR |
| Is the score's weighting comprehensible to a recruiter who did not set it? | The evidence panel shows weights, but defaults were chosen by us, not by them | Watch whether any UAT participant opens the breakdown unprompted |
| Which of the eight principles is the product still violating? | The audit was done from the code, not from watching anyone use it | Score the app against them after the UAT sessions |

### 6. Decisions made

**Scoped out (deliberate no — revisit only on evidence):**
- **The light-first surface swap.** Correct, and the biggest item, but it is a re-theme of the whole app and does not belong in a PR about score transparency. Token renaming shipped as groundwork so components need no edits when it lands.
- **Extraction-confidence styling in Job Setup.** Named as P1 — extraction is a heuristic dictionary and presenting every chip with equal confidence is the product quietly lying — but deferred out of this PR.
- **The day-one empty state.** P1 for the same reason it was raised: a recruiter with zero candidates currently sees the least-designed screen in the product.
- **Shipping ⌘K.** Not built; the false affordance was removed instead. Ship the behaviour or show no hint.

**Feature calls:**
- **Scores are explained, never merely displayed.** Extends Entry 002's "scoring stays deterministic so recruiters can trust and explain a rank" — deterministic was necessary but not sufficient; the reasoning has to be visible for the promise to land.
- **Undo, not confirm, for destructive bulk actions.** A confirm dialog taxes every action to guard against the rare wrong one; undo makes the common action free and the mistake cheap.
- **Missing data scores neutral and says so.** Never best, never zero, and never silently.
- **Colour is spent on state, not identity.** Identity lives in typography and layout. No decorative accent that carries no state meaning.
- **`design_guidelines.json` is a constraint, not a description.** A change that cannot be justified against a principle in it does not ship.

**Prioritisation:**
- Score transparency ranked above the visual re-theme: it addresses the higher of the user's two fears, and it is the one that makes the product defensible to a hiring manager.
- The design-guidelines rewrite ranked first of all, as the cheapest change that constrains every later one.
- Surfacing reasoning ranked above optimising the scoring maths — and immediately paid for itself by exposing the notice-period bug.

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
