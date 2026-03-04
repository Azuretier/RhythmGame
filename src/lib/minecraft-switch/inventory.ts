// =============================================================================
// Inventory Management System — Full Minecraft: Nintendo Switch Edition Inventory
// =============================================================================
// Implements the complete inventory management with 36 main slots (0-8 hotbar,
// 9-35 main), 4 armor slots, 1 offhand slot, a 2x2 crafting grid, and 1
// crafting output slot. Supports add/remove/move/swap/split/shift-click, armor
// management, tool durability, stack size lookups, serialization, and container
// interaction (chests, furnaces, etc.).
// =============================================================================

import {
  Block,
  type InventorySlot,
  type ArmorSlot,
  type EnchantmentInstance,
  type MaterialTier,
  MATERIAL_TIER_CONFIG,
  ARMOR_TIER_CONFIG,
} from '@/types/minecraft-switch';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Total main inventory slots (indices 0-8 = hotbar, 9-35 = upper inventory). */
const MAIN_SLOTS = 36;
/** Number of hotbar slots. */
const HOTBAR_SIZE = 9;
/** Number of armor slots. */
const ARMOR_SLOTS = 4;
/** Number of 2x2 crafting grid slots. */
const CRAFTING_GRID_SLOTS = 4;

/** Armor slot indices in the armor array: 0=helmet, 1=chestplate, 2=leggings, 3=boots. */
const ARMOR_SLOT_MAP: Record<ArmorSlot, number> = {
  helmet: 0,
  chestplate: 1,
  leggings: 2,
  boots: 3,
};

// =============================================================================
// STACK SIZE LOOKUP
// =============================================================================

/** Items that stack to 1 (tools, weapons, armor, etc.). */
const STACK_1_ITEMS = new Set([
  // Tools
  'wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe',
  'wooden_axe', 'stone_axe', 'iron_axe', 'diamond_axe', 'netherite_axe',
  'wooden_shovel', 'stone_shovel', 'iron_shovel', 'diamond_shovel', 'netherite_shovel',
  'wooden_hoe', 'stone_hoe', 'iron_hoe', 'diamond_hoe', 'netherite_hoe',
  // Weapons
  'wooden_sword', 'stone_sword', 'iron_sword', 'diamond_sword', 'netherite_sword',
  'bow', 'crossbow', 'trident', 'shield',
  // Armor
  'leather_helmet', 'leather_chestplate', 'leather_leggings', 'leather_boots',
  'chainmail_helmet', 'chainmail_chestplate', 'chainmail_leggings', 'chainmail_boots',
  'iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots',
  'diamond_helmet', 'diamond_chestplate', 'diamond_leggings', 'diamond_boots',
  'netherite_helmet', 'netherite_chestplate', 'netherite_leggings', 'netherite_boots',
  'golden_helmet', 'golden_chestplate', 'golden_leggings', 'golden_boots',
  'turtle_helmet',
  // Misc
  'shears', 'flint_and_steel', 'fishing_rod', 'carrot_on_a_stick',
  'warped_fungus_on_a_stick', 'elytra', 'totem_of_undying',
  'enchanted_book', 'written_book', 'music_disc',
  'water_bucket', 'lava_bucket', 'milk_bucket',
  'potion', 'splash_potion', 'lingering_potion',
  'minecart', 'chest_minecart', 'hopper_minecart', 'tnt_minecart', 'furnace_minecart',
  'oak_boat', 'spruce_boat', 'birch_boat', 'jungle_boat', 'acacia_boat', 'dark_oak_boat',
  'saddle', 'iron_horse_armor', 'golden_horse_armor', 'diamond_horse_armor',
  'map', 'filled_map', 'compass', 'clock',
  'bed',
]);

/** Items that stack to 16. */
const STACK_16_ITEMS = new Set([
  'ender_pearl', 'snowball', 'egg', 'sign',
  'bucket', 'honey_bottle',
  'banner',
  'armor_stand',
]);

/**
 * Get the maximum stack size for an item.
 * Most items stack to 64. Tools/weapons/armor stack to 1.
 * Some items (ender pearl, snowball, egg) stack to 16.
 */
export function getMaxStackSize(itemId: string): number {
  if (STACK_1_ITEMS.has(itemId)) return 1;
  if (STACK_16_ITEMS.has(itemId)) return 16;
  return 64;
}

// =============================================================================
// ARMOR DETECTION
// =============================================================================

