// =============================================================================
// Cave System Generation
// =============================================================================
// Three cave types inspired by Minecraft's cave generation:
//   1. Cheese caves — large open chambers using low-frequency 3D noise
//   2. Spaghetti caves — narrow winding tunnels using two intersecting noise fields
//   3. Ravines — deep vertical cuts using 2D path + depth noise
// All cave types avoid carving through bedrock (y<5) and the top 4 blocks
// below the surface to prevent unsightly surface holes.
// =============================================================================

import {
  Block,
  BlockId,
  Chunk,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  CHUNK_DEPTH,
} from '@/types/minecraft-switch';

import { PerlinNoise, seededRandom, positionSeed, blockIndex } from './chunk-world';
import { SEA_LEVEL } from './biomes';

// =============================================================================
// Constants
// =============================================================================

/** Minimum Y for cave carving (protects bedrock). */
const CAVE_MIN_Y = 5;

/** Minimum blocks between cave ceiling and surface. */
const SURFACE_BUFFER = 4;

/** Y threshold below which deepslate replaces stone in caves. */
const DEEPSLATE_Y = 0; // Deepslate not in Block enum; disabled for now

// =============================================================================
// Cave Noise Set — Initialized per seed
// =============================================================================

interface CaveNoiseSet {
  /** Cheese cave noise (low frequency, large chambers). */
  cheese: PerlinNoise;
  /** Spaghetti tunnel noise field A. */
  spaghettiA: PerlinNoise;
  /** Spaghetti tunnel noise field B. */
  spaghettiB: PerlinNoise;
  /** Ravine path noise (2D). */
  ravinePath: PerlinNoise;
  /** Ravine depth noise. */
  ravineDepth: PerlinNoise;
  /** Cave biome/decoration noise. */
  caveBiome: PerlinNoise;
}

const caveNoiseCache: Map<number, CaveNoiseSet> = new Map();

function getCaveNoise(seed: number): CaveNoiseSet {
  let ns = caveNoiseCache.get(seed);
  if (ns) return ns;

  ns = {
    cheese: new PerlinNoise(seed + 6000),
    spaghettiA: new PerlinNoise(seed + 6100),
    spaghettiB: new PerlinNoise(seed + 6200),
    ravinePath: new PerlinNoise(seed + 6300),
    ravineDepth: new PerlinNoise(seed + 6400),
    caveBiome: new PerlinNoise(seed + 6500),
  };
  caveNoiseCache.set(seed, ns);
  return ns;
}

// =============================================================================
// Surface Height Lookup (from chunk heightMap)
// =============================================================================

/**
 * Get the surface Y for a local column in the chunk.
 * Uses the chunk's pre-computed height map.
 */
function getSurfaceY(chunk: Chunk, lx: number, lz: number): number {
  return chunk.heightMap[lz * CHUNK_WIDTH + lx];
}

// =============================================================================
// Block Carving Helper
// =============================================================================

/**
 * Carve a block (set to Air) if it is a carveable block type.
 * Carveable blocks: Stone, Granite, Diorite, Andesite, Dirt, Gravel,
 * Sand, Sandstone, and ore variants.
 * Does NOT carve through: Bedrock, Water, Lava, Leaves, Logs, Air.
 *
 * If the block is adjacent to water, replace with water instead
 * (to avoid draining water bodies into caves).
 */
function carveBlock(chunk: Chunk, lx: number, ly: number, lz: number): void {
  if (lx < 0 || lx >= CHUNK_WIDTH || ly < CAVE_MIN_Y || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_DEPTH) {
    return;
  }

  const idx = blockIndex(lx, ly, lz);
  const block = chunk.blocks[idx];

  // Only carve solid stone-like blocks
  if (
    block === Block.Stone ||
    block === Block.Granite ||
    block === Block.Diorite ||
    block === Block.Andesite ||
    block === Block.Dirt ||
    block === Block.Gravel ||
    block === Block.Sand ||
    block === Block.Sandstone ||
    block === Block.CoalOre ||
    block === Block.IronOre ||
    block === Block.GoldOre ||
    block === Block.DiamondOre ||
    block === Block.RedstoneOre ||
    block === Block.LapisOre ||
    block === Block.EmeraldOre ||
    block === Block.Grass ||
    block === Block.Podzol ||
    block === Block.CoarseDirt
  ) {
    // Check if we'd expose water (above, not sides for performance)
    if (ly + 1 < CHUNK_HEIGHT) {
      const above = chunk.blocks[blockIndex(lx, ly + 1, lz)];
      if (above === Block.Water || above === Block.StillWater) {
        // Don't carve — would drain water into cave
        return;
      }
    }

    chunk.blocks[idx] = Block.Air as BlockId;
  }
}

