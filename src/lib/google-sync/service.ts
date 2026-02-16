/**
 * Google Account sync service.
 *
 * Links a Google credential to the current anonymous Firebase user (preserving
 * the same UID so existing Firestore data stays valid), or signs in with an
 * existing Google-linked account on a new device.
 */

import { auth } from '@/lib/rhythmia/firebase';
import {
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

export type GoogleSyncStatus = 'idle' | 'linking' | 'syncing' | 'done' | 'error';

/**
 * Returns true when the current Firebase user has a Google provider linked.
 */
export function isGoogleLinked(user: User | null): boolean {
  if (!user) return false;
  return user.providerData.some((p) => p.providerId === 'google.com');
}

/**
 * Attempt to link the current anonymous user to a Google Account.
 * If the Google account is already associated with another Firebase user
 * (e.g. used on a different device), fall back to signInWithPopup so
 * the existing data is loaded.
 *
 * Returns the resulting Firebase user.
 */
export async function linkGoogleAccount(): Promise<User> {
  if (!auth) throw new Error('Firebase Auth not initialized');

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user');

  // Already linked
  if (isGoogleLinked(currentUser)) return currentUser;

  try {
    // Try to link Google credential to current anonymous account
    const result = await linkWithPopup(currentUser, googleProvider);
    return result.user;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };

    // credential-already-in-use means the Google account already exists
    // as a separate Firebase user — sign in with that account instead
    if (firebaseError.code === 'auth/credential-already-in-use') {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }

    // popup-closed-by-user is a normal cancellation
    if (firebaseError.code === 'auth/popup-closed-by-user') {
      throw new Error('popup-closed');
    }

    throw error;
  }
}

/**
 * Sign out the current user entirely and re-authenticate anonymously
 * so the site continues to work.
 */
export async function unlinkGoogleAccount(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
  // The app will re-trigger anonymous auth on next Firestore operation
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
