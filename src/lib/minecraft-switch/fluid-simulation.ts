// =============================================================================
// Fluid Simulation — Water & Lava Flow
// =============================================================================
// Simulates Minecraft-style fluid mechanics: water flows 7 blocks horizontally,
// lava flows 3 (overworld) or 7 (nether). Handles source/flowing distinction,
// fluid interactions (water + lava → obsidian/cobblestone/stone), block
// destruction by flowing water, infinite water source creation, and flow-toward-
// drop pathfinding. Tick-based with configurable max updates per tick.
// =============================================================================

import { Block, BlockId, type Dimension } from '@/types/minecraft-switch';
import { type ChunkedWorld } from './world-gen/chunk-world';

// =============================================================================
// Constants
// =============================================================================

/** Maximum horizontal spread for water (blocks from source). */
const WATER_MAX_DISTANCE = 7;

/** Maximum horizontal spread for lava in the Overworld. */
const LAVA_MAX_DISTANCE_OVERWORLD = 3;

/** Maximum horizontal spread for lava in the Nether. */
const LAVA_MAX_DISTANCE_NETHER = 7;

/** Tick interval for water updates (game ticks). */
const WATER_TICK_RATE = 5;

/** Tick interval for lava updates (game ticks). */
const LAVA_TICK_RATE = 30;

/** Maximum fluid updates processed per tick for performance. */
const MAX_UPDATES_PER_TICK = 65;

/** Flow level for a source block (strongest). */
const SOURCE_LEVEL = 0;

/** Flow level for the weakest flowing block. */
const MAX_FLOW_LEVEL = 7;

/** Maximum distance to search for a downward drop. */
const DROP_SEARCH_RADIUS = 4;

// =============================================================================
// Blocks destroyed by flowing water
// =============================================================================

const WATER_DESTROYABLE: Set<number> = new Set([
  Block.TallGrass,
  Block.Fern,
  Block.DeadBush,
  Block.Dandelion,
  Block.Poppy,
  Block.BlueOrchid,
  Block.Allium,
  Block.AzureBluet,
  Block.RedTulip,
  Block.OrangeTulip,
  Block.WhiteTulip,
  Block.PinkTulip,
  Block.OxeyeDaisy,
  Block.Sunflower,
  Block.Lilac,
  Block.Peony,
  Block.RoseBush,
  Block.Torch,
  Block.RedstoneTorch,
  Block.RedstoneTorch_Wall,
  Block.RedstoneDust,
  Block.Rail,
  Block.PoweredRail,
  Block.DetectorRail,
  Block.ActivatorRail,
  Block.Wheat,
  Block.Carrots,
  Block.Potatoes,
  Block.Beetroots,
  Block.Carpet,
  Block.SnowLayer,
  Block.SweetBerryBush,
  Block.BrownMushroom,
  Block.RedMushroom,
  Block.Cobweb,
]);

// =============================================================================
// Blocks that fluids cannot flow through (solid or special)
// =============================================================================

/**
 * Check if a block is solid and blocks fluid flow.
 * Air, fluids, and destroyable blocks allow flow.
 */
function blocksFluidFlow(blockId: number): boolean {
  if (blockId === Block.Air) return false;
  if (isFluidBlock(blockId)) return false;
  if (WATER_DESTROYABLE.has(blockId)) return false;
  // All other non-air blocks are solid
  return true;
}

/**
 * Check if a block is any fluid (water or lava, source or flowing).
 */
function isFluidBlock(blockId: number): boolean {
  return (
    blockId === Block.Water ||
    blockId === Block.StillWater ||
    blockId === Block.Lava ||
    blockId === Block.StillLava
  );
}

/**
 * Check if a block is a water block (source or still).
 */
function isWaterBlock(blockId: number): boolean {
  return blockId === Block.Water || blockId === Block.StillWater;
}

/**
 * Check if a block is a lava block (source or still).
 */
function isLavaBlock(blockId: number): boolean {
  return blockId === Block.Lava || blockId === Block.StillLava;
}

// =============================================================================
// Fluid Update Queue Entry
// =============================================================================

interface FluidUpdate {
  x: number;
  y: number;
  z: number;
  /** Tick at which this update should be processed. */
  scheduledTick: number;
}

