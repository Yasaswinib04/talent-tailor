import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.body.sessionId || 'unassigned';
    const uploadPath = path.join(process.cwd(), 'data', 'uploads', sessionId);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { files: 50 } 
});

router.post('/', upload.array('files', 50), (req: AuthRequest, res: Response): void => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const metadata = files.map(file => ({
      fileName: file.originalname,
      size: file.size,
      path: file.path,
      mimeType: file.mimetype
    }));

    res.status(200).json({ files: metadata });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/gdrive/import', (req: AuthRequest, res: Response): void => {
  // GDrive import logic placeholder
  // Requires 'googleapis' and service account setup
  res.status(501).json({ error: 'Google Drive import is not fully implemented yet.' });
});

export default router;