/** Determine which armor slot an item belongs to, or null if it is not armor. */
function getArmorSlotForItem(itemId: string): ArmorSlot | null {
  if (itemId.includes('helmet') || itemId === 'turtle_helmet') return 'helmet';
  if (itemId.includes('chestplate') || itemId === 'elytra') return 'chestplate';
  if (itemId.includes('leggings')) return 'leggings';
  if (itemId.includes('boots')) return 'boots';
  return null;
}

/** Parse material tier from an armor/tool item ID. */
function parseTierFromItemId(itemId: string): MaterialTier {
  if (itemId.startsWith('netherite')) return 'netherite';
  if (itemId.startsWith('diamond')) return 'diamond';
  if (itemId.startsWith('iron') || itemId.startsWith('chainmail')) return 'iron';
  if (itemId.startsWith('golden') || itemId.startsWith('gold')) return 'iron'; // golden uses iron-tier values
  if (itemId.startsWith('stone')) return 'stone';
  if (itemId.startsWith('wooden') || itemId.startsWith('leather')) return 'wood';
  return 'hand';
}

/** Get the durability for common tool/armor item IDs. */
function getDefaultDurability(itemId: string): number {
  const tier = parseTierFromItemId(itemId);
  const config = MATERIAL_TIER_CONFIG[tier];

  // Armor durability multipliers by slot
  if (itemId.includes('helmet')) return Math.floor(config.durability * 0.68);
  if (itemId.includes('chestplate')) return Math.floor(config.durability * 1.0);
  if (itemId.includes('leggings')) return Math.floor(config.durability * 0.94);
  if (itemId.includes('boots')) return Math.floor(config.durability * 0.81);

  // Tools
  if (itemId.includes('pickaxe') || itemId.includes('axe') ||
      itemId.includes('shovel') || itemId.includes('hoe') ||
      itemId.includes('sword')) {
    return config.durability;
  }

  // Special items
  if (itemId === 'shears') return 238;
  if (itemId === 'flint_and_steel') return 64;
  if (itemId === 'fishing_rod') return 64;
  if (itemId === 'bow') return 384;
  if (itemId === 'crossbow') return 465;
  if (itemId === 'trident') return 250;
  if (itemId === 'shield') return 336;
  if (itemId === 'elytra') return 432;
  if (itemId === 'carrot_on_a_stick') return 25;
  if (itemId === 'warped_fungus_on_a_stick') return 100;

  return 0;
}

// =============================================================================
// SERIALIZED INVENTORY FORMAT
// =============================================================================

export interface SerializedInventory {
  main: (InventorySlot | null)[];
  armor: (InventorySlot | null)[];
  offhand: InventorySlot | null;
  craftingGrid: (InventorySlot | null)[];
  craftingOutput: InventorySlot | null;
  selectedHotbarSlot: number;
}

// =============================================================================
// CONTAINER INTERFACE
// =============================================================================

/**
 * Minimal container interface for external containers (chests, furnaces, etc.).
 * External code should implement this to allow inventory-container transfers.
 */
export interface Container {
  /** Total number of slots in this container. */
  readonly size: number;
  /** Get the item at a slot index. */
  getSlot(index: number): InventorySlot | null;
  /** Set the item at a slot index. */
  setSlot(index: number, item: InventorySlot | null): void;
}

// =============================================================================
// INVENTORY MANAGER CLASS
// =============================================================================

export class InventoryManager {
  // -----------------------------------------------------------------------
  // Storage
  // -----------------------------------------------------------------------

  /** 36 main inventory slots (0-8 = hotbar, 9-35 = upper inventory). */
  private main: (InventorySlot | null)[];
  /** 4 armor slots: [helmet, chestplate, leggings, boots]. */
  private armor: (InventorySlot | null)[];
  /** Offhand slot. */
  private offhand: InventorySlot | null;
  /** 2x2 crafting grid (player crafting). */
  private craftingGrid: (InventorySlot | null)[];
  /** Crafting output slot. */
  private craftingOutput: InventorySlot | null;
  /** Currently selected hotbar slot (0-8). */
  private selectedHotbarSlot: number;

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  constructor() {
    this.main = new Array<InventorySlot | null>(MAIN_SLOTS).fill(null);
    this.armor = new Array<InventorySlot | null>(ARMOR_SLOTS).fill(null);
    this.offhand = null;
    this.craftingGrid = new Array<InventorySlot | null>(CRAFTING_GRID_SLOTS).fill(null);
    this.craftingOutput = null;
    this.selectedHotbarSlot = 0;
  }

