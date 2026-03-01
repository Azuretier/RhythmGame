// =============================================================================
// Enchantment Registry — Full Minecraft: Nintendo Switch Edition Enchantments
// =============================================================================
// Defines all 35+ enchantments with their properties, level ranges, compatibility
// rules, applicable item categories, and treasure/curse flags. Provides helper
// functions for querying the registry: getEnchantment, canApplyTo, areCompatible,
// getMaxLevel.
// =============================================================================

import type { EnchantmentType, EnchantmentDefinition, ItemCategory } from '@/types/minecraft-switch';

// =============================================================================
// ENCHANTMENT REGISTRY
// =============================================================================

/**
 * Complete enchantment registry mapping enchantment type IDs to their full
 * definitions. Each entry specifies the enchantment's display name, max level,
 * applicable item categories, incompatible enchantments, rarity weight, and
 * the minimum enchanting power required per level.
 */
export const ENCHANTMENT_REGISTRY: Record<EnchantmentType, EnchantmentDefinition> = {
  // ---------------------------------------------------------------------------
  // ARMOR ENCHANTMENTS
  // ---------------------------------------------------------------------------

  protection: {
    type: 'protection',
    name: 'Protection',
    nameJa: 'ダメージ軽減',
    maxLevel: 4,
    applicableTo: ['armor'],
    incompatible: ['fire_protection', 'blast_protection', 'projectile_protection'],
    treasure: false,
    curse: false,
    weight: 10,
    minPowerPerLevel: [1, 12, 23, 34],
  },

  fire_protection: {
    type: 'fire_protection',
    name: 'Fire Protection',
    nameJa: '火炎耐性',
    maxLevel: 4,
    applicableTo: ['armor'],
    incompatible: ['protection', 'blast_protection', 'projectile_protection'],
    treasure: false,
    curse: false,
    weight: 5,
    minPowerPerLevel: [10, 18, 26, 34],
  },

  blast_protection: {
    type: 'blast_protection',
    name: 'Blast Protection',
    nameJa: '爆発耐性',
    maxLevel: 4,
    applicableTo: ['armor'],
    incompatible: ['protection', 'fire_protection', 'projectile_protection'],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [5, 13, 21, 29],
  },

  projectile_protection: {
    type: 'projectile_protection',
    name: 'Projectile Protection',
    nameJa: '飛び道具耐性',
    maxLevel: 4,
    applicableTo: ['armor'],
    incompatible: ['protection', 'fire_protection', 'blast_protection'],
    treasure: false,
    curse: false,
    weight: 5,
    minPowerPerLevel: [3, 9, 15, 21],
  },

  thorns: {
    type: 'thorns',
    name: 'Thorns',
    nameJa: 'とげ',
    maxLevel: 3,
    applicableTo: ['armor'],
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 1,
    minPowerPerLevel: [10, 30, 50],
  },

  respiration: {
    type: 'respiration',
    name: 'Respiration',
    nameJa: '水中呼吸',
    maxLevel: 3,
    applicableTo: ['armor'], // helmet only, enforced by slot check
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [10, 20, 30],
  },

  aqua_affinity: {
    type: 'aqua_affinity',
    name: 'Aqua Affinity',
    nameJa: '水中採掘',
    maxLevel: 1,
    applicableTo: ['armor'], // helmet only
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [1],
  },

  feather_falling: {
    type: 'feather_falling',
    name: 'Feather Falling',
    nameJa: '落下耐性',
    maxLevel: 4,
    applicableTo: ['armor'], // boots only
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 5,
    minPowerPerLevel: [5, 11, 17, 23],
  },

  depth_strider: {
    type: 'depth_strider',
    name: 'Depth Strider',
    nameJa: '水中歩行',
    maxLevel: 3,
    applicableTo: ['armor'], // boots only
    incompatible: ['frost_walker'],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [10, 20, 30],
  },

  frost_walker: {
    type: 'frost_walker',
    name: 'Frost Walker',
    nameJa: '氷渡り',
    maxLevel: 2,
    applicableTo: ['armor'], // boots only
    incompatible: ['depth_strider'],
    treasure: true,
    curse: false,
    weight: 2,
    minPowerPerLevel: [10, 20],
  },

  soul_speed: {
    type: 'soul_speed',
    name: 'Soul Speed',
    nameJa: 'ソウルスピード',
    maxLevel: 3,
    applicableTo: ['armor'], // boots only
    incompatible: [],
    treasure: true,
    curse: false,
    weight: 1,
    minPowerPerLevel: [10, 20, 30],
  },

  // ---------------------------------------------------------------------------
  // WEAPON ENCHANTMENTS
  // ---------------------------------------------------------------------------

  sharpness: {
    type: 'sharpness',
    name: 'Sharpness',
    nameJa: 'ダメージ増加',
    maxLevel: 5,
    applicableTo: ['weapon'],
    incompatible: ['smite', 'bane_of_arthropods'],
    treasure: false,
    curse: false,
    weight: 10,
    minPowerPerLevel: [1, 12, 23, 34, 45],
  },

  smite: {
    type: 'smite',
    name: 'Smite',
    nameJa: 'アンデッド特効',
    maxLevel: 5,
    applicableTo: ['weapon'],
    incompatible: ['sharpness', 'bane_of_arthropods'],
    treasure: false,
    curse: false,
    weight: 5,
    minPowerPerLevel: [5, 13, 21, 29, 37],
  },

  bane_of_arthropods: {
    type: 'bane_of_arthropods',
    name: 'Bane of Arthropods',
    nameJa: '虫特効',
    maxLevel: 5,
    applicableTo: ['weapon'],
    incompatible: ['sharpness', 'smite'],
    treasure: false,
    curse: false,
    weight: 5,
    minPowerPerLevel: [5, 13, 21, 29, 37],
  },

  knockback: {
    type: 'knockback',
    name: 'Knockback',
    nameJa: 'ノックバック',
    maxLevel: 2,
    applicableTo: ['weapon'],
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 5,
    minPowerPerLevel: [5, 25],
  },

  fire_aspect: {
    type: 'fire_aspect',
    name: 'Fire Aspect',
    nameJa: '火属性',
    maxLevel: 2,
    applicableTo: ['weapon'],
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [10, 30],
  },

  looting: {
    type: 'looting',
    name: 'Looting',
    nameJa: 'ドロップ増加',
    maxLevel: 3,
    applicableTo: ['weapon'],
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [15, 24, 33],
  },

  sweeping_edge: {
    type: 'sweeping_edge',
    name: 'Sweeping Edge',
    nameJa: '範囲ダメージ増加',
    maxLevel: 3,
    applicableTo: ['weapon'],
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [5, 14, 23],
  },

  // ---------------------------------------------------------------------------
  // TOOL ENCHANTMENTS
  // ---------------------------------------------------------------------------

  efficiency: {
    type: 'efficiency',
    name: 'Efficiency',
    nameJa: '効率強化',
    maxLevel: 5,
    applicableTo: ['tool'],
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 10,
    minPowerPerLevel: [1, 11, 21, 31, 41],
  },

  silk_touch: {
    type: 'silk_touch',
    name: 'Silk Touch',
    nameJa: 'シルクタッチ',
    maxLevel: 1,
    applicableTo: ['tool'],
    incompatible: ['fortune'],
    treasure: false,
    curse: false,
    weight: 1,
    minPowerPerLevel: [15],
  },

  fortune: {
    type: 'fortune',
    name: 'Fortune',
    nameJa: '幸運',
    maxLevel: 3,
    applicableTo: ['tool'],
    incompatible: ['silk_touch'],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [15, 24, 33],
  },

  unbreaking: {
    type: 'unbreaking',
    name: 'Unbreaking',
    nameJa: '耐久力',
    maxLevel: 3,
    applicableTo: ['tool', 'weapon', 'armor', 'combat'],
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 5,
    minPowerPerLevel: [5, 13, 21],
  },

  // ---------------------------------------------------------------------------
  // BOW ENCHANTMENTS
  // ---------------------------------------------------------------------------

  power: {
    type: 'power',
    name: 'Power',
    nameJa: '射撃ダメージ増加',
    maxLevel: 5,
    applicableTo: ['weapon'], // bow specifically
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 10,
    minPowerPerLevel: [1, 11, 21, 31, 41],
  },

  punch: {
    type: 'punch',
    name: 'Punch',
    nameJa: 'パンチ',
    maxLevel: 2,
    applicableTo: ['weapon'], // bow
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [12, 32],
  },

  flame: {
    type: 'flame',
    name: 'Flame',
    nameJa: 'フレイム',
    maxLevel: 1,
    applicableTo: ['weapon'], // bow
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [20],
  },

  infinity: {
    type: 'infinity',
    name: 'Infinity',
    nameJa: '無限',
    maxLevel: 1,
    applicableTo: ['weapon'], // bow
    incompatible: ['mending'],
    treasure: false,
    curse: false,
    weight: 1,
    minPowerPerLevel: [20],
  },

  // ---------------------------------------------------------------------------
  // CROSSBOW ENCHANTMENTS
  // ---------------------------------------------------------------------------

  multishot: {
    type: 'multishot',
    name: 'Multishot',
    nameJa: 'マルチショット',
    maxLevel: 1,
    applicableTo: ['weapon'], // crossbow
    incompatible: ['piercing'],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [20],
  },

  piercing: {
    type: 'piercing',
    name: 'Piercing',
    nameJa: '貫通',
    maxLevel: 4,
    applicableTo: ['weapon'], // crossbow
    incompatible: ['multishot'],
    treasure: false,
    curse: false,
    weight: 10,
    minPowerPerLevel: [1, 8, 15, 22],
  },

  quick_charge: {
    type: 'quick_charge',
    name: 'Quick Charge',
    nameJa: '高速装填',
    maxLevel: 3,
    applicableTo: ['weapon'], // crossbow
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 5,
    minPowerPerLevel: [12, 32, 52],
  },

  // ---------------------------------------------------------------------------
  // TRIDENT ENCHANTMENTS
  // ---------------------------------------------------------------------------

  loyalty: {
    type: 'loyalty',
    name: 'Loyalty',
    nameJa: '忠誠',
    maxLevel: 3,
    applicableTo: ['weapon'], // trident
    incompatible: ['riptide'],
    treasure: false,
    curse: false,
    weight: 5,
    minPowerPerLevel: [12, 19, 26],
  },

  impaling: {
    type: 'impaling',
    name: 'Impaling',
    nameJa: '水生特効',
    maxLevel: 5,
    applicableTo: ['weapon'], // trident
    incompatible: [],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [1, 9, 17, 25, 33],
  },

  riptide: {
    type: 'riptide',
    name: 'Riptide',
    nameJa: '激流',
    maxLevel: 3,
    applicableTo: ['weapon'], // trident
    incompatible: ['loyalty', 'channeling'],
    treasure: false,
    curse: false,
    weight: 2,
    minPowerPerLevel: [17, 24, 31],
  },

  channeling: {
    type: 'channeling',
    name: 'Channeling',
    nameJa: 'チャネリング',
    maxLevel: 1,
    applicableTo: ['weapon'], // trident
    incompatible: ['riptide'],
    treasure: false,
    curse: false,
    weight: 1,
    minPowerPerLevel: [25],
  },

  // ---------------------------------------------------------------------------
  // GENERAL ENCHANTMENTS
  // ---------------------------------------------------------------------------

  mending: {
    type: 'mending',
    name: 'Mending',
    nameJa: '修繕',
    maxLevel: 1,
    applicableTo: ['tool', 'weapon', 'armor', 'combat'],
    incompatible: ['infinity'],
    treasure: true,
    curse: false,
    weight: 2,
    minPowerPerLevel: [25],
  },

  vanishing_curse: {
    type: 'vanishing_curse',
    name: 'Curse of Vanishing',
    nameJa: '消滅の呪い',
    maxLevel: 1,
    applicableTo: ['tool', 'weapon', 'armor', 'combat'],
    incompatible: [],
    treasure: true,
    curse: true,
    weight: 1,
    minPowerPerLevel: [25],
  },

  binding_curse: {
    type: 'binding_curse',
    name: 'Curse of Binding',
    nameJa: '束縛の呪い',
    maxLevel: 1,
    applicableTo: ['armor'],
    incompatible: [],
    treasure: true,
    curse: true,
    weight: 1,
    minPowerPerLevel: [25],
  },
};

