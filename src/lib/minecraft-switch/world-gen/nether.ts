// =============================================================================
// Nether Dimension Generator
// =============================================================================
// Full Nether generation with 5 biome zones (Nether Wastes, Soul Sand Valley,
// Crimson Forest, Warped Forest, Basalt Deltas), 3D noise cavities, lava ocean
// at y=31, bedrock floor/ceiling, glowstone clusters, ores, ancient debris,
// nether fortress bridges, and portal mechanics.
// =============================================================================

import {
  Block,
  BlockId,
  Chunk,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  CHUNK_DEPTH,
} from '@/types/minecraft-switch';

import {
  PerlinNoise,
  seededRandom,
  positionSeed,
  createEmptyChunk,
  blockIndex,
  type ChunkedWorld,
} from './chunk-world';

// =============================================================================
// Constants
// =============================================================================

/** Lava ocean surface level in the Nether. */
const NETHER_LAVA_LEVEL = 31;

/** Nether ceiling Y coordinate. */
const NETHER_CEILING = 127;

/** Maximum world height used for terrain generation (below ceiling bedrock). */
const NETHER_TERRAIN_MAX = 122;

/** Minimum terrain height (above floor bedrock). */
const NETHER_TERRAIN_MIN = 5;

/** Nether fortress spacing in chunks. */
const FORTRESS_SPACING = 24;
const FORTRESS_SEPARATION = 6;

// =============================================================================
// Nether Biome System
// =============================================================================

/** Nether biome identifiers. */
export enum NetherBiome {
  NetherWastes = 0,
  SoulSandValley = 1,
  CrimsonForest = 2,
  WarpedForest = 3,
  BasaltDeltas = 4,
}

// =============================================================================
// Noise Set — Cached per seed
// =============================================================================

interface NetherNoiseSet {
  /** Primary 3D terrain noise for cavity carving. */
  terrain: PerlinNoise;
  /** Secondary noise for detail. */
  detail: PerlinNoise;
  /** Biome temperature noise. */
  biomeTemp: PerlinNoise;
  /** Biome humidity noise. */
  biomeHumid: PerlinNoise;
  /** Ore scatter noise. */
  ore: PerlinNoise;
  /** Feature placement noise. */
  feature: PerlinNoise;
}

const netherNoiseCache: Map<number, NetherNoiseSet> = new Map();

function getNetherNoiseSet(seed: number): NetherNoiseSet {
  let ns = netherNoiseCache.get(seed);
  if (ns) return ns;

  ns = {
    terrain: new PerlinNoise(seed + 10000),
    detail: new PerlinNoise(seed + 10100),
    biomeTemp: new PerlinNoise(seed + 10200),
    biomeHumid: new PerlinNoise(seed + 10300),
    ore: new PerlinNoise(seed + 10400),
    feature: new PerlinNoise(seed + 10500),
  };
  netherNoiseCache.set(seed, ns);
  return ns;
}

// =============================================================================
// Biome Selection
// =============================================================================

/**
 * Determine which nether biome occupies a given world column.
 * Uses two noise layers (temperature + humidity) to partition into 5 zones.
 */
function getNetherBiome(ns: NetherNoiseSet, worldX: number, worldZ: number): NetherBiome {
  const freq = 0.008;
  const temp = ns.biomeTemp.fbm2d(worldX * freq, worldZ * freq, 3, 2.0, 0.5);
  const humid = ns.biomeHumid.fbm2d(worldX * freq, worldZ * freq, 3, 2.0, 0.5);

  // Partition the 2D noise space into biome zones
  if (temp > 0.3) {
    // Hot region
    if (humid > 0.2) {
      return NetherBiome.CrimsonForest;
    }
    return NetherBiome.NetherWastes;
  } else if (temp < -0.3) {
    // Cold region
    if (humid > 0.1) {
      return NetherBiome.WarpedForest;
    }
    return NetherBiome.SoulSandValley;
  } else {
    // Neutral region
    if (humid < -0.2) {
      return NetherBiome.BasaltDeltas;
    }
    return NetherBiome.NetherWastes;
  }
}

// =============================================================================
// 3D Terrain Density
// =============================================================================

/**
 * Compute whether a given (x, y, z) position in the Nether is solid.
 * Uses large-scale 3D noise to create massive cavities (scale 0.03).
 * Returns true if the block should be solid (netherrack/biome block).
 */
