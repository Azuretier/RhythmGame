/**
 * Dragon Gauge + Treasure Box sub-hook.
 * Extracted from useGameState to reduce file size.
 */
import { useState, useRef, useCallback, useEffect, type MutableRefObject } from 'react';
import type {
    DragonGaugeState, ActiveEffects, EquippedCard, GamePhase,
    TreasureBox, TreasureBoxTier, TreasureBoxReward, TreasureBoxBoostEffect,
} from '../types';
import {
    DEFAULT_DRAGON_GAUGE, DRAGON_FURY_MAX, DRAGON_MIGHT_MAX,
    DRAGON_BREATH_SCORE_BONUS,
    DRAGON_FURY_CHARGE, DRAGON_MIGHT_CHARGE,
    TREASURE_BOX_STAGE_INTERVAL, TREASURE_BOX_RANDOM_CHANCE,
    TREASURE_BOX_TIER_WEIGHTS, TREASURE_BOX_TIERS,
    ROGUE_CARDS,
} from '../constants';
import { rollItem } from '../utils/cardEffects';

let nextTreasureBoxId = 0;

export interface UseDragonGaugeDeps {
    /** Refs from core game state */
    terrainTotalRef: MutableRefObject<number>;
    terrainDestroyedCountRef: MutableRefObject<number>;
    levelRef: MutableRefObject<number>;
    scoreRef: MutableRefObject<number>;
    worldIdxRef: MutableRefObject<number>;
    stageNumberRef: MutableRefObject<number>;
    gamePhaseRef: MutableRefObject<GamePhase>;
    /** Card system integration */
    activeEffectsRef: MutableRefObject<ActiveEffects>;
    activeEffects: ActiveEffects;
    computeActiveEffects: (cards: EquippedCard[]) => ActiveEffects;
    setActiveEffects: React.Dispatch<React.SetStateAction<ActiveEffects>>;
    setEquippedCards: React.Dispatch<React.SetStateAction<EquippedCard[]>>;
    enterCardSelect: () => void;
    /** Core game actions */
    destroyTerrain: (count: number) => number;
    updateScore: (newScore: number) => void;
    setInventory: React.Dispatch<React.SetStateAction<{ itemId: string; count: number }[]>>;
    setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
    setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useDragonGauge(deps: UseDragonGaugeDeps) {
    const {
        terrainTotalRef, terrainDestroyedCountRef, levelRef, scoreRef,
        worldIdxRef, stageNumberRef, gamePhaseRef,
        activeEffectsRef, activeEffects,
        computeActiveEffects, setActiveEffects, setEquippedCards,
        enterCardSelect,
        destroyTerrain, updateScore, setInventory, setGamePhase, setIsPaused,
    } = deps;

    // ===== Dragon Gauge State =====
    const [dragonGauge, setDragonGauge] = useState<DragonGaugeState>(DEFAULT_DRAGON_GAUGE);
    const dragonGaugeRef = useRef<DragonGaugeState>(DEFAULT_DRAGON_GAUGE);

    // Keep ref in sync
    useEffect(() => { dragonGaugeRef.current = dragonGauge; }, [dragonGauge]);

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
    }, [activeEffectsRef]);

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
    }, [activeEffectsRef]);

    // Check if both gauges are full and ready for Dragon Breath
    const isDragonBreathReady = useCallback((): boolean => {
        const gauge = dragonGaugeRef.current;
        return gauge.enabled && !gauge.isBreathing
            && gauge.furyGauge >= DRAGON_FURY_MAX
            && gauge.mightGauge >= DRAGON_MIGHT_MAX;
    }, []);

    // Trigger Dragon Breath: destroys all terrain, awards bonus score
    const triggerDragonBreath = useCallback((): number => {
        const gauge = dragonGaugeRef.current;
        if (!gauge.enabled || gauge.isBreathing) return 0;

        const now = Date.now();
        setDragonGauge(prev => ({ ...prev, isBreathing: true, breathStartTime: now }));
        dragonGaugeRef.current = { ...dragonGaugeRef.current, isBreathing: true, breathStartTime: now };

        const remaining = terrainTotalRef.current - terrainDestroyedCountRef.current;
        if (remaining > 0) {
            destroyTerrain(remaining);
        }

        const bonus = DRAGON_BREATH_SCORE_BONUS * levelRef.current;
        updateScore(scoreRef.current + bonus);

        return remaining;
    }, [destroyTerrain, updateScore, terrainTotalRef, terrainDestroyedCountRef, levelRef, scoreRef]);

    // End Dragon Breath: reset gauges
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
    const [currentTreasureBox, setCurrentTreasureBox] = useState<TreasureBox | null>(null);
    const [showTreasureBox, setShowTreasureBox] = useState(false);

    // Roll a random treasure box tier
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

    // Generate rewards for a treasure box
    const generateTreasureBoxRewards = useCallback((tier: TreasureBoxTier, currentWorldIdx: number): TreasureBoxReward[] => {
        const config = TREASURE_BOX_TIERS[tier];
        const rewards: TreasureBoxReward[] = [];

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

        const scoreBonus = Math.floor(config.scoreRewardBase * (1 + currentWorldIdx * 0.5));
        rewards.push({ type: 'score_bonus', amount: scoreBonus });

        if (Math.random() < config.freeCardChance) {
            const card = ROGUE_CARDS[Math.floor(Math.random() * ROGUE_CARDS.length)];
            rewards.push({ type: 'free_card', card });
        }

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
                duration: 1,
            });
        }

        return rewards;
    }, []);

    // Check if a treasure box should spawn for the given stage
    const shouldSpawnTreasureBox = useCallback((stage: number): boolean => {
        if (stage > 1 && stage % TREASURE_BOX_STAGE_INTERVAL === 0) return true;
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
    }, [rollTreasureBoxTier, generateTreasureBoxRewards, worldIdxRef, stageNumberRef, setGamePhase, gamePhaseRef, setIsPaused]);

    // Open the treasure box and collect rewards
    const openTreasureBox = useCallback(() => {
        const box = currentTreasureBox;
        if (!box || box.opened) return;

        setCurrentTreasureBox(prev => prev ? { ...prev, opened: true } : null);

        for (const reward of box.rewards) {
            if (reward.type === 'materials') {
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
            } else if (reward.type === 'score_bonus') {
                updateScore(scoreRef.current + reward.amount);
            }
        }

        const freeCardRewards = box.rewards.filter(r => r.type === 'free_card');
        let newCardsSnapshot: EquippedCard[] | null = null;

        if (freeCardRewards.length > 0) {
            setEquippedCards(prev => {
                let cards = prev;
                for (const reward of freeCardRewards) {
                    if (reward.type !== 'free_card') continue;
                    const cardId = reward.card.id;
                    const existing = cards.find(ec => ec.cardId === cardId);
                    if (existing && existing.stackCount < 3) {
                        cards = cards.map(ec =>
                            ec.cardId === cardId
                                ? { ...ec, stackCount: ec.stackCount + 1 }
                                : ec
                        );
                    } else if (!existing) {
                        cards = [...cards, { cardId, equippedAt: Date.now(), stackCount: 1 }];
                    }
                }
                newCardsSnapshot = cards;
                return cards;
            });
        }

        const applyBoosts = (effects: ActiveEffects): ActiveEffects => {
            const result = { ...effects };
            for (const reward of box.rewards) {
                if (reward.type !== 'effect_boost') continue;
                switch (reward.effect) {
                    case 'score_boost':
                        result.scoreBoostMultiplier += reward.value;
                        break;
                    case 'terrain_surge':
                        result.terrainSurgeBonus += reward.value;
                        break;
                    case 'lucky_drops':
                        result.luckyDropsBonus += reward.value;
                        break;
                    case 'gravity_slow':
                        result.gravitySlowFactor = Math.max(0.1, result.gravitySlowFactor - reward.value);
                        break;
                }
            }
            return result;
        };

        const hasEffectBoosts = box.rewards.some(r => r.type === 'effect_boost');

        if (newCardsSnapshot !== null) {
            const effects = applyBoosts(computeActiveEffects(newCardsSnapshot));
            setActiveEffects(effects);
        } else if (hasEffectBoosts) {
            setActiveEffects(prev => applyBoosts(prev));
        }
    }, [currentTreasureBox, computeActiveEffects, updateScore, scoreRef, setInventory, setEquippedCards, setActiveEffects]);

    // Finish treasure box phase and proceed to card select
    const finishTreasureBox = useCallback(() => {
        setShowTreasureBox(false);
        setCurrentTreasureBox(null);
        enterCardSelect();
    }, [enterCardSelect]);

    // Reset dragon gauge and treasure box for new game
    const resetDragonAndTreasure = useCallback(() => {
        setDragonGauge(DEFAULT_DRAGON_GAUGE);
        dragonGaugeRef.current = { ...DEFAULT_DRAGON_GAUGE };
        setCurrentTreasureBox(null);
        setShowTreasureBox(false);
    }, []);

    return {
        // Dragon gauge state
        dragonGauge,
        dragonGaugeRef,
        // Dragon gauge actions
        chargeDragonFury,
        chargeDragonMight,
        isDragonBreathReady,
        triggerDragonBreath,
        endDragonBreath,
        // Treasure box state
        currentTreasureBox,
        showTreasureBox,
        // Treasure box actions
        shouldSpawnTreasureBox,
        enterTreasureBox,
        openTreasureBox,
        finishTreasureBox,
        // Reset
        resetDragonAndTreasure,
    };
}
