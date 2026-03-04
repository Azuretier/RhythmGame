// =============================================================================
// Overworld Terrain Generator
// =============================================================================
// Generates overworld chunks with multi-octave heightmaps, biome-aware surface
// layers, bedrock, ore veins, water fill, and basic cave carving. Provides
// a unified `generateChunk()` entry point that dispatches to the correct
// dimension generator.
// =============================================================================

import {
  Block,
  BlockId,
  Chunk,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  CHUNK_DEPTH,
  type Dimension,
} from '@/types/minecraft-switch';

import {
  PerlinNoise,
  seededRandom,
  positionSeed,
  createEmptyChunk,
  blockIndex,
} from './chunk-world';

import { generateNetherChunk } from './nether';
import { generateEndChunk } from './end';

// Re-export full dimension generators from their dedicated modules
export { generateNetherChunk, generateEndChunk };

import {
  ClimateNoise,
  getBiomeAt,
  getBlendedHeight,
  BIOME_BY_INDEX,
  SEA_LEVEL,
  type BiomeProperties,
} from './biomes';

import { carveCaves } from './caves';

// =============================================================================
// Noise Cache — Initialized per seed
// =============================================================================

interface OverworldNoiseSet {
  /** Multi-octave base terrain height. */
  heightBase: PerlinNoise;
  /** Detail height noise for micro-terrain. */
  heightDetail: PerlinNoise;
  /** 3D density noise for overhangs and terrain shaping. */
  density3D: PerlinNoise;
  /** Climate noise layers. */
  climate: ClimateNoise;
  /** Ore distribution noise. */
  ore: PerlinNoise;
}

const noiseCache: Map<number, OverworldNoiseSet> = new Map();

function getNoiseSet(seed: number): OverworldNoiseSet {
  let ns = noiseCache.get(seed);
  if (ns) return ns;

  ns = {
    heightBase: new PerlinNoise(seed),
    heightDetail: new PerlinNoise(seed + 100),
    density3D: new PerlinNoise(seed + 200),
    climate: new ClimateNoise(seed),
    ore: new PerlinNoise(seed + 500),
  };
  noiseCache.set(seed, ns);
  return ns;
}

// =============================================================================
// Heightmap Generation
// =============================================================================

/**
 * Compute the terrain height at a world (x, z) position.
 * Uses 6 octaves for base terrain and 4 octaves for detail,
 * modulated by the biome's base height and variation.
 */
function getTerrainHeight(
  ns: OverworldNoiseSet,
  worldX: number,
  worldZ: number,
): number {
  // Get blended biome height parameters for smooth transitions
  const { baseHeight, heightVariation } = getBlendedHeight(ns.climate, worldX, worldZ);

  // Base terrain: 6 octaves, large scale
  const baseFreq = 0.005;
  const baseNoise = ns.heightBase.fbm2d(
    worldX * baseFreq,
    worldZ * baseFreq,
    6,
    2.0,
    0.5,
  );

  // Detail terrain: 4 octaves, smaller scale
  const detailFreq = 0.02;
  const detailNoise = ns.heightDetail.fbm2d(
    worldX * detailFreq,
    worldZ * detailFreq,
    4,
    2.0,
    0.45,
  );

  // Combine: base provides major features, detail adds bumps
  const combinedNoise = baseNoise * 0.7 + detailNoise * 0.3;

  // Map noise to world height
  const height = SEA_LEVEL + baseHeight + combinedNoise * heightVariation;

  // Clamp to valid range
  return Math.max(1, Math.min(CHUNK_HEIGHT - 2, Math.floor(height)));
}

// =============================================================================
// Surface Layer Placement
// =============================================================================

/**
 * Place surface and subsurface blocks for a column based on biome.
 * Handles special cases like desert sandstone, taiga podzol,
 * and mountain stone surfaces at high elevations.
 */
