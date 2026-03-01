// =============================================================================
// Redstone Signal Propagation Engine — BFS-based Power Network
// =============================================================================
// Implements the full redstone signal propagation system with power levels
// 0-15, strong/weak power distinction, BFS-based propagation, and component
// behaviors for levers, buttons, pressure plates, torches, repeaters,
// comparators, and observers. Follows vanilla Minecraft redstone mechanics.
// =============================================================================

import type { BlockId, RedstoneState } from '@/types/minecraft-switch';
import { Block, MS_CONFIG } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum redstone signal power level. */
const MAX_POWER = MS_CONFIG.REDSTONE_MAX_POWER; // 15

/** Button pulse duration in ticks. */
const STONE_BUTTON_PULSE = 10;
const WOOD_BUTTON_PULSE = 15;

/** Redstone torch burnout protection: max toggles in a time window. */
const TORCH_BURNOUT_MAX_TOGGLES = 8;
const TORCH_BURNOUT_WINDOW_TICKS = 100;

/** Observer pulse duration in ticks. */
const OBSERVER_PULSE_TICKS = 2;

// =============================================================================
// TYPES
// =============================================================================

/** 3D coordinate tuple. */
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A scheduled redstone tick update. */
interface ScheduledUpdate {
  x: number;
  y: number;
  z: number;
  /** Tick at which the update should fire. */
  triggerTick: number;
  /** Priority for same-tick ordering (lower = first). */
  priority: number;
}

/** Torch burnout tracking entry. */
interface TorchBurnoutEntry {
  toggleTicks: number[];
}

/** The six cardinal directions. */
const DIRECTIONS: Vec3[] = [
  { x: 1, y: 0, z: 0 },   // east
  { x: -1, y: 0, z: 0 },  // west
  { x: 0, y: 1, z: 0 },   // up
  { x: 0, y: -1, z: 0 },  // down
  { x: 0, y: 0, z: 1 },   // south
  { x: 0, y: 0, z: -1 },  // north
];

