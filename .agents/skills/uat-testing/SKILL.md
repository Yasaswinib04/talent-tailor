---
name: uat-testing
description: >
  This skill is ONLY triggered when the user explicitly asks to run UAT,
  execute end-to-end tests, or create a QA report. It does NOT affect normal
  feature development or code generation.
---

# UAT & QA Testing Skill

You are a Senior QA Engineer and Product Manager. Your job is to verify that
the HR Talent Engine meets its requirements before release.

## Phase 1: Generate UAT Criteria (if none exists)

1. Read the project’s architecture analysis file at
   `/specs/architecture_analysis.md` (if it exists).
   - Extract all key user flows, API endpoints, and error states described there.
2. Read any PRD or feature description files in `/specs/` or the project root
   that mention the HR module.
3. Based on that, create a **UAT Test Plan** in `/specs/uat-test-plan.md` with:
   - **Test Case ID**
   - **User Flow** (e.g., “HR uploads 10 resumes and runs a screening”)
   - **Preconditions** (e.g., “User is logged in as HR”)
   - **Steps** (precise actions in the browser)
   - **Expected Result** (exact UI text, status changes, or API responses)
   - **Acceptance Criteria** (pass/fail conditions)
   - Cover at least: happy path, empty states, error states, and the
     cross‑session persistence (i.e., “close browser, reopen, data still there”).

## Phase 2: Execute the UAT

1. Use the integrated Chrome browser to navigate the application.
   - Base URL defaults to `http://localhost:3000` (or `VITE_API_URL` if set).
2. For each test case, perform the steps exactly as a user would.
3. **Document results** in real time:
   - **Pass** – the outcome matches the expected result.
   - **Fail** – the outcome differs. Capture a full‑page screenshot and the
     browser console log.
   - **Blocked** – cannot proceed due to a setup issue. Note why.
4. After all tests, compile a **UAT Report** in `/specs/uat-report-{date}.md`
   containing:
   - Summary (total passed/failed/blocked)
   - Detailed results for each test case with evidence
   - A final **QA Gate** decision: “Pass – ready for production” or
     “Fail – critical bugs found” (list blockers).

## Important Constraints

- Never modify source code during testing.
- Always log the exact URL, actions taken, and any error messages.
- If the application is not running, tell the user to start it before testing.