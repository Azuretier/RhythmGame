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
  // Always initialize with defaults so server and client produce identical
  // initial renders — this prevents React hydration mismatches that caused
  // the component tree to tear down and rebuild (black screen flash).
  const [currentVersion, setCurrentVersion] = useState<AppVersion>(DEFAULT_VERSION);
  const [isVersionSelected, setIsVersionSelected] = useState(false);
  const [accentColor, setAccentColorState] = useState<AccentColor>(DEFAULT_ACCENT);

  // Read persisted values in a layout effect — runs after hydration commit but
  // BEFORE the browser paints, so the user never sees the default version flash.
  // State updates here trigger a synchronous re-render before paint.
  useIsomorphicLayoutEffect(() => {
    const storedVersion = getSelectedVersion();
    const storedAccent = getSelectedAccent();

    if (storedVersion) {
      setCurrentVersion(storedVersion);
      setIsVersionSelected(true);
    }
    if (storedAccent !== DEFAULT_ACCENT) {
      setAccentColorState(storedAccent);
    }

    applyVersionCSS(storedVersion || DEFAULT_VERSION);
    applyAccentCSS(storedAccent);
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