  // ==========================================================================
  // SLOT ACCESS
  // ==========================================================================

  /**
   * Get the contents of a main inventory slot (0-35).
   * Returns null if the slot is empty.
   */
  getSlot(index: number): InventorySlot | null {
    if (index < 0 || index >= MAIN_SLOTS) return null;
    return this.main[index] ? { ...this.main[index]! } : null;
  }

  /**
   * Directly set a main inventory slot (for server sync).
   */
  setSlot(index: number, item: InventorySlot | null): void {
    if (index < 0 || index >= MAIN_SLOTS) return;
    this.main[index] = item ? { ...item } : null;
  }

  /**
   * Get the currently selected hotbar slot index (0-8).
   */
  getHotbarSlot(): number {
    return this.selectedHotbarSlot;
  }

  /**
   * Set the currently selected hotbar slot (0-8, typically from scroll wheel).
   */
  setHotbarSlot(index: number): void {
    if (index < 0 || index >= HOTBAR_SIZE) return;
    this.selectedHotbarSlot = index;
  }

  /**
   * Get the item in the currently selected hotbar slot.
   */
  getHeldItem(): InventorySlot | null {
    return this.getSlot(this.selectedHotbarSlot);
  }

  /**
   * Get an armor slot by type or index.
   */
  getArmorSlot(slotOrIndex: ArmorSlot | number): InventorySlot | null {
    const index = typeof slotOrIndex === 'number' ? slotOrIndex : ARMOR_SLOT_MAP[slotOrIndex];
    if (index < 0 || index >= ARMOR_SLOTS) return null;
    return this.armor[index] ? { ...this.armor[index]! } : null;
  }

  /**
   * Set an armor slot directly (for server sync).
   */
  setArmorSlot(slotOrIndex: ArmorSlot | number, item: InventorySlot | null): void {
    const index = typeof slotOrIndex === 'number' ? slotOrIndex : ARMOR_SLOT_MAP[slotOrIndex];
    if (index < 0 || index >= ARMOR_SLOTS) return;
    this.armor[index] = item ? { ...item } : null;
  }

  /**
   * Get the offhand slot contents.
   */
  getOffhand(): InventorySlot | null {
    return this.offhand ? { ...this.offhand } : null;
  }

  /**
   * Set the offhand slot directly.
   */
  setOffhand(item: InventorySlot | null): void {
    this.offhand = item ? { ...item } : null;
  }

  /**
   * Get a crafting grid slot (0-3).
   */
  getCraftingGridSlot(index: number): InventorySlot | null {
    if (index < 0 || index >= CRAFTING_GRID_SLOTS) return null;
    return this.craftingGrid[index] ? { ...this.craftingGrid[index]! } : null;
  }

  /**
   * Set a crafting grid slot.
   */
  setCraftingGridSlot(index: number, item: InventorySlot | null): void {
    if (index < 0 || index >= CRAFTING_GRID_SLOTS) return;
    this.craftingGrid[index] = item ? { ...item } : null;
  }

  /**
   * Get the crafting output slot.
   */
  getCraftingOutput(): InventorySlot | null {
    return this.craftingOutput ? { ...this.craftingOutput } : null;
  }

  /**
   * Set the crafting output slot.
   */
  setCraftingOutput(item: InventorySlot | null): void {
    this.craftingOutput = item ? { ...item } : null;
  }

  // ==========================================================================
  // CORE OPERATIONS
  // ==========================================================================

