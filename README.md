# Talent Tailor — CRED HR Talent Engine

An HR candidate-evaluation app: describe a role, get live skill extraction and recommended
criteria, see how many of your pool clears the bar before you publish, and receive applicants
through a shareable auto-apply link.

- **Frontend** — React 18 (CRA) + Tailwind + Framer Motion + Radix UI
- **Backend** — FastAPI + MongoDB (motor)
- **Product context** — `memory/PRD.md`
- **QA** — test plan and latest report in `specs/`

## Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB running locally, or a MongoDB Atlas connection string

<details>
<summary>Installing MongoDB locally on macOS</summary>

```bash
brew tap mongodb/brew && brew trust mongodb/brew && brew install mongodb-community@8.0
```

`brew services start` can fail with a launchctl bootstrap error. Running it directly works:

```bash
mkdir -p ~/data/mongo-talent-tailor && mongod --dbpath ~/data/mongo-talent-tailor
```
</details>

## Configure

Copy the two blocks in [.env.example](.env.example) into `backend/.env` and `frontend/.env`.
Neither file is committed, and **both are required** — the backend reads `MONGO_URL` and
`DB_NAME` at import time and will not start without them.

## Run

Backend (port 8000):

```bash
cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt && venv/bin/uvicorn server:app --port 8000
```

Frontend (port 3000):

```bash
cd frontend && npm install && npm start
```

Open http://localhost:3000. On first run against an empty database the API seeds 4 roles and
20 candidates; it will not re-seed or duplicate on restart.

## Routes

| Path | What it is |
|---|---|
| `/` | UX report on the redesign |
| `/onboarding` | 3-step setup |
| `/app` | Candidate dashboard (keyboard: `J` `K` `↵` `N` `X`) |
| `/app/jobs/new` | Role setup with live extraction |
| `/app/candidates/:id` | Candidate profile, multi-role assignment |
| `/apply/:slug` | Public application link |
| `/themes` | Theme explorations |

## How matching works

Two separate mechanisms, deliberately:

- **Mandatory criteria** are a hard filter. Publishing a role runs them across the pool and
  attaches everyone who clears them — the "N will pass" preview and the resulting shortlist
  use the same code path, so they cannot disagree. Missing data never rejects a candidate;
  an unknown value surfaces them for the recruiter to judge.
- **Scoring weights** rank the people who got through, per role. Each of the five dimensions
  is scored 0–100 independently and combined by the weights you set, so moving a slider
  genuinely reorders the list. Education is a floor: a master's satisfies a bachelor's
  requirement.

Skill extraction is a keyword dictionary (`SKILL_DICTIONARY` in `backend/server.py`), not an
LLM. Resume "parsing" on the apply page is simulated — the uploaded file is not read.
