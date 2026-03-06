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
import type { SkillTreeState } from '@/lib/skill-tree/types';

const USER_DATA_COLLECTION = 'user_sync';

export interface PurchaseRecord {
  itemId: string;
  itemType: 'crystal_pack' | 'battle_pass' | 'premium_skin' | 'inventory_expansion';
  quantity: number;
  priceJpy: number;
  purchasedAt: Timestamp;
  stripeSessionId?: string;
}

export interface SyncedUserData {
  profile: UserProfile | null;
  skinId: string | null;
  skillTree: SkillTreeState | null;
  purchases?: PurchaseRecord[];
  premiumCurrency?: number;
  ownedPremiumSkins?: string[];
  battlePassActive?: boolean;
  lastSyncedAt: Timestamp;
}

/**
 * Save profile and skin to Firestore.
 */
export async function syncUserDataToFirestore(
  uid: string,
  data: {
    profile?: UserProfile | null;
    skinId?: string | null;
    skillTree?: SkillTreeState | null;
    premiumCurrency?: number;
    ownedPremiumSkins?: string[];
    battlePassActive?: boolean;
  }
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
    if (data.skillTree !== undefined) {
      payload.skillTree = data.skillTree;
    }
    if (data.premiumCurrency !== undefined) {
      payload.premiumCurrency = data.premiumCurrency;
    }
    if (data.ownedPremiumSkins !== undefined) {
      payload.ownedPremiumSkins = data.ownedPremiumSkins;
    }
    if (data.battlePassActive !== undefined) {
      payload.battlePassActive = data.battlePassActive;
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
      skillTree: data.skillTree ?? null,
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
    const stats = data.stats ?? {};
    return {
      stats,
      combinedScore: (stats.totalScore ?? 0) + (stats.dailyBonusXP ?? 0),
    };
  } catch (error) {
    console.error('[GoogleSync] Failed to load loyalty:', error);
    return null;
  }
}
