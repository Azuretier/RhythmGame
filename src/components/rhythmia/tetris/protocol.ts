// ===== Protocol System =====
// Protocols are difficulty modifiers that apply across all 5 worlds.
// Protocols I–III adjust difficulty multipliers; IV–V add advanced rulesets.

export interface ProtocolDefinition {
    id: number;
    numeral: string;
    name: string;
    nameJa: string;
    bpmMultiplier: number;
    gravityMultiplier: number;
    beatWindowMultiplier: number;
    scoreMultiplier: number;
    accentColor: string;
    description: string;
    descriptionJa: string;
    advancedRules: AdvancedRule[];
}

export type AdvancedRule =
    | 'enemy_hp_boost'       // Enemies +50% HP (Protocol III)
    | 'garbage_rows'         // Garbage rows spawn every 30s (Protocol IV)
    | 'phase_swap'           // Random terrain phase swaps (Protocol IV)
    | 'invisible_preview'    // Next piece preview hidden (Protocol V)
    | 'shrunk_beat_window';  // Additional beat window reduction (Protocol V)

export const PROTOCOLS: ProtocolDefinition[] = [
    {
        id: 0,
        numeral: 'I',
        name: 'Standard',
        nameJa: 'スタンダード',
        bpmMultiplier: 1.0,
        gravityMultiplier: 1.0,
        beatWindowMultiplier: 1.0,
        scoreMultiplier: 1.0,
        accentColor: '#4CAF50',
        description: 'Base difficulty. The standard Rhythmia experience.',
        descriptionJa: '基本難易度。標準的なリズミア体験。',
        advancedRules: [],
    },
    {
        id: 1,
        numeral: 'II',
        name: 'Accelerated',
        nameJa: 'アクセラレート',
        bpmMultiplier: 1.1,
        gravityMultiplier: 1.15,
        beatWindowMultiplier: 0.95,
        scoreMultiplier: 1.2,
        accentColor: '#2196F3',
        description: 'Faster tempo and gravity. Tighter timing.',
        descriptionJa: 'テンポと重力が上昇。判定が厳しくなる。',
        advancedRules: [],
    },
    {
        id: 2,
        numeral: 'III',
        name: 'Fortified',
        nameJa: 'フォートレス',
        bpmMultiplier: 1.2,
        gravityMultiplier: 1.3,
        beatWindowMultiplier: 0.9,
        scoreMultiplier: 1.5,
        accentColor: '#FF9800',
        description: 'Enemies gain +50% HP. Relentless rhythm.',
        descriptionJa: '敵のHP+50%。容赦ないリズム。',
        advancedRules: ['enemy_hp_boost'],
    },
    {
        id: 3,
        numeral: 'IV',
        name: 'Chaos',
        nameJa: 'カオス',
        bpmMultiplier: 1.3,
        gravityMultiplier: 1.3,
        beatWindowMultiplier: 0.85,
        scoreMultiplier: 2.0,
        accentColor: '#FF5252',
        description: 'Garbage rows every 30s. Random phase disruptions.',
        descriptionJa: '30秒毎にお邪魔ブロック。フェーズがランダムに変化。',
        advancedRules: ['enemy_hp_boost', 'garbage_rows', 'phase_swap'],
    },
    {
        id: 4,
        numeral: 'V',
        name: 'Transcendence',
        nameJa: 'トランセンデンス',
        bpmMultiplier: 1.4,
        gravityMultiplier: 1.5,
        beatWindowMultiplier: 0.8,
        scoreMultiplier: 3.0,
        accentColor: '#CE93D8',
        description: 'All Chaos effects + invisible preview. The ultimate test.',
        descriptionJa: 'カオスの全効果＋ネクスト非表示。究極の試練。',
        advancedRules: ['enemy_hp_boost', 'garbage_rows', 'phase_swap', 'invisible_preview', 'shrunk_beat_window'],
    },
];

// Runtime modifier struct passed to game state
export interface ProtocolModifiers {
    bpmMultiplier: number;
    gravityMultiplier: number;
    beatWindowMultiplier: number;
    scoreMultiplier: number;
    advancedRules: AdvancedRule[];
}

export const DEFAULT_PROTOCOL_MODIFIERS: ProtocolModifiers = {
    bpmMultiplier: 1,
    gravityMultiplier: 1,
    beatWindowMultiplier: 1,
    scoreMultiplier: 1,
    advancedRules: [],
};

export function getModifiers(protocolId: number): ProtocolModifiers {
    const protocol = PROTOCOLS[protocolId];
    if (!protocol) return DEFAULT_PROTOCOL_MODIFIERS;
    return {
        bpmMultiplier: protocol.bpmMultiplier,
        gravityMultiplier: protocol.gravityMultiplier,
        beatWindowMultiplier: protocol.beatWindowMultiplier,
        scoreMultiplier: protocol.scoreMultiplier,
        advancedRules: protocol.advancedRules,
    };
}
