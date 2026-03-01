// =============================================================================
// Tile Entity System — Minecraft: Nintendo Switch Edition
// =============================================================================
// Framework for blocks that store additional data beyond their block ID.
// Tile entities persist per-position and are ticked each game update.
// Includes implementations for Furnace, Chest, Sign, Brewing Stand,
// Hopper, and Jukebox.
// =============================================================================

import type { InventorySlot } from '@/types/minecraft-switch';
import {
  getSmeltingRecipe,
  getFuelValue,
  isFuel,
  isSmeltable,
  SMELT_TIME,
} from '@/lib/minecraft-switch/crafting/smelting';
import { getMaxStackSize } from '@/lib/minecraft-switch/inventory';

// =============================================================================
// BASE TILE ENTITY
// =============================================================================

/**
 * Abstract base class for all tile entities. A tile entity is attached to a
 * specific block position and stores data that a plain block ID cannot hold
 * (inventories, progress bars, text, etc.).
 */
export abstract class TileEntity {
  /** World X coordinate. */
  x: number;
  /** World Y coordinate. */
  y: number;
  /** World Z coordinate. */
  z: number;
  /** Tile entity type identifier (e.g. 'furnace', 'chest'). */
  type: string;

  constructor(x: number, y: number, z: number, type: string) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.type = type;
  }

  /**
   * Called every game tick to update internal state.
   * @param deltaTime - Time since last tick in ticks (usually 1).
   */
  abstract tick(deltaTime: number): void;

  /**
   * Serialize this tile entity to a plain object for persistence.
   */
  abstract serialize(): Record<string, unknown>;

  /**
   * Restore state from a previously serialized object.
   */
  abstract deserialize(data: Record<string, unknown>): void;

  /** Convenience: position key string "x,y,z". */
  get key(): string {
    return `${this.x},${this.y},${this.z}`;
  }
}

// =============================================================================
// TILE ENTITY MANAGER
// =============================================================================

/**
 * Central registry for all tile entities in a world. Keyed by "x,y,z" string.
 * Handles adding, removing, ticking, and serialization of all tile entities.
 */
export class TileEntityManager {
  private entities: Map<string, TileEntity> = new Map();

  /** Total number of registered tile entities. */
  get count(): number {
    return this.entities.size;
  }

  /**
   * Build a position key from coordinates.
   */
  private static posKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  /**
   * Register a tile entity at a specific position.
   * Replaces any existing entity at that position.
   */
  addTileEntity(x: number, y: number, z: number, entity: TileEntity): void {
    const key = TileEntityManager.posKey(x, y, z);
    entity.x = x;
    entity.y = y;
    entity.z = z;
    this.entities.set(key, entity);
  }

  /**
   * Remove and return the tile entity at a position, or null if none exists.
   */
  removeTileEntity(x: number, y: number, z: number): TileEntity | null {
    const key = TileEntityManager.posKey(x, y, z);
    const entity = this.entities.get(key) ?? null;
    if (entity) {
      this.entities.delete(key);
    }
    return entity;
  }

  /**
   * Get the tile entity at a position without removing it.
   */
  getTileEntity(x: number, y: number, z: number): TileEntity | null {
    return this.entities.get(TileEntityManager.posKey(x, y, z)) ?? null;
  }

  /**
   * Get the tile entity at a position, cast to a specific type.
   */
  getTileEntityAs<T extends TileEntity>(x: number, y: number, z: number): T | null {
    const entity = this.getTileEntity(x, y, z);
    return (entity as T) ?? null;
  }

  /**
   * Check whether a tile entity exists at a position.
   */
  hasTileEntity(x: number, y: number, z: number): boolean {
    return this.entities.has(TileEntityManager.posKey(x, y, z));
  }

  /**
   * Tick all registered tile entities.
   * @param deltaTime - Time since last tick in ticks.
   */
  tickAll(deltaTime: number): void {
    for (const entity of this.entities.values()) {
      entity.tick(deltaTime);
    }
  }

  /**
   * Get all tile entities as an iterable.
   */
  getAll(): IterableIterator<TileEntity> {
    return this.entities.values();
  }

  /**
   * Serialize all tile entities to a persistable array.
   */
  serialize(): Record<string, unknown>[] {
    const result: Record<string, unknown>[] = [];
    for (const entity of this.entities.values()) {
      result.push({
        x: entity.x,
        y: entity.y,
        z: entity.z,
        type: entity.type,
        ...entity.serialize(),
      });
    }
    return result;
  }

