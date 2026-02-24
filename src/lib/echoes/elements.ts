// =============================================================================
// ECHOES OF ETERNITY — Elemental Reaction System
// 元素反応システム
// =============================================================================

import type {
  Element,
  ElementalReaction,
  ElementalReactionType,
  StatusEffectType,
  FieldElement,
  Position2D,
  CharacterStats,
} from '@/types/echoes';

// ---------------------------------------------------------------------------
// Reaction Definitions
// ---------------------------------------------------------------------------

export const ELEMENTAL_REACTIONS: Record<ElementalReactionType, ElementalReaction> = {
  vaporize: {
    type: 'vaporize',
    trigger: ['fire', 'water'],
    damageMultiplier: 2.0,
    effectDuration: 0,
    description: 'Fire + Water: Vaporize — 2x damage burst',
    descriptionJa: '炎+水: 蒸発 — 2倍ダメージ',
  },
  melt: {
    type: 'melt',
    trigger: ['fire', 'ice'],
    damageMultiplier: 1.5,
    effectDuration: 0,
    description: 'Fire + Ice: Melt — 1.5x damage burst',
    descriptionJa: '炎+氷: 溶解 — 1.5倍ダメージ',
  },
  overload: {
    type: 'overload',
    trigger: ['fire', 'thunder'],
    damageMultiplier: 1.2,
    effectDuration: 0,
    aoeRadius: 3,
    description: 'Fire + Thunder: Overload — AoE explosion',
    descriptionJa: '炎+雷: 過負荷 — 範囲爆発',
  },
  superconduct: {
    type: 'superconduct',
    trigger: ['ice', 'thunder'],
    damageMultiplier: 1.0,
    effectDuration: 80,
    statusEffect: 'def_down',
    description: 'Ice + Thunder: Superconduct — DEF -40% for 8s',
    descriptionJa: '氷+雷: 超電導 — 防御力-40% (8秒)',
  },
  freeze: {
    type: 'freeze',
    trigger: ['water', 'ice'],
    damageMultiplier: 0,
    effectDuration: 40,
    statusEffect: 'freeze',
    description: 'Water + Ice: Freeze — Immobilize target',
    descriptionJa: '水+氷: 凍結 — 対象を行動不能に',
  },
  electrocharge: {
    type: 'electrocharge',
    trigger: ['water', 'thunder'],
    damageMultiplier: 0.8,
    effectDuration: 50,
    statusEffect: 'shock',
    aoeRadius: 2,
    description: 'Water + Thunder: Electrocharge — Chain damage to nearby wet enemies',
    descriptionJa: '水+雷: 感電 — 周囲の濡れた敵に連鎖ダメージ',
  },
  swirl: {
    type: 'swirl',
    trigger: ['wind', 'fire'], // wind + any non-wind/earth/light/dark
    damageMultiplier: 0.6,
    effectDuration: 30,
    aoeRadius: 4,
    description: 'Wind + Element: Swirl — Spread element in AoE',
    descriptionJa: '風+元素: 拡散 — 元素を範囲に拡散',
  },
  crystallize: {
    type: 'crystallize',
    trigger: ['earth', 'fire'], // earth + any non-earth/wind/light/dark
    damageMultiplier: 0,
    effectDuration: 100,
    statusEffect: 'shield',
    description: 'Earth + Element: Crystallize — Create elemental shield',
    descriptionJa: '地+元素: 結晶化 — 元素シールド生成',
  },
  radiance: {
    type: 'radiance',
    trigger: ['light', 'dark'],
    damageMultiplier: 3.0,
    effectDuration: 0,
    aoeRadius: 5,
    description: 'Light + Dark: Radiance — Massive burst damage',
    descriptionJa: '光+闇: 輝滅 — 超大ダメージ爆発',
  },
  purify: {
    type: 'purify',
    trigger: ['light', 'dark'], // specifically light applied to debuffed target
    damageMultiplier: 0.5,
    effectDuration: 0,
    description: 'Light + Debuff: Purify — Cleanse debuffs and heal',
    descriptionJa: '光+デバフ: 浄化 — デバフ解除＋回復',
  },
  corrupt: {
    type: 'corrupt',
    trigger: ['dark', 'light'], // dark applied to any
    damageMultiplier: 0.3,
    effectDuration: 80,
    statusEffect: 'corrupt',
    description: 'Dark + Element: Corrupt — DoT and random debuff',
    descriptionJa: '闇+元素: 侵蝕 — 継続ダメージ＋ランダムデバフ',
  },
  sandstorm: {
    type: 'sandstorm',
    trigger: ['earth', 'wind'],
    damageMultiplier: 0.7,
    effectDuration: 60,
    statusEffect: 'blind',
    aoeRadius: 5,
    description: 'Earth + Wind: Sandstorm — Blind and AoE damage',
    descriptionJa: '地+風: 砂嵐 — 暗闘＋範囲ダメージ',
  },
  steamcloud: {
    type: 'steamcloud',
    trigger: ['water', 'fire'],
    damageMultiplier: 0.4,
    effectDuration: 50,
    statusEffect: 'blind',
    aoeRadius: 3,
    description: 'Water + Fire (area): Steamcloud — Vision block and burn',
    descriptionJa: '水+炎(範囲): 蒸気雲 — 視界遮断＋火傷',
  },
  permafrost: {
    type: 'permafrost',
    trigger: ['ice', 'earth'],
    damageMultiplier: 0.5,
    effectDuration: 80,
    statusEffect: 'slow',
    aoeRadius: 4,
    description: 'Ice + Earth: Permafrost — Terrain freeze and slow',
    descriptionJa: '氷+地: 永久凍土 — 地形凍結＋鈍足',
  },
  thunderstorm: {
    type: 'thunderstorm',
    trigger: ['water', 'wind', 'thunder'],
    damageMultiplier: 2.5,
    effectDuration: 60,
    statusEffect: 'shock',
    aoeRadius: 6,
    description: 'Water + Wind + Thunder: Thunderstorm — Triple reaction devastation',
    descriptionJa: '水+風+雷: 暴風雨 — 三重反応の猛威',
  },
};

