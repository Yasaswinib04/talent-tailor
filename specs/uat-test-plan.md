# UAT Test Plan: Talent Tailor HR Modules (Obsidian Edition)

**System Under Test:** Talent Tailor HR Dashboard & Pipelines
**Base URL:** `https://talent-tailor-production.up.railway.app`
**Verification Mode:** Automated E2E via Puppeteer with Network Mocking

This test plan defines the end-to-end User Acceptance Testing (UAT) verification for the updated HR user flows, layout adjustments, and premium Obsidian-themed empty states.

---

## Test Cases

### TC-00: Sandbox Authentication
- **Description:** Verify that the user can sign in using the "Sign In with Sandbox" button when google sign-in fails or as a bypass.
- **Preconditions:** Clean browser state (no local storage `uat_bypass_user` set).
- **Steps:**
  1. Navigate to `/hr`.
  2. Verify that the AuthOverlay is displayed with "Sign In with Sandbox" button.
  3. Click "Sign In with Sandbox".
- **Expected Result:**
  - Displays the login screen with choices.
  - Clicking Sandbox button logs the user in successfully and removes the AuthOverlay.
- **Acceptance Criteria:** AuthOverlay disappears and redirects to the dashboard.
- **Screenshot:** [00_login_overlay.png](file:///Users/sundaridevulapalli/Downloads/talent-engine-pro/specs/screenshots/00_login_overlay.png)

### TC-01: Dashboard Empty State ("No Active Roles Open")
- **Description:** Verify the dashboard when there are no active roles open in the pipeline.
- **Preconditions:** TC-00 completed (User is logged in via Sandbox mode).
- **Steps:**
  1. Confirm the page loads and matches the dark Obsidian styling theme.
- **Expected Result:**
  - Displays centered "No Active Roles Open" illustration with floating animated profile and funnel cards.
  - Buttons: "+ Create New Role" (violet) and "View Archived Roles" are rendered.
- **Acceptance Criteria:** Main heading is visible: "No Active Roles Open".
- **Screenshot:** [01_no_active_roles_dashboard.png](file:///Users/sundaridevulapalli/Downloads/talent-engine-pro/specs/screenshots/01_no_active_roles_dashboard.png)

### TC-02: Role JD & Criteria Setup
- **Description:** Verify the criteria setup page and interaction for a new role.
- **Preconditions:** TC-01 completed.
- **Steps:**
  1. Click "+ Create New Role" on the dashboard.
- **Expected Result:**
  - Navigates to `/hr/role/<sessionId>/setup`.
  - Heading: "JD & Criteria Setup" is displayed.
  - Form displays a parsed Job Description, Experience filters (number input), and Tier 1 University degree toggle.
- **Acceptance Criteria:** "Save Criteria" button is visible and active.
- **Screenshot:** [02_setup_preferences.png](file:///Users/sundaridevulapalli/Downloads/talent-engine-pro/specs/screenshots/02_setup_preferences.png)

### TC-03: Role Dashboard Empty State ("Awaiting Your First Candidates")
- **Description:** Verify the role detail page before resumes are uploaded.
- **Preconditions:** TC-02 completed.
- **Steps:**
  1. Click "Save Criteria" on the preferences page.
- **Expected Result:**
  - Navigates to `/hr/role/<sessionId>`.
  - Header displays the role name, Department, Location, and an emerald green "• Active" badge.
  - Main body shows a dashed border empty state containing a purple glowing animated brain spinner.
  - Buttons: "Share Job Link" and "Invite from Talent Pool" are visible.
- **Acceptance Criteria:** Text is visible: "Awaiting Your First Candidates".
- **Screenshot:** [03_awaiting_first_candidates.png](file:///Users/sundaridevulapalli/Downloads/talent-engine-pro/specs/screenshots/03_awaiting_first_candidates.png)

### TC-04: Resume Uploading Flow
- **Description:** Verify the modal upload dialog and file drop capabilities.
- **Preconditions:** TC-03 completed.
- **Steps:**
  1. Click "Invite from Talent Pool".
  2. Select and upload a test PDF resume.
  3. Close the modal dialog after the upload is completed.
- **Expected Result:**
  - Dialog "Upload Candidate Resumes" appears.
  - Uploading a PDF shows the file name, size, and enables the primary upload button.
  - Successfully uploads and displays action buttons ("Upload Resumes", "Run AI Analysis") in the header.
- **Acceptance Criteria:** Dialog closes and returns to the dashboard with action buttons enabled in the header.

### TC-05: AI Scanner Progress & Leaderboard Loading
- **Description:** Verify the scanner's progress animation and automatic dashboard rendering.
- **Preconditions:** TC-04 completed.
- **Steps:**
  1. Click "Run AI Analysis" in the header.
  2. Wait for the mocked analysis to complete.
- **Expected Result:**
  - The status badge changes to a glowing "Analyzing..." state.
  - A loading spinner or progress indicator is visible.
  - After two status polls, the page automatically updates to display the candidate ranking leaderboard containing the candidate name "Marcus Chen" and score.
- **Acceptance Criteria:** Leaderboard matches mocked JSON results.
- **Screenshot:**
  - [04_ai_analysis_running.png](file:///Users/sundaridevulapalli/Downloads/talent-engine-pro/specs/screenshots/04_ai_analysis_running.png) (Analyzing State)
  - [05_candidate_leaderboard.png](file:///Users/sundaridevulapalli/Downloads/talent-engine-pro/specs/screenshots/05_candidate_leaderboard.png) (Completed Leaderboard)

### TC-06: Compare Top Talent Empty State
- **Description:** Verify the new compare empty state.
- **Preconditions:** TC-05 completed.
- **Steps:**
  1. Click "Compare" in the sidebar navigation.
- **Expected Result:**
  - Navigates to `/hr/compare`.
  - Main container displays side-by-side candidates graphics connected with glowy paths.
  - Heading: "Compare Top Talent" and buttons "Go to Candidate Ranking" and "Learn about Comparison Metrics".
- **Acceptance Criteria:** Compare empty state matches Obsidian specifications.
- **Screenshot:** [06_compare_top_talent.png](file:///Users/sundaridevulapalli/Downloads/talent-engine-pro/specs/screenshots/06_compare_top_talent.png)
