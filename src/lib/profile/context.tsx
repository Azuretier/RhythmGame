'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { UserProfile } from './types';
import { getStoredProfile, setStoredProfile } from './storage';

interface ProfileContextType {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
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

  const setProfile = (newProfile: UserProfile) => {
    setProfileState(newProfile);
    setStoredProfile(newProfile);
    setIsProfileSetup(true);
    setShowProfileSetup(false);
  };

  return (
    <ProfileContext.Provider
      value={{ profile, setProfile, isProfileSetup, showProfileSetup, setShowProfileSetup }}
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