  /**
   * Restore tile entities from serialized data.
   * Requires a factory function to create the correct tile entity subclass
   * based on the `type` field.
   */
  deserialize(
    data: Record<string, unknown>[],
    factory: (type: string, x: number, y: number, z: number) => TileEntity | null,
  ): void {
    this.entities.clear();
    for (const entry of data) {
      const x = entry.x as number;
      const y = entry.y as number;
      const z = entry.z as number;
      const type = entry.type as string;
      const entity = factory(type, x, y, z);
      if (entity) {
        entity.deserialize(entry);
        this.addTileEntity(x, y, z, entity);
      }
    }
  }

  /**
   * Remove all tile entities.
   */
  clear(): void {
    this.entities.clear();
  }
}

// =============================================================================
// DEFAULT TILE ENTITY FACTORY
// =============================================================================

/**
 * Default factory that creates tile entity instances based on type string.
 * Used by TileEntityManager.deserialize().
 */
export function createTileEntity(
  type: string,
  x: number,
  y: number,
  z: number,
): TileEntity | null {
  switch (type) {
    case 'furnace':       return new FurnaceTileEntity(x, y, z);
    case 'chest':         return new ChestTileEntity(x, y, z);
    case 'sign':          return new SignTileEntity(x, y, z);
    case 'brewing_stand': return new BrewingStandTileEntity(x, y, z);
    case 'hopper':        return new HopperTileEntity(x, y, z);
    case 'jukebox':       return new JukeboxTileEntity(x, y, z);
    default:              return null;
  }
}

// =============================================================================
// FURNACE TILE ENTITY
// =============================================================================

/**
 * Furnace tile entity. Smelts items using fuel.
 *
 * Slot layout:
 *   - inputSlot: Item being smelted (top)
 *   - fuelSlot: Fuel source (bottom-left)
 *   - outputSlot: Smelted result (right)
 *
 * Timing:
 *   - burnTimeRemaining: ticks of current fuel remaining
 *   - burnTimeTotal: ticks the current fuel originally provided
 *   - cookProgress: ticks spent cooking the current item
 *   - cookTimeTotal: ticks needed to finish (default 200)
 *
 * Tick logic:
 *   1. If burning, decrement burnTimeRemaining.
 *   2. If has input with a valid recipe:
 *      a. If not burning, try to consume fuel from fuelSlot.
 *      b. If burning, increment cookProgress.
 *   3. If cookProgress >= cookTimeTotal: produce output, consume 1 input, award XP.
 *   4. If no valid recipe or no fuel: reset cookProgress.
 */
export class FurnaceTileEntity extends TileEntity {
  /** Item being smelted. */
  inputSlot: InventorySlot | null = null;
  /** Fuel source. */
  fuelSlot: InventorySlot | null = null;
  /** Smelted result. */
  outputSlot: InventorySlot | null = null;

  /** Ticks of fuel remaining for the current burn. */
  burnTimeRemaining: number = 0;
  /** Total ticks the current fuel source provided (for UI progress). */
  burnTimeTotal: number = 0;
  /** Ticks spent cooking the current input item. */
  cookProgress: number = 0;
  /** Total ticks needed to cook one item. */
  cookTimeTotal: number = SMELT_TIME;

  /** Accumulated experience from completed smelts. */
  storedExperience: number = 0;

  constructor(x: number, y: number, z: number) {
    super(x, y, z, 'furnace');
  }

  /**
   * Whether the furnace is currently burning fuel.
   */
  isBurning(): boolean {
    return this.burnTimeRemaining > 0;
  }

  /**
   * Get the cook progress as a float from 0.0 to 1.0.
   */
  getCookProgress(): number {
    if (this.cookTimeTotal <= 0) return 0;
    return Math.min(this.cookProgress / this.cookTimeTotal, 1.0);
  }

  /**
   * Get the fuel burn progress as a float from 0.0 to 1.0.
   * 1.0 means full fuel, 0.0 means empty.
   */
  getBurnProgress(): number {
    if (this.burnTimeTotal <= 0) return 0;
    return Math.min(this.burnTimeRemaining / this.burnTimeTotal, 1.0);
  }

