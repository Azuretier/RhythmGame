// =============================================================================
// Anvil System — Combining, Repairing, and Renaming Items
// =============================================================================
// Implements the full anvil combining logic: merging enchantments from two
// items or an enchanted book, repairing items with materials, combining equal
// enchantment levels, XP cost calculation, the "Too Expensive" cap at 40
// levels, and item renaming.
// =============================================================================

import type {
  EnchantmentType,
  EnchantmentInstance,
  InventorySlot,
} from '@/types/minecraft-switch';
import { ENCHANTMENT_REGISTRY, areCompatible } from './enchantments';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum XP level cost before the anvil shows "Too Expensive!" */
export const ANVIL_MAX_COST = 39;

/** Maximum item name length when renaming. */
export const ANVIL_MAX_NAME_LENGTH = 35;

/** XP cost to rename an item. */
export const RENAME_COST = 1;

/** Durability restored per repair material (25% of max durability). */
export const REPAIR_MATERIAL_FRACTION = 0.25;

/** XP cost per repair material used. */
export const REPAIR_MATERIAL_LEVEL_COST = 1;

// =============================================================================
// TYPES
// =============================================================================

/** Result of an anvil operation. */
export interface AnvilResult {
  /** The resulting item after the anvil operation. */
  resultItem: InventorySlot;
  /** XP level cost of the operation. */
  levelCost: number;
  /** Whether the operation is "Too Expensive" (cost >= 40). */
  tooExpensive: boolean;
}

// =============================================================================
// REPAIR MATERIAL MAPPING
// =============================================================================

/**
 * Maps item prefixes to their repair material item ID.
 * Used when the right slot contains raw materials for repair.
 */
const REPAIR_MATERIAL_MAP: Record<string, string[]> = {
  wooden: ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks'],
  stone: ['cobblestone'],
  iron: ['iron_ingot'],
  golden: ['gold_ingot'],
  diamond: ['diamond'],
  netherite: ['netherite_ingot'],
  leather: ['leather'],
  chainmail: ['iron_ingot'],
  turtle: ['scute'],
  elytra: ['phantom_membrane'],
};

/**
 * Check if a material item can repair a given item.
 */
function isRepairMaterial(itemId: string, materialId: string): boolean {
  for (const [prefix, materials] of Object.entries(REPAIR_MATERIAL_MAP)) {
    if (itemId.includes(prefix) && materials.includes(materialId)) {
      return true;
    }
  }
  return false;
}

/**
 * Get the maximum durability for an item based on its ID.
 * Returns 0 if the item has no durability.
 */
function getMaxDurability(itemId: string): number {
  // Tool durabilities by material
  if (itemId.includes('netherite')) return 2031;
  if (itemId.includes('diamond')) return 1561;
  if (itemId.includes('iron')) return 250;
  if (itemId.includes('stone')) return 131;
  if (itemId.includes('golden')) return 32;
  if (itemId.includes('wooden')) return 59;

  // Armor durabilities
  if (itemId.includes('leather')) {
    if (itemId.includes('helmet')) return 55;
    if (itemId.includes('chestplate')) return 80;
    if (itemId.includes('leggings')) return 75;
    if (itemId.includes('boots')) return 65;
  }
  if (itemId.includes('chainmail') || itemId.includes('iron')) {
    if (itemId.includes('helmet')) return 165;
    if (itemId.includes('chestplate')) return 240;
    if (itemId.includes('leggings')) return 225;
    if (itemId.includes('boots')) return 195;
  }
  if (itemId.includes('diamond')) {
    if (itemId.includes('helmet')) return 363;
    if (itemId.includes('chestplate')) return 528;
    if (itemId.includes('leggings')) return 495;
    if (itemId.includes('boots')) return 429;
  }
  if (itemId.includes('netherite')) {
    if (itemId.includes('helmet')) return 407;
    if (itemId.includes('chestplate')) return 592;
    if (itemId.includes('leggings')) return 555;
    if (itemId.includes('boots')) return 481;
  }

  // Special items
  if (itemId === 'bow') return 384;
  if (itemId === 'crossbow') return 326;
  if (itemId === 'trident') return 250;
  if (itemId === 'shield') return 336;
  if (itemId === 'fishing_rod') return 64;
  if (itemId === 'shears') return 238;
  if (itemId === 'flint_and_steel') return 64;
  if (itemId === 'elytra') return 432;
  if (itemId === 'carrot_on_a_stick') return 25;
  if (itemId === 'warped_fungus_on_a_stick') return 100;

  return 0;
}

// =============================================================================
// ANVIL RESULT CALCULATION
// =============================================================================

/**
 * Calculate the result of combining two items in an anvil.
 *
 * Handles three cases:
 * 1. Right item is an enchanted book -> apply enchantments to left item
 * 2. Both items are the same type -> combine enchantments + repair
 * 3. Right item is a repair material -> repair durability
 *
 * Returns null if the combination is not valid.
 */
