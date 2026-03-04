// =============================================================================
// End Dimension Generator
// =============================================================================
// Full End generation with a central island (spawn area), obsidian pillars
// with end crystals, bedrock exit portal, outer islands (1000+ blocks from
// center) with chorus trees, simplified end city towers, end portal activation
// helpers, and void mechanics.
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

/** Radius of the central End island in blocks. */
const CENTRAL_ISLAND_RADIUS = 100;

/** Y center of the main island. */
const ISLAND_CENTER_Y = 64;

/** Distance from origin where outer islands begin. */
const OUTER_ISLAND_MIN_DISTANCE = 1000;

/** Radius of the obsidian pillar circle from world center. */
const PILLAR_CIRCLE_RADIUS = 43;

/** Number of obsidian pillars around the exit portal. */
const PILLAR_COUNT = 10;

/** Y coordinate of the exit portal base. */
const EXIT_PORTAL_Y = 62;

/** End city spacing in chunks (for outer islands). */
const END_CITY_SPACING = 20;
const END_CITY_SEPARATION = 4;

// =============================================================================
// Noise Cache
// =============================================================================

interface EndNoiseSet {
  /** Surface deformation noise for the central island. */
  surface: PerlinNoise;
  /** 3D shape noise for central island interior. */
  shape: PerlinNoise;
  /** 2D noise for outer island placement. */
  outerIsland: PerlinNoise;
  /** 3D noise for outer island shape. */
  outerShape: PerlinNoise;
  /** Feature scatter noise. */
  feature: PerlinNoise;
}

const endNoiseCache: Map<number, EndNoiseSet> = new Map();

function getEndNoiseSet(seed: number): EndNoiseSet {
  let ns = endNoiseCache.get(seed);
  if (ns) return ns;

  ns = {
    surface: new PerlinNoise(seed + 20000),
    shape: new PerlinNoise(seed + 20100),
    outerIsland: new PerlinNoise(seed + 20200),
    outerShape: new PerlinNoise(seed + 20300),
    feature: new PerlinNoise(seed + 20400),
  };
  endNoiseCache.set(seed, ns);
  return ns;
}

// =============================================================================
// Obsidian Pillar Configuration
// =============================================================================

interface PillarConfig {
  /** World X position. */
  x: number;
  /** World Z position. */
  z: number;
  /** Height of the pillar top (y coordinate). */
  height: number;
  /** Radius of the pillar (2 or 3). */
  radius: number;
  /** Whether this pillar has an iron bars cage around its crystal. */
  hasCage: boolean;
}

/**
 * Generate deterministic pillar configurations for a given seed.
 * 10 pillars arranged in a circle at radius 43 from (0, 0).
 */
function getPillarConfigs(seed: number): PillarConfig[] {
  const rand = seededRandom(seed + 25000);
  const pillars: PillarConfig[] = [];

  for (let i = 0; i < PILLAR_COUNT; i++) {
    const angle = (i / PILLAR_COUNT) * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * PILLAR_CIRCLE_RADIUS);
    const z = Math.round(Math.sin(angle) * PILLAR_CIRCLE_RADIUS);

    // Heights vary from 76 to 103
    const height = 76 + Math.floor(rand() * 28);

    // Radius alternates between 2 and 3
    const radius = rand() < 0.4 ? 3 : 2;

    // Some pillars have iron bar cages
    const hasCage = rand() < 0.4;

    pillars.push({ x, z, height, radius, hasCage });
  }

  return pillars;
}

// =============================================================================
// Central Island Generation
// =============================================================================

/**
 * Generate the central End island for a chunk.
 * The island is an ellipsoid centered at (0, 0) with noise deformation.
 * Surface is end stone.
 */