  /**
   * Add items to the inventory, auto-stacking to existing stacks first,
   * then filling empty slots. Prioritizes the hotbar for first-time additions.
   *
   * @param itemId - The item to add.
   * @param count - Number of items to add.
   * @param nbt - Optional NBT data for the item.
   * @returns The number of items that could not fit (remainder).
   */
  addItem(itemId: string, count: number, nbt?: Record<string, unknown>): number {
    let remaining = count;
    const maxStack = getMaxStackSize(itemId);
    const durability = getDefaultDurability(itemId);

    // Phase 1: Stack onto existing matching stacks
    for (let i = 0; i < MAIN_SLOTS && remaining > 0; i++) {
      const slot = this.main[i];
      if (slot && slot.item === itemId && slot.count < maxStack) {
        const spaceAvailable = maxStack - slot.count;
        const toAdd = Math.min(remaining, spaceAvailable);
        slot.count += toAdd;
        remaining -= toAdd;
      }
    }

    // Phase 2: Fill empty slots (hotbar first, then main inventory)
    // Hotbar slots (0-8) first
    for (let i = 0; i < HOTBAR_SIZE && remaining > 0; i++) {
      if (!this.main[i]) {
        const toAdd = Math.min(remaining, maxStack);
        this.main[i] = {
          item: itemId,
          count: toAdd,
          ...(durability > 0 ? { durability } : {}),
          ...(nbt ? { nbt } : {}),
        };
        remaining -= toAdd;
      }
    }

    // Main inventory slots (9-35)
    for (let i = HOTBAR_SIZE; i < MAIN_SLOTS && remaining > 0; i++) {
      if (!this.main[i]) {
        const toAdd = Math.min(remaining, maxStack);
        this.main[i] = {
          item: itemId,
          count: toAdd,
          ...(durability > 0 ? { durability } : {}),
          ...(nbt ? { nbt } : {}),
        };
        remaining -= toAdd;
      }
    }

    return remaining;
  }

  /**
   * Remove a number of items from a specific slot.
   *
   * @param slot - The main inventory slot index (0-35).
   * @param count - Number of items to remove.
   * @returns The number of items actually removed.
   */
  removeItem(slot: number, count: number): number {
    if (slot < 0 || slot >= MAIN_SLOTS) return 0;
    const slotData = this.main[slot];
    if (!slotData) return 0;

    const toRemove = Math.min(count, slotData.count);
    slotData.count -= toRemove;

    if (slotData.count <= 0) {
      this.main[slot] = null;
    }

    return toRemove;
  }

  /**
   * Move or swap items between two main inventory slots.
   * If the destination has the same item type, merge stacks up to max.
   * If different items, swap them.
   */
  moveItem(fromSlot: number, toSlot: number): void {
    if (fromSlot < 0 || fromSlot >= MAIN_SLOTS) return;
    if (toSlot < 0 || toSlot >= MAIN_SLOTS) return;
    if (fromSlot === toSlot) return;

    const fromItem = this.main[fromSlot];
    const toItem = this.main[toSlot];

    // If source is empty, nothing to do
    if (!fromItem) return;

    // If destination is empty, just move
    if (!toItem) {
      this.main[toSlot] = fromItem;
      this.main[fromSlot] = null;
      return;
    }

    // If same item type, try to merge
    if (fromItem.item === toItem.item) {
      const maxStack = getMaxStackSize(fromItem.item);
      const spaceAvailable = maxStack - toItem.count;

      if (spaceAvailable >= fromItem.count) {
        // All items fit
        toItem.count += fromItem.count;
        this.main[fromSlot] = null;
      } else if (spaceAvailable > 0) {
        // Partial merge
        toItem.count += spaceAvailable;
        fromItem.count -= spaceAvailable;
      } else {
        // Stack is full — swap
        this.main[fromSlot] = toItem;
        this.main[toSlot] = fromItem;
      }
    } else {
      // Different items — swap
      this.main[fromSlot] = toItem;
      this.main[toSlot] = fromItem;
    }
  }

  /**
   * Take half the stack from a slot (right-click pickup behavior).
   * Returns the picked-up items, leaving the remainder in the slot.
   */
  splitStack(slot: number): InventorySlot | null {
    if (slot < 0 || slot >= MAIN_SLOTS) return null;
    const slotData = this.main[slot];
    if (!slotData || slotData.count <= 1) return null;

    const takeCount = Math.ceil(slotData.count / 2);
    const pickedUp: InventorySlot = {
      item: slotData.item,
      count: takeCount,
      ...(slotData.durability !== undefined ? { durability: slotData.durability } : {}),
      ...(slotData.enchantments ? { enchantments: [...slotData.enchantments] } : {}),
      ...(slotData.nbt ? { nbt: { ...slotData.nbt } } : {}),
    };

    slotData.count -= takeCount;
    if (slotData.count <= 0) {
      this.main[slot] = null;
    }

    return pickedUp;
  }

