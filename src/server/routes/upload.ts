import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../db.js';

const router = Router();
router.use(requireAuth);

// Use memory storage to process files directly into buffers, avoiding local disk
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { files: 50, fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

router.post('/', upload.array('files', 50), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const sessionId = req.body.sessionId || 'unassigned';
    
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const metadata = [];

    // Stream buffers directly to Supabase Storage
    for (const file of files) {
      const uniqueFileName = `${uuidv4()}-${file.originalname}`;
      const storagePath = `${sessionId}/${uniqueFileName}`;

      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (error) {
        console.error("Supabase Storage upload error:", error);
        throw error;
      }

      metadata.push({
        fileName: file.originalname,
        size: file.size,
        path: storagePath,
        mimeType: file.mimetype
      });
    }

    res.status(200).json({ files: metadata });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/gdrive/import', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId, sessionId, mimeType, fileName } = req.body;
    
    if (!fileId) {
      res.status(400).json({ error: 'Missing GDrive fileId' });
      return;
    }

    // Initialize Google Drive API Client using Application Default Credentials
    // Assumes GOOGLE_APPLICATION_CREDENTIALS env var points to the service account JSON
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Download file buffer securely on the server
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    
    const buffer = Buffer.from(response.data as ArrayBuffer);
    
    const resolvedFileName = fileName || 'gdrive-import.pdf';
    const uniqueFileName = `${uuidv4()}-${resolvedFileName}`;
    const storagePath = `${sessionId || 'unassigned'}/${uniqueFileName}`;

    // Upload the GDrive buffer straight to Supabase
    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(storagePath, buffer, {
        contentType: mimeType || 'application/pdf',
        upsert: true
      });

    if (error) {
      console.error("Supabase Storage GDrive upload error:", error);
      throw error;
    }

    res.status(200).json({
      files: [{
        fileName: resolvedFileName,
        size: buffer.length,
        path: storagePath,
        mimeType: mimeType || 'application/pdf'
      }]
    });
  } catch (error: any) {
    console.error("GDrive Import Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
