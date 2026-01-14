/**
 * Version storage utilities for persisting user's version selection
 */

import type { AppVersion } from './types';

const VERSION_STORAGE_KEY = 'azuret_app_version';

/**
 * Get the stored version from localStorage
 */
export function getStoredVersion(): AppVersion | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(VERSION_STORAGE_KEY);
    if (stored === '1.0.0' || stored === '1.0.1') {
      return stored;
    }
  } catch (error) {
    console.error('Failed to read version from storage:', error);
  }
  
  return null;
}

/**
 * Store the selected version in localStorage
 */
export function setStoredVersion(version: AppVersion): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, version);
  } catch (error) {
    console.error('Failed to store version:', error);
  }
}

/**
 * Clear the stored version
 */
export function clearStoredVersion(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(VERSION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear version from storage:', error);
  }
}
