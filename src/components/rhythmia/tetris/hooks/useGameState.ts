import { useState, useRef, useEffect, useCallback } from 'react';
import type { Piece, Board, KeyState, GamePhase, GameMode, TerrainPhase, InventoryItem, FloatingItem, TerrainParticle } from '../types';
import type { ElementType, ReactionType, ElementalState, ElementOrb, ReactionResult } from '@/lib/elements/types';
import { DEFAULT_ELEMENTAL_STATE } from '@/lib/elements/types';
import {
    rollElementOrb, calculateOrbCount, findBestReaction,
    consumeOrbs, applyReactionEffect, createActiveReaction,
    pruneExpiredReactions, addOrbs,
} from '@/lib/elements/engine';
import { REACTION_DEFINITIONS } from '@/lib/elements/definitions';
import {
    BOARD_WIDTH, BUFFER_ZONE, DEFAULT_DAS, DEFAULT_ARR, DEFAULT_SDF, ColorTheme,
    ITEMS_PER_TERRAIN_DAMAGE, MAX_FLOATING_ITEMS, FLOAT_DURATION,
    TERRAIN_PARTICLE_LIFETIME,
    MAX_HEALTH, DEFAULT_ACTIVE_EFFECTS,
    MAX_FLOATING_ORBS, ELEMENT_ORB_FLOAT_DURATION,
} from '../constants';
import type { ProtocolModifiers } from '../protocol';
import { DEFAULT_PROTOCOL_MODIFIERS } from '../protocol';
import { createEmptyBoard, shuffleBag, getShape, isValidPosition, createSpawnPiece } from '../utils/boardUtils';
import { rollItem } from '../utils/cardEffects';

import { useCardSystem } from './useCardSystem';
import { useTowerDefense } from './useTowerDefense';
import { useDragonGauge } from './useDragonGauge';

let nextFloatingId = 0;
let nextParticleId = 0;

