import { createFirebaseClientApp } from "@/lib/firebase/createClientApp";

const { auth, db } = createFirebaseClientApp("mnsw", {
  apiKey: process.env.NEXT_PUBLIC_MNSW_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_MNSW_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_MNSW_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_MNSW_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MNSW_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_MNSW_FIREBASE_APP_ID,
});

export { auth, db };