// =============================================================================
// ENCHANTMENT EFFECT HELPERS
// =============================================================================

/**
 * Damage reduction per level for each protection enchantment.
 * Values are percentage points per level.
 */
export const PROTECTION_REDUCTION_PER_LEVEL: Partial<Record<EnchantmentType, number>> = {
  protection: 4,            // +4% all damage reduction per level (general)
  fire_protection: 8,       // +8% fire damage reduction per level
  blast_protection: 8,      // +8% explosion damage reduction per level
  projectile_protection: 8, // +8% projectile damage reduction per level
};

/**
 * Feather Falling: fall damage reduction per level (12% per level).
 */
export const FEATHER_FALLING_REDUCTION_PER_LEVEL = 12;

/**
 * Thorns: chance per level to reflect damage (15% per level).
 */
export const THORNS_CHANCE_PER_LEVEL = 0.15;

/** Thorns: damage range when triggered. */
export const THORNS_DAMAGE_MIN = 1;
export const THORNS_DAMAGE_MAX = 4;

/**
 * Respiration: extra underwater breathing time per level (15 seconds = 300 ticks).
 */
export const RESPIRATION_EXTRA_TICKS_PER_LEVEL = 300;

/**
 * Sharpness: bonus damage per level = 0.5 * level + 0.5.
 */