  /**
   * Check whether the current input can produce output (recipe exists and
   * output slot can accept the result).
   */
  private canCook(): boolean {
    if (!this.inputSlot) return false;

    const recipe = getSmeltingRecipe(this.inputSlot.item);
    if (!recipe) return false;

    // Check if output slot can accept the result
    if (!this.outputSlot) return true;
    if (this.outputSlot.item !== recipe.output) return false;

    const maxStack = getMaxStackSize(recipe.output);
    return this.outputSlot.count < maxStack;
  }

  /**
   * Try to consume one unit of fuel from the fuel slot.
   * Returns true if fuel was consumed.
   */
  private tryConsumeFuel(): boolean {
    if (!this.fuelSlot) return false;

    const fuelValue = getFuelValue(this.fuelSlot.item);
    if (fuelValue <= 0) return false;

    // Consume one fuel item
    this.burnTimeRemaining = fuelValue;
    this.burnTimeTotal = fuelValue;

    this.fuelSlot.count -= 1;

    // Special case: lava bucket returns an empty bucket
    const wasLavaBucket = this.fuelSlot.item === 'lava_bucket';

    if (this.fuelSlot.count <= 0) {
      this.fuelSlot = null;
    }

    // Return empty bucket for lava bucket fuel
    if (wasLavaBucket) {
      if (!this.fuelSlot) {
        this.fuelSlot = { item: 'bucket', count: 1 };
      }
      // If fuel slot still has items the bucket is lost (edge case)
    }

    return true;
  }

  /**
   * Produce one smelted output item.
   */
  private produceOutput(): void {
    if (!this.inputSlot) return;

    const recipe = getSmeltingRecipe(this.inputSlot.item);
    if (!recipe) return;

    // Add to output slot
    if (!this.outputSlot) {
      this.outputSlot = { item: recipe.output, count: 1 };
    } else {
      this.outputSlot.count += 1;
    }

    // Consume one input
    this.inputSlot.count -= 1;
    if (this.inputSlot.count <= 0) {
      this.inputSlot = null;
    }

    // Award experience
    this.storedExperience += recipe.experience;
  }

  tick(deltaTime: number): void {
    const wasBurning = this.isBurning();

    // Step 1: Decrement burn time
    if (this.isBurning()) {
      this.burnTimeRemaining = Math.max(0, this.burnTimeRemaining - deltaTime);
    }

    // Step 2: Cooking logic
    if (this.canCook()) {
      // Try to start burning if not already
      if (!this.isBurning()) {
        if (this.tryConsumeFuel()) {
          // Fuel consumed; cooking can proceed
        } else {
          // No fuel available: reset progress
          if (this.cookProgress > 0) {
            this.cookProgress = Math.max(0, this.cookProgress - (deltaTime * 2));
          }
          return;
        }
      }

      // Increment cook progress
      this.cookProgress += deltaTime;

      // Step 3: Check if cooking is complete
      if (this.cookProgress >= this.cookTimeTotal) {
        this.produceOutput();
        this.cookProgress = 0;
      }
    } else {
      // No valid recipe: decay cook progress
      if (this.cookProgress > 0) {
        this.cookProgress = Math.max(0, this.cookProgress - (deltaTime * 2));
      }
    }
  }

  /**
   * Collect all stored experience and reset the counter.
   * Called when the player takes items from the output slot.
   */
  collectExperience(): number {
    const xp = this.storedExperience;
    this.storedExperience = 0;
    return xp;
  }

  serialize(): Record<string, unknown> {
    return {
      inputSlot: this.inputSlot,
      fuelSlot: this.fuelSlot,
      outputSlot: this.outputSlot,
      burnTimeRemaining: this.burnTimeRemaining,
      burnTimeTotal: this.burnTimeTotal,
      cookProgress: this.cookProgress,
      cookTimeTotal: this.cookTimeTotal,
      storedExperience: this.storedExperience,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.inputSlot = (data.inputSlot as InventorySlot | null) ?? null;
    this.fuelSlot = (data.fuelSlot as InventorySlot | null) ?? null;
    this.outputSlot = (data.outputSlot as InventorySlot | null) ?? null;
    this.burnTimeRemaining = (data.burnTimeRemaining as number) ?? 0;
    this.burnTimeTotal = (data.burnTimeTotal as number) ?? 0;
    this.cookProgress = (data.cookProgress as number) ?? 0;
    this.cookTimeTotal = (data.cookTimeTotal as number) ?? SMELT_TIME;
    this.storedExperience = (data.storedExperience as number) ?? 0;
  }
}

// =============================================================================
// CHEST TILE ENTITY
// =============================================================================

/** Number of slots in a single chest. */
const CHEST_SLOTS = 27;
/** Number of slots in a double chest. */
const DOUBLE_CHEST_SLOTS = 54;

/**
 * Chest tile entity. Provides a 27-slot inventory (54 for double chests).
 */
export class ChestTileEntity extends TileEntity {
  /** Inventory slots. */
  private slots: (InventorySlot | null)[];

