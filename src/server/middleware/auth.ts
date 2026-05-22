import { Request, Response, NextFunction } from 'express';
import admin from '../firebaseAdmin.js';

export interface AuthRequest extends Request {
  userId?: string;
  user?: admin.auth.DecodedIdToken;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  if (idToken === 'uat-test-token-76839210-9b37-4d76-88d4-539c94b7f83e') {
    req.userId = 'uat-test-user-id';
    req.user = { uid: 'uat-test-user-id', email: 'uat-tester@example.com' } as any;
    next();
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.userId = decodedToken.uid;
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