function generateCentralIsland(
  chunk: Chunk,
  ns: EndNoiseSet,
  worldX: number,
  worldZ: number,
  lx: number,
  lz: number,
): void {
  const distSq = worldX * worldX + worldZ * worldZ;
  const dist = Math.sqrt(distSq);

  // Beyond the island radius + fade zone, skip
  if (dist > CENTRAL_ISLAND_RADIUS + 30) return;

  // Radius factor: 1 at center, 0 at edge
  const radiusFactor = 1.0 - (dist / (CENTRAL_ISLAND_RADIUS + 10));
  if (radiusFactor <= 0) return;

  // Surface noise for undulation
  const surfaceNoise = ns.surface.fbm2d(worldX * 0.03, worldZ * 0.03, 4, 2.0, 0.5) * 8;

  // 3D shape noise for caves/overhangs within the island
  const maxHeight = ISLAND_CENTER_Y + Math.floor(radiusFactor * 20 + surfaceNoise);
  const minHeight = ISLAND_CENTER_Y - Math.floor(radiusFactor * 15 + surfaceNoise * 0.5);

  for (let y = Math.max(0, minHeight); y <= Math.min(CHUNK_HEIGHT - 1, maxHeight); y++) {
    // Optional 3D noise carving for internal caves
    const shapeNoise = ns.shape.noise3d(
      worldX * 0.05,
      y * 0.05,
      worldZ * 0.05,
    );

    // Only carve caves in the interior, not near the surface
    const surfaceDist = Math.min(y - minHeight, maxHeight - y);
    const allowCaving = surfaceDist > 3;

    if (allowCaving && shapeNoise < -0.6) continue; // Carved out

    chunk.blocks[blockIndex(lx, y, lz)] = Block.EndStone as BlockId;
  }
}

// =============================================================================
// Obsidian Pillars
// =============================================================================

/**
 * Place obsidian pillars within the chunk if any pillar centers fall here.
 * Each pillar is a vertical cylinder of obsidian with an end crystal
 * (represented as EndRod) on top.
 */
function placeObsidianPillars(
  chunk: Chunk,
  cx: number,
  cz: number,
  seed: number,
): void {
  const pillars = getPillarConfigs(seed);
  const baseX = cx * CHUNK_WIDTH;
  const baseZ = cz * CHUNK_DEPTH;

  for (const pillar of pillars) {
    // Check if any part of this pillar falls within this chunk
    const minPillarX = pillar.x - pillar.radius - (pillar.hasCage ? 1 : 0);
    const maxPillarX = pillar.x + pillar.radius + (pillar.hasCage ? 1 : 0);
    const minPillarZ = pillar.z - pillar.radius - (pillar.hasCage ? 1 : 0);
    const maxPillarZ = pillar.z + pillar.radius + (pillar.hasCage ? 1 : 0);

    if (maxPillarX < baseX || minPillarX >= baseX + CHUNK_WIDTH) continue;
    if (maxPillarZ < baseZ || minPillarZ >= baseZ + CHUNK_DEPTH) continue;

    // Place the pillar column-by-column
    for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
      for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
        const worldX = baseX + lx;
        const worldZ = baseZ + lz;

        const dx = worldX - pillar.x;
        const dz = worldZ - pillar.z;
        const distSq = dx * dx + dz * dz;

        // Pillar body (cylinder)
        if (distSq <= pillar.radius * pillar.radius) {
          // Build from island surface up to pillar height
          const startY = Math.max(ISLAND_CENTER_Y - 10, 1);
          for (let y = startY; y <= pillar.height; y++) {
            chunk.blocks[blockIndex(lx, y, lz)] = Block.Obsidian as BlockId;
          }

          // End crystal on top (use EndRod as representation)
          if (dx === 0 && dz === 0) {
            const crystalY = pillar.height + 1;
            if (crystalY < CHUNK_HEIGHT) {
              chunk.blocks[blockIndex(lx, crystalY, lz)] = Block.EndRod as BlockId;
            }
          }
        }

        // Iron bars cage around crystal (if applicable)
        if (pillar.hasCage) {
          const cageRadius = pillar.radius + 1;
          const cageDist = Math.sqrt(distSq);

          if (cageDist >= pillar.radius && cageDist <= cageRadius) {
            // Cage walls: 3 blocks tall around the crystal
            for (let dy = -1; dy <= 2; dy++) {
              const cageY = pillar.height + dy;
              if (cageY >= 0 && cageY < CHUNK_HEIGHT) {
                chunk.blocks[blockIndex(lx, cageY, lz)] = Block.IronBars as BlockId;
              }
            }
            // Cage top
            const topY = pillar.height + 2;
            if (topY < CHUNK_HEIGHT) {
              chunk.blocks[blockIndex(lx, topY, lz)] = Block.IronBars as BlockId;
            }
          }
        }
      }
    }
  }
}

// =============================================================================
// Exit Portal (Bedrock Frame)
// =============================================================================

/**
 * Place the bedrock exit portal at (0, EXIT_PORTAL_Y, 0).
 * The portal is a 5x5 bedrock frame with an empty interior.
 * Initially inactive (no portal blocks). A dragon egg placeholder sits above.
 */
