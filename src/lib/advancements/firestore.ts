/**
 * Firestore sync service for advancement progression data.
 * Uses the Rhythmia Firebase project with anonymous auth for player identification.
 */

import { db, auth } from '@/lib/rhythmia/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import type { AdvancementState, PlayerStats } from './types';

const COLLECTION = 'rhythmia_advancements';
const NOTIFICATIONS_SUB = 'notifications';

export interface FirestoreAdvancementDoc {
  stats: PlayerStats;
  unlockedIds: string[];
  lastUpdated: Timestamp;
}

export interface NotificationEntry {
  id: string;
  advancementId: string;
  timestamp: Timestamp;
  read: boolean;
}

let currentUser: User | null = null;
let authReady: Promise<User | null> | null = null;

/**
 * Initialize anonymous auth and return the user.
 * Resolves immediately on subsequent calls if auth is already established.
 */
export function initAuth(): Promise<User | null> {
  if (!auth) return Promise.resolve(null);

  if (authReady) return authReady;

  authReady = new Promise<User | null>((resolve) => {
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

function getPlayerId(): string | null {
  return currentUser?.uid ?? null;
}

/**
 * Sync local advancement state to Firestore.
 */
export async function syncToFirestore(state: AdvancementState): Promise<void> {
  if (!db) return;

  const playerId = getPlayerId();
  if (!playerId) return;

  try {
    const docRef = doc(db, COLLECTION, playerId);
    const firestoreDoc: FirestoreAdvancementDoc = {
      stats: state.stats,
      unlockedIds: state.unlockedIds,
      lastUpdated: Timestamp.now(),
    };
    await setDoc(docRef, firestoreDoc, { merge: true });
  } catch (error) {
    console.error('[Advancements] Firestore sync failed:', error);
  }
}

/**
 * Load advancement state from Firestore.
 */
export async function loadFromFirestore(): Promise<AdvancementState | null> {
  if (!db) return null;

  const playerId = getPlayerId();
  if (!playerId) return null;

  try {
    const docRef = doc(db, COLLECTION, playerId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as FirestoreAdvancementDoc;
      return {
        stats: data.stats,
        unlockedIds: data.unlockedIds || [],
        newlyUnlockedIds: [],
      };
    }
    return null;
  } catch (error) {
    console.error('[Advancements] Firestore load failed:', error);
    return null;
  }
}

/**
 * Merge local and remote advancement states.
 * Takes the maximum of each stat and the union of unlocked IDs.
 */
export function mergeStates(
  local: AdvancementState,
  remote: AdvancementState
): AdvancementState {
  const mergedStats = { ...local.stats };

  for (const key of Object.keys(mergedStats) as (keyof PlayerStats)[]) {
    mergedStats[key] = Math.max(local.stats[key], remote.stats[key]);
  }

  const mergedUnlocked = Array.from(
    new Set([...local.unlockedIds, ...remote.unlockedIds])
  );

  return {
    stats: mergedStats,
    unlockedIds: mergedUnlocked,
    newlyUnlockedIds: [],
  };
}

/**
 * Write a notification entry for a newly unlocked advancement.
 */
export async function writeNotification(advancementId: string): Promise<void> {
  if (!db) return;

  const playerId = getPlayerId();
  if (!playerId) return;

  try {
    const notifId = `${advancementId}_${Date.now()}`;
    const notifRef = doc(db, COLLECTION, playerId, NOTIFICATIONS_SUB, notifId);
    await setDoc(notifRef, {
      id: notifId,
      advancementId,
      timestamp: Timestamp.now(),
      read: false,
    });
  } catch (error) {
    console.error('[Advancements] Notification write failed:', error);
  }
}

/**
 * Load recent notifications from Firestore.
 */
export async function loadNotifications(
  maxCount: number = 50
): Promise<NotificationEntry[]> {
  if (!db) return [];

  const playerId = getPlayerId();
  if (!playerId) return [];

  try {
    const notifCol = collection(db, COLLECTION, playerId, NOTIFICATIONS_SUB);
    const q = query(notifCol, orderBy('timestamp', 'desc'), limit(maxCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => d.data() as NotificationEntry);
  } catch (error) {
    console.error('[Advancements] Notification load failed:', error);
    return [];
  }
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notifId: string): Promise<void> {
  if (!db) return;

  const playerId = getPlayerId();
  if (!playerId) return;

  try {
    const notifRef = doc(db, COLLECTION, playerId, NOTIFICATIONS_SUB, notifId);
    await setDoc(notifRef, { read: true }, { merge: true });
  } catch (error) {
    console.error('[Advancements] Mark read failed:', error);
  }
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<void> {
  if (!db) return;

  const playerId = getPlayerId();
  if (!playerId) return;

  try {
    const notifCol = collection(db, COLLECTION, playerId, NOTIFICATIONS_SUB);
    const q = query(notifCol, orderBy('timestamp', 'desc'), limit(100));
    const snapshot = await getDocs(q);

    const promises = snapshot.docs
      .filter((d) => !(d.data() as NotificationEntry).read)
      .map((d) => setDoc(d.ref, { read: true }, { merge: true }));

    await Promise.all(promises);
  } catch (error) {
    console.error('[Advancements] Mark all read failed:', error);
  }
}
