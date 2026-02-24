/**
 * Shared anonymous authentication for the Rhythmia Firebase project.
 * Both the advancements and loyalty systems use the same Firebase app and
 * the same anonymous auth flow — this module provides a single shared instance
 * so we don't create two competing auth states.
 */

import { auth, appCheckAvailable } from '@/lib/rhythmia/firebase';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';

let currentUser: User | null = null;
let authReady: Promise<User | null> | null = null;

/**
 * Initialize anonymous auth and return the current user.
 * Resolves immediately on subsequent calls once auth is established.
 */
export function initAuth(): Promise<User | null> {
  if (!auth) return Promise.resolve(null);

  if (authReady) return authReady;

  authReady = new Promise<User | null>(async (resolve) => {
    // Wait for App Check validation — skip auth if broken
    const isAppCheckOk = await appCheckAvailable;
    if (!isAppCheckOk) {
      resolve(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      if (user) {
        currentUser = user;
        unsubscribe();
        resolve(user);
      }
    });

    // Trigger anonymous sign-in
    signInAnonymously(auth!).catch(() => {
      unsubscribe();
      resolve(null);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      unsubscribe();
      resolve(currentUser);
    }, 5000);
  });

  return authReady;
}

export function getPlayerId(): string | null {
  return currentUser?.uid ?? null;
}
