// =============================================================================
// Potion Registry — Full Minecraft: Nintendo Switch Edition Potions & Brewing
// =============================================================================
// Defines all 30+ potions with their effects, durations, colors, and the
// complete brewing recipe tree. Includes base potions, effect potions, extended
// and enhanced variants, splash/lingering modifiers, and all ingredient
// transformations.
// =============================================================================

import type { StatusEffectType, StatusEffectInstance } from '@/types/minecraft-switch';

// =============================================================================
// TYPES
// =============================================================================

/** Potion variant type determines the bottle appearance and behavior. */
export type PotionVariant = 'normal' | 'splash' | 'lingering';

/** A complete potion definition with all metadata. */
export interface PotionDefinition {
  /** Unique potion ID (e.g. "healing", "speed_extended"). */
  id: string;
  /** Display name in English. */
  name: string;
  /** Display name in Japanese. */
  nameJa: string;
  /** Status effects applied when consumed. */
  effects: StatusEffectInstance[];
  /** Hex color for the potion liquid. */
  color: string;
  /** Base variant (normal, splash, or lingering). */
  variant: PotionVariant;
  /** Whether this is an enhanced (level II) variant. */
  enhanced: boolean;
  /** Whether this is an extended (longer duration) variant. */
  extended: boolean;
}

/** A brewing recipe transforms one potion into another using an ingredient. */
export interface BrewingRecipe {
  /** Item ID of the ingredient placed in the top slot. */
  ingredient: string;
  /** Potion ID of the input (in the bottom slots). */
  input: string;
  /** Potion ID of the result. */
  output: string;
}

// =============================================================================
// HELPER: Create a status effect instance
// =============================================================================

function effect(
  type: StatusEffectType,
  amplifier: number,
  durationTicks: number,
  showParticles: boolean = true
): StatusEffectInstance {
  return {
    type,
    amplifier,
    duration: durationTicks,
    showParticles,
    showIcon: true,
  };
}

// Tick conversion helpers
const SECONDS = (s: number) => s * 20;
const MINUTES = (m: number) => m * 60 * 20;

// =============================================================================
// POTION EFFECTS REGISTRY
// =============================================================================

/**
 * Complete registry of all potions, keyed by potion ID.
 * Includes base potions, effect potions, enhanced (II), and extended variants.
 */
