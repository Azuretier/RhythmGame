import { useState, useCallback, useEffect, useRef } from 'react';
import type { TowerType, GalaxyTDState } from '../galaxy-types';
import {
    GALAXY_GOLD_PER_SINGLE,
    GALAXY_GOLD_PER_DOUBLE,
    GALAXY_GOLD_PER_TRIPLE,
    GALAXY_GOLD_PER_TETRIS,
    GALAXY_TETRIS_AOE_DAMAGE,
} from '../galaxy-constants';
import {
    createInitialState,
    updateRingGame,
    placeTower as enginePlaceTower,
    sellTower as engineSellTower,
    upgradeTower as engineUpgradeTower,
    startWave as engineStartWave,
    applyTetrisAoE,
} from '@/lib/tower-defense/ring-engine';

interface UseGalaxyTDProps {
    isPaused: boolean;
    gameOver: boolean;
    terrainPhase: string;
}

/** Manages the Galaxy TD ring game state: tower placement, enemy waves, gold economy, and per-beat ticking. */
export function useGalaxyTD({
    isPaused,
    gameOver,
}: UseGalaxyTDProps) {
    const [state, setState] = useState<GalaxyTDState>(() => createInitialState());

    const isPausedRef = useRef(isPaused);
    const gameOverRef = useRef(gameOver);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

    // Kill tracking for item drops (compare alive count before/after tick)
    const recentKillsRef = useRef(0);

    // ===== Tick (called each beat with dt in seconds) =====
    const tick = useCallback((dt: number) => {
        if (isPausedRef.current || gameOverRef.current) return;

        setState(prev => {
            // Auto-start wave if in build phase
            let s = prev;
            if (s.phase === 'build' && s.currentWave < s.totalWaves) {
                s = engineStartWave(s);
            }
            const aliveBefore = s.enemies.filter(e => !e.dead).length;
            s = updateRingGame(s, dt);
            const aliveAfter = s.enemies.filter(e => !e.dead).length;
            recentKillsRef.current = Math.max(0, aliveBefore - aliveAfter);
            return s;
        });
    }, []);

    // ===== Line clear handler (grants gold, Tetris = AoE) =====
    const onLineClear = useCallback((lineCount: number) => {
        let goldAmount: number;
        if (lineCount >= 4) {
            goldAmount = GALAXY_GOLD_PER_TETRIS;
        } else if (lineCount === 3) {
            goldAmount = GALAXY_GOLD_PER_TRIPLE;
        } else if (lineCount === 2) {
            goldAmount = GALAXY_GOLD_PER_DOUBLE;
        } else {
            goldAmount = GALAXY_GOLD_PER_SINGLE;
        }

        setState(prev => {
            let s = { ...prev, gold: prev.gold + goldAmount };
            if (lineCount >= 4) {
                s = applyTetrisAoE(s, GALAXY_TETRIS_AOE_DAMAGE);
            }
            return s;
        });
    }, []);

    // ===== Tower placement =====
    const placeTower = useCallback((type: TowerType, slotIndex: number) => {
        setState(prev => enginePlaceTower(prev, type, slotIndex));
    }, []);

    // ===== Tower sell =====
    const sellTower = useCallback((towerId: string) => {
        setState(prev => engineSellTower(prev, towerId));
    }, []);

    // ===== Tower upgrade =====
    const upgradeTower = useCallback((towerId: string) => {
        setState(prev => engineUpgradeTower(prev, towerId));
    }, []);

    // ===== Select tower type for placement =====
    const selectTowerType = useCallback((type: TowerType | null) => {
        setState(prev => ({ ...prev, selectedTowerType: type, selectedTowerId: null }));
    }, []);

    // ===== Select existing tower =====
    const selectTower = useCallback((towerId: string | null) => {
        setState(prev => ({ ...prev, selectedTowerId: towerId, selectedTowerType: null }));
    }, []);

    // ===== Manually start wave =====
    const triggerStartWave = useCallback(() => {
        setState(prev => engineStartWave(prev));
    }, []);

    // ===== Reset =====
    const reset = useCallback(() => {
        setState(createInitialState());
    }, []);

    // Clear enemies on game over only (ring stays active across phases)
    const [prevGameOver, setPrevGameOver] = useState(gameOver);
    if (prevGameOver !== gameOver) {
        setPrevGameOver(gameOver);
        if (gameOver) {
            setState(prev => ({
                ...prev,
                enemies: [],
                projectiles: [],
                spawnTracker: null,
                phase: 'build' as const,
            }));
        }
    }

    return {
        state,
        enemies: state.enemies,
        towers: state.towers,
        projectiles: state.projectiles,
        gates: state.gates,
        towerSlots: state.towerSlots,
        waveNumber: state.currentWave,
        gold: state.gold,
        lives: state.lives,
        selectedTowerType: state.selectedTowerType,
        selectedTowerId: state.selectedTowerId,
        phase: state.phase,
        recentKillsRef,
        tick,
        onLineClear,
        placeTower,
        sellTower,
        upgradeTower,
        selectTowerType,
        selectTower,
        startWave: triggerStartWave,
        reset,
    };
}
