import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This singleton pattern prevents re-initialization in Next.js dev mode
let adminApp: admin.app.App | undefined;

export function getAdminApp(): admin.app.App {
  if (adminApp) {
    return adminApp;
  }

  // Get service account from environment variable
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Initialize the app if not already done
    if (!admin.apps.length) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      adminApp = admin.apps[0];
    }

    return adminApp;
  } catch (error) {
    throw new Error(`Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getAdminFirestore(): admin.firestore.Firestore {
  const app = getAdminApp();
  return admin.firestore(app);
}