// =============================================================================
// FluidSimulator Class
// =============================================================================

/**
 * FluidSimulator handles water and lava flow within a ChunkedWorld.
 *
 * Key mechanics:
 * - Water spreads 7 blocks horizontally from source, flows down instantly
 * - Lava spreads 3 blocks in Overworld, 7 in Nether
 * - Two water sources meeting create a new source (infinite water)
 * - Water + lava interactions produce obsidian, cobblestone, or stone
 * - Flowing water destroys certain non-solid blocks
 * - Flow direction calculated by finding shortest path to a downward drop
 *
 * Usage:
 * ```
 * const sim = new FluidSimulator(world, 'overworld');
 * sim.scheduleFluidUpdate(x, y, z);
 * // In game loop:
 * sim.tick();
 * ```
 */
export class FluidSimulator {
  /** Reference to the world for block access. */
  private world: ChunkedWorld;

  /** Current dimension (affects lava flow distance). */
  private dimension: Dimension;

  /** Queue of pending fluid updates, sorted by scheduled tick. */
  private updateQueue: FluidUpdate[] = [];

  /** Current game tick counter. */
  private currentTick: number = 0;

  /**
   * Flow level data stored per-block.
   * Key: "x,y,z" → flow level (0 = source, 1-7 = flowing strength)
   * Only flowing blocks have entries; source blocks are always level 0.
   */
  private flowLevels: Map<string, number> = new Map();

