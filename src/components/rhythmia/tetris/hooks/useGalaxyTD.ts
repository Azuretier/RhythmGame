import { useState, useCallback, useEffect, useRef } from 'react';
import type { GalaxyRingEnemy, GalaxyTower, GalaxyGate, GalaxyRingSide } from '../galaxy-types';
import {
    GALAXY_ENEMY_BASE_SPEED,
    GALAXY_ENEMY_BASE_HP,
    GALAXY_ENEMIES_PER_WAVE,
    GALAXY_WAVE_SPAWN_INTERVAL,
    GALAXY_WAVE_COOLDOWN,
    GALAXY_GATE_HP,
    GALAXY_TOWER_MAX_CHARGE,
    GALAXY_TOWER_DAMAGE,
    GALAXY_TOWER_RANGE,
    GALAXY_CHARGE_PER_SINGLE,
    GALAXY_CHARGE_PER_DOUBLE,
    GALAXY_CHARGE_PER_TRIPLE,
    GALAXY_TETRIS_AOE_DAMAGE,
    GALAXY_TOWERS_PER_SIDE_TB,
    GALAXY_TOWERS_PER_SIDE_LR,
    GALAXY_SIDE_BOUNDARIES,
} from '../galaxy-constants';

let nextEnemyId = 1;
let nextTowerId = 1;

// ===== Initial tower layout (pre-placed at fixed positions) =====
function createInitialTowers(): GalaxyTower[] {
    const towers: GalaxyTower[] = [];
    const sides: { side: GalaxyRingSide; count: number }[] = [
        { side: 'top', count: GALAXY_TOWERS_PER_SIDE_TB },
        { side: 'bottom', count: GALAXY_TOWERS_PER_SIDE_TB },
        { side: 'left', count: GALAXY_TOWERS_PER_SIDE_LR },
        { side: 'right', count: GALAXY_TOWERS_PER_SIDE_LR },
    ];

    for (const { side, count } of sides) {
        for (let i = 0; i < count; i++) {
            towers.push({
                id: nextTowerId++,
                side,
                index: i,
                charge: 0,
                maxCharge: GALAXY_TOWER_MAX_CHARGE,
                lastFireTime: 0,
                level: 1,
            });
        }
    }
    return towers;
}

// ===== Initial gates =====
function createInitialGates(): GalaxyGate[] {
    return (['top', 'right', 'bottom', 'left'] as GalaxyRingSide[]).map(side => ({
        side,
        health: GALAXY_GATE_HP,
        maxHealth: GALAXY_GATE_HP,
    }));
}

// Get the path-fraction position for a tower based on its side and index
function getTowerPathPosition(tower: GalaxyTower): number {
    const bounds = GALAXY_SIDE_BOUNDARIES[tower.side];
    const count = (tower.side === 'top' || tower.side === 'bottom')
        ? GALAXY_TOWERS_PER_SIDE_TB
        : GALAXY_TOWERS_PER_SIDE_LR;
    // Offset by ring depth (3 cells) so towers align with the board, not the corners
    const sideLength = bounds.end - bounds.start;
    const padding = (tower.side === 'top' || tower.side === 'bottom')
        ? sideLength * (3 / 16)  // skip 3 corner cells out of 16 total
        : 0;
    const usableLength = sideLength - 2 * padding;
    return bounds.start + padding + (tower.index + 0.5) * (usableLength / count);
}

interface UseGalaxyTDProps {
    isPlaying: boolean;
    isPaused: boolean;
    gameOver: boolean;
    terrainPhase: string;
}

