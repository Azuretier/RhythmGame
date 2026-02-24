'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type {
    EquipmentState, EquipmentInstance, EquipmentSlot,
    EquipmentLoadout, EquipmentBonuses,
} from './types';
import { DEFAULT_EQUIPMENT_STATE, DEFAULT_EQUIPMENT_BONUSES } from './types';
import { EQUIPMENT_REGISTRY } from './definitions';
import { computeEquipmentBonuses, scrapEquipment as scrapEquipmentEngine } from './engine';
import { loadEquipmentState, saveEquipmentState } from './storage';

interface EquipmentContextType {
    state: EquipmentState;
    /** Equip an item by instanceId into its correct slot */
    equip: (instanceId: string) => void;
    /** Unequip the item from a specific slot */
    unequip: (slot: EquipmentSlot) => void;
    /** Scrap an equipment instance, removing it from inventory. Returns materials. */
    scrap: (instanceId: string) => { itemId: string; count: number }[];
    /** Add a new equipment instance to inventory */
    addToInventory: (instance: EquipmentInstance) => boolean;
    /** Get the current aggregated bonuses from all equipped items */
    getBonuses: () => EquipmentBonuses;
}

const EquipmentContext = createContext<EquipmentContextType | undefined>(undefined);

export function EquipmentProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<EquipmentState>(DEFAULT_EQUIPMENT_STATE);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = loadEquipmentState();
        setState(stored);
    }, []);

    // Save to localStorage on state changes (skip initial default state)
    useEffect(() => {
        // Only save if we have loaded at least once (totalObtained or inventory non-default)
        if (state !== DEFAULT_EQUIPMENT_STATE) {
            saveEquipmentState(state);
        }
    }, [state]);

    const equip = useCallback((instanceId: string) => {
        setState(prev => {
            const instance = prev.inventory.find(i => i.instanceId === instanceId);
            if (!instance) return prev;

            const definition = EQUIPMENT_REGISTRY[instance.equipmentId];
            if (!definition) return prev;

            const slot = definition.slot;
            const newLoadout: EquipmentLoadout = { ...prev.loadout, [slot]: instanceId };

            return { ...prev, loadout: newLoadout };
        });
    }, []);

    const unequip = useCallback((slot: EquipmentSlot) => {
        setState(prev => {
            const newLoadout: EquipmentLoadout = { ...prev.loadout, [slot]: null };
            return { ...prev, loadout: newLoadout };
        });
    }, []);

    const scrap = useCallback((instanceId: string): { itemId: string; count: number }[] => {
        let materials: { itemId: string; count: number }[] = [];

        setState(prev => {
            const instance = prev.inventory.find(i => i.instanceId === instanceId);
            if (!instance) return prev;

            materials = scrapEquipmentEngine(instance);

            // Remove from inventory
            const newInventory = prev.inventory.filter(i => i.instanceId !== instanceId);

            // Clear from loadout if equipped
            const newLoadout = { ...prev.loadout };
            for (const slot of Object.keys(newLoadout) as EquipmentSlot[]) {
                if (newLoadout[slot] === instanceId) {
                    newLoadout[slot] = null;
                }
            }

            return {
                ...prev,
                inventory: newInventory,
                loadout: newLoadout,
                totalScrapped: prev.totalScrapped + 1,
            };
        });

        return materials;
    }, []);

    const addToInventory = useCallback((instance: EquipmentInstance): boolean => {
        let added = false;

        setState(prev => {
            if (prev.inventory.length >= prev.maxInventorySize) {
                added = false;
                return prev;
            }

            added = true;
            return {
                ...prev,
                inventory: [...prev.inventory, instance],
                totalObtained: prev.totalObtained + 1,
            };
        });

        return added;
    }, []);

    const getBonuses = useCallback((): EquipmentBonuses => {
        if (!state.loadout.weapon && !state.loadout.armor && !state.loadout.accessory && !state.loadout.charm) {
            return DEFAULT_EQUIPMENT_BONUSES;
        }
        return computeEquipmentBonuses(state.loadout, state.inventory);
    }, [state.loadout, state.inventory]);

    return (
        <EquipmentContext.Provider value={{ state, equip, unequip, scrap, addToInventory, getBonuses }}>
            {children}
        </EquipmentContext.Provider>
    );
}

export function useEquipment() {
    const context = useContext(EquipmentContext);
    if (context === undefined) {
        throw new Error('useEquipment must be used within an EquipmentProvider');
    }
    return context;
}