function placeSurfaceBlocks(
  chunk: Chunk,
  lx: number,
  lz: number,
  surfaceY: number,
  biome: BiomeProperties,
  rand: () => number,
): void {
  // Mountains above y=90 get stone surface instead of grass
  const isHighMountain = (biome.type === 'mountains' || biome.type === 'snowy_mountains') && surfaceY > 90;

  // Determine surface block
  let surfaceBlock = biome.surfaceBlock;
  let subBlock = biome.subsurfaceBlock;

  if (isHighMountain) {
    surfaceBlock = Block.Stone as BlockId;
    subBlock = Block.Stone as BlockId;
  }

  // Snowy biomes: surface is still grass but we place snow on top
  // The snow layer is handled in decorators

  // Place surface block
  if (surfaceY < SEA_LEVEL) {
    // Underwater: use underwater block
    chunk.blocks[blockIndex(lx, surfaceY, lz)] = biome.underwaterBlock;
  } else {
    chunk.blocks[blockIndex(lx, surfaceY, lz)] = surfaceBlock;
  }

  // Subsurface: 3-4 blocks deep
  const subDepth = 3 + (rand() < 0.5 ? 1 : 0);
  for (let d = 1; d <= subDepth && surfaceY - d > 0; d++) {
    const y = surfaceY - d;
    const idx = blockIndex(lx, y, lz);
    if (chunk.blocks[idx] === Block.Stone) {
      chunk.blocks[idx] = subBlock;
    }
  }

  // Desert: sandstone layer under sand (4-8 blocks)
  if (biome.type === 'desert') {
    const sandstoneDepth = 4 + Math.floor(rand() * 5);
    for (let d = subDepth + 1; d <= subDepth + sandstoneDepth && surfaceY - d > 0; d++) {
      const y = surfaceY - d;
      const idx = blockIndex(lx, y, lz);
      if (chunk.blocks[idx] === Block.Stone) {
        chunk.blocks[idx] = Block.Sandstone as BlockId;
      }
    }
  }
}

// =============================================================================
// Bedrock Layer
// =============================================================================

/**
 * Place bedrock at the bottom of the world.
 * Y=0 is always bedrock; Y=1..4 are random bedrock/stone mix.
 */
function placeBedrock(chunk: Chunk, lx: number, lz: number, rand: () => number): void {
  // Y=0: always bedrock
  chunk.blocks[blockIndex(lx, 0, lz)] = Block.Bedrock as BlockId;

  // Y=1..4: decreasing chance of bedrock
  for (let y = 1; y <= 4; y++) {
    if (rand() < (5 - y) / 5) {
      chunk.blocks[blockIndex(lx, y, lz)] = Block.Bedrock as BlockId;
    }
  }
}

// =============================================================================
// Ore Generation
// =============================================================================

interface OreConfig {
  block: BlockId;
  minY: number;
  maxY: number;
  veinSize: number;
  frequency: number;  // Average veins per chunk
  /** If set, ore only generates in these biome types. */
  biomeRestriction?: string[];
}

const ORES: OreConfig[] = [
  { block: Block.CoalOre as BlockId, minY: 5, maxY: 128, veinSize: 17, frequency: 20 },
  { block: Block.IronOre as BlockId, minY: 0, maxY: 63, veinSize: 9, frequency: 20 },
  { block: Block.GoldOre as BlockId, minY: 0, maxY: 31, veinSize: 9, frequency: 2 },
  { block: Block.DiamondOre as BlockId, minY: 0, maxY: 16, veinSize: 8, frequency: 1 },
  { block: Block.RedstoneOre as BlockId, minY: 0, maxY: 16, veinSize: 8, frequency: 8 },
  { block: Block.LapisOre as BlockId, minY: 0, maxY: 32, veinSize: 7, frequency: 1 },
  { block: Block.EmeraldOre as BlockId, minY: 0, maxY: 32, veinSize: 1, frequency: 1, biomeRestriction: ['mountains', 'snowy_mountains'] },
];

/**
 * Generate ore veins within a chunk. Each ore type spawns a number of veins
 * based on its frequency, with each vein being a cluster of blocks around
 * a random starting point.
 */
