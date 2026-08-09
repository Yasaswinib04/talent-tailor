# CRED HR — Talent Engine

A recruiting workspace for evaluating a large candidate pool quickly: role setup
with live skill extraction, a keyboard-driven candidate dashboard, one profile
assignable to many roles, and a public shareable apply link.

- **Backend** — FastAPI + MongoDB (`backend/server.py`), all routes under `/api`
- **Frontend** — React 18 (CRA) + Tailwind + Framer Motion (`frontend/`)

Routes: `/` (UX report) · `/onboarding` · `/app` (workspace) · `/apply/:slug`
(public) · `/themes`

## Prerequisites

- Python 3.11+
- Node.js 18+
- A MongoDB you can reach (local `mongod`, Docker, or Atlas)

## Configure

Copy `.env.example` and fill both halves — the backend and frontend read
different variables:

```bash
cp .env.example backend/.env     # MONGO_URL, DB_NAME, HR_ACCESS_CODE, ALLOWED_ORIGINS
cp .env.example frontend/.env    # REACT_APP_BACKEND_URL
```

Generate an access code for `HR_ACCESS_CODE`:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(24))"
```

The backend refuses to start without `MONGO_URL`, `DB_NAME`, and
`HR_ACCESS_CODE`, and tells you which one is missing.

## Run

Backend (port 8000):

```bash
pip install -r backend/requirements.txt
cd backend && uvicorn server:app --reload --port 8000
```

Frontend (port 3000):

```bash
cd frontend && npm install && npm start
```

Open http://localhost:3000/app and enter your `HR_ACCESS_CODE`. On first boot the
backend seeds 4 roles and 20 candidates.

## Deploy to Render

`render.yaml` is a blueprint for two services — `cred-hr-api` (FastAPI) and
`cred-hr-web` (static frontend). Render has no managed MongoDB, so create a free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster first and allow access
from anywhere (or from Render's egress IPs).

In Render: **New → Blueprint**, point it at this repo, and apply. Then, because
each service needs the other's URL:

1. Copy both service URLs from the dashboard.
2. On `cred-hr-api` → Environment, set:
   - `MONGO_URL` — your Atlas connection string
   - `ALLOWED_ORIGINS` — the frontend URL, e.g. `https://cred-hr-web.onrender.com`
3. On `cred-hr-web` → Environment, set `REACT_APP_BACKEND_URL` to the backend
   URL, e.g. `https://cred-hr-api.onrender.com` (no trailing `/api`).
4. Redeploy both. The frontend bakes its API URL in at build time, so it needs a
   rebuild after any change to that value.
5. Read the generated `HR_ACCESS_CODE` from `cred-hr-api` → Environment. That's
   what recruiters type at `/app`. Share it out of band; rotate it by replacing
   the value and redeploying.

The blueprint sets a catch-all rewrite to `index.html`. Without it, a candidate
opening `/apply/:slug` directly gets a 404 — that route only exists client-side.

On Render's `starter` plan the API sleeps when idle, so the first request after a
quiet spell takes a few seconds. Worth knowing before you send the link to
candidates.

## Access model

| Surface | Who can reach it |
| --- | --- |
| `/app/**` and all recruiter endpoints | Anyone with `HR_ACCESS_CODE` |
| `GET /api/jobs/share/{slug}`, `POST /api/apply/{slug}`, `/apply/:slug` | Public — candidates need no code |
| `GET /api/health` | Public |

The access code is typed by the recruiter and kept in `sessionStorage`; it is
never baked into the JS bundle. It is a **shared team code, not per-user
authentication** — there are no individual accounts, roles, or audit trail yet.
Rotate it by changing `HR_ACCESS_CODE` and restarting the backend.

## Tests

```bash
# Backend API, against a running server
REACT_APP_BACKEND_URL=http://localhost:8000 HR_ACCESS_CODE=<code> \
  pytest backend/tests/backend_test.py

# Frontend build
cd frontend && npm run build
```

## Known gaps

- AI skill extraction is a heuristic dictionary, not a real model.
- Resume parsing reads `.txt` only; PDF/DOCX uploads fall back to a manual form.
- Onboarding carries the first role into job setup but isn't persisted server-side.
- No per-user accounts, and no audit trail of stage changes.
