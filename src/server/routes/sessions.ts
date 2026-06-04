import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { createSession, getSessionById, updateSession, listSessionsByUser, deleteSession } from '../db.js';
import { runScreeningAnalysis, generateQuestions } from '../services/ai.js';
import { scanPool } from '../services/ai/poolScanner.js';

const router = Router();

// ALL endpoints require standard Firebase Auth header
router.use(requireAuth);

const sessionSchema = z.object({
  jobProfile: z.any().optional()
});

router.post('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const parsedBody = sessionSchema.parse(req.body);
    
    const sessionId = await createSession(userId);
    
    if (parsedBody.jobProfile) {
      await updateSession(sessionId, userId, { jobProfile: parsedBody.jobProfile });
    }
    
    const session = await getSessionById(sessionId, userId);
    res.status(201).json({ sessionId, session });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    const sessions = await listSessionsByUser(req.userId!);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    const session = await getSessionById(req.params.id, req.userId!);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/preferences', async (req: AuthRequest, res): Promise<void> => {
  try {
    await updateSession(req.params.id, req.userId!, {
      jobProfile: req.body
    });
    const session = await getSessionById(req.params.id, req.userId!);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/resumes', async (req: AuthRequest, res): Promise<void> => {
  try {
    await updateSession(req.params.id, req.userId!, {
      // Support both camelCase and snake_case from the frontend for robust backwards compatibility
      uploadedFiles: req.body.uploaded_files || req.body.uploadedFiles
    });
    const session = await getSessionById(req.params.id, req.userId!);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/analyze', async (req: AuthRequest, res): Promise<void> => {
  try {
    const session = await getSessionById(req.params.id, req.userId!);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await updateSession(req.params.id, req.userId!, {
      status: 'analyzing'
    });
    
    // Fire asynchronously and explicitly pass the hrUserId
    runScreeningAnalysis(req.params.id, req.userId!);
    
    const updatedSession = await getSessionById(req.params.id, req.userId!);
    res.json({ status: 'analyzing', session: updatedSession });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/scan-pool', async (req: AuthRequest, res): Promise<void> => {
  try {
    const session = await getSessionById(req.params.id, req.userId!);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const jp = session.jobProfile || {};
    const prefs = jp.preferences || null;
    const jdText = jp.jdContent || jp.jd || '';
    const role = jp.roleType || jp.role || 'Full Stack Developer';
    const tier = jp.experienceTier || 'Senior';
    const targetMarket = jp.targetMarket || 'India';
    const topN = req.body.topN || 20;

    const result = await scanPool(req.params.id, jdText, role, tier, prefs, targetMarket, topN);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Pool scan failed' });
  }
});

router.post('/:id/candidates/:candidateId/questions', async (req: AuthRequest, res): Promise<void> => {
  try {
    const session = await getSessionById(req.params.id, req.userId!);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const candidateId = req.params.candidateId;
    const candidates = session.analysisResults?.candidates || [];
    const candidateIndex = candidates.findIndex((c: any) => c.id === candidateId);

    if (candidateIndex === -1) {
      res.status(404).json({ error: 'Candidate not found in session' });
      return;
    }

    const candidate = candidates[candidateIndex];
    const role = session.jobProfile?.role || 'General';
    const tier = session.jobProfile?.experienceTier || 'Mid';
    const gaps = candidate.gaps || [];

    const questions = await generateQuestions(gaps, role, tier);

    // Update the candidate inside the session object
    candidates[candidateIndex] = {
      ...candidate,
      discoveryQuestions: questions
    };

    // Save the updated session
    await updateSession(req.params.id, req.userId!, {
      analysisResults: {
        ...session.analysisResults,
        candidates
      }
    });

    res.json({ success: true, discoveryQuestions: questions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    const session = await getSessionById(req.params.id, req.userId!);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if ((session as any).status === 'analyzing') {
      res.status(400).json({ error: 'Cannot delete session while analyzing' });
      return;
    }
    await deleteSession(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
