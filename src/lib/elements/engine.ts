import type {
    ElementType, ReactionType, ElementalState, ElementalAffinity,
    ReactionGameContext, ReactionResult, ActiveReaction,
} from './types';
import { ALL_ELEMENTS, DEFAULT_ELEMENTAL_STATE } from './types';
import {
    ELEMENT_CONFIGS, ALL_ELEMENT_CONFIGS, TOTAL_ELEMENT_DROP_WEIGHT,
    REACTION_DEFINITIONS, ALL_REACTION_DEFINITIONS, REACTION_PRIORITY,
} from './definitions';

// ===== Constants =====

export const MAX_ELEMENT_ORBS = 10;
export const ORBS_PER_LINE_CLEAR = 1;
export const REACTION_ORB_COST = 3;

// ===== Orb Generation =====

/**
 * Roll which element orb to generate based on piece type affinity and bonuses.
 * Returns the element type to spawn.
 */
export function rollElementOrb(
    pieceType: string,
    worldIdx: number,
    affinityBonuses: ElementalAffinity[] = [],
): ElementType {
    // Build weighted pool
    const weights: { element: ElementType; weight: number }[] = ALL_ELEMENT_CONFIGS.map(config => {
        const baseWeight = config.dropWeight;
        const pieceBonus = config.pieceAffinity[pieceType] ?? 0;
        const affinityBonus = affinityBonuses
            .filter(a => a.element === config.type)
            .reduce((sum, a) => sum + a.bonus, 0);

        // World scaling: later worlds slightly increase rare element weights
        const worldScale = 1 + (worldIdx * 0.05);

        return {
            element: config.type,
            weight: (baseWeight + pieceBonus * 3) * (1 + affinityBonus / 100) * worldScale,
        };
    });

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const { element, weight } of weights) {
        roll -= weight;
        if (roll <= 0) return element;
    }

    return 'fire'; // Fallback
}

/**
 * Calculate how many orbs to spawn from a line clear.
 * Base: 1 per line, bonus from beat judgment and combo.
 */
export function calculateOrbCount(
    lineCount: number,
    onBeat: boolean,
    combo: number,
): number {
    let count = lineCount * ORBS_PER_LINE_CLEAR;

    // Perfect beat bonus: +1 orb
    if (onBeat) count += 1;

    // High combo bonus: +1 at combo 5+
    if (combo >= 5) count += 1;

    return Math.min(count, 4); // Cap at 4 orbs per clear
}

// ===== Reaction Checking =====

/**
 * Check if a specific reaction can be triggered with current orb counts.
 */
export function canTriggerReaction(
    orbs: Record<ElementType, number>,
    reactionType: ReactionType,
): boolean {
    const def = REACTION_DEFINITIONS[reactionType];
    if (!def) return false;

    // Corruption is special: dark + any other element with 3+ orbs
    if (reactionType === 'corruption') {
        if (orbs.dark < REACTION_ORB_COST) return false;
        return ALL_ELEMENTS.some(el => el !== 'dark' && orbs[el] >= REACTION_ORB_COST);
    }

    const [el1, el2] = def.elements;
    return orbs[el1] >= def.orbCost && orbs[el2] >= def.orbCost;
}

/**
 * Find all reactions that can currently be triggered.
 */
export function findAvailableReactions(
    orbs: Record<ElementType, number>,
): ReactionType[] {
    return ALL_REACTION_DEFINITIONS
        .map(def => def.type)
        .filter(type => canTriggerReaction(orbs, type));
}

/**
 * Find the best available reaction by priority order.
 */
export function findBestReaction(
    orbs: Record<ElementType, number>,
    recentReactions: { type: ReactionType; time: number }[] = [],
    now: number = Date.now(),
): ReactionType | null {
    for (const type of REACTION_PRIORITY) {
        if (!canTriggerReaction(orbs, type)) continue;

        // Check cooldown
        const def = REACTION_DEFINITIONS[type];
        const lastUse = recentReactions.find(r => r.type === type);
        if (lastUse && (now - lastUse.time) < def.cooldown) continue;

        return type;
    }
    return null;
}

// ===== Orb Consumption =====

/**
 * Consume orbs for a reaction. Returns new orb counts.
 */
