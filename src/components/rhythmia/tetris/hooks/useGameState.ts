import { useState, useRef, useEffect, useCallback } from 'react';
import type { Piece, Board, KeyState, GamePhase, InventoryItem, FloatingItem, CraftedCard, TerrainParticle, Enemy } from '../types';
import {
    BOARD_WIDTH, DEFAULT_DAS, DEFAULT_ARR, DEFAULT_SDF, ColorTheme,
    ITEMS, TOTAL_DROP_WEIGHT, WEAPON_CARDS, WEAPON_CARD_MAP,
    ITEMS_PER_TERRAIN_DAMAGE, MAX_FLOATING_ITEMS, FLOAT_DURATION,
    TERRAIN_PARTICLES_PER_LINE, TERRAIN_PARTICLE_LIFETIME,
    ENEMY_SPAWN_DISTANCE, ENEMY_BASE_SPEED, ENEMY_TOWER_RADIUS,
    ENEMIES_PER_BEAT, ENEMIES_KILLED_PER_LINE,
} from '../constants';
import { createEmptyBoard, shuffleBag, getShape, isValidPosition, createSpawnPiece } from '../utils/boardUtils';

let nextFloatingId = 0;
let nextParticleId = 0;
let nextEnemyId = 0;

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

    // ===== Tower Defense =====
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [hasHadCombo, setHasHadCombo] = useState(false);

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
    const hasHadComboRef = useRef(hasHadCombo);

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
    useEffect(() => { hasHadComboRef.current = hasHadCombo; }, [hasHadCombo]);

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

    // Update score with pop animation
    const updateScore = useCallback((newScore: number) => {
        setScore(newScore);
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

    // Start a new terrain stage
    const startNewStage = useCallback((newStageNumber: number) => {
        setStageNumber(newStageNumber);
        stageNumberRef.current = newStageNumber;
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

    // Spawn enemies at the terrain edge
    const spawnEnemies = useCallback((count: number) => {
        const newEnemies: Enemy[] = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spawnDist = ENEMY_SPAWN_DISTANCE + Math.random() * 3;
            newEnemies.push({
                id: nextEnemyId++,
                x: Math.cos(angle) * spawnDist,
                y: 5 + Math.random() * 3,
                z: Math.sin(angle) * spawnDist,
                speed: ENEMY_BASE_SPEED + Math.random() * 0.02,
                health: 1,
                alive: true,
                spawnTime: Date.now(),
            });
        }
        setEnemies(prev => [...prev, ...newEnemies]);
    }, []);

    // Move enemies toward center (tower), returns number that reached the tower
    const updateEnemies = useCallback((): number => {
        let reached = 0;
        setEnemies(prev => {
            const updated = prev.map(e => {
                if (!e.alive) return e;
                const dx = -e.x;
                const dz = -e.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < ENEMY_TOWER_RADIUS) {
                    reached++;
                    return { ...e, alive: false };
                }

                const nx = dx / dist;
                const nz = dz / dist;
                return {
                    ...e,
                    x: e.x + nx * e.speed,
                    z: e.z + nz * e.speed,
                };
            });
            // Clean up dead enemies that have been dead for a while
            return updated.filter(e => e.alive || Date.now() - e.spawnTime < 10000);
        });
        return reached;
    }, []);

    // Kill closest enemies (when lines are cleared)
    const killEnemies = useCallback((count: number) => {
        setEnemies(prev => {
            // Sort alive enemies by distance to center (closest first)
            const alive = prev.filter(e => e.alive);
            const dead = prev.filter(e => !e.alive);
            alive.sort((a, b) => {
                const distA = Math.sqrt(a.x * a.x + a.z * a.z);
                const distB = Math.sqrt(b.x * b.x + b.z * b.z);
                return distA - distB;
            });

            // Kill the closest ones
            const toKill = Math.min(count, alive.length);
            for (let i = 0; i < toKill; i++) {
                alive[i] = { ...alive[i], alive: false };
            }
            return [...alive, ...dead];
        });
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
    const initGame = useCallback(() => {
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

        // Reset tower defense state
        setEnemies([]);
        enemiesRef.current = [];
        setHasHadCombo(false);
        hasHadComboRef.current = false;
        nextEnemyId = 0;

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
        // Tower defense
        enemies,
        hasHadCombo,

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
        damageMultiplierRef,
        enemiesRef,
        hasHadComboRef,
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
        enterPlayPhase,
        triggerCollapse,
        triggerTransition,
        triggerWorldCreation,
        // Tower defense actions
        spawnEnemies,
        updateEnemies,
        killEnemies,
        setHasHadCombo,
        setEnemies,
    };
}
