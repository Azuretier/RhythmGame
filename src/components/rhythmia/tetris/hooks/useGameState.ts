import { useState, useRef, useEffect, useCallback } from 'react';
import type { Piece, Board, KeyState, GamePhase, GameMode, TerrainPhase, InventoryItem, FloatingItem, EquippedCard, ActiveEffects, CardOffer, TerrainParticle, Enemy, Bullet, DragonGaugeState, TreasureBox, TreasureBoxTier, TreasureBoxReward, TreasureBoxBoostEffect } from '../types';
import {
    BOARD_WIDTH, BUFFER_ZONE, DEFAULT_DAS, DEFAULT_ARR, DEFAULT_SDF, ColorTheme,
    ITEMS, TOTAL_DROP_WEIGHT, ROGUE_CARDS, ROGUE_CARD_MAP, WORLDS,
    ITEMS_PER_TERRAIN_DAMAGE, MAX_FLOATING_ITEMS, FLOAT_DURATION,
    TERRAIN_PARTICLES_PER_LINE, TERRAIN_PARTICLE_LIFETIME,
    TERRAINS_PER_WORLD, TD_WAVE_BEATS,
    ENEMY_SPAWN_DISTANCE, ENEMY_BASE_SPEED, ENEMY_TOWER_RADIUS,
    ENEMIES_PER_BEAT, ENEMIES_KILLED_PER_LINE,
    MAX_HEALTH, ENEMY_REACH_DAMAGE, ENEMY_HP,
    BULLET_SPEED, BULLET_GRAVITY, BULLET_KILL_RADIUS, BULLET_DAMAGE, BULLET_GROUND_Y,
    GRID_TILE_SIZE, GRID_HALF, GRID_SPAWN_RING, GRID_TOWER_RADIUS,
    DEFAULT_ACTIVE_EFFECTS, RARITY_OFFER_WEIGHTS, CARDS_OFFERED,
    DEFAULT_DRAGON_GAUGE, DRAGON_FURY_MAX, DRAGON_MIGHT_MAX,
    DRAGON_BREATH_DURATION, DRAGON_BREATH_SCORE_BONUS,
    DRAGON_FURY_CHARGE, DRAGON_MIGHT_CHARGE,
    TREASURE_BOX_STAGE_INTERVAL, TREASURE_BOX_RANDOM_CHANCE,
    TREASURE_BOX_TIER_WEIGHTS, TREASURE_BOX_TIERS,
} from '../constants';
import type { ProtocolModifiers } from '../protocol';
import { DEFAULT_PROTOCOL_MODIFIERS } from '../protocol';
import { createEmptyBoard, shuffleBag, getShape, isValidPosition, createSpawnPiece } from '../utils/boardUtils';

