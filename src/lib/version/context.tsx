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
  isValidUIVersion,
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

export function VersionProvider({ children, initialVersion }: { children: ReactNode; initialVersion?: string }) {
  // Initialize from the server-provided cookie value when available.
  // This ensures server and client produce identical initial renders for the
  // stored version, preventing the component tree from rebuilding on hydration
  // (which caused the title logo to briefly appear then disappear into a black screen).
  const resolvedInitial = initialVersion && isValidUIVersion(initialVersion)
    ? (initialVersion as AppVersion)
    : DEFAULT_VERSION;

  const [currentVersion, setCurrentVersion] = useState<AppVersion>(resolvedInitial);
  const [isVersionSelected, setIsVersionSelected] = useState(resolvedInitial !== DEFAULT_VERSION);
  const [accentColor, setAccentColorState] = useState<AccentColor>(DEFAULT_ACCENT);

  // Read persisted values in a layout effect as a fallback — handles cases where
  // the cookie is missing but localStorage has the version (e.g., cookie expired).
  // Runs after hydration commit but BEFORE the browser paints.
  useIsomorphicLayoutEffect(() => {
    const storedVersion = getSelectedVersion();
    const storedAccent = getSelectedAccent();

    if (storedVersion && storedVersion !== resolvedInitial) {
      setCurrentVersion(storedVersion);
      setIsVersionSelected(true);
    }
    if (storedAccent !== DEFAULT_ACCENT) {
      setAccentColorState(storedAccent);
    }

    applyVersionCSS(storedVersion || resolvedInitial);
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