export function consumeOrbs(
    orbs: Record<ElementType, number>,
    reactionType: ReactionType,
): Record<ElementType, number> {
    const newOrbs = { ...orbs };
    const def = REACTION_DEFINITIONS[reactionType];

    if (reactionType === 'corruption') {
        // Dark + best available non-dark element
        newOrbs.dark = Math.max(0, newOrbs.dark - REACTION_ORB_COST);
        // Find the non-dark element with most orbs
        let bestEl: ElementType = 'fire';
        let bestCount = 0;
        for (const el of ALL_ELEMENTS) {
            if (el !== 'dark' && newOrbs[el] > bestCount) {
                bestCount = newOrbs[el];
                bestEl = el;
            }
        }
        newOrbs[bestEl] = Math.max(0, newOrbs[bestEl] - REACTION_ORB_COST);
    } else {
        const [el1, el2] = def.elements;
        newOrbs[el1] = Math.max(0, newOrbs[el1] - def.orbCost);
        newOrbs[el2] = Math.max(0, newOrbs[el2] - def.orbCost);
    }

    return newOrbs;
}

// ===== Reaction Effects =====

/**
 * Roll corruption outcome: 70% success, 30% backfire.
 */
export function rollCorruptionOutcome(): 'success' | 'backfire' {
    return Math.random() < 0.7 ? 'success' : 'backfire';
}

/**
 * Apply a reaction and return its gameplay effects.
 */
export function applyReactionEffect(
    reactionType: ReactionType,
    context: ReactionGameContext,
): ReactionResult {
    const base: ReactionResult = {
        terrainDamageMultiplier: 1.0,
        scoreMultiplier: 1.0,
        bonusItems: 0,
        garbageRowsToSelf: 0,
        garbageRowsToEnemy: 0,
        clearGarbageRows: 0,
        slowGravityFactor: 1.0,
        dotDamagePerBeat: 0,
        chainDamageClears: 0,
        reactionType,
        success: true,
    };

    const def = REACTION_DEFINITIONS[reactionType];
    const params = def.effectParams;

    switch (reactionType) {
        case 'vaporize':
            base.terrainDamageMultiplier = params.terrainDamageMultiplier;
            break;

        case 'melt':
            base.clearGarbageRows = params.clearGarbageRows;
            base.slowGravityFactor = params.slowGravityFactor;
            break;

        case 'electro_charge':
            base.chainDamageClears = params.chainDamageClears;
            break;

        case 'superconduct':
            base.scoreMultiplier = params.scoreMultiplier;
            break;

        case 'burning':
            base.dotDamagePerBeat = params.dotDamagePerBeat;
            break;

        case 'bloom': {
            const min = params.bonusItemsMin;
            const max = params.bonusItemsMax;
            base.bonusItems = Math.floor(Math.random() * (max - min + 1)) + min;
            break;
        }

        case 'corruption': {
            const outcome = rollCorruptionOutcome();
            if (outcome === 'success') {
                base.terrainDamageMultiplier = params.successDamageMultiplier;
            } else {
                base.garbageRowsToSelf = params.backfireGarbageRows;
                base.success = false;
            }
            break;
        }
    }

    return base;
}

// ===== Active Reaction Management =====

let nextReactionId = 0;

/**
 * Create an ActiveReaction entry for tracking duration.
 */
export function createActiveReaction(
    reactionType: ReactionType,
    intensity: number = 1.0,
): ActiveReaction {
    const def = REACTION_DEFINITIONS[reactionType];
    return {
        id: nextReactionId++,
        type: reactionType,
        startTime: Date.now(),
        duration: def.duration,
        intensity,
    };
}

/**
 * Filter out expired reactions from the active list.
 */
export function pruneExpiredReactions(
    reactions: ActiveReaction[],
    now: number = Date.now(),
): ActiveReaction[] {
    return reactions.filter(r => {
        if (r.duration === 0) return false; // Instant reactions don't persist
        return (now - r.startTime) < r.duration;
    });
}

/**
 * Check if a specific reaction type is currently active.
 */
export function isReactionActive(
    reactions: ActiveReaction[],
    type: ReactionType,
    now: number = Date.now(),
): boolean {
    return reactions.some(r => r.type === type && (r.duration === 0 || (now - r.startTime) < r.duration));
}

// ===== State Helpers =====

/**
 * Create a fresh elemental state for a new game.
 */
export function createFreshElementalState(): ElementalState {
    return JSON.parse(JSON.stringify(DEFAULT_ELEMENTAL_STATE));
}

/**
 * Add orbs to state, clamping at MAX_ELEMENT_ORBS.
 */
export function addOrbs(
    orbs: Record<ElementType, number>,
    element: ElementType,
    count: number,
): Record<ElementType, number> {
    const newOrbs = { ...orbs };
    newOrbs[element] = Math.min(MAX_ELEMENT_ORBS, newOrbs[element] + count);
    return newOrbs;
}
