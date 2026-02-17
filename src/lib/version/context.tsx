/**
 * Version + appearance context for managing app version and accent color state
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AppVersion, AccentColor } from './types';
import { DEFAULT_VERSION, DEFAULT_ACCENT, ACCENT_COLOR_METADATA } from './types';
import {
  getSelectedVersion,
  setStoredVersion,
  getSelectedAccent,
  setSelectedAccent as persistAccent,
} from './storage';

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

export function VersionProvider({ children }: { children: ReactNode }) {
  const [currentVersion, setCurrentVersion] = useState<AppVersion>(DEFAULT_VERSION);
  const [isVersionSelected, setIsVersionSelected] = useState(false);
  const [accentColor, setAccentColorState] = useState<AccentColor>(DEFAULT_ACCENT);

  // Restore from storage on mount
  useEffect(() => {
    const storedVersion = getSelectedVersion();
    if (storedVersion) {
      setCurrentVersion(storedVersion);
      setIsVersionSelected(true);
    }

    const storedAccent = getSelectedAccent();
    setAccentColorState(storedAccent);
    applyAccentCSS(storedAccent);
  }, []);

  const setVersion = (version: AppVersion) => {
    setCurrentVersion(version);
    setStoredVersion(version);
    setIsVersionSelected(true);
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
