import type { EquipmentState } from './types';
import { DEFAULT_EQUIPMENT_STATE } from './types';

const STORAGE_KEY = 'rhythmia_equipment';

/**
 * Load equipment state from localStorage.
 */
export function loadEquipmentState(): EquipmentState {
    if (typeof window === 'undefined') return DEFAULT_EQUIPMENT_STATE;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_EQUIPMENT_STATE;
        return { ...DEFAULT_EQUIPMENT_STATE, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_EQUIPMENT_STATE;
    }
}

/**
 * Save equipment state to localStorage.
 */
export function saveEquipmentState(state: EquipmentState): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Storage full or unavailable
    }
}
