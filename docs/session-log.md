# Session log

A running record of working sessions — what we wrestled with, what got settled,
and what is still open. The point is not minutes; it is **not re-litigating
decisions six months from now** because nobody wrote down why we said no.

**How to use it:** at the end of a working session, copy the template at the
bottom, fill it in, and add it to the top of the entries (newest first). The
sections that earn their keep are §5 and §6 — open questions and decisions.
Everything above them is context for reading those two correctly.

**Two rules that keep this honest:**
1. Record the *no* decisions, not just the *yes* ones. A feature deliberately
   scoped out is the entry you will want most later.
2. An open question belongs to a person with a next action. "We should think
   about pricing" is not an open question; "Ask 10 HRs how many roles they
   hire per quarter" is.

---

## Entry 002 — 8 Sep 2026 · Cost visibility, model tier, pricing shape

### 1. Problems at hand
- No visibility into what AI actually costs — per call, per role, or per customer. Impossible to reason about unit economics or answer "how good a model can I afford?"
- Model selection unsettled and repeatedly wrong (three rejected defaults before landing).
- ₹1,999/role pricing suspected to be the wrong number *and* possibly the wrong shape.
- Launch readiness for a UAT with 10 HRs: unclear what was actually ready vs. still config.
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
- Draft PR #5 opened. Production unchanged at 4605cd6.
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
- **One model, not two.** `claude-opus-5` for both resume parsing and JD extraction.
- **No AI for file→text, match scoring, paywall redaction, or auth/payments.** Scoring stays deterministic so recruiters can trust and explain a rank; revenue and security logic must not be probabilistic.
- **Degrade quality, never availability.** Every LLM call site has an automatic fallback; an outage produces worse shortlists, never an error page.
- **Cost is tracked from OpenRouter's own accounting**, not a local price table that would drift.

**Prioritisation:**
- Config + one live smoke test ranked above any further building. The product is code-complete; what remains is verification.
- Cost *visibility* built before cost *optimisation* — no lever should be pulled without a measurement.

---

## Entry 001 — Aug 2026 · Demo → sellable product

Recorded retrospectively; earlier sessions predate this log.

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
PR #3, merged and deployed (4605cd6): real LLM resume/JD extraction with heuristic fallback; accounts, auth, and multi-tenant scoping; per-role paywall with server-side redaction (top 3 free); bulk resume upload; three payment rails (Razorpay with server-verified signatures, UPI deep link, manual unlock code); 402-gated CSV export; 47 functional tests.

### 5. Open questions raised
Env var configuration on Render; live smoke test with real resumes; whether to upgrade off the free tier.

### 6. Decisions made
- Anti-abuse and free-tier caps deferred in favour of price discovery.
- Unlock-code bridge accepted as a legitimate payment rail, not a stopgap to be replaced before launch.
- Stdlib-only auth (scrypt + HMAC tokens) and pure-Python dependencies, to keep free-tier builds safe.

---

## Template — copy for a new entry

```markdown
## Entry NNN — DD Mon YYYY · <three-word theme>

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