// ---------------------------------------------------------------------------
// Reaction lookup table (element pair → possible reactions)
// ---------------------------------------------------------------------------

type ElementPairKey = `${Element}_${Element}`;

const REACTION_LOOKUP: Record<string, ElementalReactionType[]> = {};

function registerReaction(a: Element, b: Element, reaction: ElementalReactionType) {
  const key1: ElementPairKey = `${a}_${b}`;
  const key2: ElementPairKey = `${b}_${a}`;
  if (!REACTION_LOOKUP[key1]) REACTION_LOOKUP[key1] = [];
  if (!REACTION_LOOKUP[key2]) REACTION_LOOKUP[key2] = [];
  if (!REACTION_LOOKUP[key1].includes(reaction)) REACTION_LOOKUP[key1].push(reaction);
  if (!REACTION_LOOKUP[key2].includes(reaction)) REACTION_LOOKUP[key2].push(reaction);
}

// Register all dual-element reactions
registerReaction('fire', 'water', 'vaporize');
registerReaction('fire', 'ice', 'melt');
registerReaction('fire', 'thunder', 'overload');
registerReaction('ice', 'thunder', 'superconduct');
registerReaction('water', 'ice', 'freeze');
registerReaction('water', 'thunder', 'electrocharge');
registerReaction('earth', 'wind', 'sandstorm');
registerReaction('ice', 'earth', 'permafrost');
registerReaction('light', 'dark', 'radiance');

// Swirl: wind + any offensive element
for (const elem of ['fire', 'water', 'ice', 'thunder'] as Element[]) {
  registerReaction('wind', elem, 'swirl');
}

