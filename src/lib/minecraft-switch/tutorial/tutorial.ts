// =============================================================================
// Minecraft: Nintendo Switch Edition — Tutorial System
// =============================================================================
// Scripted step-by-step tutorial that guides new players through the basics of
// Minecraft. Covers camera control, movement, block breaking, crafting, mining,
// building, smelting, and combat. Each step has a trigger condition that
// automatically advances the player when the objective is met, plus a hint
// that appears after a configurable delay.
// =============================================================================

import type {
  BlockCoord,
  InventorySlot,
  PlayerInventory,
  PlayerPosition,
  PlayerState,
} from '@/types/minecraft-switch';
import { Block } from '@/types/minecraft-switch';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Context passed to trigger condition functions so each step can inspect
 * the full game state to decide whether the player has completed it.
 */
export interface TutorialContext {
  /** Current player state (position, health, etc.). */
  playerState: PlayerState;
  /** Player's full inventory. */
  inventory: PlayerInventory;
  /** Position the player started the tutorial at. */
  startPosition: PlayerPosition;
  /** Cumulative yaw delta since step began (degrees). */
  cameraYawDelta: number;
  /** Cumulative pitch delta since step began (degrees). */
  cameraPitchDelta: number;
  /** Total jumps the player has performed since step began. */
  jumpCount: number;
  /** Whether the inventory screen is currently open. */
  inventoryOpen: boolean;
  /** Number of blocks the player has placed since step began. */
  blocksPlaced: number;
  /** Total blocks placed across the entire tutorial. */
  totalBlocksPlaced: number;
  /** Number of mobs killed since step began. */
  mobsKilled: number;
  /** Total mobs killed across the entire tutorial. */
  totalMobsKilled: number;
  /** Set of block IDs that have been placed in the world by the player. */
  placedBlockIds: Set<number>;
  /** Whether a crafting table block exists in the world placed by player. */
  craftingTablePlaced: boolean;
  /** Whether a furnace block exists in the world placed by player. */
  furnacePlaced: boolean;
  /** Current game tick. */
  tick: number;
}

/**
 * A single tutorial step with display information and completion logic.
 */
export interface TutorialStep {
  /** Unique identifier for the step. */
  id: string;
  /** Short title displayed at the top of the instruction panel. */
  title: string;
  /** Full instruction text explaining what the player needs to do. */
  instruction: string;
  /** One-line objective description for compact display. */
  objective: string;
  /** Returns true when the player has completed this step. */
  triggerCondition: (ctx: TutorialContext) => boolean;
  /** Hint text revealed after the player lingers on the step. */
  hint: string;
  /** World-space block positions to highlight with a pulsing glow. */
  highlightBlocks?: BlockCoord[];
  /** Items the player needs to have for this step. */
  requiredItems?: { item: string; count: number }[];
  /** Whether to automatically advance to the next step on completion. */
  autoAdvance: boolean;
}

/**
 * Serializable snapshot of tutorial progress.
 */
export interface TutorialState {
  /** Index into the steps array for the currently active step. */
  currentStep: number;
  /** All tutorial steps (by reference — the array never mutates). */
  steps: TutorialStep[];
  /** Whether the entire tutorial has been completed. */
  completed: boolean;
  /** Timestamp (ms) when the tutorial was started. */
  startTime: number;
  /** Timestamp (ms) when the current step began. */
  stepStartTime: number;
  /** Whether the hint for the current step is visible. */
  hintShown: boolean;
  /** Overall progress from 0 (no steps done) to 1 (all steps done). */
  progress: number;
  /** Accumulated camera yaw delta for the current step. */
  cameraYawDelta: number;
  /** Accumulated camera pitch delta for the current step. */
  cameraPitchDelta: number;
  /** Jump counter for the current step. */
  jumpCount: number;
  /** Block placement counter for the current step. */
  blocksPlaced: number;
  /** Total blocks placed across the entire tutorial. */
  totalBlocksPlaced: number;
  /** Mob kill counter for the current step. */
  mobsKilled: number;
  /** Total mob kills across the entire tutorial. */
  totalMobsKilled: number;
  /** Whether the inventory was opened during the current step. */
  inventoryOpened: boolean;
  /** Whether the player placed a crafting table. */
  craftingTablePlaced: boolean;
  /** Whether the player placed a furnace. */
  furnacePlaced: boolean;
  /** Set of block IDs placed by the player. */
  placedBlockIds: Set<number>;
  /** Starting position when the tutorial began. */
  startPosition: PlayerPosition;
  /** Whether the tutorial has been dismissed by the player. */
  dismissed: boolean;
}

// =============================================================================
// INVENTORY HELPERS
// =============================================================================

/**
 * Count the total quantity of a named item across all inventory sections.
 */
function countItem(inventory: PlayerInventory, itemId: string): number {
  let total = 0;

  for (const slot of inventory.main) {
    if (slot && slot.item === itemId) total += slot.count;
  }
  for (const slot of inventory.hotbar) {
    if (slot && slot.item === itemId) total += slot.count;
  }
  for (const slot of inventory.armor) {
    if (slot && slot.item === itemId) total += slot.count;
  }
  if (inventory.offhand && inventory.offhand.item === itemId) {
    total += inventory.offhand.count;
  }

  return total;
}