export function getSharpnessDamage(level: number): number {
  return 0.5 * level + 0.5;
}

/**
 * Smite: bonus damage per level vs undead = 2.5 * level.
 */
export function getSmiteDamage(level: number): number {
  return 2.5 * level;
}

/**
 * Bane of Arthropods: bonus damage per level vs arthropods = 2.5 * level.
 */
export function getBaneOfArthropodsDamage(level: number): number {
  return 2.5 * level;
}

/**
 * Impaling: bonus damage per level vs aquatic mobs = 2.5 * level.
 */
export function getImpalingDamage(level: number): number {
  return 2.5 * level;
}

/**
 * Fire Aspect: fire duration in ticks per level (4 seconds = 80 ticks per level).
 */
export function getFireAspectDuration(level: number): number {
  return 80 * level;
}

/**
 * Efficiency: bonus mining speed = level^2 + 1.
 */
export function getEfficiencyBonus(level: number): number {
  return level * level + 1;
}

/**
 * Power (bow): damage multiplier = base * (1 + 0.25 * level).
 */
export function getPowerMultiplier(level: number): number {
  return 1 + 0.25 * level;
}

/**
 * Unbreaking: chance to NOT consume durability = 100 / (level + 1) %.
 * Returns the probability (0-1) that durability IS consumed.
 */