  /** Whether this is part of a double chest. */
  isDoubleChest: boolean = false;
  /** Reference to the paired chest's position (if double chest). */
  pairedChestPos: { x: number; y: number; z: number } | null = null;

  constructor(x: number, y: number, z: number, isDouble: boolean = false) {
    super(x, y, z, 'chest');
    const size = isDouble ? DOUBLE_CHEST_SLOTS : CHEST_SLOTS;
    this.slots = new Array<InventorySlot | null>(size).fill(null);
    this.isDoubleChest = isDouble;
  }

  /** Total number of slots in this chest. */
  get size(): number {
    return this.slots.length;
  }

  /**
   * Get the item at a specific slot index.
   */
  getSlot(index: number): InventorySlot | null {
    if (index < 0 || index >= this.slots.length) return null;
    return this.slots[index] ? { ...this.slots[index]! } : null;
  }

  /**
   * Set the item at a specific slot index.
   */
  setSlot(index: number, item: InventorySlot | null): void {
    if (index < 0 || index >= this.slots.length) return;
    this.slots[index] = item ? { ...item } : null;
  }

  /**
   * Add items to the chest, stacking with existing items first,
   * then filling empty slots.
   *
   * @returns Number of items that could not fit.
   */
  addItem(itemId: string, count: number): number {
    let remaining = count;
    const maxStack = getMaxStackSize(itemId);

    // Stack with existing
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot && slot.item === itemId && slot.count < maxStack) {
        const space = maxStack - slot.count;
        const toAdd = Math.min(remaining, space);
        slot.count += toAdd;
        remaining -= toAdd;
      }
    }

    // Fill empty slots
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      if (!this.slots[i]) {
        const toAdd = Math.min(remaining, maxStack);
        this.slots[i] = { item: itemId, count: toAdd };
        remaining -= toAdd;
      }
    }

    return remaining;
  }

  /**
   * Remove items from a specific slot.
   *
   * @returns Number of items actually removed.
   */
  removeItem(slotIndex: number, count: number): number {
    if (slotIndex < 0 || slotIndex >= this.slots.length) return 0;
    const slot = this.slots[slotIndex];
    if (!slot) return 0;

    const toRemove = Math.min(count, slot.count);
    slot.count -= toRemove;
    if (slot.count <= 0) {
      this.slots[slotIndex] = null;
    }
    return toRemove;
  }

  /**
   * Pair this chest with another to form a double chest.
   */
  pairWith(otherX: number, otherY: number, otherZ: number): void {
    this.isDoubleChest = true;
    this.pairedChestPos = { x: otherX, y: otherY, z: otherZ };
    // Expand to 54 slots if not already
    if (this.slots.length < DOUBLE_CHEST_SLOTS) {
      const expanded = new Array<InventorySlot | null>(DOUBLE_CHEST_SLOTS).fill(null);
      for (let i = 0; i < this.slots.length; i++) {
        expanded[i] = this.slots[i];
      }
      this.slots = expanded;
    }
  }

  /**
   * Check if the chest is empty.
   */
  isEmpty(): boolean {
    return this.slots.every(s => s === null);
  }

  // Chests don't need per-tick updates
  tick(_deltaTime: number): void {}

  serialize(): Record<string, unknown> {
    return {
      slots: this.slots.map(s => s ? { ...s } : null),
      isDoubleChest: this.isDoubleChest,
      pairedChestPos: this.pairedChestPos,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    const slotsData = data.slots as (InventorySlot | null)[] | undefined;
    if (slotsData && Array.isArray(slotsData)) {
      this.slots = slotsData.map(s => s ? { ...s } : null);
    }
    this.isDoubleChest = (data.isDoubleChest as boolean) ?? false;
    this.pairedChestPos = (data.pairedChestPos as { x: number; y: number; z: number } | null) ?? null;
  }
}

