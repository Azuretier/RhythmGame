// =============================================================================
// Structure Placement
// =============================================================================
// Places generated structures into the world:
//   - Villages (plains/desert/taiga, 32-chunk spacing, 3-5 buildings)
//   - Desert temples (21x21 sandstone pyramid)
//   - Mineshafts (horizontal tunnels with supports)
//   - Dungeons (small stone brick rooms with spawner)
//   - Stronghold (single per world, 1000-2000 blocks from origin)
// All placement is deterministic given a seed.
// =============================================================================

import {
  Block,
  BlockId,
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  CHUNK_HEIGHT,
} from '@/types/minecraft-switch';

import {
  type ChunkedWorld,
  seededRandom,
  positionSeed,
} from './chunk-world';

import {
  BIOME_BY_INDEX,
  SEA_LEVEL,
  BiomeIndex,
} from './biomes';

// =============================================================================
// Structure Spacing Constants
// =============================================================================

/** Chunk spacing between village centers. */
const VILLAGE_SPACING = 32;
/** Minimum separation within spacing grid for villages. */
const VILLAGE_SEPARATION = 8;

/** Chunk spacing between desert temples. */
const TEMPLE_SPACING = 32;
const TEMPLE_SEPARATION = 8;

/** Chance of a mineshaft starting in a chunk. */
const MINESHAFT_CHANCE = 0.004;

/** Chance of a dungeon in a chunk. */
const DUNGEON_CHANCE = 0.02;

// =============================================================================
// Grid-Based Structure Positioning
// =============================================================================

/**
 * Determine if a structure should generate in the given chunk cell
 * using a grid-based spacing system (similar to Minecraft's structure placement).
 *
 * Divides the world into `spacing`-sized grid cells, then picks one random
 * chunk within each cell. Returns the chunk coordinates if this chunk matches.
 */
function getStructurePosition(
  cx: number,
  cz: number,
  spacing: number,
  separation: number,
  seed: number,
  structureSalt: number,
): { sx: number; sz: number } | null {
  // Grid cell this chunk belongs to
  const gridX = Math.floor(cx / spacing);
  const gridZ = Math.floor(cz / spacing);

  // Deterministic position within the grid cell
  const rand = seededRandom(positionSeed(seed, gridX, structureSalt, gridZ));

  const offsetX = separation + Math.floor(rand() * (spacing - separation));
  const offsetZ = separation + Math.floor(rand() * (spacing - separation));

  const sx = gridX * spacing + offsetX;
  const sz = gridZ * spacing + offsetZ;

  // Only return if this chunk matches the chosen position
  if (sx === cx && sz === cz) {
    return { sx, sz };
  }

  return null;
}

// =============================================================================
// Village Generation
// =============================================================================

/**
 * Village building template.
 */
interface BuildingTemplate {
  /** Width (X). */
  w: number;
  /** Depth (Z). */
  d: number;
  /** Height (Y). */
  h: number;
  /** Building type for material selection. */
  type: 'house' | 'church' | 'well' | 'farm';
}

const VILLAGE_BUILDINGS: BuildingTemplate[] = [
  { w: 5, d: 5, h: 4, type: 'house' },
  { w: 7, d: 5, h: 4, type: 'house' },
  { w: 5, d: 7, h: 4, type: 'house' },
  { w: 7, d: 7, h: 6, type: 'church' },
  { w: 3, d: 3, h: 2, type: 'well' },
  { w: 9, d: 7, h: 3, type: 'farm' },
];

/**
 * Get building materials based on biome variant.
 */
