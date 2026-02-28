import type { InventoryState } from './types';
import { DEFAULT_INVENTORY_STATE } from './types';

const STORAGE_KEY = 'rhythmia_inventory';

/**
 * Load inventory state from localStorage.
 */
export function loadInventoryState(): InventoryState {
    if (typeof window === 'undefined') return DEFAULT_INVENTORY_STATE;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_INVENTORY_STATE;
        return { ...DEFAULT_INVENTORY_STATE, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_INVENTORY_STATE;
    }
}

/**
 * Save inventory state to localStorage.
 */
export function saveInventoryState(state: InventoryState): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Storage full or unavailable
    }
}
