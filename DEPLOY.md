# Deploying Talent Tailor — free, start to finish

Target: a public URL you can hand to a real recruiter, costing ₹0/month, on
infrastructure that doesn't expire.

| Piece | Where it runs | Cost | Catch |
|---|---|---|---|
| React frontend | Render **Static Site** | Free, unmetered | None. Never sleeps, CDN-backed. |
| FastAPI backend | Render **Web Service**, free plan | Free | Sleeps after 15 min idle; next request takes ~50s to wake. Fixable — see Step 7. |
| MongoDB | **Atlas M0** | Free forever | 512 MB, shared CPU. Far more than this app needs. |
| LLM extraction | **OpenRouter**, pay-as-you-go | ~₹125 per fully-parsed role | Optional. Without a key the app falls back to the keyword taxonomy. |

Everything below is one-time except Step 8, which is just `git push`.

---

## Step 1 — Create the database (once, ~5 min)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a
   **M0 Free** cluster. Any region near you; AWS Mumbai (`ap-south-1`) is a good default.
2. **Database Access** → Add New Database User. Username + a generated password.
   Copy the password somewhere — Atlas won't show it again.
3. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`).

   This one feels wrong and isn't. Render's free tier gives your service no fixed
   outbound IP, so there is no narrower rule that would work. Your database user's
   password is what protects the cluster.
4. **Connect** → **Drivers** → copy the connection string. It looks like:

   ```
   mongodb+srv://myuser:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `<password>` with the real password. If the password contains `@`, `:`, `/`
   or `#`, URL-encode it (`@` → `%40`) or the string will parse wrong.

Keep that finished string handy — it's `MONGO_URL` in Step 3.

## Step 2 — Point Render at the repo (once)

