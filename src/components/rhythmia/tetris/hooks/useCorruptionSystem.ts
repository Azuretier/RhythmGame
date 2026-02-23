import { useState, useCallback, useEffect, useRef } from 'react';
import type { CorruptionNode } from '../types';
import {
    CORRUPTION_CHANCE_PER_SECOND,
    CORRUPTION_GROWTH_INTERVAL,
    CORRUPTION_MAX_LEVEL,
    CORRUPTION_MAX_TERRAIN_NODES,
    CORRUPTION_SPREAD_CHANCE,
    CORRUPTION_ENEMY_SPAWN_CHANCE,
    CORRUPTION_ANOMALY_THRESHOLD,
    TERRAIN_RADIUS,
    GRID_TOWER_RADIUS,
} from '../constants';

let nextCorruptionId = 0;

/**
 * Check if a grid cell is within the circular TD terrain
 * (Manhattan distance from origin ≤ TERRAIN_RADIUS, but excluding tower radius)
 */
function isValidTerrainCell(gx: number, gz: number): boolean {
    const dist = Math.abs(gx) + Math.abs(gz);
    return dist > GRID_TOWER_RADIUS && dist <= TERRAIN_RADIUS;
}

interface UseCorruptionSystemProps {
    isPlaying: boolean;
    isPaused: boolean;
    gameOver: boolean;
    terrainPhase: string;
    onCorruptionSpawnEnemy: (gx: number, gz: number) => void;
}

export function useCorruptionSystem({
    isPlaying,
    isPaused,
    gameOver,
    terrainPhase,
    onCorruptionSpawnEnemy,
}: UseCorruptionSystemProps) {
    const [corruptedCells, setCorruptedCells] = useState<Map<string, CorruptionNode>>(new Map());
    const [activeAnomaly, setActiveAnomaly] = useState(false);

    // Refs for stable interval access
    const corruptedCellsRef = useRef(corruptedCells);
    const isPausedRef = useRef(isPaused);
    const gameOverRef = useRef(gameOver);
    const onCorruptionSpawnEnemyRef = useRef(onCorruptionSpawnEnemy);

    useEffect(() => { corruptedCellsRef.current = corruptedCells; }, [corruptedCells]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
    useEffect(() => { onCorruptionSpawnEnemyRef.current = onCorruptionSpawnEnemy; }, [onCorruptionSpawnEnemy]);

    // ===== Corruption Seeding — chance per second to infect a terrain block =====
    const seedCorruption = useCallback(() => {
        if (Math.random() > CORRUPTION_CHANCE_PER_SECOND) return;

        const now = Date.now();
        setCorruptedCells(prev => {
            if (prev.size >= CORRUPTION_MAX_TERRAIN_NODES) return prev;

            // Find a random valid terrain cell not already corrupted
            let gx: number, gz: number;
            let attempts = 0;
            do {
                gx = Math.floor(Math.random() * (TERRAIN_RADIUS * 2 + 1)) - TERRAIN_RADIUS;
                gz = Math.floor(Math.random() * (TERRAIN_RADIUS * 2 + 1)) - TERRAIN_RADIUS;
                attempts++;
            } while (
                (!isValidTerrainCell(gx, gz) || prev.has(`${gx},${gz}`)) &&
                attempts < 50
            );

            if (!isValidTerrainCell(gx, gz) || prev.has(`${gx},${gz}`)) return prev;

            const node: CorruptionNode = {
                id: nextCorruptionId++,
                gx, gz,
                level: 0,
                maxLevel: CORRUPTION_MAX_LEVEL,
                spawnTime: now,
                lastGrowTime: now,
            };

            const next = new Map(prev);
            next.set(`${gx},${gz}`, node);
            return next;
        });
    }, []);

    // ===== Corruption Growth — grow all nodes +1 level, chance to spread =====
    const growCorruption = useCallback(() => {
        const now = Date.now();
        setCorruptedCells(prev => {
            const next = new Map<string, CorruptionNode>();
            const spreadCandidates: CorruptionNode[] = [];

            for (const [key, node] of prev) {
                const newLevel = Math.min(node.level + 1, CORRUPTION_MAX_LEVEL);
                next.set(key, { ...node, level: newLevel, lastGrowTime: now });

                // Chance to spread
                if (Math.random() < CORRUPTION_SPREAD_CHANCE) {
                    spreadCandidates.push(node);
                }
            }

            // Handle spread
            for (const parent of spreadCandidates) {
                if (next.size >= CORRUPTION_MAX_TERRAIN_NODES) break;
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                const ngx = parent.gx + dir[0];
                const ngz = parent.gz + dir[1];
                const nkey = `${ngx},${ngz}`;

                if (isValidTerrainCell(ngx, ngz) && !next.has(nkey)) {
                    next.set(nkey, {
                        id: nextCorruptionId++,
                        gx: ngx, gz: ngz,
                        level: 0,
                        maxLevel: CORRUPTION_MAX_LEVEL,
                        spawnTime: now,
                        lastGrowTime: now,
                    });
                }
            }

            return next;
        });
    }, []);

    // ===== Spawn enemies from mature corrupted cells (called by parent on each beat) =====
    const spawnFromCorruption = useCallback(() => {
        const cells = corruptedCellsRef.current;
        for (const [, node] of cells) {
            if (node.level >= CORRUPTION_MAX_LEVEL) {
                if (Math.random() < CORRUPTION_ENEMY_SPAWN_CHANCE) {
                    onCorruptionSpawnEnemyRef.current(node.gx, node.gz);
                }
            }
        }
    }, []);

    // ===== Reset =====
    const reset = useCallback(() => {
        setCorruptedCells(new Map());
        setActiveAnomaly(false);
        nextCorruptionId = 0;
    }, []);

    // ===== Corruption Seed Timer (1 check per second, TD phase only) =====
    useEffect(() => {
        if (!isPlaying || gameOver || terrainPhase !== 'td') return;

        const timer = window.setInterval(() => {
            if (isPausedRef.current || gameOverRef.current) return;
            seedCorruption();
        }, 1000);

        return () => clearInterval(timer);
    }, [isPlaying, gameOver, terrainPhase, seedCorruption]);

    // ===== Corruption Growth Timer (TD phase only) =====
    useEffect(() => {
        if (!isPlaying || gameOver || terrainPhase !== 'td') return;

        const timer = window.setInterval(() => {
            if (isPausedRef.current || gameOverRef.current) return;
            growCorruption();
        }, CORRUPTION_GROWTH_INTERVAL);

        return () => clearInterval(timer);
    }, [isPlaying, gameOver, terrainPhase, growCorruption]);

    // ===== Anomaly state tracking =====
    useEffect(() => {
        setActiveAnomaly(corruptedCells.size >= CORRUPTION_ANOMALY_THRESHOLD);
    }, [corruptedCells]);

    return {
        corruptedCells,
        activeAnomaly,
        spawnFromCorruption,
        reset,
    };
}
