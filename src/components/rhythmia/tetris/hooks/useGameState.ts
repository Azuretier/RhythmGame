import { useState, useRef, useEffect, useCallback } from 'react';
import type { Piece, Board, KeyState, GamePhase, GameMode, TerrainPhase, InventoryItem, FloatingItem, CraftedCard, ActiveEffects, CardOffer, TerrainParticle, Enemy, Bullet } from '../types';
import {
    BOARD_WIDTH, BUFFER_ZONE, DEFAULT_DAS, DEFAULT_ARR, DEFAULT_SDF, ColorTheme,
    ITEMS, TOTAL_DROP_WEIGHT, WEAPON_CARDS, WEAPON_CARD_MAP, WORLDS,
    ITEMS_PER_TERRAIN_DAMAGE, MAX_FLOATING_ITEMS, FLOAT_DURATION,
    TERRAIN_PARTICLES_PER_LINE, TERRAIN_PARTICLE_LIFETIME,
    TERRAINS_PER_WORLD, TD_WAVE_BEATS,
    ENEMY_SPAWN_DISTANCE, ENEMY_BASE_SPEED, ENEMY_TOWER_RADIUS,
    ENEMIES_PER_BEAT, ENEMIES_KILLED_PER_LINE,
    MAX_HEALTH, ENEMY_REACH_DAMAGE, ENEMY_HP,
    BULLET_SPEED, BULLET_GRAVITY, BULLET_KILL_RADIUS, BULLET_DAMAGE, BULLET_GROUND_Y,
    GRID_TILE_SIZE, GRID_HALF, GRID_SPAWN_RING, GRID_TOWER_RADIUS,
} from '../constants';
import { createEmptyBoard, shuffleBag, getShape, isValidPosition, createSpawnPiece } from '../utils/boardUtils';

// Card offer constants (moved inline since they were removed from constants.ts)
const CARDS_OFFERED = 3;
const getWeaponWeight = (weapon: typeof WEAPON_CARDS[0]) => {
    // Weight based on damage multiplier (lower multiplier = more common)
    if (weapon.damageMultiplier <= 1.2) return 10; // common
    if (weapon.damageMultiplier <= 1.4) return 6;  // uncommon
    if (weapon.damageMultiplier <= 1.6) return 3;  // rare
    if (weapon.damageMultiplier <= 1.8) return 2;  // epic
    return 1; // legendary
};

// Default active effects (stub - the old card attribute system was removed)
const DEFAULT_ACTIVE_EFFECTS: ActiveEffects = {
    comboGuardUsesRemaining: 0,
    shieldActive: false,
    terrainSurgeBonus: 0,
    beatExtendBonus: 0,
    scoreBoostMultiplier: 1,
    gravitySlowFactor: 1,
    luckyDropsBonus: 0,
    comboAmplifyFactor: 1,
};

let nextFloatingId = 0;
let nextParticleId = 0;
let nextEnemyId = 0;
let nextBulletId = 0;

/**
 * Roll a random item based on drop weights.
 * luckyBonus shifts probability toward rarer items.
 */