function getVillageMaterials(biomeType: string): {
  foundation: BlockId;
  wall: BlockId;
  floor: BlockId;
  roof: BlockId;
  roofSlab: BlockId;
  fence: BlockId;
  door: BlockId;
  torch: BlockId;
  path: BlockId;
} {
  switch (biomeType) {
    case 'desert':
      return {
        foundation: Block.Sandstone as BlockId,
        wall: Block.SmoothSandstone as BlockId,
        floor: Block.SmoothSandstone as BlockId,
        roof: Block.SandstoneSlab as BlockId,
        roofSlab: Block.SandstoneSlab as BlockId,
        fence: Block.OakFence as BlockId,
        door: Block.OakDoor as BlockId,
        torch: Block.Torch as BlockId,
        path: Block.Sand as BlockId,
      };
    case 'taiga':
    case 'snowy_taiga':
      return {
        foundation: Block.Cobblestone as BlockId,
        wall: Block.SprucePlanks as BlockId,
        floor: Block.SprucePlanks as BlockId,
        roof: Block.SpruceSlab as BlockId,
        roofSlab: Block.SpruceStairs as BlockId,
        fence: Block.SpruceFence as BlockId,
        door: Block.SpruceDoor as BlockId,
        torch: Block.Torch as BlockId,
        path: Block.CoarseDirt as BlockId,
      };
    case 'savanna':
      return {
        foundation: Block.Cobblestone as BlockId,
        wall: Block.AcaciaPlanks as BlockId,
        floor: Block.AcaciaPlanks as BlockId,
        roof: Block.AcaciaSlab as BlockId,
        roofSlab: Block.AcaciaStairs as BlockId,
        fence: Block.AcaciaFence as BlockId,
        door: Block.AcaciaDoor as BlockId,
        torch: Block.Torch as BlockId,
        path: Block.CoarseDirt as BlockId,
      };
    default: // Plains
      return {
        foundation: Block.Cobblestone as BlockId,
        wall: Block.OakPlanks as BlockId,
        floor: Block.OakPlanks as BlockId,
        roof: Block.OakStairs as BlockId,
        roofSlab: Block.OakSlab as BlockId,
        fence: Block.OakFence as BlockId,
        door: Block.OakDoor as BlockId,
        torch: Block.Torch as BlockId,
        path: Block.CoarseDirt as BlockId,
      };
  }
}

/**
 * Place a single village building at the specified position.
 */
function placeBuilding(
  world: ChunkedWorld,
  bx: number,
  surfaceY: number,
  bz: number,
  template: BuildingTemplate,
  materials: ReturnType<typeof getVillageMaterials>,
  rand: () => number,
): void {
  const { w, d, h } = template;
  const baseY = surfaceY;

  if (template.type === 'well') {
    // Simple well: cobblestone ring with water inside
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        // Foundation
        world.setBlock(bx + dx, baseY, bz + dz, materials.foundation);

        if (dx === 0 || dx === w - 1 || dz === 0 || dz === d - 1) {
          // Walls (cobblestone ring)
          world.setBlock(bx + dx, baseY + 1, bz + dz, Block.Cobblestone as BlockId);
        } else {
          // Water inside
          world.setBlock(bx + dx, baseY, bz + dz, Block.Water as BlockId);
          world.setBlock(bx + dx, baseY + 1, bz + dz, Block.Air as BlockId);
        }
      }
    }
    // Roof: fence posts + slab
    world.setBlock(bx, baseY + 2, bz, materials.fence);
    world.setBlock(bx + w - 1, baseY + 2, bz, materials.fence);
    world.setBlock(bx, baseY + 2, bz + d - 1, materials.fence);
    world.setBlock(bx + w - 1, baseY + 2, bz + d - 1, materials.fence);
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        world.setBlock(bx + dx, baseY + 3, bz + dz, materials.roofSlab);
      }
    }
    return;
  }

  if (template.type === 'farm') {
    // Farm plot: farmland with crops, fence border
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        if (dx === 0 || dx === w - 1 || dz === 0 || dz === d - 1) {
          // Fence border
          world.setBlock(bx + dx, baseY, bz + dz, Block.Dirt as BlockId);
          world.setBlock(bx + dx, baseY + 1, bz + dz, materials.fence);
        } else if (dx === Math.floor(w / 2)) {
          // Water channel down the middle
          world.setBlock(bx + dx, baseY, bz + dz, Block.Water as BlockId);
        } else {
          // Farmland with wheat
          world.setBlock(bx + dx, baseY, bz + dz, Block.Farmland as BlockId);
          world.setBlock(bx + dx, baseY + 1, bz + dz, Block.Wheat as BlockId);
        }
      }
    }
    return;
  }

  // --- Standard building (house / church) ---

  // Clear interior space
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      for (let dy = 0; dy <= h + 2; dy++) {
        world.setBlock(bx + dx, baseY + dy, bz + dz, Block.Air as BlockId);
      }
    }
  }

  // Foundation
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      world.setBlock(bx + dx, baseY, bz + dz, materials.foundation);
    }
  }

  // Floor (1 block above foundation)
  for (let dx = 1; dx < w - 1; dx++) {
    for (let dz = 1; dz < d - 1; dz++) {
      world.setBlock(bx + dx, baseY + 1, bz + dz, materials.floor);
    }
  }

  // Walls
  for (let dy = 1; dy <= h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const isEdge = dx === 0 || dx === w - 1 || dz === 0 || dz === d - 1;
        if (isEdge) {
          world.setBlock(bx + dx, baseY + dy, bz + dz, materials.wall);
        }
      }
    }
  }

  // Windows (glass panes in the middle of each wall, at height 3)
  const windowY = baseY + 3;
  if (w >= 5) {
    const midX = Math.floor(w / 2);
    world.setBlock(bx + midX, windowY, bz, Block.GlassPane as BlockId);
    world.setBlock(bx + midX, windowY, bz + d - 1, Block.GlassPane as BlockId);
  }
  if (d >= 5) {
    const midZ = Math.floor(d / 2);
    world.setBlock(bx, windowY, bz + midZ, Block.GlassPane as BlockId);
    world.setBlock(bx + w - 1, windowY, bz + midZ, Block.GlassPane as BlockId);
  }

  // Door (front wall, center)
  const doorX = bx + Math.floor(w / 2);
  const doorZ = bz;
  world.setBlock(doorX, baseY + 1, doorZ, materials.door);
  world.setBlock(doorX, baseY + 2, doorZ, materials.door);

  // Roof (peaked, using stairs/slabs)
  for (let dy = 0; dy <= Math.ceil(w / 2); dy++) {
    for (let dz = -1; dz <= d; dz++) {
      if (dy < Math.ceil(w / 2)) {
        // Left and right roof slopes
        world.setBlock(bx + dy, baseY + h + dy + 1, bz + dz, materials.roof);
        world.setBlock(bx + (w - 1 - dy), baseY + h + dy + 1, bz + dz, materials.roof);
      } else {
        // Ridge
        world.setBlock(bx + dy, baseY + h + dy + 1, bz + dz, materials.roofSlab);
      }
    }
  }

  // Interior torch
  world.setBlock(bx + 1, baseY + 3, bz + 1, materials.torch);

  // Chest (in houses)
  if (template.type === 'house' && rand() < 0.6) {
    world.setBlock(bx + w - 2, baseY + 1, bz + d - 2, Block.Chest as BlockId);
  }

  // Crafting table (in houses)
  if (template.type === 'house') {
    world.setBlock(bx + 1, baseY + 1, bz + d - 2, Block.CraftingTable as BlockId);
  }
}

