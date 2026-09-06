# Pricing decision — 2026-09-06

**Status: decided.** Supersedes the per-role unlock currently in production.

---

## The decision

**₹1,999 per month, one plan, monthly billing, 14-day free trial with no card.**

Sold as a **30-day access pass on the existing one-time Razorpay order rail**.
Entitlement is a date (`access_until` on the user), not a boolean on a job. No
Razorpay Subscriptions, no plans, no mandates, no webhook state machine.

The pass buys **new work** — new roles, new candidates, re-ranking, CSV export.
It never re-rents people already paid for.

---

## What triggered the change

Recruiters **rotate pools**. The same candidate pool is reused across roles and
over time: someone passed over in January is a strong fit for a different role in
March. The pool is an asset that appreciates.

Per-role unlock prices *the role*. The asset is *the pool*. Under the old model a
recruiter pays twice to see the same human — taxing exactly the behaviour that
makes the product sticky.

Note the existing code was already half-agreeing: `_revealed_ids(owner_id)`
(server.py:742) unions revealed candidate ids across **all** jobs in the
workspace. The architecture was already pool-scoped; only the pricing wasn't.
That is not a bug to fix — it is the right shape, and it should be legitimised.

---

## Why monthly, and not the annual pass the analysis recommended

A four-lens analysis (market benchmarking, unit economics, recruiter workflow,
shipping constraints), each proposal adversarially attacked, recommended
**₹6,999 / 12 months**. Overruled, for one reason:

> "You collect twelve months of cash before you learn whether anyone renews."
> — the synthesis, naming its own biggest risk

The goal right now is **20–30 users and their feedback**, not revenue. MRR is a
monthly referendum on whether the product is worth keeping; annual prepay mutes
that signal for a year. On a pre-PMF product, the learning is worth more than
the float.

**The strongest counter-argument, and why it loses.** There is no email transport
anywhere in the backend — no SMTP, SendGrid, Resend, Mailgun or SES. So monthly
billing means twelve renewal moments a year with no automated way to work them,
and the analysis concluded "therefore annual."

At 25 customers that is ~25 nudges a month over WhatsApp — roughly half an hour,
and it forces a conversation with every customer every month. At this stage that
is the user-research programme, not overhead. It breaks around 100 customers,
which is exactly when Razorpay Subscriptions gets built.

---

## Price level

₹1,999/month = ₹24,000/year.

**Sanity check owed:** market research put Zoho Recruit India near ₹15,000 per
seat per year. If that holds, ₹2,000/month prices *above a full ATS seat* for a
tool that deliberately does not run pipelines, scheduling or offers — a hard sell
with no brand and free-tier infrastructure. ₹1,999 is charm-priced, reuses the
anchor already in the product, and needs no new number explained. **Verify the
Zoho figure before the pricing page goes live.**

Rejected: ₹14,999/year prepaid. That is not a price change, it is a *buyer*
change — an Indian SMB routes it to finance, which means GSTIN invoices, vendor
onboarding, often a PO, demanded from a solo founder with no track record.
₹1,999/month stays an expense claim.

---

## Free tier

**14 days of full access, no card required.** Then the lapsed state.

Rejected "first role permanently free": it hands the median buyer — an SMB
recruiter running one or two roles a quarter — their entire need for ₹0, plus the
CSV export, which is the exfiltration path.

Rejected keeping "top 3 free" as the *primary* trial: at zero users the
bottleneck is **proof**, not conversion. Three names and a paywall is a demo; a
completed shortlist is evidence.

Top-3-free is retained as the **lapsed / never-paid state**, so the product keeps
demonstrating itself after the trial ends.

---

## The reveal ratchet

Anyone unlocked while a pass is active **stays unlocked forever**, including
after the pass lapses. This is the answer to "pool rotation can't be stopped" —
don't fight it, guarantee it.

Positioning: *your pool is yours, and it compounds every month you keep it.*

What lapsing actually costs: candidates arriving after expiry are redacted, new
roles show top-3 only, CSV export switches off. Withholding **new work**, never
known names. In a market where recruiter word-of-mouth travels fast, that
distinction is the whole commercial argument.

**Implementation trap:** the ratchet must write **only while access is active**.
Free top-3 previews are computed per request and must never persist. Otherwise
unlimited free role creation (`create_job`, server.py:551, has no quota check)
plus client-controlled filters (`JOB_PATCHABLE_FIELDS`, server.py:186) plus
auto-attach (`_attach_matching_candidates`, server.py:565) lets a script harvest
a 500-person pool three names at a time, for free.