// Crystallize: earth + any offensive element
for (const elem of ['fire', 'water', 'ice', 'thunder'] as Element[]) {
  registerReaction('earth', elem, 'crystallize');
}

// Corrupt: dark + any element
for (const elem of ['fire', 'water', 'ice', 'thunder', 'wind', 'earth'] as Element[]) {
  registerReaction('dark', elem, 'corrupt');
}

// ---------------------------------------------------------------------------
// Core Reaction Engine
// ---------------------------------------------------------------------------

export interface ReactionResult {
  reaction: ElementalReaction;
  bonusDamage: number;
  statusApplied?: { type: StatusEffectType; duration: number; value: number };
  aoeTargets?: string[]; // IDs of affected targets in AoE
  fieldEffect?: FieldElement;
}

/**
 * Check if two elements can trigger a reaction
 */
export function canReact(a: Element, b: Element): boolean {
  if (a === b) return false;
  const key: ElementPairKey = `${a}_${b}`;
  return !!REACTION_LOOKUP[key]?.length;
}

/**
 * Get all possible reactions between two elements
 */
export function getReactions(a: Element, b: Element): ElementalReactionType[] {
  const key: ElementPairKey = `${a}_${b}`;
  return REACTION_LOOKUP[key] || [];
}

/**
 * Check for triple-element reactions
 */
export function getTripleReaction(elements: Element[]): ElementalReactionType | null {
  if (elements.length < 3) return null;
  const sorted = [...elements].sort();

  // Thunderstorm: water + wind + thunder
  if (sorted.includes('water') && sorted.includes('wind') && sorted.includes('thunder')) {
    return 'thunderstorm';
  }
  return null;
}

/**
 * Resolve the best reaction from applying an element to an existing element on target
 */
export function resolveBestReaction(
  appliedElement: Element,
  existingElement: Element,
  fieldElements: Element[] = []
): ElementalReactionType | null {
  // Check for triple reactions first
  const allElements = [appliedElement, existingElement, ...fieldElements];
  const uniqueElements = [...new Set(allElements)];
  const tripleReaction = getTripleReaction(uniqueElements);
  if (tripleReaction) return tripleReaction;

  // Get dual reactions
  const reactions = getReactions(appliedElement, existingElement);
  if (reactions.length === 0) return null;

  // Prioritize higher-damage reactions
  let best: ElementalReactionType | null = null;
  let bestMultiplier = 0;

  for (const r of reactions) {
    const def = ELEMENTAL_REACTIONS[r];
    if (def.damageMultiplier > bestMultiplier) {
      bestMultiplier = def.damageMultiplier;
      best = r;
    }
  }

  return best;
}

/**
 * Calculate reaction damage based on character stats
 */
export function calculateReactionDamage(
  reactionType: ElementalReactionType,
  baseDamage: number,
  elementalMastery: number,
  attackerLevel: number
): number {
  const reaction = ELEMENTAL_REACTIONS[reactionType];
  if (!reaction) return 0;

  // Elemental mastery bonus: diminishing returns formula
  const emBonus = 1 + (2.78 * elementalMastery) / (elementalMastery + 1400);

  // Level scaling
  const levelMultiplier = 1 + (attackerLevel - 1) * 0.02;

  return Math.floor(baseDamage * reaction.damageMultiplier * emBonus * levelMultiplier);
}

/**
 * Get the status effect created by a reaction
 */