export function getUnbreakingDurabilityChance(level: number): number {
  return 1 / (level + 1);
}

/**
 * Sweeping Edge: bonus sweep damage ratio = level / (level + 1).
 */
export function getSweepingEdgeDamageRatio(level: number): number {
  return level / (level + 1);
}

/**
 * Depth Strider: underwater movement speed multiplier.
 * Level III = normal walking speed.
 */
export function getDepthStriderSpeedMultiplier(level: number): number {
  return Math.min(level / 3, 1);
}

/**
 * Frost Walker: radius of ice formation = 2 + level.
 */
export function getFrostWalkerRadius(level: number): number {
  return 2 + level;
}

/**
 * Looting: extra max drops per level.
 */
export function getLootingExtraDrops(level: number): number {
  return level;
}

/**
 * Flame (bow): fire duration on hit (5 seconds = 100 ticks).
 */
export const FLAME_FIRE_DURATION = 100;

/**
 * Knockback: extra knockback distance per level.
 */
export const KNOCKBACK_EXTRA_PER_LEVEL = 3;

// =============================================================================
// LEVEL NUMERAL DISPLAY
// =============================================================================

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/**
 * Format an enchantment level as a Roman numeral. Returns empty string for
 * enchantments with max level 1 (e.g., Silk Touch, Infinity).
 */
export function formatEnchantmentLevel(level: number, maxLevel: number): string {
  if (maxLevel <= 1) return '';
  if (level < 1 || level > ROMAN_NUMERALS.length) return ` ${level}`;
  return ` ${ROMAN_NUMERALS[level - 1]}`;
}

/**
 * Format a full enchantment display name with level.
 * Example: "Sharpness V", "Silk Touch", "Protection IV"
 */
export function formatEnchantmentName(type: EnchantmentType, level: number): string {
  const def = ENCHANTMENT_REGISTRY[type];
  if (!def) return type;
  const numeral = formatEnchantmentLevel(level, def.maxLevel);
  return `${def.name}${numeral}`;
}