  /**
   * Smart-move an item (Shift+Click behavior):
   * - From hotbar (0-8) to main inventory (9-35)
   * - From main inventory (9-35) to hotbar (0-8)
   * - Armor items go to the appropriate armor slot
   * - From crafting output to hotbar/main
   */
  shiftClick(slot: number): void {
    if (slot < 0 || slot >= MAIN_SLOTS) return;
    const item = this.main[slot];
    if (!item) return;

    // Check if this is an armor item
    const armorSlot = getArmorSlotForItem(item.item);
    if (armorSlot !== null) {
      const armorIndex = ARMOR_SLOT_MAP[armorSlot];
      if (!this.armor[armorIndex]) {
        // Move to armor slot
        this.armor[armorIndex] = item;
        this.main[slot] = null;
        return;
      }
    }

    if (slot < HOTBAR_SIZE) {
      // Hotbar to main inventory
      this.shiftClickToRange(slot, HOTBAR_SIZE, MAIN_SLOTS);
    } else {
      // Main inventory to hotbar
      this.shiftClickToRange(slot, 0, HOTBAR_SIZE);
    }
  }

  /**
   * Move items from a source slot to the first available slot in a range.
   * Handles stacking.
   */
  private shiftClickToRange(fromSlot: number, rangeStart: number, rangeEnd: number): void {
    const item = this.main[fromSlot];
    if (!item) return;

    const maxStack = getMaxStackSize(item.item);
    let remaining = item.count;

    // First pass: try to stack with existing items
    for (let i = rangeStart; i < rangeEnd && remaining > 0; i++) {
      const target = this.main[i];
      if (target && target.item === item.item && target.count < maxStack) {
        const space = maxStack - target.count;
        const toMove = Math.min(remaining, space);
        target.count += toMove;
        remaining -= toMove;
      }
    }

    // Second pass: fill empty slots
    for (let i = rangeStart; i < rangeEnd && remaining > 0; i++) {
      if (!this.main[i]) {
        const toMove = Math.min(remaining, maxStack);
        this.main[i] = {
          item: item.item,
          count: toMove,
          ...(item.durability !== undefined ? { durability: item.durability } : {}),
          ...(item.enchantments ? { enchantments: [...item.enchantments] } : {}),
          ...(item.nbt ? { nbt: { ...item.nbt } } : {}),
        };
        remaining -= toMove;
      }
    }

    if (remaining <= 0) {
      this.main[fromSlot] = null;
    } else {
      item.count = remaining;
    }
  }

  /**
   * Quick-swap a main inventory slot with a hotbar slot (number key 1-9).
   */
  swapHotbar(slot: number, hotbarIndex: number): void {
    if (slot < 0 || slot >= MAIN_SLOTS) return;
    if (hotbarIndex < 0 || hotbarIndex >= HOTBAR_SIZE) return;
    if (slot === hotbarIndex) return;

    const temp = this.main[slot];
    this.main[slot] = this.main[hotbarIndex];
    this.main[hotbarIndex] = temp;
  }

  /**
   * Mark items for dropping from a slot.
   * Q key = drop 1 item, Ctrl+Q = drop full stack.
   *
   * @param slot - The main inventory slot index.
   * @param dropAll - If true, drop the entire stack.
   * @returns The dropped item (to be spawned as an entity), or null.
   */
  dropItem(slot: number, dropAll: boolean): InventorySlot | null {
    if (slot < 0 || slot >= MAIN_SLOTS) return null;
    const slotData = this.main[slot];
    if (!slotData) return null;

    if (dropAll || slotData.count === 1) {
      const dropped = { ...slotData };
      this.main[slot] = null;
      return dropped;
    }

    // Drop 1 item
    const dropped: InventorySlot = {
      item: slotData.item,
      count: 1,
      ...(slotData.durability !== undefined ? { durability: slotData.durability } : {}),
      ...(slotData.enchantments ? { enchantments: [...slotData.enchantments] } : {}),
      ...(slotData.nbt ? { nbt: { ...slotData.nbt } } : {}),
    };
    slotData.count -= 1;
    return dropped;
  }

  // ==========================================================================
  // ARMOR MANAGEMENT
  // ==========================================================================

