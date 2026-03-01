'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { InventoryState } from './types';
import { DEFAULT_INVENTORY_STATE } from './types';
import { ITEM_REGISTRY } from '@/lib/items/registry';
import { loadInventoryState, saveInventoryState } from './storage';

interface InventoryContextType {
    state: InventoryState;
    /** Add items to inventory. Returns the actual count added (respects maxStack). */
    addItem: (itemId: string, count?: number) => number;
    /** Remove items from inventory. Returns the actual count removed. */
    removeItem: (itemId: string, count?: number) => number;
    /** Use (consume) an item. Returns true if successfully consumed. */
    useItem: (itemId: string) => boolean;
    /** Get the count of a specific item. */
    getItemCount: (itemId: string) => number;
    /** Check if inventory has at least `count` of an item. */
    hasItem: (itemId: string, count?: number) => boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<InventoryState>(DEFAULT_INVENTORY_STATE);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = loadInventoryState();
        setState(stored);
    }, []);

    // Save to localStorage on state changes
    useEffect(() => {
        if (state !== DEFAULT_INVENTORY_STATE) {
            saveInventoryState(state);
        }
    }, [state]);

    const addItem = useCallback((itemId: string, count: number = 1): number => {
        const definition = ITEM_REGISTRY[itemId];
        if (!definition || count <= 0) return 0;

        let actualAdded = 0;

        setState(prev => {
            const existing = prev.items.find(e => e.itemId === itemId);

            if (existing) {
                // Stack onto existing entry, capped by maxStack
                const space = definition.maxStack - existing.count;
                const toAdd = Math.min(count, space);
                if (toAdd <= 0) {
                    actualAdded = 0;
                    return prev;
                }

                actualAdded = toAdd;
                return {
                    ...prev,
                    items: prev.items.map(e =>
                        e.itemId === itemId ? { ...e, count: e.count + toAdd } : e,
                    ),
                    totalCollected: prev.totalCollected + toAdd,
                    lastUpdated: Date.now(),
                };
            } else {
                // New stack — check slot capacity
                if (prev.items.length >= prev.maxSlots) {
                    actualAdded = 0;
                    return prev;
                }

                const toAdd = Math.min(count, definition.maxStack);
                actualAdded = toAdd;
                return {
                    ...prev,
                    items: [...prev.items, { itemId, count: toAdd }],
                    totalCollected: prev.totalCollected + toAdd,
                    lastUpdated: Date.now(),
                };
            }
        });

        return actualAdded;
    }, []);

    const removeItem = useCallback((itemId: string, count: number = 1): number => {
        if (count <= 0) return 0;

        let actualRemoved = 0;

        setState(prev => {
            const existing = prev.items.find(e => e.itemId === itemId);
            if (!existing) {
                actualRemoved = 0;
                return prev;
            }

            const toRemove = Math.min(count, existing.count);
            actualRemoved = toRemove;

            const newCount = existing.count - toRemove;

            return {
                ...prev,
                items: newCount > 0
                    ? prev.items.map(e =>
                        e.itemId === itemId ? { ...e, count: newCount } : e,
                    )
                    : prev.items.filter(e => e.itemId !== itemId),
                lastUpdated: Date.now(),
            };
        });

        return actualRemoved;
    }, []);

    const useItem = useCallback((itemId: string): boolean => {
        const definition = ITEM_REGISTRY[itemId];
        if (!definition || definition.category !== 'consumable') return false;

        let consumed = false;

        setState(prev => {
            const existing = prev.items.find(e => e.itemId === itemId);
            if (!existing || existing.count <= 0) {
                consumed = false;
                return prev;
            }

            consumed = true;
            const newCount = existing.count - 1;

            return {
                ...prev,
                items: newCount > 0
                    ? prev.items.map(e =>
                        e.itemId === itemId ? { ...e, count: newCount } : e,
                    )
                    : prev.items.filter(e => e.itemId !== itemId),
                totalConsumed: prev.totalConsumed + 1,
                lastUpdated: Date.now(),
            };
        });

        return consumed;
    }, []);

    const getItemCount = useCallback((itemId: string): number => {
        return state.items.find(e => e.itemId === itemId)?.count ?? 0;
    }, [state.items]);

    const hasItem = useCallback((itemId: string, count: number = 1): boolean => {
        return getItemCount(itemId) >= count;
    }, [getItemCount]);

    return (
        <InventoryContext.Provider value={{ state, addItem, removeItem, useItem, getItemCount, hasItem }}>
            {children}
        </InventoryContext.Provider>
    );
}

export function useInventory() {
    const context = useContext(InventoryContext);
    if (context === undefined) {
        throw new Error('useInventory must be used within an InventoryProvider');
    }
    return context;
}