/**
 * Generate a village at the given chunk coordinates.
 * Places 3-5 buildings with paths connecting them.
 */
function generateVillage(
  world: ChunkedWorld,
  cx: number,
  cz: number,
  seed: number,
): void {
  const baseX = cx * CHUNK_WIDTH;
  const baseZ = cz * CHUNK_DEPTH;
  const rand = seededRandom(positionSeed(seed, cx, 1111, cz));

  // Determine biome at center
  const chunk = world.getChunk(cx, cz);
  if (!chunk) return;
  const centerBiome = BIOME_BY_INDEX[chunk.biomes[8 * CHUNK_WIDTH + 8]];
  if (!centerBiome) return;

  const materials = getVillageMaterials(centerBiome.type);

  // Number of buildings: 3-5
  const buildingCount = 3 + Math.floor(rand() * 3);

  // Village center
  const centerX = baseX + 8;
  const centerZ = baseZ + 8;
  const centerY = world.getHighestBlock(centerX, centerZ);

  if (centerY <= SEA_LEVEL || centerY >= CHUNK_HEIGHT - 20) return;

  // Place buildings in a rough circle around center
  const placed: { x: number; z: number }[] = [];

  for (let i = 0; i < buildingCount; i++) {
    // Pick a template
    const templateIdx = Math.floor(rand() * VILLAGE_BUILDINGS.length);
    const template = VILLAGE_BUILDINGS[templateIdx];

    // Position: spread around center
    let attempts = 0;
    let bx = centerX;
    let bz = centerZ;

    while (attempts < 10) {
      bx = centerX + Math.floor((rand() - 0.5) * 24);
      bz = centerZ + Math.floor((rand() - 0.5) * 24);

      // Check minimum distance from other buildings
      let tooClose = false;
      for (const p of placed) {
        if (Math.abs(p.x - bx) < 8 && Math.abs(p.z - bz) < 8) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose && world.isInBounds(bx, bz) && world.isInBounds(bx + template.w, bz + template.d)) {
        break;
      }
      attempts++;
    }

    if (attempts >= 10) continue;

    const surfaceY = world.getHighestBlock(bx, bz);
    if (surfaceY <= SEA_LEVEL || surfaceY >= CHUNK_HEIGHT - 20) continue;

    // Flatten ground beneath building
    for (let dx = -1; dx <= template.w; dx++) {
      for (let dz = -1; dz <= template.d; dz++) {
        // Fill down to surface level
        const currentY = world.getHighestBlock(bx + dx, bz + dz);
        if (currentY < surfaceY) {
          for (let y = currentY; y <= surfaceY; y++) {
            world.setBlock(bx + dx, y, bz + dz, Block.Dirt as BlockId);
          }
        }
        // Clear above
        for (let y = surfaceY + 1; y <= surfaceY + template.h + 5; y++) {
          const b = world.getBlock(bx + dx, y, bz + dz);
          if (b !== Block.Air) {
            world.setBlock(bx + dx, y, bz + dz, Block.Air as BlockId);
          }
        }
      }
    }

    placeBuilding(world, bx, surfaceY, bz, template, materials, rand);
    placed.push({ x: bx, z: bz });

    // Path from building to center
    const pathStartX = bx + Math.floor(template.w / 2);
    const pathStartZ = bz + Math.floor(template.d / 2);
    placePath(world, pathStartX, pathStartZ, centerX, centerZ, materials.path);
  }

  // Place well at center
  const wellY = world.getHighestBlock(centerX, centerZ);
  if (wellY > SEA_LEVEL) {
    const wellTemplate = VILLAGE_BUILDINGS.find(b => b.type === 'well')!;
    placeBuilding(world, centerX - 1, wellY, centerZ - 1, wellTemplate, materials, rand);
  }
}

