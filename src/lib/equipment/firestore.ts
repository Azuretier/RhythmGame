/**
 * Firestore sync service for equipment data.
 *
 * Stub implementation — logs warnings when called.
 * When a dedicated Firebase project is configured for equipment,
 * replace these stubs with real Firestore read/write operations
 * following the pattern in @/lib/advancements/firestore.ts.
 */

import type { EquipmentState } from './types';

/**
 * Sync local equipment state to Firestore.
 */
export async function syncEquipmentToFirestore(uid: string, state: EquipmentState): Promise<void> {
    console.warn('[Equipment] syncEquipmentToFirestore is a stub — Firestore not configured for equipment.', { uid, itemCount: state.inventory.length });
}

/**
 * Load equipment state from Firestore.
 */
export async function loadEquipmentFromFirestore(uid: string): Promise<EquipmentState | null> {
    console.warn('[Equipment] loadEquipmentFromFirestore is a stub — Firestore not configured for equipment.', { uid });
    return null;
}
