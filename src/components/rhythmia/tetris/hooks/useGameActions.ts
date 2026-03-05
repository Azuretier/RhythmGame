// ===== useGameActions =====
// Provides stable action methods that create GameAction objects and dispatch them.
// In single-player mode, dispatch calls engine functions directly.
// In multiplayer mode (future), dispatch sends actions over the network.

import { useCallback } from 'react';
import type { TowerType } from '../galaxy-types';
import type { GameAction } from '../galaxy-actions';

interface UseGameActionsProps {
    dispatch: (action: GameAction) => void;
}

export function useGameActions({ dispatch }: UseGameActionsProps) {
    const placeTower = useCallback((towerType: TowerType, slotIndex: number) => {
        dispatch({ type: 'place_tower', towerType, slotIndex });
    }, [dispatch]);

    const sellTower = useCallback((towerId: string) => {
        dispatch({ type: 'sell_tower', towerId });
    }, [dispatch]);

    const upgradeTower = useCallback((towerId: string) => {
        dispatch({ type: 'upgrade_tower', towerId });
    }, [dispatch]);

    const selectTowerType = useCallback((towerType: TowerType | null) => {
        dispatch({ type: 'select_tower_type', towerType });
    }, [dispatch]);

    const selectTower = useCallback((towerId: string | null) => {
        dispatch({ type: 'select_tower', towerId });
    }, [dispatch]);

    const onLineClear = useCallback((lineCount: number) => {
        dispatch({ type: 'line_clear', lineCount });
    }, [dispatch]);

    const tick = useCallback((dt: number) => {
        dispatch({ type: 'tick', dt });
    }, [dispatch]);

    const startWave = useCallback(() => {
        dispatch({ type: 'start_wave' });
    }, [dispatch]);

    const reset = useCallback(() => {
        dispatch({ type: 'reset' });
    }, [dispatch]);

    return {
        placeTower,
        sellTower,
        upgradeTower,
        selectTowerType,
        selectTower,
        onLineClear,
        tick,
        startWave,
        reset,
    };
}