  constructor(world: ChunkedWorld, dimension: Dimension = 'overworld') {
    this.world = world;
    this.dimension = dimension;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Schedule a fluid update at the given position.
   * The update will be processed after the appropriate delay
   * (5 ticks for water, 30 ticks for lava).
   */
  scheduleFluidUpdate(x: number, y: number, z: number): void {
    const block = this.world.getBlock(x, y, z);
    let delay = WATER_TICK_RATE;

    if (isLavaBlock(block)) {
      delay = LAVA_TICK_RATE;
    }

    const scheduledTick = this.currentTick + delay;

    // Avoid duplicate updates
    const key = `${x},${y},${z}`;
    const exists = this.updateQueue.some(
      u => u.x === x && u.y === y && u.z === z && u.scheduledTick === scheduledTick,
    );
    if (exists) return;

    this.updateQueue.push({ x, y, z, scheduledTick });
  }

  /**
   * Process queued fluid updates for the current tick.
   * Processes at most MAX_UPDATES_PER_TICK updates per call.
   * Should be called once per game tick.
   */
  tick(): void {
    this.currentTick++;

    // Sort by scheduled tick (earliest first)
    this.updateQueue.sort((a, b) => a.scheduledTick - b.scheduledTick);

    let processed = 0;
    const remaining: FluidUpdate[] = [];

    for (const update of this.updateQueue) {
      if (update.scheduledTick > this.currentTick) {
        remaining.push(update);
        continue;
      }

      if (processed >= MAX_UPDATES_PER_TICK) {
        remaining.push(update);
        continue;
      }

      this.processFluidUpdate(update.x, update.y, update.z);
      processed++;
    }

    this.updateQueue = remaining;
  }

  /**
   * Respond to a block change at the given position.
   * Schedules fluid updates for the changed block and all neighbors.
   *
   * @param x Block X position
   * @param y Block Y position
   * @param z Block Z position
   * @param oldBlock Previous block at this position
   * @param newBlock New block at this position
   */
  onBlockChange(
    x: number,
    y: number,
    z: number,
    oldBlock: BlockId,
    newBlock: BlockId,
  ): void {
    // If a fluid was removed, update neighbors
    if (isFluidBlock(oldBlock) && !isFluidBlock(newBlock)) {
      this.flowLevels.delete(`${x},${y},${z}`);
      this.scheduleNeighborUpdates(x, y, z);
    }

    // If a fluid was placed, schedule its update
    if (isFluidBlock(newBlock)) {
      this.scheduleFluidUpdate(x, y, z);
    }

    // If a solid block was removed adjacent to fluid, trigger flow
    if (blocksFluidFlow(oldBlock) && !blocksFluidFlow(newBlock)) {
      this.scheduleNeighborUpdates(x, y, z);
    }

    // If a solid block was placed adjacent to fluid, trigger removal
    if (!blocksFluidFlow(oldBlock) && blocksFluidFlow(newBlock)) {
      this.scheduleNeighborUpdates(x, y, z);
    }

    // Check for fluid interactions at this position
    this.checkFluidInteractions(x, y, z);
  }

  /**
   * Check if a block at the given position is a fluid source.
   */
  isFluidSource(blockId: BlockId): boolean {
    return (
      blockId === (Block.Water as BlockId) ||
      blockId === (Block.StillWater as BlockId) ||
      blockId === (Block.Lava as BlockId) ||
      blockId === (Block.StillLava as BlockId)
    );
  }

  /**
   * Check if a block is flowing (non-source fluid).
   * In our simplified model, we track flow levels separately.
   * A block is "flowing" if it has a flow level > 0 in our map.
   */
  isFluidFlowing(blockId: BlockId): boolean {
    if (!isFluidBlock(blockId)) return false;
    // Source blocks that don't have a flow level entry are sources
    // This is a simplification — in practice, check the flow level map
    return false; // Needs position context; see getFluidLevel()
  }

  /**
   * Get the flow level at a position.
   * 0 = source block (strongest), 7 = weakest flow.
   * Returns -1 if no fluid at this position.
   */
  getFluidLevel(x: number, y: number, z: number): number {
    const block = this.world.getBlock(x, y, z);
    if (!isFluidBlock(block)) return -1;

    const key = `${x},${y},${z}`;
    const level = this.flowLevels.get(key);
    if (level !== undefined) return level;

    // No flow level entry = source block
    return SOURCE_LEVEL;
  }

  /**
   * Set the current dimension (affects lava flow range).
   */
  setDimension(dimension: Dimension): void {
    this.dimension = dimension;
  }

  /**
   * Get the maximum flow distance for lava based on current dimension.
   */
  getLavaMaxDistance(): number {
    return this.dimension === 'nether'
      ? LAVA_MAX_DISTANCE_NETHER
      : LAVA_MAX_DISTANCE_OVERWORLD;
  }

  // ---------------------------------------------------------------------------
  // Internal: Fluid Update Processing
  // ---------------------------------------------------------------------------

  /**
   * Process a single fluid update at the given position.
   * Handles spreading, flowing down, and removal of flows without sources.
   */
  private processFluidUpdate(x: number, y: number, z: number): void {
    const block = this.world.getBlock(x, y, z);

    if (!isFluidBlock(block)) {
      // Block was replaced since update was scheduled
      this.flowLevels.delete(`${x},${y},${z}`);
      return;
    }

    const isWater = isWaterBlock(block);
    const currentLevel = this.getFluidLevel(x, y, z);
    const maxDistance = isWater ? WATER_MAX_DISTANCE : this.getLavaMaxDistance();

    // --- Check for source creation (water only) ---
    if (isWater && currentLevel > SOURCE_LEVEL) {
      if (this.canBecomeSource(x, y, z)) {
        this.setFluidLevel(x, y, z, SOURCE_LEVEL, true);
        return;
      }
    }

    // --- Check if this flowing block still has a valid source ---
    if (currentLevel > SOURCE_LEVEL) {
      const effectiveLevel = this.computeEffectiveLevel(x, y, z, isWater, maxDistance);
      if (effectiveLevel < 0) {
        // No valid source feeds this block — remove it
        this.world.setBlock(x, y, z, Block.Air as BlockId);
        this.flowLevels.delete(`${x},${y},${z}`);
        this.scheduleNeighborUpdates(x, y, z);
        return;
      }
      if (effectiveLevel !== currentLevel) {
        this.setFluidLevel(x, y, z, effectiveLevel, isWater);
      }
    }

    // --- Flow downward ---
    if (y > 0) {
      const below = this.world.getBlock(x, y - 1, z);
      if (below === Block.Air || WATER_DESTROYABLE.has(below)) {
        // Destroy breakable block
        if (WATER_DESTROYABLE.has(below) && isWater) {
          // Water destroys the block
        }
        const fluidBlock = isWater
          ? Block.Water as BlockId
          : Block.Lava as BlockId;
        this.world.setBlock(x, y - 1, z, fluidBlock);
        // Flowing down resets to source-strength
        this.setFluidLevel(x, y - 1, z, SOURCE_LEVEL, isWater);
        this.scheduleFluidUpdate(x, y - 1, z);
        this.checkFluidInteractions(x, y - 1, z);
        return; // Prioritize downward flow
      }

      // Check for fluid interactions when flowing down
      if (isWater && isLavaBlock(below)) {
        this.handleWaterLavaInteraction(x, y - 1, z, true);
        return;
      }
      if (!isWater && isWaterBlock(below)) {
        this.handleLavaWaterInteraction(x, y - 1, z);
        return;
      }
    }

    // --- Horizontal spread ---
    if (currentLevel >= maxDistance) return; // Too weak to spread further

    const nextLevel = currentLevel + 1;

    // Calculate preferred flow directions (toward drops)
    const preferredDirs = this.calculateFlowDirections(x, y, z, isWater, maxDistance);

    const horizontalDirs = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 0, dz: -1 },
    ];