// =============================================================================
// 1. Cheese Caves — Large Open Chambers
// =============================================================================

/**
 * Cheese caves create large open areas underground using low-frequency
 * 3D noise. The "cheese" name comes from the Swiss cheese-like holes
 * in the terrain.
 *
 * Parameters tuned for large but relatively rare chambers.
 */
function carveChesseCaves(
  chunk: Chunk,
  cx: number,
  cz: number,
  ns: CaveNoiseSet,
): void {
  const baseX = cx * CHUNK_WIDTH;
  const baseZ = cz * CHUNK_DEPTH;

  // Low-frequency noise for large features
  const freqXZ = 0.015;
  const freqY = 0.025;

  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      const surfaceY = getSurfaceY(chunk, lx, lz);
      const maxCaveY = Math.max(CAVE_MIN_Y, surfaceY - SURFACE_BUFFER);

      const worldX = baseX + lx;
      const worldZ = baseZ + lz;

      for (let y = CAVE_MIN_Y; y < maxCaveY; y++) {
        const nx = worldX * freqXZ;
        const ny = y * freqY;
        const nz = worldZ * freqXZ;

        // Single noise sample with high threshold for sparse caves
        const n = ns.cheese.noise3d(nx, ny, nz);

        // Threshold increases with Y to make caves rarer near surface
        const depthFactor = 1 - (y / maxCaveY) * 0.3;
        const threshold = 0.55 * depthFactor;

        if (n > threshold) {
          carveBlock(chunk, lx, y, lz);
        }
      }
    }
  }
}

// =============================================================================
// 2. Spaghetti Caves — Narrow Winding Tunnels
// =============================================================================

/**
 * Spaghetti caves create narrow winding tunnels by computing the intersection
 * of two separate 3D noise fields. Where both fields are near zero, a tunnel
 * forms. This creates long, worm-like passages through the terrain.
 *
 * The "noodle" approach: each noise field defines a surface in 3D; the
 * tunnel forms where both surfaces cross zero simultaneously, creating
 * a 1D curve (the intersection of two 2D surfaces in 3D space).
 */
function carveSpaghettiCaves(
  chunk: Chunk,
  cx: number,
  cz: number,
  ns: CaveNoiseSet,
): void {
  const baseX = cx * CHUNK_WIDTH;
  const baseZ = cz * CHUNK_DEPTH;

  // Medium frequency for winding tunnels
  const freqXZ = 0.04;
  const freqY = 0.04;

  // Tunnel width threshold — smaller = narrower tunnels
  const tunnelWidth = 0.06;

  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      const surfaceY = getSurfaceY(chunk, lx, lz);
      const maxCaveY = Math.max(CAVE_MIN_Y, surfaceY - SURFACE_BUFFER);

      const worldX = baseX + lx;
      const worldZ = baseZ + lz;

      for (let y = CAVE_MIN_Y; y < maxCaveY; y++) {
        const nx = worldX * freqXZ;
        const ny = y * freqY;
        const nz = worldZ * freqXZ;

        // Two separate noise fields
        const nA = ns.spaghettiA.noise3d(nx, ny, nz);
        const nB = ns.spaghettiB.noise3d(
          nx * 1.1 + 100,
          ny * 1.1 + 100,
          nz * 1.1 + 100,
        );

        // Tunnel forms where both values are near zero
        if (Math.abs(nA) < tunnelWidth && Math.abs(nB) < tunnelWidth) {
          carveBlock(chunk, lx, y, lz);

          // Widen tunnel slightly (2-3 block radius)
          if (Math.abs(nA) < tunnelWidth * 0.5 && Math.abs(nB) < tunnelWidth * 0.5) {
            // Carve adjacent blocks for wider passages
            carveBlock(chunk, lx + 1, y, lz);
            carveBlock(chunk, lx - 1, y, lz);
            carveBlock(chunk, lx, y, lz + 1);
            carveBlock(chunk, lx, y, lz - 1);
            carveBlock(chunk, lx, y + 1, lz);
          }
        }
      }
    }
  }
}

// =============================================================================
// 3. Ravines — Deep Narrow Vertical Cuts
// =============================================================================

/**
 * Ravines are deep, narrow canyons that cut vertically through the terrain.
 * Generated using a 2D noise field for the horizontal path and a separate
 * noise for depth. Ravines are narrower than caves but much taller,
 * creating dramatic vertical features.
 */
