import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let sql: ReturnType<typeof postgres> | null = null;

function getSql() {
  if (!sql) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL environment variable is missing.");
    }
    sql = postgres(dbUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}

// 2. Initialize Supabase Client for Storage access
export const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export let isDbConnected = false;

/**
 * Ensures the target PostgreSQL table schema exists.
 */
export async function initDb() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is missing.");
    }
    await getSql()`
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
    await getSql()`
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
    await getSql()`
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
    await getSql()`
      CREATE TABLE IF NOT EXISTS resume_text (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_path TEXT UNIQUE NOT NULL,
        extracted_text TEXT NOT NULL,
        token_count INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    await getSql()`
      CREATE INDEX IF NOT EXISTS idx_resume_text_file_path ON resume_text(file_path)
    `;
    isDbConnected = true;
    console.log("PostgreSQL schema validated successfully.");
  } catch (error) {
    isDbConnected = false;
    console.error("Failed to initialize PostgreSQL schema:", error);
  }
}

/**
 * Creates a new screening session securely bound to the HR User ID.
 */
export async function createSession(hrUserId: string): Promise<string> {
  const [row] = await getSql()`
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
  const [row] = await getSql()`
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
  const toUpdate: any = { updated_at: getSql()`now()` };
  
  if (updates.jobProfile !== undefined) toUpdate.job_profile = getSql().json(updates.jobProfile);
  if (updates.status !== undefined) toUpdate.status = updates.status;
  if (updates.uploadedFiles !== undefined) toUpdate.uploaded_files = getSql().json(updates.uploadedFiles);
  if (updates.analysisResults !== undefined) toUpdate.analysis_results = getSql().json(updates.analysisResults);

  await getSql()`
    UPDATE screening_sessions
    SET ${sql(toUpdate)}
    WHERE id = ${sessionId} AND hr_user_id = ${hrUserId}
  `;
}

/**
 * Lists all active sessions for an HR user.
 */
export async function listSessionsByUser(hrUserId: string) {
  const rows = await getSql()`
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
  await getSql()`
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
    await getSql()`
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
  const [row] = await getSql()`
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
      ${getSql().json(browserInfo)},
      ${getSql().json(stateSnapshot)}
    )
    RETURNING id
  `;
  return row.id;
}

/**
 * Retrieves all reported UAT bug logs.
 */
export async function listBugReports() {
  return await getSql()`
    SELECT * FROM uat_bugs
    ORDER BY created_at DESC
  `;
}

export async function getResumeText(filePath: string): Promise<{ extracted_text: string; token_count: number | null } | null> {
  const [row] = await getSql()`
    SELECT extracted_text, token_count FROM resume_text
    WHERE file_path = ${filePath} AND status = 'active'
  `;
  return row ? { extracted_text: row.extracted_text, token_count: row.token_count } : null;
}

export async function setResumeText(filePath: string, text: string, tokenCount?: number): Promise<void> {
  await getSql()`
    INSERT INTO resume_text (file_path, extracted_text, token_count)
    VALUES (${filePath}, ${text}, ${tokenCount ?? null})
    ON CONFLICT (file_path) DO UPDATE SET
      extracted_text = EXCLUDED.extracted_text,
      token_count = EXCLUDED.token_count,
      status = 'active'
  `;
}

export async function markResumeTextFailed(filePath: string): Promise<void> {
  await getSql()`
    INSERT INTO resume_text (file_path, extracted_text, status)
    VALUES (${filePath}, '', 'failed')
    ON CONFLICT (file_path) DO UPDATE SET status = 'failed'
  `;
}

export default getSql;