/**
 * Place a path between two points using A*-like straight-line path.
 */
function placePath(
  world: ChunkedWorld,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  pathBlock: BlockId,
): void {
  const dx = Math.sign(x2 - x1);
  const dz = Math.sign(z2 - z1);
  let x = x1;
  let z = z1;
  let steps = 0;
  const maxSteps = Math.abs(x2 - x1) + Math.abs(z2 - z1) + 2;

  while ((x !== x2 || z !== z2) && steps < maxSteps) {
    const surfaceY = world.getHighestBlock(x, z);
    if (surfaceY > SEA_LEVEL && surfaceY < CHUNK_HEIGHT - 10) {
      world.setBlock(x, surfaceY, z, pathBlock);
    }

    // Step towards target
    if (Math.abs(x2 - x) > Math.abs(z2 - z)) {
      x += dx;
    } else {
      z += dz;
    }
    steps++;
  }
}

// =============================================================================
// Desert Temple
// =============================================================================

/**
 * Generate a desert temple (21x21 sandstone pyramid).
 * Features a hidden chamber underneath with treasure.
 */
function generateDesertTemple(
  world: ChunkedWorld,
  cx: number,
  cz: number,
  seed: number,
): void {
  const baseX = cx * CHUNK_WIDTH + 8;  // Center in chunk
  const baseZ = cz * CHUNK_DEPTH + 8;
  const surfaceY = world.getHighestBlock(baseX, baseZ);

  if (surfaceY <= SEA_LEVEL || surfaceY >= CHUNK_HEIGHT - 30) return;

  const halfW = 10; // 21x21 -> half width = 10

  // Build pyramid layers
  for (let layer = 0; layer <= 12; layer++) {
    const layerRadius = halfW - layer;
    if (layerRadius < 0) break;

    for (let dx = -layerRadius; dx <= layerRadius; dx++) {
      for (let dz = -layerRadius; dz <= layerRadius; dz++) {
        const wx = baseX + dx;
        const wz = baseZ + dz;
        const wy = surfaceY + layer;

        if (!world.isInBounds(wx, wz)) continue;

        // Only place on edges for hollow pyramid (except ground floor)
        if (layer === 0 ||
            Math.abs(dx) === layerRadius ||
            Math.abs(dz) === layerRadius) {
          world.setBlock(wx, wy, wz, Block.Sandstone as BlockId);
        } else if (layer <= 1) {
          // Floor
          world.setBlock(wx, wy, wz, Block.SmoothSandstone as BlockId);
        } else {
          // Clear interior
          world.setBlock(wx, wy, wz, Block.Air as BlockId);
        }
      }
    }
  }

  // Orange terracotta accents on the first layer
  for (let dx = -halfW; dx <= halfW; dx += 2) {
    world.setBlock(baseX + dx, surfaceY + 1, baseZ - halfW, Block.OrangeTerracotta as BlockId);
    world.setBlock(baseX + dx, surfaceY + 1, baseZ + halfW, Block.OrangeTerracotta as BlockId);
    world.setBlock(baseX - halfW, surfaceY + 1, baseZ + dx, Block.OrangeTerracotta as BlockId);
    world.setBlock(baseX + halfW, surfaceY + 1, baseZ + dx, Block.OrangeTerracotta as BlockId);
  }

  // Hidden chamber below (5x5 room at y = surfaceY - 6)
  const chamberY = surfaceY - 6;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = 0; dy <= 4; dy++) {
        const wx = baseX + dx;
        const wz = baseZ + dz;
        const wy = chamberY + dy;

        if (!world.isInBounds(wx, wz)) continue;

        if (dx === -2 || dx === 2 || dz === -2 || dz === 2 || dy === 0 || dy === 4) {
          // Walls/floor/ceiling
          world.setBlock(wx, wy, wz, Block.Sandstone as BlockId);
        } else {
          // Interior
          world.setBlock(wx, wy, wz, Block.Air as BlockId);
        }
      }
    }
  }

  // Treasure chests in corners of chamber
  world.setBlock(baseX - 1, chamberY + 1, baseZ - 1, Block.Chest as BlockId);
  world.setBlock(baseX + 1, chamberY + 1, baseZ - 1, Block.Chest as BlockId);
  world.setBlock(baseX - 1, chamberY + 1, baseZ + 1, Block.Chest as BlockId);
  world.setBlock(baseX + 1, chamberY + 1, baseZ + 1, Block.Chest as BlockId);

  // TNT trap under pressure plate
  world.setBlock(baseX, chamberY + 1, baseZ, Block.StonePressurePlate as BlockId);
  world.setBlock(baseX, chamberY, baseZ, Block.TNT as BlockId);
  world.setBlock(baseX - 1, chamberY, baseZ, Block.TNT as BlockId);
  world.setBlock(baseX + 1, chamberY, baseZ, Block.TNT as BlockId);
  world.setBlock(baseX, chamberY, baseZ - 1, Block.TNT as BlockId);
  world.setBlock(baseX, chamberY, baseZ + 1, Block.TNT as BlockId);
}

