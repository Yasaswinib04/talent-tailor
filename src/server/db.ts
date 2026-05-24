import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Ensure critical environment variables exist
if (!process.env.DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("WARNING: Missing Supabase environment variables. Database operations will fail in production.");
}

// 1. Initialize PostgreSQL Connection Pool
const sql = postgres(process.env.DATABASE_URL || '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// 2. Initialize Supabase Client for Storage access
export const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

/**
 * Ensures the target PostgreSQL table schema exists.
 */
export async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS screening_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hr_user_id TEXT NOT NULL,
        job_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'draft',
        uploaded_files JSONB DEFAULT '[]'::jsonb,
        analysis_results JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS pipeline_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES screening_sessions(id) ON DELETE CASCADE,
        candidate_id TEXT,
        agent_name TEXT NOT NULL,
        duration_ms INTEGER,
        status TEXT,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS uat_bugs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_email TEXT NOT NULL,
        screen_path TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        steps_to_reproduce TEXT,
        browser_info JSONB NOT NULL DEFAULT '{}'::jsonb,
        state_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    console.log("PostgreSQL schema validated successfully.");
  } catch (error) {
    console.error("Failed to initialize PostgreSQL schema:", error);
  }
}

/**
 * Creates a new screening session securely bound to the HR User ID.
 */
export async function createSession(hrUserId: string): Promise<string> {
  const [row] = await sql`
    INSERT INTO screening_sessions (hr_user_id, status)
    VALUES (${hrUserId}, 'draft')
    RETURNING id
  `;
  return row.id;
}

/**
 * Retrieves a session, strictly checking hrUserId ownership.
 */
export async function getSessionById(sessionId: string, hrUserId: string) {
  const [row] = await sql`
    SELECT * FROM screening_sessions
    WHERE id = ${sessionId} AND hr_user_id = ${hrUserId}
  `;
  if (!row) return null;

  // Map snake_case to camelCase for the frontend
  return {
    ...row,
    jobProfile: row.job_profile,
    uploadedFiles: row.uploaded_files,
    analysisResults: row.analysis_results,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Updates a screening session, mapped from camelCase to snake_case.
 */
export async function updateSession(sessionId: string, hrUserId: string, updates: any) {
  const toUpdate: any = { updated_at: sql`now()` };
  
  if (updates.jobProfile !== undefined) toUpdate.job_profile = sql.json(updates.jobProfile);
  if (updates.status !== undefined) toUpdate.status = updates.status;
  if (updates.uploadedFiles !== undefined) toUpdate.uploaded_files = sql.json(updates.uploadedFiles);
  if (updates.analysisResults !== undefined) toUpdate.analysis_results = sql.json(updates.analysisResults);

  await sql`
    UPDATE screening_sessions
    SET ${sql(toUpdate)}
    WHERE id = ${sessionId} AND hr_user_id = ${hrUserId}
  `;
}

/**
 * Lists all active sessions for an HR user.
 */
export async function listSessionsByUser(hrUserId: string) {
  const rows = await sql`
    SELECT * FROM screening_sessions
    WHERE hr_user_id = ${hrUserId}
    ORDER BY created_at DESC
  `;
  return rows.map((row: any) => ({
    ...row,
    jobProfile: row.job_profile,
    uploadedFiles: row.uploaded_files,
    analysisResults: row.analysis_results,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * Deletes a session securely.
 */
export async function deleteSession(sessionId: string, hrUserId: string) {
  await sql`
    DELETE FROM screening_sessions
    WHERE id = ${sessionId} AND hr_user_id = ${hrUserId}
  `;
}

/**
 * Logs an AI agent execution event to the pipeline_logs table.
 */
export async function logPipelineEvent(
  sessionId: string, 
  candidateId: string, 
  agentName: string, 
  durationMs: number, 
  status: 'success' | 'failed', 
  errorText?: string
) {
  try {
    await sql`
      INSERT INTO pipeline_logs (session_id, candidate_id, agent_name, duration_ms, status, error)
      VALUES (${sessionId}, ${candidateId}, ${agentName}, ${durationMs}, ${status}, ${errorText || null})
    `;
  } catch (e) {
    console.error("Failed to log pipeline event:", e);
  }
}

/**
 * Logs a UAT bug report securely in the database.
 */
export async function createBugReport(
  reporterEmail: string,
  screenPath: string,
  category: string,
  severity: string,
  description: string,
  stepsToReproduce: string,
  browserInfo: any,
  stateSnapshot: any
): Promise<string> {
  const [row] = await sql`
    INSERT INTO uat_bugs (
      reporter_email,
      screen_path,
      category,
      severity,
      description,
      steps_to_reproduce,
      browser_info,
      state_snapshot
    ) VALUES (
      ${reporterEmail},
      ${screenPath},
      ${category},
      ${severity},
      ${description},
      ${stepsToReproduce || null},
      ${sql.json(browserInfo)},
      ${sql.json(stateSnapshot)}
    )
    RETURNING id
  `;
  return row.id;
}

/**
 * Retrieves all reported UAT bug logs.
 */
export async function listBugReports() {
  return await sql`
    SELECT * FROM uat_bugs
    ORDER BY created_at DESC
  `;
}

export default sql;