// =============================================================================
// REGISTRY QUERY HELPERS
// =============================================================================

/**
 * Look up an enchantment definition by its type ID.
 * Returns undefined if the enchantment is not registered.
 */
export function getEnchantment(id: EnchantmentType): EnchantmentDefinition | undefined {
  return ENCHANTMENT_REGISTRY[id];
}

/**
 * Check whether an enchantment can be applied to the given item category.
 */
export function canApplyTo(enchantId: EnchantmentType, itemCategory: ItemCategory): boolean {
  const def = ENCHANTMENT_REGISTRY[enchantId];
  if (!def) return false;
  return def.applicableTo.includes(itemCategory);
}

/**
 * Check whether two enchantments are compatible (can coexist on the same item).
 * Two enchantments are incompatible if either one lists the other in its
 * `incompatible` array.
 */
export function areCompatible(enchant1: EnchantmentType, enchant2: EnchantmentType): boolean {
  if (enchant1 === enchant2) return false; // Same enchantment is not "compatible" — it stacks via level

  const def1 = ENCHANTMENT_REGISTRY[enchant1];
  const def2 = ENCHANTMENT_REGISTRY[enchant2];
  if (!def1 || !def2) return false;

  if (def1.incompatible.includes(enchant2)) return false;
  if (def2.incompatible.includes(enchant1)) return false;

  return true;
}

/**
 * Get the maximum allowed level for an enchantment.
 * Returns 0 if the enchantment is not registered.
 */
export function getMaxLevel(enchantId: EnchantmentType): number {
  const def = ENCHANTMENT_REGISTRY[enchantId];
  return def ? def.maxLevel : 0;
}

/**
 * Get all enchantments applicable to a given item category.
 * Optionally filter out treasure-only and curse enchantments.
 */
export function getApplicableEnchantments(
  itemCategory: ItemCategory,
  options: { includeTreasure?: boolean; includeCurses?: boolean } = {}
): EnchantmentDefinition[] {
  const { includeTreasure = false, includeCurses = false } = options;

  return Object.values(ENCHANTMENT_REGISTRY).filter((def) => {
    if (!def.applicableTo.includes(itemCategory)) return false;
    if (!includeTreasure && def.treasure && !def.curse) return false;
    if (!includeCurses && def.curse) return false;
    return true;
  });
}

/**
 * Get all enchantments that are compatible with a given set of existing
 * enchantments on an item.
 */
export function getCompatibleEnchantments(
  existingEnchants: EnchantmentType[],
  itemCategory: ItemCategory,
  options: { includeTreasure?: boolean; includeCurses?: boolean } = {}
): EnchantmentDefinition[] {
  const applicable = getApplicableEnchantments(itemCategory, options);

  return applicable.filter((def) => {
    // Skip enchantments already on the item
    if (existingEnchants.includes(def.type)) return false;

    // Check compatibility with all existing enchantments
    return existingEnchants.every((existing) => areCompatible(def.type, existing));
  });
}

/**
 * Calculate the total enchantment protection factor (EPF) from all armor
 * pieces' protection enchantments against a specific damage source.
 */
export function calculateProtectionFactor(
  enchantments: { type: EnchantmentType; level: number }[],
  damageSource: 'generic' | 'fire' | 'explosion' | 'projectile' | 'fall'
): number {
  let epf = 0;

  for (const ench of enchantments) {
    switch (ench.type) {
      case 'protection':
        // Generic protection applies to all damage types
        epf += ench.level;
        break;
      case 'fire_protection':
        if (damageSource === 'fire') epf += ench.level * 2;
        break;
      case 'blast_protection':
        if (damageSource === 'explosion') epf += ench.level * 2;
        break;
      case 'projectile_protection':
        if (damageSource === 'projectile') epf += ench.level * 2;
        break;
      case 'feather_falling':
        if (damageSource === 'fall') epf += ench.level * 3;
        break;
    }
  }

  // Cap EPF at 20 (80% damage reduction)
  return Math.min(epf, 20);
}

/**
 * Convert EPF to a damage reduction percentage (0-1).
 * Formula: reduction = min(epf, 20) / 25
 */
export function epfToDamageReduction(epf: number): number {
  return Math.min(epf, 20) / 25;
}
