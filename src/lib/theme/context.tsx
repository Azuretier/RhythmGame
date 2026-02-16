'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { UiTheme } from './types';
import { UI_THEME_PRESETS, DEFAULT_UI_THEME_ID, getUiThemeById } from './types';
import { getStoredUiThemeId, setStoredUiThemeId } from './storage';

interface UiThemeContextType {
  currentTheme: UiTheme;
  setTheme: (themeId: string) => void;
  themes: UiTheme[];
}

const UiThemeContext = createContext<UiThemeContextType | undefined>(undefined);

function applyThemeToDocument(theme: UiTheme) {
  const root = document.documentElement;
  // Remove all theme classes first
  UI_THEME_PRESETS.forEach(t => {
    root.classList.remove(t.cssClass);
  });
  // Apply the selected theme class
  root.classList.add(theme.cssClass);
}

export function UiThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<UiTheme>(
    () => getUiThemeById(DEFAULT_UI_THEME_ID)!
  );

  useEffect(() => {
    const storedId = getStoredUiThemeId();
    const theme = storedId ? getUiThemeById(storedId) : null;
    if (theme) {
      setCurrentTheme(theme);
      applyThemeToDocument(theme);
    } else {
      applyThemeToDocument(currentTheme);
    }
  }, []);

  const setTheme = useCallback((themeId: string) => {
    const theme = getUiThemeById(themeId);
    if (!theme) return;
    setCurrentTheme(theme);
    setStoredUiThemeId(themeId);
    applyThemeToDocument(theme);
  }, []);

  return (
    <UiThemeContext.Provider value={{ currentTheme, setTheme, themes: UI_THEME_PRESETS }}>
      {children}
    </UiThemeContext.Provider>
  );
}

export function useUiTheme() {
  const context = useContext(UiThemeContext);
  if (context === undefined) {
    throw new Error('useUiTheme must be used within a UiThemeProvider');
  }
  return context;
}
