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

// useLayoutEffect on client (prevents flash of wrong version), useEffect on server (avoids SSR warning)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface VersionContextType {
  currentVersion: AppVersion;
  setVersion: (version: AppVersion) => void;
  isVersionSelected: boolean;
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
  // Eagerly read from localStorage during state initialization so the first
  // client render already uses the correct version — eliminates the two-phase
  // render that caused tree structure changes and black screen flashes.
  const [currentVersion, setCurrentVersion] = useState<AppVersion>(() => {
    if (typeof window !== 'undefined') {
      return getSelectedVersion() || DEFAULT_VERSION;
    }
    return DEFAULT_VERSION;
  });
  const [isVersionSelected, setIsVersionSelected] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!getSelectedVersion();
    }
    return false;
  });
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    if (typeof window !== 'undefined') {
      return getSelectedAccent();
    }
    return DEFAULT_ACCENT;
  });

  // Apply CSS attributes on mount (DOM attributes still need explicit application)
  useIsomorphicLayoutEffect(() => {
    applyVersionCSS(currentVersion);
    applyAccentCSS(accentColor);
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
      value={{ currentVersion, setVersion, isVersionSelected, accentColor, setAccentColor }}
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