function generateOres(
  chunk: Chunk,
  cx: number,
  cz: number,
  seed: number,
  biomes: Uint8Array,
): void {
  const rand = seededRandom(positionSeed(seed, cx * 16, 0, cz * 16) + 9999);

  for (const ore of ORES) {
    // Check biome restriction
    if (ore.biomeRestriction) {
      // Sample center biome of chunk
      const centerBiome = BIOME_BY_INDEX[biomes[8 * CHUNK_WIDTH + 8]];
      if (!centerBiome || !ore.biomeRestriction.includes(centerBiome.type)) {
        continue;
      }
    }

    const veinCount = Math.floor(ore.frequency + (rand() < (ore.frequency % 1) ? 1 : 0));

    for (let v = 0; v < veinCount; v++) {
      // Random start position within chunk
      const startX = Math.floor(rand() * CHUNK_WIDTH);
      const startZ = Math.floor(rand() * CHUNK_DEPTH);
      const startY = ore.minY + Math.floor(rand() * (ore.maxY - ore.minY));

      if (startY < 0 || startY >= CHUNK_HEIGHT) continue;

      // Place vein as a blob expanding from center
      placeOreVein(chunk, startX, startY, startZ, ore.block, ore.veinSize, rand);
    }
  }
}

/**
 * Place a single ore vein as an irregular blob of blocks.
 * Uses a random walk approach to place up to `size` ore blocks
 * in a roughly spherical cluster.
 */
function placeOreVein(
  chunk: Chunk,
  startX: number,
  startY: number,
  startZ: number,
  oreBlock: BlockId,
  size: number,
  rand: () => number,
): void {
  let x = startX;
  let y = startY;
  let z = startZ;

  for (let i = 0; i < size; i++) {
    // Only replace stone
    if (x >= 0 && x < CHUNK_WIDTH && y >= 5 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_DEPTH) {
      const idx = blockIndex(x, y, z);
      if (chunk.blocks[idx] === Block.Stone) {
        chunk.blocks[idx] = oreBlock;
      }
    }

    // Random walk to next position
    const dir = Math.floor(rand() * 6);
    switch (dir) {
      case 0: x++; break;
      case 1: x--; break;
      case 2: y++; break;
      case 3: y--; break;
      case 4: z++; break;
      case 5: z--; break;
    }
  }
}

// =============================================================================
// Water Fill
// =============================================================================

/**
 * Fill water below sea level for any air blocks.
 * Also fills exposed underwater surface with appropriate blocks.
 */
function fillWater(chunk: Chunk, lx: number, lz: number, surfaceY: number): void {
  if (surfaceY >= SEA_LEVEL) return;

  for (let y = surfaceY + 1; y <= SEA_LEVEL; y++) {
    const idx = blockIndex(lx, y, lz);
    if (chunk.blocks[idx] === Block.Air) {
      chunk.blocks[idx] = Block.Water as BlockId;
    }
  }
}

// =============================================================================
// Snow and Ice
// =============================================================================

/**
 * Place snow layer on top of surface in snowy biomes.
 * Freeze water at sea level in freezing biomes.
 */
function placeSnowAndIce(
  chunk: Chunk,
  lx: number,
  lz: number,
  surfaceY: number,
  biome: BiomeProperties,
): void {
  if (!biome.snowy) return;

  // Snow layer on top of solid surface above sea level
  if (surfaceY >= SEA_LEVEL && surfaceY < CHUNK_HEIGHT - 1) {
    const aboveIdx = blockIndex(lx, surfaceY + 1, lz);
    if (chunk.blocks[aboveIdx] === Block.Air) {
      chunk.blocks[aboveIdx] = Block.SnowLayer as BlockId;
    }
  }

  // Freeze water at sea level
  if (surfaceY < SEA_LEVEL) {
    const seaIdx = blockIndex(lx, SEA_LEVEL, lz);
    if (chunk.blocks[seaIdx] === Block.Water) {
      chunk.blocks[seaIdx] = Block.Ice as BlockId;
    }
  }
}

