// =============================================================================
// Enchanting Engine — Enchanting Table & Bookshelf Mechanics
// =============================================================================
// Implements the enchanting table logic: calculating three enchantment options
// based on seed, item, and bookshelf count; applying enchantments to items;
// and counting nearby bookshelves. Follows vanilla Minecraft enchanting
// mechanics with weighted random selection.
// =============================================================================

import type {
  EnchantmentType,
  EnchantmentInstance,
  InventorySlot,
  ItemCategory,
  BlockId,
} from '@/types/minecraft-switch';
import { Block } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';
import {
  ENCHANTMENT_REGISTRY,
  getApplicableEnchantments,
  areCompatible,
} from './enchantments';

// =============================================================================
// TYPES
// =============================================================================

/** A single enchantment option presented in one of the three table slots. */
export interface EnchantmentOption {
  /** The enchantments that will be applied. */
  enchantments: EnchantmentInstance[];
  /** XP levels required. */
  levelCost: number;
  /** Number of lapis lazuli required (1, 2, or 3 for slots 1, 2, 3). */
  lapisCost: number;
}

// =============================================================================
// SEEDED PRNG
// =============================================================================

/**
 * Simple seeded pseudo-random number generator (LCG).
 * Used to produce deterministic enchantment options from a given seed.
 */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns a pseudo-random integer and advances state. */
  next(): number {
    this.state = (this.state * 16807 + 12345) % 2147483647;
    return this.state;
  }

  /** Returns a random integer in [min, max] (inclusive). */
  nextInt(min: number, max: number): number {
    if (min >= max) return min;
    return min + (Math.abs(this.next()) % (max - min + 1));
  }

  /** Returns a random float in [0, 1). */
  nextFloat(): number {
    return Math.abs(this.next()) / 2147483647;
  }
}

// =============================================================================
// ITEM ENCHANTABILITY LOOKUP
// =============================================================================

/**
 * Get the enchantability value for an item. Higher enchantability means
 * better/more enchantments. Based on the item's material tier.
 */
function getItemEnchantability(itemId: string): number {
  // Leather: 15, Chain: 12, Iron: 9, Gold: 25, Diamond: 10, Netherite: 15
  // Wood: 15, Stone: 5, Iron: 14, Gold: 22, Diamond: 10, Netherite: 15

  if (itemId.includes('golden') || itemId.includes('gold')) return 22;
  if (itemId.includes('leather')) return 15;
  if (itemId.includes('chainmail') || itemId.includes('chain')) return 12;
  if (itemId.includes('netherite')) return 15;
  if (itemId.includes('wooden') || itemId.includes('wood')) return 15;
  if (itemId.includes('stone')) return 5;
  if (itemId.includes('iron')) return 14;
  if (itemId.includes('diamond')) return 10;

  // Books have an enchantability of 1
  if (itemId === 'book') return 1;

  // Default
  return 10;
}

/**
 * Determine the ItemCategory for enchantment purposes from an item ID string.
 */
function getItemCategory(itemId: string): ItemCategory {
  if (itemId.includes('helmet') || itemId.includes('chestplate') ||
      itemId.includes('leggings') || itemId.includes('boots')) {
    return 'armor';
  }
  if (itemId.includes('sword') || itemId.includes('bow') ||
      itemId.includes('crossbow') || itemId.includes('trident')) {
    return 'weapon';
  }
  if (itemId.includes('pickaxe') || itemId.includes('axe') ||
      itemId.includes('shovel') || itemId.includes('hoe') ||
      itemId.includes('shears') || itemId.includes('fishing_rod')) {
    return 'tool';
  }
  if (itemId === 'book') return 'misc';

  return 'misc';
}

// =============================================================================
// BOOKSHELF POWER
// =============================================================================

/**
 * Count the number of bookshelves that contribute power to an enchanting
 * table at the given world position. Bookshelves must be:
 * - Within a 5x5x3 area centered on the table (2 blocks away horizontally)
 * - Exactly 0 or 1 block above the table
 * - With air between the bookshelf and the table
 * Maximum 15 bookshelves contribute power.
 */
