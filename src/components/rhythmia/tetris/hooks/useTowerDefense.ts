/**
 * Tower Defense sub-hook: enemy spawning, movement, bullet physics, and wave management.
 * Extracted from useGameState to reduce file size.
 */
import { useState, useRef, useCallback, useEffect, type MutableRefObject } from 'react';
import type { Enemy, Bullet, GamePhase, TDEnemyType, TerrainPhase } from '../types';
import {
    BOARD_WIDTH,
    MAX_HEALTH, ENEMY_HP,
    BULLET_SPEED, BULLET_GRAVITY, BULLET_KILL_RADIUS, BULLET_DAMAGE, BULLET_GROUND_Y,
    GRID_TILE_SIZE, GRID_HALF, GRID_SPAWN_RING, GRID_TOWER_RADIUS,
    TD_WAVE_BEATS,
} from '../constants';

let nextEnemyId = 0;
let nextBulletId = 0;

export interface UseTowerDefenseDeps {
    /** Refs from core game state */
    gameOverRef: MutableRefObject<boolean>;
    gamePhaseRef: MutableRefObject<GamePhase>;
    stageNumberRef: MutableRefObject<number>;
    boardRef: MutableRefObject<(string | null)[][]>;
    /** State setters from core */
    setBoard: React.Dispatch<React.SetStateAction<(string | null)[][]>>;
    setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
    setTerrainPhase: React.Dispatch<React.SetStateAction<TerrainPhase>>;
    setTdBeatsRemaining: React.Dispatch<React.SetStateAction<number>>;
    /** Ref setters for in-sync updates */
    terrainPhaseRef: MutableRefObject<TerrainPhase>;
    tdBeatsRemainingRef: MutableRefObject<number>;
    towerHealthRef: MutableRefObject<number>;
    /** Card system callbacks */
    enterCardSelect: () => void;
    enterTreasureBox: () => void;
    shouldSpawnTreasureBox: (stage: number) => boolean;
}