/**
 * Check whether the player has at least `count` of the given item.
 */
function hasItem(inventory: PlayerInventory, itemId: string, count: number = 1): boolean {
  return countItem(inventory, itemId) >= count;
}

/**
 * Check whether the player has any item whose ID contains the substring.
 */
function hasItemContaining(inventory: PlayerInventory, substring: string): boolean {
  const check = (slot: InventorySlot | null) => slot !== null && slot.item.includes(substring);

  for (const slot of inventory.main) {
    if (check(slot)) return true;
  }
  for (const slot of inventory.hotbar) {
    if (check(slot)) return true;
  }
  for (const slot of inventory.armor) {
    if (check(slot)) return true;
  }
  if (check(inventory.offhand)) return true;

  return false;
}

/**
 * Calculate distance between two 3D points.
 */
function distance3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate horizontal (XZ) distance between two positions.
 */
function distanceXZ(a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// =============================================================================
// DEFAULT TUTORIAL STEPS (17 steps)
// =============================================================================

export const DEFAULT_TUTORIAL_STEPS: TutorialStep[] = [
  // -------------------------------------------------------------------------
  // Step 1: Look Around
  // -------------------------------------------------------------------------
  {
    id: 'look_around',
    title: 'Look Around',
    instruction: 'Move your mouse or drag on the screen to rotate the camera. Look around and explore your surroundings!',
    objective: 'Rotate camera at least 90 degrees',
    triggerCondition: (ctx) => {
      return Math.abs(ctx.cameraYawDelta) >= 90;
    },
    hint: 'Move the mouse left, right, up, or down to rotate the camera. On touch devices, drag anywhere on the screen.',
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 2: Move
  // -------------------------------------------------------------------------
  {
    id: 'move',
    title: 'Move',
    instruction: 'Use W, A, S, D keys to walk around. Try to walk at least 5 blocks from where you started.',
    objective: 'Walk 5 blocks from your starting position',
    triggerCondition: (ctx) => {
      return distanceXZ(ctx.playerState.position, ctx.startPosition) >= 5;
    },
    hint: 'W moves forward, S moves backward, A strafes left, D strafes right. On mobile, use the virtual joystick.',
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 3: Jump
  // -------------------------------------------------------------------------
  {
    id: 'jump',
    title: 'Jump',
    instruction: 'Press the Space bar to jump. Jump 3 times to complete this step.',
    objective: 'Jump 3 times',
    triggerCondition: (ctx) => {
      return ctx.jumpCount >= 3;
    },
    hint: 'Press Space bar while standing on the ground to jump. You can also jump while moving to reach higher areas.',
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 4: Break a Block (punch a tree)
  // -------------------------------------------------------------------------
  {
    id: 'break_block',
    title: 'Break a Block',
    instruction: 'Walk up to a tree and hold the left mouse button (or tap and hold on mobile) to break the wood block. Collect the log!',
    objective: 'Get 1 Oak Log',
    triggerCondition: (ctx) => {
      // Accept any type of log
      return hasItem(ctx.inventory, 'oak_log', 1)
        || hasItem(ctx.inventory, 'spruce_log', 1)
        || hasItem(ctx.inventory, 'birch_log', 1)
        || hasItem(ctx.inventory, 'jungle_log', 1)
        || hasItem(ctx.inventory, 'acacia_log', 1)
        || hasItem(ctx.inventory, 'dark_oak_log', 1);
    },
    hint: 'Look at a tree trunk and hold left-click. The block will show cracks as you mine it. Logs drop as items you can pick up by walking over them.',
    requiredItems: [{ item: 'oak_log', count: 1 }],
    highlightBlocks: [
      { x: 8, y: 68, z: 8 },
      { x: 8, y: 69, z: 8 },
      { x: 8, y: 70, z: 8 },
    ],
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 5: Open Inventory
  // -------------------------------------------------------------------------
  {
    id: 'open_inventory',
    title: 'Open Inventory',
    instruction: 'Press E to open your inventory. This is where you can see your items and use the 2x2 crafting grid.',
    objective: 'Open inventory screen',
    triggerCondition: (ctx) => {
      return ctx.inventoryOpen;
    },
    hint: 'Press the E key on your keyboard, or tap the inventory button on mobile. The 2x2 grid in the top-right is your personal crafting area.',
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 6: Craft Planks
  // -------------------------------------------------------------------------
  {
    id: 'craft_planks',
    title: 'Craft Planks',
    instruction: 'Place a log in the 2x2 crafting grid in your inventory to craft wooden planks. You\'ll need 4 planks for the next steps.',
    objective: 'Craft 4 Oak Planks',
    triggerCondition: (ctx) => {
      // Accept any type of planks
      const oakPlanks = countItem(ctx.inventory, 'oak_planks');
      const sprucePlanks = countItem(ctx.inventory, 'spruce_planks');
      const birchPlanks = countItem(ctx.inventory, 'birch_planks');
      const junglePlanks = countItem(ctx.inventory, 'jungle_planks');
      const acaciaPlanks = countItem(ctx.inventory, 'acacia_planks');
      const darkOakPlanks = countItem(ctx.inventory, 'dark_oak_planks');
      return (oakPlanks + sprucePlanks + birchPlanks + junglePlanks + acaciaPlanks + darkOakPlanks) >= 4;
    },
    hint: 'Place 1 log in any slot of the 2x2 crafting grid. Each log produces 4 planks. Click the result to craft them.',
    requiredItems: [{ item: 'oak_planks', count: 4 }],
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 7: Craft Sticks
  // -------------------------------------------------------------------------
  {
    id: 'craft_sticks',
    title: 'Craft Sticks',
    instruction: 'Place 2 planks vertically in the crafting grid (one on top of the other) to craft sticks. You\'ll need sticks for tools.',
    objective: 'Craft Sticks',
    triggerCondition: (ctx) => {
      return hasItem(ctx.inventory, 'stick', 1);
    },
    hint: 'In the 2x2 crafting grid, place one plank in the top slot and one plank in the bottom slot of the same column. This creates 4 sticks.',
    requiredItems: [{ item: 'stick', count: 1 }],
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 8: Craft Crafting Table
  // -------------------------------------------------------------------------
  {
    id: 'craft_workbench',
    title: 'Craft a Crafting Table',
    instruction: 'Fill all 4 slots of the 2x2 crafting grid with planks to create a Crafting Table. This unlocks the full 3x3 crafting grid!',
    objective: 'Craft a Crafting Table',
    triggerCondition: (ctx) => {
      return hasItem(ctx.inventory, 'crafting_table', 1);
    },
    hint: 'Place 4 planks — one in each slot of the 2x2 crafting grid. The crafting table icon will appear as the result.',
    requiredItems: [{ item: 'crafting_table', count: 1 }],
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 9: Place Crafting Table
  // -------------------------------------------------------------------------
  {
    id: 'place_workbench',
    title: 'Place the Crafting Table',
    instruction: 'Select the Crafting Table in your hotbar and right-click (or tap) on the ground to place it.',
    objective: 'Place Crafting Table in the world',
    triggerCondition: (ctx) => {
      return ctx.craftingTablePlaced;
    },
    hint: 'Select the crafting table from your hotbar (scroll or press a number key), then right-click on a flat surface to place it.',
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 10: Craft Wooden Pickaxe
  // -------------------------------------------------------------------------
  {
    id: 'craft_wooden_pickaxe',
    title: 'Craft a Wooden Pickaxe',
    instruction: 'Right-click the Crafting Table to open the 3x3 grid. Place 3 planks across the top row and 2 sticks down the center to make a Wooden Pickaxe.',
    objective: 'Craft a Wooden Pickaxe',
    triggerCondition: (ctx) => {
      return hasItem(ctx.inventory, 'wooden_pickaxe', 1);
    },
    hint: 'In the 3x3 grid: top row = 3 planks, middle-center = 1 stick, bottom-center = 1 stick. This creates a wooden pickaxe.',
    requiredItems: [{ item: 'wooden_pickaxe', count: 1 }],
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 11: Mine Stone
  // -------------------------------------------------------------------------
  {
    id: 'mine_stone',
    title: 'Mine Stone',
    instruction: 'Use your wooden pickaxe to mine stone blocks. You need at least 3 cobblestone. Look for gray stone blocks underground or on the surface.',
    objective: 'Get 3 Cobblestone',
    triggerCondition: (ctx) => {
      return hasItem(ctx.inventory, 'cobblestone', 3);
    },
    hint: 'Equip the wooden pickaxe in your hotbar. Mine the gray stone blocks (not dirt!) to get cobblestone. Dig down or find a cliff face.',
    requiredItems: [{ item: 'cobblestone', count: 3 }],
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 12: Craft Stone Tools
  // -------------------------------------------------------------------------
  {
    id: 'craft_stone_pickaxe',
    title: 'Craft Stone Tools',
    instruction: 'At the Crafting Table, make a Stone Pickaxe by placing 3 cobblestone across the top and 2 sticks down the center. Stone tools are faster and more durable!',
    objective: 'Craft a Stone Pickaxe',
    triggerCondition: (ctx) => {
      return hasItem(ctx.inventory, 'stone_pickaxe', 1);
    },
    hint: 'Same pattern as the wooden pickaxe, but use cobblestone instead of planks in the top row. You may need more sticks too!',
    requiredItems: [{ item: 'stone_pickaxe', count: 1 }],
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 13: Build a Shelter
  // -------------------------------------------------------------------------
  {
    id: 'build_shelter',
    title: 'Build a Shelter',
    instruction: 'Place at least 20 blocks to build a shelter. A shelter protects you from monsters at night. Make walls and a roof!',
    objective: 'Place 20 blocks',
    triggerCondition: (ctx) => {
      return ctx.totalBlocksPlaced >= 20;
    },
    hint: 'Select a block from your hotbar and right-click to place it. Stack blocks to build walls, then add a ceiling. Make sure there are no gaps for monsters!',
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 14: Craft a Furnace
  // -------------------------------------------------------------------------
  {
    id: 'craft_furnace',
    title: 'Craft a Furnace',
    instruction: 'At the Crafting Table, surround the edges of the 3x3 grid with 8 cobblestone (leave the center empty) to craft a Furnace.',
    objective: 'Craft a Furnace',
    triggerCondition: (ctx) => {
      return hasItem(ctx.inventory, 'furnace', 1)
        || ctx.furnacePlaced;
    },
    hint: 'Fill every slot of the 3x3 grid EXCEPT the center with cobblestone. You need 8 total cobblestone for this recipe.',
    requiredItems: [{ item: 'furnace', count: 1 }],
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 15: Smelt Iron
  // -------------------------------------------------------------------------
  {
    id: 'smelt_iron',
    title: 'Smelt Iron',
    instruction: 'Place the Furnace in the world and use it to smelt Iron Ore into an Iron Ingot. Put iron ore on top and fuel (wood/coal) on the bottom.',
    objective: 'Get 1 Iron Ingot',
    triggerCondition: (ctx) => {
      return hasItem(ctx.inventory, 'iron_ingot', 1);
    },
    hint: 'First, mine iron ore (tan/beige specks in stone) with your stone pickaxe. Then place the furnace, put iron ore in the top slot, and coal or planks in the bottom slot as fuel.',
    requiredItems: [{ item: 'iron_ingot', count: 1 }],
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 16: Craft a Sword
  // -------------------------------------------------------------------------
  {
    id: 'craft_sword',
    title: 'Craft a Sword',
    instruction: 'Craft a Stone Sword or better at the Crafting Table. Place 2 cobblestone (or iron ingots) vertically with 1 stick below them.',
    objective: 'Craft any sword',
    triggerCondition: (ctx) => {
      return hasItemContaining(ctx.inventory, '_sword')
        || hasItem(ctx.inventory, 'wooden_sword', 1);
    },
    hint: 'At the crafting table: center-top = cobblestone, center-middle = cobblestone, center-bottom = stick. This makes a stone sword.',
    autoAdvance: true,
  },

  // -------------------------------------------------------------------------
  // Step 17: Combat
  // -------------------------------------------------------------------------
  {
    id: 'combat',
    title: 'Combat!',
    instruction: 'Equip your sword and defeat a hostile mob! Wait for night, or find a dark cave where monsters spawn. Left-click to attack.',
    objective: 'Defeat a mob',
    triggerCondition: (ctx) => {
      return ctx.totalMobsKilled >= 1;
    },
    hint: 'Hostile mobs spawn in the dark — either at night or in unlit caves. Equip your sword and left-click on a mob to attack. Watch your health!',
    autoAdvance: true,
  },
];

// =============================================================================
// TUTORIAL CONSTANTS
// =============================================================================

/** Seconds before the hint is shown for a step. */
const HINT_DELAY_SECONDS = 30;

/** Maximum entries kept in the kill feed overlay. */
const MAX_KILL_FEED = 5;

// =============================================================================
// TUTORIAL MANAGER
// =============================================================================

/**
 * Manages the lifecycle of a scripted tutorial. Tracks state transitions,
 * triggers step completion, manages hint timers, and reports progress.
 *
 * Usage:
 *   const manager = TutorialManager.createDefaultTutorial();
 *   const state = manager.start(playerState.position);
 *   // Each game tick:
 *   const newState = manager.tick(state, context);
 */
export class TutorialManager {
  private steps: TutorialStep[];

  constructor(steps: TutorialStep[]) {
    this.steps = steps;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start the tutorial and return the initial state.
   */
  start(startPosition: PlayerPosition): TutorialState {
    const now = Date.now();
    return {
      currentStep: 0,
      steps: this.steps,
      completed: false,
      startTime: now,
      stepStartTime: now,
      hintShown: false,
      progress: 0,
      cameraYawDelta: 0,
      cameraPitchDelta: 0,
      jumpCount: 0,
      blocksPlaced: 0,
      totalBlocksPlaced: 0,
      mobsKilled: 0,
      totalMobsKilled: 0,
      inventoryOpened: false,
      craftingTablePlaced: false,
      furnacePlaced: false,
      placedBlockIds: new Set<number>(),
      startPosition: { ...startPosition },
      dismissed: false,
    };
  }

  /**
   * Reset the tutorial back to step 0.
   */
  reset(startPosition: PlayerPosition): TutorialState {
    return this.start(startPosition);
  }

  // ---------------------------------------------------------------------------
  // Per-tick Update
  // ---------------------------------------------------------------------------

  /**
   * Run the tutorial logic for one game tick.
   * Checks the current step's trigger condition and auto-advances if met.
   * Also manages the hint timer.
   *
   * Returns an updated copy of the state (does not mutate in-place).
   */
  tick(state: TutorialState, ctx: TutorialContext): TutorialState {
    if (state.completed || state.dismissed) return state;
    if (state.currentStep >= this.steps.length) return { ...state, completed: true, progress: 1 };

    const current = this.steps[state.currentStep];
    const now = Date.now();

    // Build the full context with state-level accumulators
    const fullCtx: TutorialContext = {
      ...ctx,
      cameraYawDelta: state.cameraYawDelta + ctx.cameraYawDelta,
      jumpCount: state.jumpCount + ctx.jumpCount,
      blocksPlaced: state.blocksPlaced + ctx.blocksPlaced,
      totalBlocksPlaced: state.totalBlocksPlaced + ctx.blocksPlaced,
      mobsKilled: state.mobsKilled + ctx.mobsKilled,
      totalMobsKilled: state.totalMobsKilled + ctx.mobsKilled,
      inventoryOpen: state.inventoryOpened || ctx.inventoryOpen,
      craftingTablePlaced: state.craftingTablePlaced || ctx.craftingTablePlaced,
      furnacePlaced: state.furnacePlaced || ctx.furnacePlaced,
      startPosition: state.startPosition,
    };

    // Update accumulated counters
    let newState: TutorialState = {
      ...state,
      cameraYawDelta: fullCtx.cameraYawDelta,
      jumpCount: fullCtx.jumpCount,
      blocksPlaced: fullCtx.blocksPlaced,
      totalBlocksPlaced: fullCtx.totalBlocksPlaced,
      mobsKilled: fullCtx.mobsKilled,
      totalMobsKilled: fullCtx.totalMobsKilled,
      inventoryOpened: fullCtx.inventoryOpen,
      craftingTablePlaced: fullCtx.craftingTablePlaced,
      furnacePlaced: fullCtx.furnacePlaced,
    };

    // Merge placed block IDs
    if (ctx.placedBlockIds.size > 0) {
      const merged = new Set(state.placedBlockIds);
      for (const id of ctx.placedBlockIds) {
        merged.add(id);
      }
      newState = { ...newState, placedBlockIds: merged };
    }

    // Check hint timer
    if (!newState.hintShown) {
      const elapsed = (now - newState.stepStartTime) / 1000;
      if (elapsed >= HINT_DELAY_SECONDS) {
        newState = { ...newState, hintShown: true };
      }
    }

    // Check trigger condition
    if (current.triggerCondition(fullCtx)) {
      if (current.autoAdvance) {
        newState = this.advanceStep(newState);
      }
    }

    return newState;
  }

  // ---------------------------------------------------------------------------
  // Step Navigation
  // ---------------------------------------------------------------------------

  /**
   * Advance to the next step. Called automatically when autoAdvance is true
   * and the trigger fires, or manually via skipStep.
   */
  private advanceStep(state: TutorialState): TutorialState {
    const nextStep = state.currentStep + 1;
    const isComplete = nextStep >= this.steps.length;

    return {
      ...state,
      currentStep: nextStep,
      completed: isComplete,
      stepStartTime: Date.now(),
      hintShown: false,
      progress: isComplete ? 1 : nextStep / this.steps.length,
      // Reset per-step counters
      cameraYawDelta: 0,
      cameraPitchDelta: 0,
      jumpCount: 0,
      blocksPlaced: 0,
      mobsKilled: 0,
      inventoryOpened: false,
    };
  }

  /**
   * Manually skip the current step without completing it.
   */
  skipStep(state: TutorialState): TutorialState {
    if (state.completed || state.dismissed) return state;
    if (state.currentStep >= this.steps.length) return state;
    return this.advanceStep(state);
  }

  /**
   * Dismiss the tutorial entirely.
   */
  dismiss(state: TutorialState): TutorialState {
    return {
      ...state,
      dismissed: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Hint Management
  // ---------------------------------------------------------------------------

  /**
   * Manually show the hint for the current step.
   */
  showHint(state: TutorialState): TutorialState {
    if (state.completed || state.dismissed) return state;
    return { ...state, hintShown: true };
  }

  // ---------------------------------------------------------------------------
  // Event Handlers — Call these from game systems to feed data into state
  // ---------------------------------------------------------------------------

  /**
   * Record a camera rotation delta. Call on every frame with the frame's delta.
   */
  recordCameraRotation(state: TutorialState, yawDelta: number, pitchDelta: number): TutorialState {
    if (state.completed || state.dismissed) return state;
    return {
      ...state,
      cameraYawDelta: state.cameraYawDelta + Math.abs(yawDelta),
      cameraPitchDelta: state.cameraPitchDelta + Math.abs(pitchDelta),
    };
  }

  /**
   * Record a jump event. Call once each time the player jumps.
   */
  recordJump(state: TutorialState): TutorialState {
    if (state.completed || state.dismissed) return state;
    return {
      ...state,
      jumpCount: state.jumpCount + 1,
    };
  }

  /**
   * Record that the inventory screen was opened.
   */
  recordInventoryOpen(state: TutorialState): TutorialState {
    if (state.completed || state.dismissed) return state;
    return {
      ...state,
      inventoryOpened: true,
    };
  }

  /**
   * Record a block placement. Increments the counter and tracks the block ID.
   */
  recordBlockPlaced(state: TutorialState, blockId: number): TutorialState {
    if (state.completed || state.dismissed) return state;

    const updatedIds = new Set(state.placedBlockIds);
    updatedIds.add(blockId);

    const isCraftingTable = blockId === Block.CraftingTable;
    const isFurnace = blockId === Block.Furnace;

    return {
      ...state,
      blocksPlaced: state.blocksPlaced + 1,
      totalBlocksPlaced: state.totalBlocksPlaced + 1,
      placedBlockIds: updatedIds,
      craftingTablePlaced: state.craftingTablePlaced || isCraftingTable,
      furnacePlaced: state.furnacePlaced || isFurnace,
    };
  }

  /**
   * Record a mob kill event.
   */
  recordMobKill(state: TutorialState): TutorialState {
    if (state.completed || state.dismissed) return state;
    return {
      ...state,
      mobsKilled: state.mobsKilled + 1,
      totalMobsKilled: state.totalMobsKilled + 1,
    };
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * Get the overall completion percentage (0-100).
   */
  getProgress(state: TutorialState): number {
    if (state.completed) return 100;
    return Math.round((state.currentStep / this.steps.length) * 100);
  }

  /**
   * Get the fractional progress (0-1).
   */
  getProgressFraction(state: TutorialState): number {
    if (state.completed) return 1;
    return state.currentStep / this.steps.length;
  }

  /**
   * Get the current step object, or null if the tutorial is complete.
   */
  getCurrentStep(state: TutorialState): TutorialStep | null {
    if (state.completed || state.currentStep >= this.steps.length) return null;
    return this.steps[state.currentStep];
  }

  /**
   * Get the instruction text for the current step.
   */
  getCurrentInstruction(state: TutorialState): string {
    const step = this.getCurrentStep(state);
    return step?.instruction ?? 'Tutorial complete! You\'re ready to explore the world on your own.';
  }

  /**
   * Get the title for the current step.
   */
  getCurrentTitle(state: TutorialState): string {
    const step = this.getCurrentStep(state);
    return step?.title ?? 'Tutorial Complete';
  }

  /**
   * Get the objective for the current step.
   */
  getCurrentObjective(state: TutorialState): string {
    const step = this.getCurrentStep(state);
    return step?.objective ?? '';
  }

  /**
   * Get the hint for the current step.
   */
  getCurrentHint(state: TutorialState): string | null {
    if (!state.hintShown) return null;
    const step = this.getCurrentStep(state);
    return step?.hint ?? null;
  }

  /**
   * Get the highlight blocks for the current step.
   */
  getHighlightBlocks(state: TutorialState): BlockCoord[] {
    const step = this.getCurrentStep(state);
    return step?.highlightBlocks ?? [];
  }

  /**
   * Get the required items for the current step.
   */
  getRequiredItems(state: TutorialState): { item: string; count: number }[] {
    const step = this.getCurrentStep(state);
    return step?.requiredItems ?? [];
  }

  /**
   * Check whether the entire tutorial is done.
   */
  isComplete(state: TutorialState): boolean {
    return state.completed;
  }

  /**
   * Check whether the tutorial is dismissed.
   */
  isDismissed(state: TutorialState): boolean {
    return state.dismissed;
  }

  /**
   * Check whether the tutorial is active (started, not complete, not dismissed).
   */
  isActive(state: TutorialState): boolean {
    return !state.completed && !state.dismissed;
  }

  /**
   * Get the current step index (0-based).
   */
  getCurrentStepIndex(state: TutorialState): number {
    return state.currentStep;
  }

  /**
   * Get the total number of steps.
   */
  getTotalSteps(): number {
    return this.steps.length;
  }

  /**
   * Get all step objects.
   */
  getAllSteps(): TutorialStep[] {
    return this.steps;
  }

  /**
   * Get time elapsed on the current step in seconds.
   */
  getStepElapsed(state: TutorialState): number {
    return (Date.now() - state.stepStartTime) / 1000;
  }

  /**
   * Get total tutorial time elapsed in seconds.
   */
  getTotalElapsed(state: TutorialState): number {
    return (Date.now() - state.startTime) / 1000;
  }

  /**
   * Format seconds into a "M:SS" display string.
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Check how many required items for the current step the player already has.
   * Returns an array of { item, required, current } for UI display.
   */
  getRequiredItemProgress(state: TutorialState, inventory: PlayerInventory): { item: string; required: number; current: number }[] {
    const step = this.getCurrentStep(state);
    if (!step || !step.requiredItems) return [];

    return step.requiredItems.map((req) => ({
      item: req.item,
      required: req.count,
      current: countItem(inventory, req.item),
    }));
  }

  /**
   * Get a summary of the player's tutorial achievements for display.
   */
  getSummary(state: TutorialState): TutorialSummary {
    return {
      stepsCompleted: state.currentStep,
      totalSteps: this.steps.length,
      totalBlocksPlaced: state.totalBlocksPlaced,
      totalMobsKilled: state.totalMobsKilled,
      elapsedSeconds: this.getTotalElapsed(state),
      completed: state.completed,
      dismissed: state.dismissed,
    };
  }

  // ---------------------------------------------------------------------------
  // Static Factory
  // ---------------------------------------------------------------------------

  /**
   * Create a TutorialManager pre-loaded with the default 17-step tutorial.
   */
  static createDefaultTutorial(): TutorialManager {
    return new TutorialManager(DEFAULT_TUTORIAL_STEPS);
  }
}

// =============================================================================
// SUMMARY TYPE
// =============================================================================

export interface TutorialSummary {
  stepsCompleted: number;
  totalSteps: number;
  totalBlocksPlaced: number;
  totalMobsKilled: number;
  elapsedSeconds: number;
  completed: boolean;
  dismissed: boolean;
}

// =============================================================================
// TUTORIAL WORLD SETUP
// =============================================================================

/**
 * Describes blocks and entities to pre-place in the world to support the
 * tutorial. The game's world generator should call this to prepare the
 * tutorial area.
 */
export interface TutorialWorldSetup {
  /** Blocks to place at specific coordinates. */
  blocks: { coord: BlockCoord; blockId: number }[];
  /** Suggested player spawn position. */
  spawnPosition: PlayerPosition;
  /** Area bounds for the tutorial region. */
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
}

/**
 * Generate the world setup for the default tutorial.
 * Places a flat grass area with a few trees, some exposed stone, and iron ore
 * so the player can complete all tutorial steps without too much exploration.
 */
export function generateTutorialWorldSetup(): TutorialWorldSetup {
  const blocks: { coord: BlockCoord; blockId: number }[] = [];
  const centerX = 0;
  const centerZ = 0;
  const groundY = 64;
  const radius = 24;

  // Flat grass platform
  for (let x = centerX - radius; x <= centerX + radius; x++) {
    for (let z = centerZ - radius; z <= centerZ + radius; z++) {
      // Bedrock base
      blocks.push({ coord: { x, y: 0, z }, blockId: Block.Bedrock });

      // Stone layers
      for (let y = 1; y < groundY - 4; y++) {
        blocks.push({ coord: { x, y, z }, blockId: Block.Stone });
      }

      // Dirt layers
      for (let y = groundY - 4; y < groundY; y++) {
        blocks.push({ coord: { x, y, z }, blockId: Block.Dirt });
      }

      // Grass top
      blocks.push({ coord: { x, y: groundY, z }, blockId: Block.Grass });
    }
  }

  // Place 3 oak trees at known positions near the player
  const treePositions = [
    { x: centerX + 6, z: centerZ + 4 },
    { x: centerX - 5, z: centerZ + 7 },
    { x: centerX + 8, z: centerZ - 3 },
  ];

  for (const treePos of treePositions) {
    // Trunk: 4-5 blocks tall
    const trunkHeight = 4 + Math.floor(Math.random() * 2);
    for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
      blocks.push({ coord: { x: treePos.x, y, z: treePos.z }, blockId: Block.OakLog });
    }

    // Canopy: 3x3 leaves around top, plus cross on top
    const canopyBase = groundY + trunkHeight - 1;
    for (let dy = 0; dy <= 2; dy++) {
      const layerRadius = dy < 2 ? 2 : 1;
      for (let dx = -layerRadius; dx <= layerRadius; dx++) {
        for (let dz = -layerRadius; dz <= layerRadius; dz++) {
          if (dx === 0 && dz === 0 && dy < 2) continue; // trunk occupies center
          // Skip corners for natural look
          if (Math.abs(dx) === layerRadius && Math.abs(dz) === layerRadius && Math.random() > 0.6) continue;
          blocks.push({
            coord: { x: treePos.x + dx, y: canopyBase + dy, z: treePos.z + dz },
            blockId: Block.OakLeaves,
          });
        }
      }
    }
  }

  // Exposed stone cliff at the edge for easy mining
  const cliffX = centerX + 12;
  for (let z = centerZ - 4; z <= centerZ + 4; z++) {
    for (let y = groundY + 1; y <= groundY + 5; y++) {
      blocks.push({ coord: { x: cliffX, y, z }, blockId: Block.Stone });
      blocks.push({ coord: { x: cliffX + 1, y, z }, blockId: Block.Stone });
    }
  }

  // Iron ore veins in the cliff (3 blocks)
  blocks.push({ coord: { x: cliffX, y: groundY + 2, z: centerZ }, blockId: Block.IronOre });
  blocks.push({ coord: { x: cliffX, y: groundY + 2, z: centerZ + 1 }, blockId: Block.IronOre });
  blocks.push({ coord: { x: cliffX + 1, y: groundY + 3, z: centerZ }, blockId: Block.IronOre });

  // Coal ore near the surface for fuel
  blocks.push({ coord: { x: cliffX, y: groundY + 1, z: centerZ - 2 }, blockId: Block.CoalOre });
  blocks.push({ coord: { x: cliffX, y: groundY + 1, z: centerZ - 1 }, blockId: Block.CoalOre });
  blocks.push({ coord: { x: cliffX + 1, y: groundY + 1, z: centerZ - 2 }, blockId: Block.CoalOre });

  return {
    blocks,
    spawnPosition: {
      x: centerX + 0.5,
      y: groundY + 1,
      z: centerZ + 0.5,
      yaw: 0,
      pitch: 0,
    },
    bounds: {
      minX: centerX - radius,
      minZ: centerZ - radius,
      maxX: centerX + radius,
      maxZ: centerZ + radius,
    },
  };
}

// =============================================================================
// TUTORIAL ACHIEVEMENT DEFINITIONS
// =============================================================================

/**
 * Achievements the player can earn during the tutorial.
 * These integrate with the wider advancement system.
 */
export interface TutorialAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  stepRequired: number; // step index that unlocks this achievement
}

export const TUTORIAL_ACHIEVEMENTS: TutorialAchievement[] = [
  {
    id: 'tutorial_look',
    name: 'Fresh Eyes',
    description: 'Looked around the world for the first time.',
    icon: 'eye',
    stepRequired: 0,
  },
  {
    id: 'tutorial_move',
    name: 'Baby Steps',
    description: 'Walked 5 blocks from your starting position.',
    icon: 'boot',
    stepRequired: 1,
  },
  {
    id: 'tutorial_jump',
    name: 'Getting Some Air',
    description: 'Jumped 3 times.',
    icon: 'arrow_up',
    stepRequired: 2,
  },
  {
    id: 'tutorial_break',
    name: 'Timber!',
    description: 'Punched a tree and collected your first log.',
    icon: 'log',
    stepRequired: 3,
  },
  {
    id: 'tutorial_inventory',
    name: 'Taking Stock',
    description: 'Opened the inventory screen.',
    icon: 'chest',
    stepRequired: 4,
  },
  {
    id: 'tutorial_planks',
    name: 'Plank You Very Much',
    description: 'Crafted wooden planks from logs.',
    icon: 'planks',
    stepRequired: 5,
  },
  {
    id: 'tutorial_sticks',
    name: 'Stick With It',
    description: 'Crafted sticks from planks.',
    icon: 'stick',
    stepRequired: 6,
  },
  {
    id: 'tutorial_workbench',
    name: 'Crafty',
    description: 'Crafted a Crafting Table.',
    icon: 'crafting_table',
    stepRequired: 7,
  },
  {
    id: 'tutorial_place_workbench',
    name: 'Setting Up Shop',
    description: 'Placed a Crafting Table in the world.',
    icon: 'crafting_table',
    stepRequired: 8,
  },
  {
    id: 'tutorial_pickaxe',
    name: 'Time to Mine!',
    description: 'Crafted your first pickaxe.',
    icon: 'pickaxe',
    stepRequired: 9,
  },
  {
    id: 'tutorial_cobblestone',
    name: 'Stone Age',
    description: 'Mined cobblestone from stone blocks.',
    icon: 'cobblestone',
    stepRequired: 10,
  },
  {
    id: 'tutorial_stone_tools',
    name: 'Getting an Upgrade',
    description: 'Crafted a stone pickaxe.',
    icon: 'stone_pickaxe',
    stepRequired: 11,
  },
  {
    id: 'tutorial_shelter',
    name: 'Home Sweet Home',
    description: 'Built a shelter with 20+ blocks.',
    icon: 'house',
    stepRequired: 12,
  },
  {
    id: 'tutorial_furnace',
    name: 'Hot Topic',
    description: 'Crafted a furnace.',
    icon: 'furnace',
    stepRequired: 13,
  },
  {
    id: 'tutorial_iron',
    name: 'Acquire Hardware',
    description: 'Smelted your first iron ingot.',
    icon: 'iron_ingot',
    stepRequired: 14,
  },
  {
    id: 'tutorial_sword',
    name: 'Time to Strike',
    description: 'Crafted a sword.',
    icon: 'sword',
    stepRequired: 15,
  },
  {
    id: 'tutorial_combat',
    name: 'Monster Hunter',
    description: 'Defeated your first hostile mob.',
    icon: 'skull',
    stepRequired: 16,
  },
];

/**
 * Get all tutorial achievements that the player has earned given their
 * current tutorial progress.
 */
export function getEarnedTutorialAchievements(state: TutorialState): TutorialAchievement[] {
  return TUTORIAL_ACHIEVEMENTS.filter((a) => state.currentStep > a.stepRequired);
}

/**
 * Get the next tutorial achievement the player can earn.
 */
export function getNextTutorialAchievement(state: TutorialState): TutorialAchievement | null {
  if (state.completed) return null;
  return TUTORIAL_ACHIEVEMENTS.find((a) => a.stepRequired === state.currentStep) ?? null;
}

// =============================================================================
// UTILITY: Format item names for display
// =============================================================================

/**
 * Convert an item_id to a human-readable display name.
 * e.g., "oak_planks" -> "Oak Planks"
 */
export function formatItemName(itemId: string): string {
  return itemId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format a block ID to its item name equivalent.
 * Uses a simple lookup for common tutorial blocks.
 */
export function blockIdToItemName(blockId: number): string {
  const lookup: Record<number, string> = {
    [Block.OakLog]: 'oak_log',
    [Block.SpruceLog]: 'spruce_log',
    [Block.BirchLog]: 'birch_log',
    [Block.JungleLog]: 'jungle_log',
    [Block.AcaciaLog]: 'acacia_log',
    [Block.DarkOakLog]: 'dark_oak_log',
    [Block.OakPlanks]: 'oak_planks',
    [Block.SprucePlanks]: 'spruce_planks',
    [Block.BirchPlanks]: 'birch_planks',
    [Block.JunglePlanks]: 'jungle_planks',
    [Block.AcaciaPlanks]: 'acacia_planks',
    [Block.DarkOakPlanks]: 'dark_oak_planks',
    [Block.Cobblestone]: 'cobblestone',
    [Block.Stone]: 'stone',
    [Block.CraftingTable]: 'crafting_table',
    [Block.Furnace]: 'furnace',
    [Block.IronOre]: 'iron_ore',
    [Block.CoalOre]: 'coal_ore',
    [Block.Dirt]: 'dirt',
    [Block.Grass]: 'grass_block',
    [Block.Sand]: 'sand',
    [Block.Gravel]: 'gravel',
  };

  return lookup[blockId] ?? 'unknown';
}
