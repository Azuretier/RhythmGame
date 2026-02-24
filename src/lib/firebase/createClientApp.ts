import { initializeApp, getApp, FirebaseOptions } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { initAppCheck } from "./initAppCheck";

/**
 * Creates or retrieves a named Firebase client app singleton, then
 * initializes App Check, Auth, and Firestore on top of it.
 *
 * Using a unique `name` per Firebase project avoids conflicts when
 * multiple Firebase projects are used in the same application.
 */
export function createFirebaseClientApp(
  name: string,
  config: FirebaseOptions
): { auth: Auth; db: Firestore } {
  let app;
  try {
    app = getApp(name);
  } catch {
    app = initializeApp(config, name);
  }

  if (typeof window !== "undefined") initAppCheck(app);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { auth, db };
}
