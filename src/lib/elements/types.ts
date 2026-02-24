// ===== Element System Types =====

export type ElementType = 'fire' | 'water' | 'ice' | 'lightning' | 'nature' | 'dark';

export type ReactionType =
    | 'vaporize'        // Fire + Water: 2x terrain damage burst
    | 'melt'            // Fire + Ice: clear garbage rows + slow gravity
    | 'electro_charge'  // Water + Lightning: chain damage on next clears
    | 'superconduct'    // Ice + Lightning: +50% score multiplier
    | 'burning'         // Nature + Fire: DoT on terrain per beat
    | 'bloom'           // Nature + Water: spawn bonus item drops
    | 'corruption';     // Dark + any: 70% 3x damage, 30% self-garbage

export const ALL_ELEMENTS: ElementType[] = ['fire', 'water', 'ice', 'lightning', 'nature', 'dark'];

export const ALL_REACTIONS: ReactionType[] = [
    'vaporize', 'melt', 'electro_charge', 'superconduct', 'burning', 'bloom', 'corruption',
];

// ===== Orb System =====

export interface ElementOrb {
    id: number;
    element: ElementType;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    startTime: number;
    duration: number;
    collected: boolean;
}

// ===== Elemental State (per-game session, not persisted) =====

export interface ElementalState {
    /** Accumulated orbs per element (0 to MAX_ELEMENT_ORBS) */
    orbs: Record<ElementType, number>;
    /** Currently active reactions with remaining duration */
    activeReactions: ActiveReaction[];
    /** Total reactions triggered this game */
    totalReactions: number;
    /** Reaction counts by type this game */
    reactionCounts: Record<ReactionType, number>;
}

export interface ActiveReaction {
    id: number;
    type: ReactionType;
    startTime: number;
    duration: number;
    /** Reaction-specific intensity (1.0 = base, corruption can be higher) */
    intensity: number;
}

// ===== Definitions =====

export interface ReactionDefinition {
    type: ReactionType;
    /** Pair of elements that trigger this reaction (order-independent) */
    elements: [ElementType, ElementType];
    name: string;
    nameJa: string;
    description: string;
    descriptionJa: string;
    icon: string;
    color: string;
    glowColor: string;
    /** Duration in ms (0 = instant) */
    duration: number;
    /** Cooldown in ms before same reaction can trigger again */
    cooldown: number;
    /** Orbs consumed from each participating element */
    orbCost: number;
    /** Reaction-specific effect parameters */
    effectParams: Record<string, number>;
}

export interface ElementConfig {
    type: ElementType;
    name: string;
    nameJa: string;
    color: string;
    glowColor: string;
    icon: string;
    /** Weighted affinity per piece type (higher = more likely to spawn this element) */
    pieceAffinity: Partial<Record<string, number>>;
    /** Base drop weight from line clears */
    dropWeight: number;
}

// ===== Elemental Affinity Bonus (from equipment/skill tree) =====

export interface ElementalAffinity {
    element: ElementType;
    /** +% bonus to drop rate for this element's orbs */
    bonus: number;
}

// ===== Reaction Context & Result =====

export interface ReactionGameContext {
    currentDamage: number;
    terrainRemaining: number;
    combo: number;
    worldIdx: number;
    score: number;
}

export interface ReactionResult {
    terrainDamageMultiplier: number;
    scoreMultiplier: number;
    bonusItems: number;
    garbageRowsToSelf: number;
    garbageRowsToEnemy: number;
    clearGarbageRows: number;
    slowGravityFactor: number;
    dotDamagePerBeat: number;
    chainDamageClears: number;
    reactionType: ReactionType;
    success: boolean;
}

// ===== Default State =====

export const DEFAULT_ELEMENTAL_STATE: ElementalState = {
    orbs: { fire: 0, water: 0, ice: 0, lightning: 0, nature: 0, dark: 0 },
    activeReactions: [],
    totalReactions: 0,
    reactionCounts: {
        vaporize: 0, melt: 0, electro_charge: 0, superconduct: 0,
        burning: 0, bloom: 0, corruption: 0,
    },
};

// ===== Elemental Preferences (persisted) =====

export interface ElementalPreferences {
    /** Player's preferred element (for UI accent theming) */
    favoriteElement: ElementType | null;
}

export const DEFAULT_ELEMENTAL_PREFERENCES: ElementalPreferences = {
    favoriteElement: null,
};
