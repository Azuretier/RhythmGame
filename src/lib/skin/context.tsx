'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTheme } from 'next-themes';
import type { SkinId } from './types';
import { KAWAII_REQUIRED_ADVANCEMENTS } from './types';
import { getStoredSkin, setStoredSkin } from './storage';
import { getUnlockedCount } from '@/lib/advancements/storage';

interface SkinContextType {
  currentSkin: SkinId;
  setSkin: (skin: SkinId) => void;
  isKawaiiUnlocked: boolean;
  kawaiiProgress: number;
  kawaiiRequired: number;
}

const SkinContext = createContext<SkinContextType | undefined>(undefined);

export function SkinProvider({ children }: { children: ReactNode }) {
  const { setTheme } = useTheme();
  const [currentSkin, setCurrentSkin] = useState<SkinId>('dark');
  const [kawaiiProgress, setKawaiiProgress] = useState(0);

  const isKawaiiUnlocked = kawaiiProgress >= KAWAII_REQUIRED_ADVANCEMENTS;

  // Restore from localStorage on mount and ensure HTML class is synced
  useEffect(() => {
    const stored = getStoredSkin();
    const unlocked = getUnlockedCount();
    setKawaiiProgress(unlocked);

    if (stored && stored === 'kawaii' && unlocked < KAWAII_REQUIRED_ADVANCEMENTS) {
      // Stored skin is kawaii but no longer unlocked, fall back to dark
      setCurrentSkin('dark');
      setStoredSkin('dark');
      setTheme('dark');
    } else if (stored) {
      setCurrentSkin(stored);
      setTheme(stored);
    } else {
      // No stored skin — ensure the default dark theme class is applied
      setTheme('dark');
    }
  }, [setTheme]);

  const setSkin = useCallback((skin: SkinId) => {
    // Prevent selecting kawaii if not unlocked
    if (skin === 'kawaii') {
      const unlocked = getUnlockedCount();
      setKawaiiProgress(unlocked);
      if (unlocked < KAWAII_REQUIRED_ADVANCEMENTS) return;
    }

    setCurrentSkin(skin);
    setStoredSkin(skin);
    setTheme(skin);
  }, [setTheme]);

  // On focus, refresh kawaii progress and validate current skin
  useEffect(() => {
    function handleFocus() {
      const unlocked = getUnlockedCount();
      setKawaiiProgress(unlocked);

      // If kawaii is active but no longer unlocked, fall back to dark
      setCurrentSkin((prev) => {
        if (prev === 'kawaii' && unlocked < KAWAII_REQUIRED_ADVANCEMENTS) {
          setStoredSkin('dark');
          setTheme('dark');
          return 'dark';
        }
        return prev;
      });
    }

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [setTheme]);

  return (
    <SkinContext.Provider value={{
      currentSkin,
      setSkin,
      isKawaiiUnlocked,
      kawaiiProgress,
      kawaiiRequired: KAWAII_REQUIRED_ADVANCEMENTS,
    }}>
      {children}
    </SkinContext.Provider>
  );
}

export function useSkin(): SkinContextType {
  const context = useContext(SkinContext);
  if (context === undefined) {
    throw new Error('useSkin must be used within a SkinProvider');
  }
  return context;
}
