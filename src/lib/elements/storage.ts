import type { ElementalPreferences } from './types';
import { DEFAULT_ELEMENTAL_PREFERENCES } from './types';

const STORAGE_KEY = 'rhythmia_elemental_preferences';

/**
 * Load elemental preferences from localStorage.
 */
export function loadElementalPreferences(): ElementalPreferences {
    if (typeof window === 'undefined') return DEFAULT_ELEMENTAL_PREFERENCES;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_ELEMENTAL_PREFERENCES;
        return { ...DEFAULT_ELEMENTAL_PREFERENCES, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_ELEMENTAL_PREFERENCES;
    }
}

/**
 * Save elemental preferences to localStorage.
 */
export function saveElementalPreferences(prefs: ElementalPreferences): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        // Storage full or unavailable
    }
}
