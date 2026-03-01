import type { InventoryEntry } from '@/lib/items/types';

// ===== Inventory State =====

export interface InventoryState {
    /** Item entries keyed by itemId with counts */
    items: InventoryEntry[];
    /** Maximum number of distinct item stacks */
    maxSlots: number;
    /** Total number of items ever collected */
    totalCollected: number;
    /** Total number of items ever consumed / used */
    totalConsumed: number;
    /** Last time the inventory was updated (epoch ms) */
    lastUpdated: number;
}

export const DEFAULT_INVENTORY_STATE: InventoryState = {
    items: [],
    maxSlots: 40,
    totalCollected: 0,
    totalConsumed: 0,
    lastUpdated: 0,
};

// ===== Sort & Filter =====

export type InventorySortType = 'category' | 'rarity' | 'count' | 'name';
export type InventoryFilterType = 'all' | 'material' | 'consumable' | 'equipment' | 'relic' | 'currency';