  /**
   * Equip an armor item from a main inventory slot to the correct armor slot.
   * If the armor slot is occupied, swaps with the inventory slot.
   *
   * @param slot - Main inventory slot containing the armor item.
   * @returns True if the equip was successful.
   */
  equipArmor(slot: number): boolean {
    if (slot < 0 || slot >= MAIN_SLOTS) return false;
    const item = this.main[slot];
    if (!item) return false;

    const armorSlotType = getArmorSlotForItem(item.item);
    if (!armorSlotType) return false;

    const armorIndex = ARMOR_SLOT_MAP[armorSlotType];
    const currentArmor = this.armor[armorIndex];

    // Equip the new armor
    this.armor[armorIndex] = item;
    // Swap the old armor back to inventory (or clear the slot)
    this.main[slot] = currentArmor;

    return true;
  }

  /**
   * Calculate total armor defense points from all equipped armor.
   * Uses the ARMOR_TIER_CONFIG from the type definitions.
   */
  getArmorDefense(): number {
    let total = 0;

    for (let i = 0; i < ARMOR_SLOTS; i++) {
      const armorItem = this.armor[i];
      if (!armorItem) continue;

      const tier = parseTierFromItemId(armorItem.item);
      const armorConfig = ARMOR_TIER_CONFIG[tier];
      const slotName = (['helmet', 'chestplate', 'leggings', 'boots'] as const)[i];
      total += armorConfig[slotName];
    }

    return total;
  }

  /**
   * Calculate total armor toughness from all equipped armor.
   */
  getArmorToughness(): number {
    let total = 0;

    for (let i = 0; i < ARMOR_SLOTS; i++) {
      const armorItem = this.armor[i];
      if (!armorItem) continue;

      const tier = parseTierFromItemId(armorItem.item);
      const armorConfig = ARMOR_TIER_CONFIG[tier];
      total += armorConfig.toughness;
    }

    return total;
  }

  /**
   * Reduce durability of all equipped armor pieces by the given amount.
   * Removes armor pieces whose durability reaches zero.
   *
   * @param amount - Durability points to subtract from each armor piece.
   */
  damageArmor(amount: number): void {
    for (let i = 0; i < ARMOR_SLOTS; i++) {
      const armorItem = this.armor[i];
      if (!armorItem || armorItem.durability === undefined) continue;

      armorItem.durability -= amount;
      if (armorItem.durability <= 0) {
        this.armor[i] = null; // Armor broke
      }
    }
  }

  // ==========================================================================
  // TOOL DURABILITY
  // ==========================================================================

  /**
   * Reduce durability of a tool in a main inventory slot.
   * Removes the item if durability reaches 0.
   *
   * @param slot - The main inventory slot index.
   * @param amount - Durability points to subtract.
   * @returns True if the tool broke (durability reached 0).
   */
  damageTool(slot: number, amount: number): boolean {
    if (slot < 0 || slot >= MAIN_SLOTS) return false;
    const slotData = this.main[slot];
    if (!slotData || slotData.durability === undefined) return false;

    // Check for Unbreaking enchantment
    let actualAmount = amount;
    if (slotData.enchantments) {
      const unbreaking = slotData.enchantments.find(e => e.type === 'unbreaking');
      if (unbreaking) {
        // Unbreaking: (100 / (level + 1))% chance to take durability damage
        const chance = 1.0 / (unbreaking.level + 1);
        if (Math.random() > chance) {
          actualAmount = 0; // Durability saved by Unbreaking
        }
      }
    }

    if (actualAmount <= 0) return false;

    slotData.durability -= actualAmount;
    if (slotData.durability <= 0) {
      this.main[slot] = null; // Tool broke
      return true;
    }

    return false;
  }

  /**
   * Get the current and maximum durability of a tool in a slot.
   * Returns null if the slot is empty or has no durability.
   */
  getToolDurability(slot: number): { current: number; max: number } | null {
    if (slot < 0 || slot >= MAIN_SLOTS) return null;
    const slotData = this.main[slot];
    if (!slotData || slotData.durability === undefined) return null;

    const maxDurability = getDefaultDurability(slotData.item);
    return {
      current: slotData.durability,
      max: maxDurability || slotData.durability,
    };
  }

  // ==========================================================================
  // SERIALIZATION
  // ==========================================================================

  /**
   * Serialize the entire inventory to a JSON-safe format for
   * network transmission or local storage persistence.
   */
  serialize(): SerializedInventory {
    return {
      main: this.main.map(s => s ? { ...s } : null),
      armor: this.armor.map(s => s ? { ...s } : null),
      offhand: this.offhand ? { ...this.offhand } : null,
      craftingGrid: this.craftingGrid.map(s => s ? { ...s } : null),
      craftingOutput: this.craftingOutput ? { ...this.craftingOutput } : null,
      selectedHotbarSlot: this.selectedHotbarSlot,
    };
  }