export const POTION_EFFECTS: Record<string, PotionDefinition> = {
  // ---------------------------------------------------------------------------
  // BASE POTIONS (no effects)
  // ---------------------------------------------------------------------------

  water: {
    id: 'water',
    name: 'Water Bottle',
    nameJa: '水入り瓶',
    effects: [],
    color: '#385DC6',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  awkward: {
    id: 'awkward',
    name: 'Awkward Potion',
    nameJa: '奇妙なポーション',
    effects: [],
    color: '#385DC6',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  mundane: {
    id: 'mundane',
    name: 'Mundane Potion',
    nameJa: 'ありふれたポーション',
    effects: [],
    color: '#385DC6',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  thick: {
    id: 'thick',
    name: 'Thick Potion',
    nameJa: '濃厚なポーション',
    effects: [],
    color: '#385DC6',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  // ---------------------------------------------------------------------------
  // HEALING POTIONS
  // ---------------------------------------------------------------------------

  healing: {
    id: 'healing',
    name: 'Potion of Healing',
    nameJa: '治癒のポーション',
    effects: [effect('instant_health', 0, 1)], // Instant: 4 HP
    color: '#F82423',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  healing_ii: {
    id: 'healing_ii',
    name: 'Potion of Healing II',
    nameJa: '治癒のポーション II',
    effects: [effect('instant_health', 1, 1)], // Instant: 8 HP
    color: '#F82423',
    variant: 'normal',
    enhanced: true,
    extended: false,
  },

  // ---------------------------------------------------------------------------
  // REGENERATION POTIONS
  // ---------------------------------------------------------------------------

  regeneration: {
    id: 'regeneration',
    name: 'Potion of Regeneration',
    nameJa: '再生のポーション',
    effects: [effect('regeneration', 0, SECONDS(45))],
    color: '#CD5CAB',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  regeneration_ii: {
    id: 'regeneration_ii',
    name: 'Potion of Regeneration II',
    nameJa: '再生のポーション II',
    effects: [effect('regeneration', 1, SECONDS(22))],
    color: '#CD5CAB',
    variant: 'normal',
    enhanced: true,
    extended: false,
  },

  regeneration_extended: {
    id: 'regeneration_extended',
    name: 'Potion of Regeneration',
    nameJa: '再生のポーション (延長)',
    effects: [effect('regeneration', 0, MINUTES(1) + SECONDS(30))],
    color: '#CD5CAB',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // STRENGTH POTIONS
  // ---------------------------------------------------------------------------

  strength: {
    id: 'strength',
    name: 'Potion of Strength',
    nameJa: '力のポーション',
    effects: [effect('strength', 0, MINUTES(3))], // +3 damage
    color: '#932423',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  strength_ii: {
    id: 'strength_ii',
    name: 'Potion of Strength II',
    nameJa: '力のポーション II',
    effects: [effect('strength', 1, MINUTES(1) + SECONDS(30))], // +6 damage
    color: '#932423',
    variant: 'normal',
    enhanced: true,
    extended: false,
  },

  strength_extended: {
    id: 'strength_extended',
    name: 'Potion of Strength',
    nameJa: '力のポーション (延長)',
    effects: [effect('strength', 0, MINUTES(8))],
    color: '#932423',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // SPEED POTIONS
  // ---------------------------------------------------------------------------

  speed: {
    id: 'speed',
    name: 'Potion of Swiftness',
    nameJa: '俊敏のポーション',
    effects: [effect('speed', 0, MINUTES(3))], // +20% speed
    color: '#7CAFC6',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  speed_ii: {
    id: 'speed_ii',
    name: 'Potion of Swiftness II',
    nameJa: '俊敏のポーション II',
    effects: [effect('speed', 1, MINUTES(1) + SECONDS(30))], // +40% speed
    color: '#7CAFC6',
    variant: 'normal',
    enhanced: true,
    extended: false,
  },

  speed_extended: {
    id: 'speed_extended',
    name: 'Potion of Swiftness',
    nameJa: '俊敏のポーション (延長)',
    effects: [effect('speed', 0, MINUTES(8))],
    color: '#7CAFC6',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // FIRE RESISTANCE POTIONS
  // ---------------------------------------------------------------------------

  fire_resistance: {
    id: 'fire_resistance',
    name: 'Potion of Fire Resistance',
    nameJa: '耐火のポーション',
    effects: [effect('fire_resistance', 0, MINUTES(3))],
    color: '#E49A3A',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  fire_resistance_extended: {
    id: 'fire_resistance_extended',
    name: 'Potion of Fire Resistance',
    nameJa: '耐火のポーション (延長)',
    effects: [effect('fire_resistance', 0, MINUTES(8))],
    color: '#E49A3A',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // NIGHT VISION POTIONS
  // ---------------------------------------------------------------------------

  night_vision: {
    id: 'night_vision',
    name: 'Potion of Night Vision',
    nameJa: '暗視のポーション',
    effects: [effect('night_vision', 0, MINUTES(3))],
    color: '#1F1FA1',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  night_vision_extended: {
    id: 'night_vision_extended',
    name: 'Potion of Night Vision',
    nameJa: '暗視のポーション (延長)',
    effects: [effect('night_vision', 0, MINUTES(8))],
    color: '#1F1FA1',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // WATER BREATHING POTIONS
  // ---------------------------------------------------------------------------

  water_breathing: {
    id: 'water_breathing',
    name: 'Potion of Water Breathing',
    nameJa: '水中呼吸のポーション',
    effects: [effect('water_breathing', 0, MINUTES(3))],
    color: '#2E5299',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  water_breathing_extended: {
    id: 'water_breathing_extended',
    name: 'Potion of Water Breathing',
    nameJa: '水中呼吸のポーション (延長)',
    effects: [effect('water_breathing', 0, MINUTES(8))],
    color: '#2E5299',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // INVISIBILITY POTIONS
  // ---------------------------------------------------------------------------

  invisibility: {
    id: 'invisibility',
    name: 'Potion of Invisibility',
    nameJa: '透明化のポーション',
    effects: [effect('invisibility', 0, MINUTES(3))],
    color: '#7F8392',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  invisibility_extended: {
    id: 'invisibility_extended',
    name: 'Potion of Invisibility',
    nameJa: '透明化のポーション (延長)',
    effects: [effect('invisibility', 0, MINUTES(8))],
    color: '#7F8392',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // LEAPING POTIONS
  // ---------------------------------------------------------------------------

  leaping: {
    id: 'leaping',
    name: 'Potion of Leaping',
    nameJa: '跳躍のポーション',
    effects: [effect('jump_boost', 0, MINUTES(3))],
    color: '#22FF4C',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  leaping_ii: {
    id: 'leaping_ii',
    name: 'Potion of Leaping II',
    nameJa: '跳躍のポーション II',
    effects: [effect('jump_boost', 1, MINUTES(1) + SECONDS(30))],
    color: '#22FF4C',
    variant: 'normal',
    enhanced: true,
    extended: false,
  },

  leaping_extended: {
    id: 'leaping_extended',
    name: 'Potion of Leaping',
    nameJa: '跳躍のポーション (延長)',
    effects: [effect('jump_boost', 0, MINUTES(8))],
    color: '#22FF4C',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // SLOW FALLING POTIONS
  // ---------------------------------------------------------------------------

  slow_falling: {
    id: 'slow_falling',
    name: 'Potion of Slow Falling',
    nameJa: '低速落下のポーション',
    effects: [effect('slow_falling', 0, MINUTES(1) + SECONDS(30))],
    color: '#F7F8E0',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  slow_falling_extended: {
    id: 'slow_falling_extended',
    name: 'Potion of Slow Falling',
    nameJa: '低速落下のポーション (延長)',
    effects: [effect('slow_falling', 0, MINUTES(4))],
    color: '#F7F8E0',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // POISON POTIONS
  // ---------------------------------------------------------------------------

  poison: {
    id: 'poison',
    name: 'Potion of Poison',
    nameJa: '毒のポーション',
    effects: [effect('poison', 0, SECONDS(45))], // 1 HP per 25 ticks
    color: '#4E9331',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  poison_ii: {
    id: 'poison_ii',
    name: 'Potion of Poison II',
    nameJa: '毒のポーション II',
    effects: [effect('poison', 1, SECONDS(21) + 12)], // 21.6 seconds
    color: '#4E9331',
    variant: 'normal',
    enhanced: true,
    extended: false,
  },

  poison_extended: {
    id: 'poison_extended',
    name: 'Potion of Poison',
    nameJa: '毒のポーション (延長)',
    effects: [effect('poison', 0, MINUTES(1) + SECONDS(30))],
    color: '#4E9331',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // WEAKNESS POTIONS
  // ---------------------------------------------------------------------------

  weakness: {
    id: 'weakness',
    name: 'Potion of Weakness',
    nameJa: '弱化のポーション',
    effects: [effect('weakness', 0, MINUTES(1) + SECONDS(30))], // -4 damage
    color: '#484D48',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  weakness_extended: {
    id: 'weakness_extended',
    name: 'Potion of Weakness',
    nameJa: '弱化のポーション (延長)',
    effects: [effect('weakness', 0, MINUTES(4))],
    color: '#484D48',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // HARMING POTIONS
  // ---------------------------------------------------------------------------

  harming: {
    id: 'harming',
    name: 'Potion of Harming',
    nameJa: '負傷のポーション',
    effects: [effect('instant_damage', 0, 1)], // Instant: 6 HP
    color: '#430A09',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  harming_ii: {
    id: 'harming_ii',
    name: 'Potion of Harming II',
    nameJa: '負傷のポーション II',
    effects: [effect('instant_damage', 1, 1)], // Instant: 12 HP
    color: '#430A09',
    variant: 'normal',
    enhanced: true,
    extended: false,
  },

  // ---------------------------------------------------------------------------
  // SLOWNESS POTIONS
  // ---------------------------------------------------------------------------

  slowness: {
    id: 'slowness',
    name: 'Potion of Slowness',
    nameJa: '鈍化のポーション',
    effects: [effect('slowness', 0, MINUTES(1) + SECONDS(30))], // -15% speed
    color: '#5A6C81',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  slowness_iv: {
    id: 'slowness_iv',
    name: 'Potion of Slowness IV',
    nameJa: '鈍化のポーション IV',
    effects: [effect('slowness', 3, SECONDS(20))], // -60% speed
    color: '#5A6C81',
    variant: 'normal',
    enhanced: true,
    extended: false,
  },

  slowness_extended: {
    id: 'slowness_extended',
    name: 'Potion of Slowness',
    nameJa: '鈍化のポーション (延長)',
    effects: [effect('slowness', 0, MINUTES(4))],
    color: '#5A6C81',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },

  // ---------------------------------------------------------------------------
  // TURTLE MASTER POTIONS
  // ---------------------------------------------------------------------------

  turtle_master: {
    id: 'turtle_master',
    name: 'Potion of the Turtle Master',
    nameJa: 'タートルマスターのポーション',
    effects: [
      effect('slowness', 3, SECONDS(20)), // Slowness IV
      effect('resistance', 2, SECONDS(20)), // Resistance III
    ],
    color: '#ACEA7C',
    variant: 'normal',
    enhanced: false,
    extended: false,
  },

  turtle_master_ii: {
    id: 'turtle_master_ii',
    name: 'Potion of the Turtle Master II',
    nameJa: 'タートルマスターのポーション II',
    effects: [
      effect('slowness', 5, SECONDS(20)), // Slowness VI
      effect('resistance', 3, SECONDS(20)), // Resistance IV
    ],
    color: '#ACEA7C',
    variant: 'normal',
    enhanced: true,
    extended: false,
  },

  turtle_master_extended: {
    id: 'turtle_master_extended',
    name: 'Potion of the Turtle Master',
    nameJa: 'タートルマスターのポーション (延長)',
    effects: [
      effect('slowness', 3, SECONDS(40)),
      effect('resistance', 2, SECONDS(40)),
    ],
    color: '#ACEA7C',
    variant: 'normal',
    enhanced: false,
    extended: true,
  },
};

// =============================================================================
// BREWING RECIPES
// =============================================================================

/**
 * Complete brewing recipe list. Each recipe specifies an ingredient item,
 * an input potion, and the output potion it produces.
 *
 * Brewing follows a tree structure:
 *   water bottle -> awkward (nether wart) -> effect potions -> modifiers
 */
export const BREWING_RECIPES: BrewingRecipe[] = [
  // ---------------------------------------------------------------------------
  // BASE POTION CREATION
  // ---------------------------------------------------------------------------

  // Nether wart + water bottle -> awkward potion
  { ingredient: 'nether_wart', input: 'water', output: 'awkward' },
  // Glowstone dust + water bottle -> thick potion
  { ingredient: 'glowstone_dust', input: 'water', output: 'thick' },
  // Redstone dust + water bottle -> mundane potion
  { ingredient: 'redstone', input: 'water', output: 'mundane' },

  // ---------------------------------------------------------------------------
  // EFFECT POTIONS (from awkward potion)
  // ---------------------------------------------------------------------------

  // Healing
  { ingredient: 'glistering_melon_slice', input: 'awkward', output: 'healing' },
  // Regeneration
  { ingredient: 'ghast_tear', input: 'awkward', output: 'regeneration' },
  // Strength
  { ingredient: 'blaze_powder', input: 'awkward', output: 'strength' },
  // Speed
  { ingredient: 'sugar', input: 'awkward', output: 'speed' },
  // Fire Resistance
  { ingredient: 'magma_cream', input: 'awkward', output: 'fire_resistance' },
  // Night Vision
  { ingredient: 'golden_carrot', input: 'awkward', output: 'night_vision' },
  // Water Breathing
  { ingredient: 'pufferfish', input: 'awkward', output: 'water_breathing' },
  // Leaping
  { ingredient: 'rabbit_foot', input: 'awkward', output: 'leaping' },
  // Slow Falling
  { ingredient: 'phantom_membrane', input: 'awkward', output: 'slow_falling' },
  // Poison
  { ingredient: 'spider_eye', input: 'awkward', output: 'poison' },
  // Turtle Master
  { ingredient: 'turtle_shell', input: 'awkward', output: 'turtle_master' },

  // Weakness (from water bottle, not awkward)
  { ingredient: 'fermented_spider_eye', input: 'water', output: 'weakness' },

  // ---------------------------------------------------------------------------
  // CORRUPTION RECIPES (fermented spider eye transforms)
  // ---------------------------------------------------------------------------

  // Night Vision -> Invisibility
  { ingredient: 'fermented_spider_eye', input: 'night_vision', output: 'invisibility' },
  { ingredient: 'fermented_spider_eye', input: 'night_vision_extended', output: 'invisibility_extended' },
  // Healing -> Harming
  { ingredient: 'fermented_spider_eye', input: 'healing', output: 'harming' },
  { ingredient: 'fermented_spider_eye', input: 'healing_ii', output: 'harming_ii' },
  // Poison -> Harming
  { ingredient: 'fermented_spider_eye', input: 'poison', output: 'harming' },
  { ingredient: 'fermented_spider_eye', input: 'poison_ii', output: 'harming_ii' },
  { ingredient: 'fermented_spider_eye', input: 'poison_extended', output: 'harming' },
  // Speed -> Slowness
  { ingredient: 'fermented_spider_eye', input: 'speed', output: 'slowness' },
  { ingredient: 'fermented_spider_eye', input: 'speed_extended', output: 'slowness_extended' },
  // Leaping -> Slowness
  { ingredient: 'fermented_spider_eye', input: 'leaping', output: 'slowness' },
  { ingredient: 'fermented_spider_eye', input: 'leaping_extended', output: 'slowness_extended' },

  // ---------------------------------------------------------------------------
  // ENHANCEMENT (Glowstone dust -> Level II)
  // ---------------------------------------------------------------------------

  { ingredient: 'glowstone_dust', input: 'healing', output: 'healing_ii' },
  { ingredient: 'glowstone_dust', input: 'regeneration', output: 'regeneration_ii' },
  { ingredient: 'glowstone_dust', input: 'strength', output: 'strength_ii' },
  { ingredient: 'glowstone_dust', input: 'speed', output: 'speed_ii' },
  { ingredient: 'glowstone_dust', input: 'leaping', output: 'leaping_ii' },
  { ingredient: 'glowstone_dust', input: 'poison', output: 'poison_ii' },
  { ingredient: 'glowstone_dust', input: 'harming', output: 'harming_ii' },
  { ingredient: 'glowstone_dust', input: 'slowness', output: 'slowness_iv' },
  { ingredient: 'glowstone_dust', input: 'turtle_master', output: 'turtle_master_ii' },

  // ---------------------------------------------------------------------------
  // EXTENSION (Redstone dust -> Longer duration)
  // ---------------------------------------------------------------------------

  { ingredient: 'redstone', input: 'regeneration', output: 'regeneration_extended' },
  { ingredient: 'redstone', input: 'strength', output: 'strength_extended' },
  { ingredient: 'redstone', input: 'speed', output: 'speed_extended' },
  { ingredient: 'redstone', input: 'fire_resistance', output: 'fire_resistance_extended' },
  { ingredient: 'redstone', input: 'night_vision', output: 'night_vision_extended' },
  { ingredient: 'redstone', input: 'water_breathing', output: 'water_breathing_extended' },
  { ingredient: 'redstone', input: 'invisibility', output: 'invisibility_extended' },
  { ingredient: 'redstone', input: 'leaping', output: 'leaping_extended' },
  { ingredient: 'redstone', input: 'slow_falling', output: 'slow_falling_extended' },
  { ingredient: 'redstone', input: 'poison', output: 'poison_extended' },
  { ingredient: 'redstone', input: 'weakness', output: 'weakness_extended' },
  { ingredient: 'redstone', input: 'slowness', output: 'slowness_extended' },
  { ingredient: 'redstone', input: 'turtle_master', output: 'turtle_master_extended' },
];

/**
 * Splash potion modifier: gunpowder converts any normal potion to splash.
 * This is handled specially in the brewing engine rather than listing every
 * individual recipe.
 */
export const SPLASH_MODIFIER_INGREDIENT = 'gunpowder';

/**
 * Lingering potion modifier: dragon's breath converts splash potions to lingering.
 */
export const LINGERING_MODIFIER_INGREDIENT = 'dragon_breath';

// =============================================================================
// REGISTRY QUERY HELPERS
// =============================================================================

/**
 * Look up a potion definition by its ID.
 * Returns undefined if the potion is not registered.
 */
export function getPotion(id: string): PotionDefinition | undefined {
  return POTION_EFFECTS[id];
}

/**
 * Find the brewing result for a given ingredient and input potion.
 * Returns the output potion ID or null if no valid recipe exists.
 */
export function findBrewingResult(ingredient: string, inputPotionId: string): string | null {
  // Check for splash modifier
  if (ingredient === SPLASH_MODIFIER_INGREDIENT) {
    const potion = POTION_EFFECTS[inputPotionId];
    if (potion && potion.variant === 'normal' && inputPotionId !== 'water') {
      return `splash_${inputPotionId}`;
    }
    return null;
  }

  // Check for lingering modifier
  if (ingredient === LINGERING_MODIFIER_INGREDIENT) {
    if (inputPotionId.startsWith('splash_')) {
      return `lingering_${inputPotionId.replace('splash_', '')}`;
    }
    return null;
  }

  // Check regular brewing recipes
  for (const recipe of BREWING_RECIPES) {
    if (recipe.ingredient === ingredient && recipe.input === inputPotionId) {
      return recipe.output;
    }
  }

  return null;
}

/**
 * Check if an item is a valid brewing ingredient.
 */
export function isBrewingIngredient(itemId: string): boolean {
  if (itemId === SPLASH_MODIFIER_INGREDIENT) return true;
  if (itemId === LINGERING_MODIFIER_INGREDIENT) return true;

  return BREWING_RECIPES.some((recipe) => recipe.ingredient === itemId);
}

/**
 * Get all possible brewing results from a given input potion.
 * Returns an array of {ingredient, output} pairs.
 */
export function getBrewingOptions(inputPotionId: string): { ingredient: string; output: string }[] {
  const options: { ingredient: string; output: string }[] = [];

  // Check regular recipes
  for (const recipe of BREWING_RECIPES) {
    if (recipe.input === inputPotionId) {
      options.push({ ingredient: recipe.ingredient, output: recipe.output });
    }
  }

  // Check splash modifier
  const potion = POTION_EFFECTS[inputPotionId];
  if (potion && potion.variant === 'normal' && inputPotionId !== 'water') {
    options.push({ ingredient: SPLASH_MODIFIER_INGREDIENT, output: `splash_${inputPotionId}` });
  }

  // Check lingering modifier
  if (inputPotionId.startsWith('splash_')) {
    options.push({
      ingredient: LINGERING_MODIFIER_INGREDIENT,
      output: `lingering_${inputPotionId.replace('splash_', '')}`,
    });
  }

  return options;
}
