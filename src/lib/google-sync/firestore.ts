/**
 * Firestore sync for Google-linked user data.
 *
 * Syncs profile, skin selection, advancements, and loyalty under a single
 * user document keyed by Firebase UID. Advancements and loyalty already have
 * their own Firestore sync — this module handles the profile + skin that
 * were previously localStorage-only, and provides a full-restore function
 * for loading everything on a new device.
 */

import { db } from '@/lib/rhythmia/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/profile/types';
import type { AdvancementState } from '@/lib/advancements/types';
import type { LoyaltyState } from '@/lib/loyalty/types';

const USER_DATA_COLLECTION = 'user_sync';

export interface SyncedUserData {
  profile: UserProfile | null;
  skinId: string | null;
  lastSyncedAt: Timestamp;
}

/**
 * Save profile and skin to Firestore.
 */
export async function syncUserDataToFirestore(
  uid: string,
  data: { profile?: UserProfile | null; skinId?: string | null }
): Promise<void> {
  if (!db) return;

  try {
    const docRef = doc(db, USER_DATA_COLLECTION, uid);
    const payload: Record<string, unknown> = { lastSyncedAt: Timestamp.now() };

    if (data.profile !== undefined) {
      payload.profile = data.profile;
    }
    if (data.skinId !== undefined) {
      payload.skinId = data.skinId;
    }

    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.error('[GoogleSync] Failed to sync user data:', error);
  }
}

/**
 * Load profile and skin from Firestore.
 */
export async function loadUserDataFromFirestore(
  uid: string
): Promise<SyncedUserData | null> {
  if (!db) return null;

  try {
    const docRef = doc(db, USER_DATA_COLLECTION, uid);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      profile: data.profile ?? null,
      skinId: data.skinId ?? null,
      lastSyncedAt: data.lastSyncedAt ?? Timestamp.now(),
    };
  } catch (error) {
    console.error('[GoogleSync] Failed to load user data:', error);
    return null;
  }
}

/**
 * Load advancement state from Firestore for a given UID.
 * (Re-exports from advancements module pattern but accepts explicit UID.)
 */
export async function loadAdvancementsForUid(
  uid: string
): Promise<AdvancementState | null> {
  if (!db) return null;

  try {
    const docRef = doc(db, 'rhythmia_advancements', uid);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      stats: data.stats,
      unlockedIds: data.unlockedIds || [],
      newlyUnlockedIds: [],
    };
  } catch (error) {
    console.error('[GoogleSync] Failed to load advancements:', error);
    return null;
  }
}

/**
 * Load loyalty state from Firestore for a given UID.
 */
export async function loadLoyaltyForUid(
  uid: string
): Promise<LoyaltyState | null> {
  if (!db) return null;

  try {
    const docRef = doc(db, 'loyalty_states', uid);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      stats: data.stats,
      xp: data.xp ?? 0,
      unlockedBadgeIds: data.unlockedBadgeIds ?? [],
    };
  } catch (error) {
    console.error('[GoogleSync] Failed to load loyalty:', error);
    return null;
  }
}