// =============================================================================
// Mineshaft
// =============================================================================

/**
 * Generate a mineshaft with branching corridors.
 * Corridors are 3 wide, 3 tall, with fence supports and rail on floor.
 */
function generateMineshaft(
  world: ChunkedWorld,
  cx: number,
  cz: number,
  seed: number,
): void {
  const rand = seededRandom(positionSeed(seed, cx, 3333, cz));
  let baseX = cx * CHUNK_WIDTH + Math.floor(rand() * 12) + 2;
  let baseZ = cz * CHUNK_DEPTH + Math.floor(rand() * 12) + 2;
  const baseY = 20 + Math.floor(rand() * 30); // y 20-50

  // Number of corridors: 3-7
  const corridorCount = 3 + Math.floor(rand() * 5);

  for (let c = 0; c < corridorCount; c++) {
    // Random direction: 0=+x, 1=-x, 2=+z, 3=-z
    const dir = Math.floor(rand() * 4);
    const length = 10 + Math.floor(rand() * 20); // 10-30 blocks long
    const startY = baseY + Math.floor((rand() - 0.5) * 10);

    let x = baseX;
    let z = baseZ;

    for (let i = 0; i < length; i++) {
      // Advance in direction
      switch (dir) {
        case 0: x++; break;
        case 1: x--; break;
        case 2: z++; break;
        case 3: z--; break;
      }

      if (!world.isInBounds(x, z)) break;
      if (startY < 5 || startY >= CHUNK_HEIGHT - 5) break;

      // Carve 3x3 corridor
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = 0; dy <= 2; dy++) {
          const wx = dir <= 1 ? x : x + dx;
          const wz = dir >= 2 ? z : z + dx;
          const wy = startY + dy;

          if (world.isInBounds(wx, wz) && wy >= 1 && wy < CHUNK_HEIGHT) {
            const currentBlock = world.getBlock(wx, wy, wz);
            if (currentBlock !== Block.Air &&
                currentBlock !== Block.Water &&
                currentBlock !== Block.Lava &&
                currentBlock !== Block.Bedrock) {
              world.setBlock(wx, wy, wz, Block.Air as BlockId);
            }
          }
        }
      }

      // Support structure every 4 blocks
      if (i % 4 === 0) {
        // Fence posts on sides
        const lx = dir <= 1 ? x : x - 1;
        const lz = dir >= 2 ? z : z - 1;
        const rx = dir <= 1 ? x : x + 1;
        const rz = dir >= 2 ? z : z + 1;

        if (world.isInBounds(lx, lz)) {
          world.setBlock(lx, startY, lz, Block.OakFence as BlockId);
          world.setBlock(lx, startY + 1, lz, Block.OakFence as BlockId);
          world.setBlock(lx, startY + 2, lz, Block.OakPlanks as BlockId);
        }
        if (world.isInBounds(rx, rz)) {
          world.setBlock(rx, startY, rz, Block.OakFence as BlockId);
          world.setBlock(rx, startY + 1, rz, Block.OakFence as BlockId);
          world.setBlock(rx, startY + 2, rz, Block.OakPlanks as BlockId);
        }
        // Cross-beam on top
        world.setBlock(x, startY + 2, z, Block.OakPlanks as BlockId);
      }

      // Rail on floor
      if (world.isInBounds(x, z)) {
        world.setBlock(x, startY, z, Block.Rail as BlockId);
      }

      // Occasional torch
      if (i % 8 === 4 && world.isInBounds(x, z)) {
        world.setBlock(x, startY + 1, z, Block.Torch as BlockId);
      }

      // Occasional chest
      if (rand() < 0.02 && world.isInBounds(x, z)) {
        const chestDir = dir <= 1 ? [x, z + 1] : [x + 1, z];
        if (world.isInBounds(chestDir[0], chestDir[1])) {
          world.setBlock(chestDir[0], startY, chestDir[1], Block.Chest as BlockId);
        }
      }
    }

    // Branch point: offset the start position for next corridor
    baseX += Math.floor((rand() - 0.5) * 10);
    baseZ += Math.floor((rand() - 0.5) * 10);
  }
}

