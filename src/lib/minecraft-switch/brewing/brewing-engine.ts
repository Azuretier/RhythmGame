// =============================================================================
// Brewing Engine — Brewing Stand Tick Simulation
// =============================================================================
// Implements the brewing stand mechanic: 3 bottle slots, 1 ingredient slot,
// 1 blaze powder fuel slot. Each blaze powder provides 20 brew charges.
// Brewing takes 400 ticks (20 seconds). The engine ticks each game tick,
// checking for valid recipes and progressing the brew timer.
// =============================================================================

import { findBrewingResult } from './potions';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Number of ticks to complete a single brew operation (20 seconds at 20 TPS). */
export const BREW_TIME_TICKS = 400;

/** Number of brew charges per blaze powder fuel item. */
export const FUEL_PER_BLAZE_POWDER = 20;

/** Number of bottle slots in the brewing stand. */
export const BOTTLE_SLOT_COUNT = 3;

// =============================================================================
// TYPES
// =============================================================================

/** Represents the contents of a single bottle slot. */
export interface BottleSlot {
  /** Potion ID (e.g. "water", "awkward", "healing"). Null if empty. */
  potionId: string | null;
  /** The count of items (always 1 for potions, 0 if empty). */
  count: number;
}

/** Complete state of a brewing stand. */
export interface BrewingStandState {
  /** The three bottom bottle slots. */
  bottles: [BottleSlot, BottleSlot, BottleSlot];
  /** Item ID of the ingredient in the top slot. Null if empty. */
  ingredient: string | null;
  /** Remaining fuel charges (0-20). */
  fuel: number;
  /** Current brew progress in ticks (0 = not brewing, 1-400 = in progress). */
  brewProgress: number;
  /** Whether the stand is currently brewing. */
  isBrewing: boolean;
}

/** Result of a completed brew operation for a single bottle slot. */
export interface BrewResult {
  /** Index of the bottle slot (0, 1, or 2). */
  slotIndex: number;
  /** The new potion ID in the slot. */
  newPotionId: string;
}

// =============================================================================
// BREWING ENGINE CLASS
// =============================================================================

/**
 * Simulates a Minecraft brewing stand. Call `tick()` every game tick to
 * advance the brewing process. The engine handles fuel consumption,
 * recipe validation, and brew completion.
 */
export class BrewingEngine {
  /** The current state of the brewing stand. */
  private state: BrewingStandState;

  constructor() {
    this.state = {
      bottles: [
        { potionId: null, count: 0 },
        { potionId: null, count: 0 },
        { potionId: null, count: 0 },
      ],
      ingredient: null,
      fuel: 0,
      brewProgress: 0,
      isBrewing: false,
    };
  }

  // ---------------------------------------------------------------------------
  // State Access
  // ---------------------------------------------------------------------------

  /** Get the current brewing stand state. */
  getState(): Readonly<BrewingStandState> {
    return this.state;
  }

  /** Get the current brew progress as a fraction (0-1). */
  getBrewProgressFraction(): number {
    if (!this.state.isBrewing) return 0;
    return this.state.brewProgress / BREW_TIME_TICKS;
  }

  /** Get the remaining fuel charges. */
  getFuel(): number {
    return this.state.fuel;
  }

  // ---------------------------------------------------------------------------
  // Slot Management
  // ---------------------------------------------------------------------------

  /**
   * Set the contents of a bottle slot.
   * @param index - Slot index (0, 1, or 2)
   * @param potionId - Potion ID to place, or null to clear
   */
  setBottle(index: number, potionId: string | null): void {
    if (index < 0 || index >= BOTTLE_SLOT_COUNT) return;
    this.state.bottles[index] = {
      potionId,
      count: potionId ? 1 : 0,
    };
    // Reset brewing if slots changed while brewing
    if (this.state.isBrewing) {
      this.checkBrewValidity();
    }
  }