  /**
   * Restore inventory state from a serialized format.
   */
  deserialize(data: SerializedInventory): void {
    // Restore main inventory
    if (data.main && data.main.length === MAIN_SLOTS) {
      this.main = data.main.map(s => s ? { ...s } : null);
    }

    // Restore armor
    if (data.armor && data.armor.length === ARMOR_SLOTS) {
      this.armor = data.armor.map(s => s ? { ...s } : null);
    }

    // Restore offhand
    this.offhand = data.offhand ? { ...data.offhand } : null;

    // Restore crafting grid
    if (data.craftingGrid && data.craftingGrid.length === CRAFTING_GRID_SLOTS) {
      this.craftingGrid = data.craftingGrid.map(s => s ? { ...s } : null);
    }

    // Restore crafting output
    this.craftingOutput = data.craftingOutput ? { ...data.craftingOutput } : null;

    // Restore hotbar selection
    if (typeof data.selectedHotbarSlot === 'number' &&
        data.selectedHotbarSlot >= 0 && data.selectedHotbarSlot < HOTBAR_SIZE) {
      this.selectedHotbarSlot = data.selectedHotbarSlot;
    }
  }

  /**
   * Empty all inventory slots.
   */
  clear(): void {
    this.main.fill(null);
    this.armor.fill(null);
    this.offhand = null;
    this.craftingGrid.fill(null);
    this.craftingOutput = null;
    this.selectedHotbarSlot = 0;
  }

  // ==========================================================================
  // CONTAINER INTERACTION
  // ==========================================================================

  /**
   * Move items from a main inventory slot to a container slot.
   * Handles stacking if the container slot has the same item.
   *
   * @param fromSlot - Main inventory slot index.
   * @param container - The external container.
   * @param toSlot - Container slot index.
   */
  transferToContainer(fromSlot: number, container: Container, toSlot: number): void {
    if (fromSlot < 0 || fromSlot >= MAIN_SLOTS) return;
    if (toSlot < 0 || toSlot >= container.size) return;

    const fromItem = this.main[fromSlot];
    if (!fromItem) return;

    const toItem = container.getSlot(toSlot);

    if (!toItem) {
      // Empty target — move everything
      container.setSlot(toSlot, { ...fromItem });
      this.main[fromSlot] = null;
      return;
    }

    if (fromItem.item === toItem.item) {
      // Same item — merge
      const maxStack = getMaxStackSize(fromItem.item);
      const space = maxStack - toItem.count;
      if (space > 0) {
        const toMove = Math.min(fromItem.count, space);
        toItem.count += toMove;
        container.setSlot(toSlot, toItem);
        fromItem.count -= toMove;
        if (fromItem.count <= 0) {
          this.main[fromSlot] = null;
        }
      } else {
        // Swap
        this.main[fromSlot] = { ...toItem };
        container.setSlot(toSlot, { ...fromItem });
      }
    } else {
      // Different items — swap
      this.main[fromSlot] = { ...toItem };
      container.setSlot(toSlot, { ...fromItem });
    }
  }

  /**
   * Shift-click to move items from a main inventory slot into a container,
   * automatically finding the best slot. Stacks first, then fills empty slots.
   *
   * @param fromSlot - Main inventory slot index.
   * @param container - The external container.
   */
  quickTransferToContainer(fromSlot: number, container: Container): void {
    if (fromSlot < 0 || fromSlot >= MAIN_SLOTS) return;
    const item = this.main[fromSlot];
    if (!item) return;

    let remaining = item.count;
    const maxStack = getMaxStackSize(item.item);

    // Phase 1: Stack onto existing matching items in container
    for (let i = 0; i < container.size && remaining > 0; i++) {
      const target = container.getSlot(i);
      if (target && target.item === item.item && target.count < maxStack) {
        const space = maxStack - target.count;
        const toMove = Math.min(remaining, space);
        target.count += toMove;
        container.setSlot(i, target);
        remaining -= toMove;
      }
    }

    // Phase 2: Fill empty container slots
    for (let i = 0; i < container.size && remaining > 0; i++) {
      if (!container.getSlot(i)) {
        const toMove = Math.min(remaining, maxStack);
        container.setSlot(i, {
          item: item.item,
          count: toMove,
          ...(item.durability !== undefined ? { durability: item.durability } : {}),
          ...(item.enchantments ? { enchantments: [...item.enchantments] } : {}),
          ...(item.nbt ? { nbt: { ...item.nbt } } : {}),
        });
        remaining -= toMove;
      }
    }

    if (remaining <= 0) {
      this.main[fromSlot] = null;
    } else {
      item.count = remaining;
    }
  }

