import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

import { initAppCheck } from "@/lib/firebase/initAppCheck";

const firebaseConfig = {
  //apiKey: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_API_KEY,
  //authDomain: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_AUTH_DOMAIN,
  //projectId: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_PROJECT_ID,
  //storageBucket: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_STORAGE_BUCKET,
  //messagingSenderId: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_MESSAGING_SENDER_ID,
  //appId: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_APP_ID,
  apiKey: "AIzaSyBPzQ0xqJYktU6GMp2tzM1nvZJZDz5PWUk",
  authDomain: "azuret-website.firebaseapp.com",
  projectId: "azuret-website",
  storageBucket: "azuret-website.firebasestorage.app",
  messagingSenderId: "527106975022",
  appId: "1:527106975022:web:9f8c4c70329c1fd11246bf",
  measurementId: "G-DLN7R9QKK9"
};

// Check if all required config values are present
const isConfigured = Object.values(firebaseConfig).every(val => val && typeof val !== 'undefined' && val !== 'undefined');

// Singleton pattern to prevent re-initialization in Next.js dev mode
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (typeof window !== 'undefined' && isConfigured) {
  try {
    app = getApp('rhythmia');
  } catch (error) {
    app = initializeApp(firebaseConfig, 'rhythmia');
  }

  if (app) {
    initAppCheck(app);
    db = getFirestore(app);
    auth = getAuth(app);
  }
}

export { db, auth, app, isConfigured };
