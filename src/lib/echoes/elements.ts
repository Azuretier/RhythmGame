// =============================================================
// Echoes of Eternity — Elemental Reaction System
// Inspired by Genshin Impact's elemental combo mechanic
// =============================================================

import type {
  Element,
  ElementalReaction,
  ReactionType,
  StatusEffect,
  ActiveStatusEffect,
} from '@/types/echoes';

// === Reaction Definitions ===

export const REACTIONS: ElementalReaction[] = [
  {
    type: 'vaporize',
    trigger: ['fire', 'water'],
    damageMultiplier: 2.0,
    statusEffect: 'burn',
    duration: 2,
    description: 'Steam explosion — 2x damage',
  },
  {
    type: 'melt',
    trigger: ['fire', 'ice'],
    damageMultiplier: 1.5,
    statusEffect: 'burn',
    duration: 1,
    description: 'Thaw blast — 1.5x damage + shatter',
  },
  {
    type: 'overload',
    trigger: ['fire', 'lightning'],
    damageMultiplier: 1.8,
    description: 'AoE explosion — 1.8x damage to all',
  },
  {
    type: 'superconduct',
    trigger: ['ice', 'lightning'],
    damageMultiplier: 1.3,
    statusEffect: 'freeze',
    duration: 2,
    description: 'DEF shred — 1.3x damage + defense down',
  },
  {
    type: 'freeze',
    trigger: ['water', 'ice'],
    damageMultiplier: 1.0,
    statusEffect: 'freeze',
    duration: 3,
    description: 'Immobilize target for 3 turns',
  },
  {
    type: 'electro_charge',
    trigger: ['water', 'lightning'],
    damageMultiplier: 1.5,
    statusEffect: 'shock',
    duration: 2,
    description: 'Chain lightning — 1.5x damage + shock',
  },
  {
    type: 'swirl',
    trigger: ['wind', 'fire'],
    damageMultiplier: 1.4,
    description: 'Spread element — 1.4x damage + AoE application',
  },
  {
    type: 'crystallize',
    trigger: ['earth', 'fire'],
    damageMultiplier: 0.8,
    statusEffect: 'shield',
    duration: 3,
    description: 'Create elemental shield — absorbs damage',
  },
  {
    type: 'eclipse',
    trigger: ['light', 'dark'],
    damageMultiplier: 3.0,
    description: 'Massive burst — 3x damage',
  },
  {
    type: 'annihilate',
    trigger: ['void', 'fire'],
    damageMultiplier: 2.5,
    description: 'True damage — ignores defense',
  },
];

// Wind swirls with all combat elements
const SWIRL_ELEMENTS: Element[] = ['fire', 'water', 'ice', 'lightning'];
// Earth crystallizes with all combat elements
const CRYSTALLIZE_ELEMENTS: Element[] = ['fire', 'water', 'ice', 'lightning'];
// Void annihilates with everything
const ANNIHILATE_ELEMENTS: Element[] = ['fire', 'water', 'ice', 'lightning', 'wind', 'earth', 'light', 'dark'];

/**
 * Check if two elements trigger a reaction.
 * Order doesn't matter — both orderings are checked.
 */
export function findReaction(elementA: Element, elementB: Element): ElementalReaction | null {
  if (elementA === elementB) {
    return {
      type: 'resonance',
      trigger: [elementA, elementB],
      damageMultiplier: 1.2,
      description: 'Elemental resonance — team buff',
    };
  }

  // Check wind swirl
  if (elementA === 'wind' && SWIRL_ELEMENTS.includes(elementB)) {
    return { ...REACTIONS.find(r => r.type === 'swirl')!, trigger: [elementA, elementB] };
  }
  if (elementB === 'wind' && SWIRL_ELEMENTS.includes(elementA)) {
    return { ...REACTIONS.find(r => r.type === 'swirl')!, trigger: [elementB, elementA] };
  }

  // Check earth crystallize
  if (elementA === 'earth' && CRYSTALLIZE_ELEMENTS.includes(elementB)) {
    return { ...REACTIONS.find(r => r.type === 'crystallize')!, trigger: [elementA, elementB] };
  }
  if (elementB === 'earth' && CRYSTALLIZE_ELEMENTS.includes(elementA)) {
    return { ...REACTIONS.find(r => r.type === 'crystallize')!, trigger: [elementB, elementA] };
  }

  // Check void annihilate
  if (elementA === 'void' && ANNIHILATE_ELEMENTS.includes(elementB)) {
    return { ...REACTIONS.find(r => r.type === 'annihilate')!, trigger: [elementA, elementB] };
  }
  if (elementB === 'void' && ANNIHILATE_ELEMENTS.includes(elementA)) {
    return { ...REACTIONS.find(r => r.type === 'annihilate')!, trigger: [elementB, elementA] };
  }

  // Check direct reactions (both orderings)
  for (const reaction of REACTIONS) {
    const [a, b] = reaction.trigger;
    if ((elementA === a && elementB === b) || (elementA === b && elementB === a)) {
      return reaction;
    }
  }

  return null;
}

