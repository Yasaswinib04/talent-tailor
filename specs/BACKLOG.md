# Talent Tailor — backlog

Ideas and known debt that are real but not in the current build queue. Anything
actively being worked sits in [`UAT.md`](UAT.md) instead; items move from here to
there when they're picked up.

---

## BL-01 · Import a JD from a URL

**Raised:** 2026-09-06 (round-2 review). **Status:** not started.

Paste a link to a live posting — Greenhouse, Lever, LinkedIn, a company careers
page — instead of copying the description text by hand.

### Why this is cheaper than it sounds

The pipeline is `URL → HTML → clean text → llm.extract_jd()`. The last step
**already exists and is the hard part.** `backend/llm.py:171` takes raw text and
returns skills, salary, filters and screening questions, with the keyword
dictionary as fallback. `httpx` is already a dependency (`requirements.txt:14`).

So the work is entirely in *fetching*, not parsing. And fetching splits into
three tiers with wildly different difficulty.

### Tier 1 — genuinely easy · ~half a day

Greenhouse, Lever and Ashby all publish **free, unauthenticated JSON APIs** for
their public job boards. No scraping, no bot detection, no ToS problem, stable
schemas:

| ATS | Endpoint |
|-----|----------|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{board}/jobs/{id}?content=true` |
| Lever | `api.lever.co/v0/postings/{company}/{id}` |
| Ashby | `api.ashbyhq.com/posting-api/job-board/{board}` |

Detect the ATS from the URL pattern, call the API, strip HTML tags from the
content field, hand the text to `extract_jd`. Roughly 150 lines. Between them
these three cover a large share of tech postings.

### Tier 2 — works most of the time, fails quietly · ~1–2 days

Company careers pages, Workday, SmartRecruiters, blog-style postings. Needs a
readability-style extractor (`trafilatura` or `readability-lxml`) to find the
main content block. Realistically ~70% success. Workday is a SPA with a
per-tenant JSON endpoint — doable, but every tenant differs.

The risk here isn't the code, it's that **failures are silent**: you get nav
chrome and cookie-banner text instead of a JD, and `extract_jd` cheerfully
returns skills for it.

> **Mitigation, and it should be non-negotiable:** fetched text always lands in
> the JD textarea for the recruiter to see *before* extraction runs. Never
> extract from text the user hasn't laid eyes on. Cheap to build, and it turns a
> silently-wrong result into a visibly-wrong one.

### Tier 3 — don't · LinkedIn, Indeed, Naukri

These actively block automated fetching. LinkedIn job pages are auth-walled or
served differently to logged-out clients, with aggressive IP rate-limiting, and
scraping them is against their ToS. From a Render free-tier shared IP you'd be
blocked quickly and unpredictably — a feature that works on a laptop and fails
in prod is worse than no feature. Indeed and Naukri take the same posture, and
Naukri matters for the India market.

Detect the domain and say so plainly: *"LinkedIn blocks automated fetching. Open
the posting and paste the description — it takes five seconds and always works."*

### Infrastructure notes

- **SSRF guard is mandatory, not optional.** This is a user-supplied URL that our
  server fetches. Block private IP ranges, localhost, link-local, and the cloud
  metadata endpoint (`169.254.169.254`); allow `http`/`https` only; cap redirects
  and response size. ~30 lines, and exactly the kind of thing that gets skipped
  in a hackathon build.
- Short fetch timeout (8–10s). The LLM call already allows 45s
  (`llm.py:78`); stacking a slow fetch on top of that plus a Render cold start
  will hit the proxy timeout.

### Recommendation

Tier 1 + the review-before-extract pattern is a genuinely good ~1 day feature.
Tier 2 as a clearly-labelled best-effort fallback. Tier 3 gets an honest error
message. **~1.5–2 days total.**

---

## BL-02 · Collapsible sidebar

**Raised:** 2026-09-06 (round 2, logged as UAT-11). **Status:** deferred by
tester.

Rail is 224px and can't be collapsed. Target: 56px icons-only, state remembered
per browser.

Worth knowing: the viewport-pinning fix in **UAT-03/UAT-07** is the same
groundwork a collapse needs, so this gets *cheaper* after the current round, not
harder.

---

## Deferred by the pricing decision (2026-09-06)

See [`PRICING.md`](PRICING.md). None of these get built before a real user asks.

### BL-05 · Annual plan at a discount
A real lever, but not before ~month 6. Adding it at launch re-introduces the
learning problem that monthly billing exists to solve — you would stop hearing
from customers for a year.

### BL-06 · Razorpay Subscriptions / auto-renew
Around month 9–12, once the renewal rate is known. Because entitlement is stored
as a date (`access_until`), this becomes a *second writer to the same field* — a
payment-rail swap, not a re-architecture. Trigger: manual renewal nudges stop
being tractable, roughly 100 customers.

### BL-07 · Seats, teams, agency packaging, enterprise tier
There is **no team model in the code at all** — a "workspace" is one user row,
and all ~16 `owner_id` query sites are hardcoded. Two recruiters sharing one
login is free and undetectable today, so never publish a seat price that cannot
be enforced. For agencies, sell client-workspace *separation* (a real, buildable
feature) rather than seats. Enterprise tier waits for users hitting the ceiling
of the ₹1,999 plan and complaining.

### BL-08 · GST registration and tax invoices
Trigger at roughly ₹20 lakh collected, or the first customer who blocks a
purchase on it — whichever comes first. Until then, quote prices tax-inclusive.

### BL-09 · Should `auto_applied` candidates ever be redacted?
They chose to contact this recruiter through the recruiter's own share link.
Hiding their phone number reads worse than any other part of the paywall.
Consider exempting them entirely and letting ranking plus CSV export carry the
gate.

---

## Known debt (not raised in UAT, but real)

### BL-03 · CI has never actually run

**Status: mostly closed 2026-09-12.** Kept here until the last part is done.

The original entry had three parts. Two are now fixed:

- ~~`backend_test.py` predates the accounts work and would 401 across the board.~~
  **Fixed.** It signs in (or signs up) first and carries a bearer token; verified
  27/27 passing against a live instance.
- ~~Nothing runs the code on a push.~~ **Fixed** by
  `.github/workflows/tests.yml`: the hermetic backend suite, an end-to-end pass
  against a real MongoDB, and the frontend production build — on every push and
  pull request, needing no configuration. 126 tests, zero skips. The job fails
  explicitly if the API doesn't come up, so `backend_test.py` can never skip its
  way to a green tick again.

**Still open:** `smoke-test.yml` needs its three values set in
**Settings → Secrets and variables → Actions** (`API_URL`, `TT_TEST_EMAIL`,
`TT_TEST_PASSWORD`). It now fails loudly rather than skipping, so `main` shows a
red X until they are set. That is deliberate, but it does mean the red X on
`main` is currently a configuration gap, not a code regression — worth setting
before it becomes background noise people learn to ignore.

### BL-04 · `share_slug` is 8 hex characters with a non-unique index

**Raised:** 2026-09-12. **Status:** not started. **Severity:** low, but the
failure mode is bad.

`specs/launch-fix-plan.md` records this as *"`share_slug` widened to 12 hex
characters with a unique index"*. The code says otherwise:
`server.py:217` is `uuid.uuid4().hex[:8]` and `server.py:659` is
`create_index("share_slug")` with no `unique=True`.

8 hex characters is 32 bits. A collision is very unlikely at any realistic number
of roles — but there is nothing stopping one, and `find_one({"share_slug": slug})`
(`:767`, `:1748`, `:1784`) would then serve whichever document Mongo returned
first. That is one recruiter's apply link quietly resolving to another recruiter's
role, which is the kind of bug you cannot explain to a customer.

Not fixed on the spot because adding `unique=True` to an index that already exists
without it makes the *startup* call fail on a live deployment — it needs a drop and
recreate, which is a migration, not a one-word change. Do it with the next
migration that runs anyway.


### BL-10 · The responsive pass is not in the code

**Raised:** 2026-09-12, measured in a browser. **Status:** not started.
**Severity:** high if any recruiter opens this on a phone.

`specs/launch-fix-plan.md` records P2-7 as closed, with *"30 browser cases across
iPhone SE (375), iPhone 14 (390) and iPad mini (768). Every screen — dashboard,
all three tabs, job setup, role page, candidate profile, login, onboarding and
public apply — reports `scrollWidth === clientWidth`."*

Measured on `main` today at a 390px viewport:

| Screen | scrollWidth | clientWidth |
|---|---|---|
| `/app` dashboard | 772 | 390 |
| `/app/jobs/new` | 772 | 390 |

Both overflow by the same 382px, and the cause is visible in the source:
`components/AppShell.js:12` is `<aside className="w-56 border-r hairline flex
flex-col shrink-0 h-screen sticky top-0">`. There is no `md:` breakpoint, no
drawer, no menu button — none of the off-canvas behaviour that entry describes.
The `h-screen sticky top-0` from UAT-07 is there, so the rail *was* touched since;
the responsive work simply is not.

Most likely lost in "Port the UAT branch onto main's architecture (#1)". Worth
confirming before rebuilding it — if that branch still exists, the work may be
recoverable rather than rewritten.

Measured with the pre-existing code, not introduced by any change in the UAT-02
branch: the same 772px is present with `JobSetup.js` stashed.
