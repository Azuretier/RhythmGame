// =============================================================================
// Piston Mechanics — Push, Pull, and Slime Block Chain
// =============================================================================
// Implements piston extension and retraction with full block pushing mechanics,
// slime block chaining, immovable/pushable block classification, and the 12-block
// push limit. Handles both regular and sticky pistons, including sticky piston
// pulling with slime block chain resolution.
// =============================================================================

import type { BlockId } from '@/types/minecraft-switch';
import { Block, MS_CONFIG } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of blocks a piston can push at once. */
const PUSH_LIMIT = MS_CONFIG.PISTON_PUSH_LIMIT; // 12

// =============================================================================
// TYPES
// =============================================================================

/** 3D coordinate tuple. */
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Cardinal direction for piston facing. */
export type PistonDirection = 'up' | 'down' | 'north' | 'south' | 'east' | 'west';

/** Direction vectors for each piston facing. */
const DIRECTION_VECTORS: Record<PistonDirection, { x: number; y: number; z: number }> = {
  up:    { x: 0, y: 1, z: 0 },
  down:  { x: 0, y: -1, z: 0 },
  north: { x: 0, y: 0, z: -1 },
  south: { x: 0, y: 0, z: 1 },
  east:  { x: 1, y: 0, z: 0 },
  west:  { x: -1, y: 0, z: 0 },
};