let nextFloatingId = 0;
let nextParticleId = 0;
let nextEnemyId = 0;
let nextBulletId = 0;
let nextTreasureBoxId = 0;

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

    // Protocol modifiers — difficulty scaling applied across all worlds
    const [protocolMods, setProtocolMods] = useState<ProtocolModifiers>(DEFAULT_PROTOCOL_MODIFIERS);
    const protocolModsRef = useRef<ProtocolModifiers>(DEFAULT_PROTOCOL_MODIFIERS);

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
    // Start as PLAYING (inert) — WORLD_CREATION is set by initGame() when the player starts
    const [gamePhase, setGamePhase] = useState<GamePhase>('PLAYING');

    // ===== Item System =====
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
    const [terrainParticles, setTerrainParticles] = useState<TerrainParticle[]>([]);

    // ===== Rogue-Like Card System =====
    const [equippedCards, setEquippedCards] = useState<EquippedCard[]>([]);
    const [showCardSelect, setShowCardSelect] = useState(false);
    const [offeredCards, setOfferedCards] = useState<CardOffer[]>([]);
    const [activeEffects, setActiveEffects] = useState<ActiveEffects>(DEFAULT_ACTIVE_EFFECTS);
    const activeEffectsRef = useRef<ActiveEffects>(DEFAULT_ACTIVE_EFFECTS);
    const [absorbingCardId, setAbsorbingCardId] = useState<string | null>(null);

    // ===== Mandarin Fever Dragon Gauge =====
    const [dragonGauge, setDragonGauge] = useState<DragonGaugeState>(DEFAULT_DRAGON_GAUGE);
    const dragonGaugeRef = useRef<DragonGaugeState>(DEFAULT_DRAGON_GAUGE);

    // ===== Treasure Box System =====
    const [currentTreasureBox, setCurrentTreasureBox] = useState<TreasureBox | null>(null);
    const [showTreasureBox, setShowTreasureBox] = useState(false);

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
    const equippedCardsRef = useRef<EquippedCard[]>(equippedCards);

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
    useEffect(() => { dragonGaugeRef.current = dragonGauge; }, [dragonGauge]);

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
    const computeActiveEffects = useCallback((cards: EquippedCard[]): ActiveEffects => {
        const effects = { ...DEFAULT_ACTIVE_EFFECTS };

        for (const ec of cards) {
            const card = ROGUE_CARD_MAP[ec.cardId];
            if (!card) continue;

            const totalValue = card.attributeValue * ec.stackCount;

            switch (card.attribute) {
                case 'combo_guard':
                    effects.comboGuardUsesRemaining += totalValue;
                    break;
                case 'shield':
                    effects.shieldActive = true;
                    break;
                case 'terrain_surge':
                    effects.terrainSurgeBonus += totalValue;
                    break;
                case 'beat_extend':
                    effects.beatExtendBonus += totalValue;
                    break;
                case 'score_boost':
                    effects.scoreBoostMultiplier += totalValue;
                    break;
                case 'gravity_slow':
                    effects.gravitySlowFactor = Math.max(0.1, effects.gravitySlowFactor - totalValue);
                    break;
                case 'lucky_drops':
                    effects.luckyDropsBonus += totalValue;
                    break;
                case 'combo_amplify':
                    effects.comboAmplifyFactor *= Math.pow(card.attributeValue, ec.stackCount);
                    break;
                case 'dragon_boost':
                    effects.dragonBoostEnabled = true;
                    effects.dragonBoostChargeMultiplier *= Math.pow(1 + card.attributeValue * 0.5, ec.stackCount);
                    break;
            }
        }

        return effects;
    }, []);

    // Generate card offers for CARD_SELECT phase
    const generateCardOffers = useCallback((currentWorldIdx: number): CardOffer[] => {
        const costMultiplier = 1 + currentWorldIdx * 0.25;
        const currentInventory = inventoryRef.current;

        // Group cards by rarity for weighted selection
        const cardsByRarity: Record<string, typeof ROGUE_CARDS> = {};
        for (const card of ROGUE_CARDS) {
            if (!cardsByRarity[card.rarity]) cardsByRarity[card.rarity] = [];
            cardsByRarity[card.rarity].push(card);
        }

        const totalRarityWeight = Object.values(RARITY_OFFER_WEIGHTS).reduce((s, w) => s + w, 0);
        const selected: typeof ROGUE_CARDS[0][] = [];
        const usedIds = new Set<string>();

        for (let i = 0; i < CARDS_OFFERED; i++) {
            // Roll for rarity
            let rarityRoll = Math.random() * totalRarityWeight;
            let chosenRarity = 'common';
            for (const [rarity, weight] of Object.entries(RARITY_OFFER_WEIGHTS)) {
                rarityRoll -= weight;
                if (rarityRoll <= 0) { chosenRarity = rarity; break; }
            }

            // Pick a random card of that rarity (avoid duplicates)
            const available = (cardsByRarity[chosenRarity] || []).filter(c => !usedIds.has(c.id));
            if (available.length === 0) {
                // Fallback: pick from any rarity
                const allAvailable = ROGUE_CARDS.filter(c => !usedIds.has(c.id));
                if (allAvailable.length === 0) break;
                const card = allAvailable[Math.floor(Math.random() * allAvailable.length)];
                selected.push(card);
                usedIds.add(card.id);
            } else {
                const card = available[Math.floor(Math.random() * available.length)];
                selected.push(card);
                usedIds.add(card.id);
            }
        }

        return selected.map(card => {
            const scaledCost = card.baseCost.map(c => ({
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

    // Finish card select and proceed to next stage (full transition)
    const finishCardSelect = useCallback(() => {
        setShowCardSelect(false);
        setIsPaused(false);

        // Abort if player died during card select
        if (gameOverRef.current) return;

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
            if (gameOverRef.current) return;
            setGamePhase('PLAYING');
            gamePhaseRef.current = 'PLAYING';
        }, 1500);
    }, [startNewStage]);

    // Enter card selection phase
    // Called after TD wave collapse → transition, before advancing to next stage
    const enterCardSelect = useCallback(() => {
        const offers = generateCardOffers(worldIdxRef.current);
        setOfferedCards(offers);
        setShowCardSelect(true);
        setGamePhase('CARD_SELECT');
        gamePhaseRef.current = 'CARD_SELECT';
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

        // Compute updated equipped cards
        const prev = equippedCardsRef.current;
        const existing = prev.find(ec => ec.cardId === cardId);
        let updatedCards: EquippedCard[];
        if (existing && existing.stackCount < 3) {
            updatedCards = prev.map(ec =>
                ec.cardId === cardId
                    ? { ...ec, stackCount: ec.stackCount + 1 }
                    : ec
            );
        } else if (existing) {
            updatedCards = prev;
        } else {
            updatedCards = [...prev, { cardId, equippedAt: Date.now(), stackCount: 1 }];
        }

        // Update cards, effects, and refs synchronously
        equippedCardsRef.current = updatedCards;
        setEquippedCards(updatedCards);
        const effects = computeActiveEffects(updatedCards);
        activeEffectsRef.current = effects;
        setActiveEffects(effects);

        // Enter absorbing phase — animation plays before finishing
        setAbsorbingCardId(cardId);
        setGamePhase('CARD_ABSORBING');
        gamePhaseRef.current = 'CARD_ABSORBING';
        return true;
    }, [offeredCards, computeActiveEffects]);

    // Called by CardSelectUI after absorption animation completes
    const finishAbsorption = useCallback(() => {
        setAbsorbingCardId(null);
        finishCardSelect();
    }, [finishCardSelect]);

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

    // ===== Mandarin Fever Dragon Gauge Actions =====

    // Update dragon gauge enabled state when active effects change
    useEffect(() => {
        setDragonGauge(prev => ({
            ...prev,
            enabled: activeEffects.dragonBoostEnabled,
        }));
    }, [activeEffects.dragonBoostEnabled]);

    // Charge dragon fury gauge (from T-spins)
    const chargeDragonFury = useCallback((tSpinType: 'mini' | 'full', lineCount: number): number => {
        const gauge = dragonGaugeRef.current;
        if (!gauge.enabled || gauge.isBreathing) return gauge.furyGauge;

        const chargeMap = DRAGON_FURY_CHARGE[tSpinType];
        const baseCharge = chargeMap?.[lineCount] ?? 0;
        if (baseCharge === 0) return gauge.furyGauge;

        const charge = Math.ceil(baseCharge * activeEffectsRef.current.dragonBoostChargeMultiplier);
        const newValue = Math.min(DRAGON_FURY_MAX, gauge.furyGauge + charge);

        setDragonGauge(prev => ({ ...prev, furyGauge: newValue }));
        dragonGaugeRef.current = { ...dragonGaugeRef.current, furyGauge: newValue };
        return newValue;
    }, []);

    // Charge dragon might gauge (from Tetrises and triples)
    const chargeDragonMight = useCallback((lineCount: number): number => {
        const gauge = dragonGaugeRef.current;
        if (!gauge.enabled || gauge.isBreathing) return gauge.mightGauge;

        const baseCharge = DRAGON_MIGHT_CHARGE[lineCount] ?? 0;
        if (baseCharge === 0) return gauge.mightGauge;

        const charge = Math.ceil(baseCharge * activeEffectsRef.current.dragonBoostChargeMultiplier);
        const newValue = Math.min(DRAGON_MIGHT_MAX, gauge.mightGauge + charge);

        setDragonGauge(prev => ({ ...prev, mightGauge: newValue }));
        dragonGaugeRef.current = { ...dragonGaugeRef.current, mightGauge: newValue };
        return newValue;
    }, []);

    // Check if both gauges are full and ready for Dragon Breath
    const isDragonBreathReady = useCallback((): boolean => {
        const gauge = dragonGaugeRef.current;
        return gauge.enabled && !gauge.isBreathing
            && gauge.furyGauge >= DRAGON_FURY_MAX
            && gauge.mightGauge >= DRAGON_MIGHT_MAX;
    }, []);

    // Trigger Dragon Breath — destroys all terrain, awards bonus score
    const triggerDragonBreath = useCallback((): number => {
        const gauge = dragonGaugeRef.current;
        if (!gauge.enabled || gauge.isBreathing) return 0;

        const now = Date.now();
        setDragonGauge(prev => ({ ...prev, isBreathing: true, breathStartTime: now }));
        dragonGaugeRef.current = { ...dragonGaugeRef.current, isBreathing: true, breathStartTime: now };

        // Destroy ALL remaining terrain
        const remaining = terrainTotalRef.current - terrainDestroyedCountRef.current;
        if (remaining > 0) {
            destroyTerrain(remaining);
        }

        // Award bonus score
        const bonus = DRAGON_BREATH_SCORE_BONUS * levelRef.current;
        updateScore(scoreRef.current + bonus);

        return remaining;
    }, [destroyTerrain, updateScore]);

    // End Dragon Breath — reset gauges
    const endDragonBreath = useCallback(() => {
        setDragonGauge({
            furyGauge: 0,
            mightGauge: 0,
            isBreathing: false,
            breathStartTime: 0,
            enabled: dragonGaugeRef.current.enabled,
        });
        dragonGaugeRef.current = {
            furyGauge: 0,
            mightGauge: 0,
            isBreathing: false,
            breathStartTime: 0,
            enabled: dragonGaugeRef.current.enabled,
        };
    }, []);

    // ===== Treasure Box System =====

    // Roll a random treasure box tier based on current world index
    const rollTreasureBoxTier = useCallback((currentWorldIdx: number): TreasureBoxTier => {
        const tiers: TreasureBoxTier[] = ['wooden', 'iron', 'golden', 'crystal'];
        const worldSlot = Math.min(currentWorldIdx, 4);
        const weights = tiers.map(t => TREASURE_BOX_TIER_WEIGHTS[t][worldSlot]);
        const total = weights.reduce((s, w) => s + w, 0);
        let roll = Math.random() * total;
        for (let i = 0; i < tiers.length; i++) {
            roll -= weights[i];
            if (roll <= 0) return tiers[i];
        }
        return 'wooden';
    }, []);

    // Generate rewards for a treasure box based on its tier
    const generateTreasureBoxRewards = useCallback((tier: TreasureBoxTier, currentWorldIdx: number): TreasureBoxReward[] => {
        const config = TREASURE_BOX_TIERS[tier];
        const rewards: TreasureBoxReward[] = [];

        // Always give materials
        const materialCount = Math.ceil(2 * config.materialRewardMultiplier);
        const materialItems: { itemId: string; count: number }[] = [];
        for (let i = 0; i < materialCount; i++) {
            const itemId = rollItem(tier === 'crystal' ? 0.5 : tier === 'golden' ? 0.3 : 0);
            const existing = materialItems.find(m => m.itemId === itemId);
            if (existing) {
                existing.count++;
            } else {
                materialItems.push({ itemId, count: 1 });
            }
        }
        rewards.push({ type: 'materials', items: materialItems });

        // Score bonus
        const scoreBonus = Math.floor(config.scoreRewardBase * (1 + currentWorldIdx * 0.5));
        rewards.push({ type: 'score_bonus', amount: scoreBonus });

        // Chance for free card (no cost)
        if (Math.random() < config.freeCardChance) {
            const card = ROGUE_CARDS[Math.floor(Math.random() * ROGUE_CARDS.length)];
            rewards.push({ type: 'free_card', card });
        }

        // Chance for temporary effect boost
        if (Math.random() < config.effectBoostChance) {
            const boostOptions: Array<{ effect: TreasureBoxBoostEffect; value: number }> = [
                { effect: 'score_boost', value: 0.25 },
                { effect: 'terrain_surge', value: 0.2 },
                { effect: 'lucky_drops', value: 0.2 },
                { effect: 'gravity_slow', value: 0.15 },
            ];
            const chosen = boostOptions[Math.floor(Math.random() * boostOptions.length)];
            rewards.push({
                type: 'effect_boost',
                effect: chosen.effect,
                value: chosen.value,
                duration: 1, // lasts for next stage
            });
        }

        return rewards;
    }, []);

    // Check if a treasure box should spawn for the given stage
    const shouldSpawnTreasureBox = useCallback((stage: number): boolean => {
        // Guaranteed on interval stages (3, 6, 9, ...)
        if (stage > 1 && stage % TREASURE_BOX_STAGE_INTERVAL === 0) return true;
        // Random chance on other stages (skip stage 1)
        if (stage > 1 && Math.random() < TREASURE_BOX_RANDOM_CHANCE) return true;
        return false;
    }, []);

    // Generate and enter treasure box phase
    const enterTreasureBox = useCallback(() => {
        const tier = rollTreasureBoxTier(worldIdxRef.current);
        const rewards = generateTreasureBoxRewards(tier, worldIdxRef.current);
        const box: TreasureBox = {
            id: nextTreasureBoxId++,
            tier,
            rewards,
            opened: false,
            spawnStage: stageNumberRef.current,
        };
        setCurrentTreasureBox(box);
        setShowTreasureBox(true);
        setGamePhase('TREASURE_BOX');
        gamePhaseRef.current = 'TREASURE_BOX';
        setIsPaused(true);
    }, [rollTreasureBoxTier, generateTreasureBoxRewards]);

    // Open the treasure box and collect rewards
    const openTreasureBox = useCallback(() => {
        const box = currentTreasureBox;
        if (!box || box.opened) return;

        // Mark as opened
        setCurrentTreasureBox(prev => prev ? { ...prev, opened: true } : null);

        // Track whether cards/effects need updating
        let updatedCards = equippedCardsRef.current;
        let updatedEffects = activeEffectsRef.current;
        let cardsChanged = false;
        let effectsBoosted = false;

        // Apply rewards
        for (const reward of box.rewards) {
            switch (reward.type) {
                case 'materials':
                    setInventory(prev => {
                        const updated = [...prev];
                        for (const item of reward.items) {
                            const existing = updated.find(i => i.itemId === item.itemId);
                            if (existing) {
                                existing.count += item.count;
                            } else {
                                updated.push({ itemId: item.itemId, count: item.count });
                            }
                        }
                        return updated;
                    });
                    break;

                case 'score_bonus':
                    updateScore(scoreRef.current + reward.amount);
                    break;

                case 'free_card': {
                    const cardId = reward.card.id;
                    const existing = updatedCards.find(ec => ec.cardId === cardId);
                    if (existing && existing.stackCount < 3) {
                        updatedCards = updatedCards.map(ec =>
                            ec.cardId === cardId
                                ? { ...ec, stackCount: ec.stackCount + 1 }
                                : ec
                        );
                        cardsChanged = true;
                    } else if (!existing) {
                        updatedCards = [...updatedCards, { cardId, equippedAt: Date.now(), stackCount: 1 }];
                        cardsChanged = true;
                    }
                    break;
                }

                case 'effect_boost': {
                    // Apply temporary effect boost
                    updatedEffects = { ...updatedEffects };
                    switch (reward.effect) {
                        case 'score_boost':
                            updatedEffects.scoreBoostMultiplier += reward.value;
                            break;
                        case 'terrain_surge':
                            updatedEffects.terrainSurgeBonus += reward.value;
                            break;
                        case 'lucky_drops':
                            updatedEffects.luckyDropsBonus += reward.value;
                            break;
                        case 'gravity_slow':
                            updatedEffects.gravitySlowFactor = Math.max(0.1, updatedEffects.gravitySlowFactor - reward.value);
                            break;
                    }
                    effectsBoosted = true;
                    break;
                }
            }
        }

        // Synchronize cards, effects, and refs outside of setter callbacks
        if (cardsChanged) {
            equippedCardsRef.current = updatedCards;
            setEquippedCards(updatedCards);
            // Recompute base effects from cards, then layer boosts on top
            updatedEffects = computeActiveEffects(updatedCards);
            // Re-apply any effect boosts from this box
            for (const reward of box.rewards) {
                if (reward.type === 'effect_boost') {
                    switch (reward.effect) {
                        case 'score_boost':
                            updatedEffects.scoreBoostMultiplier += reward.value;
                            break;
                        case 'terrain_surge':
                            updatedEffects.terrainSurgeBonus += reward.value;
                            break;
                        case 'lucky_drops':
                            updatedEffects.luckyDropsBonus += reward.value;
                            break;
                        case 'gravity_slow':
                            updatedEffects.gravitySlowFactor = Math.max(0.1, updatedEffects.gravitySlowFactor - reward.value);
                            break;
                    }
                }
            }
        }

        if (cardsChanged || effectsBoosted) {
            activeEffectsRef.current = updatedEffects;
            setActiveEffects(updatedEffects);
        }
    }, [currentTreasureBox, computeActiveEffects, updateScore]);

    // Finish treasure box phase and proceed to card select
    const finishTreasureBox = useCallback(() => {
        setShowTreasureBox(false);
        setCurrentTreasureBox(null);
        // Proceed to card select
        enterCardSelect();
    }, [enterCardSelect]);

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

    // Add garbage rows to the bottom of the board (used by TD: enemy reach + corruption raids)
    const addGarbageRows = useCallback((count: number) => {
        setBoard(prev => {
            const rows: (string | null)[][] = [];
            for (let g = 0; g < count; g++) {
                const gapCol = Math.floor(Math.random() * BOARD_WIDTH);
                rows.push(Array.from({ length: BOARD_WIDTH }, (_, i) => i === gapCol ? null : 'garbage'));
            }
            const newBoard = [...prev.slice(count), ...rows];
            boardRef.current = newBoard;
            return newBoard;
        });
    }, []);

    // Spawn an enemy at a specific grid cell (used by corruption system)
    const spawnEnemyAtCell = useCallback((gx: number, gz: number) => {
        const occupied = getOccupiedCells();
        const key = `${gx},${gz}`;
        if (occupied.has(key)) return;

        const worldX = gx * GRID_TILE_SIZE;
        const worldZ = gz * GRID_TILE_SIZE;

        const enemy: Enemy = {
            id: nextEnemyId++,
            x: worldX, y: 0.5, z: worldZ,
            gridX: gx, gridZ: gz,
            speed: 1,
            health: ENEMY_HP,
            maxHealth: ENEMY_HP,
            alive: true,
            spawnTime: Date.now(),
        };
        setEnemies(prev => [...prev, enemy]);
        enemiesRef.current = [...enemiesRef.current, enemy];
    }, [getOccupiedCells]);

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
            // Abort transition if player died during collapse
            if (gameOverRef.current) return;

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
                // Abort transition if player died during checkpoint
                if (gameOverRef.current) return;

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
            // Abort transition if player died during collapse
            if (gameOverRef.current) return;

            // Check for treasure box spawn before card select
            if (shouldSpawnTreasureBox(stageNumberRef.current)) {
                enterTreasureBox();
            } else {
                enterCardSelect();
            }
        }, 1200);
    }, [enterCardSelect, shouldSpawnTreasureBox, enterTreasureBox]);

    // Initialize/reset game
    const initGame = useCallback((mode: GameMode = 'vanilla', protocolModifiers?: ProtocolModifiers) => {
        const mods = protocolModifiers ?? DEFAULT_PROTOCOL_MODIFIERS;
        setProtocolMods(mods);
        protocolModsRef.current = mods;

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
        setEquippedCards([]);
        equippedCardsRef.current = [];
        setShowCardSelect(false);
        setOfferedCards([]);
        setActiveEffects(DEFAULT_ACTIVE_EFFECTS);

        // Reset dragon gauge
        setDragonGauge(DEFAULT_DRAGON_GAUGE);
        dragonGaugeRef.current = { ...DEFAULT_DRAGON_GAUGE };

        // Reset treasure box state
        setCurrentTreasureBox(null);
        setShowTreasureBox(false);

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
        absorbingCardId,
        // Game mode
        gameMode,
        // Protocol modifiers
        protocolMods,
        protocolModsRef,
        // Terrain phase
        terrainPhase,
        tdBeatsRemaining,

        // Dragon gauge
        dragonGauge,

        // Treasure box
        currentTreasureBox,
        showTreasureBox,

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
        finishAbsorption,
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
        // Dragon gauge actions
        chargeDragonFury,
        chargeDragonMight,
        isDragonBreathReady,
        triggerDragonBreath,
        endDragonBreath,
        dragonGaugeRef,
        // Treasure box actions
        openTreasureBox,
        finishTreasureBox,
        // Tower defense actions
        spawnEnemies,
        updateEnemies,
        killEnemies,
        fireBullet,
        updateBullets,
        setEnemies,
        setTowerHealth,
        towerHealthRef,
        addGarbageRows,
        spawnEnemyAtCell,
    };
}