export function calculateAnvilResult(
  leftItem: InventorySlot,
  rightItem: InventorySlot
): AnvilResult | null {
  // Case 3: Right item is a repair material
  if (isRepairMaterial(leftItem.item, rightItem.item)) {
    return calculateMaterialRepair(leftItem, rightItem);
  }

  // Case 1: Right item is an enchanted book
  if (rightItem.item === 'enchanted_book') {
    return calculateBookCombine(leftItem, rightItem);
  }

  // Case 2: Both items are the same type
  if (leftItem.item === rightItem.item) {
    return calculateItemCombine(leftItem, rightItem);
  }

  return null;
}

/**
 * Combine enchantments from an enchanted book onto a target item.
 */
function calculateBookCombine(
  leftItem: InventorySlot,
  bookItem: InventorySlot
): AnvilResult | null {
  const bookEnchants: EnchantmentInstance[] = bookItem.enchantments ?? [];
  if (bookEnchants.length === 0) return null;

  const existingEnchants: EnchantmentInstance[] = leftItem.enchantments ?? [];
  let cost = 0;

  const resultEnchants = [...existingEnchants];
  let incompatibleCount = 0;

  for (const bookEnch of bookEnchants) {
    const def = ENCHANTMENT_REGISTRY[bookEnch.type];
    if (!def) continue;

    // Check if this enchantment is compatible with existing ones
    const isCompatible = existingEnchants.every((e) =>
      e.type === bookEnch.type || areCompatible(e.type, bookEnch.type)
    );

    if (!isCompatible) {
      // Incompatible enchantments still cost 1 level each
      incompatibleCount++;
      continue;
    }

    // Find if the enchantment already exists on the item
    const existingIdx = resultEnchants.findIndex((e) => e.type === bookEnch.type);

    if (existingIdx >= 0) {
      const existing = resultEnchants[existingIdx];
      let newLevel: number;

      if (existing.level === bookEnch.level) {
        // Same level: increment (up to max)
        newLevel = Math.min(existing.level + 1, def.maxLevel);
      } else {
        // Different levels: take the higher
        newLevel = Math.max(existing.level, bookEnch.level);
      }

      resultEnchants[existingIdx] = { type: bookEnch.type, level: newLevel };
      cost += getEnchantLevelCost(bookEnch.type, newLevel);
    } else {
      resultEnchants.push({ type: bookEnch.type, level: bookEnch.level });
      cost += getEnchantLevelCost(bookEnch.type, bookEnch.level);
    }
  }

  // Add cost for incompatible enchantments (1 level each)
  cost += incompatibleCount;

  // If nothing changed, no valid operation
  if (resultEnchants.length === existingEnchants.length && incompatibleCount === 0) {
    return null;
  }

  const resultItem: InventorySlot = {
    ...leftItem,
    enchantments: resultEnchants,
  };

  return {
    resultItem,
    levelCost: Math.max(cost, 1),
    tooExpensive: cost > ANVIL_MAX_COST,
  };
}

/**
 * Combine two identical items, merging their enchantments and repairing
 * durability.
 */
function calculateItemCombine(
  leftItem: InventorySlot,
  rightItem: InventorySlot
): AnvilResult | null {
  const leftEnchants: EnchantmentInstance[] = leftItem.enchantments ?? [];
  const rightEnchants: EnchantmentInstance[] = rightItem.enchantments ?? [];

  let cost = 0;
  const resultEnchants = [...leftEnchants];

  // Merge enchantments from right item
  for (const rightEnch of rightEnchants) {
    const def = ENCHANTMENT_REGISTRY[rightEnch.type];
    if (!def) continue;

    // Check compatibility with existing enchantments on left
    const isCompatible = resultEnchants.every((e) =>
      e.type === rightEnch.type || areCompatible(e.type, rightEnch.type)
    );

    if (!isCompatible) {
      cost += 1;
      continue;
    }

    const existingIdx = resultEnchants.findIndex((e) => e.type === rightEnch.type);

    if (existingIdx >= 0) {
      const existing = resultEnchants[existingIdx];
      let newLevel: number;

      if (existing.level === rightEnch.level) {
        newLevel = Math.min(existing.level + 1, def.maxLevel);
      } else {
        newLevel = Math.max(existing.level, rightEnch.level);
      }

      resultEnchants[existingIdx] = { type: rightEnch.type, level: newLevel };
      cost += getEnchantLevelCost(rightEnch.type, newLevel);
    } else {
      resultEnchants.push({ type: rightEnch.type, level: rightEnch.level });
      cost += getEnchantLevelCost(rightEnch.type, rightEnch.level);
    }
  }

  // Combine durability (repair bonus)
  let resultDurability = leftItem.durability;
  const maxDur = getMaxDurability(leftItem.item);

  if (resultDurability !== undefined && rightItem.durability !== undefined && maxDur > 0) {
    const leftRemaining = maxDur - (leftItem.durability ?? 0);
    const rightRemaining = maxDur - (rightItem.durability ?? 0);
    // Repair bonus: 12% of max durability
    const repairBonus = Math.floor(maxDur * 0.12);
    resultDurability = Math.max(0, maxDur - (leftRemaining + rightRemaining + repairBonus));
    cost += 2; // Base cost for repair
  }

  const resultItem: InventorySlot = {
    ...leftItem,
    enchantments: resultEnchants.length > 0 ? resultEnchants : undefined,
    durability: resultDurability,
  };

  return {
    resultItem,
    levelCost: Math.max(cost, 1),
    tooExpensive: cost > ANVIL_MAX_COST,
  };
}