  /**
   * Set the ingredient in the top slot.
   * @param ingredientId - Item ID of the ingredient, or null to clear
   */
  setIngredient(ingredientId: string | null): void {
    this.state.ingredient = ingredientId;
    if (this.state.isBrewing) {
      this.checkBrewValidity();
    }
  }

  /**
   * Add blaze powder fuel to the brewing stand.
   * Each blaze powder adds 20 brew charges.
   * @returns true if fuel was added, false if already full or invalid
   */
  addFuel(): boolean {
    if (this.state.fuel > 0) return false; // Still has fuel
    this.state.fuel = FUEL_PER_BLAZE_POWDER;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Brewing Logic
  // ---------------------------------------------------------------------------

  /**
   * Check whether the brewing stand can start or continue brewing.
   * A brew is valid if:
   * - There is an ingredient in the top slot
   * - There is at least one bottle with a valid recipe for that ingredient
   * - There is fuel available
   */
  canBrew(): boolean {
    if (!this.state.ingredient) return false;
    if (this.state.fuel <= 0) return false;

    // Check if at least one bottle has a valid recipe
    return this.state.bottles.some((bottle) => {
      if (!bottle.potionId) return false;
      return this.getBrewResult(this.state.ingredient!, bottle.potionId) !== null;
    });
  }

  /**
   * Get the brewing result for a given ingredient and potion.
   * @param ingredient - The ingredient item ID
   * @param potionId - The input potion ID
   * @returns The resulting potion ID, or null if no valid recipe
   */
  getBrewResult(ingredient: string, potionId: string): string | null {
    return findBrewingResult(ingredient, potionId);
  }

  /**
   * Process one game tick of the brewing stand. Call this every tick
   * (20 times per second) to advance the brewing process.
   *
   * @returns Array of BrewResults if brewing completed this tick, empty array otherwise
   */
  tick(): BrewResult[] {
    // If not currently brewing, try to start
    if (!this.state.isBrewing) {
      if (this.canBrew()) {
        this.state.isBrewing = true;
        this.state.brewProgress = 0;
      }
      return [];
    }

    // Validate that brewing can continue
    if (!this.canBrew()) {
      this.state.isBrewing = false;
      this.state.brewProgress = 0;
      return [];
    }

    // Advance brew progress
    this.state.brewProgress++;

    // Check if brewing is complete
    if (this.state.brewProgress >= BREW_TIME_TICKS) {
      return this.completeBrew();
    }

    return [];
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Complete the brewing process: apply results to all valid bottle slots,
   * consume the ingredient, and deduct fuel.
   */
  private completeBrew(): BrewResult[] {
    const results: BrewResult[] = [];
    const ingredient = this.state.ingredient;

    if (!ingredient) return results;

    // Apply result to each bottle with a valid recipe
    for (let i = 0; i < BOTTLE_SLOT_COUNT; i++) {
      const bottle = this.state.bottles[i];
      if (!bottle.potionId) continue;

      const resultPotionId = this.getBrewResult(ingredient, bottle.potionId);
      if (resultPotionId) {
        this.state.bottles[i] = {
          potionId: resultPotionId,
          count: 1,
        };
        results.push({
          slotIndex: i,
          newPotionId: resultPotionId,
        });
      }
    }

    // Consume ingredient and fuel
    if (results.length > 0) {
      this.state.ingredient = null;
      this.state.fuel--;
    }

    // Reset brewing state
    this.state.isBrewing = false;
    this.state.brewProgress = 0;

    return results;
  }

  /**
   * Re-validate that the current brew operation is still valid.
   * Called when bottles or ingredient change during brewing.
   */
  private checkBrewValidity(): void {
    if (!this.canBrew()) {
      this.state.isBrewing = false;
      this.state.brewProgress = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialize the brewing stand state for network sync or save.
   */
  serialize(): BrewingStandState {
    return structuredClone(this.state);
  }

  /**
   * Restore the brewing stand from a serialized state.
   */
  deserialize(state: BrewingStandState): void {
    this.state = structuredClone(state);
  }
}