function isNetherSolid(
  ns: NetherNoiseSet,
  worldX: number,
  y: number,
  worldZ: number,
): boolean {
  // Primary cavity noise: large scale (0.03)
  const scale = 0.03;
  const primary = ns.terrain.noise3d(
    worldX * scale,
    y * scale,
    worldZ * scale,
  );

  // Detail noise: smaller scale for rougher surfaces
  const detailScale = 0.08;
  const detail = ns.detail.noise3d(
    worldX * detailScale,
    y * detailScale,
    worldZ * detailScale,
  ) * 0.3;

  const combined = primary + detail;

  // Bias toward solid near floor and ceiling to maintain structure
  const floorBias = y < 15 ? (15 - y) * 0.05 : 0;
  const ceilingBias = y > 110 ? (y - 110) * 0.05 : 0;

  return (combined + floorBias + ceilingBias) > 0.0;
}

// =============================================================================
// Bedrock Layers
// =============================================================================

/**
 * Place bedrock floor (y=0..4) and ceiling (y=123..127).
 * Y=0 and Y=127 are always bedrock; intermediate layers are random.
 */
function placeNetherBedrock(
  chunk: Chunk,
  lx: number,
  lz: number,
  rand: () => number,
): void {
  // Floor bedrock: y=0 always, y=1..4 decreasing probability
  chunk.blocks[blockIndex(lx, 0, lz)] = Block.Bedrock as BlockId;
  for (let y = 1; y <= 4; y++) {
    if (rand() < (5 - y) / 5) {
      chunk.blocks[blockIndex(lx, y, lz)] = Block.Bedrock as BlockId;
    }
  }

  // Ceiling bedrock: y=127 always, y=123..126 decreasing probability
  chunk.blocks[blockIndex(lx, NETHER_CEILING, lz)] = Block.Bedrock as BlockId;
  for (let y = NETHER_CEILING - 4; y < NETHER_CEILING; y++) {
    const distFromCeiling = NETHER_CEILING - y;
    if (rand() < (5 - distFromCeiling) / 5) {
      chunk.blocks[blockIndex(lx, y, lz)] = Block.Bedrock as BlockId;
    }
  }
}

// =============================================================================
// Biome Surface Replacement
// =============================================================================

/**
 * Replace the surface layer of netherrack with biome-appropriate blocks.
 * Only replaces blocks adjacent to air/lava cavities for a natural look.
 */
function applyBiomeSurface(
  chunk: Chunk,
  lx: number,
  lz: number,
  biome: NetherBiome,
  rand: () => number,
): void {
  for (let y = NETHER_TERRAIN_MIN; y <= NETHER_TERRAIN_MAX; y++) {
    const idx = blockIndex(lx, y, lz);
    if (chunk.blocks[idx] !== Block.Netherrack) continue;

    // Check if this block is adjacent to air (exposed surface)
    const hasAirAbove = y < CHUNK_HEIGHT - 1 && chunk.blocks[blockIndex(lx, y + 1, lz)] === Block.Air;
    const hasAirBelow = y > 0 && chunk.blocks[blockIndex(lx, y - 1, lz)] === Block.Air;

    if (!hasAirAbove && !hasAirBelow) continue;

    switch (biome) {
      case NetherBiome.SoulSandValley:
        if (hasAirAbove) {
          // Surface: soul sand or soul soil
          chunk.blocks[idx] = (rand() < 0.6 ? Block.SoulSand : Block.SoulSoil) as BlockId;
          // Subsurface: soul soil
          if (y > 1) {
            const belowIdx = blockIndex(lx, y - 1, lz);
            if (chunk.blocks[belowIdx] === Block.Netherrack) {
              chunk.blocks[belowIdx] = Block.SoulSoil as BlockId;
            }
          }
        }
        break;

      case NetherBiome.CrimsonForest:
        if (hasAirAbove) {
          chunk.blocks[idx] = Block.CrimsonNylium as BlockId;
        }
        break;

      case NetherBiome.WarpedForest:
        if (hasAirAbove) {
          chunk.blocks[idx] = Block.WarpedNylium as BlockId;
        }
        break;

      case NetherBiome.BasaltDeltas:
        if (hasAirAbove) {
          // Basalt deltas: mix of basalt, blackstone, magma
          const r = rand();
          if (r < 0.5) {
            chunk.blocks[idx] = Block.Basalt as BlockId;
          } else if (r < 0.8) {
            chunk.blocks[idx] = Block.Blackstone as BlockId;
          } else {
            chunk.blocks[idx] = Block.MagmaBlock as BlockId;
          }
        }
        break;

      case NetherBiome.NetherWastes:
      default:
        // Nether wastes: stays netherrack, occasional magma near lava
        if (hasAirBelow && y <= NETHER_LAVA_LEVEL + 3 && rand() < 0.15) {
          chunk.blocks[idx] = Block.MagmaBlock as BlockId;
        }
        break;
    }
  }
}

// =============================================================================
// Glowstone Clusters
// =============================================================================

/**
 * Generate glowstone clusters hanging from the ceiling.
 * Clusters are 3-8 blocks each, hanging downward from solid ceiling areas.
 */
