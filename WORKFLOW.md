# TalentMatch AI — Workflow & Architecture

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Browser (React SPA)                             │
│  HRLayout │ HRDashboard │ HRPreferences │ HRRoleDashboard │ TalentPools    │
│  Compare │ PoolScannerModal │ CandidateDashboard │ DevBugReporter          │
│  localStorage fallback for sessions + analysis when server is unreachable   │
└──────────────────────┬──────────────────────────────────────────────────────┘
                       │ fetch /api/*
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Express Server (port 3001)                            │
│                                                                              │
│  ┌─ Middleware ──────────────────────────────────────────────────────┐      │
│  │ • express.json (10mb limit)                                       │      │
│  │ • Firebase Auth verification (or static UAT token bypass)         │      │
│  │ • Global error handler                                             │      │
│  │ • No DB health check — routes work via localStorage fallbacks     │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌─ API Routes ──────────────────────────────────────────────────────┐      │
│  │ /api/hr/sessions/*       → sessions.ts (CRUD + analyze + scan)    │      │
│  │ /api/hr/upload/*         → upload.ts (Supabase + text extraction) │      │
│  │ /api/hr/bugs/*           → bugs.ts (PostgreSQL + local JSON)      │      │
│  │ /api/hr/sessions/extract-skills → Gemini JD→skills parser         │      │
│  │ /api/hr/sessions/:id/scan-pool → Pool scanner (preFilter+Gemini) │      │
│  │ /api/health              → env var diagnostics + DB status         │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌─ AI Services (Server-side) ──────────────────────────────────────┐      │
│  │ classifier.ts → classifyTrack (IC vs Manager)                     │      │
│  │ scorer.ts    → scoreCandidate (full scoring + competencies)       │      │
│  │ questions.ts → generateQuestions (gap→interview Qs)               │      │
│  │ tailor.ts   → tailorResume (STAR format rewrite)                  │      │
│  │ extractor.ts → extractProfile (resume→structured fields)          │      │
│  │ jdSkillExtractor.ts → extractSkillsFromJD (JD→mandatory+pref)     │      │
│  │ pipeline.ts → orchestration + pre-filter + overqualified check     │      │
│  │ poolScanner.ts → two-layer pool scan (deterministic + AI)         │      │
│  │ modelConfig.ts → per-step model routing with env var overrides    │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌─ Vite (middleware mode in dev) ───────────────────────────────────┐      │
│  │ In production: serves static dist/ + SPA catch-all on /*          │      │
│  └───────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Storage Backends

| System | Purpose | Access pattern |
|--------|---------|---------------|
| **PostgreSQL** (via Railway) | Sessions, job profiles, analysis results, pipeline logs, resume text cache, bug reports, talent pool profiles | Server-side CRUD via `getSql()` |
| **Supabase Storage** | Raw PDF/DOCX resume files stored in `resumes` bucket | Upload: `supabase.storage.from('resumes').upload()`. Download: `supabase.storage.from('resumes').download()` |
| **localStorage** (browser) | Fallback when server/DB is unreachable. Stores sessions, analysis results, bugs | Client-side `getLocalSessions()`, `saveLocalSessions()` |
| **talent_pool_profiles** (PostgreSQL) | Global pool of extracted candidate profiles, deduplicated by SHA-256 hash of resume text | `upsertTalentProfile()`, `findProfileByTextHash()`, `getPoolProfilesExcludingSession()` |

### Offline / Fallback Behavior

When the Express server returns 503 (DB not connected) or is unreachable:

1. `createSession()` → creates session in localStorage (`local-session-xxx`)
2. `uploadFiles()` → returns simulated metadata
3. `associateFilesWithSession()` → saves uploaded file metadata to localStorage
4. `startAnalysis()` → throws error (caught by handleAnalyze)
5. **Client-side fallback**: `handleAnalyze()` in RoleDashboard catches the error and runs Gemini directly from the browser using files still in memory (`resumeFiles`)
6. Results saved to localStorage and displayed in the candidate table
7. No PostgreSQL or Supabase needed for this fallback path — only needs `GEMINI_API_KEY`

**Important**: The client-side fallback only works when files are in browser memory. If files were uploaded successfully to the server, they're in Supabase Storage and the client can't access them. In that case, re-select the files through the upload dialog (without clicking Upload) and click "Run AI Analysis" again.

---

## 2. Data Flow Diagrams

### Upload Flow

```
HR clicks "Upload" on Role Dashboard
  │
  ▼
FileUploadZone → multer.memoryStorage() buffers
  │
  ▼
POST /api/hr/upload
  │
  ├── SUPABASE: supabase.storage.from('resumes').upload()
  │   path: {sessionId}/{uuid}-{originalname}
  │
  ├── PDFJS-DIST: extractResumeText(buffer, mimeType)
  │   returns: { text, tokenCount, isScanned }
  │
  └── POSTGRESQL: setResumeText(filePath, text, tokenCount)
      stored in resume_text table (optional, fire-and-forget)
  │
  ▼
Response: { files: [{ fileName, path, mimeType }] }
  │
  ▼
associateFilesWithSession(sessionId, files)
  → updates screening_sessions.uploaded_files JSONB
```

### Server-side Analysis Flow — Ranking

```
HR clicks "Run AI Analysis"
  │
  ▼
POST /api/hr/sessions/:id/analyze
  │
  ├── getSessionById(sessionId) — fetch from PostgreSQL
  │
  ├── runScreeningAnalysis(sessionId, hrUserId)
  │     │
  │     ├── For each uploaded file:
  │     │     │
  │     │     ├── STEP 1: TEXT EXTRACTION
  │     │     │   getResumeText(filePath) — cache hit?
  │     │     │     YES → use cached text, skip download
  │     │     │     NO  → supabase.storage.from('resumes').download(filePath)
  │     │     │            → extractResumeText(buffer, mimeType)
  │     │     │            → setResumeText(filePath, text) [save to cache]
  │     │     │
  │     │     ├── STEP 2: PROFILE EXTRACTION (to global pool, one-time cost)
  │     │     │   hash = SHA-256(text)
  │     │     │   findProfileByTextHash(hash) — already in pool?
  │     │     │     YES → skip extractProfile (dedup, saves ~3K tokens)
  │     │     │     NO  → extractProfile(text) via Gemini
  │     │     │            → upsertTalentProfile(profile, text, sessionId)
  │     │     │
  │     │     ├── STEP 3: PRE-FILTER (zero tokens, deterministic)
  │     │     │   preFilterResume(text, preferences)
  │     │     │     Check: min experience, mandatory skills, Tier-1, MBA
  │     │     │     FAIL → score=0, preFiltered=true, skip LLM entirely
  │     │     │     PASS → proceed to AI scoring
  │     │     │
  │     │     ├── STEP 4: CLASSIFY TRACK (runs once per batch)
  │     │     │   classifyTrack(jd) → Gemini: 'IC' | 'Manager'
  │     │     │   (gemini-2.5-flash, ~100 tokens, temperature=0)
  │     │     │
  │     │     ├── STEP 5: SCORE CANDIDATE (core ranking)
  │     │     │   scoreCandidate(resumeText, jdText, track, role, tier, prefs, industry)
  │     │     │   → Gemini: 15-field JSON schema
  │     │     │   Returns: score (0-10), competencies[], strengths/weaknesses,
  │     │     │            gaps[], keywords {present, missing}, meetsMandatoryCriteria
  │     │     │   (gemini-2.5-pro, ~8K tokens per candidate, temperature=0)
  │     │     │
  │     │     └── STEP 6: GENERATE QUESTIONS [if score >= 5.0 && gaps exist]
  │     │         generateQuestions(gaps, role, tier) → Gemini: interview questions
  │     │         (gemini-2.5-flash, ~1K tokens, temperature=0.7)
  │     │
  │     ├── STEP 7: OVERQUALIFIED CHECK (deterministic)
  │     │   checkOverqualified(experienceYears, minRequired)
  │     │   → true if expYears >= minRequired + 5
  │     │   → Amber badge shown in UI
  │     │
  │     ├── STEP 8: RANK + SPLIT
  │     │   Sort by score descending
  │     │   Split into:
  │     │     SHORTLISTED: score >= 5.0 AND meetsMandatoryCriteria !== false
  │     │     REJECTED:    score < 5.0 OR meetsMandatoryCriteria === false
  │     │
  │     └── STEP 9: SAVE
  │       updateSession(sessionId, userId, { status: 'completed', analysisResults })
  │
  ▼
Frontend polls GET /api/hr/sessions/:id every 5s until status === 'completed'
  → Renders candidate table with shortlisted + collapsible rejected section
```

### Client-side Analysis Fallback

```
POST /api/hr/sessions/:id/analyze fails (server unreachable)
  │
  ▼
handleAnalyze() catches error
  │
  ├── resumeFiles.length > 0?
  │   YES → files still in browser memory
  │   │     → Filter out image files (by MIME type + extension)
  │   │     → fileToBase64() → { data, mimeType }
  │   │     → clientAnalyze() from gemini.ts (same Gemini logic, runs in browser)
  │   │     → Save results to localStorage
  │   │     → fetchSession() → reads from localStorage → renders table
  │   │
  │   NO  → files were uploaded to server (in Supabase)
  │         → Alert: "Re-select files through dialog to run client-side analysis"
  │         → User opens dialog, selects files (without clicking Upload)
  │         → Runs analysis with files in memory
  │
  └── No server or Supabase needed — only GEMINI_API_KEY in browser
```

### Pool Scanner Flow

```
HR clicks "Source from Talent Pool" button
  │
  ▼
PoolScannerModal opens → Click "Start Scan"
  │
  ▼
POST /api/hr/sessions/:id/scan-pool
  │
  ├── Load current session → JD text, role, tier, preferences
  │
  ├── LAYER 1: THE SIEVE (zero tokens, deterministic)
  │   Get all talent_pool_profiles NOT from current session
  │   For each profile:
  │     preFilterResume(profile.resume_text, preferences)
  │     → pass/fail instantly (regex + keyword matching)
  │   Track counts: total, sieved out, passing
  │
  ├── LAYER 2: THE RANKER (Gemini scoring)
  │   For each passing profile:
  │     scoreCandidate(profile.resume_text, jdText, track, role, tier, prefs)
  │   Sort by score descending, slice to topN
  │
  └── Return: { total, sievedOut, passing, scored, matches[] }
  │
  ▼
PoolScannerModal displays results with checkboxes
  → Select candidates → "Add Selected to This Role"
  → Candidates saved to current session + table refreshes
```

---

## 3. First-Time HR User Journey

### Step 1: Landing
```
URL → https://...
  → App redirects / → /hr
  → AuthOverlay appears with 3 options:
      1. "Sign In with Google" → fails → auto-fallback to Sandbox (2s delay)
      2. "Sign In with Sandbox" → mock user, full access
      3. "Continue as Guest" → no user, basic access
  → Sidebar: New Request | Talent Pools | Compare | Analytics
```

### Step 2: Dashboard (Empty State)
```
→ "No Active Roles Open" with illustration
  → [Create New Role] → navigates to /hr/role/:id/setup
  → [View Archived Roles] → coming soon placeholder
```

### Step 3: JD & Criteria Setup (`/hr/role/:id/setup`)
```
┌─ Role Details ──────────────────────────────────────┐
│ Role Title | Department | Location | Role Type ▾   │
│ Experience Tier ▾ | Industry ▾                      │
└─────────────────────────────────────────────────────┘
┌─ Job Description ───────────────────────────────────┐
│ [Paste JD text...]                    [Extract ▾]  │
│ Gemini parses JD → auto-populates skills below      │
└─────────────────────────────────────────────────────┘
┌─ Skills (Categorized) ──────────────────────────────┐
│ Click once = ✓ Mandatory (required, pre-filter)     │
│ Click twice = ◉ Preferred (bonus, no rejection)     │
│                                                     │
│ Technical:  React ✓  TypeScript ✓  CSS ◉  …       │
│ Analytics:  Market Analysis ◉  A/B Testing …       │
│ Soft Skills:  Leadership ✓  Communication ◉ …     │
│ Tools:  JIRA ◉  Figma ◉  …                         │
│                                                     │
│ Selected chips shown below with ✓/◉ icons           │
│ [Custom skill + Enter] → added as Mandatory        │
└─────────────────────────────────────────────────────┘
┌─ Scoring Rubric (∑ = 100%) ────────────────────────┐
│ Technical Skills  ████████████░░  50%  [−][+]      │
│ Experience        ██████░░░░░░░░  20%  [−][+]      │
│ Domain Knowledge  ██░░░░░░░░░░░░  10%  [−][+]      │
│ Education         ██░░░░░░░░░░░░   5%  [−][+]      │
│ Soft Skills       ██████░░░░░░░░  15%  [−][+]      │
│                    ─────────────                     │
│                    100% ✓                            │
│ [+ Add custom scoring criterion]                    │
│ [Reset to AI recommended weights]                   │
│ AI recalculates based on role + tier + industry      │
└─────────────────────────────────────────────────────┘
┌─ Vetting Filters ───────────────────────────────────┐
│ Min Exp [5] yrs | [ ] Tier-1 Uni | [ ] MBA Required │
│ Top N [10] | Max Failed [0]                         │
│ Preferred Companies: [Google ×] [Meta ×] [+ Enter] │
└─────────────────────────────────────────────────────┘
→ [Cancel]                           [Save Criteria] →
  Saves to:
    1. PostgreSQL (if reachable)
    2. localStorage (fallback)
```

### Step 4: Role Dashboard (`/hr/role/:id` — Empty State)
```
┌─ Header ────────────────────────────────────────────┐
│ ← Active Roles / Role Name              [Delete]   │
│                                                     │
│ [Review Scoring Criteria]                            │
└─────────────────────────────────────────────────────┘
┌─ Empty State ───────────────────────────────────────┐
│ Awaiting Your First Candidates                      │
│                                                     │
│ ┌──────────────────┐  ┌────────────────────────┐   │
│ │ 📤 Upload New   │  │ 🔍 Source from Talent  │   │
│ │   Resumes       │  │   Pool                 │   │
│ │ Upload PDF/DOCX │  │ Scan previously parsed │   │
│ │ to this role    │  │ profiles against this  │   │
│ │                 │  │ JD's criteria          │   │
│ └──────────────────┘  └────────────────────────┘   │
│                                                     │
│ [Review Scoring Criteria]                            │
└─────────────────────────────────────────────────────┘
```

### Step 5: Upload Resumes
```
→ [Upload Resumes] button → opens dialog
  → FileUploadZone: drag & drop PDF/DOCX files
  → [Upload N files] → calls POST /api/hr/upload:
      • Supabase Storage: stores original PDF
      • pdfjs-dist: extracts text
      • PostgreSQL: caches extracted text
  → Files associated with session
```

### Step 6: Run AI Analysis
```
→ [Run AI Analysis] button

→ Flow A (server available + DB connected):
    1. download files from Supabase
    2. extractProfile → save to global talent pool (hash-deduped)
    3. preFilter → skip failing candidates (zero tokens)
    4. classifyTrack → IC/Manager (once per batch)
    5. scoreCandidate → weighted scoring (Gemini 2.5-pro)
    6. generateQuestions → interview questions per gap (if score >= 5.0)
    7. checkOverqualified → amber badge
    8. Sort by score → split shortlisted/rejected
    9. Save to PostgreSQL → frontend polls → renders table

→ Flow B (server unreachable / DB down):
    1. Files read from browser memory
    2. Runs Gemini directly from browser (same models)
    3. Results saved to localStorage
    4. Same ranking + split logic
    5. Renders same table interface
```

### Step 7: Results — Candidate Table
```
┌─ Stats Row ─────────────────────────────────────────┐
│ Avg Match 76% │ Technical 2/5 │ Gaps 3 │ JD Setup ▸│
└─────────────────────────────────────────────────────┘
┌─ Toolbar ────────────────────────────────────────────┐
│ [Upload Resumes] [Source from Pool] [▶ Run AI Analysis]│
└──────────────────────────────────────────────────────┘
┌─ Candidate Table ────────────────────────────────────┐
│ #  │ Candidate        │ Score │ Mnd │ Skills Matched │
│ 1  │ Alex Johnson     │  88   │ ✓   │ React(8.2)    │
│ 2  │ Maria Garcia     │  74   │ ✓   │ Figma(7.5)    │
│ 3  │ David Chen       │  62   │ ✗   │ Python(6.1)   │
│                        ───── ───── ──────────────── │
│ ▸ [2] Rejected / Low Match — click to expand        │
└─────────────────────────────────────────────────────┘
┌─ Per-row detail columns ────────────────────────────┐
│ Gaps / Missing:          Scores by Rubric:           │
│ • SQL (4.2)              Technical   80% ████████   │
│ • Kubernetes (3.0)       Experience  60% ██████    │
│                          Domain      40% ████      │
│                          Education   90% █████████ │
│                          Soft Skills 70% ███████   │
│ Actions: [👍 Accept] [👎 Reject] [👁 View]         │
└─────────────────────────────────────────────────────┘
```

### Step 8: Talent Pool (`/hr/pools`)
```
→ READ-ONLY directory of candidates from past roles
  → Analyzed candidates (from completed sessions)
  → No upload button (uploads only happen via Role Dashboard)
  → Demo candidates only in developer mode

→ Filters: location, experience range, skills search
→ Bulk select checkboxes + floating bottom action bar:
  [3 selected] → [Select target role ▾] → [+ Add to Role]
→ Three-dot menu: View Profile | Select for Pipeline | Export PDF | Delete
→ Empty state: "No Candidates in Pool" + directs to Role Dashboard
```

### Step 9: Compare (`/hr/compare`)
```
→ Select pipeline → check up to 3 candidates
→ Side-by-side matrix:
  • Candidate profile + score gauge
  • Mandatory criteria (pass/fail)
  • Key strengths + skill gaps
  • Fit summary + AI discovery questions
→ Demo profiles only in developer mode
```

---

## 4. Environment Variables

### Required (add as service-specific variables on Railway)

| Variable | Where to get it | What happens if missing |
|----------|----------------|------------------------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | AI calls fail. Already in `.env.local` |
| `DATABASE_URL` | Railway PostgreSQL → Connect tab | PostgreSQL not available. All session routes use localStorage fallback. Startup log shows `✗ missing` |
| `SUPABASE_URL` | [Supabase](https://supabase.com) → Settings → API → Project URL | File uploads/downloads fail |
| `SUPABASE_SERVICE_ROLE_KEY` | [Supabase](https://supabase.com) → Settings → API → `service_role` key | File operations fail |

**Important**: Variables must be added to the **app service** directly (not just Shared Variables). Railway auto-deploys after saving.

### Startup Logging

At startup, the server logs env var status:

```
[ENV] Startup environment check: {
  DATABASE_URL: '✓ found' or '✗ missing',
  SUPABASE_URL: '✓ found' or '✗ missing',
  ...
}
```

### Optional — Model overrides

| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_MODEL_CLASSIFIER` | `gemini-2.5-flash` | IC vs Manager classification |
| `GEMINI_MODEL_SCORER` | `gemini-2.5-pro` | Full resume × JD scoring |
| `GEMINI_MODEL_QUESTIONS` | `gemini-2.5-flash` | Gap→interview questions |
| `GEMINI_MODEL_TAILOR` | `gemini-2.5-pro` | STAR-format resume rewrite |
| `GEMINI_MODEL_EXTRACTOR` | `gemini-2.5-flash` | Resume→structured fields |
| `GEMINI_MODEL_JDSKILLEXTRACTOR` | `gemini-2.5-flash` | JD→skill arrays |

### Other

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | Express server port |
| `NODE_ENV` | — | `production` disables Vite middleware |

---

## 5. Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `App` | `src/App.tsx` | Root routing: `/hr/*` → HRLayout, `/legacy/*` → CandidateDashboard |
| `HRLayout` | `src/layouts/HRLayout.tsx` | Sidebar, auth overlay (Google/Sandbox/Guest), route shell |
| `HRDashboard` | `src/pages/hr/Dashboard.tsx` | Active roles grid, create/delete roles, fetch sessions |
| `HRPreferences` | `src/pages/hr/Preferences.tsx` | JD setup, categorized skill chips, scoring rubric with normalizing sliders, vetting filters, chip inputs for companies |
| `HRRoleDashboard` | `src/pages/hr/RoleDashboard.tsx` | Role detail: upload dialog, run analysis (server + client fallback), detailed candidate table with shortlisted/rejected split, stats row, rubric scores, PoolScannerModal |
| `HRTalentPools` | `src/pages/hr/TalentPools.tsx` | Read-only aggregated candidates across all sessions, filters, bulk "Add to Role" |
| `HRCompare` | `src/pages/hr/Compare.tsx` | Side-by-side candidate comparison (up to 3), mandatory checks, strengths/weaknesses, fit summary, AI questions |
| `TalentPoolList` | `src/components/hr/TalentPoolList.tsx` | Filters (location, experience, skills), bulk select, bottom action bar for "Add to Role", three-dot menu |
| `PoolScannerModal` | `src/components/hr/PoolScannerModal.tsx` | Progress modal for scanning global pool: sieve stage → scoring stage → match selection → add to role |
| `DevBugReporter` | `src/components/DevBugReporter.tsx` | Bug reporting form with screenshot, diagnostics. Toggle with `Alt+Shift+D` or 5 logo clicks |
| `AuthOverlay` | `src/components/AuthOverlay.tsx` | Login screen: Google Sign-In (auto-fallback to Sandbox), Sandbox, Guest |
| `FileUploadZone` | `src/components/FileUploadZone.tsx` | Drag-drop zone, PDF/DOCX only, image files rejected by MIME + extension |
| `LegacyCandidateApp` | `src/App.tsx:556` | Original candidate-side dashboard (legacy path, uses client-side Gemini) |

---

## 6. API Endpoints

| Method | Path | Purpose | Needs DB | Needs Supabase |
|--------|------|---------|----------|---------------|
| `POST` | `/api/hr/sessions` | Create a new role/session | ✅ | ❌ |
| `GET` | `/api/hr/sessions` | List all sessions for current user | ✅ | ❌ |
| `GET` | `/api/hr/sessions/:id` | Get session details + candidates | ✅ | ❌ |
| `PUT` | `/api/hr/sessions/:id/preferences` | Update JD, weights, filters | ✅ | ❌ |
| `PUT` | `/api/hr/sessions/:id/resumes` | Associate uploaded files with session | ✅ | ❌ |
| `POST` | `/api/hr/sessions/:id/analyze` | Trigger AI analysis (async) | ✅ | ❌ |
| `POST` | `/api/hr/sessions/:id/scan-pool` | Two-layer pool scan (preFilter + Gemini) | ✅ | ❌ |
| `POST` | `/api/hr/sessions/:id/candidates/:cid/questions` | Generate discovery questions | ✅ | ❌ |
| `DELETE` | `/api/hr/sessions/:id` | Delete session | ✅ | ❌ |
| `POST` | `/api/hr/upload` | Upload resume files to Supabase Storage | ❌ | ✅ |
| `POST` | `/api/hr/upload/gdrive/import` | Import from Google Drive via file ID | ❌ | ✅ |
| `POST` | `/api/hr/bugs` | Submit bug report (PostgreSQL + local JSON) | ✅ | ❌ |
| `GET` | `/api/hr/bugs` | List all bug reports | ✅ | ❌ |
| `POST` | `/api/hr/sessions/extract-skills` | Parse JD → mandatory + preferred skills (Gemini) | ❌ | ❌ |
| `GET` | `/api/health` | Server health + env var diagnostics | ❌ | ❌ |

**Previous DB Middleware**: The DB health check middleware was removed. Instead of blocking routes with 503, the client-side code now handles DB failures via localStorage fallbacks. The `/api/hr/sessions/extract-skills` route is registered before all others and works without any backend.

---

## 7. AI Pipeline — Model Routing & Tokens

| Step | Model (default) | Tokens (in/out) | Temperature | Purpose |
|------|----------------|-----------------|-------------|---------|
| `classifyTrack` | `gemini-2.5-flash` | ~500 / ~10 | 0.0 | Binary IC/Manager |
| `scoreCandidate` | `gemini-2.5-pro` | ~8K / ~2K | 0.0 | 15-field scoring JSON |
| `generateQuestions` | `gemini-2.5-flash` | ~1K / ~500 | 0.7 | Interview questions |
| `tailorResume` | `gemini-2.5-pro` | ~15K / ~4K | 0.7 | STAR rewrite |
| `extractProfile` | `gemini-2.5-flash` | ~3K / ~1K | 0.0 | Structured fields (one-time cost) |
| `extractSkillsFromJD` | `gemini-2.5-flash` | ~1K / ~200 | 0.0 | JD→skills |

### Override per step

```env
GEMINI_MODEL_SCORER=gemini-2.0-flash-lite  # cheaper, faster
GEMINI_MODEL_TAILOR=gemini-2.5-flash        # down from pro
```

---

## 8. Scoring Rubric Dimensions

### Base weights per role (from `ROLE_WEIGHTS`)

| Dimension | Frontend Dev | PM | Data Scientist | AI/ML Engineer |
|-----------|-------------|----|---------------|----------------|
| **Technical** | 50% | 15% | 40% | 55% |
| **Experience** | 20% | 25% | 15% | 15% |
| **Domain** | 5% | 20% | 25% | 10% |
| **Education** | 5% | 10% | 10% | 10% |
| **Soft Skills** | 20% | 30% | 10% | 10% |

Full role weight reference: `src/constants/roles.ts` — all 19 roles with 10-14 categorized skills each.

### Tier shifts (from `TIER_CONFIG`)

| Tier | Effect on weights |
|------|------------------|
| **Junior** | technical ×1.2, education ×1.5, experience ×0.5 |
| **Mid-Level** | technical ×1.1, experience ×1.1 |
| **Senior** | experience ×1.3, domain ×1.2, education ×0.7 |
| **Lead** | softSkills ×1.3, domain ×1.2, education ×0.5 |
| **Director** | softSkills ×1.4, experience ×1.4, technical ×0.5 |
| **Executive** | softSkills ×1.5, domain ×1.5, technical ×0.3 |

### Industry shifts (from `INDUSTRY_SHIFTS`)

| Industry | Effect | Bonus skills |
|----------|--------|-------------|
| **FinTech** | domain ×1.3 | Regulatory Compliance, Financial Modeling, KYC/AML |
| **Healthcare** | domain ×1.2, education ×1.2 | HIPAA, Clinical Workflows, FHIR/HL7 |
| **E-Commerce** | domain ×1.2, softSkills ×1.1 | Conversion Optimization, Retention Metrics, Marketplace |
| **Technology / SaaS** | technical ×1.1 | SaaS Metrics, CI/CD, Cloud Platforms |
| **EdTech** | education ×1.2, softSkills ×1.2 | Pedagogy, LMS Platforms, Gamification |
| **Enterprise** | domain ×1.2, experience ×1.1 | Stakeholder Management, Enterprise Architecture |
| **Consulting** | softSkills ×1.3, education ×1.1 | Client Management, Strategic Frameworks |
| **Other** | — | — |

### Normalized calculation

```
final_weight = base_weight × tier_multiplier × industry_multiplier
then normalized to sum to 100%
```

---

## 9. Common Issues & Troubleshooting

### All env vars show as missing on `/api/health`

**Cause**: Railway service variables not injected into the running process. Shared variables may not propagate.

**Fix**: Go to Railway → your app service → **Variables** tab → add all 4 vars as **service-specific** variables. Trigger a manual redeploy.

### `dbError: "Invalid URL"`

**Cause**: DATABASE_URL value is malformed — not a valid PostgreSQL connection string.

**Fix**: Copy the DATABASE_URL from Railway PostgreSQL service → **Connect** tab. Ensure it starts with `postgresql://` and has no trailing spaces or unescaped characters.

### Analysis shows stale "database unavailable" error

**Cause**: Server-side pipeline failed (DB not connected). Client-side fallback requires files in browser memory.

**Fix**: 
1. Open the upload dialog
2. Select your PDF/DOCX files (don't need to click Upload)
3. Click "Run AI Analysis" — files in memory will be used
4. Or configure DATABASE_URL on Railway (permanent fix)

### Overqualified badge not showing

**Cause**: `checkOverqualified()` needs both `experienceYears` (from candidate) and `minExperienceYears` (from preferences).

**Fix**: Set `minExperienceYears` in the JD setup page. Candidate must have `experienceYears` parsed from resume >= `minRequired + 5`.

### Scoring rubric not updating when role changes

**Cause**: Saved scoring weights from a previous session override AI recommendations.

**Fix**: Click **"Reset to AI recommended weights"** in the Scoring Rubric section. Recalculates based on (role, tier, industry).

### Pool scanner returns no matches

**Cause**: No talent_pool_profiles exist yet. Profiles are only created during analysis runs.

**Fix**: Run analysis on at least one batch of resumes first. Profiles are extracted and saved to the global pool during each analysis run.

### Supabase bucket not found

**Cause**: The `resumes` storage bucket doesn't exist in your Supabase project.

**Fix**: Go to Supabase → Storage → Create bucket → name: `resumes` → set to **Public**.

---

## 10. Key Files

### Server

| File | Purpose |
|------|---------|
| `server.ts` | Express server, middleware, Vite integration, env diagnostics, health endpoint |
| `src/server/db.ts` | PostgreSQL pool, Supabase client, all CRUD, talent_pool_profiles helpers |
| `src/server/middleware/auth.ts` | Firebase token verification, UAT bypass |
| `src/server/routes/sessions.ts` | Session CRUD + analyze + scan-pool + questions endpoints |
| `src/server/routes/upload.ts` | File upload + Google Drive import + text extraction |
| `src/server/routes/bugs.ts` | Bug report CRUD (PostgreSQL + local JSON fallback) |
| `src/server/services/ai/config.ts` | Gemini client init, shared prompts, JSON parsing |
| `src/server/services/ai/pipeline.ts` | Analysis orchestration, profile extraction, pre-filter, overqualified check |
| `src/server/services/ai/poolScanner.ts` | Two-layer pool scanner (deterministic sieve + Gemini ranker) |
| `src/server/services/ai/modelConfig.ts` | Per-step model routing with env var overrides |
| `src/server/services/ai/scorer.ts` | Full resume × JD scoring via Gemini |
| `src/server/services/ai/classifier.ts` | IC vs Manager track classification |
| `src/server/services/ai/questions.ts` | Discovery question generation |
| `src/server/services/ai/tailor.ts` | STAR-format resume rewrite |
| `src/server/services/ai/extractor.ts` | Structured profile extraction (saved to global pool) |
| `src/server/services/ai/jdSkillExtractor.ts` | JD→skill arrays extraction |
| `src/server/services/extract.ts` | PDF text extraction via pdfjs-dist |
| `src/server/services/preFilter.ts` | Dynamic mandatory criteria rules engine |

### Client

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root router + LegacyCandidateApp (old candidate flow) |
| `src/layouts/HRLayout.tsx` | HR shell — sidebar, auth overlay, routes |
| `src/pages/hr/Dashboard.tsx` | Active roles grid with create/delete |
| `src/pages/hr/Preferences.tsx` | JD setup — categorized skills, scoring rubric, vetting filters |
| `src/pages/hr/RoleDashboard.tsx` | Role detail — upload, analyze (server + client fallback), candidate table, PoolScannerModal |
| `src/pages/hr/TalentPools.tsx` | Read-only aggregated candidates across sessions |
| `src/pages/hr/Compare.tsx` | Side-by-side candidate comparison |
| `src/components/hr/PoolScannerModal.tsx` | Pool scan progress + match selection modal |
| `src/components/hr/TalentPoolList.tsx` | Filters, bulk select, bottom action bar |
| `src/lib/api.ts` | All API calls with localStorage fallbacks + 15s fetch timeout |
| `src/services/gemini.ts` | Client-side Gemini service (used by CandidateDashboard + client fallback) |
| `src/constants/roles.ts` | Role weights, tier config, industry shifts, skill repositories |
| `src/types.ts` | All shared TypeScript types |

### Config / Setup

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite config — defines GEMINI_API_KEY for browser, Tailwind, React |
| `server.ts` | Express startup, Vite middleware (dev) or static serving (prod) |
| `package.json` | Scripts: `dev` (tsx server.ts), `start` (production), `build` (vite), `test` |
| `jest.config.js` | Test config with ESM support + MOCK_AI gemini mock |
| `.env.example` | All required env vars documented |
| `WORKFLOW.md` | This file |