// =============================================================================
// Main Overworld Chunk Generator
// =============================================================================

/**
 * Generate a complete overworld chunk at chunk coordinates (cx, cz).
 *
 * Generation pipeline:
 * 1. Bedrock layer (y=0..4)
 * 2. Stone fill (y=1 to surface)
 * 3. Biome-aware surface and subsurface blocks
 * 4. Water fill below sea level
 * 5. Cave carving (via caves.ts)
 * 6. Ore placement
 * 7. Snow and ice
 * 8. Height map calculation
 */
export function generateOverworldChunk(cx: number, cz: number, seed: number): Chunk {
  const chunk = createEmptyChunk(cx, cz);
  const ns = getNoiseSet(seed);

  // World coordinates of chunk origin
  const baseX = cx * CHUNK_WIDTH;
  const baseZ = cz * CHUNK_DEPTH;

  // Column-based generation
  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      const worldX = baseX + lx;
      const worldZ = baseZ + lz;

      // Per-column PRNG
      const colRand = seededRandom(positionSeed(seed, worldX, 0, worldZ));

      // --- Determine biome ---
      const biomeIdx = getBiomeAt(ns.climate, worldX, worldZ);
      chunk.biomes[lz * CHUNK_WIDTH + lx] = biomeIdx;
      const biome = BIOME_BY_INDEX[biomeIdx];

      // --- Compute terrain height ---
      const surfaceY = getTerrainHeight(ns, worldX, worldZ);

      // --- Bedrock ---
      placeBedrock(chunk, lx, lz, colRand);

      // --- Stone fill ---
      for (let y = 1; y <= surfaceY; y++) {
        const idx = blockIndex(lx, y, lz);
        // Skip if bedrock was placed
        if (chunk.blocks[idx] === Block.Bedrock) continue;
        chunk.blocks[idx] = Block.Stone as BlockId;
      }

      // --- Surface blocks ---
      if (biome) {
        placeSurfaceBlocks(chunk, lx, lz, surfaceY, biome, colRand);
      }

      // --- Water fill ---
      fillWater(chunk, lx, lz, surfaceY);

      // --- Snow and ice ---
      if (biome) {
        placeSnowAndIce(chunk, lx, lz, surfaceY, biome);
      }

      // --- Track height map ---
      // Find highest non-air block
      let highest = 0;
      for (let y = Math.max(surfaceY + 2, SEA_LEVEL + 1); y >= 0; y--) {
        if (chunk.blocks[blockIndex(lx, y, lz)] !== Block.Air) {
          highest = y;
          break;
        }
      }
      chunk.heightMap[lz * CHUNK_WIDTH + lx] = highest;
    }
  }

  // --- Cave carving ---
  carveCaves(chunk, cx, cz, seed);

  // --- Ore generation ---
  generateOres(chunk, cx, cz, seed, chunk.biomes);

  // --- Recalculate height map after caves ---
  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      let highest = 0;
      for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
        if (chunk.blocks[blockIndex(lx, y, lz)] !== Block.Air) {
          highest = y;
          break;
        }
      }
      chunk.heightMap[lz * CHUNK_WIDTH + lx] = highest;
    }
  }

  chunk.generated = true;
  return chunk;
}

// =============================================================================
// Unified Chunk Generator Entry Point
// =============================================================================

/**
 * Generate a chunk for the specified dimension.
 * This is the main entry point for chunk generation.
 *
 * Nether and End generators are fully implemented in their own modules
 * (nether.ts and end.ts) and re-exported from this file.
 */
export function generateChunk(cx: number, cz: number, seed: number, dimension: Dimension): Chunk {
  switch (dimension) {
    case 'nether':
      return generateNetherChunk(cx, cz, seed);
    case 'the_end':
      return generateEndChunk(cx, cz, seed);
    case 'overworld':
    default:
      return generateOverworldChunk(cx, cz, seed);
  }
}