function carveRavines(
  chunk: Chunk,
  cx: number,
  cz: number,
  ns: CaveNoiseSet,
  seed: number,
): void {
  const baseX = cx * CHUNK_WIDTH;
  const baseZ = cz * CHUNK_DEPTH;

  // Path noise frequency — low for long ravines
  const pathFreq = 0.008;
  // Width of the ravine path
  const pathWidth = 0.03;

  // Depth noise frequency
  const depthFreq = 0.01;

  const rand = seededRandom(positionSeed(seed, cx, 0, cz) + 8888);

  // Only some chunks have ravines (roughly 1 in 50 chance)
  if (rand() > 0.02) return;

  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      const surfaceY = getSurfaceY(chunk, lx, lz);
      const maxCaveY = Math.max(CAVE_MIN_Y, surfaceY - SURFACE_BUFFER);

      const worldX = baseX + lx;
      const worldZ = baseZ + lz;

      // 2D path noise determines where the ravine runs horizontally
      const pathNoise = ns.ravinePath.noise2d(worldX * pathFreq, worldZ * pathFreq);

      // Only carve near the zero-crossing of the path noise
      if (Math.abs(pathNoise) > pathWidth) continue;

      // Depth noise determines how deep the ravine goes
      const depthNoise = (ns.ravineDepth.noise2d(worldX * depthFreq, worldZ * depthFreq) + 1) * 0.5;
      const ravineBottom = CAVE_MIN_Y + Math.floor(depthNoise * 20);
      const ravineTop = maxCaveY;

      // Width tapers with depth (wider at top, narrower at bottom)
      for (let y = ravineBottom; y < ravineTop; y++) {
        // Width factor: wider at top
        const heightFraction = (y - ravineBottom) / Math.max(1, ravineTop - ravineBottom);
        const widthAtY = pathWidth * (0.3 + heightFraction * 0.7);

        if (Math.abs(pathNoise) < widthAtY) {
          carveBlock(chunk, lx, y, lz);
        }
      }
    }
  }
}

// =============================================================================
// Cave Decoration
// =============================================================================

/**
 * Add decorative features to carved caves:
 * - Lava pools at low Y (below y=10)
 * - Water drips from ceiling
 * - Glow lichen on cave walls (if block is available)
 */
function decorateCaves(
  chunk: Chunk,
  cx: number,
  cz: number,
  seed: number,
): void {
  const rand = seededRandom(positionSeed(seed, cx * 16, 100, cz * 16) + 5555);

  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      for (let y = CAVE_MIN_Y; y < 128; y++) {
        const idx = blockIndex(lx, y, lz);

        // Skip non-air blocks
        if (chunk.blocks[idx] !== Block.Air) continue;

        // --- Lava pools at low Y ---
        if (y <= 10) {
          // Check if this is a floor (solid below)
          if (y > 0) {
            const belowIdx = blockIndex(lx, y - 1, lz);
            if (chunk.blocks[belowIdx] === Block.Stone ||
                chunk.blocks[belowIdx] === Block.Bedrock) {
              // Chance of lava on cave floor at low Y
              if (rand() < 0.15) {
                chunk.blocks[idx] = Block.Lava as BlockId;
              }
            }
          }
        }

        // --- Water seepage at medium Y ---
        if (y >= SEA_LEVEL - 10 && y <= SEA_LEVEL) {
          // If there is stone above, small chance of water drip
          if (y + 1 < CHUNK_HEIGHT) {
            const aboveIdx = blockIndex(lx, y + 1, lz);
            if (chunk.blocks[aboveIdx] === Block.Stone && rand() < 0.005) {
              chunk.blocks[idx] = Block.Water as BlockId;
            }
          }
        }
      }
    }
  }
}

// =============================================================================
// Main Cave Carving Entry Point
// =============================================================================

/**
 * Carve all cave types into a chunk. Should be called after the base terrain
 * has been generated but before decorators run.
 *
 * Pipeline:
 * 1. Cheese caves (large chambers)
 * 2. Spaghetti caves (narrow tunnels)
 * 3. Ravines (deep vertical cuts)
 * 4. Cave decoration (lava, water seepage)
 */
export function carveCaves(
  chunk: Chunk,
  cx: number,
  cz: number,
  seed: number,
): void {
  const ns = getCaveNoise(seed);

  // 1. Cheese caves — large open areas
  carveChesseCaves(chunk, cx, cz, ns);

  // 2. Spaghetti caves — narrow winding tunnels
  carveSpaghettiCaves(chunk, cx, cz, ns);

  // 3. Ravines — deep narrow cuts
  carveRavines(chunk, cx, cz, ns, seed);

  // 4. Cave decoration
  decorateCaves(chunk, cx, cz, seed);
}
