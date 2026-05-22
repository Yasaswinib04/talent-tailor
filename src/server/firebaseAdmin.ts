import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

if (!admin.apps.length) {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const configData = JSON.parse(readFileSync(configPath, 'utf8'));
    admin.initializeApp({ projectId: configData.projectId });
  } catch (error) {
    console.warn("Firebase Admin Initialization Warning (Fallback):", error);
    admin.initializeApp();
  }
}

export default admin;
