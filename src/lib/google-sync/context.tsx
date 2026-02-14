'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/rhythmia/firebase';
import {
  isGoogleLinked,
  linkGoogleAccount,
  unlinkGoogleAccount,
  onAuthChange,
  type GoogleSyncStatus,
} from './service';
import {
  syncUserDataToFirestore,
  loadUserDataFromFirestore,
  loadAdvancementsForUid,
  loadLoyaltyForUid,
} from './firestore';
import type { UserProfile } from '@/lib/profile/types';
import { getStoredProfile, setStoredProfile } from '@/lib/profile/storage';
import { getStoredSkinId, setStoredSkinId } from '@/lib/skin/storage';
import {
  loadAdvancementState,
  saveAdvancementState,
} from '@/lib/advancements/storage';
import { mergeStates } from '@/lib/advancements/firestore';
import { loadLoyaltyState, saveLoyaltyState } from '@/lib/loyalty/storage';

interface GoogleSyncContextType {
  /** Current Firebase user (may be anonymous or Google-linked) */
  user: User | null;
  /** Whether the current user has linked a Google account */
  isLinked: boolean;
  /** Google display name / email */
  googleDisplayName: string | null;
  googleEmail: string | null;
  googlePhotoURL: string | null;
  /** Current sync operation status */
  status: GoogleSyncStatus;
  /** Link current anonymous account to Google */
  linkGoogle: () => Promise<void>;
  /** Sign out of Google (reverts to anonymous) */
  unlinkGoogle: () => Promise<void>;
  /** Manually trigger a full sync to Firestore */
  syncNow: () => Promise<void>;
}

const GoogleSyncContext = createContext<GoogleSyncContextType | undefined>(
  undefined
);

/**
 * Merge local loyalty state with remote, taking the max of each numeric field.
 */
function mergeLoyaltyStates(
  local: ReturnType<typeof loadLoyaltyState>,
  remote: NonNullable<Awaited<ReturnType<typeof loadLoyaltyForUid>>>
) {
  const mergedStats = { ...local.stats };
  const numericKeys: (keyof typeof mergedStats)[] = [
    'totalVisits',
    'currentStreak',
    'bestStreak',
    'totalGamesPlayed',
    'totalScore',
    'advancementsUnlocked',
    'pollsVoted',
  ];
  for (const key of numericKeys) {
    const localVal = mergedStats[key];
    const remoteVal = remote.stats[key];
    if (typeof localVal === 'number' && typeof remoteVal === 'number') {
      (mergedStats as Record<string, unknown>)[key] = Math.max(localVal, remoteVal);
    }
  }

  // Keep whichever date is earlier for joinDate
  if (remote.stats.joinDate && (!mergedStats.joinDate || remote.stats.joinDate < mergedStats.joinDate)) {
    mergedStats.joinDate = remote.stats.joinDate;
  }
  // Keep whichever lastVisitDate is more recent
  if (remote.stats.lastVisitDate && remote.stats.lastVisitDate > (mergedStats.lastVisitDate || '')) {
    mergedStats.lastVisitDate = remote.stats.lastVisitDate;
  }

  return {
    stats: mergedStats,
    xp: Math.max(local.xp, remote.xp),
    unlockedBadgeIds: Array.from(
      new Set([...local.unlockedBadgeIds, ...remote.unlockedBadgeIds])
    ),
  };
}

