import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import db, { createSession, getSessionById, updateSession, listSessionsByUser, deleteSession } from '../db.js';
import { runScreeningAnalysis } from '../services/ai.js';

const router = Router();

router.use(requireAuth);

const sessionSchema = z.object({
  job_profile: z.any().optional()
});

router.post('/', (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const sessionId = uuidv4();
    
    const parsedBody = sessionSchema.parse(req.body);
    
    const session = createSession({
      id: sessionId,
      hr_user_id: userId,
      job_profile: parsedBody.job_profile || {},
      status: 'draft',
      uploaded_files: [],
      analysis_results: null
    });
    
    res.status(201).json({ sessionId: session.id, session });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', (req: AuthRequest, res) => {
  try {
    const sessions = listSessionsByUser(req.userId!);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req: AuthRequest, res) => {
  try {
    const session = getSessionById(req.params.id, req.userId!);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/preferences', (req: AuthRequest, res) => {
  try {
    const session = updateSession(req.params.id, req.userId!, {
      job_profile: req.body
    });
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/resumes', (req: AuthRequest, res) => {
  try {
    // Expected to receive an array of uploaded files metadata
    const session = updateSession(req.params.id, req.userId!, {
      uploaded_files: req.body.uploaded_files
    });
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/analyze', (req: AuthRequest, res) => {
  try {
    const session = updateSession(req.params.id, req.userId!, {
      status: 'analyzing'
    });
    
    // Fire asynchronously
    runScreeningAnalysis(session.id);
    
    res.json({ status: 'analyzing', session });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const session = getSessionById(req.params.id, req.userId!);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.status === 'analyzing') {
      res.status(400).json({ error: 'Cannot delete session while analyzing' });
      return;
    }
    deleteSession(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
