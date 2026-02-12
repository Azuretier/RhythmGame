import { useState, useRef, useEffect, useCallback } from 'react';
import type { Piece, Board, KeyState, GamePhase, GameMode, InventoryItem, FloatingItem, CraftedCard, TerrainParticle, Enemy, Bullet } from '../types';
import {
    BOARD_WIDTH, DEFAULT_DAS, DEFAULT_ARR, DEFAULT_SDF, ColorTheme,
    ITEMS, TOTAL_DROP_WEIGHT, WEAPON_CARDS, WEAPON_CARD_MAP, WORLDS,
    ITEMS_PER_TERRAIN_DAMAGE, MAX_FLOATING_ITEMS, FLOAT_DURATION,
    TERRAIN_PARTICLES_PER_LINE, TERRAIN_PARTICLE_LIFETIME,
    TERRAINS_PER_WORLD,
    ENEMY_SPAWN_DISTANCE, ENEMY_BASE_SPEED, ENEMY_TOWER_RADIUS,
    ENEMIES_PER_BEAT, ENEMIES_KILLED_PER_LINE,
    MAX_HEALTH, ENEMY_REACH_DAMAGE, ENEMY_HP,
    BULLET_SPEED, BULLET_GRAVITY, BULLET_KILL_RADIUS, BULLET_DAMAGE, BULLET_GROUND_Y,
    GRID_TILE_SIZE, GRID_HALF, GRID_SPAWN_RING, GRID_TOWER_RADIUS,
} from '../constants';
import { createEmptyBoard, shuffleBag, getShape, isValidPosition, createSpawnPiece } from '../utils/boardUtils';

let nextFloatingId = 0;
let nextParticleId = 0;
let nextEnemyId = 0;
let nextBulletId = 0;

/**
 * Roll a random item based on drop weights
 */
function rollItem(): string {
    let roll = Math.random() * TOTAL_DROP_WEIGHT;
    for (const item of ITEMS) {
        roll -= item.dropWeight;
        if (roll <= 0) return item.id;
    }
    return ITEMS[0].id;
}

/**
 * Custom hook for managing game state with synchronized refs
 */
