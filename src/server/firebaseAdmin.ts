import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (error) {
    console.warn("Firebase Admin Initialization Warning:", error);
  }
}

export default admin;
