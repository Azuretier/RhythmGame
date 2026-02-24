import { createFirebaseClientApp } from "@/lib/firebase/createClientApp";

const { auth, db } = createFirebaseClientApp("portfolio", {
  apiKey: process.env.NEXT_PUBLIC_PORTFOLIO_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_PORTFOLIO_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PORTFOLIO_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_PORTFOLIO_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_PORTFOLIO_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_PORTFOLIO_FIREBASE_APP_ID,
});

export { auth, db };