// =============================================================================
// SIGN TILE ENTITY
// =============================================================================

/** Maximum number of text lines on a sign. */
const SIGN_MAX_LINES = 4;
/** Maximum characters per line. */
const SIGN_MAX_LINE_LENGTH = 15;

/**
 * Sign tile entity. Stores 4 lines of text with optional color and glow.
 */
export class SignTileEntity extends TileEntity {
  /** Text lines (up to 4, max 15 chars each). */
  private lines: string[] = ['', '', '', ''];
  /** Text color (CSS/Minecraft color name). */
  textColor: string = 'black';
  /** Whether the text glows (glow ink sac). */
  glowing: boolean = false;

  constructor(x: number, y: number, z: number) {
    super(x, y, z, 'sign');
  }

  /**
   * Set a line of text on the sign.
   *
   * @param index - Line index (0-3).
   * @param text - Text content (truncated to 15 chars).
   */
  setLine(index: number, text: string): void {
    if (index < 0 || index >= SIGN_MAX_LINES) return;
    this.lines[index] = text.slice(0, SIGN_MAX_LINE_LENGTH);
  }

  /**
   * Get a line of text from the sign.
   *
   * @param index - Line index (0-3).
   * @returns The text at that line, or empty string if invalid.
   */
  getLine(index: number): string {
    if (index < 0 || index >= SIGN_MAX_LINES) return '';
    return this.lines[index];
  }

  /**
   * Get all lines as an array.
   */
  getAllLines(): string[] {
    return [...this.lines];
  }

  /**
   * Clear all text from the sign.
   */
  clearText(): void {
    this.lines = ['', '', '', ''];
  }

  // Signs don't need per-tick updates
  tick(_deltaTime: number): void {}

  serialize(): Record<string, unknown> {
    return {
      lines: [...this.lines],
      textColor: this.textColor,
      glowing: this.glowing,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    const linesData = data.lines as string[] | undefined;
    if (linesData && Array.isArray(linesData)) {
      this.lines = linesData.slice(0, SIGN_MAX_LINES).map(
        l => (typeof l === 'string' ? l.slice(0, SIGN_MAX_LINE_LENGTH) : '')
      );
      // Pad to 4 lines if needed
      while (this.lines.length < SIGN_MAX_LINES) {
        this.lines.push('');
      }
    }
    this.textColor = (data.textColor as string) ?? 'black';
    this.glowing = (data.glowing as boolean) ?? false;
  }
}

// =============================================================================
// BREWING STAND TILE ENTITY
// =============================================================================

/** Brew time in ticks for one brewing cycle. */
const BREW_TIME_TOTAL = 400;
/** Maximum blaze powder fuel charges. */
const BREW_MAX_FUEL = 20;

/**
 * Brewing recipe definition.
 */
interface BrewingRecipe {
  ingredient: string;
  input: string;
  output: string;
}

/**
 * Built-in brewing recipes. This is a simplified set; the full Minecraft
 * brewing system involves base potions, modifiers, and splash/lingering variants.
 */
const BREWING_RECIPES: BrewingRecipe[] = [
  // Awkward potions (nether wart + water bottle)
  { ingredient: 'nether_wart', input: 'water_bottle', output: 'awkward_potion' },
  // Speed
  { ingredient: 'sugar', input: 'awkward_potion', output: 'potion_of_swiftness' },
  // Strength
  { ingredient: 'blaze_powder', input: 'awkward_potion', output: 'potion_of_strength' },
  // Healing
  { ingredient: 'glistering_melon_slice', input: 'awkward_potion', output: 'potion_of_healing' },
  // Regeneration
  { ingredient: 'ghast_tear', input: 'awkward_potion', output: 'potion_of_regeneration' },
  // Fire resistance
  { ingredient: 'magma_cream', input: 'awkward_potion', output: 'potion_of_fire_resistance' },
  // Night vision
  { ingredient: 'golden_carrot', input: 'awkward_potion', output: 'potion_of_night_vision' },
  // Water breathing
  { ingredient: 'pufferfish', input: 'awkward_potion', output: 'potion_of_water_breathing' },
  // Invisibility
  { ingredient: 'fermented_spider_eye', input: 'potion_of_night_vision', output: 'potion_of_invisibility' },
  // Poison
  { ingredient: 'spider_eye', input: 'awkward_potion', output: 'potion_of_poison' },
  // Weakness
  { ingredient: 'fermented_spider_eye', input: 'water_bottle', output: 'potion_of_weakness' },
  // Slow falling
  { ingredient: 'phantom_membrane', input: 'awkward_potion', output: 'potion_of_slow_falling' },
  // Leaping
  { ingredient: 'rabbit_foot', input: 'awkward_potion', output: 'potion_of_leaping' },
  // Turtle master
  { ingredient: 'turtle_shell', input: 'awkward_potion', output: 'potion_of_the_turtle_master' },
];

/**
 * Brewing stand tile entity. Brews potions from ingredients and bottle slots.
 *
 * Slot layout:
 *   - bottleSlots[0..2]: Three bottle slots
 *   - ingredientSlot: Ingredient to brew with
 *   - fuelSlot: Blaze powder fuel
 *
 * Timing:
 *   - brewTime: 0-400 ticks (0 = not brewing, 400 = complete)
 *   - fuelAmount: 0-20 charges of blaze powder
 */
export class BrewingStandTileEntity extends TileEntity {
  /** Three bottle slots. */
  bottleSlots: (InventorySlot | null)[] = [null, null, null];
  /** Ingredient slot (top). */
  ingredientSlot: InventorySlot | null = null;
  /** Fuel slot (blaze powder). */
  fuelSlot: InventorySlot | null = null;