export function useTowerDefense(deps: UseTowerDefenseDeps) {
    const {
        gameOverRef, gamePhaseRef, stageNumberRef, boardRef,
        setBoard, setGamePhase, setTerrainPhase, setTdBeatsRemaining,
        terrainPhaseRef, tdBeatsRemainingRef, towerHealthRef,
        enterCardSelect, enterTreasureBox, shouldSpawnTreasureBox,
    } = deps;

    // ===== Tower Defense State =====
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [towerHealth, setTowerHealth] = useState(MAX_HEALTH);
    const enemiesRef = useRef<Enemy[]>(enemies);
    const bulletsRef = useRef<Bullet[]>(bullets);

    // Keep refs in sync
    useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
    useEffect(() => { bulletsRef.current = bullets; }, [bullets]);
    useEffect(() => { towerHealthRef.current = towerHealth; }, [towerHealth, towerHealthRef]);

    // Collect grid cells occupied by alive enemies
    const getOccupiedCells = useCallback((): Set<string> => {
        const set = new Set<string>();
        for (const e of enemiesRef.current) {
            if (e.alive) set.add(`${e.gridX},${e.gridZ}`);
        }
        return set;
    }, []);

    // Spawn enemies on the grid perimeter
    const spawnEnemies = useCallback((count: number) => {
        const occupied = getOccupiedCells();
        const newEnemies: Enemy[] = [];

        for (let i = 0; i < count; i++) {
            const candidates: { gx: number; gz: number }[] = [];
            for (let gx = -GRID_HALF; gx <= GRID_HALF; gx++) {
                for (let gz = -GRID_HALF; gz <= GRID_HALF; gz++) {
                    if (Math.abs(gx) + Math.abs(gz) === GRID_SPAWN_RING) {
                        const key = `${gx},${gz}`;
                        if (!occupied.has(key)) {
                            candidates.push({ gx, gz });
                        }
                    }
                }
            }

            if (candidates.length === 0) break;

            const cell = candidates[Math.floor(Math.random() * candidates.length)];
            const worldX = cell.gx * GRID_TILE_SIZE;
            const worldZ = cell.gz * GRID_TILE_SIZE;
            occupied.add(`${cell.gx},${cell.gz}`);

            const enemyTypes: TDEnemyType[] = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman'];
            newEnemies.push({
                id: nextEnemyId++,
                x: worldX,
                y: 0.5,
                z: worldZ,
                gridX: cell.gx,
                gridZ: cell.gz,
                speed: 1,
                health: ENEMY_HP,
                maxHealth: ENEMY_HP,
                alive: true,
                spawnTime: Date.now(),
                enemyType: enemyTypes[Math.floor(Math.random() * enemyTypes.length)],
            });
        }
        setEnemies(prev => [...prev, ...newEnemies]);
    }, [getOccupiedCells]);

    // Move enemies 1 tile toward tower
    const updateEnemies = useCallback((): number => {
        const current = enemiesRef.current;
        let reached = 0;
        const updated: Enemy[] = [];

        const sorted = current
            .filter(e => e.alive)
            .sort((a, b) => (Math.abs(a.gridX) + Math.abs(a.gridZ)) - (Math.abs(b.gridX) + Math.abs(b.gridZ)));

        const claimed = new Set<string>();
        const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];

        for (const e of sorted) {
            const manhattan = Math.abs(e.gridX) + Math.abs(e.gridZ);

            if (manhattan <= GRID_TOWER_RADIUS) {
                reached++;
                continue;
            }

            let bestDist = manhattan;
            let bestGx = e.gridX;
            let bestGz = e.gridZ;

            const shuffled = [...dirs].sort(() => Math.random() - 0.5);

            for (const [dx, dz] of shuffled) {
                const nx = e.gridX + dx;
                const nz = e.gridZ + dz;
                const nd = Math.abs(nx) + Math.abs(nz);

                if (nd >= manhattan) continue;

                const key = `${nx},${nz}`;
                if (claimed.has(key)) continue;

                if (nd < bestDist) {
                    bestDist = nd;
                    bestGx = nx;
                    bestGz = nz;
                }
            }

            claimed.add(`${bestGx},${bestGz}`);

            updated.push({
                ...e,
                gridX: bestGx,
                gridZ: bestGz,
                x: bestGx * GRID_TILE_SIZE,
                z: bestGz * GRID_TILE_SIZE,
            });
        }

        setEnemies(updated);
        enemiesRef.current = updated;
        return reached;
    }, []);

    // Kill closest enemies
    const killEnemies = useCallback((count: number) => {
        setEnemies(prev => {
            const alive = prev.filter(e => e.alive);
            alive.sort((a, b) => {
                const distA = Math.abs(a.gridX) + Math.abs(a.gridZ);
                const distB = Math.abs(b.gridX) + Math.abs(b.gridZ);
                return distA - distB;
            });

            const toKill = Math.min(count, alive.length);
            const survivors = alive.slice(toKill);
            return survivors;
        });
    }, []);

    // Fire a bullet from tower at the closest enemy
    const fireBullet = useCallback((): boolean => {
        const alive = enemiesRef.current.filter(e => e.alive);
        if (alive.length === 0) return false;

        let closest = alive[0];
        let closestDist = Math.abs(closest.gridX) + Math.abs(closest.gridZ);
        for (let i = 1; i < alive.length; i++) {
            const d = Math.abs(alive[i].gridX) + Math.abs(alive[i].gridZ);
            if (d < closestDist) {
                closest = alive[i];
                closestDist = d;
            }
        }

        const startY = 11;
        const targetY = 1.5;
        const dx = closest.gridX * GRID_TILE_SIZE;
        const dz = closest.gridZ * GRID_TILE_SIZE;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);

        const T = Math.max(0.3, horizontalDist / BULLET_SPEED);
        const vx = dx / T;
        const vz = dz / T;
        const vy = (targetY - startY + 0.5 * BULLET_GRAVITY * T * T) / T;

        const bullet: Bullet = {
            id: nextBulletId++,
            x: 0,
            y: startY,
            z: 0,
            vx,
            vy,
            vz,
            targetEnemyId: closest.id,
            alive: true,
        };
        setBullets(prev => [...prev, bullet]);

        return true;
    }, []);

    // Move bullets with gravity and check collision with enemies
    const lastBulletUpdateRef = useRef(Date.now());
    const updateBullets = useCallback((): number => {
        const currentBullets = bulletsRef.current;
        if (currentBullets.length === 0) {
            lastBulletUpdateRef.current = Date.now();
            return 0;
        }

        const now = Date.now();
        const dt = Math.min((now - lastBulletUpdateRef.current) / 1000, 0.5);
        lastBulletUpdateRef.current = now;

        const updatedBullets: Bullet[] = [];
        const damagedEnemyIds: Set<number> = new Set();
        let totalKills = 0;

        for (const b of currentBullets) {
            if (!b.alive) continue;

            const newVy = b.vy - BULLET_GRAVITY * dt;
            const newX = b.x + b.vx * dt;
            const newY = b.y + b.vy * dt - 0.5 * BULLET_GRAVITY * dt * dt;
            const newZ = b.z + b.vz * dt;

            if (newY <= BULLET_GROUND_Y) {
                const targetEnemy = enemiesRef.current.find(
                    e => e.id === b.targetEnemyId && e.alive
                );
                if (targetEnemy && !damagedEnemyIds.has(targetEnemy.id)) {
                    targetEnemy.health -= BULLET_DAMAGE;
                    damagedEnemyIds.add(targetEnemy.id);
                    if (targetEnemy.health <= 0) {
                        targetEnemy.alive = false;
                        totalKills++;
                    }
                }
                continue;
            }

            const targetEnemy = enemiesRef.current.find(
                e => e.id === b.targetEnemyId && e.alive
            );
            if (targetEnemy) {
                const targetDist = Math.sqrt(
                    (targetEnemy.x - newX) ** 2 + (targetEnemy.y - newY) ** 2 + (targetEnemy.z - newZ) ** 2
                );
                if (targetDist < BULLET_KILL_RADIUS) {
                    targetEnemy.health -= BULLET_DAMAGE;
                    damagedEnemyIds.add(targetEnemy.id);
                    if (targetEnemy.health <= 0) {
                        targetEnemy.alive = false;
                        totalKills++;
                    }
                    continue;
                }
            }

            if (!targetEnemy) {
                const alive = enemiesRef.current.filter(
                    e => e.alive && !damagedEnemyIds.has(e.id)
                );
                let hitEnemy: Enemy | null = null;
                let bestDist = Infinity;
                for (const e of alive) {
                    const ed = Math.sqrt(
                        (e.x - newX) ** 2 + (e.y - newY) ** 2 + (e.z - newZ) ** 2
                    );
                    if (ed < bestDist) {
                        bestDist = ed;
                        hitEnemy = e;
                    }
                }
                if (hitEnemy && bestDist < BULLET_KILL_RADIUS) {
                    hitEnemy.health -= BULLET_DAMAGE;
                    damagedEnemyIds.add(hitEnemy.id);
                    if (hitEnemy.health <= 0) {
                        hitEnemy.alive = false;
                        totalKills++;
                    }
                    continue;
                }
            }

            updatedBullets.push({
                ...b,
                x: newX,
                y: newY,
                z: newZ,
                vy: newVy,
            });
        }

        setBullets(updatedBullets);
        bulletsRef.current = updatedBullets;

        const deadEnemies = enemiesRef.current.filter(e => !e.alive);
        if (deadEnemies.length > 0) {
            const newEnemies = enemiesRef.current.filter(e => e.alive);
            setEnemies(newEnemies);
            enemiesRef.current = newEnemies;
        }

        return totalKills;
    }, []);

    // Add garbage rows to the bottom of the board
    const addGarbageRows = useCallback((count: number) => {
        const rows: (string | null)[][] = [];
        for (let g = 0; g < count; g++) {
            const gapCol = Math.floor(Math.random() * BOARD_WIDTH);
            rows.push(Array.from({ length: BOARD_WIDTH }, (_, i) => i === gapCol ? null : 'garbage'));
        }
        const newBoard = [...boardRef.current.slice(count), ...rows];
        boardRef.current = newBoard;
        setBoard(newBoard);
    }, [boardRef, setBoard]);

    // Spawn an enemy at a specific grid cell
    const spawnEnemyAtCell = useCallback((gx: number, gz: number) => {
        const occupied = getOccupiedCells();
        const key = `${gx},${gz}`;
        if (occupied.has(key)) return;

        const worldX = gx * GRID_TILE_SIZE;
        const worldZ = gz * GRID_TILE_SIZE;

        const enemyTypes: TDEnemyType[] = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman'];
        const enemy: Enemy = {
            id: nextEnemyId++,
            x: worldX, y: 0.5, z: worldZ,
            gridX: gx, gridZ: gz,
            speed: 1,
            health: ENEMY_HP,
            maxHealth: ENEMY_HP,
            alive: true,
            spawnTime: Date.now(),
            enemyType: enemyTypes[Math.floor(Math.random() * enemyTypes.length)],
        };
        setEnemies(prev => [...prev, enemy]);
        enemiesRef.current = [...enemiesRef.current, enemy];
    }, [getOccupiedCells]);

    // Enter checkpoint: transition from dig phase to TD phase
    const enterCheckpoint = useCallback(() => {
        if (gamePhaseRef.current !== 'PLAYING') return;

        setGamePhase('COLLAPSE');
        gamePhaseRef.current = 'COLLAPSE';

        setTimeout(() => {
            if (gameOverRef.current) return;

            setGamePhase('CHECKPOINT');
            gamePhaseRef.current = 'CHECKPOINT';

            setTerrainPhase('td');
            terrainPhaseRef.current = 'td';

            setEnemies([]);
            enemiesRef.current = [];
            setBullets([]);
            bulletsRef.current = [];
            setTowerHealth(MAX_HEALTH);
            towerHealthRef.current = MAX_HEALTH;
            setTdBeatsRemaining(TD_WAVE_BEATS);
            tdBeatsRemainingRef.current = TD_WAVE_BEATS;

            setTimeout(() => {
                if (gameOverRef.current) return;

                setGamePhase('PLAYING');
                gamePhaseRef.current = 'PLAYING';
            }, 1500);
        }, 1200);
    }, [gamePhaseRef, gameOverRef, setGamePhase, setTerrainPhase, terrainPhaseRef, setTdBeatsRemaining, tdBeatsRemainingRef, towerHealthRef]);

    // Complete TD wave: transition back to dig phase
    const completeWave = useCallback(() => {
        if (gamePhaseRef.current !== 'PLAYING') return;

        setGamePhase('COLLAPSE');
        gamePhaseRef.current = 'COLLAPSE';

        setEnemies([]);
        enemiesRef.current = [];
        setBullets([]);
        bulletsRef.current = [];

        setTimeout(() => {
            if (gameOverRef.current) return;

            if (shouldSpawnTreasureBox(stageNumberRef.current)) {
                enterTreasureBox();
            } else {
                enterCardSelect();
            }
        }, 1200);
    }, [gamePhaseRef, gameOverRef, setGamePhase, stageNumberRef, enterCardSelect, shouldSpawnTreasureBox, enterTreasureBox]);

    // Reset TD state for new game
    const resetTowerDefense = useCallback(() => {
        setEnemies([]);
        enemiesRef.current = [];
        setBullets([]);
        bulletsRef.current = [];
        setTowerHealth(MAX_HEALTH);
        towerHealthRef.current = MAX_HEALTH;
        nextEnemyId = 0;
        nextBulletId = 0;
    }, [towerHealthRef]);

    return {
        // State
        enemies,
        bullets,
        towerHealth,
        enemiesRef,
        bulletsRef,
        // Actions
        spawnEnemies,
        updateEnemies,
        killEnemies,
        fireBullet,
        updateBullets,
        addGarbageRows,
        spawnEnemyAtCell,
        enterCheckpoint,
        completeWave,
        resetTowerDefense,
        // Setters
        setEnemies,
        setTowerHealth,
    };
}
