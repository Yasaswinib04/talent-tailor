# Talent Tailor

An HR candidate-shortlisting app: describe a role, get LLM skill extraction and recommended
criteria, see how many of your pool clears the bar before you publish, and receive applicants
through a shareable auto-apply link — their resumes are read and parsed by an LLM. Each
account is an isolated workspace; every role shows its top 3 ranked candidates free and
unlocks the full shortlist + CSV export per role (₹1,999 by default).

- **Frontend** — React 18 (CRA) + Tailwind + Framer Motion + Radix UI
- **Backend** — FastAPI + MongoDB (motor)
- **Product context** — `memory/PRD.md`
- **QA** — test plan and latest report in `specs/`
- **Deploy** — [DEPLOY.md](DEPLOY.md) (free: Render + MongoDB Atlas)

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

Open http://localhost:3000 and create an account. An empty workspace offers a one-click
"Explore with sample data" (4 roles, 20 fictional candidates). Set `SEED_DEMO_DATA="1"` to
also seed a shared demo workspace on first start against an empty database.

## Routes

| Path | What it is |
|---|---|
| `/` | Landing page (design case study at `/report`) |
| `/login`, `/signup` | Account sign-in / workspace creation |
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

Skill extraction (from JDs) and resume parsing (on the apply page — the uploaded PDF/DOCX is
read and its text extracted) run through an LLM via OpenRouter (`backend/llm.py`, model set by
`OPENROUTER_MODEL`). Without an `OPENROUTER_API_KEY`, both fall back to the keyword dictionary
(`SKILL_DICTIONARY` in `backend/server.py`) so an outage degrades quality, never availability.
Scanned-image PDFs aren't OCR'd — the applicant is asked to fill the form manually.

## Monetization

The shortlist is free to see, paid to use: every role reveals its top 3 candidates in full;
the rest are ranked but identity-redacted (server-side) until the role is unlocked. Unlocking
(₹`UNLOCK_PRICE_INR`, default 1999, one-time per role) reveals everyone and enables CSV
export. Payment is currently manual: the buyer pays you directly, you share the `UNLOCK_CODE`,
they enter it on the job page — swap that check for a Razorpay webhook to go fully self-serve.
