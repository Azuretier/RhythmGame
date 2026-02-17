const UI_THEME_STORAGE_KEY = 'azuret_ui_theme';

export function getStoredUiThemeId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(UI_THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredUiThemeId(themeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, themeId);
  } catch {
    // localStorage may be full or disabled
  }
}
