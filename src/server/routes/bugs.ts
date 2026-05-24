import { Router, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { createBugReport, listBugReports } from '../db.js';

const router = Router();
router.use(requireAuth);

const bugSchema = z.object({
  screenPath: z.string(),
  category: z.string(),
  severity: z.string(),
  description: z.string(),
  stepsToReproduce: z.string().optional(),
  browserInfo: z.any().optional(),
  stateSnapshot: z.any().optional()
});

const SPECS_DIR = path.join(process.cwd(), 'specs');
const BUGS_FILE = path.join(SPECS_DIR, 'uat-bugs.json');

// Ensure local file storage fallback works seamlessly
function writeBugToFile(bugData: any) {
  try {
    if (!fs.existsSync(SPECS_DIR)) {
      fs.mkdirSync(SPECS_DIR, { recursive: true });
    }
    let bugs = [];
    if (fs.existsSync(BUGS_FILE)) {
      try {
        const content = fs.readFileSync(BUGS_FILE, 'utf-8');
        bugs = JSON.parse(content || '[]');
      } catch (e) {
        console.warn("Failed to parse existing uat-bugs.json, resetting list:", e);
      }
    }
    bugs.push(bugData);
    fs.writeFileSync(BUGS_FILE, JSON.stringify(bugs, null, 2), 'utf-8');
    console.log(`Saved bug report locally to uat-bugs.json`);
  } catch (err) {
    console.error("Failed to write bug to file:", err);
  }
}

function readBugsFromFile(): any[] {
  try {
    if (fs.existsSync(BUGS_FILE)) {
      const content = fs.readFileSync(BUGS_FILE, 'utf-8');
      return JSON.parse(content || '[]');
    }
  } catch (err) {
    console.error("Failed to read bugs from file:", err);
  }
  return [];
}

// POST /api/hr/bugs - Create a UAT bug report
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = bugSchema.parse(req.body);
    const reporterEmail = req.user?.email || 'uat-tester@example.com';
    const id = crypto.randomUUID ? crypto.randomUUID() : 'bug-' + Date.now();

    const bugRecord = {
      id,
      reporterEmail,
      screenPath: parsed.screenPath,
      category: parsed.category,
      severity: parsed.severity,
      description: parsed.description,
      stepsToReproduce: parsed.stepsToReproduce || '',
      browserInfo: parsed.browserInfo || {},
      stateSnapshot: parsed.stateSnapshot || {},
      status: 'open',
      createdAt: new Date().toISOString()
    };

    // 1. Persist to PostgreSQL database (if DB is active)
    let dbId = null;
    try {
      dbId = await createBugReport(
        reporterEmail,
        parsed.screenPath,
        parsed.category,
        parsed.severity,
        parsed.description,
        parsed.stepsToReproduce || '',
        parsed.browserInfo || {},
        parsed.stateSnapshot || {}
      );
      bugRecord.id = dbId;
    } catch (dbErr) {
      console.warn("PostgreSQL storage warning (falling back to file storage only):", dbErr);
    }

    // 2. Persist to local JSON file for easy workspace access
    writeBugToFile(bugRecord);

    res.status(201).json({ success: true, id: bugRecord.id, bug: bugRecord });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/hr/bugs - List all UAT bug reports
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 1. Fetch from PostgreSQL database if possible
    try {
      const dbBugs = await listBugReports();
      // Map keys to match expected response format
      const formattedBugs = dbBugs.map((row: any) => ({
        id: row.id,
        reporterEmail: row.reporter_email,
        screenPath: row.screen_path,
        category: row.category,
        severity: row.severity,
        description: row.description,
        stepsToReproduce: row.steps_to_reproduce,
        browserInfo: row.browser_info,
        stateSnapshot: row.state_snapshot,
        status: row.status,
        createdAt: row.created_at
      }));
      res.json(formattedBugs);
      return;
    } catch (dbErr) {
      console.warn("PostgreSQL fetch failed, falling back to local file logs:", dbErr);
    }

    // 2. Fallback to reading file logs
    const fileBugs = readBugsFromFile();
    res.json(fileBugs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
