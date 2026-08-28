# CRED HR — Talent Engine

A redesigned candidate evaluation platform for recruiters hiring at volume.
React + Tailwind frontend, FastAPI + MongoDB backend.

- **UX report** — `/`
- **Recruiter app** — `/app` (dashboard, job setup, candidate profiles, bulk resume upload)
- **Public apply link** — `/apply/:slug`

## Run locally

**Prerequisites:** Node.js 18+, Python 3.11+, a MongoDB instance.

```bash
cp .env.example .env          # fill in MONGO_URL and DB_NAME

# Backend — http://localhost:8001
pip install -r backend/requirements.txt
uvicorn server:app --app-dir backend --port 8001 --reload

# Frontend — http://localhost:3000
cd frontend && npm install && npm start
```

## Configuration

Every variable the code reads is documented in [`.env.example`](.env.example).
There are four:

| Variable | Where | Notes |
|---|---|---|
| `MONGO_URL` | backend, runtime | Required. The API refuses to start without it. |
| `DB_NAME` | backend, runtime | Required. Seed data is inserted on first startup if the database is empty. |
| `CORS_ORIGINS` | backend, runtime | Comma-separated allowed origins. Defaults to `*`. **Set this in production.** |
| `REACT_APP_BACKEND_URL` | frontend, **build time** | Backend origin, no trailing slash, no `/api` suffix. |

### The one that bites

`REACT_APP_BACKEND_URL` is inlined into the JavaScript bundle by Create React
App during `npm run build`. It is **not** read at runtime — setting it on a
running server does nothing, and an unset value becomes the literal string
`"undefined"`, producing a bundle that calls `undefined/api/...` on every
request. It builds clean and fails only once deployed.

`npm run build` now refuses to proceed if it is missing or malformed. Set it in
`frontend/.env.production` (committed — it's a public URL, not a secret) or
export it in your build step, and rebuild whenever it changes.

## Deploying

```bash
# 1. Backend
pip install -r backend/requirements.txt
MONGO_URL=... DB_NAME=... CORS_ORIGINS=https://your-frontend.example.com \
  uvicorn server:app --app-dir backend --host 0.0.0.0 --port 8001

# 2. Frontend — build with the backend URL, then serve frontend/build statically
cd frontend
REACT_APP_BACKEND_URL=https://api.your-domain.example.com npm run build
```

Serve `frontend/build` with SPA fallback (all unmatched paths → `index.html`),
otherwise deep links like `/app/jobs/:id` and `/apply/:slug` 404 at the CDN.

**Before you deploy**, confirm the bundle got the URL:

```bash
grep -o 'baseURL[^,]*' frontend/build/static/js/main.*.js   # must not contain "undefined"
```

## Tests

```bash
pip install -r backend/requirements.txt -r backend/tests/requirements.txt
pytest backend/tests                    # 50 tests; integration ones skip without a server
TEST_API_URL=http://localhost:8001 pytest backend/tests   # includes integration tests
```

- `test_bulk_upload.py` and `test_p0_fixes.py` run fully locally against an
  in-memory Mongo — no server needed.
- `backend_test.py` is an integration suite; point it at a running API with
  `TEST_API_URL`.

## Known issues

A full UAT was run on 2026-08-08. See
[`specs/uat-report-2026-08-08.md`](specs/uat-report-2026-08-08.md) for findings
and [`specs/launch-fix-plan.md`](specs/launch-fix-plan.md) for what is fixed and
what remains. **The app currently ships with no authentication** — `/app` and
every `/api/*` endpoint is public. Do not put real candidate data behind it
until that is addressed.