export function getBookshelfPower(
  world: ChunkedWorld,
  tableX: number,
  tableY: number,
  tableZ: number
): number {
  let count = 0;

  // Check two layers: same level as table and one above
  for (let dy = 0; dy <= 1; dy++) {
    const y = tableY + dy;

    // Check the ring at distance 2 from the table
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        // Only check the outer ring (distance 2)
        if (Math.abs(dx) !== 2 && Math.abs(dz) !== 2) continue;

        const bx = tableX + dx;
        const bz = tableZ + dz;

        // Check if block is a bookshelf
        const blockId = world.getBlock(bx, y, bz);
        if (blockId !== Block.Bookshelf) continue;

        // Check that there is air between the bookshelf and the table
        // Find the path from bookshelf to table (the block between them)
        const midX = tableX + Math.sign(dx) * (Math.abs(dx) === 2 ? 1 : 0);
        const midZ = tableZ + Math.sign(dz) * (Math.abs(dz) === 2 ? 1 : 0);
        const midBlock = world.getBlock(midX, y, midZ);

        if (midBlock === Block.Air) {
          count++;
          if (count >= 15) return 15;
        }
      }
    }
  }

  return count;
}

// =============================================================================
// ENCHANTMENT OPTION CALCULATION
// =============================================================================

/**
 * Calculate the three enchantment options displayed in an enchanting table.
 *
 * @param seed       - Player enchantment seed (changes each time an enchantment is applied)
 * @param itemId     - The item being enchanted (e.g. "diamond_sword", "book")
 * @param bookshelfCount - Number of bookshelves contributing power (0-15)
 * @returns Array of 3 EnchantmentOptions for the three table slots
 */
export function calculateEnchantmentOptions(
  seed: number,
  itemId: string,
  bookshelfCount: number
): [EnchantmentOption, EnchantmentOption, EnchantmentOption] {
  const rng = new SeededRandom(seed);
  const clampedShelves = Math.min(Math.max(bookshelfCount, 0), 15);
  const enchantability = getItemEnchantability(itemId);
  const category = getItemCategory(itemId);

  // Calculate base enchanting level
  // Base = random(1, 8) + floor(bookshelves / 2) + random(0, bookshelves)
  const baseLevel = rng.nextInt(1, 8) + Math.floor(clampedShelves / 2) + rng.nextInt(0, clampedShelves);

  // Three slot levels: slot1 = base/3, slot2 = 2*base/3, slot3 = base
  const slotLevels = [
    Math.max(Math.floor(baseLevel / 3), 1),
    Math.max(Math.floor(baseLevel * 2 / 3), 1),
    Math.max(baseLevel, 1),
  ];

  const options: EnchantmentOption[] = [];

  for (let slotIndex = 0; slotIndex < 3; slotIndex++) {
    const slotLevel = slotLevels[slotIndex];

    // Modify level with enchantability
    // modifiedLevel = slotLevel + random(0, enchantability/4) + random(0, enchantability/4) + 1
    const modifiedLevel = slotLevel +
      rng.nextInt(0, Math.max(Math.floor(enchantability / 4), 1)) +
      rng.nextInt(0, Math.max(Math.floor(enchantability / 4), 1)) + 1;

    // Random bonus: +/- 15%
    const bonus = 1 + (rng.nextFloat() + rng.nextFloat() - 1) * 0.15;
    const finalLevel = Math.max(Math.round(modifiedLevel * bonus), 1);

    // Select enchantments for this slot
    const selectedEnchants = selectEnchantments(rng, finalLevel, category, itemId);

    options.push({
      enchantments: selectedEnchants,
      levelCost: slotLevel,
      lapisCost: slotIndex + 1,
    });
  }

  return options as [EnchantmentOption, EnchantmentOption, EnchantmentOption];
}

/**
 * Select enchantments for a given enchanting power level using weighted random.
 * Higher levels give more and better enchantments.
 */
