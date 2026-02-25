import type { ElementConfig, ReactionDefinition } from './types';

// ===== Element Configurations =====
// Piece affinity: I=Cyan, O=Yellow, T=Purple, S=Green, Z=Red, J=Blue, L=Orange

export const ELEMENT_CONFIGS: Record<string, ElementConfig> = {
    fire: {
        type: 'fire',
        name: 'Fire',
        nameJa: '炎',
        color: '#FF4444',
        glowColor: '#FF8866',
        icon: '🔥',
        pieceAffinity: { Z: 8, L: 6, O: 2 },
        dropWeight: 18,
    },
    water: {
        type: 'water',
        name: 'Water',
        nameJa: '水',
        color: '#4488FF',
        glowColor: '#66AAFF',
        icon: '💧',
        pieceAffinity: { J: 8, I: 5, T: 2 },
        dropWeight: 18,
    },
    ice: {
        type: 'ice',
        name: 'Ice',
        nameJa: '氷',
        color: '#88DDFF',
        glowColor: '#BBEEFF',
        icon: '❄️',
        pieceAffinity: { I: 7, J: 3, S: 2 },
        dropWeight: 14,
    },
    lightning: {
        type: 'lightning',
        name: 'Lightning',
        nameJa: '雷',
        color: '#FFDD44',
        glowColor: '#FFEE88',
        icon: '⚡',
        pieceAffinity: { O: 8, L: 3, Z: 2 },
        dropWeight: 14,
    },
    nature: {
        type: 'nature',
        name: 'Nature',
        nameJa: '自然',
        color: '#44CC44',
        glowColor: '#66EE66',
        icon: '🌿',
        pieceAffinity: { S: 8, T: 3, I: 2 },
        dropWeight: 14,
    },
    dark: {
        type: 'dark',
        name: 'Dark',
        nameJa: '闇',
        color: '#9944CC',
        glowColor: '#BB66EE',
        icon: '🌑',
        pieceAffinity: { T: 8, Z: 2, J: 1 },
        dropWeight: 8,
    },
};

/** Ordered array of all element configs for iteration */
export const ALL_ELEMENT_CONFIGS: ElementConfig[] = [
    ELEMENT_CONFIGS.fire,
    ELEMENT_CONFIGS.water,
    ELEMENT_CONFIGS.ice,
    ELEMENT_CONFIGS.lightning,
    ELEMENT_CONFIGS.nature,
    ELEMENT_CONFIGS.dark,
];

/** Total drop weight across all elements */
export const TOTAL_ELEMENT_DROP_WEIGHT = ALL_ELEMENT_CONFIGS.reduce(
    (sum, el) => sum + el.dropWeight, 0
);

// ===== Reaction Definitions =====

export const REACTION_DEFINITIONS: Record<string, ReactionDefinition> = {
    vaporize: {
        type: 'vaporize',
        elements: ['fire', 'water'],
        name: 'Vaporize',
        nameJa: '蒸発',
        description: '2x terrain damage burst',
        descriptionJa: '地形ダメージ2倍バースト',
        icon: '💨',
        color: '#FF8844',
        glowColor: '#FFAA66',
        duration: 0,
        cooldown: 3000,
        orbCost: 3,
        effectParams: { terrainDamageMultiplier: 2.0 },
    },
    melt: {
        type: 'melt',
        elements: ['fire', 'ice'],
        name: 'Melt',
        nameJa: '融解',
        description: 'Clear 2 garbage rows and slow gravity',
        descriptionJa: 'ゴミ行2列消去＆重力低下',
        icon: '🫠',
        color: '#FF6688',
        glowColor: '#FF88AA',
        duration: 5000,
        cooldown: 5000,
        orbCost: 3,
        effectParams: { clearGarbageRows: 2, slowGravityFactor: 0.5 },
    },
    electro_charge: {
        type: 'electro_charge',
        elements: ['water', 'lightning'],
        name: 'Electro-Charged',
        nameJa: '感電',
        description: 'Chain damage on next 3 line clears',
        descriptionJa: '次の3回のライン消去で連鎖ダメージ',
        icon: '⚡',
        color: '#44AAFF',
        glowColor: '#66CCFF',
        duration: 4000,
        cooldown: 4000,
        orbCost: 3,
        effectParams: { chainDamageClears: 3 },
    },
    superconduct: {
        type: 'superconduct',
        elements: ['ice', 'lightning'],
        name: 'Superconduct',
        nameJa: '超電導',
        description: '+50% score multiplier',
        descriptionJa: 'スコア倍率+50%',
        icon: '🔮',
        color: '#88BBFF',
        glowColor: '#AADDFF',
        duration: 6000,
        cooldown: 6000,
        orbCost: 3,
        effectParams: { scoreMultiplier: 1.5 },
    },
    burning: {
        type: 'burning',
        elements: ['nature', 'fire'],
        name: 'Burning',
        nameJa: '燃焼',
        description: '1 terrain block destroyed per beat (DoT)',
        descriptionJa: 'ビートごとに地形ブロック1個破壊',
        icon: '🔥',
        color: '#FF6644',
        glowColor: '#FF8866',
        duration: 8000,
        cooldown: 6000,
        orbCost: 3,
        effectParams: { dotDamagePerBeat: 1 },
    },
    bloom: {
        type: 'bloom',
        elements: ['nature', 'water'],
        name: 'Bloom',
        nameJa: '開花',
        description: 'Spawn 5-8 bonus item drops',
        descriptionJa: 'ボーナスアイテム5～8個出現',
        icon: '🌸',
        color: '#44CC88',
        glowColor: '#66EEAA',
        duration: 0,
        cooldown: 5000,
        orbCost: 3,
        effectParams: { bonusItemsMin: 5, bonusItemsMax: 8 },
    },
    corruption: {
        type: 'corruption',
        elements: ['dark', 'dark'], // Special: dark + any other element
        name: 'Corruption',
        nameJa: '侵蝕',
        description: '70%: 3x damage burst, 30%: 2 garbage rows to self',
        descriptionJa: '70%: 3倍ダメージ、30%: 自分にゴミ行2列',
        icon: '💀',
        color: '#9944CC',
        glowColor: '#BB66EE',
        duration: 3000,
        cooldown: 4000,
        orbCost: 3,
        effectParams: {
            successChance: 0.7,
            successDamageMultiplier: 3.0,
            backfireGarbageRows: 2,
        },
    },
};

/** Ordered array of all reaction definitions */
export const ALL_REACTION_DEFINITIONS: ReactionDefinition[] = [
    REACTION_DEFINITIONS.vaporize,
    REACTION_DEFINITIONS.melt,
    REACTION_DEFINITIONS.electro_charge,
    REACTION_DEFINITIONS.superconduct,
    REACTION_DEFINITIONS.burning,
    REACTION_DEFINITIONS.bloom,
    REACTION_DEFINITIONS.corruption,
];

/**
 * Priority order for auto-triggering reactions (highest first).
 * Corruption is lowest because it's risky.
 */
export const REACTION_PRIORITY: ReactionDefinition['type'][] = [
    'vaporize',
    'electro_charge',
    'superconduct',
    'burning',
    'melt',
    'bloom',
    'corruption',
];