function generateGlowstoneClusters(
  chunk: Chunk,
  lx: number,
  lz: number,
  rand: () => number,
): void {
  // Scan downward from ceiling to find attachment points
  for (let y = NETHER_TERRAIN_MAX; y >= NETHER_TERRAIN_MAX - 10; y--) {
    const idx = blockIndex(lx, y, lz);
    if (chunk.blocks[idx] !== Block.Netherrack) continue;

    // Check for air below (hanging surface)
    if (y <= 0) continue;
    const belowIdx = blockIndex(lx, y - 1, lz);
    if (chunk.blocks[belowIdx] !== Block.Air) continue;

    // Low probability for starting a cluster
    if (rand() < 0.985) continue;

    // Cluster size: 3-8 blocks hanging down
    const size = 3 + Math.floor(rand() * 6);
    for (let dy = 0; dy < size; dy++) {
      const gy = y - 1 - dy;
      if (gy < NETHER_TERRAIN_MIN) break;
      const gIdx = blockIndex(lx, gy, lz);
      if (chunk.blocks[gIdx] !== Block.Air) break;
      chunk.blocks[gIdx] = Block.Glowstone as BlockId;
    }
    break; // One cluster per column at most
  }
}

// =============================================================================
// Nether Ores
// =============================================================================

/**
 * Scatter nether quartz ore, nether gold ore, and ancient debris
 * throughout the chunk.
 */
function generateNetherOres(
  chunk: Chunk,
  cx: number,
  cz: number,
  seed: number,
): void {
  const rand = seededRandom(positionSeed(seed, cx * 16, 100, cz * 16) + 8888);

  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      for (let y = 10; y <= 117; y++) {
        const idx = blockIndex(lx, y, lz);
        if (chunk.blocks[idx] !== Block.Netherrack) continue;

        const r = rand();

        // Nether quartz ore: ~0.5% chance (similar to overworld iron density)
        if (r < 0.005) {
          chunk.blocks[idx] = Block.NetherQuartzOre as BlockId;
          continue;
        }

        // Nether gold ore: ~0.2% chance (rarer)
        if (r < 0.007) {
          chunk.blocks[idx] = Block.NetherGoldOre as BlockId;
          continue;
        }
      }

      // Ancient debris: very rare, y 8-22, max 2 per chunk column
      let debrisCount = 0;
      for (let y = 8; y <= 22 && debrisCount < 2; y++) {
        const idx = blockIndex(lx, y, lz);
        if (chunk.blocks[idx] !== Block.Netherrack) continue;
        if (rand() < 0.0008) {
          chunk.blocks[idx] = Block.AncientDebris as BlockId;
          debrisCount++;
        }
      }
    }
  }
}

// =============================================================================
// Biome-Specific Features
// =============================================================================

/**
 * Generate features unique to each nether biome for a column.
 * Called after terrain and surface are placed.
 */
function generateBiomeFeatures(
  chunk: Chunk,
  lx: number,
  lz: number,
  biome: NetherBiome,
  rand: () => number,
): void {
  switch (biome) {
    case NetherBiome.SoulSandValley:
      generateSoulSandValleyFeatures(chunk, lx, lz, rand);
      break;
    case NetherBiome.CrimsonForest:
      generateCrimsonForestFeatures(chunk, lx, lz, rand);
      break;
    case NetherBiome.WarpedForest:
      generateWarpedForestFeatures(chunk, lx, lz, rand);
      break;
    case NetherBiome.BasaltDeltas:
      generateBasaltDeltasFeatures(chunk, lx, lz, rand);
      break;
    case NetherBiome.NetherWastes:
      generateNetherWastesFeatures(chunk, lx, lz, rand);
      break;
  }
}

/**
 * Soul Sand Valley: bone block fossils, gravel patches, soul fire.
 */
function generateSoulSandValleyFeatures(
  chunk: Chunk,
  lx: number,
  lz: number,
  rand: () => number,
): void {
  for (let y = NETHER_TERRAIN_MIN; y <= NETHER_TERRAIN_MAX; y++) {
    const idx = blockIndex(lx, y, lz);
    const block = chunk.blocks[idx];

    // Bone block fossils: replace some soul sand/soul soil with bone blocks
    if ((block === Block.SoulSand || block === Block.SoulSoil) && rand() < 0.02) {
      chunk.blocks[idx] = Block.BoneBlock as BlockId;
    }

    // Gravel patches in soul sand valleys
    if (block === Block.SoulSand && rand() < 0.05) {
      chunk.blocks[idx] = Block.Gravel as BlockId;
    }

    // Soul fire on top of soul sand/soul soil (represented as torch since no SoulFire block)
    if ((block === Block.SoulSand || block === Block.SoulSoil)) {
      if (y < CHUNK_HEIGHT - 1) {
        const aboveIdx = blockIndex(lx, y + 1, lz);
        if (chunk.blocks[aboveIdx] === Block.Air && rand() < 0.008) {
          chunk.blocks[aboveIdx] = Block.SoulLantern as BlockId;
        }
      }
    }
  }
}