    for (const dir of horizontalDirs) {
      const nx = x + dir.dx;
      const nz = z + dir.dz;
      const neighborBlock = this.world.getBlock(nx, y, nz);

      // Skip solid blocks
      if (blocksFluidFlow(neighborBlock)) continue;

      // If preferred directions exist, only flow in those directions
      if (preferredDirs.length > 0) {
        const isPreferred = preferredDirs.some(d => d.dx === dir.dx && d.dz === dir.dz);
        if (!isPreferred) continue;
      }

      // Check for fluid interactions
      if (isWater && isLavaBlock(neighborBlock)) {
        this.handleWaterLavaInteraction(nx, y, nz, false);
        continue;
      }
      if (!isWater && isWaterBlock(neighborBlock)) {
        this.handleLavaWaterInteraction(nx, y, nz);
        continue;
      }

      // Can flow into this position?
      if (neighborBlock === Block.Air || WATER_DESTROYABLE.has(neighborBlock)) {
        // Destroy breakable blocks under water
        if (WATER_DESTROYABLE.has(neighborBlock) && isWater) {
          // Block destroyed by water
        }

        const existingLevel = this.getFluidLevel(nx, y, nz);

        // Only flow if we're providing a stronger source
        if (existingLevel < 0 || existingLevel > nextLevel) {
          const fluidBlock = isWater
            ? Block.Water as BlockId
            : Block.Lava as BlockId;
          this.world.setBlock(nx, y, nz, fluidBlock);
          this.setFluidLevel(nx, y, nz, nextLevel, isWater);
          this.scheduleFluidUpdate(nx, y, nz);
          this.checkFluidInteractions(nx, y, nz);
        }
      } else if (isFluidBlock(neighborBlock)) {
        // Same fluid type: possibly update flow level
        const isSameType = (isWater && isWaterBlock(neighborBlock)) ||
                          (!isWater && isLavaBlock(neighborBlock));
        if (isSameType) {
          const existingLevel = this.getFluidLevel(nx, y, nz);
          if (existingLevel > nextLevel) {
            this.setFluidLevel(nx, y, nz, nextLevel, isWater);
            this.scheduleFluidUpdate(nx, y, nz);
          }
        }
      }
    }
  }

  /**
   * Check if a flowing water block can become a new source block.
   * Two adjacent water source blocks create a new source (infinite water).
   */
  private canBecomeSource(x: number, y: number, z: number): boolean {
    let adjacentSources = 0;

    const dirs = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 0, dz: -1 },
    ];

    for (const dir of dirs) {
      const nx = x + dir.dx;
      const nz = z + dir.dz;
      const block = this.world.getBlock(nx, y, nz);

      if (isWaterBlock(block)) {
        const level = this.getFluidLevel(nx, y, nz);
        if (level === SOURCE_LEVEL) {
          adjacentSources++;
        }
      }
    }

    // Two or more adjacent source blocks create a new source
    return adjacentSources >= 2;
  }

  /**
   * Compute what flow level a position should have based on neighbors.
   * Returns the lowest (strongest) level from adjacent fluid blocks minus 1.
   * Returns -1 if no valid adjacent source/flow feeds this block.
   */
  private computeEffectiveLevel(
    x: number,
    y: number,
    z: number,
    isWater: boolean,
    maxDistance: number,
  ): number {
    let bestLevel = MAX_FLOW_LEVEL + 1;

    // Check for fluid above (feeds as source-strength)
    const above = this.world.getBlock(x, y + 1, z);
    if ((isWater && isWaterBlock(above)) || (!isWater && isLavaBlock(above))) {
      return SOURCE_LEVEL; // Fed from above = source strength
    }

    // Check horizontal neighbors
    const dirs = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 0, dz: -1 },
    ];

    for (const dir of dirs) {
      const nx = x + dir.dx;
      const nz = z + dir.dz;
      const block = this.world.getBlock(nx, y, nz);

      const isSameFluid = (isWater && isWaterBlock(block)) ||
                         (!isWater && isLavaBlock(block));

      if (isSameFluid) {
        const neighborLevel = this.getFluidLevel(nx, y, nz);
        const flowedLevel = neighborLevel + 1;
        if (flowedLevel < bestLevel) {
          bestLevel = flowedLevel;
        }
      }
    }

    if (bestLevel > maxDistance) return -1; // No valid source
    return bestLevel;
  }

  // ---------------------------------------------------------------------------
  // Flow Direction Calculation
  // ---------------------------------------------------------------------------

  /**
   * Calculate preferred flow directions by finding the shortest path
   * to a downward drop within DROP_SEARCH_RADIUS blocks.
   * This creates the "water flows toward holes" behavior.
   *
   * If no drop is found, returns empty array (spread evenly).
   */
  private calculateFlowDirections(
    x: number,
    y: number,
    z: number,
    isWater: boolean,
    maxDistance: number,
  ): { dx: number; dz: number }[] {
    const horizontalDirs = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 0, dz: -1 },
    ];

    let bestDistance = DROP_SEARCH_RADIUS + 1;
    const bestDirs: { dx: number; dz: number }[] = [];

    for (const dir of horizontalDirs) {
      const dist = this.findDropDistance(x, y, z, dir.dx, dir.dz, maxDistance);
      if (dist < 0) continue;

      if (dist < bestDistance) {
        bestDistance = dist;
        bestDirs.length = 0;
        bestDirs.push(dir);
      } else if (dist === bestDistance) {
        bestDirs.push(dir);
      }
    }

    return bestDirs;
  }

  /**
   * BFS in a single direction to find how far a downward drop is.
   * Returns the distance to the nearest drop, or -1 if none found.
   */
  private findDropDistance(
    startX: number,
    startY: number,
    startZ: number,
    dx: number,
    dz: number,
    maxDistance: number,
  ): number {
    const searchDist = Math.min(DROP_SEARCH_RADIUS, maxDistance);

    for (let dist = 1; dist <= searchDist; dist++) {
      const checkX = startX + dx * dist;
      const checkZ = startZ + dz * dist;

      // Check if the path is clear
      const block = this.world.getBlock(checkX, startY, checkZ);
      if (blocksFluidFlow(block)) return -1; // Blocked

      // Check for a drop (air or non-solid below)
      if (startY > 0) {
        const below = this.world.getBlock(checkX, startY - 1, checkZ);
        if (!blocksFluidFlow(below) && !isFluidBlock(below)) {
          return dist; // Found a drop
        }
      }
    }

    return -1; // No drop found
  }

  // ---------------------------------------------------------------------------
  // Fluid Interactions
  // ---------------------------------------------------------------------------

  /**
   * Check for and handle fluid interactions at a position.
   * Called when a fluid block is placed or flows into a new position.
   */
  private checkFluidInteractions(x: number, y: number, z: number): void {
    const block = this.world.getBlock(x, y, z);

    if (isWaterBlock(block)) {
      // Check if water is adjacent to lava
      this.checkAdjacentInteraction(x, y, z, true);
    } else if (isLavaBlock(block)) {
      // Check if lava is adjacent to water
      this.checkAdjacentInteraction(x, y, z, false);
    }
  }

  /**
   * Check all adjacent blocks for fluid interactions.
   */
  private checkAdjacentInteraction(
    x: number,
    y: number,
    z: number,
    isWater: boolean,
  ): void {
    const neighbors = [
      { dx: 1, dy: 0, dz: 0 },
      { dx: -1, dy: 0, dz: 0 },
      { dx: 0, dy: 0, dz: 1 },
      { dx: 0, dy: 0, dz: -1 },
      { dx: 0, dy: 1, dz: 0 },
      { dx: 0, dy: -1, dz: 0 },
    ];

    for (const n of neighbors) {
      const nx = x + n.dx;
      const ny = y + n.dy;
      const nz = z + n.dz;
      const neighborBlock = this.world.getBlock(nx, ny, nz);

      if (isWater && isLavaBlock(neighborBlock)) {
        const lavaIsSource = this.getFluidLevel(nx, ny, nz) === SOURCE_LEVEL;
        this.handleWaterLavaInteraction(nx, ny, nz, lavaIsSource);
      } else if (!isWater && isWaterBlock(neighborBlock)) {
        this.handleLavaWaterInteraction(x, y, z);
      }
    }
  }

  /**
   * Handle water touching lava.
   * - Water + lava source = obsidian (replaces lava)
   * - Water + flowing lava = cobblestone (replaces lava)
   */
  private handleWaterLavaInteraction(
    lavaX: number,
    lavaY: number,
    lavaZ: number,
    isLavaSource: boolean,
  ): void {
    if (isLavaSource) {
      // Lava source + water = obsidian
      this.world.setBlock(lavaX, lavaY, lavaZ, Block.Obsidian as BlockId);
    } else {
      // Flowing lava + water = cobblestone
      this.world.setBlock(lavaX, lavaY, lavaZ, Block.Cobblestone as BlockId);
    }

    this.flowLevels.delete(`${lavaX},${lavaY},${lavaZ}`);
    this.scheduleNeighborUpdates(lavaX, lavaY, lavaZ);
  }

  /**
   * Handle lava flowing into water.
   * Lava + flowing water = stone (replaces water)
   * This is also how basalt forms in basalt deltas.
   */
  private handleLavaWaterInteraction(
    waterX: number,
    waterY: number,
    waterZ: number,
  ): void {
    // In basalt deltas biome, this would produce basalt
    // For simplicity, always produce stone
    this.world.setBlock(waterX, waterY, waterZ, Block.Stone as BlockId);
    this.flowLevels.delete(`${waterX},${waterY},${waterZ}`);
    this.scheduleNeighborUpdates(waterX, waterY, waterZ);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Set the flow level for a position and update the world block if needed.
   */
  private setFluidLevel(
    x: number,
    y: number,
    z: number,
    level: number,
    isWater: boolean,
  ): void {
    const key = `${x},${y},${z}`;

    if (level === SOURCE_LEVEL) {
      // Source block
      this.flowLevels.delete(key);
      // Ensure the block is set to the source variant
      const sourceBlock = isWater
        ? Block.Water as BlockId
        : Block.Lava as BlockId;
      this.world.setBlock(x, y, z, sourceBlock);
    } else {
      this.flowLevels.set(key, level);
      // Block stays the same type (Water or Lava)
      // Level is tracked in the flowLevels map
    }
  }

  /**
   * Schedule fluid updates for all 6 neighbors of a position.
   */
  private scheduleNeighborUpdates(x: number, y: number, z: number): void {
    const neighbors = [
      { dx: 1, dy: 0, dz: 0 },
      { dx: -1, dy: 0, dz: 0 },
      { dx: 0, dy: 0, dz: 1 },
      { dx: 0, dy: 0, dz: -1 },
      { dx: 0, dy: 1, dz: 0 },
      { dx: 0, dy: -1, dz: 0 },
    ];

    for (const n of neighbors) {
      const nx = x + n.dx;
      const ny = y + n.dy;
      const nz = z + n.dz;

      if (ny < 0 || ny >= 256) continue;

      const block = this.world.getBlock(nx, ny, nz);
      if (isFluidBlock(block)) {
        this.scheduleFluidUpdate(nx, ny, nz);
      }
    }
  }
}