/**
 * Calculate reaction damage given base damage, element mastery, and reaction.
 */
export function calculateReactionDamage(
  baseDamage: number,
  elementalMastery: number,
  reaction: ElementalReaction,
): number {
  const masteryBonus = 1 + (elementalMastery / 500);
  const reactionDamage = baseDamage * reaction.damageMultiplier * masteryBonus;

  // Annihilate does true damage (ignores defense), handled in combat engine
  return Math.round(reactionDamage);
}

/**
 * Get status effect from a reaction, if any.
 */
export function getReactionStatusEffect(reaction: ElementalReaction): ActiveStatusEffect | null {
  if (!reaction.statusEffect) return null;

  return {
    status: reaction.statusEffect,
    duration: reaction.duration || 2,
    source: `reaction:${reaction.type}`,
    value: getStatusEffectValue(reaction.statusEffect),
  };
}

function getStatusEffectValue(status: StatusEffect): number {
  switch (status) {
    case 'burn': return 5;       // 5% max HP per turn
    case 'freeze': return 0;     // immobilize
    case 'shock': return 3;      // 3% max HP chain damage
    case 'poison': return 4;     // 4% max HP per turn
    case 'bleed': return 3;      // 3% max HP per turn
    case 'stun': return 0;       // skip turn
    case 'silence': return 0;    // can't use abilities
    case 'haste': return 20;     // +20% speed
    case 'shield': return 15;    // absorb 15% max HP
    case 'regen': return 5;      // 5% max HP per turn
    case 'atk_up': return 25;    // +25% ATK
    case 'def_up': return 25;    // +25% DEF
    case 'crit_up': return 15;   // +15% crit rate
    case 'rhythm_sync': return 10; // +10% rhythm accuracy bonus
    case 'elemental_surge': return 30; // +30% elemental damage
    default: return 0;
  }
}

/**
 * Process status effects at end of turn.
 * Returns updated effects array and damage dealt.
 */
export function processStatusEffects(
  effects: ActiveStatusEffect[],
  maxHp: number,
): { updatedEffects: ActiveStatusEffect[]; damageDealt: number; healed: number; skipTurn: boolean; silenced: boolean } {
  let damageDealt = 0;
  let healed = 0;
  let skipTurn = false;
  let silenced = false;

  const updatedEffects: ActiveStatusEffect[] = [];

  for (const effect of effects) {
    switch (effect.status) {
      case 'burn':
        damageDealt += Math.round(maxHp * (effect.value || 5) / 100);
        break;
      case 'poison':
        damageDealt += Math.round(maxHp * (effect.value || 4) / 100);
        break;
      case 'bleed':
        damageDealt += Math.round(maxHp * (effect.value || 3) / 100);
        break;
      case 'shock':
        damageDealt += Math.round(maxHp * (effect.value || 3) / 100);
        break;
      case 'freeze':
      case 'stun':
        skipTurn = true;
        break;
      case 'silence':
        silenced = true;
        break;
      case 'regen':
        healed += Math.round(maxHp * (effect.value || 5) / 100);
        break;
    }

    // Decrement duration
    if (effect.duration > 1) {
      updatedEffects.push({ ...effect, duration: effect.duration - 1 });
    }
    // Duration 1 means it expires this turn — don't add back
  }

  return { updatedEffects, damageDealt, healed, skipTurn, silenced };
}

/**
 * Get display name for a reaction type.
 */
export function getReactionName(type: ReactionType): string {
  const names: Record<ReactionType, string> = {
    vaporize: 'Vaporize',
    melt: 'Melt',
    overload: 'Overload',
    superconduct: 'Superconduct',
    freeze: 'Freeze',
    electro_charge: 'Electro-Charge',
    swirl: 'Swirl',
    crystallize: 'Crystallize',
    eclipse: 'Eclipse',
    annihilate: 'Annihilate',
    resonance: 'Resonance',
  };
  return names[type];
}

/**
 * Get all possible reactions for a given element.
 */
export function getElementReactions(element: Element): { withElement: Element; reaction: ReactionType }[] {
  const results: { withElement: Element; reaction: ReactionType }[] = [];
  const allElements: Element[] = ['fire', 'water', 'ice', 'lightning', 'wind', 'earth', 'light', 'dark', 'void'];

  for (const other of allElements) {
    if (other === element) {
      results.push({ withElement: other, reaction: 'resonance' });
      continue;
    }
    const reaction = findReaction(element, other);
    if (reaction) {
      results.push({ withElement: other, reaction: reaction.type });
    }
  }

  return results;
}