function placeExitPortal(
  chunk: Chunk,
  cx: number,
  cz: number,
): void {
  const baseX = cx * CHUNK_WIDTH;
  const baseZ = cz * CHUNK_DEPTH;

  // Exit portal center is at world (0, EXIT_PORTAL_Y, 0)
  // Check if this chunk contains any part of the 5x5 portal
  const portalMinX = -2;
  const portalMaxX = 2;
  const portalMinZ = -2;
  const portalMaxZ = 2;

  if (portalMaxX < baseX || portalMinX >= baseX + CHUNK_WIDTH) return;
  if (portalMaxZ < baseZ || portalMinZ >= baseZ + CHUNK_DEPTH) return;

  for (let dx = portalMinX; dx <= portalMaxX; dx++) {
    for (let dz = portalMinZ; dz <= portalMaxZ; dz++) {
      const worldX = dx;
      const worldZ = dz;

      // Convert to local coordinates
      const lx = worldX - baseX;
      const lz = worldZ - baseZ;

      if (lx < 0 || lx >= CHUNK_WIDTH || lz < 0 || lz >= CHUNK_DEPTH) continue;

      const isEdge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
      const isCorner = Math.abs(dx) === 2 && Math.abs(dz) === 2;

      if (isCorner) continue; // No corners — circular-ish frame

      if (isEdge) {
        // Bedrock frame border
        chunk.blocks[blockIndex(lx, EXIT_PORTAL_Y, lz)] = Block.Bedrock as BlockId;
      } else {
        // Interior: empty for now (portal activates after dragon death)
        // Place bedrock base under interior
        chunk.blocks[blockIndex(lx, EXIT_PORTAL_Y - 1, lz)] = Block.Bedrock as BlockId;
      }

      // Center pillar with torch (acts as beacon marker)
      if (dx === 0 && dz === 0) {
        chunk.blocks[blockIndex(lx, EXIT_PORTAL_Y, lz)] = Block.Bedrock as BlockId;
        chunk.blocks[blockIndex(lx, EXIT_PORTAL_Y + 1, lz)] = Block.Torch as BlockId;
      }
    }
  }
}

// =============================================================================
// Outer Island Generation
// =============================================================================

/**
 * Check if an outer island exists at the given world column.
 * Uses 2D noise with a threshold for island detection.
 * Only applies beyond OUTER_ISLAND_MIN_DISTANCE from origin.
 */
function hasOuterIsland(
  ns: EndNoiseSet,
  worldX: number,
  worldZ: number,
): boolean {
  const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);
  if (dist < OUTER_ISLAND_MIN_DISTANCE) return false;

  // Use noise to determine island presence
  const freq = 0.004;
  const n = ns.outerIsland.fbm2d(worldX * freq, worldZ * freq, 3, 2.0, 0.5);

  // Higher threshold = sparser islands
  return n > 0.25;
}

/**
 * Generate outer End island terrain for a column.
 * Creates floating islands of end stone with noise shaping.
 */
function generateOuterIsland(
  chunk: Chunk,
  ns: EndNoiseSet,
  worldX: number,
  worldZ: number,
  lx: number,
  lz: number,
): void {
  if (!hasOuterIsland(ns, worldX, worldZ)) return;

  // Island height and thickness from noise
  const heightNoise = ns.outerShape.fbm2d(worldX * 0.01, worldZ * 0.01, 3, 2.0, 0.5);
  const centerY = 55 + Math.floor(heightNoise * 15); // 40-70 range
  const thickness = 4 + Math.floor(Math.abs(heightNoise) * 10); // 4-14 blocks thick

  // Edge fade: based on how far above threshold
  const freq = 0.004;
  const islandStrength = ns.outerIsland.fbm2d(worldX * freq, worldZ * freq, 3, 2.0, 0.5) - 0.25;
  const fade = Math.min(1.0, islandStrength * 5); // 0-1 based on distance from threshold

  const actualThickness = Math.floor(thickness * fade);
  if (actualThickness < 1) return;

  const halfThickness = Math.floor(actualThickness / 2);

  for (let y = centerY - halfThickness; y <= centerY + halfThickness; y++) {
    if (y < 0 || y >= CHUNK_HEIGHT) continue;

    // 3D noise for island surface detail
    const detail = ns.outerShape.noise3d(
      worldX * 0.06,
      y * 0.06,
      worldZ * 0.06,
    );

    // Carve some details
    if (detail < -0.5 && Math.abs(y - centerY) > 1) continue;

    chunk.blocks[blockIndex(lx, y, lz)] = Block.EndStone as BlockId;
  }
}