export function useGameState() {
    // Core game state
    const [board, setBoard] = useState<Board>(createEmptyBoard());
    const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
    const [nextPiece, setNextPiece] = useState<string>('');
    const [holdPiece, setHoldPiece] = useState<string | null>(null);
    const [canHold, setCanHold] = useState(true);
    const [pieceBag, setPieceBag] = useState<string[]>(shuffleBag());
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [lines, setLines] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // Game mode
    const [gameMode, setGameMode] = useState<GameMode>('vanilla');

    // Rhythm game state
    const [worldIdx, setWorldIdx] = useState(0);
    const [stageNumber, setStageNumber] = useState(1);
    const [terrainSeed, setTerrainSeed] = useState(42);
    const [terrainDestroyedCount, setTerrainDestroyedCount] = useState(0);
    const [terrainTotal, setTerrainTotal] = useState(0);
    const [beatPhase, setBeatPhase] = useState(0);
    const [judgmentText, setJudgmentText] = useState('');
    const [judgmentColor, setJudgmentColor] = useState('');
    const [showJudgmentAnim, setShowJudgmentAnim] = useState(false);
    const [boardBeat, setBoardBeat] = useState(false);
    const [boardShake, setBoardShake] = useState(false);
    const [scorePop, setScorePop] = useState(false);

    // DAS/ARR/SDF settings (adjustable)
    const [das, setDas] = useState(DEFAULT_DAS);
    const [arr, setArr] = useState(DEFAULT_ARR);
    const [sdf, setSdf] = useState(DEFAULT_SDF);

    // Color theme
    const [colorTheme, setColorTheme] = useState<ColorTheme>('stage');

    // ===== Game Loop Phase =====
    const [gamePhase, setGamePhase] = useState<GamePhase>('WORLD_CREATION');

    // ===== Item System =====
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
    const [terrainParticles, setTerrainParticles] = useState<TerrainParticle[]>([]);

    // ===== Weapon Cards =====
    const [craftedCards, setCraftedCards] = useState<CraftedCard[]>([]);
    const [showCraftUI, setShowCraftUI] = useState(false);

    // ===== Inventory & Shop UI =====
    const [showInventory, setShowInventory] = useState(false);
    const [showShop, setShowShop] = useState(false);
    const [gold, setGold] = useState(0);

    // ===== Tower Defense =====
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [towerHealth, setTowerHealth] = useState(MAX_HEALTH);

    // Computed: total damage multiplier from all crafted cards
    const damageMultiplier = craftedCards.reduce((mult, card) => {
        const def = WEAPON_CARD_MAP[card.cardId];
        return def ? mult * def.damageMultiplier : mult;
    }, 1);

    // Refs for accessing current values in callbacks (avoids stale closures)
    const gameLoopRef = useRef<number | null>(null);
    const beatTimerRef = useRef<number | null>(null);
    const lastBeatRef = useRef(Date.now());
    const lastGravityRef = useRef<number>(0);

    // State refs for use in game loop
    const boardRef = useRef<Board>(createEmptyBoard());
    const currentPieceRef = useRef<Piece | null>(null);
    const nextPieceRef = useRef(nextPiece);
    const pieceBagRef = useRef<string[]>(pieceBag);
    const holdPieceRef = useRef<string | null>(holdPiece);
    const canHoldRef = useRef(canHold);
    const scoreRef = useRef(0);
    const comboRef = useRef(combo);
    const linesRef = useRef(lines);
    const dasRef = useRef(das);
    const arrRef = useRef(arr);
    const sdfRef = useRef(sdf);
    const levelRef = useRef(level);
    const gameOverRef = useRef(gameOver);
    const isPausedRef = useRef(isPaused);
    const worldIdxRef = useRef(worldIdx);
    const stageNumberRef = useRef(stageNumber);
    const terrainDestroyedCountRef = useRef(terrainDestroyedCount);
    const terrainTotalRef = useRef(terrainTotal);
    const beatPhaseRef = useRef(beatPhase);
    const damageMultiplierRef = useRef(damageMultiplier);
    const enemiesRef = useRef<Enemy[]>(enemies);
    const bulletsRef = useRef<Bullet[]>(bullets);
    const towerHealthRef = useRef(towerHealth);
    const gameModeRef = useRef<GameMode>(gameMode);

    // Key states for DAS/ARR
    const keyStatesRef = useRef<Record<string, KeyState>>({
        left: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
        right: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
        down: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
    });

    // Keep refs in sync with state
    useEffect(() => { boardRef.current = board; }, [board]);
    useEffect(() => { currentPieceRef.current = currentPiece; }, [currentPiece]);
    useEffect(() => { nextPieceRef.current = nextPiece; }, [nextPiece]);
    useEffect(() => { pieceBagRef.current = pieceBag; }, [pieceBag]);
    useEffect(() => { holdPieceRef.current = holdPiece; }, [holdPiece]);
    useEffect(() => { canHoldRef.current = canHold; }, [canHold]);
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { comboRef.current = combo; }, [combo]);
    useEffect(() => { linesRef.current = lines; }, [lines]);
    useEffect(() => { dasRef.current = das; }, [das]);
    useEffect(() => { arrRef.current = arr; }, [arr]);
    useEffect(() => { sdfRef.current = sdf; }, [sdf]);
    useEffect(() => { levelRef.current = level; }, [level]);
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { worldIdxRef.current = worldIdx; }, [worldIdx]);
    useEffect(() => { stageNumberRef.current = stageNumber; }, [stageNumber]);
    useEffect(() => { terrainDestroyedCountRef.current = terrainDestroyedCount; }, [terrainDestroyedCount]);
    useEffect(() => { terrainTotalRef.current = terrainTotal; }, [terrainTotal]);
    useEffect(() => { beatPhaseRef.current = beatPhase; }, [beatPhase]);
    useEffect(() => { damageMultiplierRef.current = damageMultiplier; }, [damageMultiplier]);
    useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
    useEffect(() => { bulletsRef.current = bullets; }, [bullets]);
    useEffect(() => { towerHealthRef.current = towerHealth; }, [towerHealth]);
    useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);

    // Get next piece from seven-bag system
    const getNextFromBag = useCallback((): string => {
        let bag = [...pieceBagRef.current];
        if (bag.length === 0) {
            bag = shuffleBag();
        }
        const piece = bag.shift()!;
        setPieceBag(bag);
        return piece;
    }, []);

    // Spawn a new piece
    const spawnPiece = useCallback((): Piece | null => {
        const type = nextPieceRef.current;
        const newPiece = createSpawnPiece(type);

        setNextPiece(getNextFromBag());
        setCanHold(true);

        if (!isValidPosition(newPiece, boardRef.current)) {
            setGameOver(true);
            setIsPlaying(false);
            return null;
        }

        return newPiece;
    }, [getNextFromBag]);

    // Show judgment text with animation
    const showJudgment = useCallback((text: string, color: string) => {
        setJudgmentText(text);
        setJudgmentColor(color);
        setShowJudgmentAnim(false);
        requestAnimationFrame(() => {
            setShowJudgmentAnim(true);
        });
    }, []);

    // Update score with pop animation — also grants gold
    const updateScore = useCallback((newScore: number) => {
        const earned = Math.max(0, newScore - scoreRef.current);
        setScore(newScore);
        setGold(prev => prev + earned);
        setScorePop(true);
        setTimeout(() => setScorePop(false), 100);
    }, []);

    // Trigger board shake effect
    const triggerBoardShake = useCallback(() => {
        setBoardShake(true);
        setTimeout(() => setBoardShake(false), 200);
    }, []);

    // Reset key states
    const resetKeyStates = useCallback(() => {
        keyStatesRef.current = {
            left: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
            right: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
            down: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
        };
    }, []);

    // Called by VoxelWorldBackground when terrain is generated/regenerated
    const handleTerrainReady = useCallback((totalBlocks: number) => {
        setTerrainTotal(totalBlocks);
        terrainTotalRef.current = totalBlocks;
    }, []);

    // Destroy terrain blocks by incrementing the destroyed count
    const destroyTerrain = useCallback((count: number): number => {
        const newDestroyed = Math.min(
            terrainDestroyedCountRef.current + count,
            terrainTotalRef.current
        );
        setTerrainDestroyedCount(newDestroyed);
        terrainDestroyedCountRef.current = newDestroyed;
        const remaining = terrainTotalRef.current - newDestroyed;
        return remaining;
    }, []);

    // Start a new terrain stage — advances world when enough terrains are cleared
    const startNewStage = useCallback((newStageNumber: number) => {
        setStageNumber(newStageNumber);
        stageNumberRef.current = newStageNumber;

        // Advance world based on completed stages (stage 1 = first terrain of world 0)
        const newWorldIdx = Math.min(
            Math.floor((newStageNumber - 1) / TERRAINS_PER_WORLD),
            WORLDS.length - 1
        );
        setWorldIdx(newWorldIdx);
        worldIdxRef.current = newWorldIdx;

        // New seed triggers VoxelWorldBackground regeneration
        setTerrainSeed(newStageNumber * 7919 + 42);
        setTerrainDestroyedCount(0);
        terrainDestroyedCountRef.current = 0;
    }, []);

    // ===== Item System Actions =====

    // Spawn floating items from terrain destruction
    const spawnItemDrops = useCallback((damage: number, originX: number, originY: number) => {
        const itemCount = Math.max(1, Math.floor(damage * ITEMS_PER_TERRAIN_DAMAGE));
        const now = Date.now();
        const newItems: FloatingItem[] = [];

        for (let i = 0; i < Math.min(itemCount, MAX_FLOATING_ITEMS); i++) {
            const itemId = rollItem();
            newItems.push({
                id: nextFloatingId++,
                itemId,
                x: originX + (Math.random() - 0.5) * 200,
                y: originY + (Math.random() - 0.5) * 100,
                targetX: originX,
                targetY: originY + 300,
                startTime: now + i * 80,
                duration: FLOAT_DURATION + Math.random() * 200,
                collected: false,
            });
        }

        setFloatingItems(prev => [...prev, ...newItems].slice(-MAX_FLOATING_ITEMS * 2));

        // Schedule item collection
        setTimeout(() => {
            setFloatingItems(prev => prev.map(fi =>
                newItems.some(ni => ni.id === fi.id) ? { ...fi, collected: true } : fi
            ));
            // Add items to inventory
            const itemCounts: Record<string, number> = {};
            newItems.forEach(fi => {
                itemCounts[fi.itemId] = (itemCounts[fi.itemId] || 0) + 1;
            });
            setInventory(prev => {
                const updated = [...prev];
                Object.entries(itemCounts).forEach(([itemId, count]) => {
                    const existing = updated.find(i => i.itemId === itemId);
                    if (existing) {
                        existing.count += count;
                    } else {
                        updated.push({ itemId, count });
                    }
                });
                return updated;
            });
        }, FLOAT_DURATION + itemCount * 80 + 200);

        // Clean up collected floating items
        setTimeout(() => {
            setFloatingItems(prev => prev.filter(fi => !newItems.some(ni => ni.id === fi.id)));
        }, FLOAT_DURATION + itemCount * 80 + 600);
    }, []);

    // Spawn terrain destruction particles
    const spawnTerrainParticles = useCallback((originX: number, originY: number, count: number, color?: string) => {
        const now = Date.now();
        const newParticles: TerrainParticle[] = [];
        const colors = ['#8B8B8B', '#B87333', '#4FC3F7', '#FFD700', '#9C27B0', '#FFFFFF'];

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 2 + Math.random() * 6;
            newParticles.push({
                id: nextParticleId++,
                x: originX + (Math.random() - 0.5) * 40,
                y: originY + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                size: 3 + Math.random() * 6,
                color: color || colors[Math.floor(Math.random() * colors.length)],
                opacity: 0.8 + Math.random() * 0.2,
                life: TERRAIN_PARTICLE_LIFETIME,
                maxLife: TERRAIN_PARTICLE_LIFETIME,
            });
        }

        setTerrainParticles(prev => [...prev, ...newParticles].slice(-200));

        // Clean up after lifetime
        setTimeout(() => {
            setTerrainParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
        }, TERRAIN_PARTICLE_LIFETIME + 100);
    }, []);

    // ===== Tower Defense Enemy Actions =====

    // Collect grid cells occupied by alive enemies (for collision avoidance)
    const getOccupiedCells = useCallback((): Set<string> => {
        const set = new Set<string>();
        for (const e of enemiesRef.current) {
            if (e.alive) set.add(`${e.gridX},${e.gridZ}`);
        }
        return set;
    }, []);

    // Spawn enemies on the grid perimeter (Manhattan distance = GRID_SPAWN_RING from center)
    const spawnEnemies = useCallback((count: number) => {
        const occupied = getOccupiedCells();
        const newEnemies: Enemy[] = [];

        for (let i = 0; i < count; i++) {
            // Build list of available perimeter cells at Manhattan distance = GRID_SPAWN_RING
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

            if (candidates.length === 0) break; // No available spawn cells

            const cell = candidates[Math.floor(Math.random() * candidates.length)];
            const worldX = cell.gx * GRID_TILE_SIZE;
            const worldZ = cell.gz * GRID_TILE_SIZE;
            occupied.add(`${cell.gx},${cell.gz}`);

            newEnemies.push({
                id: nextEnemyId++,
                x: worldX,
                y: 0.5,
                z: worldZ,
                gridX: cell.gx,
                gridZ: cell.gz,
                speed: 1, // 1 tile per turn (grid system)
                health: ENEMY_HP,
                maxHealth: ENEMY_HP,
                alive: true,
                spawnTime: Date.now(),
            });
        }
        setEnemies(prev => [...prev, ...newEnemies]);
    }, [getOccupiedCells]);

    // Move enemies 1 tile toward tower using orthogonal-only movement (no diagonals).
    // Each enemy picks the best cardinal direction (Up/Down/Left/Right) that reduces
    // Manhattan distance to (0,0), avoiding occupied cells. Returns number that reached tower.
    const updateEnemies = useCallback((): number => {
        const current = enemiesRef.current;
        let reached = 0;
        const updated: Enemy[] = [];

        // Build set of cells that will be occupied after movement.
        // Process enemies closest to tower first so they get priority on cell claims.
        const sorted = current
            .filter(e => e.alive)
            .sort((a, b) => (Math.abs(a.gridX) + Math.abs(a.gridZ)) - (Math.abs(b.gridX) + Math.abs(b.gridZ)));

        const claimed = new Set<string>();

        // Orthogonal directions: Up, Down, Left, Right
        const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];

        for (const e of sorted) {
            const manhattan = Math.abs(e.gridX) + Math.abs(e.gridZ);

            // Check if enemy has reached the tower
            if (manhattan <= GRID_TOWER_RADIUS) {
                reached++;
                continue; // removed from game
            }

            // Evaluate orthogonal neighbors — pick the one closest to (0,0)
            let bestDist = manhattan; // staying still is the fallback
            let bestGx = e.gridX;
            let bestGz = e.gridZ;

            // Shuffle directions to break ties randomly
            const shuffled = [...dirs].sort(() => Math.random() - 0.5);

            for (const [dx, dz] of shuffled) {
                const nx = e.gridX + dx;
                const nz = e.gridZ + dz;
                const nd = Math.abs(nx) + Math.abs(nz);

                // Must reduce distance (move closer to tower)
                if (nd >= manhattan) continue;

                const key = `${nx},${nz}`;
                if (claimed.has(key)) continue; // cell taken

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

    // Kill closest enemies (when lines are cleared) — removed instantly
    // Uses Manhattan distance (tile distance) for sorting
    const killEnemies = useCallback((count: number) => {
        setEnemies(prev => {
            const alive = prev.filter(e => e.alive);
            alive.sort((a, b) => {
                const distA = Math.abs(a.gridX) + Math.abs(a.gridZ);
                const distB = Math.abs(b.gridX) + Math.abs(b.gridZ);
                return distA - distB;
            });

            // Remove the closest ones entirely
            const toKill = Math.min(count, alive.length);
            const survivors = alive.slice(toKill);
            return survivors;
        });
    }, []);

    // Fire a bullet from tower at the closest enemy (no mana cost)
    // Uses Manhattan distance (tile distance) for targeting priority
    const fireBullet = useCallback((): boolean => {
        const alive = enemiesRef.current.filter(e => e.alive);
        if (alive.length === 0) return false;

        // Find closest enemy by Manhattan distance
        let closest = alive[0];
        let closestDist = Math.abs(closest.gridX) + Math.abs(closest.gridZ);
        for (let i = 1; i < alive.length; i++) {
            const d = Math.abs(alive[i].gridX) + Math.abs(alive[i].gridZ);
            if (d < closestDist) {
                closest = alive[i];
                closestDist = d;
            }
        }

        // Calculate parabolic arc velocity from turret to enemy
        const startY = 11;
        const targetY = 1.5;
        const dx = closest.gridX * GRID_TILE_SIZE;
        const dz = closest.gridZ * GRID_TILE_SIZE;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);

        // Flight time based on horizontal speed
        const T = Math.max(0.3, horizontalDist / BULLET_SPEED);

        // Horizontal velocity components
        const vx = dx / T;
        const vz = dz / T;

        // Vertical velocity: solve y = y0 + vy*t - 0.5*g*t² for vy
        // targetY = startY + vy*T - 0.5*g*T²
        // vy = (targetY - startY + 0.5*g*T²) / T
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
    // Returns the number of enemies killed this update
    const lastBulletUpdateRef = useRef(Date.now());
    const updateBullets = useCallback((): number => {
        const currentBullets = bulletsRef.current;
        if (currentBullets.length === 0) {
            lastBulletUpdateRef.current = Date.now();
            return 0;
        }

        const now = Date.now();
        const dt = Math.min((now - lastBulletUpdateRef.current) / 1000, 0.5); // seconds, capped
        lastBulletUpdateRef.current = now;

        const updatedBullets: Bullet[] = [];
        const damagedEnemyIds: Set<number> = new Set();
        let totalKills = 0;

        for (const b of currentBullets) {
            if (!b.alive) continue;

            // Apply gravity and update position using Velocity Verlet (matches rendering)
            const newVy = b.vy - BULLET_GRAVITY * dt;
            const newX = b.x + b.vx * dt;
            const newY = b.y + b.vy * dt - 0.5 * BULLET_GRAVITY * dt * dt;
            const newZ = b.z + b.vz * dt;

            // Check if bullet hit the ground — guaranteed hit on targeted enemy
            if (newY <= BULLET_GROUND_Y) {
                // Bullet has landed — damage the targeted enemy wherever it is
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
                continue; // bullet consumed
            }

            // In-flight proximity check — if bullet passes close to targeted enemy mid-arc
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

            // If targeted enemy is dead, check for any nearby enemy
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

            // Bullet still in flight
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

        // Remove dead enemies
        const deadEnemies = enemiesRef.current.filter(e => !e.alive);
        if (deadEnemies.length > 0) {
            const newEnemies = enemiesRef.current.filter(e => e.alive);
            setEnemies(newEnemies);
            enemiesRef.current = newEnemies;
        }

        return totalKills;
    }, []);

    // Craft a weapon card
    const craftCard = useCallback((cardId: string): boolean => {
        const card = WEAPON_CARD_MAP[cardId];
        if (!card) return false;

        // Check if we have all required items
        const inventoryCopy = inventory.map(i => ({ ...i }));
        for (const req of card.recipe) {
            const item = inventoryCopy.find(i => i.itemId === req.itemId);
            if (!item || item.count < req.count) return false;
        }

        // Deduct items
        for (const req of card.recipe) {
            const item = inventoryCopy.find(i => i.itemId === req.itemId)!;
            item.count -= req.count;
        }

        setInventory(inventoryCopy.filter(i => i.count > 0));
        setCraftedCards(prev => [...prev, { cardId, craftedAt: Date.now() }]);
        return true;
    }, [inventory]);

    // Check if a card can be crafted
    const canCraftCard = useCallback((cardId: string): boolean => {
        const card = WEAPON_CARD_MAP[cardId];
        if (!card) return false;
        return card.recipe.every(req => {
            const item = inventory.find(i => i.itemId === req.itemId);
            return item && item.count >= req.count;
        });
    }, [inventory]);

    // Toggle craft UI
    const toggleCraftUI = useCallback(() => {
        setShowCraftUI(prev => !prev);
        if (!showCraftUI) {
            setGamePhase('CRAFTING');
            setIsPaused(true);
        } else {
            setGamePhase('PLAYING');
            setIsPaused(false);
        }
    }, [showCraftUI]);

    // Toggle inventory UI
    const toggleInventory = useCallback(() => {
        setShowInventory(prev => {
            const next = !prev;
            if (next) {
                // Close other overlays
                setShowShop(false);
                setShowCraftUI(false);
                setIsPaused(true);
            } else {
                setIsPaused(false);
                setGamePhase('PLAYING');
            }
            return next;
        });
    }, []);

    // Toggle shop UI
    const toggleShop = useCallback(() => {
        setShowShop(prev => {
            const next = !prev;
            if (next) {
                // Close other overlays
                setShowInventory(false);
                setShowCraftUI(false);
                setIsPaused(true);
            } else {
                setIsPaused(false);
                setGamePhase('PLAYING');
            }
            return next;
        });
    }, []);

    // Purchase item from shop using gold
    const purchaseItem = useCallback((itemId: string, price: number): boolean => {
        if (gold < price) return false;
        setGold(prev => prev - price);

        // Check if it's a weapon card
        const weaponCard = WEAPON_CARD_MAP[itemId];
        if (weaponCard) {
            setCraftedCards(prev => [...prev, { cardId: itemId, craftedAt: Date.now() }]);
            return true;
        }

        // It's a material — add to inventory
        setInventory(prev => {
            const updated = [...prev];
            const existing = updated.find(i => i.itemId === itemId);
            if (existing) {
                existing.count += 1;
            } else {
                updated.push({ itemId, count: 1 });
            }
            return updated;
        });
        return true;
    }, [gold, inventory]);

    // Set phase to PLAYING (after world creation animation)
    const enterPlayPhase = useCallback(() => {
        setGamePhase('PLAYING');
    }, []);

    // Trigger collapse phase when terrain fully destroyed
    const triggerCollapse = useCallback(() => {
        setGamePhase('COLLAPSE');
    }, []);

    // Trigger transition phase (new world construction)
    const triggerTransition = useCallback(() => {
        setGamePhase('TRANSITION');
    }, []);

    // Trigger world creation phase
    const triggerWorldCreation = useCallback(() => {
        setGamePhase('WORLD_CREATION');
    }, []);

    // Initialize/reset game
    const initGame = useCallback((mode: GameMode = 'vanilla') => {
        setGameMode(mode);
        gameModeRef.current = mode;

        setBoard(createEmptyBoard());
        boardRef.current = createEmptyBoard();
        setScore(0);
        setCombo(0);
        setLines(0);
        setLevel(1);
        setWorldIdx(0);

        // Initialize terrain for stage 1
        setStageNumber(1);
        stageNumberRef.current = 1;
        setTerrainSeed(42);
        setTerrainDestroyedCount(0);
        terrainDestroyedCountRef.current = 0;

        setGameOver(false);
        setIsPaused(false);
        setIsPlaying(true);

        // Reset game loop state
        setGamePhase('WORLD_CREATION');
        setInventory([]);
        setCraftedCards([]);
        setFloatingItems([]);
        setTerrainParticles([]);
        setShowCraftUI(false);
        setShowInventory(false);
        setShowShop(false);
        setGold(0);

        // Reset tower defense state (always reset, only used in TD mode)
        setEnemies([]);
        enemiesRef.current = [];
        setBullets([]);
        bulletsRef.current = [];
        setTowerHealth(MAX_HEALTH);
        towerHealthRef.current = MAX_HEALTH;
        nextEnemyId = 0;
        nextBulletId = 0;

        setHoldPiece(null);
        setCanHold(true);

        resetKeyStates();

        // Initialize seven-bag system
        const bag = shuffleBag();
        const type = bag[0];
        const next = bag[1];
        setPieceBag(bag.slice(2));

        setNextPiece(next);
        nextPieceRef.current = next;

        const shape = getShape(type, 0);
        const initialPiece: Piece = {
            type,
            rotation: 0,
            x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
            y: type === 'I' ? -2 : -1,
        };

        setCurrentPiece(initialPiece);
        currentPieceRef.current = initialPiece;
        lastGravityRef.current = performance.now();

        // Transition to PLAYING after world creation animation
        setTimeout(() => {
            setGamePhase('PLAYING');
        }, 1500);
    }, [resetKeyStates]);

    return {
        // State
        board,
        currentPiece,
        nextPiece,
        holdPiece,
        canHold,
        pieceBag,
        score,
        combo,
        lines,
        level,
        gameOver,
        isPaused,
        isPlaying,
        worldIdx,
        stageNumber,
        terrainSeed,
        terrainDestroyedCount,
        terrainTotal,
        beatPhase,
        judgmentText,
        judgmentColor,
        showJudgmentAnim,
        boardBeat,
        boardShake,
        scorePop,
        das,
        arr,
        sdf,
        colorTheme,
        // Game loop
        gamePhase,
        inventory,
        floatingItems,
        terrainParticles,
        craftedCards,
        showCraftUI,
        damageMultiplier,
        // Inventory & Shop
        showInventory,
        showShop,
        gold,
        // Game mode
        gameMode,

        // Tower defense
        enemies,
        bullets,
        towerHealth,

        // Setters
        setBoard,
        setCurrentPiece,
        setNextPiece,
        setHoldPiece,
        setCanHold,
        setPieceBag,
        setScore,
        setCombo,
        setLines,
        setLevel,
        setGameOver,
        setIsPaused,
        setIsPlaying,
        setWorldIdx,
        setBeatPhase,
        setBoardBeat,
        setDas,
        setArr,
        setSdf,
        setColorTheme,
        setGamePhase,
        setShowInventory,
        setShowShop,

        // Refs
        boardRef,
        currentPieceRef,
        nextPieceRef,
        pieceBagRef,
        holdPieceRef,
        canHoldRef,
        scoreRef,
        comboRef,
        linesRef,
        dasRef,
        arrRef,
        sdfRef,
        levelRef,
        gameOverRef,
        isPausedRef,
        worldIdxRef,
        stageNumberRef,
        terrainDestroyedCountRef,
        terrainTotalRef,
        beatPhaseRef,
        damageMultiplierRef,
        enemiesRef,
        bulletsRef,
        gameModeRef,
        keyStatesRef,
        gameLoopRef,
        beatTimerRef,
        lastBeatRef,
        lastGravityRef,

        // Actions
        spawnPiece,
        showJudgment,
        updateScore,
        triggerBoardShake,
        resetKeyStates,
        initGame,
        handleTerrainReady,
        destroyTerrain,
        startNewStage,
        // Game loop actions
        spawnItemDrops,
        spawnTerrainParticles,
        craftCard,
        canCraftCard,
        toggleCraftUI,
        toggleInventory,
        toggleShop,
        purchaseItem,
        enterPlayPhase,
        triggerCollapse,
        triggerTransition,
        triggerWorldCreation,
        // Tower defense actions
        spawnEnemies,
        updateEnemies,
        killEnemies,
        fireBullet,
        updateBullets,
        setEnemies,
        setTowerHealth,
        towerHealthRef,
    };
}