  /** Current brew progress in ticks (0 = idle, counts up to BREW_TIME_TOTAL). */
  brewTime: number = 0;
  /** Remaining fuel charges (each blaze powder gives 20 charges). */
  fuelAmount: number = 0;

  constructor(x: number, y: number, z: number) {
    super(x, y, z, 'brewing_stand');
  }

  /**
   * Check if a valid brewing operation can occur with the current slots.
   */
  private canBrew(): boolean {
    if (!this.ingredientSlot) return false;

    // At least one bottle must have a valid recipe
    for (let i = 0; i < 3; i++) {
      const bottle = this.bottleSlots[i];
      if (!bottle) continue;

      const recipe = BREWING_RECIPES.find(
        r => r.ingredient === this.ingredientSlot!.item && r.input === bottle.item
      );
      if (recipe) return true;
    }

    return false;
  }

  /**
   * Try to consume blaze powder to add fuel.
   */
  private tryRefuel(): boolean {
    if (!this.fuelSlot || this.fuelSlot.item !== 'blaze_powder') return false;

    this.fuelSlot.count -= 1;
    if (this.fuelSlot.count <= 0) {
      this.fuelSlot = null;
    }

    this.fuelAmount += BREW_MAX_FUEL;
    return true;
  }

  /**
   * Apply brewing results to all bottle slots.
   */
  private applyBrewingResults(): void {
    if (!this.ingredientSlot) return;

    for (let i = 0; i < 3; i++) {
      const bottle = this.bottleSlots[i];
      if (!bottle) continue;

      const recipe = BREWING_RECIPES.find(
        r => r.ingredient === this.ingredientSlot!.item && r.input === bottle.item
      );
      if (recipe) {
        this.bottleSlots[i] = { item: recipe.output, count: 1 };
      }
    }

    // Consume one ingredient
    this.ingredientSlot.count -= 1;
    if (this.ingredientSlot.count <= 0) {
      this.ingredientSlot = null;
    }
  }

  /** Whether the brewing stand is actively brewing. */
  isBrewing(): boolean {
    return this.brewTime > 0;
  }

  /** Get brew progress as a float from 0.0 to 1.0. */
  getBrewProgress(): number {
    return this.brewTime / BREW_TIME_TOTAL;
  }

  tick(deltaTime: number): void {
    // Try to refuel if out of fuel
    if (this.fuelAmount <= 0 && this.fuelSlot?.item === 'blaze_powder') {
      this.tryRefuel();
    }

    if (this.canBrew()) {
      // Need fuel to brew
      if (this.fuelAmount <= 0) {
        if (!this.tryRefuel()) {
          this.brewTime = 0;
          return;
        }
      }

      // Start or continue brewing
      if (this.brewTime === 0) {
        // Starting a new brew cycle - consume one fuel charge
        this.fuelAmount -= 1;
      }

      this.brewTime += deltaTime;

      if (this.brewTime >= BREW_TIME_TOTAL) {
        this.applyBrewingResults();
        this.brewTime = 0;
      }
    } else {
      // Cannot brew - reset progress
      this.brewTime = 0;
    }
  }