/**
 * Crimson Forest: huge crimson fungi (stem + shroomlight), crimson roots,
 * weeping vines from ceiling.
 */
function generateCrimsonForestFeatures(
  chunk: Chunk,
  lx: number,
  lz: number,
  rand: () => number,
): void {
  for (let y = NETHER_TERRAIN_MIN; y <= NETHER_TERRAIN_MAX; y++) {
    const idx = blockIndex(lx, y, lz);

    // Huge crimson fungi (stem columns with shroomlight caps)
    if (chunk.blocks[idx] === Block.CrimsonNylium) {
      if (y < CHUNK_HEIGHT - 1) {
        const aboveIdx = blockIndex(lx, y + 1, lz);
        if (chunk.blocks[aboveIdx] === Block.Air && rand() < 0.04) {
          // Generate a fungus stem
          const stemHeight = 4 + Math.floor(rand() * 6); // 4-9 blocks tall
          let actualHeight = 0;

          for (let dy = 1; dy <= stemHeight; dy++) {
            const stemY = y + dy;
            if (stemY >= CHUNK_HEIGHT) break;
            const stemIdx = blockIndex(lx, stemY, lz);
            if (chunk.blocks[stemIdx] !== Block.Air) break;
            chunk.blocks[stemIdx] = Block.CrimsonStem as BlockId;
            actualHeight = dy;
          }

          // Cap: place nether wart block and shroomlight at top
          if (actualHeight >= 3) {
            const capY = y + actualHeight + 1;
            if (capY < CHUNK_HEIGHT) {
              const capIdx = blockIndex(lx, capY, lz);
              if (chunk.blocks[capIdx] === Block.Air) {
                chunk.blocks[capIdx] = Block.NetherWartBlock as BlockId;
              }
            }
            // Shroomlight adjacent to cap
            if (capY > 1 && rand() < 0.5) {
              const shroomIdx = blockIndex(lx, capY - 1, lz);
              if (chunk.blocks[shroomIdx] === Block.CrimsonStem) {
                // Place shroomlight one below cap on the stem occasionally
                chunk.blocks[shroomIdx] = Block.ShroomLight as BlockId;
              }
            }
          }
        }
      }
    }

    // Weeping vines: hanging from netherrack ceiling in crimson forests
    if (chunk.blocks[idx] === Block.Netherrack && y > 80) {
      if (y > 0) {
        const belowIdx = blockIndex(lx, y - 1, lz);
        if (chunk.blocks[belowIdx] === Block.Air && rand() < 0.02) {
          // Hang vines downward (use Vine block)
          const vineLength = 2 + Math.floor(rand() * 5);
          for (let dy = 1; dy <= vineLength; dy++) {
            const vy = y - dy;
            if (vy < NETHER_TERRAIN_MIN) break;
            const vIdx = blockIndex(lx, vy, lz);
            if (chunk.blocks[vIdx] !== Block.Air) break;
            chunk.blocks[vIdx] = Block.Vine as BlockId;
          }
        }
      }
    }
  }
}

/**
 * Warped Forest: huge warped fungi, warped roots, twisting vines from floor.
 */