/**
 * Custom hook for managing game state with synchronized refs.
 * Composes sub-hooks: useCardSystem, useTowerDefense, useDragonGauge.
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

    // Protocol modifiers
    const [protocolMods, setProtocolMods] = useState<ProtocolModifiers>(DEFAULT_PROTOCOL_MODIFIERS);
    const protocolModsRef = useRef<ProtocolModifiers>(DEFAULT_PROTOCOL_MODIFIERS);

    // Terrain phase
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

    // DAS/ARR/SDF settings
    const [das, setDas] = useState(DEFAULT_DAS);
    const [arr, setArr] = useState(DEFAULT_ARR);
    const [sdf, setSdf] = useState(DEFAULT_SDF);

    // Color theme
    const [colorTheme, setColorTheme] = useState<ColorTheme>('stage');

    // Game phase
    const [gamePhase, setGamePhase] = useState<GamePhase>('PLAYING');

    // Item System
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
    const [terrainParticles, setTerrainParticles] = useState<TerrainParticle[]>([]);

    // Elemental System
    const [elementalState, setElementalState] = useState<ElementalState>(DEFAULT_ELEMENTAL_STATE);
    const elementalStateRef = useRef<ElementalState>(DEFAULT_ELEMENTAL_STATE);
    const [floatingOrbs, setFloatingOrbs] = useState<ElementOrb[]>([]);
    const nextOrbIdRef = useRef(0);
    const reactionCooldownsRef = useRef<{ type: ReactionType; time: number }[]>([]);

    // Refs for accessing current values in callbacks
    const gameLoopRef = useRef<number | null>(null);
    const beatTimerRef = useRef<number | null>(null);
    const lastBeatRef = useRef(Date.now());
    const lastGravityRef = useRef<number>(0);

    // State refs
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
    const gameModeRef = useRef<GameMode>(gameMode);
    const terrainPhaseRef = useRef<TerrainPhase>(terrainPhase);
    const tdBeatsRemainingRef = useRef(tdBeatsRemaining);
    const gamePhaseRef = useRef<GamePhase>(gamePhase);
    const inventoryRef = useRef<InventoryItem[]>(inventory);

    // Shared ref for tower health — created here so both useCardSystem and useTowerDefense can access it
    const towerHealthRef = useRef(MAX_HEALTH);

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
    useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
    useEffect(() => { terrainPhaseRef.current = terrainPhase; }, [terrainPhase]);
    useEffect(() => { tdBeatsRemainingRef.current = tdBeatsRemaining; }, [tdBeatsRemaining]);
    useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);
    useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
    useEffect(() => { elementalStateRef.current = elementalState; }, [elementalState]);

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
    const showJudgment = useCallback((text: string, color: string, earnedScore?: number) => {
        setJudgmentText(text);
        setJudgmentColor(color);
        setJudgmentScore(earnedScore ?? 0);
        setShowJudgmentAnim(false);
        requestAnimationFrame(() => {
            setShowJudgmentAnim(true);
        });
    }, []);

    // Update score with pop animation — uses activeEffectsRef from cardSystem (set up below)
    const activeEffectsRefForScore = useRef(DEFAULT_ACTIVE_EFFECTS);
    const updateScore = useCallback((newScore: number) => {
        const rawEarned = Math.max(0, newScore - scoreRef.current);
        const boostedEarned = Math.floor(rawEarned * activeEffectsRefForScore.current.scoreBoostMultiplier);
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

    // Destroy terrain blocks
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

    // ===== Compose Sub-Hooks =====

    // Card System — called first; tower health reset is handled via shared ref
    const cardSystem = useCardSystem({
        inventoryRef,
        worldIdxRef,
        stageNumberRef,
        gameOverRef,
        gamePhaseRef,
        terrainDestroyedCountRef,
        setInventory,
        setWorldIdx,
        setStageNumber,
        setTerrainSeed,
        setTerrainDestroyedCount,
        setIsPaused,
        setGamePhase,
        setTerrainPhase,
        setTowerHealth: (v: number) => {
            towerHealthRef.current = v;
            // The actual state setter in useTowerDefense is synced below
            towerDefenseSetTowerHealthRef.current(v);
        },
        terrainPhaseRef,
        towerHealthRef,
    });

    // Wire activeEffectsRef for updateScore
    activeEffectsRefForScore.current = cardSystem.activeEffectsRef.current;
    useEffect(() => {
        activeEffectsRefForScore.current = cardSystem.activeEffects;
    }, [cardSystem.activeEffects]);

    // Dragon Gauge + Treasure Box — called second; needs cardSystem outputs
    const dragonAndTreasure = useDragonGauge({
        terrainTotalRef,
        terrainDestroyedCountRef,
        levelRef,
        scoreRef,
        worldIdxRef,
        stageNumberRef,
        gamePhaseRef,
        activeEffectsRef: cardSystem.activeEffectsRef,
        activeEffects: cardSystem.activeEffects,
        computeActiveEffects: cardSystem.computeActiveEffects,
        setActiveEffects: cardSystem.setActiveEffects,
        setEquippedCards: cardSystem.setEquippedCards,
        enterCardSelect: cardSystem.enterCardSelect,
        destroyTerrain,
        updateScore,
        setInventory,
        setGamePhase,
        setIsPaused,
    });

    // Ref-based bridge for towerDefense.setTowerHealth — resolves circular dependency
    const towerDefenseSetTowerHealthRef = useRef<(v: number) => void>(() => {});

    // Tower Defense — called third; needs cardSystem.enterCardSelect and dragonAndTreasure outputs
    const towerDefense = useTowerDefense({
        gameOverRef,
        gamePhaseRef,
        stageNumberRef,
        boardRef,
        setBoard,
        setGamePhase,
        setTerrainPhase,
        setTdBeatsRemaining,
        terrainPhaseRef,
        tdBeatsRemainingRef,
        towerHealthRef,
        enterCardSelect: cardSystem.enterCardSelect,
        enterTreasureBox: dragonAndTreasure.enterTreasureBox,
        shouldSpawnTreasureBox: dragonAndTreasure.shouldSpawnTreasureBox,
    });

    // Now wire the bridge so cardSystem's setTowerHealth can reach towerDefense
    towerDefenseSetTowerHealthRef.current = (v: number) => towerDefense.setTowerHealth(v);

    // ===== Item System Actions =====

    // Spawn floating items from terrain destruction
    const spawnItemDrops = useCallback((damage: number, originX: number, originY: number) => {
        const itemCount = Math.max(1, Math.floor(damage * ITEMS_PER_TERRAIN_DAMAGE));
        const now = Date.now();
        const newItems: FloatingItem[] = [];
        const luckyBonus = cardSystem.activeEffectsRef.current.luckyDropsBonus;

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

        setTimeout(() => {
            setFloatingItems(prev => prev.map(fi =>
                newItems.some(ni => ni.id === fi.id) ? { ...fi, collected: true } : fi
            ));
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

        setTimeout(() => {
            setFloatingItems(prev => prev.filter(fi => !newItems.some(ni => ni.id === fi.id)));
        }, FLOAT_DURATION + itemCount * 80 + 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Spawn terrain destruction particles
    const spawnTerrainParticles = useCallback((originX: number, originY: number, count: number, color?: string) => {
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

        setTimeout(() => {
            setTerrainParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
        }, TERRAIN_PARTICLE_LIFETIME + 100);
    }, []);

    // ===== Elemental System Actions =====

    const spawnElementOrbs = useCallback((
        pieceType: string,
        lineCount: number,
        onBeat: boolean,
        originX: number,
        originY: number,
    ): { element: ElementType; boardX: number; boardY: number }[] => {
        const orbCount = calculateOrbCount(lineCount, onBeat, comboRef.current);
        const now = Date.now();
        const vfxEvents: { element: ElementType; boardX: number; boardY: number }[] = [];
        let currentOrbs = { ...elementalStateRef.current.orbs };

        for (let i = 0; i < orbCount; i++) {
            const element = rollElementOrb(pieceType, worldIdxRef.current);
            currentOrbs = addOrbs(currentOrbs, element, 1);

            const newOrb: ElementOrb = {
                id: nextOrbIdRef.current++,
                element,
                x: originX + (Math.random() - 0.5) * 150,
                y: originY + (Math.random() - 0.5) * 80,
                targetX: originX,
                targetY: originY + 250,
                startTime: now + i * 100,
                duration: ELEMENT_ORB_FLOAT_DURATION + Math.random() * 150,
                collected: false,
            };

            setFloatingOrbs(prev => [...prev, newOrb].slice(-MAX_FLOATING_ORBS * 2));
            vfxEvents.push({ element, boardX: originX, boardY: originY });
        }

        setElementalState(prev => ({
            ...prev,
            orbs: currentOrbs,
        }));
        elementalStateRef.current = { ...elementalStateRef.current, orbs: currentOrbs };

        setTimeout(() => {
            const cleanupTime = Date.now();
            setFloatingOrbs(prev => prev.filter(o => (cleanupTime - o.startTime) < o.duration + 500));
        }, ELEMENT_ORB_FLOAT_DURATION + 300);

        return vfxEvents;
    }, []);

    const tryTriggerReaction = useCallback((): ReactionResult | null => {
        const state = elementalStateRef.current;
        const now = Date.now();

        const prunedReactions = pruneExpiredReactions(state.activeReactions, now);

        const bestReaction = findBestReaction(
            state.orbs,
            reactionCooldownsRef.current,
            now,
        );

        if (!bestReaction) return null;

        const newOrbs = consumeOrbs(state.orbs, bestReaction);

        const result = applyReactionEffect(bestReaction, {
            currentDamage: 0,
            terrainRemaining: terrainTotalRef.current - terrainDestroyedCountRef.current,
            combo: comboRef.current,
            worldIdx: worldIdxRef.current,
            score: scoreRef.current,
        });

        const activeReaction = createActiveReaction(bestReaction, 1.0);

        reactionCooldownsRef.current = [
            ...reactionCooldownsRef.current.filter(r => {
                if (r.type === bestReaction) return false;
                const def = REACTION_DEFINITIONS[r.type];
                return def ? (now - r.time) < def.cooldown : false;
            }),
            { type: bestReaction, time: now },
        ];

        const newReactionCounts = { ...state.reactionCounts };
        newReactionCounts[bestReaction] = (newReactionCounts[bestReaction] || 0) + 1;

        const newState: ElementalState = {
            orbs: newOrbs,
            activeReactions: activeReaction.duration > 0
                ? [...prunedReactions, activeReaction]
                : prunedReactions,
            totalReactions: state.totalReactions + 1,
            reactionCounts: newReactionCounts,
        };

        setElementalState(newState);
        elementalStateRef.current = newState;

        return result;
    }, []);

    // Set phase helpers
    const enterPlayPhase = useCallback(() => {
        setGamePhase('PLAYING');
    }, []);

    const triggerCollapse = useCallback(() => {
        setGamePhase('COLLAPSE');
    }, []);

    const triggerTransition = useCallback(() => {
        setGamePhase('TRANSITION');
    }, []);

    const triggerWorldCreation = useCallback(() => {
        setGamePhase('WORLD_CREATION');
    }, []);

    // Initialize/reset game
    const initGame = useCallback((mode: GameMode = 'vanilla', protocolModifiers?: ProtocolModifiers) => {
        const mods = protocolModifiers ?? DEFAULT_PROTOCOL_MODIFIERS;
        setProtocolMods(mods);
        protocolModsRef.current = mods;

        setGameMode(mode);
        gameModeRef.current = mode;

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

        setStageNumber(1);
        stageNumberRef.current = 1;
        setTerrainSeed(42);
        setTerrainDestroyedCount(0);
        terrainDestroyedCountRef.current = 0;

        setGameOver(false);
        setIsPaused(false);
        setIsPlaying(true);

        setGamePhase('WORLD_CREATION');
        setInventory([]);
        setFloatingItems([]);
        setTerrainParticles([]);

        // Reset sub-hook state
        cardSystem.resetCardSystem();
        dragonAndTreasure.resetDragonAndTreasure();
        towerDefense.resetTowerDefense();

        setHoldPiece(null);
        setCanHold(true);

        resetKeyStates();

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

        setTimeout(() => {
            setGamePhase('PLAYING');
        }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Rogue-like cards (from cardSystem)
        equippedCards: cardSystem.equippedCards,
        showCardSelect: cardSystem.showCardSelect,
        offeredCards: cardSystem.offeredCards,
        activeEffects: cardSystem.activeEffects,
        absorbingCardId: cardSystem.absorbingCardId,
        // Game mode
        gameMode,
        // Protocol modifiers
        protocolMods,
        protocolModsRef,
        // Terrain phase
        terrainPhase,
        tdBeatsRemaining,

        // Dragon gauge (from dragonAndTreasure)
        dragonGauge: dragonAndTreasure.dragonGauge,

        // Elemental system
        elementalState,
        elementalStateRef,
        floatingOrbs,
        spawnElementOrbs,
        tryTriggerReaction,

        // Treasure box (from dragonAndTreasure)
        currentTreasureBox: dragonAndTreasure.currentTreasureBox,
        showTreasureBox: dragonAndTreasure.showTreasureBox,

        // Tower defense (from towerDefense)
        enemies: towerDefense.enemies,
        bullets: towerDefense.bullets,
        towerHealth: towerDefense.towerHealth,

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
        activeEffectsRef: cardSystem.activeEffectsRef,
        enemiesRef: towerDefense.enemiesRef,
        bulletsRef: towerDefense.bulletsRef,
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
        startNewStage: cardSystem.startNewStage,
        // Game loop actions
        spawnItemDrops,
        spawnTerrainParticles,
        enterCardSelect: cardSystem.enterCardSelect,
        selectCard: cardSystem.selectCard,
        skipCardSelect: cardSystem.skipCardSelect,
        finishAbsorption: cardSystem.finishAbsorption,
        consumeComboGuard: cardSystem.consumeComboGuard,
        consumeShield: cardSystem.consumeShield,
        enterPlayPhase,
        triggerCollapse,
        triggerTransition,
        triggerWorldCreation,
        // Terrain phase actions
        enterCheckpoint: towerDefense.enterCheckpoint,
        completeWave: towerDefense.completeWave,
        setTdBeatsRemaining,
        // Dragon gauge actions (from dragonAndTreasure)
        chargeDragonFury: dragonAndTreasure.chargeDragonFury,
        chargeDragonMight: dragonAndTreasure.chargeDragonMight,
        isDragonBreathReady: dragonAndTreasure.isDragonBreathReady,
        triggerDragonBreath: dragonAndTreasure.triggerDragonBreath,
        endDragonBreath: dragonAndTreasure.endDragonBreath,
        dragonGaugeRef: dragonAndTreasure.dragonGaugeRef,
        // Treasure box actions (from dragonAndTreasure)
        openTreasureBox: dragonAndTreasure.openTreasureBox,
        finishTreasureBox: dragonAndTreasure.finishTreasureBox,
        // Tower defense actions (from towerDefense)
        spawnEnemies: towerDefense.spawnEnemies,
        updateEnemies: towerDefense.updateEnemies,
        killEnemies: towerDefense.killEnemies,
        fireBullet: towerDefense.fireBullet,
        updateBullets: towerDefense.updateBullets,
        setEnemies: towerDefense.setEnemies,
        setTowerHealth: towerDefense.setTowerHealth,
        towerHealthRef,
        addGarbageRows: towerDefense.addGarbageRows,
        spawnEnemyAtCell: towerDefense.spawnEnemyAtCell,
    };
}