  // ==========================================================================
  // UTILITY & QUERY
  // ==========================================================================

  /**
   * Count the total number of a specific item across the entire inventory.
   */
  countItem(itemId: string): number {
    let total = 0;
    for (const slot of this.main) {
      if (slot && slot.item === itemId) total += slot.count;
    }
    for (const slot of this.armor) {
      if (slot && slot.item === itemId) total += slot.count;
    }
    if (this.offhand && this.offhand.item === itemId) total += this.offhand.count;
    return total;
  }

  /**
   * Check if the inventory has at least `count` of a specific item.
   */
  hasItem(itemId: string, count: number = 1): boolean {
    return this.countItem(itemId) >= count;
  }

  /**
   * Remove a specific number of a specific item from the inventory,
   * drawing from any slots that contain it. Used for crafting consumption.
   *
   * @returns The number of items actually consumed.
   */
  consumeItem(itemId: string, count: number): number {
    let remaining = count;

    for (let i = 0; i < MAIN_SLOTS && remaining > 0; i++) {
      const slot = this.main[i];
      if (slot && slot.item === itemId) {
        const toRemove = Math.min(remaining, slot.count);
        slot.count -= toRemove;
        remaining -= toRemove;
        if (slot.count <= 0) {
          this.main[i] = null;
        }
      }
    }

    return count - remaining;
  }

  /**
   * Find the first slot index containing a specific item.
   * Returns -1 if not found.
   */
  findItem(itemId: string): number {
    for (let i = 0; i < MAIN_SLOTS; i++) {
      if (this.main[i]?.item === itemId) return i;
    }
    return -1;
  }

  /**
   * Find the first empty slot in the main inventory.
   * Returns -1 if the inventory is full.
   */
  findEmptySlot(): number {
    for (let i = 0; i < MAIN_SLOTS; i++) {
      if (!this.main[i]) return i;
    }
    return -1;
  }

  /**
   * Check if the inventory is completely full (no empty slots and all stacks at max).
   */
  isFull(): boolean {
    for (let i = 0; i < MAIN_SLOTS; i++) {
      if (!this.main[i]) return false;
      const maxStack = getMaxStackSize(this.main[i]!.item);
      if (this.main[i]!.count < maxStack) return false;
    }
    return true;
  }

  /**
   * Get all non-empty slots as an array of { index, slot } pairs.
   */
  getAllItems(): { index: number; slot: InventorySlot }[] {
    const items: { index: number; slot: InventorySlot }[] = [];
    for (let i = 0; i < MAIN_SLOTS; i++) {
      if (this.main[i]) {
        items.push({ index: i, slot: { ...this.main[i]! } });
      }
    }
    return items;
  }

  /**
   * Get the hotbar contents as an array (convenience for HUD rendering).
   */
  getHotbarContents(): (InventorySlot | null)[] {
    return this.main.slice(0, HOTBAR_SIZE).map(s => s ? { ...s } : null);
  }

  /**
   * Get all armor contents as an array (convenience for HUD rendering).
   */
  getArmorContents(): (InventorySlot | null)[] {
    return this.armor.map(s => s ? { ...s } : null);
  }

  /**
   * Get the crafting grid contents as an array.
   */
  getCraftingGridContents(): (InventorySlot | null)[] {
    return this.craftingGrid.map(s => s ? { ...s } : null);
  }

  /**
   * Clear the crafting grid, returning items to the main inventory.
   * Used when closing the inventory screen.
   */
  clearCraftingGrid(): void {
    for (let i = 0; i < CRAFTING_GRID_SLOTS; i++) {
      const item = this.craftingGrid[i];
      if (item) {
        const leftover = this.addItem(item.item, item.count, item.nbt);
        // If inventory is full, items are lost (should be dropped as entities)
        this.craftingGrid[i] = null;
        if (leftover > 0) {
          // Caller should handle dropping these items into the world
          // For now they are silently lost
        }
      }
    }
    this.craftingOutput = null;
  }
}