/**
 * Repair an item using raw materials. Each material restores 25% of max
 * durability. Cost: 1 level per material used.
 */
function calculateMaterialRepair(
  item: InventorySlot,
  material: InventorySlot
): AnvilResult | null {
  const maxDur = getMaxDurability(item.item);
  if (maxDur <= 0) return null;

  const currentDamage = item.durability ?? 0;
  if (currentDamage <= 0) return null; // Already at full durability

  const restorePerMaterial = Math.floor(maxDur * REPAIR_MATERIAL_FRACTION);
  const materialsNeeded = Math.min(
    material.count,
    Math.ceil(currentDamage / restorePerMaterial)
  );

  if (materialsNeeded <= 0) return null;

  const totalRestore = restorePerMaterial * materialsNeeded;
  const newDurability = Math.max(0, currentDamage - totalRestore);
  const cost = materialsNeeded * REPAIR_MATERIAL_LEVEL_COST;

  const resultItem: InventorySlot = {
    ...item,
    durability: newDurability,
  };

  return {
    resultItem,
    levelCost: cost,
    tooExpensive: cost > ANVIL_MAX_COST,
  };
}

// =============================================================================
// RENAME
// =============================================================================

/**
 * Rename an item on the anvil. Costs 1 XP level.
 *
 * @param item - The item to rename
 * @param newName - The new display name (max 35 characters)
 * @returns The renamed item with cost, or null if the name is invalid
 */
export function renameItem(
  item: InventorySlot,
  newName: string
): AnvilResult | null {
  if (!newName || newName.length === 0) return null;

  const trimmedName = newName.slice(0, ANVIL_MAX_NAME_LENGTH);

  const resultItem: InventorySlot = {
    ...item,
    nbt: {
      ...(item.nbt ?? {}),
      display: {
        ...(item.nbt?.display as Record<string, unknown> ?? {}),
        Name: trimmedName,
      },
    },
  };

  return {
    resultItem,
    levelCost: RENAME_COST,
    tooExpensive: false,
  };
}

// =============================================================================
// REPAIR ITEM (standalone helper)
// =============================================================================

/**
 * Repair an item by consuming materials. Each material restores 25% of max
 * durability. Returns the repaired item and material count consumed.
 *
 * @param item - The item to repair
 * @param materialCount - Number of materials available
 * @returns Repair result or null if repair is not possible
 */
export function repairItem(
  item: InventorySlot,
  materialCount: number
): { item: InventorySlot; materialsUsed: number; levelCost: number } | null {
  const maxDur = getMaxDurability(item.item);
  if (maxDur <= 0) return null;

  const currentDamage = item.durability ?? 0;
  if (currentDamage <= 0) return null;

  const restorePerMaterial = Math.floor(maxDur * REPAIR_MATERIAL_FRACTION);
  if (restorePerMaterial <= 0) return null;

  const materialsNeeded = Math.min(
    materialCount,
    Math.ceil(currentDamage / restorePerMaterial)
  );

  if (materialsNeeded <= 0) return null;

  const totalRestore = restorePerMaterial * materialsNeeded;
  const newDurability = Math.max(0, currentDamage - totalRestore);

  return {
    item: { ...item, durability: newDurability },
    materialsUsed: materialsNeeded,
    levelCost: materialsNeeded * REPAIR_MATERIAL_LEVEL_COST,
  };
}

// =============================================================================
// COST HELPERS
// =============================================================================

/**
 * Calculate the XP level cost for a single enchantment at a given level.
 * Treasure enchantments cost double.
 */
function getEnchantLevelCost(enchantType: EnchantmentType, level: number): number {
  const def = ENCHANTMENT_REGISTRY[enchantType];
  if (!def) return level;

  let cost = level;

  // Treasure enchantments cost x2
  if (def.treasure) {
    cost *= 2;
  }

  return cost;
}
