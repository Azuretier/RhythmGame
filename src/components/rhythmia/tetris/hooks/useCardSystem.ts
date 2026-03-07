/**
 * Card system sub-hook: rogue-like card selection, equipping, and active effects.
 * Extracted from useGameState to reduce file size.
 */
import { useState, useRef, useCallback, useEffect, type MutableRefObject } from 'react';
import type { EquippedCard, ActiveEffects, CardOffer, GamePhase, InventoryItem, TerrainPhase } from '../types';
import {
    ROGUE_CARDS, RARITY_OFFER_WEIGHTS, CARDS_OFFERED,
    DEFAULT_ACTIVE_EFFECTS, TERRAINS_PER_WORLD, WORLDS,
    MAX_HEALTH,
} from '../constants';
import { computeActiveEffects as computeActiveEffectsImpl } from '../utils/cardEffects';
import { useEquipment } from '@/lib/equipment/context';

export interface UseCardSystemDeps {
    /** Refs from core game state */
    inventoryRef: MutableRefObject<InventoryItem[]>;
    worldIdxRef: MutableRefObject<number>;
    stageNumberRef: MutableRefObject<number>;
    gameOverRef: MutableRefObject<boolean>;
    gamePhaseRef: MutableRefObject<GamePhase>;
    terrainDestroyedCountRef: MutableRefObject<number>;
    /** State setters from core */
    setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    setWorldIdx: React.Dispatch<React.SetStateAction<number>>;
    setStageNumber: React.Dispatch<React.SetStateAction<number>>;
    setTerrainSeed: React.Dispatch<React.SetStateAction<number>>;
    setTerrainDestroyedCount: React.Dispatch<React.SetStateAction<number>>;
    setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
    setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
    setTerrainPhase: React.Dispatch<React.SetStateAction<TerrainPhase>>;
    setTowerHealth: (value: number) => void;
    /** Ref setters for in-sync updates */
    terrainPhaseRef: MutableRefObject<TerrainPhase>;
    towerHealthRef: MutableRefObject<number>;
}