function generateWarpedForestFeatures(
  chunk: Chunk,
  lx: number,
  lz: number,
  rand: () => number,
): void {
  for (let y = NETHER_TERRAIN_MIN; y <= NETHER_TERRAIN_MAX; y++) {
    const idx = blockIndex(lx, y, lz);

    // Huge warped fungi
    if (chunk.blocks[idx] === Block.WarpedNylium) {
      if (y < CHUNK_HEIGHT - 1) {
        const aboveIdx = blockIndex(lx, y + 1, lz);
        if (chunk.blocks[aboveIdx] === Block.Air && rand() < 0.03) {
          // Generate a warped fungus stem
          const stemHeight = 5 + Math.floor(rand() * 7); // 5-11 blocks tall
          let actualHeight = 0;

          for (let dy = 1; dy <= stemHeight; dy++) {
            const stemY = y + dy;
            if (stemY >= CHUNK_HEIGHT) break;
            const stemIdx = blockIndex(lx, stemY, lz);
            if (chunk.blocks[stemIdx] !== Block.Air) break;
            chunk.blocks[stemIdx] = Block.WarpedStem as BlockId;
            actualHeight = dy;
          }

          // Cap: warped wart block + shroomlight
          if (actualHeight >= 4) {
            const capY = y + actualHeight + 1;
            if (capY < CHUNK_HEIGHT) {
              const capIdx = blockIndex(lx, capY, lz);
              if (chunk.blocks[capIdx] === Block.Air) {
                chunk.blocks[capIdx] = Block.WarpedWartBlock as BlockId;
              }
            }
            // Shroomlight embedded in stem
            if (actualHeight > 3 && rand() < 0.4) {
              const lightY = y + Math.floor(actualHeight * 0.7);
              const lightIdx = blockIndex(lx, lightY, lz);
              if (chunk.blocks[lightIdx] === Block.WarpedStem) {
                chunk.blocks[lightIdx] = Block.ShroomLight as BlockId;
              }
            }
          }
        }

        // Twisting vines: grow upward from warped nylium floor
        if (chunk.blocks[blockIndex(lx, y + 1, lz)] === Block.Air && rand() < 0.03) {
          const vineHeight = 2 + Math.floor(rand() * 4);
          for (let dy = 1; dy <= vineHeight; dy++) {
            const vy = y + dy;
            if (vy >= CHUNK_HEIGHT) break;
            const vIdx = blockIndex(lx, vy, lz);
            if (chunk.blocks[vIdx] !== Block.Air) break;
            chunk.blocks[vIdx] = Block.Vine as BlockId;
          }
        }
      }
    }
  }
}

/**
 * Basalt Deltas: more lava pools, magma blocks near lava.
 */
function generateBasaltDeltasFeatures(
  chunk: Chunk,
  lx: number,
  lz: number,
  rand: () => number,
): void {
  for (let y = NETHER_TERRAIN_MIN; y <= NETHER_TERRAIN_MAX; y++) {
    const idx = blockIndex(lx, y, lz);

    // Extra lava pools within basalt terrain
    if (chunk.blocks[idx] === Block.Basalt || chunk.blocks[idx] === Block.Blackstone) {
      if (y < CHUNK_HEIGHT - 1) {
        const aboveIdx = blockIndex(lx, y + 1, lz);
        if (chunk.blocks[aboveIdx] === Block.Air && rand() < 0.01) {
          // Create a small lava pool
          chunk.blocks[aboveIdx] = Block.Lava as BlockId;
          // Add magma blocks around
          chunk.blocks[idx] = Block.MagmaBlock as BlockId;
        }
      }
    }

    // Magma blocks scattered near lava level
    if (chunk.blocks[idx] === Block.Basalt && y <= NETHER_LAVA_LEVEL + 5 && rand() < 0.08) {
      chunk.blocks[idx] = Block.MagmaBlock as BlockId;
    }
  }
}

/**
 * Nether Wastes: fire on netherrack (represented as torch).
 */
function generateNetherWastesFeatures(
  chunk: Chunk,
  lx: number,
  lz: number,
  rand: () => number,
): void {
  for (let y = NETHER_TERRAIN_MIN; y <= NETHER_TERRAIN_MAX; y++) {
    const idx = blockIndex(lx, y, lz);

    // Fire on netherrack surfaces (use Torch as fire representation)
    if (chunk.blocks[idx] === Block.Netherrack) {
      if (y < CHUNK_HEIGHT - 1) {
        const aboveIdx = blockIndex(lx, y + 1, lz);
        if (chunk.blocks[aboveIdx] === Block.Air && rand() < 0.005) {
          chunk.blocks[aboveIdx] = Block.Torch as BlockId;
        }
      }
    }
  }
}

// =============================================================================
// Nether Fortress
// =============================================================================

/**
 * Check if a fortress should generate in the given chunk using grid spacing.
 */
function getFortressPosition(
  cx: number,
  cz: number,
  seed: number,
): { sx: number; sz: number } | null {
  const gridX = Math.floor(cx / FORTRESS_SPACING);
  const gridZ = Math.floor(cz / FORTRESS_SPACING);

  const rand = seededRandom(positionSeed(seed, gridX, 6666, gridZ));

  const offsetX = FORTRESS_SEPARATION + Math.floor(rand() * (FORTRESS_SPACING - FORTRESS_SEPARATION));
  const offsetZ = FORTRESS_SEPARATION + Math.floor(rand() * (FORTRESS_SPACING - FORTRESS_SEPARATION));

  const sx = gridX * FORTRESS_SPACING + offsetX;
  const sz = gridZ * FORTRESS_SPACING + offsetZ;

  if (sx === cx && sz === cz) {
    return { sx, sz };
  }
  return null;
}

/**
 * Generate a simple nether fortress bridge corridor.
 * Creates a 3-block-wide nether brick bridge at ~y=50-70, extending
 * in a primary direction with short cross-corridors.
 */