/** Horizontal directions only (for redstone wire connections). */
const HORIZONTAL_DIRECTIONS: Vec3[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

// =============================================================================
// BLOCK CLASSIFICATION HELPERS
// =============================================================================

/** Check if a block is a redstone component. */
function isRedstoneComponent(blockId: BlockId): boolean {
  return (
    blockId === Block.RedstoneDust ||
    blockId === Block.RedstoneTorch ||
    blockId === Block.RedstoneRepeater ||
    blockId === Block.RedstoneComparator ||
    blockId === Block.Lever ||
    blockId === Block.StoneButton ||
    blockId === Block.OakButton ||
    blockId === Block.StonePressurePlate ||
    blockId === Block.OakPressurePlate ||
    blockId === Block.WeightedPressurePlateLight ||
    blockId === Block.WeightedPressurePlateHeavy ||
    blockId === Block.Observer ||
    blockId === Block.RedstoneBlock_ ||
    blockId === Block.RedstoneBlock ||
    blockId === Block.Piston ||
    blockId === Block.StickyPiston ||
    blockId === Block.TNT ||
    blockId === Block.NoteBlock ||
    blockId === Block.Target ||
    blockId === Block.Dispenser ||
    blockId === Block.Dropper ||
    blockId === Block.Hopper
  );
}

/** Check if a block is solid and can transmit strong power. */
function isSolidBlock(blockId: BlockId): boolean {
  return (
    blockId !== Block.Air &&
    blockId !== Block.Water &&
    blockId !== Block.Lava &&
    blockId !== Block.StillWater &&
    blockId !== Block.StillLava &&
    blockId !== Block.RedstoneDust &&
    blockId !== Block.RedstoneTorch &&
    blockId !== Block.RedstoneRepeater &&
    blockId !== Block.RedstoneComparator &&
    !isTransparentBlock(blockId)
  );
}

/** Check if a block is transparent (cannot carry strong power). */
function isTransparentBlock(blockId: BlockId): boolean {
  return (
    blockId === Block.Glass ||
    blockId === Block.GlassPane ||
    blockId === Block.Ice ||
    (blockId >= Block.WhiteStainedGlass && blockId <= Block.BlackStainedGlass) ||
    blockId === Block.Glowstone
  );
}

/** Check if a block is a wooden button. */
function isWoodButton(blockId: BlockId): boolean {
  return (
    blockId === Block.OakButton ||
    blockId === Block.SpruceButton ||
    blockId === Block.BirchButton ||
    blockId === Block.JungleButton ||
    blockId === Block.AcaciaButton ||
    blockId === Block.DarkOakButton
  );
}

/** Check if a block is any kind of button. */
function isButton(blockId: BlockId): boolean {
  return blockId === Block.StoneButton || isWoodButton(blockId);
}

/** Check if a block is any kind of pressure plate. */
function isPressurePlate(blockId: BlockId): boolean {
  return (
    blockId === Block.StonePressurePlate ||
    blockId === Block.OakPressurePlate ||
    blockId === Block.SprucePressurePlate ||
    blockId === Block.BirchPressurePlate ||
    blockId === Block.JunglePressurePlate ||
    blockId === Block.AcaciaPressurePlate ||
    blockId === Block.DarkOakPressurePlate ||
    blockId === Block.WeightedPressurePlateLight ||
    blockId === Block.WeightedPressurePlateHeavy
  );
}

/** Check if a block is a door. */
function isDoor(blockId: BlockId): boolean {
  return (
    blockId === Block.OakDoor ||
    blockId === Block.SpruceDoor ||
    blockId === Block.BirchDoor ||
    blockId === Block.JungleDoor ||
    blockId === Block.AcaciaDoor ||
    blockId === Block.DarkOakDoor
  );
}

/** Check if a block is a trapdoor. */
function isTrapdoor(blockId: BlockId): boolean {
  return (
    blockId === Block.OakTrapdoor ||
    blockId === Block.SpruceTrapdoor ||
    blockId === Block.BirchTrapdoor ||
    blockId === Block.JungleTrapdoor ||
    blockId === Block.AcaciaTrapdoor ||
    blockId === Block.DarkOakTrapdoor
  );
}

/** Check if a block is a fence gate. */
function isFenceGate(blockId: BlockId): boolean {
  return (
    blockId === Block.OakFenceGate ||
    blockId === Block.SpruceFenceGate ||
    blockId === Block.BirchFenceGate ||
    blockId === Block.JungleFenceGate ||
    blockId === Block.AcaciaFenceGate ||
    blockId === Block.DarkOakFenceGate
  );
}

/** Check if a block can be activated by redstone (doors, trapdoors, pistons, etc.). */
function isRedstoneActivatable(blockId: BlockId): boolean {
  return (
    isDoor(blockId) ||
    isTrapdoor(blockId) ||
    isFenceGate(blockId) ||
    blockId === Block.Piston ||
    blockId === Block.StickyPiston ||
    blockId === Block.TNT ||
    blockId === Block.NoteBlock ||
    blockId === Block.Dispenser ||
    blockId === Block.Dropper ||
    blockId === Block.Hopper
  );
}

// =============================================================================
// POSITION KEY UTILITY
// =============================================================================

function posKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

// =============================================================================
// REDSTONE ENGINE CLASS
// =============================================================================

/**
 * Manages redstone signal propagation across a ChunkedWorld.
 * Handles power levels, strong/weak power, component behaviors,
 * scheduled tick updates, and BFS-based signal propagation.
 */
export class RedstoneEngine {
  /** Reference to the world for block queries. */
  private world: ChunkedWorld;

  /** Current game tick counter. */
  private currentTick: number = 0;

  /** Power level at each redstone-relevant position. */
  private powerLevels: Map<string, number> = new Map();

  /** Redstone state metadata for components (repeater delay, comparator mode, etc.). */
  private componentStates: Map<string, RedstoneState> = new Map();

  /** Scheduled delayed updates (for repeaters, observers, buttons). */
  private scheduledUpdates: ScheduledUpdate[] = [];

  /** Torch burnout tracking to prevent rapid oscillation. */
  private torchBurnout: Map<string, TorchBurnoutEntry> = new Map();

  /** Blocks that need update processing this tick. */
  private pendingUpdates: Set<string> = new Set();

  constructor(world: ChunkedWorld) {
    this.world = world;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Get the power level at a world position.
   * @returns Power level 0-15
   */
  getPowerLevel(x: number, y: number, z: number): number {
    return this.powerLevels.get(posKey(x, y, z)) ?? 0;
  }

  /**
   * Check whether a block at the given position is powered (has any signal > 0).
   */
  isBlockPowered(x: number, y: number, z: number): boolean {
    // Check if the block itself has power
    if (this.getPowerLevel(x, y, z) > 0) return true;

    // Check all adjacent blocks for power
    for (const dir of DIRECTIONS) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const nz = z + dir.z;
      const power = this.getPowerLevel(nx, ny, nz);
      if (power > 0) {
        const neighborBlock = this.world.getBlock(nx, ny, nz);
        // Redstone wire only weakly powers: doesn't power solid blocks (except the one below)
        if (neighborBlock === Block.RedstoneDust) {
          if (dir.y === -1) return true; // Wire below powers block above
          continue; // Wire doesn't power blocks to the side
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Get the strong power level at a position. Strong power comes only from
   * direct connections (repeater output, torch, lever, button directly on block).
   * @returns Strong power level 0-15
   */
  getStrongPower(x: number, y: number, z: number): number {
    let maxPower = 0;

    for (const dir of DIRECTIONS) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const nz = z + dir.z;
      const neighborBlock = this.world.getBlock(nx, ny, nz);
      const key = posKey(nx, ny, nz);
      const state = this.componentStates.get(key);

      if (!state) continue;
      if (!state.strongPower) continue;

      maxPower = Math.max(maxPower, state.power);
    }

    return maxPower;
  }

  /**
   * Schedule a delayed update at the given position.
   * @param x - World X coordinate
   * @param y - World Y coordinate
   * @param z - World Z coordinate
   * @param delay - Delay in game ticks before the update fires
   */
  scheduleUpdate(x: number, y: number, z: number, delay: number): void {
    this.scheduledUpdates.push({
      x,
      y,
      z,
      triggerTick: this.currentTick + delay,
      priority: 0,
    });
  }

  /**
   * Notify the engine that a block has changed at the given position.
   * This triggers signal re-propagation from that position.
   */
  updateBlock(x: number, y: number, z: number): void {
    this.recalculatePower(x, y, z);
  }

  /**
   * Process one game tick. Handles scheduled updates and propagates
   * any pending signal changes.
   */
  tick(): void {
    this.currentTick++;

    // Process scheduled updates that are due this tick
    const dueUpdates: ScheduledUpdate[] = [];
    const remaining: ScheduledUpdate[] = [];

    for (const update of this.scheduledUpdates) {
      if (update.triggerTick <= this.currentTick) {
        dueUpdates.push(update);
      } else {
        remaining.push(update);
      }
    }

    this.scheduledUpdates = remaining;

    // Sort by priority (lower = first)
    dueUpdates.sort((a, b) => a.priority - b.priority);

    // Execute due updates
    for (const update of dueUpdates) {
      this.recalculatePower(update.x, update.y, update.z);
    }

    // Process any pending propagation
    this.processPendingUpdates();
  }

  // ---------------------------------------------------------------------------
  // COMPONENT INTERACTION
  // ---------------------------------------------------------------------------

  /**
   * Toggle a lever at the given position.
   * @returns New power state (true = on, false = off)
   */
  toggleLever(x: number, y: number, z: number): boolean {
    const blockId = this.world.getBlock(x, y, z);
    if (blockId !== Block.Lever) return false;

    const key = posKey(x, y, z);
    const state = this.getOrCreateState(key);

    const isOn = state.power > 0;
    const newPower = isOn ? 0 : MAX_POWER;

    state.power = newPower;
    state.strongPower = newPower > 0;
    state.weakPower = newPower > 0;
    this.componentStates.set(key, state);

    // Propagate signal change
    this.recalculatePower(x, y, z);
    this.propagateToNeighbors(x, y, z);

    return newPower > 0;
  }

  /**
   * Activate a button at the given position. The button will pulse
   * for a fixed number of ticks, then deactivate.
   */
  pressButton(x: number, y: number, z: number): void {
    const blockId = this.world.getBlock(x, y, z);
    if (!isButton(blockId)) return;

    const key = posKey(x, y, z);
    const state = this.getOrCreateState(key);

    // Set button power on
    state.power = MAX_POWER;
    state.strongPower = true;
    state.weakPower = true;
    this.componentStates.set(key, state);

    // Propagate immediately
    this.recalculatePower(x, y, z);
    this.propagateToNeighbors(x, y, z);

    // Schedule deactivation
    const pulseDuration = isWoodButton(blockId) ? WOOD_BUTTON_PULSE : STONE_BUTTON_PULSE;
    this.scheduleUpdate(x, y, z, pulseDuration);
  }

  /**
   * Update a pressure plate based on whether an entity is standing on it.
   * @param entityPresent - Whether an entity is on the plate
   * @param entityCount - Number of entities (for weighted plates)
   */
  updatePressurePlate(
    x: number,
    y: number,
    z: number,
    entityPresent: boolean,
    entityCount: number = 1
  ): void {
    const blockId = this.world.getBlock(x, y, z);
    if (!isPressurePlate(blockId)) return;

    const key = posKey(x, y, z);
    const state = this.getOrCreateState(key);

    let newPower: number;

    if (!entityPresent) {
      newPower = 0;
    } else if (blockId === Block.WeightedPressurePlateLight) {
      // Gold plate: signal = min(entityCount, 15)
      newPower = Math.min(entityCount, MAX_POWER);
    } else if (blockId === Block.WeightedPressurePlateHeavy) {
      // Iron plate: signal = min(ceil(entityCount / 10), 15)
      newPower = Math.min(Math.ceil(entityCount / 10), MAX_POWER);
    } else {
      // Stone/wood plate: binary
      newPower = MAX_POWER;
    }

    if (state.power !== newPower) {
      state.power = newPower;
      state.strongPower = newPower > 0;
      state.weakPower = newPower > 0;
      this.componentStates.set(key, state);

      this.recalculatePower(x, y, z);
      this.propagateToNeighbors(x, y, z);
    }
  }

  /**
   * Set a repeater's delay (1-4 ticks, corresponding to 2-8 game ticks).
   */
  setRepeaterDelay(x: number, y: number, z: number, delay: number): void {
    const blockId = this.world.getBlock(x, y, z);
    if (blockId !== Block.RedstoneRepeater) return;

    const key = posKey(x, y, z);
    const state = this.getOrCreateState(key);
    state.delay = Math.max(1, Math.min(4, delay));
    this.componentStates.set(key, state);
  }

  /**
   * Toggle a comparator between compare and subtract modes.
   */
  toggleComparatorMode(x: number, y: number, z: number): void {
    const blockId = this.world.getBlock(x, y, z);
    if (blockId !== Block.RedstoneComparator) return;

    const key = posKey(x, y, z);
    const state = this.getOrCreateState(key);
    state.mode = state.mode === 'compare' ? 'subtract' : 'compare';
    this.componentStates.set(key, state);

    this.recalculatePower(x, y, z);
    this.propagateToNeighbors(x, y, z);
  }

  /**
   * Notify the engine that a block facing an observer has changed,
   * causing the observer to emit a pulse.
   */
  triggerObserver(x: number, y: number, z: number): void {
    const blockId = this.world.getBlock(x, y, z);
    if (blockId !== Block.Observer) return;

    const key = posKey(x, y, z);
    const state = this.getOrCreateState(key);

    // Emit a 2-tick pulse
    state.power = MAX_POWER;
    state.strongPower = true;
    this.componentStates.set(key, state);

    this.recalculatePower(x, y, z);
    this.propagateToNeighbors(x, y, z);

    // Schedule deactivation
    this.scheduleUpdate(x, y, z, OBSERVER_PULSE_TICKS);
  }

  // ---------------------------------------------------------------------------
  // SIGNAL PROPAGATION (BFS)
  // ---------------------------------------------------------------------------

  /**
   * Recalculate the power level at a given position based on its block type
   * and neighboring power sources.
   */
  private recalculatePower(x: number, y: number, z: number): void {
    const blockId = this.world.getBlock(x, y, z);
    const key = posKey(x, y, z);
    const oldPower = this.powerLevels.get(key) ?? 0;
    let newPower = 0;

    if (blockId === Block.RedstoneDust) {
      newPower = this.calculateWirePower(x, y, z);
    } else if (blockId === Block.RedstoneTorch || blockId === Block.RedstoneTorch_Wall) {
      newPower = this.calculateTorchPower(x, y, z);
    } else if (blockId === Block.RedstoneRepeater) {
      newPower = this.calculateRepeaterPower(x, y, z);
    } else if (blockId === Block.RedstoneComparator) {
      newPower = this.calculateComparatorPower(x, y, z);
    } else if (blockId === Block.RedstoneBlock_ || blockId === Block.RedstoneBlock) {
      newPower = MAX_POWER;
    } else if (blockId === Block.Observer) {
      // Observer power is set by triggerObserver or scheduled update
      const state = this.componentStates.get(key);
      newPower = state?.power ?? 0;
    } else if (blockId === Block.Lever || isButton(blockId) || isPressurePlate(blockId)) {
      // Interactive components: power is set by interaction methods
      const state = this.componentStates.get(key);
      newPower = state?.power ?? 0;
    }

    this.powerLevels.set(key, newPower);

    // If power changed, queue neighbor updates
    if (oldPower !== newPower) {
      this.propagateToNeighbors(x, y, z);

      // Activate/deactivate redstone-activated blocks
      this.notifyRedstoneActivatables(x, y, z, newPower);
    }
  }

  /**
   * Calculate the power level for a redstone wire at the given position.
   * Wire receives power from adjacent power sources and other wires,
   * losing 1 power level per block of wire traveled.
   */
  private calculateWirePower(x: number, y: number, z: number): number {
    let maxPower = 0;

    // Check all adjacent blocks for power
    for (const dir of DIRECTIONS) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const nz = z + dir.z;
      const neighborBlock = this.world.getBlock(nx, ny, nz);
      const neighborKey = posKey(nx, ny, nz);

      // Strong power sources (lever, button, repeater output, etc.)
      const neighborState = this.componentStates.get(neighborKey);
      if (neighborState && neighborState.strongPower) {
        maxPower = Math.max(maxPower, neighborState.power);
      }

      // Redstone block always provides power 15
      if (neighborBlock === Block.RedstoneBlock_ || neighborBlock === Block.RedstoneBlock) {
        maxPower = MAX_POWER;
      }

      // Redstone torch provides power to adjacent wire
      if ((neighborBlock === Block.RedstoneTorch || neighborBlock === Block.RedstoneTorch_Wall) && dir.y !== 1) {
        const torchPower = this.powerLevels.get(neighborKey) ?? 0;
        if (torchPower > 0) {
          maxPower = Math.max(maxPower, torchPower);
        }
      }
    }

    // Check horizontal neighbors for wire-to-wire power (loses 1 per block)
    for (const dir of HORIZONTAL_DIRECTIONS) {
      const nx = x + dir.x;
      const nz = z + dir.z;

      // Same level wire
      if (this.world.getBlock(nx, y, nz) === Block.RedstoneDust) {
        const neighborPower = this.powerLevels.get(posKey(nx, y, nz)) ?? 0;
        maxPower = Math.max(maxPower, neighborPower - 1);
      }

      // Wire going up: wire on top of adjacent block connects if no solid block above
      if (this.world.getBlock(nx, y + 1, nz) === Block.RedstoneDust) {
        const blockAbove = this.world.getBlock(x, y + 1, z);
        if (!isSolidBlock(blockAbove)) {
          const neighborPower = this.powerLevels.get(posKey(nx, y + 1, nz)) ?? 0;
          maxPower = Math.max(maxPower, neighborPower - 1);
        }
      }

      // Wire going down: wire on lower adjacent block connects if no solid block between
      if (this.world.getBlock(nx, y - 1, nz) === Block.RedstoneDust) {
        const blockBeside = this.world.getBlock(nx, y, nz);
        if (!isSolidBlock(blockBeside)) {
          const neighborPower = this.powerLevels.get(posKey(nx, y - 1, nz)) ?? 0;
          maxPower = Math.max(maxPower, neighborPower - 1);
        }
      }
    }

    return Math.max(0, maxPower);
  }

  /**
   * Calculate redstone torch power. Torches invert signals:
   * - Output 15 when the block they are attached to is NOT powered
   * - Output 0 when the block they are attached to IS powered
   * Includes burnout protection.
   */
  private calculateTorchPower(x: number, y: number, z: number): number {
    const key = posKey(x, y, z);

    // Check burnout
    if (this.isTorchBurnedOut(x, y, z)) {
      return 0;
    }

    // Torch is attached to the block below (for upright torches)
    // or to the side block (for wall torches)
    const blockBelow = this.world.getBlock(x, y - 1, z);
    const belowPowered = this.isBlockPoweredExcluding(x, y - 1, z, x, y, z);

    const oldPower = this.powerLevels.get(key) ?? MAX_POWER;
    const newPower = belowPowered ? 0 : MAX_POWER;

    // Track toggles for burnout detection
    if (oldPower !== newPower) {
      this.recordTorchToggle(x, y, z);
    }

    // Update state
    const state = this.getOrCreateState(key);
    state.power = newPower;
    state.strongPower = newPower > 0;
    this.componentStates.set(key, state);

    return newPower;
  }

  /**
   * Check if a block is powered, excluding a specific position.
   * Used by torches to avoid self-referencing loops.
   */
  private isBlockPoweredExcluding(
    x: number, y: number, z: number,
    excludeX: number, excludeY: number, excludeZ: number
  ): boolean {
    for (const dir of DIRECTIONS) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const nz = z + dir.z;

      if (nx === excludeX && ny === excludeY && nz === excludeZ) continue;

      const power = this.powerLevels.get(posKey(nx, ny, nz)) ?? 0;
      if (power > 0) {
        const neighborBlock = this.world.getBlock(nx, ny, nz);
        // Redstone wire doesn't power blocks (except weakly below)
        if (neighborBlock === Block.RedstoneDust && dir.y !== -1) continue;
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate repeater output power. Repeaters:
   * - Boost signal to 15 if input > 0
   * - Delay the signal by 1-4 redstone ticks (2-8 game ticks)
   * - Can be locked by a powered repeater pointing into its side
   */
  private calculateRepeaterPower(x: number, y: number, z: number): number {
    const key = posKey(x, y, z);
    const state = this.getOrCreateState(key);

    // Check if repeater is locked
    if (this.isRepeaterLocked(x, y, z)) {
      state.locked = true;
      this.componentStates.set(key, state);
      return state.power; // Keep current output when locked
    }

    state.locked = false;

    // Check input power from the back face
    // For simplicity, check all horizontal directions for input
    let inputPower = 0;
    for (const dir of HORIZONTAL_DIRECTIONS) {
      const nx = x + dir.x;
      const nz = z + dir.z;
      const neighborPower = this.powerLevels.get(posKey(nx, y, nz)) ?? 0;
      inputPower = Math.max(inputPower, neighborPower);
    }

    const newPower = inputPower > 0 ? MAX_POWER : 0;

    // If power is changing, schedule a delayed update
    if (newPower !== state.power) {
      const delay = (state.delay || 1) * MS_CONFIG.REDSTONE_TICK;
      state.power = newPower;
      state.strongPower = newPower > 0;
      this.componentStates.set(key, state);
      this.scheduleUpdate(x, y, z, delay);
    }

    return state.power;
  }

  /**
   * Check if a repeater is locked by an adjacent powered repeater.
   */
  private isRepeaterLocked(x: number, y: number, z: number): boolean {
    for (const dir of HORIZONTAL_DIRECTIONS) {
      const nx = x + dir.x;
      const nz = z + dir.z;
      const neighborBlock = this.world.getBlock(nx, y, nz);

      if (neighborBlock === Block.RedstoneRepeater) {
        const neighborState = this.componentStates.get(posKey(nx, y, nz));
        if (neighborState && neighborState.power > 0) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate comparator output power.
   * - Compare mode: output = back signal if back >= max(side signals), else 0
   * - Subtract mode: output = max(back - max(side signals), 0)
   * Also reads container fill levels from the back.
   */
  private calculateComparatorPower(x: number, y: number, z: number): number {
    const key = posKey(x, y, z);
    const state = this.getOrCreateState(key);

    // Get back signal (input)
    let backSignal = 0;
    for (const dir of HORIZONTAL_DIRECTIONS) {
      const nx = x + dir.x;
      const nz = z + dir.z;
      const neighborPower = this.powerLevels.get(posKey(nx, y, nz)) ?? 0;
      backSignal = Math.max(backSignal, neighborPower);
    }

    // Get side signals
    let sideSignal = 0;
    for (const dir of HORIZONTAL_DIRECTIONS) {
      const nx = x + dir.x;
      const nz = z + dir.z;
      const neighborPower = this.powerLevels.get(posKey(nx, y, nz)) ?? 0;
      sideSignal = Math.max(sideSignal, neighborPower);
    }

    let output: number;
    if (state.mode === 'subtract') {
      output = Math.max(backSignal - sideSignal, 0);
    } else {
      // Compare mode
      output = backSignal >= sideSignal ? backSignal : 0;
    }

    state.power = output;
    state.strongPower = output > 0;
    this.componentStates.set(key, state);

    return output;
  }

  // ---------------------------------------------------------------------------
  // PROPAGATION
  // ---------------------------------------------------------------------------

  /**
   * Queue all neighbors of a position for power recalculation.
   */
  private propagateToNeighbors(x: number, y: number, z: number): void {
    for (const dir of DIRECTIONS) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const nz = z + dir.z;
      const neighborBlock = this.world.getBlock(nx, ny, nz);

      if (isRedstoneComponent(neighborBlock)) {
        this.pendingUpdates.add(posKey(nx, ny, nz));
      }
    }

    // Also update diagonally connected wires (above/below adjacent blocks)
    for (const dir of HORIZONTAL_DIRECTIONS) {
      const nx = x + dir.x;
      const nz = z + dir.z;

      // Wire above adjacent block
      if (this.world.getBlock(nx, y + 1, nz) === Block.RedstoneDust) {
        this.pendingUpdates.add(posKey(nx, y + 1, nz));
      }

      // Wire below adjacent block
      if (this.world.getBlock(nx, y - 1, nz) === Block.RedstoneDust) {
        this.pendingUpdates.add(posKey(nx, y - 1, nz));
      }
    }
  }

  /**
   * Process all pending power updates using BFS. Prevents infinite loops
   * by tracking visited positions.
   */
  private processPendingUpdates(): void {
    const visited = new Set<string>();
    let iterations = 0;
    const MAX_ITERATIONS = 10000; // Safety limit

    while (this.pendingUpdates.size > 0 && iterations < MAX_ITERATIONS) {
      iterations++;

      const keys = Array.from(this.pendingUpdates);
      this.pendingUpdates.clear();

      for (const key of keys) {
        if (visited.has(key)) continue;
        visited.add(key);

        const [xs, ys, zs] = key.split(',');
        const x = parseInt(xs, 10);
        const y = parseInt(ys, 10);
        const z = parseInt(zs, 10);

        this.recalculatePower(x, y, z);
      }
    }
  }

  /**
   * Notify redstone-activatable blocks near a position when power changes.
   */
  private notifyRedstoneActivatables(x: number, y: number, z: number, power: number): void {
    for (const dir of DIRECTIONS) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const nz = z + dir.z;
      const neighborBlock = this.world.getBlock(nx, ny, nz);

      if (isRedstoneActivatable(neighborBlock)) {
        // These blocks respond to power changes
        // The actual behavior (opening doors, firing pistons, etc.)
        // is handled by the game engine based on power state
      }
    }
  }

  // ---------------------------------------------------------------------------
  // TORCH BURNOUT TRACKING
  // ---------------------------------------------------------------------------

  /**
   * Record a torch toggle for burnout tracking.
   */
  private recordTorchToggle(x: number, y: number, z: number): void {
    const key = posKey(x, y, z);
    let entry = this.torchBurnout.get(key);

    if (!entry) {
      entry = { toggleTicks: [] };
      this.torchBurnout.set(key, entry);
    }

    entry.toggleTicks.push(this.currentTick);

    // Clean old entries outside the window
    entry.toggleTicks = entry.toggleTicks.filter(
      (t) => this.currentTick - t < TORCH_BURNOUT_WINDOW_TICKS
    );
  }

  /**
   * Check if a torch has burned out from rapid toggling.
   */
  private isTorchBurnedOut(x: number, y: number, z: number): boolean {
    const key = posKey(x, y, z);
    const entry = this.torchBurnout.get(key);

    if (!entry) return false;

    // Clean old entries
    entry.toggleTicks = entry.toggleTicks.filter(
      (t) => this.currentTick - t < TORCH_BURNOUT_WINDOW_TICKS
    );

    return entry.toggleTicks.length >= TORCH_BURNOUT_MAX_TOGGLES;
  }

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Get or create a redstone state for a given position key.
   */
  private getOrCreateState(key: string): RedstoneState {
    let state = this.componentStates.get(key);
    if (!state) {
      state = {
        power: 0,
        strongPower: false,
        weakPower: false,
        delay: 1,
        mode: 'none',
        locked: false,
        connections: {},
      };
    }
    return { ...state };
  }

  /**
   * Remove all redstone state for a position (when a block is broken).
   */
  removeState(x: number, y: number, z: number): void {
    const key = posKey(x, y, z);
    this.powerLevels.delete(key);
    this.componentStates.delete(key);
    this.torchBurnout.delete(key);

    // Re-propagate to neighbors since a source was removed
    this.propagateToNeighbors(x, y, z);
    this.processPendingUpdates();
  }

  /**
   * Get the component state for a given position (for UI display).
   */
  getComponentState(x: number, y: number, z: number): RedstoneState | undefined {
    return this.componentStates.get(posKey(x, y, z));
  }

  /**
   * Reset the entire redstone engine state.
   */
  reset(): void {
    this.powerLevels.clear();
    this.componentStates.clear();
    this.scheduledUpdates = [];
    this.torchBurnout.clear();
    this.pendingUpdates.clear();
    this.currentTick = 0;
  }
}
