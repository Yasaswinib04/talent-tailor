# Deploying Talent Tailor — free, start to finish

Target: a public URL you can put in a submission form, costing ₹0/month, on infrastructure
that doesn't expire.

| Piece | Where it runs | Cost | Catch |
|---|---|---|---|
| React frontend | Render **Static Site** | Free, unmetered | None. Never sleeps, CDN-backed. |
| FastAPI backend | Render **Web Service**, free plan | Free | Sleeps after 15 min idle; next request takes ~50s to wake. Fixable — see Step 6. |
| MongoDB | **Atlas M0** | Free forever | 512 MB, shared CPU. Far more than this app needs. |

Everything below is one-time except Step 7, which is just `git push`.

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
`talent-tailor-api` and `talent-tailor-web`. It will ask you for the two values marked
`sync: false` — that's Step 3.

## Step 3 — Fill in the secrets Render asks for

| Service | Key | Value |
|---|---|---|
| `talent-tailor-api` | `MONGO_URL` | The Atlas string from Step 1 |
| `talent-tailor-web` | `REACT_APP_BACKEND_URL` | Leave blank for now — Step 5 |

Click Apply. The API builds first.

## Step 4 — Confirm the API is alive

When `talent-tailor-api` goes green, Render shows its URL, something like
`https://talent-tailor-api.onrender.com`. Open:

```
https://talent-tailor-api.onrender.com/api/health
```

You want `{"status":"ok","time":"..."}`. Then check the seed data landed:

```
https://talent-tailor-api.onrender.com/api/jobs
```

Four roles should come back. The seeder in `backend/server.py` runs on startup and only
fires against an empty database, so redeploys won't duplicate anything.

**If `/api/health` hangs or 502s**, open the service's **Logs** tab:

- `KeyError: 'MONGO_URL'` — the env var didn't save. Re-add it under Environment.
- Hangs with no error — almost always the `mongodb+srv` DNS lookup. Confirm
  `dnspython` is in `backend/requirements.txt` (it is, as of this commit) and that the
  build log shows it installing.
- `ServerSelectionTimeoutError` — Atlas Network Access isn't `0.0.0.0/0`, or the password
  in the URL is wrong.

## Step 5 — Wire the frontend to the API

Go to `talent-tailor-web` → **Environment** → set:

```
REACT_APP_BACKEND_URL = https://talent-tailor-api.onrender.com
```

No trailing slash — `frontend/src/lib/api.js` appends `/api` itself, so a slash gives you
`//api` and 404s. Then **Manual Deploy → Deploy latest commit**.

This rebuild is mandatory, not optional. Create React App bakes `REACT_APP_*` values into
the JavaScript bundle at build time; changing the variable without rebuilding changes
nothing. This is the single most common reason a "working" deploy shows an empty dashboard.

Your app is now live at `https://talent-tailor-web.onrender.com`.

## Step 6 — Stop the backend from sleeping (do this the day before a demo)

The free web service spins down after 15 minutes with no traffic, and the next visitor
waits ~50 seconds while it boots. During a live demo that reads as "the app is broken."

Fix: hit `/api/health` every 10 minutes from a free external pinger.

1. [cron-job.org](https://cron-job.org) → Create cronjob
2. URL: `https://talent-tailor-api.onrender.com/api/health`
3. Schedule: every 10 minutes

**One caveat that matters if you deploy several hackathon projects here.** Render gives
750 free instance-hours per month *across your whole account*, and a month is ~730 hours.
So you can keep exactly **one** backend awake around the clock. Keep the pinger on whichever
project you're demoing and turn the others off, or you'll exhaust the quota mid-month and
Render suspends every free service until the 1st.

Static sites don't consume instance-hours. Only backends do.

## Step 7 — Every deploy after this

```bash
git push origin main
```

Render auto-deploys both services on push. Rollback is **Deploys → pick an older
deploy → Rollback** in the dashboard.

---

## Things worth knowing

**Where secrets live.** `MONGO_URL` exists only in Render's backend environment. The React
bundle never sees it — the browser only ever talks to your API over HTTPS. This is the same
separation your GCP guide describes with Secret Manager; Render's env vars are the free-tier
equivalent. Corollary: never put a key in a `REACT_APP_*` variable. Anything prefixed
`REACT_APP_` is compiled into JavaScript that anyone can read in DevTools.

**CORS is currently wide open.** `backend/server.py` sets `allow_origins=["*"]` with
`allow_credentials=True`. It works today because the frontend sends no cookies, but the
combination is invalid per the CORS spec and browsers will reject credentialed requests if
you ever add auth. When you do, tighten it to:

```python
allow_origins=[os.environ.get("FRONTEND_ORIGIN", "*")]
```

and set `FRONTEND_ORIGIN` to the static site URL.

**Atlas M0 pauses after 60 days of zero queries.** It doesn't delete anything — you resume
it from the dashboard in one click. Worth knowing before you open a six-month-old project
and conclude the deploy broke.

**Resume "parsing" is still simulated** and skill extraction is still a keyword dictionary
(see the README). Deploying doesn't change that — if a judge uploads a PDF on `/apply/:slug`,
the file is not read.

## When to move off this stack

Free Render is right for hackathons and demos. Reach for the Cloud Run + Cloud SQL path in
your GCP guides when you have real users, need a custom domain with no cold start, or need
an audited secrets story. That path costs roughly $8–10/mo minimum, essentially all of it
Cloud SQL — Cloud Run's own free tier would likely cover this app's traffic at $0.
