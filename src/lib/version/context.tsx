/**
 * Version + appearance context for managing app version and accent color state
 */

'use client';

import { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from 'react';
import type { AppVersion, AccentColor } from './types';
import { DEFAULT_VERSION, DEFAULT_ACCENT, ACCENT_COLOR_METADATA } from './types';
import {
  getSelectedVersion,
  setStoredVersion,
  getSelectedAccent,
  setSelectedAccent as persistAccent,
} from './storage';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface VersionContextType {
  currentVersion: AppVersion;
  setVersion: (version: AppVersion) => void;
  isVersionSelected: boolean;
  isHydrated: boolean;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

function applyAccentCSS(color: AccentColor) {
  const meta = ACCENT_COLOR_METADATA[color];
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--accent', meta.hsl);
    document.documentElement.style.setProperty('--accent-hex', meta.value);
    document.documentElement.setAttribute('data-accent', color);
  }
}

function applyVersionCSS(version: AppVersion) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-version', version);
  }
}

export function VersionProvider({ children }: { children: ReactNode }) {
  const [currentVersion, setCurrentVersion] = useState<AppVersion>(DEFAULT_VERSION);
  const [isVersionSelected, setIsVersionSelected] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [accentColor, setAccentColorState] = useState<AccentColor>(DEFAULT_ACCENT);

  // Restore from storage on mount — useLayoutEffect prevents flash of wrong version
  useIsomorphicLayoutEffect(() => {
    const storedVersion = getSelectedVersion();
    if (storedVersion) {
      setCurrentVersion(storedVersion);
      setIsVersionSelected(true);
      applyVersionCSS(storedVersion);
    } else {
      applyVersionCSS(DEFAULT_VERSION);
    }

    const storedAccent = getSelectedAccent();
    setAccentColorState(storedAccent);
    applyAccentCSS(storedAccent);
    setIsHydrated(true);
  }, []);

  const setVersion = (version: AppVersion) => {
    setCurrentVersion(version);
    setStoredVersion(version);
    setIsVersionSelected(true);
    applyVersionCSS(version);
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
    persistAccent(color);
    applyAccentCSS(color);
  };

  return (
    <VersionContext.Provider
      value={{ currentVersion, setVersion, isVersionSelected, isHydrated, accentColor, setAccentColor }}
    >
      {children}
    </VersionContext.Provider>
  );
}

export function useVersion() {
  const context = useContext(VersionContext);
  if (context === undefined) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
}
