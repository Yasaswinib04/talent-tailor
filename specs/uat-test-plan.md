# UAT Test Plan: Talent Tailor HR Screening

**System Under Test:** HR Talent Engine Pipeline
**Base URL:** `http://localhost:3001`

## Test Cases

### TC-01: Session Creation & Preferences Happy Path
- **User Flow:** HR User initiates a new session and configures job profile.
- **Preconditions:** Server is running locally.
- **Steps:**
  1. Navigate to `/hr`.
  2. Click "Start New Session".
  3. Enter Job Profile: "Senior Full Stack Engineer".
  4. Save preferences.
- **Expected Result:** Session ID is created in the database, UI navigates to the upload step.
- **Acceptance Criteria:** `status` transitions to `draft` in PostgreSQL.

### TC-02: AI Pipeline Execution
- **User Flow:** HR User uploads PDF resumes and clicks "Analyze".
- **Preconditions:** TC-01 completed successfully.
- **Steps:**
  1. Upload `test_resume_1.pdf` and `test_resume_2.pdf`.
  2. Click "Analyze Resumes".
- **Expected Result:** System uploads files to Supabase Storage, then triggers the 5-stage AI pipeline. Progress bar is shown.
- **Acceptance Criteria:** Pipeline successfully queues 2 candidates. `pipeline_logs` table reflects `TrackClassifier`, `CoreScorer`, and `GapInterrogator` events.

### TC-03: Dashboard Review
- **User Flow:** HR User reviews the final candidate dashboard.
- **Preconditions:** TC-02 completed successfully.
- **Steps:**
  1. Wait for Analysis to reach 100%.
  2. View the Candidate Scorecards.
- **Expected Result:** Candidates are sorted by descending score. Strengths, Weaknesses, and Discovery Questions are visible.
- **Acceptance Criteria:** Data perfectly matches the `analysis_results` JSONB payload.

### TC-04: Error Handling (Missing DB Credentials)
- **User Flow:** System boots without Supabase credentials.
- **Preconditions:** `.env` file does not contain `DATABASE_URL`.
- **Steps:**
  1. Attempt to create a session or upload a file.
- **Expected Result:** System gracefully catches the `ECONNREFUSED` error and alerts the user rather than silently freezing.
- **Acceptance Criteria:** Error toast is shown in the UI.