// =============================================================================
// Dungeon
// =============================================================================

/**
 * Generate a small dungeon: 5x5x4 stone brick room with spawner and chests.
 */
function generateDungeon(
  world: ChunkedWorld,
  cx: number,
  cz: number,
  seed: number,
): void {
  const rand = seededRandom(positionSeed(seed, cx, 4444, cz));
  const baseX = cx * CHUNK_WIDTH + 4 + Math.floor(rand() * 8);
  const baseZ = cz * CHUNK_DEPTH + 4 + Math.floor(rand() * 8);
  const baseY = 10 + Math.floor(rand() * 40); // y 10-50

  if (!world.isInBounds(baseX + 5, baseZ + 5)) return;
  if (baseY < 5 || baseY >= CHUNK_HEIGHT - 10) return;

  const w = 5;
  const d = 5;
  const h = 4;

  // Build room
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      for (let dy = 0; dy < h; dy++) {
        const wx = baseX + dx;
        const wy = baseY + dy;
        const wz = baseZ + dz;

        if (dx === 0 || dx === w - 1 || dz === 0 || dz === d - 1 || dy === 0 || dy === h - 1) {
          // Walls, floor, ceiling: mix of stone bricks and mossy stone bricks
          const block = rand() < 0.3
            ? Block.MossyStoneBricks as BlockId
            : rand() < 0.1
              ? Block.CrackedStoneBricks as BlockId
              : Block.StoneBricks as BlockId;
          world.setBlock(wx, wy, wz, block);
        } else {
          // Interior: air
          world.setBlock(wx, wy, wz, Block.Air as BlockId);
        }
      }
    }
  }

  // Spawner in center
  world.setBlock(baseX + 2, baseY + 1, baseZ + 2, Block.Spawner as BlockId);

  // 1-2 chests
  world.setBlock(baseX + 1, baseY + 1, baseZ + 1, Block.Chest as BlockId);
  if (rand() < 0.5) {
    world.setBlock(baseX + 3, baseY + 1, baseZ + 3, Block.Chest as BlockId);
  }

  // Cobweb decorations
  if (rand() < 0.7) world.setBlock(baseX + 1, baseY + 2, baseZ + 1, Block.Cobweb as BlockId);
  if (rand() < 0.7) world.setBlock(baseX + 3, baseY + 2, baseZ + 1, Block.Cobweb as BlockId);
  if (rand() < 0.7) world.setBlock(baseX + 1, baseY + 2, baseZ + 3, Block.Cobweb as BlockId);
  if (rand() < 0.7) world.setBlock(baseX + 3, baseY + 2, baseZ + 3, Block.Cobweb as BlockId);
}

