/**
 * Version storage utilities for persisting user's UI version selection
 */

import { UIVersion, DEFAULT_VERSION } from './types';

const STORAGE_KEY = 'azuret_ui_version';
const COOKIE_NAME = 'azuret_ui_version';
const COOKIE_MAX_AGE = 31536000; // 1 year in seconds

/**
 * Get the selected version from localStorage
 */
export function getSelectedVersion(): UIVersion | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '1.0.0' || stored === '1.0.1') {
      return stored;
    }
  } catch (error) {
    console.error('Error reading version from localStorage:', error);
  }
  
  return null;
}

/**
 * Set the selected version in localStorage and cookie
 */
export function setSelectedVersion(version: UIVersion): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, version);
    // Also set a cookie for SSR/initial routing
    document.cookie = `${COOKIE_NAME}=${version}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch (error) {
    console.error('Error saving version:', error);
  }
}

/**
 * Clear the selected version (for testing/reset)
 */
export function clearSelectedVersion(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    // Clear the cookie
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  } catch (error) {
    console.error('Error clearing version:', error);
  }
}

/**
 * Check if user has made a version selection
 */
export function hasVersionSelection(): boolean {
  return getSelectedVersion() !== null;
}