export function useCardSystem(deps: UseCardSystemDeps) {
    const {
        inventoryRef, worldIdxRef, stageNumberRef, gameOverRef, gamePhaseRef,
        terrainDestroyedCountRef,
        setInventory, setWorldIdx, setStageNumber, setTerrainSeed,
        setTerrainDestroyedCount, setIsPaused, setGamePhase,
        setTerrainPhase, setTowerHealth,
        terrainPhaseRef, towerHealthRef,
    } = deps;

    // ===== Rogue-Like Card State =====
    const [equippedCards, setEquippedCards] = useState<EquippedCard[]>([]);
    const [showCardSelect, setShowCardSelect] = useState(false);
    const [offeredCards, setOfferedCards] = useState<CardOffer[]>([]);
    const [activeEffects, setActiveEffects] = useState<ActiveEffects>(DEFAULT_ACTIVE_EFFECTS);
    const activeEffectsRef = useRef<ActiveEffects>(DEFAULT_ACTIVE_EFFECTS);
    const [absorbingCardId, setAbsorbingCardId] = useState<string | null>(null);
    const equippedCardsRef = useRef<EquippedCard[]>([]);

    // Keep refs in sync
    useEffect(() => { activeEffectsRef.current = activeEffects; }, [activeEffects]);
    useEffect(() => { equippedCardsRef.current = equippedCards; }, [equippedCards]);

    // Equipment bonuses
    const { getBonuses: getEquipmentBonuses } = useEquipment();

    // Compute active effects from all equipped cards
    const computeActiveEffects = useCallback((cards: EquippedCard[]): ActiveEffects => {
        return computeActiveEffectsImpl(cards, getEquipmentBonuses());
    }, [getEquipmentBonuses]);

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
    }, [inventoryRef]);

    // Reset per-stage effects (combo_guard uses, shield) at stage start
    const resetStageEffects = useCallback(() => {
        const freshEffects = computeActiveEffects(equippedCardsRef.current);
        setActiveEffects(freshEffects);
    }, [computeActiveEffects]);

    // Start a new terrain stage
    const startNewStage = useCallback((newStageNumber: number) => {
        setStageNumber(newStageNumber);
        stageNumberRef.current = newStageNumber;

        const newWorldIdx = Math.min(
            Math.floor((newStageNumber - 1) / TERRAINS_PER_WORLD),
            WORLDS.length - 1
        );
        setWorldIdx(newWorldIdx);
        worldIdxRef.current = newWorldIdx;

        setTerrainSeed(newStageNumber * 7919 + 42);
        setTerrainDestroyedCount(0);
        terrainDestroyedCountRef.current = 0;

        resetStageEffects();
    }, [resetStageEffects, setStageNumber, stageNumberRef, setWorldIdx, worldIdxRef, setTerrainSeed, setTerrainDestroyedCount, terrainDestroyedCountRef]);

    // Finish card select and proceed to next stage
    const finishCardSelect = useCallback(() => {
        setShowCardSelect(false);
        setIsPaused(false);

        if (gameOverRef.current) return;

        const nextStage = stageNumberRef.current + 1;
        startNewStage(nextStage);

        setTerrainPhase('dig');
        terrainPhaseRef.current = 'dig';

        setTowerHealth(MAX_HEALTH);
        towerHealthRef.current = MAX_HEALTH;

        setGamePhase('WORLD_CREATION');
        gamePhaseRef.current = 'WORLD_CREATION';

        setTimeout(() => {
            if (gameOverRef.current) return;
            setGamePhase('PLAYING');
            gamePhaseRef.current = 'PLAYING';
        }, 1500);
    }, [startNewStage, setIsPaused, gameOverRef, stageNumberRef, setTerrainPhase, terrainPhaseRef, setTowerHealth, towerHealthRef, setGamePhase, gamePhaseRef]);

    // Enter card selection phase
    const enterCardSelect = useCallback(() => {
        const offers = generateCardOffers(worldIdxRef.current);
        setOfferedCards(offers);
        setShowCardSelect(true);
        setGamePhase('CARD_SELECT');
        gamePhaseRef.current = 'CARD_SELECT';
        setIsPaused(true);
    }, [generateCardOffers, worldIdxRef, setGamePhase, gamePhaseRef, setIsPaused]);

    // Select a card from offers
    const selectCard = useCallback((cardId: string): boolean => {
        const offer = offeredCards.find(o => o.card.id === cardId);
        if (!offer) return false;

        const currentInv = inventoryRef.current;
        const canAfford = offer.scaledCost.every(c => {
            const inv = currentInv.find(i => i.itemId === c.itemId);
            return inv && inv.count >= c.count;
        });
        if (!canAfford) return false;

        const invCopy = currentInv.map(i => ({ ...i }));
        for (const cost of offer.scaledCost) {
            const item = invCopy.find(i => i.itemId === cost.itemId)!;
            item.count -= cost.count;
        }
        setInventory(invCopy.filter(i => i.count > 0));

        setEquippedCards(prev => {
            const existing = prev.find(ec => ec.cardId === cardId);
            let updated: EquippedCard[];
            if (existing && existing.stackCount < 3) {
                updated = prev.map(ec =>
                    ec.cardId === cardId
                        ? { ...ec, stackCount: ec.stackCount + 1 }
                        : ec
                );
            } else if (existing) {
                updated = prev;
            } else {
                updated = [...prev, { cardId, equippedAt: Date.now(), stackCount: 1 }];
            }
            const effects = computeActiveEffects(updated);
            setActiveEffects(effects);
            equippedCardsRef.current = updated;
            return updated;
        });

        setAbsorbingCardId(cardId);
        setGamePhase('CARD_ABSORBING');
        gamePhaseRef.current = 'CARD_ABSORBING';
        return true;
    }, [offeredCards, computeActiveEffects, inventoryRef, setInventory, setGamePhase, gamePhaseRef]);

    // Called after absorption animation completes
    const finishAbsorption = useCallback(() => {
        setAbsorbingCardId(null);
        finishCardSelect();
    }, [finishCardSelect]);

    // Skip card selection
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

    // Consume a shield use
    const consumeShield = useCallback((): boolean => {
        if (activeEffectsRef.current.shieldUsesRemaining > 0) {
            setActiveEffects(prev => ({
                ...prev,
                shieldUsesRemaining: prev.shieldUsesRemaining - 1,
            }));
            return true;
        }
        return false;
    }, []);

    // Reset card system for new game
    const resetCardSystem = useCallback(() => {
        setEquippedCards([]);
        equippedCardsRef.current = [];
        setShowCardSelect(false);
        setOfferedCards([]);
        setActiveEffects(DEFAULT_ACTIVE_EFFECTS);
    }, []);

    return {
        // State
        equippedCards,
        showCardSelect,
        offeredCards,
        activeEffects,
        activeEffectsRef,
        absorbingCardId,
        equippedCardsRef,
        // Actions
        computeActiveEffects,
        enterCardSelect,
        selectCard,
        skipCardSelect,
        finishAbsorption,
        consumeComboGuard,
        consumeShield,
        startNewStage,
        finishCardSelect,
        resetStageEffects,
        resetCardSystem,
        // Setters (for external use)
        setEquippedCards,
        setActiveEffects,
    };
}