---

## Implementation order

| # | Work | Why it is in this position |
|---|------|---------------------------|
| 1 | **Idempotency guard on `verify_payment`** | Prerequisite. See below — the pricing change is what makes it exploitable. **Shipped 2026-09-06.** |
| 2 | **One paywall path** — collapse `list_candidates`' `job.unlocked` rank-slice (server.py:1079) and `_revealed_ids` (server.py:742) onto a single `_visible_ids(user)` | They currently disagree: a recruiter can see a full name on one screen and "Candidate #7" on another. Skipping this shows paying customers top-3-only on the page they just bought |
| 3 | **Entitlement primitive** — `access_until` + `revealed_candidate_ids` on the user; `grant_access(user_id, days)`, `_has_access(user)` | Persist reveals rather than recomputing; `_revealed_ids` is O(jobs × candidates) per single-candidate fetch, and "unlimited roles" is the headline benefit |
| 4 | **Plan-based orders** — generalise `/api/jobs/{job_id}/create-order` (server.py:657) to `/api/billing/create-order` taking a plan code, amounts from a server-side PLANS dict | Never trust a client-supplied amount |
| 5 | **`payment.captured` webhook**, sharing the guard from step 1 | Today the browser calls verify-payment; closing the tab after paying takes the money and grants nothing |
| 6 | **14-day trial + lapsed state** | |
| 7 | **Free-tier caps** — active roles, pool size, no CSV export | `create_job` has no quota check of any kind today |
| 8 | **Rate-limit `/api/apply/{slug}/parse-resume`** (server.py:1274) | Public, unauthenticated, 5 MB uploads, calls the LLM before any candidate exists, no limiter anywhere in the codebase. Under per-role pricing token spend was loosely bounded by roles sold; under a flat monthly pass it is bounded by nothing |
| 9 | **Prices from the server** — extend `/api/billing/config` (server.py:645), delete hardcoded "₹1,999" at `frontend/src/pages/JobDetail.js:303` and `:384` | A price change should not need a frontend deploy |
| 10 | **Migration** — every workspace holding an unlocked job gets access + seeded `revealed_candidate_ids` | Otherwise existing ₹1,999 payers silently lose what they bought |

Realistically **5–7 engineering days**, not the 1–2 the individual analyses
claimed — three of four silently omitted their own prerequisites.

### The security prerequisite (step 1)

`verify_payment` (server.py:718) writes `status: "paid"` **unconditionally** —
there is no check for an already-paid record. Today it then sets a boolean, so a
replay is a harmless no-op.

The moment the grant becomes `access_until += 30 days`, **replaying one genuine
signed callback from the browser console buys unlimited months for a single
payment.** The pricing change is what converts a no-op into a vulnerability.

Fix: atomic guarded update — `{"order_id": ..., "status": {"$ne": "paid"}}` — and
grant only when `modified_count == 1`.

---

## Explicitly not building

Enterprise tier, per-seat pricing, annual option, agency packaging, Razorpay
Subscriptions / auto-renew, GST invoice generation. All deferred to
[`BACKLOG.md`](BACKLOG.md). None of it gets built before a real user asks.

An enterprise tier cannot be designed for a customer nobody has met. The trigger
is users hitting the ceiling of the top plan and complaining — which needs users.

---

## Decide later

- **Annual option at a discount** — a real lever, but not before ~month 6. Adding
  it now re-introduces the learning problem monthly billing exists to solve.
- **Razorpay Subscriptions** — around month 9–12, once the renewal rate is known.
  It becomes a *second writer to `access_until`*, so it is a payment-rail swap,
  not a re-architecture. That is the point of storing entitlement as a date.
- **Seats vs client-workspace separation** for agencies. Never publish a seat
  price that cannot be enforced — two recruiters sharing one login is free and
  undetectable today, and there is no team model in the code at all.
- **GST registration.** Trigger at roughly ₹20 lakh collected, or the first
  customer who blocks a purchase on it. Until then quote prices tax-inclusive.
- **Whether `auto_applied` candidates should ever be redacted.** They chose to
  contact this recruiter through their own share link; hiding their phone number
  reads worse than any other part of the paywall.

## Watch this, not collections

Instrument **roles created** and **candidates added** per workspace per month
from day one. Treat a workspace with no role created in 60 days as churned *now*.
Monthly billing gives an honest signal — don't let prepaid cash, whenever annual
arrives, disguise it.