export function useGalaxyTD({
    isPlaying,
    isPaused,
    gameOver,
    terrainPhase,
}: UseGalaxyTDProps) {
    const [enemies, setEnemies] = useState<GalaxyRingEnemy[]>([]);
    const [towers, setTowers] = useState<GalaxyTower[]>(() => createInitialTowers());
    const [gates, setGates] = useState<GalaxyGate[]>(() => createInitialGates());
    const [waveNumber, setWaveNumber] = useState(0);

    // Beat tracking for wave spawning
    const beatCountRef = useRef(0);
    const spawnsRemainingRef = useRef(0);
    const waveCooldownRef = useRef(0);

    // Refs for stable access in callbacks
    const enemiesRef = useRef(enemies);
    const towersRef = useRef(towers);
    const gatesRef = useRef(gates);
    const isPausedRef = useRef(isPaused);
    const gameOverRef = useRef(gameOver);

    useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
    useEffect(() => { towersRef.current = towers; }, [towers]);
    useEffect(() => { gatesRef.current = gates; }, [gates]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

    // ===== Spawn a single enemy at a random start position =====
    const spawnEnemy = useCallback(() => {
        // Enemies spawn at position 0 (top-left corner) with slight random offset
        const offset = Math.random() * 0.02;
        const enemy: GalaxyRingEnemy = {
            id: nextEnemyId++,
            pathPosition: offset,
            speed: GALAXY_ENEMY_BASE_SPEED * (1 + Math.random() * 0.3),
            health: GALAXY_ENEMY_BASE_HP,
            maxHealth: GALAXY_ENEMY_BASE_HP,
            alive: true,
            spawnTime: Date.now(),
        };
        setEnemies(prev => [...prev, enemy]);
    }, []);

    // ===== Move all enemies along the path =====
    const moveEnemies = useCallback(() => {
        setEnemies(prev => {
            let gatesDamaged = false;
            const updated = prev.map(e => {
                if (!e.alive) return e;
                const newPos = e.pathPosition + e.speed;
                if (newPos >= 1.0) {
                    // Enemy completed the loop — damage a gate and despawn
                    gatesDamaged = true;
                    return { ...e, pathPosition: 1.0, alive: false };
                }
                return { ...e, pathPosition: newPos };
            });

            // Damage gates for enemies that completed the loop
            if (gatesDamaged) {
                const looped = updated.filter(e => !e.alive && e.pathPosition >= 1.0);
                if (looped.length > 0) {
                    setGates(prevGates => prevGates.map(g => ({
                        ...g,
                        health: Math.max(0, g.health - looped.length * 5),
                    })));
                }
            }

            // Remove dead enemies
            return updated.filter(e => e.alive);
        });
    }, []);

    // ===== Fire towers at nearby enemies =====
    const fireTowers = useCallback(() => {
        const now = Date.now();
        const currentEnemies = enemiesRef.current;
        const aliveEnemies = currentEnemies.filter(e => e.alive);
        if (aliveEnemies.length === 0) return;

        setTowers(prev => {
            const updatedTowers = prev.map(tower => {
                if (tower.charge <= 0) return tower;
                if (now - tower.lastFireTime < 500) return tower; // Minimum fire cooldown

                const towerPos = getTowerPathPosition(tower);

                // Find nearest enemy within range
                let nearestEnemy: GalaxyRingEnemy | null = null;
                let nearestDist = Infinity;

                for (const enemy of aliveEnemies) {
                    if (!enemy.alive) continue;
                    // Calculate shortest path distance (wrapping around 0/1 boundary)
                    const rawDist = Math.abs(enemy.pathPosition - towerPos);
                    const dist = Math.min(rawDist, 1 - rawDist);
                    if (dist < GALAXY_TOWER_RANGE && dist < nearestDist) {
                        nearestDist = dist;
                        nearestEnemy = enemy;
                    }
                }

                if (!nearestEnemy) return tower;

                // Fire! Reduce charge and damage enemy
                return {
                    ...tower,
                    charge: tower.charge - 1,
                    lastFireTime: now,
                };
            });

            // Apply damage to enemies from towers that fired
            const firedTowers = updatedTowers.filter((t, i) =>
                t.lastFireTime === now && prev[i].lastFireTime !== now
            );

            if (firedTowers.length > 0) {
                setEnemies(prevEnemies => {
                    const updated = [...prevEnemies];
                    for (const tower of firedTowers) {
                        const towerPos = getTowerPathPosition(tower);
                        // Find and damage the nearest enemy
                        let bestIdx = -1;
                        let bestDist = Infinity;
                        for (let i = 0; i < updated.length; i++) {
                            if (!updated[i].alive) continue;
                            const rawDist = Math.abs(updated[i].pathPosition - towerPos);
                            const dist = Math.min(rawDist, 1 - rawDist);
                            if (dist < GALAXY_TOWER_RANGE && dist < bestDist) {
                                bestDist = dist;
                                bestIdx = i;
                            }
                        }
                        if (bestIdx >= 0) {
                            const e = updated[bestIdx];
                            const newHp = e.health - GALAXY_TOWER_DAMAGE * tower.level;
                            updated[bestIdx] = {
                                ...e,
                                health: newHp,
                                alive: newHp > 0,
                            };
                        }
                    }
                    return updated.filter(e => e.alive);
                });
            }

            return updatedTowers;
        });
    }, []);

    // ===== Tick (called each beat during dig phase) =====
    const tick = useCallback(() => {
        if (isPausedRef.current || gameOverRef.current) return;

        beatCountRef.current++;

        // Wave spawning logic
        if (spawnsRemainingRef.current > 0) {
            if (beatCountRef.current % GALAXY_WAVE_SPAWN_INTERVAL === 0) {
                spawnEnemy();
                spawnsRemainingRef.current--;
            }
        } else if (waveCooldownRef.current > 0) {
            waveCooldownRef.current--;
        } else {
            // Start new wave
            setWaveNumber(prev => prev + 1);
            spawnsRemainingRef.current = GALAXY_ENEMIES_PER_WAVE;
            waveCooldownRef.current = GALAXY_WAVE_COOLDOWN;
        }

        // Move enemies
        moveEnemies();

        // Fire charged towers
        fireTowers();
    }, [spawnEnemy, moveEnemies, fireTowers]);

    // ===== Line clear handler (charges towers) =====
    const onLineClear = useCallback((lineCount: number) => {
        // Determine charge amount
        let chargeAmount: number;
        if (lineCount >= 4) {
            chargeAmount = GALAXY_CHARGE_PER_TRIPLE; // Tetris also gives max charge
        } else if (lineCount === 3) {
            chargeAmount = GALAXY_CHARGE_PER_TRIPLE;
        } else if (lineCount === 2) {
            chargeAmount = GALAXY_CHARGE_PER_DOUBLE;
        } else {
            chargeAmount = GALAXY_CHARGE_PER_SINGLE;
        }

        // Charge towers — distribute charge to towers with lowest charge first
        setTowers(prev => {
            const sorted = [...prev].sort((a, b) => a.charge - b.charge);
            let remaining = chargeAmount;
            const updated = new Map<number, GalaxyTower>();

            for (const tower of sorted) {
                if (remaining <= 0) break;
                const spaceAvailable = tower.maxCharge - tower.charge;
                if (spaceAvailable <= 0) continue;
                const given = Math.min(remaining, spaceAvailable);
                updated.set(tower.id, {
                    ...tower,
                    charge: tower.charge + given,
                    level: tower.charge + given >= tower.maxCharge ? tower.level + 1 : tower.level,
                });
                remaining -= given;
            }

            return prev.map(t => updated.get(t.id) || t);
        });

        // Tetris (4 lines) also deals AOE damage to all enemies
        if (lineCount >= 4) {
            setEnemies(prev =>
                prev.map(e => {
                    if (!e.alive) return e;
                    const newHp = e.health - GALAXY_TETRIS_AOE_DAMAGE;
                    return { ...e, health: newHp, alive: newHp > 0 };
                }).filter(e => e.alive)
            );
        }

        // Triple (3 lines) triggers burst fire from all charged towers
        if (lineCount >= 3) {
            const now = Date.now();
            setTowers(prev => prev.map(t =>
                t.charge > 0 ? { ...t, lastFireTime: now } : t
            ));
            // Burst damage: each charged tower hits nearest enemy
            fireTowers();
        }
    }, [fireTowers]);

    // ===== Reset =====
    const reset = useCallback(() => {
        nextEnemyId = 1;
        nextTowerId = 1;
        setEnemies([]);
        setTowers(createInitialTowers());
        setGates(createInitialGates());
        setWaveNumber(0);
        beatCountRef.current = 0;
        spawnsRemainingRef.current = 0;
        waveCooldownRef.current = 0;
    }, []);

    // Reset when entering non-dig phases or game over
    useEffect(() => {
        if (terrainPhase !== 'dig' || gameOver) {
            // Don't fully reset towers on phase change — keep levels earned
            setEnemies([]);
            spawnsRemainingRef.current = 0;
            waveCooldownRef.current = 0;
            beatCountRef.current = 0;
        }
    }, [terrainPhase, gameOver]);

    return {
        enemies,
        towers,
        gates,
        waveNumber,
        tick,
        onLineClear,
        reset,
    };
}
