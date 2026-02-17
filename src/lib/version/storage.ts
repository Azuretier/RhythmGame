/**
 * Version and appearance storage utilities for localStorage and cookies
 */

import { UIVersion, UI_VERSIONS, AccentColor, ACCENT_COLORS, DEFAULT_ACCENT } from './types';

const STORAGE_KEY = 'azuret_app_version';
const COOKIE_NAME = 'azuret_app_version';
const APPEARANCE_KEY = 'azuret_accent_color';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Type guard to check if a string is a valid UIVersion
 */
export function isValidUIVersion(value: string): value is UIVersion {
  return UI_VERSIONS.includes(value as UIVersion);
}

/**
 * Type guard to check if a string is a valid AccentColor
 */
function isValidAccentColor(value: string): value is AccentColor {
  return ACCENT_COLORS.includes(value as AccentColor);
}

/**
 * Get the selected UI version from storage
 * Checks localStorage first, then cookies
 */
export function getSelectedVersion(): UIVersion | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // Check localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidUIVersion(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
  }

  // Check cookies as fallback
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === COOKIE_NAME) {
        const decoded = decodeURIComponent(value);
        if (isValidUIVersion(decoded)) {
          // Sync to localStorage
          localStorage.setItem(STORAGE_KEY, decoded);
          return decoded;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to read from cookies:', error);
  }

  return null;
}

/**
 * Set the selected UI version in storage
 * Saves to both localStorage and cookies
 */
export function setSelectedVersion(version: UIVersion): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }

  // Save to cookies for SSR
  try {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(version)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch (error) {
    console.warn('Failed to save to cookies:', error);
  }
}

/**
 * Check if a version has been selected
 */
export function hasVersionSelection(): boolean {
  return getSelectedVersion() !== null;
}

/**
 * Clear the version selection from storage
 */
export function clearSelectedVersion(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Clear localStorage
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }

  // Clear cookie
  try {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  } catch (error) {
    console.warn('Failed to clear cookie:', error);
  }
}

/**
 * Get the selected accent color from storage
 */
export function getSelectedAccent(): AccentColor {
  if (typeof window === 'undefined') {
    return DEFAULT_ACCENT;
  }

  try {
    const stored = localStorage.getItem(APPEARANCE_KEY);
    if (stored && isValidAccentColor(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read accent from localStorage:', error);
  }

  return DEFAULT_ACCENT;
}

/**
 * Set the selected accent color in storage
 */
export function setSelectedAccent(color: AccentColor): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(APPEARANCE_KEY, color);
  } catch (error) {
    console.warn('Failed to save accent to localStorage:', error);
  }
}

/**
 * Alias for setSelectedVersion for backward compatibility
 */
export const setStoredVersion = setSelectedVersion;