// =============================================================================
// Stronghold
// =============================================================================

/** Cached stronghold position per seed. */
const strongholdPositions: Map<number, { cx: number; cz: number }> = new Map();

/**
 * Get the stronghold chunk position for a given seed.
 * Only one stronghold per world, placed 1000-2000 blocks from origin.
 */
function getStrongholdPosition(seed: number): { cx: number; cz: number } {
  let pos = strongholdPositions.get(seed);
  if (pos) return pos;

  const rand = seededRandom(seed + 77777);
  const angle = rand() * Math.PI * 2;
  const distance = 1000 + rand() * 1000; // 1000-2000 blocks from origin

  // Convert to chunk coordinates (assuming world center is at 0,0 chunk wise;
  // for offset worlds, the caller adjusts)
  const cx = Math.floor(Math.cos(angle) * distance / CHUNK_WIDTH);
  const cz = Math.floor(Math.sin(angle) * distance / CHUNK_DEPTH);

  pos = { cx, cz };
  strongholdPositions.set(seed, pos);
  return pos;
}

/**
 * Generate the stronghold portal room.
 * Creates a stone brick chamber with end portal frame.
 */
function generateStronghold(
  world: ChunkedWorld,
  cx: number,
  cz: number,
  seed: number,
): void {
  const rand = seededRandom(positionSeed(seed, cx, 5555, cz));
  const baseX = cx * CHUNK_WIDTH + 2;
  const baseZ = cz * CHUNK_DEPTH + 2;
  const baseY = 25 + Math.floor(rand() * 10); // y 25-35

  // Portal room: 11x11x7
  const w = 11;
  const d = 11;
  const h = 7;

  // Build room shell
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      for (let dy = 0; dy < h; dy++) {
        const wx = baseX + dx;
        const wy = baseY + dy;
        const wz = baseZ + dz;

        if (!world.isInBounds(wx, wz)) continue;

        if (dx === 0 || dx === w - 1 || dz === 0 || dz === d - 1 || dy === 0 || dy === h - 1) {
          world.setBlock(wx, wy, wz, Block.StoneBricks as BlockId);
        } else {
          world.setBlock(wx, wy, wz, Block.Air as BlockId);
        }
      }
    }
  }

  // End portal frame (3x3 ring, on a raised platform)
  const portalCenterX = baseX + 5;
  const portalCenterZ = baseZ + 5;
  const portalY = baseY + 1;

  // Raised stone brick platform
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      world.setBlock(portalCenterX + dx, portalY, portalCenterZ + dz, Block.StoneBricks as BlockId);
    }
  }

  // End portal frame blocks (12 frames forming a 5x5 ring)
  // North side
  world.setBlock(portalCenterX - 1, portalY + 1, portalCenterZ - 2, Block.EndPortalFrame as BlockId);
  world.setBlock(portalCenterX, portalY + 1, portalCenterZ - 2, Block.EndPortalFrame as BlockId);
  world.setBlock(portalCenterX + 1, portalY + 1, portalCenterZ - 2, Block.EndPortalFrame as BlockId);

  // South side
  world.setBlock(portalCenterX - 1, portalY + 1, portalCenterZ + 2, Block.EndPortalFrame as BlockId);
  world.setBlock(portalCenterX, portalY + 1, portalCenterZ + 2, Block.EndPortalFrame as BlockId);
  world.setBlock(portalCenterX + 1, portalY + 1, portalCenterZ + 2, Block.EndPortalFrame as BlockId);

  // West side
  world.setBlock(portalCenterX - 2, portalY + 1, portalCenterZ - 1, Block.EndPortalFrame as BlockId);
  world.setBlock(portalCenterX - 2, portalY + 1, portalCenterZ, Block.EndPortalFrame as BlockId);
  world.setBlock(portalCenterX - 2, portalY + 1, portalCenterZ + 1, Block.EndPortalFrame as BlockId);

  // East side
  world.setBlock(portalCenterX + 2, portalY + 1, portalCenterZ - 1, Block.EndPortalFrame as BlockId);
  world.setBlock(portalCenterX + 2, portalY + 1, portalCenterZ, Block.EndPortalFrame as BlockId);
  world.setBlock(portalCenterX + 2, portalY + 1, portalCenterZ + 1, Block.EndPortalFrame as BlockId);

  // Lava pool under portal
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      world.setBlock(portalCenterX + dx, portalY, portalCenterZ + dz, Block.Lava as BlockId);
    }
  }

  // Stairs leading up to portal platform
  for (let dy = 0; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      world.setBlock(portalCenterX + dx, portalY + dy, portalCenterZ - 3 + dy, Block.StoneBrickStairs as BlockId);
    }
  }

  // Silverfish spawner nearby
  world.setBlock(portalCenterX, portalY + 1, portalCenterZ, Block.Spawner as BlockId);

  // Entry corridor
  for (let dz = -5; dz <= 0; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = 1; dy <= 3; dy++) {
        const wx = portalCenterX + dx;
        const wz = portalCenterZ + dz - 3;
        const wy = baseY + dy;
        if (world.isInBounds(wx, wz)) {
          world.setBlock(wx, wy, wz, Block.Air as BlockId);
        }
      }
    }
    // Floor
    for (let dx = -1; dx <= 1; dx++) {
      const wx = portalCenterX + dx;
      const wz = portalCenterZ + dz - 3;
      if (world.isInBounds(wx, wz)) {
        world.setBlock(wx, baseY, wz, Block.StoneBricks as BlockId);
      }
    }
  }
}