function rollItem(luckyBonus: number = 0): string {
    const adjustedWeights = ITEMS.map(item => {
        let w = item.dropWeight;
        if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary') {
            w *= (1 + luckyBonus * 3);
        } else if (item.rarity === 'common') {
            w *= Math.max(0.5, 1 - luckyBonus);
        }
        return w;
    });
    const total = adjustedWeights.reduce((s, w) => s + w, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < ITEMS.length; i++) {
        roll -= adjustedWeights[i];
        if (roll <= 0) return ITEMS[i].id;
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

    // Terrain phase — vanilla mode alternates between dig and td phases
    const [terrainPhase, setTerrainPhase] = useState<TerrainPhase>('dig');
    const [tdBeatsRemaining, setTdBeatsRemaining] = useState(0);

    // Rhythm game state
    const [worldIdx, setWorldIdx] = useState(0);
    const [stageNumber, setStageNumber] = useState(1);
    const [terrainSeed, setTerrainSeed] = useState(42);
    const [terrainDestroyedCount, setTerrainDestroyedCount] = useState(0);
    const [terrainTotal, setTerrainTotal] = useState(0);
    const [beatPhase, setBeatPhase] = useState(0);
    const [judgmentText, setJudgmentText] = useState('');
    const [judgmentColor, setJudgmentColor] = useState('');
    const [judgmentScore, setJudgmentScore] = useState(0);
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

    // ===== Rogue-Like Card System =====
    const [equippedCards, setCraftedCards] = useState<CraftedCard[]>([]);
    const [showCardSelect, setShowCardSelect] = useState(false);
    const [offeredCards, setOfferedCards] = useState<CardOffer[]>([]);
    const [activeEffects, setActiveEffects] = useState<ActiveEffects>(DEFAULT_ACTIVE_EFFECTS);
    const activeEffectsRef = useRef<ActiveEffects>(DEFAULT_ACTIVE_EFFECTS);

    // ===== Tower Defense =====
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [towerHealth, setTowerHealth] = useState(MAX_HEALTH);

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
    const enemiesRef = useRef<Enemy[]>(enemies);
    const bulletsRef = useRef<Bullet[]>(bullets);
    const towerHealthRef = useRef(towerHealth);
    const gameModeRef = useRef<GameMode>(gameMode);
    const terrainPhaseRef = useRef<TerrainPhase>(terrainPhase);
    const tdBeatsRemainingRef = useRef(tdBeatsRemaining);
    const gamePhaseRef = useRef<GamePhase>(gamePhase);
    const inventoryRef = useRef<InventoryItem[]>(inventory);
    const equippedCardsRef = useRef<CraftedCard[]>(equippedCards);

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
    useEffect(() => { activeEffectsRef.current = activeEffects; }, [activeEffects]);
    useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
    useEffect(() => { bulletsRef.current = bullets; }, [bullets]);
    useEffect(() => { towerHealthRef.current = towerHealth; }, [towerHealth]);
    useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
    useEffect(() => { terrainPhaseRef.current = terrainPhase; }, [terrainPhase]);
    useEffect(() => { tdBeatsRemainingRef.current = tdBeatsRemaining; }, [tdBeatsRemaining]);
    useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);
    useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
    useEffect(() => { equippedCardsRef.current = equippedCards; }, [equippedCards]);

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

    // Spawn a new piece.
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

    // Show judgment text with animation — optionally includes score earned
    const showJudgment = useCallback((text: string, color: string, earnedScore?: number) => {
        setJudgmentText(text);
        setJudgmentColor(color);
        setJudgmentScore(earnedScore ?? 0);
        setShowJudgmentAnim(false);
        requestAnimationFrame(() => {
            setShowJudgmentAnim(true);
        });
    }, []);

    // Update score with pop animation — applies score boost
    const updateScore = useCallback((newScore: number) => {
        const rawEarned = Math.max(0, newScore - scoreRef.current);
        const boostedEarned = Math.floor(rawEarned * activeEffectsRef.current.scoreBoostMultiplier);
        setScore(scoreRef.current + boostedEarned);
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

    // ===== Rogue-Like Card System =====

    // Compute active effects from all equipped cards
    const computeActiveEffects = useCallback((cards: CraftedCard[]): ActiveEffects => {
        // Note: The old card attribute system was removed in the weapon card refactor
        // This function now just returns the default effects as a stub
        // TODO: Implement effects based on WeaponCard.specialEffect if needed
        return { ...DEFAULT_ACTIVE_EFFECTS };
    }, []);

    // Generate card offers for CARD_SELECT phase
    const generateCardOffers = useCallback((currentWorldIdx: number): CardOffer[] => {
        const costMultiplier = 1 + currentWorldIdx * 0.25;
        const currentInventory = inventoryRef.current;

        // Weighted random selection of CARDS_OFFERED cards (no duplicates)
        const available = [...WEAPON_CARDS];
        const selected: typeof WEAPON_CARDS = [];

        for (let i = 0; i < CARDS_OFFERED && available.length > 0; i++) {
            const totalWeight = available.reduce((sum, c) => sum + getWeaponWeight(c), 0);
            let roll = Math.random() * totalWeight;
            let chosenIdx = 0;
            for (let j = 0; j < available.length; j++) {
                roll -= getWeaponWeight(available[j]);
                if (roll <= 0) { chosenIdx = j; break; }
            }
            selected.push(available[chosenIdx]);
            available.splice(chosenIdx, 1);
        }

        return selected.map(card => {
            const scaledCost = card.recipe.map(c => ({
                itemId: c.itemId,
                count: Math.ceil(c.count * costMultiplier),
            }));
            const affordable = scaledCost.every(c => {
                const inv = currentInventory.find(i => i.itemId === c.itemId);
                return inv && inv.count >= c.count;
            });
            return { card, scaledCost, affordable };
        });
    }, []);

    // Reset per-stage effects (combo_guard uses, shield) at stage start
    const resetStageEffects = useCallback(() => {
        const freshEffects = computeActiveEffects(equippedCardsRef.current);
        setActiveEffects(freshEffects);
    }, [computeActiveEffects]);

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

        // Reset per-stage card effects
        resetStageEffects();
    }, [resetStageEffects]);

    // Finish card select and proceed to next stage
    const finishCardSelect = useCallback(() => {
        setShowCardSelect(false);
        setIsPaused(false);
        const nextStage = stageNumberRef.current + 1;
        startNewStage(nextStage);
    }, [startNewStage]);

    // Enter card selection phase
    const enterCardSelect = useCallback(() => {
        const offers = generateCardOffers(worldIdxRef.current);
        setOfferedCards(offers);
        setShowCardSelect(true);
        setGamePhase('CARD_SELECT');
        setIsPaused(true);
    }, [generateCardOffers]);

    // Select a card from offers
    const selectCard = useCallback((cardId: string): boolean => {
        const offer = offeredCards.find(o => o.card.id === cardId);
        if (!offer) return false;

        // Re-check affordability at selection time
        const currentInv = inventoryRef.current;
        const canAfford = offer.scaledCost.every(c => {
            const inv = currentInv.find(i => i.itemId === c.itemId);
            return inv && inv.count >= c.count;
        });
        if (!canAfford) return false;

        // Deduct materials
        const invCopy = currentInv.map(i => ({ ...i }));
        for (const cost of offer.scaledCost) {
            const item = invCopy.find(i => i.itemId === cost.itemId)!;
            item.count -= cost.count;
        }
        setInventory(invCopy.filter(i => i.count > 0));

        // Add or stack equipped card
        setCraftedCards(prev => {
            const existing = prev.find(ec => ec.cardId === cardId);
            let updated: CraftedCard[];
            if (existing) {
                updated = prev.map(ec =>
                    ec.cardId === cardId
                        ? { ...ec, stackCount: Math.min(ec.stackCount + 1, 3) }
                        : ec
                );
            } else {
                updated = [...prev, { cardId, equippedAt: Date.now(), stackCount: 1 }];
            }
            // Recompute active effects
            const effects = computeActiveEffects(updated);
            setActiveEffects(effects);
            equippedCardsRef.current = updated;
            return updated;
        });

        finishCardSelect();
        return true;
    }, [offeredCards, computeActiveEffects, finishCardSelect]);

    // Skip card selection (take nothing)
    const skipCardSelect = useCallback(() => {
        finishCardSelect();
    }, [finishCardSelect]);

    // Consume a combo guard use
    const consumeComboGuard = useCallback((): boolean => {
        if (activeEffectsRef.current.comboGuardUsesRemaining > 0) {
            setActiveEffects(prev => ({
                ...prev,
                comboGuardUsesRemaining: prev.comboGuardUsesRemaining - 1,
            }));
            return true;
        }
        return false;
    }, []);

    // Consume shield (one-time per stage)
    const consumeShield = useCallback((): boolean => {
        if (activeEffectsRef.current.shieldActive) {
            setActiveEffects(prev => ({ ...prev, shieldActive: false }));
            return true;
        }
        return false;
    }, []);

    // ===== Item System Actions =====

    // Spawn floating items from terrain destruction
    const spawnItemDrops = useCallback((damage: number, originX: number, originY: number) => {
        const itemCount = Math.max(1, Math.floor(damage * ITEMS_PER_TERRAIN_DAMAGE));
        const now = Date.now();
        const newItems: FloatingItem[] = [];
        const luckyBonus = activeEffectsRef.current.luckyDropsBonus;

        for (let i = 0; i < Math.min(itemCount, MAX_FLOATING_ITEMS); i++) {
            const itemId = rollItem(luckyBonus);
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

    // Enter checkpoint — transition from dig phase to TD phase
    const enterCheckpoint = useCallback(() => {
        // Guard against multiple calls during phase transitions
        if (gamePhaseRef.current !== 'PLAYING') return;

        setGamePhase('COLLAPSE');
        gamePhaseRef.current = 'COLLAPSE';

        setTimeout(() => {
            setGamePhase('CHECKPOINT');
            gamePhaseRef.current = 'CHECKPOINT';

            // Switch to TD terrain
            setTerrainPhase('td');
            terrainPhaseRef.current = 'td';

            // Reset TD state
            setEnemies([]);
            enemiesRef.current = [];
            setBullets([]);
            bulletsRef.current = [];
            setTowerHealth(MAX_HEALTH);
            towerHealthRef.current = MAX_HEALTH;
            setTdBeatsRemaining(TD_WAVE_BEATS);
            tdBeatsRemainingRef.current = TD_WAVE_BEATS;

            setTimeout(() => {
                setGamePhase('PLAYING');
                gamePhaseRef.current = 'PLAYING';
            }, 1500);
        }, 1200);
    }, []);

    // Complete TD wave — transition back to dig phase with next stage
    const completeWave = useCallback(() => {
        // Guard against multiple calls during phase transitions
        if (gamePhaseRef.current !== 'PLAYING') return;

        setGamePhase('COLLAPSE');
        gamePhaseRef.current = 'COLLAPSE';

        // Clear TD entities
        setEnemies([]);
        enemiesRef.current = [];
        setBullets([]);
        bulletsRef.current = [];

        setTimeout(() => {
            setGamePhase('TRANSITION');
            gamePhaseRef.current = 'TRANSITION';

            setTimeout(() => {
                // Advance to next stage
                const nextStage = stageNumberRef.current + 1;
                startNewStage(nextStage);

                // Switch to dig phase
                setTerrainPhase('dig');
                terrainPhaseRef.current = 'dig';

                // Reset tower health for next TD phase
                setTowerHealth(MAX_HEALTH);
                towerHealthRef.current = MAX_HEALTH;

                setGamePhase('WORLD_CREATION');
                gamePhaseRef.current = 'WORLD_CREATION';

                setTimeout(() => {
                    setGamePhase('PLAYING');
                    gamePhaseRef.current = 'PLAYING';
                }, 1500);
            }, 1200);
        }, 1200);
    }, [startNewStage]);

    // Initialize/reset game
    const initGame = useCallback((mode: GameMode = 'vanilla') => {
        setGameMode(mode);
        gameModeRef.current = mode;

        // Always start with dig phase
        setTerrainPhase('dig');
        terrainPhaseRef.current = 'dig';
        setTdBeatsRemaining(0);
        tdBeatsRemainingRef.current = 0;

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
        setFloatingItems([]);
        setTerrainParticles([]);

        // Reset rogue-like card state
        setCraftedCards([]);
        equippedCardsRef.current = [];
        setShowCardSelect(false);
        setOfferedCards([]);
        setActiveEffects(DEFAULT_ACTIVE_EFFECTS);

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
            y: BUFFER_ZONE - 1,
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
        judgmentScore,
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
        // Rogue-like cards
        equippedCards,
        showCardSelect,
        offeredCards,
        activeEffects,
        // Game mode
        gameMode,
        // Terrain phase
        terrainPhase,
        tdBeatsRemaining,

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
        activeEffectsRef,
        enemiesRef,
        bulletsRef,
        gameModeRef,
        terrainPhaseRef,
        tdBeatsRemainingRef,
        gamePhaseRef,
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
        enterCardSelect,
        selectCard,
        skipCardSelect,
        consumeComboGuard,
        consumeShield,
        enterPlayPhase,
        triggerCollapse,
        triggerTransition,
        triggerWorldCreation,
        // Terrain phase actions
        enterCheckpoint,
        completeWave,
        setTdBeatsRemaining,
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