// =============================================================================
// Chorus Trees
// =============================================================================

/**
 * Generate a chorus tree at the given position within a chunk.
 * Chorus trees consist of ChorusPlant blocks growing upward with branches,
 * and ChorusFlower blocks at the tips.
 */
function generateChorusTree(
  chunk: Chunk,
  lx: number,
  surfaceY: number,
  lz: number,
  rand: () => number,
): void {
  const trunkHeight = 3 + Math.floor(rand() * 8); // 3-10 blocks
  const startY = surfaceY + 1;

  // Main trunk
  let maxY = startY;
  for (let dy = 0; dy < trunkHeight; dy++) {
    const y = startY + dy;
    if (y >= CHUNK_HEIGHT) break;
    chunk.blocks[blockIndex(lx, y, lz)] = Block.ChorusPlant as BlockId;
    maxY = y;
  }

  // Branches: 1-3 branches from the trunk
  const branchCount = 1 + Math.floor(rand() * 3);

  for (let b = 0; b < branchCount; b++) {
    const branchY = startY + 2 + Math.floor(rand() * (trunkHeight - 2));
    if (branchY >= CHUNK_HEIGHT - 3) continue;

    // Branch direction: offset in x or z
    const branchDir = Math.floor(rand() * 4);
    let bx = lx;
    let bz = lz;

    // Branch length: 1-3 blocks horizontal + 1-3 vertical
    const hLen = 1 + Math.floor(rand() * 3);
    const vLen = 1 + Math.floor(rand() * 3);

    // Horizontal part
    for (let i = 1; i <= hLen; i++) {
      switch (branchDir) {
        case 0: bx = lx + i; break;
        case 1: bx = lx - i; break;
        case 2: bz = lz + i; break;
        case 3: bz = lz - i; break;
      }

      if (bx < 0 || bx >= CHUNK_WIDTH || bz < 0 || bz >= CHUNK_DEPTH) break;

      const bIdx = blockIndex(bx, branchY, bz);
      if (chunk.blocks[bIdx] !== Block.Air) break;
      chunk.blocks[bIdx] = Block.ChorusPlant as BlockId;
    }

    // Vertical part (grows upward from end of horizontal)
    if (bx >= 0 && bx < CHUNK_WIDTH && bz >= 0 && bz < CHUNK_DEPTH) {
      for (let v = 1; v <= vLen; v++) {
        const vy = branchY + v;
        if (vy >= CHUNK_HEIGHT) break;
        const vIdx = blockIndex(bx, vy, bz);
        if (chunk.blocks[vIdx] !== Block.Air) break;
        chunk.blocks[vIdx] = Block.ChorusPlant as BlockId;

        // Flower at tip
        if (v === vLen && vy + 1 < CHUNK_HEIGHT) {
          const fIdx = blockIndex(bx, vy + 1, bz);
          if (chunk.blocks[fIdx] === Block.Air) {
            chunk.blocks[fIdx] = Block.ChorusFlower as BlockId;
          }
        }
      }
    }
  }

  // Flower at top of main trunk
  if (maxY + 1 < CHUNK_HEIGHT) {
    const topIdx = blockIndex(lx, maxY + 1, lz);
    if (chunk.blocks[topIdx] === Block.Air) {
      chunk.blocks[topIdx] = Block.ChorusFlower as BlockId;
    }
  }
}

// =============================================================================
// End City (Simplified)
// =============================================================================

/**
 * Check if an end city should generate at this chunk position.
 * Only on outer islands.
 */
function getEndCityPosition(
  cx: number,
  cz: number,
  seed: number,
): { sx: number; sz: number } | null {
  const gridX = Math.floor(cx / END_CITY_SPACING);
  const gridZ = Math.floor(cz / END_CITY_SPACING);

  const rand = seededRandom(positionSeed(seed, gridX, 9999, gridZ));

  const offsetX = END_CITY_SEPARATION + Math.floor(rand() * (END_CITY_SPACING - END_CITY_SEPARATION));
  const offsetZ = END_CITY_SEPARATION + Math.floor(rand() * (END_CITY_SPACING - END_CITY_SEPARATION));

  const sx = gridX * END_CITY_SPACING + offsetX;
  const sz = gridZ * END_CITY_SPACING + offsetZ;

  if (sx === cx && sz === cz) {
    return { sx, sz };
  }
  return null;
}