function generateNetherFortress(
  chunk: Chunk,
  cx: number,
  cz: number,
  seed: number,
): void {
  const rand = seededRandom(positionSeed(seed, cx, 6666, cz));

  const bridgeY = 48 + Math.floor(rand() * 20); // y 48-67
  const direction = rand() < 0.5 ? 'x' : 'z'; // Primary direction

  // Main bridge corridor spanning the entire chunk
  const centerOffset = 7; // Center in chunk
  for (let i = 0; i < CHUNK_WIDTH; i++) {
    for (let w = -1; w <= 1; w++) {
      let lx: number, lz: number;
      if (direction === 'x') {
        lx = i;
        lz = centerOffset + w;
      } else {
        lx = centerOffset + w;
        lz = i;
      }

      if (lx < 0 || lx >= CHUNK_WIDTH || lz < 0 || lz >= CHUNK_DEPTH) continue;

      // Floor
      chunk.blocks[blockIndex(lx, bridgeY, lz)] = Block.NetherBricks as BlockId;

      // Walls on edges
      if (w === -1 || w === 1) {
        chunk.blocks[blockIndex(lx, bridgeY + 1, lz)] = Block.NetherBrickFence as BlockId;
      }

      // Clear above
      for (let dy = 1; dy <= 3; dy++) {
        if (w !== -1 && w !== 1) {
          const clearIdx = blockIndex(lx, bridgeY + dy, lz);
          if (chunk.blocks[clearIdx] === Block.Netherrack) {
            chunk.blocks[clearIdx] = Block.Air as BlockId;
          }
        }
      }

      // Ceiling (optional, every 4 blocks)
      if (i % 4 === 0) {
        chunk.blocks[blockIndex(lx, bridgeY + 4, lz)] = Block.NetherBricks as BlockId;
      }
    }

    // Support pillars every 8 blocks
    if (i % 8 === 0) {
      for (let w = -1; w <= 1; w += 2) {
        let pillarLx: number, pillarLz: number;
        if (direction === 'x') {
          pillarLx = i;
          pillarLz = centerOffset + w;
        } else {
          pillarLx = centerOffset + w;
          pillarLz = i;
        }

        if (pillarLx < 0 || pillarLx >= CHUNK_WIDTH || pillarLz < 0 || pillarLz >= CHUNK_DEPTH) continue;

        // Extend pillar downward until it hits solid ground or lava
        for (let dy = bridgeY - 1; dy >= NETHER_TERRAIN_MIN; dy--) {
          const pIdx = blockIndex(pillarLx, dy, pillarLz);
          if (chunk.blocks[pIdx] === Block.Netherrack || chunk.blocks[pIdx] === Block.Bedrock) break;
          chunk.blocks[pIdx] = Block.NetherBricks as BlockId;
        }
      }
    }
  }

  // Cross corridor at mid-point
  const crossPos = 6 + Math.floor(rand() * 4);
  const crossY = bridgeY;
  for (let i = 0; i < 8; i++) {
    for (let w = -1; w <= 1; w++) {
      let lx: number, lz: number;
      if (direction === 'x') {
        lx = crossPos;
        lz = 4 + i;
      } else {
        lx = 4 + i;
        lz = crossPos;
      }

      // Adjust for width offset
      if (direction === 'x') {
        lz += w;
      } else {
        lx += w;
      }

      if (lx < 0 || lx >= CHUNK_WIDTH || lz < 0 || lz >= CHUNK_DEPTH) continue;

      // Floor
      chunk.blocks[blockIndex(lx, crossY, lz)] = Block.NetherBricks as BlockId;

      // Walls on edges
      if (w === -1 || w === 1) {
        chunk.blocks[blockIndex(lx, crossY + 1, lz)] = Block.NetherBrickFence as BlockId;
      }

      // Clear above
      for (let dy = 1; dy <= 3; dy++) {
        if (w !== -1 && w !== 1) {
          const clearIdx = blockIndex(lx, crossY + dy, lz);
          if (chunk.blocks[clearIdx] === Block.Netherrack) {
            chunk.blocks[clearIdx] = Block.Air as BlockId;
          }
        }
      }
    }
  }

  // Spawner in crossing (for blazes / wither skeletons)
  const spawnerLx = direction === 'x' ? crossPos : 8;
  const spawnerLz = direction === 'x' ? 8 : crossPos;
  if (spawnerLx >= 0 && spawnerLx < CHUNK_WIDTH && spawnerLz >= 0 && spawnerLz < CHUNK_DEPTH) {
    chunk.blocks[blockIndex(spawnerLx, crossY + 1, spawnerLz)] = Block.Spawner as BlockId;
  }

  // Chest with loot near spawner
  const chestLx = Math.min(spawnerLx + 1, CHUNK_WIDTH - 1);
  if (chestLx >= 0 && chestLx < CHUNK_WIDTH && spawnerLz >= 0 && spawnerLz < CHUNK_DEPTH) {
    chunk.blocks[blockIndex(chestLx, crossY + 1, spawnerLz)] = Block.Chest as BlockId;
  }

  // Nether brick stairs at corridor entrance
  if (direction === 'x') {
    for (let w = -1; w <= 1; w++) {
      const sz = centerOffset + w;
      if (sz >= 0 && sz < CHUNK_DEPTH) {
        chunk.blocks[blockIndex(0, bridgeY, sz)] = Block.NetherBrickStairs as BlockId;
        chunk.blocks[blockIndex(CHUNK_WIDTH - 1, bridgeY, sz)] = Block.NetherBrickStairs as BlockId;
      }
    }
  } else {
    for (let w = -1; w <= 1; w++) {
      const sx = centerOffset + w;
      if (sx >= 0 && sx < CHUNK_WIDTH) {
        chunk.blocks[blockIndex(sx, bridgeY, 0)] = Block.NetherBrickStairs as BlockId;
        chunk.blocks[blockIndex(sx, bridgeY, CHUNK_DEPTH - 1)] = Block.NetherBrickStairs as BlockId;
      }
    }
  }
}

