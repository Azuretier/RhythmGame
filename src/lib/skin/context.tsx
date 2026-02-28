'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Skin } from './types';
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

function applySkinToDocument(skin: Skin, prevSkin?: Skin) {
  const root = document.documentElement;
  const colors = skin.colors;

  // Apply color CSS variables
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

  // Remove previous skin's style overrides and CSS class
  if (prevSkin?.styleOverrides) {
    for (const key of Object.keys(prevSkin.styleOverrides)) {
      root.style.removeProperty(key);
    }
  }
  if (prevSkin?.cssClass) {
    root.classList.remove(prevSkin.cssClass);
  }

  // Apply new skin's style overrides and CSS class
  if (skin.styleOverrides) {
    for (const [key, value] of Object.entries(skin.styleOverrides)) {
      root.style.setProperty(key, value);
    }
  }
  if (skin.cssClass) {
    root.classList.add(skin.cssClass);
  }
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
      applySkinToDocument(skin);
    } else {
      applySkinToDocument(currentSkin);
    }
  }, []);

  // Listen for skin-restored events from GoogleSyncProvider
  useEffect(() => {
    const handleSkinRestored = (event: CustomEvent<string>) => {
      const skin = getSkinById(event.detail);
      if (skin) {
        setCurrentSkin((prev) => {
          applySkinToDocument(skin, prev);
          return skin;
        });
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
    setCurrentSkin((prev) => {
      applySkinToDocument(skin, prev);
      return skin;
    });
    setStoredSkinId(skinId);

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