/** Opposite direction mapping. */
const OPPOSITE_DIRECTION: Record<PistonDirection, PistonDirection> = {
  up: 'down',
  down: 'up',
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

/** Result of a piston push or pull attempt. */
export interface PistonResult {
  /** Whether the operation succeeded. */
  success: boolean;
  /** Blocks that were moved (from -> to positions). */
  movedBlocks: { fromX: number; fromY: number; fromZ: number; toX: number; toY: number; toZ: number; blockId: BlockId }[];
  /** Blocks that were destroyed (e.g., plants, torches pushed into). */
  destroyedBlocks: { x: number; y: number; z: number; blockId: BlockId }[];
}

// =============================================================================
// BLOCK CLASSIFICATION
// =============================================================================

/**
 * Blocks that cannot be pushed or pulled by pistons under any circumstances.
 * These include bedrock, obsidian, end portal frame, enchanting table,
 * ender chest, spawner, command block, structure block, barrier, and
 * other immovable blocks.
 */
export function isImmovable(blockId: BlockId): boolean {
  return (
    blockId === Block.Bedrock ||
    blockId === Block.Obsidian ||
    blockId === Block.CryingObsidian ||
    blockId === Block.EnchantingTable ||
    blockId === Block.EnderChest ||
    blockId === Block.EndPortalFrame ||
    blockId === Block.EndPortal ||
    blockId === Block.EndGateway ||
    blockId === Block.Spawner ||
    blockId === Block.CommandBlock ||
    blockId === Block.StructureBlock ||
    blockId === Block.Barrier ||
    blockId === Block.Beacon ||
    blockId === Block.Conduit ||
    blockId === Block.Anvil ||
    blockId === Block.ChippedAnvil ||
    blockId === Block.DamagedAnvil ||
    blockId === Block.Chest ||       // Chests are immovable
    blockId === Block.TrappedChest ||
    blockId === Block.Hopper ||
    blockId === Block.Dispenser ||
    blockId === Block.Dropper ||
    blockId === Block.Furnace ||
    blockId === Block.BlastFurnace ||
    blockId === Block.Smoker ||
    blockId === Block.BrewingStand ||
    blockId === Block.RespawnAnchor ||
    blockId === Block.Lodestone ||
    blockId === Block.Jukebox ||
    blockId === Block.NoteBlock ||
    blockId === Block.Piston ||       // Extended pistons are immovable
    blockId === Block.StickyPiston
  );
}

/**
 * Check if a block can be pushed by a piston. Most blocks are pushable.
 * Returns false for immovable blocks and air (nothing to push).
 */
export function isPushable(blockId: BlockId): boolean {
  if (blockId === Block.Air) return false;
  if (isImmovable(blockId)) return false;
  return true;
}

/**
 * Blocks that are destroyed (dropped as items) when pushed by a piston
 * rather than being moved. These include plants, torches, redstone components, etc.
 */
function isDestroyedByPush(blockId: BlockId): boolean {
  return (
    // Plants and vegetation
    blockId === Block.TallGrass ||
    blockId === Block.Fern ||
    blockId === Block.DeadBush ||
    blockId === Block.Dandelion ||
    blockId === Block.Poppy ||
    blockId === Block.BlueOrchid ||
    blockId === Block.Allium ||
    blockId === Block.AzureBluet ||
    blockId === Block.RedTulip ||
    blockId === Block.OrangeTulip ||
    blockId === Block.WhiteTulip ||
    blockId === Block.PinkTulip ||
    blockId === Block.OxeyeDaisy ||
    blockId === Block.Sunflower ||
    blockId === Block.Lilac ||
    blockId === Block.Peony ||
    blockId === Block.RoseBush ||
    blockId === Block.SugarCane ||
    blockId === Block.Vine ||
    blockId === Block.LilyPad ||
    blockId === Block.BrownMushroom ||
    blockId === Block.RedMushroom ||
    blockId === Block.Cobweb ||
    blockId === Block.SweetBerryBush ||
    // Crops
    blockId === Block.Wheat ||
    blockId === Block.Carrots ||
    blockId === Block.Potatoes ||
    blockId === Block.Beetroots ||
    blockId === Block.NetherWart ||
    blockId === Block.Cocoa ||
    // Torches and lighting
    blockId === Block.Torch ||
    blockId === Block.RedstoneTorch ||
    blockId === Block.RedstoneTorch_Wall ||
    // Redstone components
    blockId === Block.RedstoneDust ||
    blockId === Block.RedstoneRepeater ||
    blockId === Block.RedstoneComparator ||
    blockId === Block.Lever ||
    blockId === Block.StoneButton ||
    blockId === Block.OakButton ||
    blockId === Block.SpruceButton ||
    blockId === Block.BirchButton ||
    blockId === Block.JungleButton ||
    blockId === Block.AcaciaButton ||
    blockId === Block.DarkOakButton ||
    blockId === Block.TripwireHook ||
    // Pressure plates
    blockId === Block.StonePressurePlate ||
    blockId === Block.OakPressurePlate ||
    blockId === Block.SprucePressurePlate ||
    blockId === Block.BirchPressurePlate ||
    blockId === Block.JunglePressurePlate ||
    blockId === Block.AcaciaPressurePlate ||
    blockId === Block.DarkOakPressurePlate ||
    blockId === Block.WeightedPressurePlateLight ||
    blockId === Block.WeightedPressurePlateHeavy ||
    // Snow
    blockId === Block.SnowLayer ||
    blockId === Block.Snow ||
    // Misc
    blockId === Block.Ladder ||
    blockId === Block.Sign ||
    blockId === Block.WallSign ||
    blockId === Block.ItemFrame ||
    blockId === Block.Painting ||
    blockId === Block.Carpet ||
    blockId === Block.Banner ||
    blockId === Block.Scaffolding ||
    blockId === Block.TurtleEgg ||
    blockId === Block.Bell ||
    // Coral
    blockId === Block.Kelp ||
    blockId === Block.SeaGrass ||
    blockId === Block.TallSeaGrass ||
    blockId === Block.SeaPickle
  );
}

/**
 * Check if a block is a slime block (sticky, chains to adjacent blocks).
 */
function isSlimeBlock(blockId: BlockId): boolean {
  return blockId === Block.SlimeBlock;
}

/**
 * Check if a block is a honey block (sticky, but doesn't stick to slime blocks).
 */
function isHoneyBlock(blockId: BlockId): boolean {
  return blockId === Block.HoneyBlock;
}

/**
 * Check if two blocks are sticky-compatible (can chain together).
 * Slime blocks stick to everything except honey blocks.
 * Honey blocks stick to everything except slime blocks.
 */
function sticksTo(blockA: BlockId, blockB: BlockId): boolean {
  if (isSlimeBlock(blockA) && isHoneyBlock(blockB)) return false;
  if (isHoneyBlock(blockA) && isSlimeBlock(blockB)) return false;
  return isSlimeBlock(blockA) || isSlimeBlock(blockB) || isHoneyBlock(blockA) || isHoneyBlock(blockB);
}

// =============================================================================
// PISTON ENGINE
// =============================================================================

/**
 * Handles piston push and pull mechanics including block movement,
 * slime block chaining, and the 12-block push limit.
 */
export class PistonEngine {
  /** Reference to the world for block operations. */
  private world: ChunkedWorld;

  constructor(world: ChunkedWorld) {
    this.world = world;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Attempt to extend a piston at the given position in the given direction.
   *
   * Collects all pushable blocks in the push direction (including slime block
   * chains), checks for immovable blocks, and moves everything one position
   * forward if valid. Places the piston head in the space vacated.
   *
   * @param x - Piston X position
   * @param y - Piston Y position
   * @param z - Piston Z position
   * @param direction - Direction the piston faces
   * @returns PistonResult with success status and moved/destroyed blocks
   */
  tryPush(x: number, y: number, z: number, direction: PistonDirection): PistonResult {
    const dir = DIRECTION_VECTORS[direction];

    // Collect all blocks that need to be pushed
    const collectResult = this.collectPushableBlocks(x, y, z, direction);

    if (!collectResult.success) {
      return { success: false, movedBlocks: [], destroyedBlocks: [] };
    }

    const { blocksToMove, blocksToDestroy } = collectResult;
    const movedBlocks: PistonResult['movedBlocks'] = [];
    const destroyedBlocks: PistonResult['destroyedBlocks'] = [];

    // Destroy breakable blocks first
    for (const pos of blocksToDestroy) {
      const blockId = this.world.getBlock(pos.x, pos.y, pos.z);
      destroyedBlocks.push({ x: pos.x, y: pos.y, z: pos.z, blockId });
      this.world.setBlock(pos.x, pos.y, pos.z, Block.Air as BlockId);
    }

    // Move blocks from furthest to nearest (to avoid overwriting)
    // Sort by distance from piston (furthest first)
    const sortedBlocks = [...blocksToMove].sort((a, b) => {
      const distA = Math.abs(a.x - x) + Math.abs(a.y - y) + Math.abs(a.z - z);
      const distB = Math.abs(b.x - x) + Math.abs(b.y - y) + Math.abs(b.z - z);
      return distB - distA;
    });

    for (const pos of sortedBlocks) {
      const blockId = this.world.getBlock(pos.x, pos.y, pos.z);
      const newX = pos.x + dir.x;
      const newY = pos.y + dir.y;
      const newZ = pos.z + dir.z;

      // Move block to new position
      this.world.setBlock(newX, newY, newZ, blockId);
      this.world.setBlock(pos.x, pos.y, pos.z, Block.Air as BlockId);

      movedBlocks.push({
        fromX: pos.x, fromY: pos.y, fromZ: pos.z,
        toX: newX, toY: newY, toZ: newZ,
        blockId,
      });
    }

    // Place piston head in front of the piston
    // (In a full implementation this would be a special "piston_head" block)
    // For now, we represent the extended state by setting the block
    const headX = x + dir.x;
    const headY = y + dir.y;
    const headZ = z + dir.z;

    // The piston head position should now be air (cleared by block moves)
    // Set it to a placeholder (piston block itself, or could be a separate block ID)
    this.world.setBlock(headX, headY, headZ, Block.Air as BlockId);

    return { success: true, movedBlocks, destroyedBlocks };
  }

  /**
   * Attempt to retract a piston at the given position.
   *
   * Regular pistons just retract the head.
   * Sticky pistons attempt to pull the block in front of the head back
   * one position (including slime block chains).
   *
   * @param x - Piston X position
   * @param y - Piston Y position
   * @param z - Piston Z position
   * @param direction - Direction the piston faces
   * @param isSticky - Whether this is a sticky piston
   * @returns PistonResult with success status and moved blocks
   */
  tryPull(
    x: number,
    y: number,
    z: number,
    direction: PistonDirection,
    isSticky: boolean = false
  ): PistonResult {
    const dir = DIRECTION_VECTORS[direction];
    const oppositeDir = OPPOSITE_DIRECTION[direction];
    const movedBlocks: PistonResult['movedBlocks'] = [];
    const destroyedBlocks: PistonResult['destroyedBlocks'] = [];

    // Remove the piston head (one block in front of the piston)
    const headX = x + dir.x;
    const headY = y + dir.y;
    const headZ = z + dir.z;
    this.world.setBlock(headX, headY, headZ, Block.Air as BlockId);

    if (!isSticky) {
      // Regular piston: just retract head, done
      return { success: true, movedBlocks, destroyedBlocks };
    }

    // Sticky piston: try to pull the block(s) in front of the head
    const pullX = headX + dir.x;
    const pullY = headY + dir.y;
    const pullZ = headZ + dir.z;

    const pullBlock = this.world.getBlock(pullX, pullY, pullZ);

    // Can't pull air or immovable blocks
    if (pullBlock === Block.Air || isImmovable(pullBlock)) {
      return { success: true, movedBlocks, destroyedBlocks };
    }

    // Blocks destroyed by push are also not pullable
    if (isDestroyedByPush(pullBlock)) {
      return { success: true, movedBlocks, destroyedBlocks };
    }

    // If the pulled block is a slime/honey block, collect the chain
    if (isSlimeBlock(pullBlock) || isHoneyBlock(pullBlock)) {
      const chain = this.collectStickyChain(pullX, pullY, pullZ, oppositeDir);

      if (!chain.success) {
        // Can't pull the chain (immovable block in the way or too many blocks)
        return { success: true, movedBlocks, destroyedBlocks };
      }

      // Move chain blocks (nearest first for pulling)
      const sortedChain = [...chain.blocksToMove].sort((a, b) => {
        const distA = Math.abs(a.x - pullX) + Math.abs(a.y - pullY) + Math.abs(a.z - pullZ);
        const distB = Math.abs(b.x - pullX) + Math.abs(b.y - pullY) + Math.abs(b.z - pullZ);
        return distA - distB;
      });

      for (const pos of sortedChain) {
        const blockId = this.world.getBlock(pos.x, pos.y, pos.z);
        const newX = pos.x - dir.x;
        const newY = pos.y - dir.y;
        const newZ = pos.z - dir.z;

        this.world.setBlock(newX, newY, newZ, blockId);
        this.world.setBlock(pos.x, pos.y, pos.z, Block.Air as BlockId);

        movedBlocks.push({
          fromX: pos.x, fromY: pos.y, fromZ: pos.z,
          toX: newX, toY: newY, toZ: newZ,
          blockId,
        });
      }

      // Destroy breakable blocks in the chain
      for (const pos of chain.blocksToDestroy) {
        const blockId = this.world.getBlock(pos.x, pos.y, pos.z);
        destroyedBlocks.push({ x: pos.x, y: pos.y, z: pos.z, blockId });
        this.world.setBlock(pos.x, pos.y, pos.z, Block.Air as BlockId);
      }
    } else {
      // Simple single block pull
      const blockId = this.world.getBlock(pullX, pullY, pullZ);
      this.world.setBlock(headX, headY, headZ, blockId);
      this.world.setBlock(pullX, pullY, pullZ, Block.Air as BlockId);

      movedBlocks.push({
        fromX: pullX, fromY: pullY, fromZ: pullZ,
        toX: headX, toY: headY, toZ: headZ,
        blockId,
      });
    }

    return { success: true, movedBlocks, destroyedBlocks };
  }

  // ---------------------------------------------------------------------------
  // BLOCK COLLECTION (Push)
  // ---------------------------------------------------------------------------

  /**
   * Collect all blocks that would be pushed by a piston extending.
   * Handles slime block chaining recursively with the 12-block limit.
   */
  private collectPushableBlocks(
    pistonX: number,
    pistonY: number,
    pistonZ: number,
    direction: PistonDirection
  ): { success: boolean; blocksToMove: Vec3[]; blocksToDestroy: Vec3[] } {
    const dir = DIRECTION_VECTORS[direction];

    const blocksToMove: Vec3[] = [];
    const blocksToDestroy: Vec3[] = [];
    const visited = new Set<string>();

    // Start from the first block in front of the piston
    const startX = pistonX + dir.x;
    const startY = pistonY + dir.y;
    const startZ = pistonZ + dir.z;

    const queue: Vec3[] = [{ x: startX, y: startY, z: startZ }];

    while (queue.length > 0) {
      const pos = queue.shift()!;
      const key = `${pos.x},${pos.y},${pos.z}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const blockId = this.world.getBlock(pos.x, pos.y, pos.z);

      // Air: nothing to push
      if (blockId === Block.Air) continue;

      // Check bounds
      if (!this.world.isYInBounds(pos.y)) {
        return { success: false, blocksToMove: [], blocksToDestroy: [] };
      }

      // Immovable blocks: push fails entirely
      if (isImmovable(blockId)) {
        return { success: false, blocksToMove: [], blocksToDestroy: [] };
      }

      // Blocks destroyed by push: don't count toward limit, just mark for destruction
      if (isDestroyedByPush(blockId)) {
        blocksToDestroy.push(pos);
        continue;
      }

      // Normal pushable block
      blocksToMove.push(pos);

      // Check push limit
      if (blocksToMove.length > PUSH_LIMIT) {
        return { success: false, blocksToMove: [], blocksToDestroy: [] };
      }

      // Check the destination of this block for further pushing
      const destX = pos.x + dir.x;
      const destY = pos.y + dir.y;
      const destZ = pos.z + dir.z;
      const destKey = `${destX},${destY},${destZ}`;

      if (!visited.has(destKey)) {
        const destBlock = this.world.getBlock(destX, destY, destZ);
        if (destBlock !== Block.Air) {
          queue.push({ x: destX, y: destY, z: destZ });
        }
      }

      // Slime/honey block chaining: check all 6 adjacent blocks
      if (isSlimeBlock(blockId) || isHoneyBlock(blockId)) {
        for (const adjDir of Object.values(DIRECTION_VECTORS)) {
          const adjX = pos.x + adjDir.x;
          const adjY = pos.y + adjDir.y;
          const adjZ = pos.z + adjDir.z;
          const adjKey = `${adjX},${adjY},${adjZ}`;

          // Don't chain back to the piston itself
          if (adjX === pistonX && adjY === pistonY && adjZ === pistonZ) continue;

          if (visited.has(adjKey)) continue;

          const adjBlock = this.world.getBlock(adjX, adjY, adjZ);
          if (adjBlock === Block.Air) continue;
          if (!isPushable(adjBlock)) continue;

          // Check sticky compatibility
          if (sticksTo(blockId, adjBlock) || (isSlimeBlock(blockId) || isHoneyBlock(blockId)) && !isSlimeBlock(adjBlock) && !isHoneyBlock(adjBlock)) {
            // Only chain if the block would actually be affected
            if (sticksTo(blockId, adjBlock)) {
              queue.push({ x: adjX, y: adjY, z: adjZ });
            }
          }
        }
      }
    }

    return { success: true, blocksToMove, blocksToDestroy };
  }

  /**
   * Collect a chain of blocks connected via slime/honey blocks for pulling.
   */
  private collectStickyChain(
    startX: number,
    startY: number,
    startZ: number,
    pullDirection: PistonDirection
  ): { success: boolean; blocksToMove: Vec3[]; blocksToDestroy: Vec3[] } {
    const blocksToMove: Vec3[] = [];
    const blocksToDestroy: Vec3[] = [];
    const visited = new Set<string>();
    const queue: Vec3[] = [{ x: startX, y: startY, z: startZ }];

    while (queue.length > 0) {
      const pos = queue.shift()!;
      const key = `${pos.x},${pos.y},${pos.z}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const blockId = this.world.getBlock(pos.x, pos.y, pos.z);

      if (blockId === Block.Air) continue;

      if (isImmovable(blockId)) {
        return { success: false, blocksToMove: [], blocksToDestroy: [] };
      }

      if (isDestroyedByPush(blockId)) {
        blocksToDestroy.push(pos);
        continue;
      }

      blocksToMove.push(pos);

      if (blocksToMove.length > PUSH_LIMIT) {
        return { success: false, blocksToMove: [], blocksToDestroy: [] };
      }

      // Chain to adjacent blocks via slime/honey
      if (isSlimeBlock(blockId) || isHoneyBlock(blockId)) {
        for (const adjDir of Object.values(DIRECTION_VECTORS)) {
          const adjX = pos.x + adjDir.x;
          const adjY = pos.y + adjDir.y;
          const adjZ = pos.z + adjDir.z;
          const adjKey = `${adjX},${adjY},${adjZ}`;

          if (visited.has(adjKey)) continue;

          const adjBlock = this.world.getBlock(adjX, adjY, adjZ);
          if (adjBlock === Block.Air) continue;
          if (!isPushable(adjBlock)) continue;

          if (sticksTo(blockId, adjBlock)) {
            queue.push({ x: adjX, y: adjY, z: adjZ });
          }
        }
      }
    }

    return { success: true, blocksToMove, blocksToDestroy };
  }
}
