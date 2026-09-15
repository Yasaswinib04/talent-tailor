# Talent Tailor — open work, one page

**Updated 2026-09-15.** Everything not finished, in one place.

This file is an **index, not a second copy**. Each row points at the detail; the
detail stays where it lives. If you change something, change it there and fix the
one-line summary here.

| Where the detail lives | What it holds |
|---|---|
| [`UAT.md`](UAT.md) | Tester-raised findings, per round. `UAT-*` |
| [`BACKLOG.md`](BACKLOG.md) | Ideas and known debt not in the build queue. `BL-*` |
| [`PRICING.md`](PRICING.md) | The pricing decision and what it deliberately defers |
| This file | Who is blocked on what, right now |

> ⚠️ **[`launch-fix-plan.md`](launch-fix-plan.md) is a historical record and is
> wrong in two places.** It records `share_slug` as "12 hex with a unique index"
> (it is 8, non-unique — `BL-04`) and the responsive pass as closed (it is not in
> the code at all — `BL-10`). Read it for history, verify before trusting it.

---

## 1 · Blocked on you — nothing else moves until these do

| # | What | Why it matters |
|---|---|---|
| 1 | **Merge [PR #11](https://github.com/Yasaswinib04/talent-tailor/pull/11)** | It is green, mergeable, and a draft. Until it merges, the UAT-02 action bar, the CI workflow and the corrected runbook are not on `main`. |
| 2 | **Set `MONGO_URL` + `REACT_APP_BACKEND_URL` on Render** | The only two variables the app genuinely cannot run without. [DEPLOY.md Step 3](../DEPLOY.md) |
| 3 | **Open the deployed app and confirm it serves** | **Nobody has verified this.** The agent environment's network policy 403s `onrender.com` and the custom domain, so it could not be checked from a session. |
| 4 | **Set `SECRET_KEY`, `OPENROUTER_API_KEY`, `CORS_ORIGINS`** | Not blockers. Without the OpenRouter key the app silently runs on the keyword fallback — check `"llm": true` at `/api/health`. |
| 5 | **Cron pinger before any traffic push** | Free Render sleeps after 15 min; the next visitor waits ~50s. Do this *before* posting a link anywhere. [DEPLOY.md Step 7](../DEPLOY.md) |
| 6 | **A payment rail before day 14 of the first trial** | Signups get 14 days free with no card, so this is not a launch-day item — but on day 14 you cannot take money without it. |

## 2 · Product — open findings

| ID | Sev | One line | Est |
|---|---|---|---|
| [UAT-13](UAT.md) | **Blocker** | One stage and one match score shared across every role a candidate is in. Reject for one role → they read Rejected on all of them. | ~1 day |
| [UAT-12](UAT.md) | High | `PARTIAL`. Placeholders and permissive filter defaults shipped; the `default` tag treatment did not. | ~30 min |
| [UAT-04](UAT.md) | High | `PARTIAL`. Empty-pool false alarm killed; the preview still has not moved to the role page. | ~60 min |
| [UAT-05](UAT.md) | High | `PARTIAL`. Panel renamed; skeleton/shimmer loading states still to do. | ~40 min |
| [UAT-08](UAT.md) | Medium | Split welded at 50/50. Needs a draggable splitter, default 62/38. | ~40 min |
| [UAT-09](UAT.md) | Medium | Must-have skills become a lock toggle on a detected skill; free-text TagInput goes away. **Needs sign-off — it reorders existing shortlists.** | ~30 min |
| [BL-11](BACKLOG.md) | Medium | "Save draft" is in the agreed design and cannot be built: there is no draft in the model. Pairs with UAT-03's Published/Drafts grouping. | ~half day |

**Sequencing, from the round-2 notes:** UAT-13 must land before anything else
that renders stage or match, or that work gets built twice.

## 3 · Debt

| ID | Sev | One line |
|---|---|---|
| [BL-10](BACKLOG.md) | **High** | The responsive pass is not in the code. Dashboard and job setup report 772px in a 390px viewport; `AppShell.js:12` has no breakpoint, drawer or menu button. Anyone on a phone gets a sideways-scrolling page. |
| [BL-04](BACKLOG.md) | Low | `share_slug` is 8 hex characters with a non-unique index. A collision serves one recruiter's apply link from another's role. Needs a migration, not a one-word change. |
| [BL-03](BACKLOG.md) | Low | Mostly closed. `smoke-test.yml` still needs `API_URL`, `TT_TEST_EMAIL`, `TT_TEST_PASSWORD` before it can be run — it is on-demand now, so it no longer nags. |

## 4 · Not before someone asks

[BL-01](BACKLOG.md) import a JD from a URL · [BL-02](BACKLOG.md) collapsible
sidebar · [BL-05](BACKLOG.md) annual plan · [BL-06](BACKLOG.md) Razorpay
Subscriptions · [BL-07](BACKLOG.md) seats and teams · [BL-08](BACKLOG.md) GST
invoices · [BL-09](BACKLOG.md) redacting self-applied candidates

---

## Done recently

| When | What |
|---|---|
| 2026-09-12 | **UAT-02** — one sticky action bar at the bottom of role setup, with a readiness line and a sentence saying what publishing does |
| 2026-09-12 | **CI that actually runs** — `tests.yml`: 126 tests on Python 3.11 and 3.13, end-to-end against real MongoDB, plus the frontend build, on every push and PR |
| 2026-09-12 | **`DEPLOY.md` rewritten** — it described an app from before accounts, before real resume parsing, and before payments |
| 2026-09-12 | **`smoke-test.yml` made on-demand** — it was failing on every push over three unset config values, so `main` carried a permanent red X that said nothing about the code |
| 2026-09-06 | UAT-01, 03, 06, 07, 10 and parts of 04, 05, 12 |