function selectEnchantments(
  rng: SeededRandom,
  powerLevel: number,
  category: ItemCategory,
  itemId: string
): EnchantmentInstance[] {
  // Books can receive enchantments from any category
  const isBook = itemId === 'book';
  const applicableEnchants = isBook
    ? Object.values(ENCHANTMENT_REGISTRY).filter((def) => !def.treasure && !def.curse)
    : getApplicableEnchantments(category);

  // Build a list of (enchantment, level) pairs that are valid for this power level
  interface Candidate {
    type: EnchantmentType;
    level: number;
    weight: number;
  }

  const candidates: Candidate[] = [];

  for (const def of applicableEnchants) {
    // Find the highest level achievable at this power
    for (let level = def.maxLevel; level >= 1; level--) {
      const minPower = def.minPowerPerLevel[level - 1];
      if (minPower !== undefined && powerLevel >= minPower) {
        candidates.push({
          type: def.type,
          level,
          weight: def.weight,
        });
        break; // Only add the highest achievable level
      }
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  const result: EnchantmentInstance[] = [];

  // Select first enchantment via weighted random
  const first = weightedRandomSelect(rng, candidates);
  if (first) {
    result.push({ type: first.type, level: first.level });
  }

  // Chance to add additional enchantments: (powerLevel + 1) / 50
  // Each subsequent enchantment halves the probability
  let remainingPower = powerLevel;

  while (rng.nextFloat() < (remainingPower + 1) / 50) {
    // Filter to compatible enchantments
    const existingTypes = result.map((e) => e.type);
    const compatible = candidates.filter((c) =>
      !existingTypes.includes(c.type) &&
      existingTypes.every((t) => areCompatible(c.type, t))
    );

    if (compatible.length === 0) break;

    const next = weightedRandomSelect(rng, compatible);
    if (next) {
      result.push({ type: next.type, level: next.level });
    }

    // Reduce the effective power for subsequent chances
    remainingPower = Math.floor(remainingPower / 2);
  }

  return result;
}

/**
 * Select a random element from a weighted list.
 */
function weightedRandomSelect<T extends { weight: number }>(
  rng: SeededRandom,
  items: T[]
): T | null {
  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng.nextInt(0, totalWeight - 1);

  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }

  return items[items.length - 1];
}

// =============================================================================
// APPLY ENCHANTMENT
// =============================================================================

/**
 * Apply a set of enchantments to an inventory item, consuming XP levels
 * and lapis lazuli.
 *
 * @param item - The item to enchant (modified in place)
 * @param enchantments - Enchantments to apply
 * @param playerLevel - Player's current XP level
 * @param levelCost - XP levels to consume
 * @param lapisCost - Lapis lazuli to consume
 * @returns Object with the enchanted item and remaining player level, or null if insufficient resources
 */
export function applyEnchantment(
  item: InventorySlot,
  enchantments: EnchantmentInstance[],
  playerLevel: number,
  levelCost: number,
  lapisCost: number
): { item: InventorySlot; newPlayerLevel: number; lapisConsumed: number } | null {
  // Validate player has enough levels
  if (playerLevel < levelCost) return null;

  // Apply enchantments to the item
  const existingEnchants = item.enchantments ?? [];
  const mergedEnchants = mergeEnchantments(existingEnchants, enchantments);

  const enchantedItem: InventorySlot = {
    ...item,
    enchantments: mergedEnchants,
  };

  return {
    item: enchantedItem,
    newPlayerLevel: playerLevel - levelCost,
    lapisConsumed: lapisCost,
  };
}

/**
 * Merge new enchantments onto existing ones. If the same enchantment exists,
 * take the higher level. If both are the same level and below max, increment.
 */
function mergeEnchantments(
  existing: EnchantmentInstance[],
  incoming: EnchantmentInstance[]
): EnchantmentInstance[] {
  const map = new Map<EnchantmentType, number>();

  for (const e of existing) {
    map.set(e.type, e.level);
  }

  for (const e of incoming) {
    const current = map.get(e.type);
    if (current === undefined) {
      map.set(e.type, e.level);
    } else if (current === e.level) {
      const def = ENCHANTMENT_REGISTRY[e.type];
      const maxLevel = def ? def.maxLevel : e.level;
      map.set(e.type, Math.min(current + 1, maxLevel));
    } else {
      map.set(e.type, Math.max(current, e.level));
    }
  }

  return Array.from(map.entries()).map(([type, level]) => ({ type, level }));
}