// =============================================================================
// Main Nether Chunk Generator
// =============================================================================

/**
 * Generate a complete Nether chunk at chunk coordinates (cx, cz).
 *
 * Generation pipeline:
 * 1. Bedrock floor (y=0..4) and ceiling (y=123..127)
 * 2. 3D noise terrain fill with netherrack
 * 3. Lava ocean at y<=31 for air blocks
 * 4. Biome-aware surface replacement
 * 5. Glowstone clusters
 * 6. Nether ores (quartz, gold, ancient debris)
 * 7. Biome-specific features (fungi, vines, fossils, fire)
 * 8. Nether fortress (every ~24 chunks)
 * 9. Height map calculation
 */
export function generateNetherChunk(cx: number, cz: number, seed: number): Chunk {
  const chunk = createEmptyChunk(cx, cz);
  const ns = getNetherNoiseSet(seed);

  const baseX = cx * CHUNK_WIDTH;
  const baseZ = cz * CHUNK_DEPTH;

  // --- Pass 1: Bedrock + 3D terrain + lava ocean ---
  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      const worldX = baseX + lx;
      const worldZ = baseZ + lz;

      const colRand = seededRandom(positionSeed(seed, worldX, 0, worldZ) + 7777);

      // Bedrock
      placeNetherBedrock(chunk, lx, lz, colRand);

      // 3D terrain fill
      for (let y = NETHER_TERRAIN_MIN; y <= NETHER_TERRAIN_MAX; y++) {
        const idx = blockIndex(lx, y, lz);
        // Skip if bedrock was already placed
        if (chunk.blocks[idx] === Block.Bedrock) continue;

        if (isNetherSolid(ns, worldX, y, worldZ)) {
          chunk.blocks[idx] = Block.Netherrack as BlockId;
        } else if (y <= NETHER_LAVA_LEVEL) {
          // Lava ocean fills air below lava level
          chunk.blocks[idx] = Block.Lava as BlockId;
        }
        // else: remains Air
      }

      // Determine biome for this column
      const biome = getNetherBiome(ns, worldX, worldZ);

      // --- Pass 2: Surface replacement ---
      applyBiomeSurface(chunk, lx, lz, biome, colRand);

      // --- Pass 3: Glowstone clusters ---
      generateGlowstoneClusters(chunk, lx, lz, colRand);

      // --- Pass 4: Biome features ---
      generateBiomeFeatures(chunk, lx, lz, biome, colRand);
    }
  }

  // --- Pass 5: Nether ores ---
  generateNetherOres(chunk, cx, cz, seed);

  // --- Pass 6: Nether fortress ---
  const fortressPos = getFortressPosition(cx, cz, seed);
  if (fortressPos) {
    generateNetherFortress(chunk, cx, cz, seed);
  }

  // --- Pass 7: Height map ---
  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      let highest = 0;
      for (let y = NETHER_CEILING; y >= 0; y--) {
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
// Nether Portal Mechanics
// =============================================================================

/**
 * Validate that an obsidian frame at the given position forms a valid
 * Nether portal. Minimum frame size is 4 wide x 5 tall (2x3 interior).
 * Maximum is 23x23.
 *
 * @param world The chunked world to check
 * @param x X position of bottom-left obsidian of the portal frame
 * @param y Y position of the bottom row of the portal frame
 * @param z Z position of the portal
 * @param axis 'x' or 'z' — which axis the portal faces
 * @returns Object with valid flag and portal dimensions, or null if invalid
 */
export function validateNetherPortal(
  world: ChunkedWorld,
  x: number,
  y: number,
  z: number,
  axis: 'x' | 'z' = 'x',
): { valid: boolean; width: number; height: number } | null {
  // Scan for portal width (obsidian on bottom row)
  let width = 0;
  for (let i = 0; i < 23; i++) {
    const bx = axis === 'x' ? x + i : x;
    const bz = axis === 'z' ? z + i : z;
    const block = world.getBlock(bx, y, bz);
    if (block === Block.Obsidian) {
      width++;
    } else {
      break;
    }
  }

  if (width < 4) return { valid: false, width: 0, height: 0 };

  // Scan for portal height (obsidian on left column)
  let height = 0;
  for (let j = 0; j < 23; j++) {
    const block = world.getBlock(x, y + j, z);
    if (block === Block.Obsidian) {
      height++;
    } else {
      break;
    }
  }

  if (height < 5) return { valid: false, width, height: 0 };

  // Verify complete frame
  // Bottom row
  for (let i = 0; i < width; i++) {
    const bx = axis === 'x' ? x + i : x;
    const bz = axis === 'z' ? z + i : z;
    if (world.getBlock(bx, y, bz) !== Block.Obsidian) {
      return { valid: false, width, height };
    }
  }

  // Top row
  for (let i = 0; i < width; i++) {
    const bx = axis === 'x' ? x + i : x;
    const bz = axis === 'z' ? z + i : z;
    if (world.getBlock(bx, y + height - 1, bz) !== Block.Obsidian) {
      return { valid: false, width, height };
    }
  }

  // Left column
  for (let j = 0; j < height; j++) {
    if (world.getBlock(x, y + j, z) !== Block.Obsidian) {
      return { valid: false, width, height };
    }
  }

  // Right column
  const rightX = axis === 'x' ? x + width - 1 : x;
  const rightZ = axis === 'z' ? z + width - 1 : z;
  for (let j = 0; j < height; j++) {
    if (world.getBlock(rightX, y + j, rightZ) !== Block.Obsidian) {
      return { valid: false, width, height };
    }
  }

  // Interior must be air or portal blocks
  for (let i = 1; i < width - 1; i++) {
    for (let j = 1; j < height - 1; j++) {
      const bx = axis === 'x' ? x + i : x;
      const bz = axis === 'z' ? z + i : z;
      const block = world.getBlock(bx, y + j, bz);
      if (block !== Block.Air && block !== Block.NetherPortal) {
        return { valid: false, width, height };
      }
    }
  }

  return { valid: true, width, height };
}

/**
 * Convert coordinates between overworld and nether dimensions.
 * Overworld -> Nether: divide X and Z by 8.
 * Nether -> Overworld: multiply X and Z by 8.
 * Y coordinate is unchanged.
 *
 * @param pos Source position { x, y, z }
 * @param fromDimension The dimension of the source position
 * @returns Destination position in the other dimension
 */
export function findPortalDestination(
  pos: { x: number; y: number; z: number },
  fromDimension: 'overworld' | 'nether',
): { x: number; y: number; z: number } {
  if (fromDimension === 'overworld') {
    // Overworld -> Nether: 1:8 ratio (divide by 8)
    return {
      x: Math.floor(pos.x / 8),
      y: pos.y,
      z: Math.floor(pos.z / 8),
    };
  } else {
    // Nether -> Overworld: 8:1 ratio (multiply by 8)
    return {
      x: pos.x * 8,
      y: pos.y,
      z: pos.z * 8,
    };
  }
}

/**
 * Build an obsidian portal frame and fill the interior with portal blocks.
 *
 * @param world The chunked world to modify
 * @param x X position of the bottom-left corner
 * @param y Y position of the bottom row
 * @param z Z position of the portal
 * @param axis 'x' or 'z' — which axis the portal faces
 * @param width Frame width (default 4)
 * @param height Frame height (default 5)
 */
export function createNetherPortal(
  world: ChunkedWorld,
  x: number,
  y: number,
  z: number,
  axis: 'x' | 'z' = 'x',
  width: number = 4,
  height: number = 5,
): void {
  // Clamp dimensions
  width = Math.max(4, Math.min(23, width));
  height = Math.max(5, Math.min(23, height));

  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const bx = axis === 'x' ? x + i : x;
      const bz = axis === 'z' ? z + i : z;
      const by = y + j;

      const isFrame =
        i === 0 || i === width - 1 ||
        j === 0 || j === height - 1;

      if (isFrame) {
        // Obsidian frame
        world.setBlock(bx, by, bz, Block.Obsidian as BlockId);
      } else {
        // Portal block interior
        world.setBlock(bx, by, bz, Block.NetherPortal as BlockId);
      }
    }
  }
}
