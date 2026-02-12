import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initAppCheck } from "@/lib/firebase/initAppCheck";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_MNSW_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_MNSW_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_MNSW_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_MNSW_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MNSW_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_MNSW_FIREBASE_APP_ID,
};

// Singleton pattern to prevent re-initialization in Next.js dev mode
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
if (typeof window !== 'undefined') initAppCheck(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