/**
 * Generate a simplified end city — a 7x7 purpur tower with shulker boxes.
 * Only placed on outer islands where end stone exists.
 */
function generateEndCity(
  chunk: Chunk,
  cx: number,
  cz: number,
  seed: number,
): void {
  const rand = seededRandom(positionSeed(seed, cx, 9999, cz));

  // Find a surface position in the chunk with end stone
  let foundSurface = -1;
  const towerLx = 4 + Math.floor(rand() * 8);
  const towerLz = 4 + Math.floor(rand() * 8);

  // Scan for end stone surface
  for (let y = CHUNK_HEIGHT - 1; y >= 1; y--) {
    if (chunk.blocks[blockIndex(towerLx, y, towerLz)] === Block.EndStone) {
      foundSurface = y;
      break;
    }
  }

  if (foundSurface < 0) return; // No surface to build on

  const towerWidth = 7;
  const towerHeight = 15 + Math.floor(rand() * 15); // 15-29 blocks tall
  const baseY = foundSurface + 1;

  // Build tower shell
  for (let dy = 0; dy < towerHeight; dy++) {
    const y = baseY + dy;
    if (y >= CHUNK_HEIGHT) break;

    for (let dx = 0; dx < towerWidth; dx++) {
      for (let dz = 0; dz < towerWidth; dz++) {
        const lx = towerLx + dx - Math.floor(towerWidth / 2);
        const lz = towerLz + dz - Math.floor(towerWidth / 2);

        if (lx < 0 || lx >= CHUNK_WIDTH || lz < 0 || lz >= CHUNK_DEPTH) continue;

        const isEdge = dx === 0 || dx === towerWidth - 1 || dz === 0 || dz === towerWidth - 1;
        const isFloor = dy === 0 || (dy % 5 === 0); // Floor every 5 blocks
        const isRoof = dy === towerHeight - 1;

        if (isEdge || isFloor || isRoof) {
          // Walls and floors: purpur blocks
          const block = dy % 5 === 0 && isEdge
            ? Block.PurpurPillar as BlockId
            : Block.PurpurBlock as BlockId;
          chunk.blocks[blockIndex(lx, y, lz)] = block;
        } else {
          // Interior: air
          chunk.blocks[blockIndex(lx, y, lz)] = Block.Air as BlockId;
        }
      }
    }

    // Windows: end rod on every other floor at mid-wall
    if (dy > 0 && dy % 5 === 2) {
      const midW = Math.floor(towerWidth / 2);

      // North and south windows
      const northLx = towerLx;
      const southLx = towerLx;
      const northLz = towerLz - Math.floor(towerWidth / 2);
      const southLz = towerLz + Math.floor(towerWidth / 2);

      if (northLx >= 0 && northLx < CHUNK_WIDTH && northLz >= 0 && northLz < CHUNK_DEPTH) {
        chunk.blocks[blockIndex(northLx, y, northLz)] = Block.EndRod as BlockId;
      }
      if (southLx >= 0 && southLx < CHUNK_WIDTH && southLz >= 0 && southLz < CHUNK_DEPTH) {
        chunk.blocks[blockIndex(southLx, y, southLz)] = Block.EndRod as BlockId;
      }

      // East and west windows
      const eastLx = towerLx + midW;
      const westLx = towerLx - midW;

      if (eastLx >= 0 && eastLx < CHUNK_WIDTH && towerLz >= 0 && towerLz < CHUNK_DEPTH) {
        chunk.blocks[blockIndex(eastLx, y, towerLz)] = Block.EndRod as BlockId;
      }
      if (westLx >= 0 && westLx < CHUNK_WIDTH && towerLz >= 0 && towerLz < CHUNK_DEPTH) {
        chunk.blocks[blockIndex(westLx, y, towerLz)] = Block.EndRod as BlockId;
      }
    }
  }

  // Shulker boxes inside (1-3)
  const shulkerCount = 1 + Math.floor(rand() * 3);
  for (let s = 0; s < shulkerCount; s++) {
    const sy = baseY + 1 + Math.floor(rand() * Math.min(towerHeight - 2, 20));
    const slx = towerLx - 1 + Math.floor(rand() * 3);
    const slz = towerLz - 1 + Math.floor(rand() * 3);

    if (slx >= 0 && slx < CHUNK_WIDTH && slz >= 0 && slz < CHUNK_DEPTH && sy < CHUNK_HEIGHT) {
      const sIdx = blockIndex(slx, sy, slz);
      if (chunk.blocks[sIdx] === Block.Air) {
        chunk.blocks[sIdx] = Block.ShulkerBox as BlockId;
      }
    }
  }

  // Chest with loot
  const chestY = baseY + 1;
  const chestLx = towerLx + 1;
  const chestLz = towerLz + 1;
  if (chestLx >= 0 && chestLx < CHUNK_WIDTH && chestLz >= 0 && chestLz < CHUNK_DEPTH && chestY < CHUNK_HEIGHT) {
    const cIdx = blockIndex(chestLx, chestY, chestLz);
    if (chunk.blocks[cIdx] === Block.Air) {
      chunk.blocks[cIdx] = Block.Chest as BlockId;
    }
  }

  // Purpur stairs entrance at ground level
  for (let dx = -1; dx <= 1; dx++) {
    const entranceLx = towerLx + dx;
    const entranceLz = towerLz - Math.floor(towerWidth / 2);
    if (entranceLx >= 0 && entranceLx < CHUNK_WIDTH && entranceLz >= 0 && entranceLz < CHUNK_DEPTH) {
      chunk.blocks[blockIndex(entranceLx, baseY, entranceLz)] = Block.PurpurStairs as BlockId;
      // Clear doorway
      if (baseY + 1 < CHUNK_HEIGHT) {
        chunk.blocks[blockIndex(entranceLx, baseY + 1, entranceLz)] = Block.Air as BlockId;
      }
      if (baseY + 2 < CHUNK_HEIGHT) {
        chunk.blocks[blockIndex(entranceLx, baseY + 2, entranceLz)] = Block.Air as BlockId;
      }
    }
  }
}

