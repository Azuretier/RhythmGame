import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { initAppCheck } from "@/lib/firebase/initAppCheck";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_RANKCARD_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_RANKCARD_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_RANKCARD_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_RANKCARD_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_RANKCARD_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_RANKCARD_FIREBASE_APP_ID,
};

// Singleton pattern to prevent re-initialization in Next.js dev mode
let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (typeof window !== 'undefined') {
  try {
    app = getApp('rank-card');
  } catch (error) {
    app = initializeApp(firebaseConfig, 'rank-card');
  }

  if (app) {
    initAppCheck(app);
    db = getFirestore(app);
  }
}

export { db };
