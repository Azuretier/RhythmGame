// ===== Elements System — Barrel Export =====

export type {
    ElementType, ReactionType, ElementOrb, ElementalState, ActiveReaction,
    ReactionDefinition, ElementConfig, ElementalAffinity,
    ReactionGameContext, ReactionResult, ElementalPreferences,
} from './types';

export {
    ALL_ELEMENTS, ALL_REACTIONS,
    DEFAULT_ELEMENTAL_STATE, DEFAULT_ELEMENTAL_PREFERENCES,
} from './types';

export {
    ELEMENT_CONFIGS, ALL_ELEMENT_CONFIGS, TOTAL_ELEMENT_DROP_WEIGHT,
    REACTION_DEFINITIONS, ALL_REACTION_DEFINITIONS, REACTION_PRIORITY,
} from './definitions';

export {
    MAX_ELEMENT_ORBS, ORBS_PER_LINE_CLEAR, REACTION_ORB_COST,
    rollElementOrb, calculateOrbCount,
    canTriggerReaction, findAvailableReactions, findBestReaction,
    consumeOrbs, rollCorruptionOutcome, applyReactionEffect,
    createActiveReaction, pruneExpiredReactions, isReactionActive,
    createFreshElementalState, addOrbs,
} from './engine';

export { loadElementalPreferences, saveElementalPreferences } from './storage';
