'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Skin, SkinColors } from './types';
import { SKIN_PRESETS, DEFAULT_SKIN_ID, getSkinById } from './types';
import { getStoredSkinId, setStoredSkinId } from './storage';
import { syncUserDataToFirestore } from '@/lib/google-sync/firestore';
import { auth } from '@/lib/rhythmia/firebase';
import { isGoogleLinked } from '@/lib/google-sync/service';

interface SkinContextType {
  currentSkin: Skin;
  setSkin: (skinId: string) => void;
  skins: Skin[];
}

const SkinContext = createContext<SkinContextType | undefined>(undefined);

function applySkinToDocument(colors: SkinColors) {
  const root = document.documentElement;
  root.style.setProperty('--skin-accent', colors.accent);
  root.style.setProperty('--skin-accent-light', colors.accentLight);
  root.style.setProperty('--skin-accent-dim', colors.accentDim);
  root.style.setProperty('--skin-background', colors.background);
  root.style.setProperty('--skin-surface', colors.surface);
  root.style.setProperty('--skin-foreground', colors.foreground);
  root.style.setProperty('--skin-subtext', colors.subtext);
  root.style.setProperty('--skin-border', colors.border);
  root.style.setProperty('--skin-border-hover', colors.borderHover);

  // Also set the generic CSS variables used by Tailwind
  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--foreground', colors.foreground);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--subtext', colors.subtext);
}

export function SkinProvider({ children }: { children: ReactNode }) {
  const [currentSkin, setCurrentSkin] = useState<Skin>(
    () => getSkinById(DEFAULT_SKIN_ID)!
  );

  useEffect(() => {
    const storedId = getStoredSkinId();
    const skin = storedId ? getSkinById(storedId) : null;
    if (skin) {
      setCurrentSkin(skin);
      applySkinToDocument(skin.colors);
    } else {
      applySkinToDocument(currentSkin.colors);
    }
  }, []);

  // Listen for skin-restored events from GoogleSyncProvider
  useEffect(() => {
    const handleSkinRestored = (event: CustomEvent<string>) => {
      const skin = getSkinById(event.detail);
      if (skin) {
        setCurrentSkin(skin);
        applySkinToDocument(skin.colors);
      }
    };

    window.addEventListener('skin-restored', handleSkinRestored as EventListener);
    return () => {
      window.removeEventListener('skin-restored', handleSkinRestored as EventListener);
    };
  }, []);

  const setSkin = useCallback((skinId: string) => {
    const skin = getSkinById(skinId);
    if (!skin) return;
    setCurrentSkin(skin);
    setStoredSkinId(skinId);
    applySkinToDocument(skin.colors);

    // Sync to Firestore if Google account is linked
    if (auth?.currentUser && isGoogleLinked(auth.currentUser)) {
      syncUserDataToFirestore(auth.currentUser.uid, { skinId });
    }
  }, []);

  return (
    <SkinContext.Provider value={{ currentSkin, setSkin, skins: SKIN_PRESETS }}>
      {children}
    </SkinContext.Provider>
  );
}

export function useSkin() {
  const context = useContext(SkinContext);
  if (context === undefined) {
    throw new Error('useSkin must be used within a SkinProvider');
  }
  return context;
}