// =============================================================================
// Main End Chunk Generator
// =============================================================================

/**
 * Generate a complete End chunk at chunk coordinates (cx, cz).
 *
 * Generation pipeline:
 * 1. Central island: end stone ellipsoid with noise (within ~100 blocks of origin)
 * 2. Obsidian pillars: 10 pillars in a circle at radius 43
 * 3. Exit portal: bedrock frame at (0, 62, 0)
 * 4. Outer islands: floating end stone masses (1000+ blocks from center)
 * 5. Chorus trees: on outer island surfaces
 * 6. End cities: simplified purpur towers on outer islands
 * 7. Height map calculation
 *
 * Everything below y=0 is void (falling = instant death).
 */
export function generateEndChunk(cx: number, cz: number, seed: number): Chunk {
  const chunk = createEmptyChunk(cx, cz);
  const ns = getEndNoiseSet(seed);

  const baseX = cx * CHUNK_WIDTH;
  const baseZ = cz * CHUNK_DEPTH;

  // Determine if this chunk is near the central island or in outer islands
  const chunkCenterX = baseX + 8;
  const chunkCenterZ = baseZ + 8;
  const chunkDist = Math.sqrt(chunkCenterX * chunkCenterX + chunkCenterZ * chunkCenterZ);

  const isCentralArea = chunkDist < CENTRAL_ISLAND_RADIUS + 50;
  const isOuterArea = chunkDist >= OUTER_ISLAND_MIN_DISTANCE - 100;

  // --- Pass 1: Terrain generation ---
  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      const worldX = baseX + lx;
      const worldZ = baseZ + lz;

      if (isCentralArea) {
        generateCentralIsland(chunk, ns, worldX, worldZ, lx, lz);
      }

      if (isOuterArea) {
        generateOuterIsland(chunk, ns, worldX, worldZ, lx, lz);
      }
    }
  }

  // --- Pass 2: Obsidian pillars (central area only) ---
  if (isCentralArea) {
    placeObsidianPillars(chunk, cx, cz, seed);
  }

  // --- Pass 3: Exit portal (central area only) ---
  if (isCentralArea) {
    placeExitPortal(chunk, cx, cz);
  }

  // --- Pass 4: Chorus trees (outer islands only) ---
  if (isOuterArea) {
    for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
      for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
        // Find end stone surface
        let surfaceY = -1;
        for (let y = CHUNK_HEIGHT - 1; y >= 1; y--) {
          if (chunk.blocks[blockIndex(lx, y, lz)] === Block.EndStone) {
            surfaceY = y;
            break;
          }
        }

        if (surfaceY < 0) continue;

        // Check for air above
        if (surfaceY >= CHUNK_HEIGHT - 2) continue;
        if (chunk.blocks[blockIndex(lx, surfaceY + 1, lz)] !== Block.Air) continue;

        const worldX = baseX + lx;
        const worldZ = baseZ + lz;
        const colRand = seededRandom(positionSeed(seed, worldX, 0, worldZ) + 22222);

        // ~3% chance for chorus tree
        if (colRand() < 0.03) {
          generateChorusTree(chunk, lx, surfaceY, lz, colRand);
        }
      }
    }
  }

  // --- Pass 5: End cities (outer islands only) ---
  if (isOuterArea) {
    const cityPos = getEndCityPosition(cx, cz, seed);
    if (cityPos) {
      generateEndCity(chunk, cx, cz, seed);
    }
  }

  // --- Pass 6: Height map ---
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
// End Portal Activation Helpers
// =============================================================================

