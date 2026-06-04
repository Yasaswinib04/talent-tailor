# TalentMatch AI — Workflow & Architecture

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Browser (React SPA)                             │
│  HRLayout │ HRDashboard │ HRPreferences │ HRRoleDashboard │ TalentPools    │
│  Compare │ AddTalentModal │ CandidateDashboard │ DevBugReporter             │
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
│  │ • DB health check → 503 if PostgreSQL not connected               │      │
│  │ • Global error handler                                             │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌─ API Routes ──────────────────────────────────────────────────────┐      │
│  │ /api/hr/sessions/*     → sessions.ts (CRUD + analyze + questions)  │      │
│  │ /api/hr/upload/*       → upload.ts (Supabase + text extraction)   │      │
│  │ /api/hr/bugs/*         → bugs.ts (PostgreSQL + local JSON backup) │      │
│  │ /api/hr/sessions/extract-skills → Gemini JD→skills parser         │      │
│  │ /api/health            → DB status check                          │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌─ AI Services ─────────────────────────────────────────────────────┐      │
│  │ classifier.ts → classifyTrack (IC vs Manager)                     │      │
│  │ scorer.ts    → scoreCandidate (full scoring + competencies)       │      │
│  │ questions.ts → generateQuestions (gap→interview Qs)              │      │
│  │ tailor.ts   → tailorResume (STAR format rewrite)                 │      │
│  │ extractor.ts → extractProfile (resume→structured fields)         │      │
│  │ jdSkillExtractor.ts → extractSkillsFromJD (JD→mandatory+pref)    │      │
│  │ pipeline.ts → orchestration + pre-filter + overqualified check    │      │
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
| **PostgreSQL** (via Railway) | Sessions, job profiles, analysis results, pipeline logs, resume text cache, bug reports | Server-side CRUD via `getSql()` |
| **Supabase Storage** | Raw PDF/DOCX resume files stored in `resumes` bucket | Upload: `supabase.storage.from('resumes').upload()`. Download: `supabase.storage.from('resumes').download()` |
| **localStorage** (browser) | Fallback when server/DB is unreachable. Stores sessions, analysis results, bugs | Client-side `getLocalSessions()`, `saveLocalSessions()` |

### Offline / Fallback Behavior

When the Express server returns 503 (DB not connected) or is unreachable:

1. `createSession()` → creates session in localStorage (`local-session-xxx`)
2. `uploadFiles()` → returns simulated metadata
3. `associateFilesWithSession()` → saves uploaded file metadata to localStorage
4. `startAnalysis()` → returns error status
5. **Client-side fallback**: `handleAnalyze()` in RoleDashboard catches the error and runs Gemini directly from the browser using files still in memory
6. Results saved to localStorage and displayed in the candidate table
7. No PostgreSQL or Supabase needed for this fallback path — only needs `GEMINI_API_KEY`

---

## 2. Data Flow Diagrams

### Upload Flow

```
HR clicks "Upload"
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

### Server-side Analysis Flow

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
  │     │     ├── getResumeText(filePath) — cache hit?
  │     │     │   YES → use cached text, skip download
  │     │     │   NO  → supabase.storage.from('resumes').download(filePath)
  │     │     │          → extractResumeText(buffer, mimeType)
  │     │     │          → setResumeText(filePath, text) [save to cache]
  │     │     │
  │     │     ├── preFilterResume(text, preferences)
  │     │     │   Check mandatory skills, min experience, Tier-1, MBA
  │     │     │   FAIL → skip LLM, score=0, preFiltered=true
  │     │     │   PASS → proceed to AI scoring
  │     │     │
  │     │     ├── classifyTrack(jd) → Gemini: 'IC' | 'Manager'
  │     │     │   (gemini-2.5-flash, ~100 tokens, temperature=0)
  │     │     │
  │     │     ├── scoreCandidate(resumeText, jdText, track, role, tier, prefs, industry)
  │     │     │   → Gemini: 15-field JSON schema with weighted scoring
  │     │     │   (gemini-2.5-pro, ~8K tokens, temperature=0)
  │     │     │
  │     │     └── generateQuestions(gaps, role, tier) [if score >= 5.0 && gaps exist]
  │     │         → Gemini: array of interview questions
  │     │         (gemini-2.5-flash, ~1K tokens, temperature=0.7)
  │     │
  │     ├── checkOverqualified(experienceYears, minRequired)
  │     │   → true if expYears >= minRequired + 5
  │     │
  │     ├── Sort by score descending
  │     │
  │     └── updateSession(sessionId, userId, { status: 'completed', analysisResults })
  │
  ▼
Frontend polls GET /api/hr/sessions/:id every 5s until status === 'completed'
  → Renders candidate table
```

### Client-side Analysis Fallback

```
POST /api/hr/sessions/:id/analyze fails (server unreachable)
  │
  ▼
handleAnalyze() catches error
  │
  ├── resumeFiles.length > 0?
  │   YES → files still in browser memory (upload failed)
  │   │     → Filter out image files (by MIME type + extension)
  │   │     → fileToBase64() → { data, mimeType }
  │   │     → clientAnalyze(inputs, jdText, role, tier, ...)
  │   │       (uses legacy gemini.ts which calls Gemini directly from browser)
  │   │     → Save results to localStorage
  │   │     → fetchSession() → reads from localStorage → renders table
  │   │
  │   NO  → prompt user to re-upload files through dialog
  │
  └── Company logo to hide Gemini API key movement
```

### Talent Pool Flow

```
HRDashboard → candidates across ALL sessions aggregated
  │
  ├── getSessions() → fetch all sessions
  ├── extractCandidatesFromSessions(sessions)
  │   → For each session with analyzed candidates:
  │     → PoolCandidate { name, role, skills, source, status, score, sessionId }
  │   → For unanalyzed sessions with uploaded files:
  │     → "Pending Analysis" entries (yellow badge)
  │
  ├── Bulk select checkboxes + floating bottom action bar
  │   → "Add to [Role]" dropdown → navigate to role dashboard
  │
  └── Three-dot menu per candidate:
      → View Profile, Select for Pipeline, Export PDF, Delete
```

---

## 3. First-Time HR User Journey

### Step 1: Landing
```
URL → https://...
  → App redirects / → /hr
  → AuthOverlay appears with 3 options:
      1. "Sign In with Google" → fails (Firebase not configured)
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
┌─ Skills ────────────────────────────────────────────┐
│ Click once = ✓ Mandatory (required, pre-filter)     │
│ Click twice = ◉ Preferred (bonus, no rejection)     │
│                                                     │
│ Technical:  React ✓  TypeScript ✓  CSS ◉  …       │
│ Analytics:  Market Analysis ◉  A/B Testing …       │
│ Soft Skills:  Leadership ✓  Communication ◉ …     │
│ Tools:  JIRA ◉  Figma ◉  …                         │
│                                                     │
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
│ [+ Add custom scoring criterion]                     │
│ [Reset to AI recommended weights]                    │
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
│ Role details...                                     │
│ [Share Job Link] [Invite from Talent Pool]          │
│                                                     │
│ [Review Scoring Criteria]                            │
└─────────────────────────────────────────────────────┘
┌─ Empty State ───────────────────────────────────────┐
│ Awaiting Your First Candidates                      │
│ [Share Job Link] [Invite from Talent Pool]         │
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
  → Flow A (server available):
      • Server downloads files from Supabase
      • Pre-filter → skip candidates failing mandatory criteria
      • classifyTrack → IC/Manager
      • scoreCandidate → full scoring per candidate
      • generateQuestions → interview questions per gap
      • checkOverqualified → amber badge if 5+ yrs over required
      • Results saved to PostgreSQL
      • Frontend polls → renders table
  → Flow B (server unreachable):
      • Runs Gemini directly from browser
      • Uses files still in memory from upload step
      • Results saved to localStorage
      • Renders same table interface
```

### Step 7: Results — Candidate Table
```
┌─ Stats ─────────────────────────────────────────────┐
│ Avg Match 76% │ Technical 2/5 │ Gaps 3 │ JD Setup ▸│
└─────────────────────────────────────────────────────┘
┌─ Table ─────────────────────────────────────────────┐
│ #  │ Candidate    │ Score │ Mnd │ Skills Matched   │
│ 1  │ Alex J       │  88%  │ ✓   │ React (8.2) ... │
│ 2  │ Maria G      │  74%  │ ✓   │ Figma (7.5) ... │
│ 3  │ David C      │  62%  │ ✗   │ Python (6.1) .. │
│                      ───── ───── ────────────────── │
│ ▸ [2] Rejected / Low Match — click to expand       │
└─────────────────────────────────────────────────────┘
┌─ Per-row detail ────────────────────────────────────┐
│ Gaps:                      Scores by Rubric:        │
│ • SQL (4.2)                Technical   80% ████████ │
│ • Kubernetes (3.0)         Experience  60% ██████  │
│                             Domain      40% ████   │
│                             Education   90% ███████  │
│                             Soft Skills 70% ███████ │
│                                                     │
│ Actions: [👍 Accept] [👎 Reject] [👁 View]        │
└─────────────────────────────────────────────────────┘
```

### Step 8: Talent Pool (`/hr/pools`)
```
→ Aggregated candidates across ALL sessions
  → Analyzed candidates (from completed sessions)
  → Pending candidates (uploaded but not yet analyzed)
  → Demo candidates (only in developer mode)

→ Filters: location, experience range, skills search
→ Bulk select checkboxes + floating bottom action bar:
  [3 selected] → [Select target role ▾] → [+ Add to Role]
→ Three-dot menu: View Profile | Select for Pipeline | Export PDF | Delete
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

### Required

| Variable | Required | Source | Used by |
|----------|----------|--------|---------|
| `GEMINI_API_KEY` | ✅ Always | [Google AI Studio](https://aistudio.google.com/apikey) | All AI services (both server and client) |
| `DATABASE_URL` | ✅ Server | Railway PostgreSQL service → Connect tab | PostgreSQL connection via `postgres` library |
| `SUPABASE_URL` | ✅ Server | [Supabase](https://supabase.com) → Settings → API → Project URL | `supabase.storage.from('resumes')` — file upload/download |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Server | [Supabase](https://supabase.com) → Settings → API → service_role key | Supabase admin operations |

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
| `HRLayout` | `src/layouts/HRLayout.tsx` | Sidebar, auth overlay, route shell for all HR pages |
| `HRDashboard` | `src/pages/hr/Dashboard.tsx` | Active roles grid, create/delete roles |
| `HRPreferences` | `src/pages/hr/Preferences.tsx` | JD setup, skills picker (categorized), scoring rubric with sliders, vetting filters, chip inputs |
| `HRRoleDashboard` | `src/pages/hr/RoleDashboard.tsx` | Role detail: upload dialog, run analysis (server + client fallback), detailed candidate table with accept/reject, stats, and collapsible rejected section |
| `HRTalentPools` | `src/pages/hr/TalentPools.tsx` | Aggregated candidates across all sessions with filtering |
| `HRCompare` | `src/pages/hr/Compare.tsx` | Side-by-side candidate comparison (up to 3) |
| `AddTalentModal` | `src/components/hr/AddTalentModal.tsx` | File upload with JD/session selector + Google Drive import |
| `TalentPoolList` | `src/components/hr/TalentPoolList.tsx` | Bulk select + filters + floating bottom action bar for "Add to Role" |
| `DevBugReporter` | `src/components/DevBugReporter.tsx` | Bug reporting form with screenshot, diagnostics. Toggle with `Alt+Shift+D` or 5 logo clicks |
| `AuthOverlay` | `src/components/AuthOverlay.tsx` | Login screen with Google/Sandbox/Guest options |
| `FileUploadZone` | `src/components/FileUploadZone.tsx` | Drag-drop zone, PDF/DOCX only, image files rejected |
| `LegacyCandidateApp` | `src/App.tsx:556` | Original candidate-side dashboard (legacy path) |

---

## 6. API Endpoints

| Method | Path | Purpose | Needs DB | Needs Supabase |
|--------|------|---------|----------|---------------|
| `POST` | `/api/hr/sessions` | Create a new role/session | ✅ | ❌ |
| `GET` | `/api/hr/sessions` | List all sessions for current user | ✅ | ❌ |
| `GET` | `/api/hr/sessions/:id` | Get session details + candidates | ✅ | ❌ |
| `PUT` | `/api/hr/sessions/:id/preferences` | Update JD, weights, filters | ✅ | ❌ |
| `PUT` | `/api/hr/sessions/:id/resumes` | Associate uploaded files with session | ✅ | ❌ |
| `POST` | `/api/hr/sessions/:id/analyze` | Trigger AI analysis pipeline (async) | ✅ | ❌ (uses cache first) |
| `POST` | `/api/hr/sessions/:id/candidates/:cid/questions` | Generate discovery questions for a candidate | ✅ | ❌ |
| `DELETE` | `/api/hr/sessions/:id` | Delete session | ✅ | ❌ |
| `POST` | `/api/hr/upload` | Upload resume files | ❌ | ✅ |
| `POST` | `/api/hr/upload/gdrive/import` | Import resume from Google Drive via file ID | ❌ | ✅ |
| `POST` | `/api/hr/bugs` | Submit a bug report | ✅ | ❌ |
| `GET` | `/api/hr/bugs` | List all bug reports | ✅ | ❌ |
| `POST` | `/api/hr/sessions/extract-skills` | Parse JD text → mandatory + preferred skills | ❌ | ❌ (Gemini only) |
| `GET` | `/api/health` | Server health: { dbConnected, status, timestamp } | ❌ | ❌ |

### DB Health Middleware

All `/api/hr/sessions` and `/api/hr/bugs` routes are gated by `isDbConnected` in `server.ts:38`. If PostgreSQL is not connected, these return:

```json
{
  "status": 503,
  "error": "Database connection failed. Please check that DATABASE_URL is configured correctly in your environment variables."
}
```

The `/api/hr/upload` routes are NOT gated (they use Supabase Storage, not PostgreSQL).

The `/api/hr/sessions/extract-skills` route is registered **before** the middleware and works without PostgreSQL.

---

## 7. AI Pipeline — Model Routing & Tokens

| Step | Model (default) | Input tokens | Output tokens | Temperature | Purpose |
|------|----------------|-------------|---------------|-------------|---------|
| `classifyTrack` | `gemini-2.5-flash` | ~500 | ~10 | 0.0 | Binary IC/Manager |
| `scoreCandidate` | `gemini-2.5-pro` | ~8K | ~2K | 0.0 | 15-field scoring JSON |
| `generateQuestions` | `gemini-2.5-flash` | ~1K | ~500 | 0.7 | Interview questions |
| `tailorResume` | `gemini-2.5-pro` | ~15K | ~4K | 0.7 | STAR rewrite |
| `extractProfile` | `gemini-2.5-flash` | ~3K | ~1K | 0.0 | Structured fields |
| `extractSkillsFromJD` | `gemini-2.5-flash` | ~1K | ~200 | 0.0 | JD→skills |

### Override per step

Set any of these environment variables to change the model without code changes:

```env
GEMINI_MODEL_SCORER=gemini-2.0-flash-lite  # cheaper, faster
GEMINI_MODEL_TAILOR=gemini-2.5-flash        # down from pro
```

---

## 8. Scoring Rubric Dimensions

### Base weights per role (from `ROLE_WEIGHTS`)

| Dimension | Developer | PM | Designer | Data Scientist | AI/ML Engineer |
|-----------|-----------|----|----------|---------------|----------------|
| **Technical** | 50% | 15% | 35% | 40% | 55% |
| **Experience** | 20% | 25% | 20% | 15% | 15% |
| **Domain** | 5% | 20% | 20% | 25% | 10% |
| **Education** | 5% | 10% | 5% | 10% | 10% |
| **Soft Skills** | 20% | 30% | 20% | 10% | 10% |

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
| **E-Commerce** | domain ×1.2, softSkills ×1.1 | Conversion Optimization, Retention Metrics, Marketplace Dynamics |
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

### 503: Database connection failed

**Cause**: `DATABASE_URL` not set or PostgreSQL unreachable.

**Fix**: Add `DATABASE_URL` to Railway Variables. It auto-resets `isDbConnected = false` and blocks all session routes. Check `GET /api/health` — should return `"dbConnected": true`.

### Cannot read "image.png" (this model does not support image input)

**Cause**: Image file uploaded as a resume (PNG, JPG, GIF). Gemini's text models don't accept image input.

**Fix**: 
- FileUploadZone now rejects images by MIME type + filename extension
- Client-side fallback filters images before passing to Gemini
- Only upload PDF or DOCX files as resumes

### Marcus Chen / Sophia Rodriguez showing in results

**Cause**: Stale mock data in localStorage from previous `startAnalysis` fallback.

**Fix**: `getLocalSessions()` auto-clears sessions containing profiles named "Marcus Chen" or "Sophia Rodriguez" on page load. If still visible, clear `localStorage` manually: `localStorage.clear()` → refresh.

### Session created but analysis never completes

**Cause**: Server-side pipeline crashed or timed out. This happens when `DATABASE_URL` is set but `SUPABASE_URL/SERVICE_ROLE_KEY` is wrong, causing the pipeline to fail silently.

**Fix**: Check server logs for `Supabase Storage download error`. Verify all 4 env vars are correct and the `resumes` bucket exists in Supabase Storage (set to public).

### "Cannot analyze image files" alert on Run Analysis

**Cause**: Files uploaded through the dialog are images (PNG/JPG), or the browser didn't report a MIME type and the filename doesn't end in .pdf/.docx.

**Fix**: Upload actual PDF or DOCX resume files. If the alert incorrectly identifies a PDF as an image, check the file's actual MIME type and extension.

### Overqualified badge not showing

**Cause**: The `checkOverqualified()` function requires both `experienceYears` (from the candidate) and `minExperienceYears` (from preferences). Missing either defaults to `false`.

**Fix**: Set `minExperienceYears` in the JD setup page. The candidate must have `experienceYears` parsed from their resume (returns a number) and it must be >= `minExperienceYears + 5`.

### Scoring rubric not updating when role changes

**Cause**: Saved scoring weights from a previous session override the AI recommendation.

**Fix**: Click **"Reset to AI recommended weights"** button in the Scoring Rubric section. This recalculates based on (role, tier, industry).

---

## 10. Key Files

### Server

| File | Purpose |
|------|---------|
| `server.ts` | Express server setup, middleware, Vite integration, health endpoint |
| `src/server/db.ts` | PostgreSQL pool + Supabase client init, all CRUD operations |
| `src/server/middleware/auth.ts` | Firebase token verification, UAT bypass |
| `src/server/routes/sessions.ts` | Session CRUD + analyze + questions endpoints |
| `src/server/routes/upload.ts` | File upload + Google Drive import + text extraction |
| `src/server/routes/bugs.ts` | Bug report CRUD (PostgreSQL + local JSON file) |
| `src/server/services/ai/config.ts` | Gemini client init, shared prompts, JSON parsing |
| `src/server/services/ai/pipeline.ts` | Analysis orchestration, pre-filter, overqualified check |
| `src/server/services/ai/modelConfig.ts` | Per-step model routing with env var overrides |
| `src/server/services/ai/scorer.ts` | Full resume × JD scoring via Gemini |
| `src/server/services/ai/classifier.ts` | IC vs Manager track classification |
| `src/server/services/ai/questions.ts` | Discovery question generation |
| `src/server/services/ai/tailor.ts` | STAR-format resume rewrite |
| `src/server/services/ai/extractor.ts` | Structured profile extraction |
| `src/server/services/ai/jdSkillExtractor.ts` | JD→skill arrays extraction |
| `src/server/services/extract.ts` | PDF text extraction via pdfjs-dist |
| `src/server/services/preFilter.ts` | Dynamic mandatory criteria rules engine |

### Client

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root router + LegacyCandidateApp (old candidate flow) |
| `src/layouts/HRLayout.tsx` | HR shell — sidebar, auth overlay, routes |
| `src/pages/hr/Dashboard.tsx` | Active roles grid with create/delete |
| `src/pages/hr/Preferences.tsx` | JD setup — skills, rubric, filters |
| `src/pages/hr/RoleDashboard.tsx` | Role detail — upload, analyze, candidate table |
| `src/pages/hr/TalentPools.tsx` | Aggregated candidates across sessions |
| `src/pages/hr/Compare.tsx` | Side-by-side candidate comparison |
| `src/lib/api.ts` | All API calls with localStorage fallbacks + fetch timeout |
| `src/services/gemini.ts` | Client-side Gemini service (legacy candidate path) |
| `src/constants/roles.ts` | Role weights, tier config, industry shifts |
| `src/types.ts` | All shared TypeScript types |

### Config / Setup

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite config — defines GEMINI_API_KEY for browser, Tailwind, React |
| `server.ts` | Express startup, Vite middleware (dev) or static serving (prod) |
| `package.json` | Scripts: `dev` (tsx server.ts), `start` (production), `build` (vite), `test` |
| `jest.config.js` | Test config with ESM support + MOCK_AI gemini mock |
| `.env.example` | All required env vars documented |
| `firebase-applet-config.json` | Firebase project config for auth |