  serialize(): Record<string, unknown> {
    return {
      bottleSlots: this.bottleSlots.map(s => s ? { ...s } : null),
      ingredientSlot: this.ingredientSlot,
      fuelSlot: this.fuelSlot,
      brewTime: this.brewTime,
      fuelAmount: this.fuelAmount,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    const bottles = data.bottleSlots as (InventorySlot | null)[] | undefined;
    if (bottles && Array.isArray(bottles)) {
      this.bottleSlots = bottles.slice(0, 3).map(s => s ? { ...s } : null);
      while (this.bottleSlots.length < 3) this.bottleSlots.push(null);
    }
    this.ingredientSlot = (data.ingredientSlot as InventorySlot | null) ?? null;
    this.fuelSlot = (data.fuelSlot as InventorySlot | null) ?? null;
    this.brewTime = (data.brewTime as number) ?? 0;
    this.fuelAmount = (data.fuelAmount as number) ?? 0;
  }
}

// =============================================================================
// HOPPER TILE ENTITY
// =============================================================================

/** Number of inventory slots in a hopper. */
const HOPPER_SLOTS = 5;
/** Ticks between item transfers. */
const HOPPER_TRANSFER_COOLDOWN = 8;

/**
 * Direction a hopper points (where it pushes items to).
 */
export type HopperFacing = 'down' | 'north' | 'south' | 'east' | 'west';

/**
 * Hopper tile entity. Transfers items between containers.
 *
 * Behavior:
 *   - Pulls items from the container above it
 *   - Pushes items to the container it faces (default: down)
 *   - Has a transfer cooldown of 8 ticks between transfers
 *   - Can be locked by a redstone signal (isLocked)
 */
export class HopperTileEntity extends TileEntity {
  /** Five inventory slots. */
  private slots: (InventorySlot | null)[] = [null, null, null, null, null];
  /** Direction the hopper output faces. */
  facing: HopperFacing = 'down';
  /** Whether the hopper is locked by redstone. */
  isLocked: boolean = false;
  /** Cooldown ticks remaining before next transfer. */
  private transferCooldown: number = 0;

  /**
   * Callback for pulling items from above. Set externally by the game engine.
   * Should return the item pulled, or null if nothing available.
   */
  onPullFromAbove: (() => InventorySlot | null) | null = null;

  /**
   * Callback for pushing items to the facing direction. Set externally.
   * Returns the number of items that could not be pushed (remainder).
   */
  onPushToFacing: ((item: InventorySlot) => number) | null = null;

  constructor(x: number, y: number, z: number) {
    super(x, y, z, 'hopper');
  }

  /** Total number of slots. */
  get size(): number {
    return HOPPER_SLOTS;
  }

  /**
   * Get a slot's contents.
   */
  getSlot(index: number): InventorySlot | null {
    if (index < 0 || index >= HOPPER_SLOTS) return null;
    return this.slots[index] ? { ...this.slots[index]! } : null;
  }

  /**
   * Set a slot's contents.
   */
  setSlot(index: number, item: InventorySlot | null): void {
    if (index < 0 || index >= HOPPER_SLOTS) return;
    this.slots[index] = item ? { ...item } : null;
  }

  /**
   * Add an item to the hopper inventory.
   *
   * @returns Number of items that could not fit.
   */
  addItem(itemId: string, count: number): number {
    let remaining = count;
    const maxStack = getMaxStackSize(itemId);

    // Stack with existing
    for (let i = 0; i < HOPPER_SLOTS && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot && slot.item === itemId && slot.count < maxStack) {
        const space = maxStack - slot.count;
        const toAdd = Math.min(remaining, space);
        slot.count += toAdd;
        remaining -= toAdd;
      }
    }

    // Fill empty
    for (let i = 0; i < HOPPER_SLOTS && remaining > 0; i++) {
      if (!this.slots[i]) {
        const toAdd = Math.min(remaining, maxStack);
        this.slots[i] = { item: itemId, count: toAdd };
        remaining -= toAdd;
      }
    }