/**
 * Check if all 12 end portal frame blocks around a stronghold portal
 * have eyes of ender placed in them.
 *
 * The portal frame positions are defined relative to a center point:
 * 3 frames on each side of a 5x5 ring (12 total, no corners).
 *
 * Since we represent frame blocks as EndPortalFrame (BlockId 403),
 * an "activated" frame would need metadata. For simplicity, this function
 * checks if all 12 positions are EndPortalFrame blocks.
 *
 * @param world The chunked world
 * @param centerX Center X of the portal ring
 * @param centerY Y of the portal frame blocks
 * @param centerZ Center Z of the portal ring
 * @returns true if all 12 frames exist (eye placement is metadata-level)
 */
export function checkEndPortal(
  world: ChunkedWorld,
  centerX: number,
  centerY: number,
  centerZ: number,
): boolean {
  // 12 frame positions relative to center (5x5 ring, no corners)
  const framePositions = [
    // North side
    { dx: -1, dz: -2 }, { dx: 0, dz: -2 }, { dx: 1, dz: -2 },
    // South side
    { dx: -1, dz: 2 }, { dx: 0, dz: 2 }, { dx: 1, dz: 2 },
    // West side
    { dx: -2, dz: -1 }, { dx: -2, dz: 0 }, { dx: -2, dz: 1 },
    // East side
    { dx: 2, dz: -1 }, { dx: 2, dz: 0 }, { dx: 2, dz: 1 },
  ];

  for (const pos of framePositions) {
    const block = world.getBlock(centerX + pos.dx, centerY, centerZ + pos.dz);
    if (block !== Block.EndPortalFrame) {
      return false;
    }
  }

  return true;
}

/**
 * Activate an end portal by filling the interior with end portal blocks.
 * Should be called after verifying all 12 frames have eyes of ender.
 *
 * @param world The chunked world
 * @param centerX Center X of the portal ring
 * @param centerY Y of the portal frame blocks
 * @param centerZ Center Z of the portal ring
 */
export function activateEndPortal(
  world: ChunkedWorld,
  centerX: number,
  centerY: number,
  centerZ: number,
): void {
  // Fill the 3x3 interior with end portal blocks
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      world.setBlock(
        centerX + dx,
        centerY,
        centerZ + dz,
        Block.EndPortal as BlockId,
      );
    }
  }
}

/**
 * Activate the exit portal in the End after the Ender Dragon is defeated.
 * Fills the exit portal frame interior with end portal blocks and places
 * a dragon egg on top of the central pillar.
 *
 * @param world The chunked world
 */
export function activateExitPortal(world: ChunkedWorld): void {
  // Exit portal is at (0, EXIT_PORTAL_Y, 0)
  // Fill interior with end portal blocks
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      world.setBlock(dx, EXIT_PORTAL_Y, dz, Block.EndPortal as BlockId);
    }
  }

  // Place dragon egg on top of center pillar
  world.setBlock(0, EXIT_PORTAL_Y + 1, 0, Block.DragonEgg as BlockId);
}

/**
 * Check if a position is in the void (below the End islands).
 * In the End, falling below y=0 is instant death.
 *
 * @param y Y coordinate to check
 * @returns true if the position is in the void
 */
export function isInVoid(y: number): boolean {
  return y < 0;
}
