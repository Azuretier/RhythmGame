/**
 * Version context for managing app version state
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AppVersion } from './types';
import { getStoredVersion, setStoredVersion } from './storage';

interface VersionContextType {
  currentVersion: AppVersion | null;
  setVersion: (version: AppVersion) => void;
  isVersionSelected: boolean;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export function VersionProvider({ children }: { children: ReactNode }) {
  const [currentVersion, setCurrentVersion] = useState<AppVersion | null>(null);
  const [isVersionSelected, setIsVersionSelected] = useState(false);

  useEffect(() => {
    // Load version from localStorage on mount
    const stored = getStoredVersion();
    if (stored) {
      setCurrentVersion(stored);
      setIsVersionSelected(true);
    }
  }, []);

  const setVersion = (version: AppVersion) => {
    setCurrentVersion(version);
    setStoredVersion(version);
    setIsVersionSelected(true);
  };

  return (
    <VersionContext.Provider value={{ currentVersion, setVersion, isVersionSelected }}>
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