export function getReactionStatus(
  reactionType: ElementalReactionType,
  elementalMastery: number
): { type: StatusEffectType; duration: number; value: number } | null {
  const reaction = ELEMENTAL_REACTIONS[reactionType];
  if (!reaction.statusEffect) return null;

  // EM extends duration slightly
  const durationBonus = Math.floor(elementalMastery / 100);

  // Calculate effect value based on reaction type
  let value = 0;
  switch (reaction.statusEffect) {
    case 'def_down':
      value = 0.4; // 40% defense reduction
      break;
    case 'freeze':
      value = 1; // full immobilize
      break;
    case 'shock':
      value = 0.3; // 30% of ATK as periodic damage
      break;
    case 'blind':
      value = 0.5; // 50% accuracy reduction
      break;
    case 'slow':
      value = 0.4; // 40% speed reduction
      break;
    case 'shield':
      value = 200 + elementalMastery * 2; // shield HP
      break;
    case 'corrupt':
      value = 0.15; // 15% max HP as DoT
      break;
    default:
      value = 0.2;
  }

  return {
    type: reaction.statusEffect,
    duration: reaction.effectDuration + durationBonus,
    value,
  };
}

// ---------------------------------------------------------------------------
// Element advantage chart
// ---------------------------------------------------------------------------

const ELEMENT_ADVANTAGE: Record<Element, Element[]> = {
  fire: ['ice', 'wind'],
  water: ['fire', 'earth'],
  ice: ['water', 'thunder'],
  thunder: ['water', 'wind'],
  wind: ['earth', 'dark'],
  earth: ['thunder', 'fire'],
  light: ['dark'],
  dark: ['light'],
};

/**
 * Check if attacker element has advantage over defender
 */
export function hasElementAdvantage(attacker: Element, defender: Element): boolean {
  return ELEMENT_ADVANTAGE[attacker]?.includes(defender) ?? false;
}

/**
 * Get damage modifier based on elemental advantage
 */
export function getElementDamageModifier(attacker: Element, defender: Element): number {
  if (attacker === defender) return 0.5; // resistance
  if (hasElementAdvantage(attacker, defender)) return 1.5; // advantage
  if (hasElementAdvantage(defender, attacker)) return 0.75; // disadvantage
  return 1.0; // neutral
}

// ---------------------------------------------------------------------------
// Element colors & display metadata
// ---------------------------------------------------------------------------

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#FF4500',
  water: '#1E90FF',
  ice: '#87CEEB',
  thunder: '#FFD700',
  wind: '#98FB98',
  earth: '#D2691E',
  light: '#FFFFFF',
  dark: '#4B0082',
};

export const ELEMENT_ICONS: Record<Element, string> = {
  fire: '🔥',
  water: '💧',
  ice: '❄️',
  thunder: '⚡',
  wind: '🌪️',
  earth: '🪨',
  light: '✨',
  dark: '🌑',
};

export const ELEMENT_NAMES_JA: Record<Element, string> = {
  fire: '炎',
  water: '水',
  ice: '氷',
  thunder: '雷',
  wind: '風',
  earth: '地',
  light: '光',
  dark: '闇',
};

// ---------------------------------------------------------------------------
// Field element helpers
// ---------------------------------------------------------------------------

/**
 * Create a field element at a position (e.g., from an AoE reaction)
 */
export function createFieldElement(
  element: Element,
  position: Position2D,
  sourceId: string,
  radius: number = 2,
  duration: number = 50
): FieldElement {
  return {
    element,
    position,
    radius,
    duration,
    sourceId,
  };
}

/**
 * Check if a position is within a field element's area
 */
export function isInFieldElement(field: FieldElement, pos: Position2D): boolean {
  const dx = field.position.x - pos.x;
  const dy = field.position.y - pos.y;
  return Math.sqrt(dx * dx + dy * dy) <= field.radius;
}

/**
 * Get elements affecting a position from field elements
 */
export function getFieldElementsAtPosition(fields: FieldElement[], pos: Position2D): Element[] {
  return fields.filter((f) => f.duration > 0 && isInFieldElement(f, pos)).map((f) => f.element);
}

/**
 * Calculate total stat modifiers from elemental mastery
 */
export function getElementalMasteryBonuses(em: number): Partial<CharacterStats> {
  return {
    critRate: em * 0.0002,       // small crit boost
    critDamage: em * 0.001,      // small crit damage boost
  };
}
