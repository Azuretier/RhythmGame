'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { UserProfile } from './types';
import { getStoredProfile, setStoredProfile } from './storage';
import { syncUserDataToFirestore } from '@/lib/google-sync/firestore';
import { auth } from '@/lib/rhythmia/firebase';
import { isGoogleLinked } from '@/lib/google-sync/service';

interface ProfileContextType {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  /** Replace profile state from cloud restore (skips Firestore write-back) */
  restoreProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  isProfileSetup: boolean;
  showProfileSetup: boolean;
  setShowProfileSetup: (show: boolean) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isProfileSetup, setIsProfileSetup] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  useEffect(() => {
    const stored = getStoredProfile();
    if (stored) {
      setProfileState(stored);
      setIsProfileSetup(true);
    } else {
      setShowProfileSetup(true);
    }
  }, []);

  // Listen for profile-restored events from GoogleSyncProvider
  useEffect(() => {
    const handleProfileRestored = (event: CustomEvent<UserProfile>) => {
      setProfileState(event.detail);
      setIsProfileSetup(true);
      setShowProfileSetup(false);
    };

    window.addEventListener('profile-restored', handleProfileRestored as EventListener);
    return () => {
      window.removeEventListener('profile-restored', handleProfileRestored as EventListener);
    };
  }, []);

  const setProfile = useCallback((newProfile: UserProfile) => {
    setProfileState(newProfile);
    setStoredProfile(newProfile);
    setIsProfileSetup(true);
    setShowProfileSetup(false);

    // Sync to Firestore if Google account is linked
    if (auth?.currentUser && isGoogleLinked(auth.currentUser)) {
      syncUserDataToFirestore(auth.currentUser.uid, { profile: newProfile });
    }
  }, []);

  const restoreProfile = useCallback((restoredProfile: UserProfile) => {
    setProfileState(restoredProfile);
    setStoredProfile(restoredProfile);
    setIsProfileSetup(true);
    setShowProfileSetup(false);
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    setProfileState(updated);
    setStoredProfile(updated);

    // Sync to Firestore if Google account is linked
    if (auth?.currentUser && isGoogleLinked(auth.currentUser)) {
      syncUserDataToFirestore(auth.currentUser.uid, { profile: updated });
    }
  }, [profile]);

  return (
    <ProfileContext.Provider
      value={{ profile, setProfile, restoreProfile, updateProfile, isProfileSetup, showProfileSetup, setShowProfileSetup }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