// =============================================================================
// Main Structure Placement Entry Point
// =============================================================================

/**
 * Place structures in a chunk based on biome and grid positioning.
 *
 * Should be called after terrain, caves, and decoration passes are complete,
 * as structures need to read the finished terrain height and biome data.
 */
export function placeStructures(
  world: ChunkedWorld,
  cx: number,
  cz: number,
  seed: number,
): void {
  const chunk = world.getChunk(cx, cz);
  if (!chunk || !chunk.generated) return;

  // Get center biome of chunk
  const centerBiome = BIOME_BY_INDEX[chunk.biomes[8 * CHUNK_WIDTH + 8]];
  if (!centerBiome) return;

  // --- Village ---
  const validVillageBiomes = [
    BiomeIndex.plains,
    BiomeIndex.desert,
    BiomeIndex.savanna,
    BiomeIndex.taiga,
    BiomeIndex.snowy_plains,
  ];

  if (validVillageBiomes.includes(centerBiome.index)) {
    const villagePos = getStructurePosition(cx, cz, VILLAGE_SPACING, VILLAGE_SEPARATION, seed, 1111);
    if (villagePos) {
      generateVillage(world, cx, cz, seed);
    }
  }

  // --- Desert Temple ---
  if (centerBiome.index === BiomeIndex.desert) {
    const templePos = getStructurePosition(cx, cz, TEMPLE_SPACING, TEMPLE_SEPARATION, seed, 2222);
    if (templePos) {
      generateDesertTemple(world, cx, cz, seed);
    }
  }

  // --- Mineshaft ---
  {
    const rand = seededRandom(positionSeed(seed, cx, 3333, cz));
    if (rand() < MINESHAFT_CHANCE) {
      generateMineshaft(world, cx, cz, seed);
    }
  }

  // --- Dungeon ---
  {
    const rand = seededRandom(positionSeed(seed, cx, 4444, cz));
    if (rand() < DUNGEON_CHANCE) {
      generateDungeon(world, cx, cz, seed);
    }
  }

  // --- Stronghold ---
  {
    const strongholdPos = getStrongholdPosition(seed);
    // Check if this chunk is within the stronghold area (it spans ~2 chunks)
    if (
      cx >= strongholdPos.cx && cx <= strongholdPos.cx + 1 &&
      cz >= strongholdPos.cz && cz <= strongholdPos.cz + 1
    ) {
      // Only generate in the primary chunk
      if (cx === strongholdPos.cx && cz === strongholdPos.cz) {
        generateStronghold(world, cx, cz, seed);
      }
    }
  }
}
