import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

export function getMultiplayerAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const apps = getApps();
  if (apps.length > 0) {
    adminApp = apps[0];
    return adminApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. ' +
      'Firestore room persistence will not be available.'
    );
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });

    return adminApp;
  } catch (error) {
    throw new Error(
      `Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function getMultiplayerDb(): Firestore {
  if (adminDb) {
    return adminDb;
  }

  const app = getMultiplayerAdminApp();
  adminDb = getFirestore(app);

  return adminDb;
}