1. Sign in to [render.com](https://render.com) with GitHub.
2. **New → Blueprint**, pick `Yasaswinib04/talent-tailor`, branch `main`.

Render reads [render.yaml](render.yaml) and proposes two services:
`talent-tailor-api` and `talent-tailor-web`. It will then ask you for every value
marked `sync: false` — that's Step 3.

## Step 3 — Fill in the secrets Render asks for

Render prompts for these because they are deliberately not in the repo. Anything
not listed here has a working default in `render.yaml`.

### Required — the API will not work without them

| Service | Key | Value |
|---|---|---|
| `talent-tailor-api` | `MONGO_URL` | The Atlas string from Step 1 |
| `talent-tailor-api` | `SECRET_KEY` | Any long random string — `openssl rand -hex 32` |
| `talent-tailor-web` | `REACT_APP_BACKEND_URL` | Leave blank for now — Step 6 |

**`SECRET_KEY` signs the auth tokens.** If you leave it unset the app derives one
from `MONGO_URL` and still runs — but then rotating your database password
silently signs every user out. Set it once and forget it. Rotating it
deliberately is how you force a global sign-out.

### Strongly recommended — the product is visibly worse without them

| Service | Key | Value |
|---|---|---|
| `talent-tailor-api` | `OPENROUTER_API_KEY` | From [openrouter.ai/keys](https://openrouter.ai/keys) |
| `talent-tailor-api` | `CORS_ORIGINS` | Set in Step 6, once the web URL exists |
| `talent-tailor-api` | `ADMIN_KEY` | Any random string. Gates the landing-page lead list (`GET /api/visitors`), which is disabled while unset. |

Without `OPENROUTER_API_KEY` the app still runs and still parses resumes — it falls
back to `backend/skills.py`, a 119-skill taxonomy with token-boundary matching plus
regex extraction of name, email, phone, title, employer, years, CTC, notice and
degree. That fallback is deterministic and free, but it reads far less nuance than a
model does, and shortlist quality is the product. Budget ~₹125 in LLM spend for a
role with 50 resumes, against ₹1,999 of revenue.

### Payments — not needed on day one

**Every new account gets 14 days of full access with no card** (`TRIAL_DAYS`,
default 14). So you can launch, onboard recruiters and watch them work without any
payment rail configured at all. What you cannot do is take money — which becomes
real on day 14, not day 1.

The app picks a rail at runtime, in this order:

| Rail | Set | Behaviour |
|---|---|---|
| 1. Razorpay checkout | `RAZORPAY_KEY_ID` **and** `RAZORPAY_KEY_SECRET` | Buyer pays in-app, signature verified server-side, access extends automatically |
| 2. Direct UPI | `UPI_VPA` (+ `UPI_PAYEE_NAME`) | Unlock modal shows the VPA and a `upi://` deep link; you send `UNLOCK_CODE` after payment |
| 3. Neither | — | Modal shows contact-the-team copy and a code entry box only |

If you use rail 2 or 3 you also want `UNLOCK_CODE` (the manual bridge — unlocking
is disabled while it is unset) and `SUPPORT_CONTACT` (where buyers send proof;
an address containing `@` renders as `mailto:`, a phone number renders as a
`wa.me` link — **it is shown to every buyer**, so don't use a number you'd rather
not hand to strangers).

Use `rzp_test_*` keys to rehearse the flow end to end before switching to
`rzp_live_*`.

### Analytics — optional

`POSTHOG_API_KEY` on the API and `REACT_APP_POSTHOG_KEY` on the web service take
the same `phc_...` Project API Key. Unset means analytics is entirely off and no
code path changes. Session replay must *also* be enabled in the PostHog dashboard;
the key alone does not start recording.

Click Apply. The API builds first.

## Step 4 — Confirm the API is alive

When `talent-tailor-api` goes green, Render shows its URL, something like
`https://talent-tailor-api.onrender.com`. Open:

```
https://talent-tailor-api.onrender.com/api/health
```

You want:

```json
{"status": "ok", "time": "...", "llm": true}
```

**Check the `llm` field.** `true` means `OPENROUTER_API_KEY` landed and real model
extraction is on. `false` means the app is running on the keyword fallback — it
works, but it is not the product you think you shipped.

**Do not test `/api/jobs` in a browser.** Every recruiter route is behind an
account now, so an unauthenticated `GET /api/jobs` returns **401, and that is the
correct healthy response**. The endpoints that are public by design are:

| Route | Why it is public |
|---|---|
| `GET /api/health` | Liveness, for Render and the pinger |
| `POST /api/auth/signup`, `POST /api/auth/login` | You can't have an account before you have an account |
| `GET /api/jobs/share/{slug}` | A candidate opening a share link has no login |
| `POST /api/apply/{slug}`, `POST /api/apply/{slug}/parse-resume` | Same — applying is the one flow that must never require an account. Both are rate-limited. |
| `POST /api/visitors` | Landing-page lead capture. Identification, not authentication. |

`GET /api/visitors` — the lead list those captures feed — is operator-only and
returns **403 unless `ADMIN_KEY` is set** and sent as an `X-Admin-Key` header. It
stays disabled while the variable is unset, so leaving it blank is safe.

**A fresh production database is empty, and stays empty.** `SEED_DEMO_DATA`
defaults to `0`, so no fictional roles or candidates are inserted — a paying
customer's workspace must never start with someone else's fake data. Signed-in
users get a one-click "Explore with sample data" inside their own workspace
instead. Set `SEED_DEMO_DATA=1` only on a throwaway demo instance.

**If `/api/health` hangs or 502s**, open the service's **Logs** tab:

- `KeyError: 'MONGO_URL'` — the env var didn't save. Re-add it under Environment.
- Hangs with no error — almost always the `mongodb+srv` DNS lookup. Confirm
  `dnspython` is in `backend/requirements.txt` (it is) and that the build log
  shows it installing.
- `ServerSelectionTimeoutError` — Atlas Network Access isn't `0.0.0.0/0`, or the
  password in the URL is wrong.

## Step 5 — Create your own account

There is no default login, on purpose: an app shipping known credentials is no
better off than one with no login at all. Open the web URL once Step 6 is done and
sign up through `/signup` like any other user. The first account is not special.

## Step 6 — Wire the two services together

Two variables, one on each service, and **both need a rebuild to take effect**.

On `talent-tailor-web` → **Environment**:

```
REACT_APP_BACKEND_URL = https://talent-tailor-api.onrender.com
```

No trailing slash and no `/api` suffix — `frontend/src/lib/api.js` appends `/api`
itself. `frontend/scripts/check-env.js` runs as a `prebuild` step and fails the
build on either mistake rather than letting a broken bundle ship.

Then **Manual Deploy → Deploy latest commit**.

This rebuild is mandatory, not optional. Create React App bakes `REACT_APP_*`
values into the JavaScript bundle at build time; changing the variable without
rebuilding changes nothing. This is the single most common reason a "working"
deploy shows an empty dashboard.

On `talent-tailor-api` → **Environment**:

```
CORS_ORIGINS = https://talent-tailor-web.onrender.com
```

Comma-separated if you have more than one origin (a custom domain, say). The
default is `*`, which works but means any site can call your API from a browser.
Narrow it once you know the real origin.

Your app is now live at `https://talent-tailor-web.onrender.com`.

## Step 7 — Stop the backend from sleeping (do this the day before a demo)

The free web service spins down after 15 minutes with no traffic, and the next
visitor waits ~50 seconds while it boots. During a live demo that reads as "the
app is broken." Worse, a candidate clicking a share link is the *least* patient
visitor you have.

Fix: hit `/api/health` every 10 minutes from a free external pinger.

1. [cron-job.org](https://cron-job.org) → Create cronjob
2. URL: `https://talent-tailor-api.onrender.com/api/health`
3. Schedule: every 10 minutes

**One caveat that matters if you deploy several projects here.** Render gives
750 free instance-hours per month *across your whole account*, and a month is ~730
hours. So you can keep exactly **one** backend awake around the clock. Keep the
pinger on whichever project you're demoing and turn the others off, or you'll
exhaust the quota mid-month and Render suspends every free service until the 1st.

Static sites don't consume instance-hours. Only backends do.

## Step 8 — Every deploy after this

```bash
git push origin main
```

Render watches `main` and rebuilds on push.

**Which service rebuilds depends on which folder you touched.** Because each
service declares a `rootDir`, Render only auto-deploys a service when the push
changes files under that folder:

| You changed | `talent-tailor-api` | `talent-tailor-web` |
|---|---|---|
| `backend/**` | rebuilds | untouched |
| `frontend/**` | untouched | rebuilds |
| both | rebuilds | rebuilds, in parallel |
| root files (`README.md`, `DEPLOY.md`) | untouched | untouched |

So a backend fix does not take your frontend offline, and vice versa. Roughly 2–4
min for the API, 2–3 min for the web build.

**One exception worth remembering:** editing `render.yaml` itself doesn't apply on
push. Blueprint changes need **Blueprint → Sync** in the Render dashboard.

Rollback is **the service → Deploys → pick an older deploy → Rollback**. Instant
for the static site, ~2 min for the API.

---

## What CI does and doesn't tell you

Two workflows, and they answer different questions:

- **`.github/workflows/tests.yml`** runs on every push and pull request, on a clean
  checkout, needing no configuration. Backend suite on Python 3.11 and 3.13
  (the version `render.yaml` pins), including an end-to-end pass against a real
  MongoDB, plus the frontend production build. **This is the one that says a commit
  is not broken.**
- **`.github/workflows/smoke-test.yml`** proves a *deployed* instance is healthy —
  data is really there, the paywall still redacts, one workspace still can't read
  another's. **It runs only when you ask for it**: Actions tab → Smoke test
  deployed API → Run workflow. Use it after a deploy you want to verify.

  The first time you run it, set three values under **Settings → Secrets and
  variables → Actions**:

  | Kind | Name | Value |
  |---|---|---|
  | Variable | `API_URL` | `https://talent-tailor-api.onrender.com` (no trailing slash) |
  | Variable | `TT_TEST_EMAIL` | Any throwaway address — `tt` is just Talent Tailor, not an account anywhere. Every recruiter route needs a login, so the suite needs one to sign in with. Created on first run, reused after. |
  | Secret | `TT_TEST_PASSWORD` | Any password, 8+ characters |

  Unconfigured, it fails rather than skipping — you asked for the run, so it owes
  you an answer rather than a green tick that tested nothing. **None of this is
  needed to launch.** It verifies a deployment; it does not gate one.

---

## Things worth knowing

**Where secrets live.** `MONGO_URL`, `SECRET_KEY`, `OPENROUTER_API_KEY` and
`RAZORPAY_KEY_SECRET` exist only in Render's backend environment. The React bundle
never sees them — the browser only ever talks to your API over HTTPS. Corollary:
never put a key in a `REACT_APP_*` variable. Anything prefixed `REACT_APP_` is
compiled into JavaScript that anyone can read in DevTools. The two exceptions are
deliberate and safe: `REACT_APP_BACKEND_URL` is a public URL, and
`REACT_APP_POSTHOG_KEY` is a write-only ingest key designed to be published.

**CORS and credentials.** The API sets `allow_credentials=False` and reads its
allowed origins from `CORS_ORIGINS`. Auth is a bearer token in the `Authorization`
header, not a cookie, so there is nothing for a credentialed cross-origin request
to carry. If you ever move sessions to cookies, `CORS_ORIGINS` must stop being `*`
first — the wildcard and credentials together are invalid per the CORS spec and
browsers will reject the request.

**Atlas M0 pauses after 60 days of zero queries.** It doesn't delete anything — you
resume it from the dashboard in one click. Worth knowing before you open a
six-month-old project and conclude the deploy broke.

**Trials are stamped at signup.** `TRIAL_DAYS` (default 14) is written onto the
user record as `access_until` when the account is created, and a startup migration
backfills it for accounts that predate the access model. Changing the env var later
does not retroactively extend anyone — it only affects new signups.

## When to move off this stack

Free Render is right for a launch and the first handful of customers. Reach for a
Cloud Run + managed-Postgres path when you have real users, need a custom domain
with no cold start, or need an audited secrets story. That path costs roughly
$8–10/mo minimum, essentially all of it database.
