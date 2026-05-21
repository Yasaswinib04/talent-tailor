import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'screening.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS screening_sessions (
    id TEXT PRIMARY KEY,
    hr_user_id TEXT NOT NULL,
    job_profile TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    uploaded_files TEXT DEFAULT '[]',
    analysis_results TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export interface ScreeningSession {
  id: string;
  hr_user_id: string;
  job_profile: any; // parsed JSON
  status: string;
  uploaded_files: any[]; // parsed JSON
  analysis_results: any | null; // parsed JSON
  created_at: string;
  updated_at: string;
}

function parseSession(row: any): ScreeningSession {
  if (!row) return row;
  return {
    ...row,
    job_profile: row.job_profile ? JSON.parse(row.job_profile) : null,
    uploaded_files: row.uploaded_files ? JSON.parse(row.uploaded_files) : [],
    analysis_results: row.analysis_results ? JSON.parse(row.analysis_results) : null,
  };
}

export function createSession(session: Omit<ScreeningSession, 'created_at' | 'updated_at'>) {
  const stmt = db.prepare(`
    INSERT INTO screening_sessions (id, hr_user_id, job_profile, status, uploaded_files, analysis_results)
    VALUES (@id, @hr_user_id, @job_profile, @status, @uploaded_files, @analysis_results)
  `);
  
  stmt.run({
    id: session.id,
    hr_user_id: session.hr_user_id,
    job_profile: JSON.stringify(session.job_profile || {}),
    status: session.status || 'draft',
    uploaded_files: JSON.stringify(session.uploaded_files || []),
    analysis_results: session.analysis_results ? JSON.stringify(session.analysis_results) : null
  });
  
  return getSessionById(session.id, session.hr_user_id)!;
}

export function getSessionById(id: string, hr_user_id: string): ScreeningSession | null {
  const stmt = db.prepare(`SELECT * FROM screening_sessions WHERE id = ? AND hr_user_id = ?`);
  const row = stmt.get(id, hr_user_id);
  return row ? parseSession(row) : null;
}

export function updateSession(id: string, hr_user_id: string, updates: Partial<ScreeningSession>) {
  const current = getSessionById(id, hr_user_id);
  if (!current) throw new Error("Session not found or unauthorized");

  const fields = [];
  const values: any = { id, hr_user_id };

  if (updates.job_profile !== undefined) {
    fields.push('job_profile = @job_profile');
    values.job_profile = JSON.stringify(updates.job_profile);
  }
  if (updates.status !== undefined) {
    fields.push('status = @status');
    values.status = updates.status;
  }
  if (updates.uploaded_files !== undefined) {
    fields.push('uploaded_files = @uploaded_files');
    values.uploaded_files = JSON.stringify(updates.uploaded_files);
  }
  if (updates.analysis_results !== undefined) {
    fields.push('analysis_results = @analysis_results');
    values.analysis_results = updates.analysis_results ? JSON.stringify(updates.analysis_results) : null;
  }

  if (fields.length === 0) return current;

  fields.push('updated_at = CURRENT_TIMESTAMP');

  const stmt = db.prepare(`
    UPDATE screening_sessions 
    SET ${fields.join(', ')} 
    WHERE id = @id AND hr_user_id = @hr_user_id
  `);
  
  stmt.run(values);
  return getSessionById(id, hr_user_id)!;
}

export function listSessionsByUser(hr_user_id: string): ScreeningSession[] {
  const stmt = db.prepare(`SELECT * FROM screening_sessions WHERE hr_user_id = ? ORDER BY updated_at DESC`);
  const rows = stmt.all(hr_user_id);
  return rows.map(parseSession);
}

export function deleteSession(id: string, hr_user_id: string) {
  const stmt = db.prepare(`DELETE FROM screening_sessions WHERE id = ? AND hr_user_id = ?`);
  stmt.run(id, hr_user_id);
}

export default db;