export function GoogleSyncProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [status, setStatus] = useState<GoogleSyncStatus>('idle');

  // Watch Firebase auth state and ensure anonymous auth is initialized
  useEffect(() => {
    // Initialize auth (will create anonymous user if needed)
    const initAuthAsync = async () => {
      if (!auth) return;
      const currentUser = auth.currentUser;
      if (!currentUser) {
        try {
          const { signInAnonymously } = await import('firebase/auth');
          await signInAnonymously(auth);
        } catch (error) {
          console.error('[GoogleSync] Failed to initialize anonymous auth:', error);
        }
      }
    };
    initAuthAsync();

    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setIsLinked(isGoogleLinked(firebaseUser));
    });
    return unsubscribe;
  }, []);

  const getGoogleProvider = useCallback(() => {
    if (!user) return null;
    return user.providerData.find((p) => p.providerId === 'google.com') ?? null;
  }, [user]);

  /**
   * Pull remote data from Firestore and merge with local state.
   */
  const restoreFromCloud = useCallback(async (uid: string) => {
    setStatus('syncing');

    try {
      // Load remote user data (profile + skin)
      const remoteUserData = await loadUserDataFromFirestore(uid);

      if (remoteUserData) {
        // Restore profile if remote has one and local doesn't (or remote is newer)
        if (remoteUserData.profile) {
          const localProfile = getStoredProfile();
          if (!localProfile) {
            setStoredProfile(remoteUserData.profile);
            // Dispatch event so ProfileProvider can update its React state
            window.dispatchEvent(new CustomEvent('profile-restored', { 
              detail: remoteUserData.profile 
            }));
          }
        }

        // Restore skin
        if (remoteUserData.skinId) {
          const localSkin = getStoredSkinId();
          if (!localSkin || localSkin === 'azure') {
            setStoredSkinId(remoteUserData.skinId);
            // Dispatch event so SkinProvider can update its React state
            window.dispatchEvent(new CustomEvent('skin-restored', { 
              detail: remoteUserData.skinId 
            }));
          }
        }
      }

      // Merge advancements
      const remoteAdv = await loadAdvancementsForUid(uid);
      if (remoteAdv) {
        const localAdv = loadAdvancementState();
        const merged = mergeStates(localAdv, remoteAdv);
        saveAdvancementState(merged);
      }

      // Merge loyalty
      const remoteLoyalty = await loadLoyaltyForUid(uid);
      if (remoteLoyalty) {
        const localLoyalty = loadLoyaltyState();
        const merged = mergeLoyaltyStates(localLoyalty, remoteLoyalty);
        saveLoyaltyState(merged);
      }

      setStatus('done');
    } catch (error) {
      console.error('[GoogleSync] Restore from cloud failed:', error);
      setStatus('error');
    }
  }, []);

  /**
   * Push current local data to Firestore.
   */
  const syncNow = useCallback(async () => {
    if (!user || !isGoogleLinked(user)) return;

    setStatus('syncing');
    try {
      const profile = getStoredProfile();
      const skinId = getStoredSkinId();

      await syncUserDataToFirestore(user.uid, { profile, skinId });
      setStatus('done');
    } catch (error) {
      console.error('[GoogleSync] Sync failed:', error);
      setStatus('error');
    }
  }, [user]);

  /**
   * Link Google account and run initial sync.
   */
  const linkGoogle = useCallback(async () => {
    setStatus('linking');
    try {
      const linkedUser = await linkGoogleAccount();
      setUser(linkedUser);
      setIsLinked(true);

      // Push local data to cloud, then restore any remote data
      const profile = getStoredProfile();
      const skinId = getStoredSkinId();
      await syncUserDataToFirestore(linkedUser.uid, { profile, skinId });
      await restoreFromCloud(linkedUser.uid);

      setStatus('done');
    } catch (error) {
      if (error instanceof Error && error.message === 'popup-closed') {
        setStatus('idle');
        return;
      }
      console.error('[GoogleSync] Link failed:', error);
      setStatus('error');
    }
  }, [restoreFromCloud]);

  /**
   * Unlink Google and revert to anonymous.
   */
  const unlinkGoogle = useCallback(async () => {
    setStatus('syncing');
    try {
      await unlinkGoogleAccount();
      setIsLinked(false);
      setStatus('idle');
    } catch (error) {
      console.error('[GoogleSync] Unlink failed:', error);
      setStatus('error');
    }
  }, []);

  const googleProvider = getGoogleProvider();

  return (
    <GoogleSyncContext.Provider
      value={{
        user,
        isLinked,
        googleDisplayName: googleProvider?.displayName ?? null,
        googleEmail: googleProvider?.email ?? null,
        googlePhotoURL: googleProvider?.photoURL ?? null,
        status,
        linkGoogle,
        unlinkGoogle,
        syncNow,
      }}
    >
      {children}
    </GoogleSyncContext.Provider>
  );
}

export function useGoogleSync() {
  const context = useContext(GoogleSyncContext);
  if (context === undefined) {
    throw new Error('useGoogleSync must be used within a GoogleSyncProvider');
  }
  return context;
}