    return remaining;
  }

  /**
   * Check if the hopper has any items.
   */
  hasItems(): boolean {
    return this.slots.some(s => s !== null);
  }

  /**
   * Check if the hopper is empty.
   */
  isEmpty(): boolean {
    return this.slots.every(s => s === null);
  }

  /**
   * Try to pull one item from above into the hopper.
   */
  private tryPull(): boolean {
    if (!this.onPullFromAbove) return false;

    const pulled = this.onPullFromAbove();
    if (!pulled) return false;

    const remaining = this.addItem(pulled.item, 1);
    return remaining === 0;
  }

  /**
   * Try to push one item from the hopper to the container below/facing.
   */
  private tryPush(): boolean {
    if (!this.onPushToFacing) return false;

    // Find the first non-empty slot
    for (let i = 0; i < HOPPER_SLOTS; i++) {
      const slot = this.slots[i];
      if (!slot) continue;

      const pushItem: InventorySlot = { item: slot.item, count: 1 };
      const remaining = this.onPushToFacing(pushItem);

      if (remaining === 0) {
        // Successfully pushed one item
        slot.count -= 1;
        if (slot.count <= 0) {
          this.slots[i] = null;
        }
        return true;
      }
    }

    return false;
  }

  tick(deltaTime: number): void {
    if (this.isLocked) return;

    // Decrement cooldown
    if (this.transferCooldown > 0) {
      this.transferCooldown -= deltaTime;
      return;
    }

    let transferred = false;

    // Try to pull from above
    transferred = this.tryPull() || transferred;

    // Try to push to facing direction
    transferred = this.tryPush() || transferred;

    // Reset cooldown if a transfer occurred
    if (transferred) {
      this.transferCooldown = HOPPER_TRANSFER_COOLDOWN;
    }
  }

  serialize(): Record<string, unknown> {
    return {
      slots: this.slots.map(s => s ? { ...s } : null),
      facing: this.facing,
      isLocked: this.isLocked,
      transferCooldown: this.transferCooldown,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    const slotsData = data.slots as (InventorySlot | null)[] | undefined;
    if (slotsData && Array.isArray(slotsData)) {
      this.slots = slotsData.slice(0, HOPPER_SLOTS).map(s => s ? { ...s } : null);
      while (this.slots.length < HOPPER_SLOTS) this.slots.push(null);
    }
    this.facing = (data.facing as HopperFacing) ?? 'down';
    this.isLocked = (data.isLocked as boolean) ?? false;
    this.transferCooldown = (data.transferCooldown as number) ?? 0;
  }
}

// =============================================================================
// JUKEBOX TILE ENTITY
// =============================================================================

/**
 * Jukebox tile entity. Holds a single music disc and tracks play state.
 */
export class JukeboxTileEntity extends TileEntity {
  /** The music disc item currently in the jukebox, or null if empty. */
  discItem: string | null = null;
  /** Whether the disc is currently playing. */
  isPlaying: boolean = false;

  constructor(x: number, y: number, z: number) {
    super(x, y, z, 'jukebox');
  }

  /**
   * Insert a music disc into the jukebox.
   * Returns the previously inserted disc (or null).
   */
  insertDisc(discItemId: string): string | null {
    const previousDisc = this.discItem;
    this.discItem = discItemId;
    this.isPlaying = true;
    return previousDisc;
  }

  /**
   * Eject the current disc from the jukebox.
   * Returns the ejected disc item ID, or null if empty.
   */
  ejectDisc(): string | null {
    const disc = this.discItem;
    this.discItem = null;
    this.isPlaying = false;
    return disc;
  }

  /**
   * Check if a disc is inserted.
   */
  hasDisc(): boolean {
    return this.discItem !== null;
  }

  /**
   * Stop playback without ejecting the disc.
   */
  stop(): void {
    this.isPlaying = false;
  }

  // Jukeboxes don't need per-tick updates (audio is handled elsewhere)
  tick(_deltaTime: number): void {}

  serialize(): Record<string, unknown> {
    return {
      discItem: this.discItem,
      isPlaying: this.isPlaying,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.discItem = (data.discItem as string | null) ?? null;
    this.isPlaying = (data.isPlaying as boolean) ?? false;
  }
}
