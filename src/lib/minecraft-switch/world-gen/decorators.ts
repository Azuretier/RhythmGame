// =============================================================================
// Feature Decoration Pass
// =============================================================================
// Runs after terrain generation and cave carving to place trees, flowers,
// tall grass, sugar cane, cacti, pumpkins, mushrooms, dead bushes, and
// lily pads. Each feature respects biome-specific rules for placement.
// =============================================================================

import {
  Block,
  BlockId,
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  CHUNK_HEIGHT,
} from '@/types/minecraft-switch';

import type { TreeType } from '@/types/minecraft-switch';

import {
  type ChunkedWorld,
  seededRandom,
  positionSeed,
} from './chunk-world';

import {
  BIOME_BY_INDEX,
  SEA_LEVEL,
  selectTreeType,
  getBiomeFlowers,
  type BiomeProperties,
} from './biomes';

// =============================================================================
// Tree Generators
// =============================================================================

/**
 * Place an oak tree (4-6 trunk + rounded canopy).
 * Trunk is 4-6 blocks of OakLog, canopy is OakLeaves in a rounded shape.
 */
function placeOakTree(world: ChunkedWorld, x: number, y: number, z: number, rand: () => number): void {
  const trunkHeight = 4 + Math.floor(rand() * 3); // 4-6

  // Check space
  for (let dy = 0; dy <= trunkHeight + 2; dy++) {
    if (world.getBlock(x, y + dy, z) !== Block.Air) return;
  }

  // Trunk
  for (let dy = 0; dy < trunkHeight; dy++) {
    world.setBlock(x, y + dy, z, Block.OakLog as BlockId);
  }

  // Canopy (rounded shape)
  const canopyStart = trunkHeight - 2;
  const canopyTop = trunkHeight + 1;

  for (let dy = canopyStart; dy <= canopyTop; dy++) {
    const radius = dy === canopyTop ? 1 : 2;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        // Round corners
        if (Math.abs(dx) === radius && Math.abs(dz) === radius && dy !== canopyStart) continue;
        // Skip trunk position below top
        if (dx === 0 && dz === 0 && dy < canopyTop) continue;

        const bx = x + dx;
        const by = y + dy;
        const bz = z + dz;
        if (world.getBlock(bx, by, bz) === Block.Air) {
          world.setBlock(bx, by, bz, Block.OakLeaves as BlockId);
        }
      }
    }
  }

  // Top leaf
  if (world.getBlock(x, y + canopyTop + 1, z) === Block.Air) {
    world.setBlock(x, y + canopyTop + 1, z, Block.OakLeaves as BlockId);
  }
}

/**
 * Place a birch tree (5-7 trunk + narrow canopy).
 * Birch trees are taller and slimmer than oak trees.
 */
function placeBirchTree(world: ChunkedWorld, x: number, y: number, z: number, rand: () => number): void {
  const trunkHeight = 5 + Math.floor(rand() * 3); // 5-7

  for (let dy = 0; dy <= trunkHeight + 2; dy++) {
    if (world.getBlock(x, y + dy, z) !== Block.Air) return;
  }

  // Trunk
  for (let dy = 0; dy < trunkHeight; dy++) {
    world.setBlock(x, y + dy, z, Block.BirchLog as BlockId);
  }

  // Narrow canopy
  const canopyStart = trunkHeight - 3;
  const canopyTop = trunkHeight + 1;

  for (let dy = canopyStart; dy <= canopyTop; dy++) {
    const layerFromTop = canopyTop - dy;
    const radius = layerFromTop >= 2 ? 2 : 1;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) === radius && Math.abs(dz) === radius) continue;
        if (dx === 0 && dz === 0 && dy < trunkHeight) continue;

        const bx = x + dx;
        const by = y + dy;
        const bz = z + dz;
        if (world.getBlock(bx, by, bz) === Block.Air) {
          world.setBlock(bx, by, bz, Block.BirchLeaves as BlockId);
        }
      }
    }
  }
}

/**
 * Place a spruce tree (6-10 trunk + conical canopy).
 * Spruce trees have a tapered, Christmas-tree shape.
 */
function placeSpruceTree(world: ChunkedWorld, x: number, y: number, z: number, rand: () => number): void {
  const trunkHeight = 6 + Math.floor(rand() * 5); // 6-10

  for (let dy = 0; dy <= trunkHeight + 1; dy++) {
    if (world.getBlock(x, y + dy, z) !== Block.Air) return;
  }

  // Trunk
  for (let dy = 0; dy < trunkHeight; dy++) {
    world.setBlock(x, y + dy, z, Block.SpruceLog as BlockId);
  }

  // Conical canopy — starts wide at bottom, narrows to top
  const canopyStart = Math.floor(trunkHeight * 0.3);
  const canopyTop = trunkHeight;

  for (let dy = canopyStart; dy <= canopyTop; dy++) {
    const progress = (dy - canopyStart) / (canopyTop - canopyStart);
    const radius = Math.max(0, Math.floor((1 - progress) * 3));

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        // Diamond shape for each layer
        if (Math.abs(dx) + Math.abs(dz) > radius + 1) continue;
        if (dx === 0 && dz === 0 && dy < trunkHeight) continue;

        const bx = x + dx;
        const by = y + dy;
        const bz = z + dz;
        if (world.getBlock(bx, by, bz) === Block.Air) {
          world.setBlock(bx, by, bz, Block.SpruceLeaves as BlockId);
        }
      }
    }
  }

  // Top point
  world.setBlock(x, y + canopyTop + 1, z, Block.SpruceLeaves as BlockId);
}

/**
 * Place a jungle tree (big tree with vines).
 * Jungle trees are tall with thick trunks and vine coverage.
 */
function placeJungleTree(world: ChunkedWorld, x: number, y: number, z: number, rand: () => number): void {
  const trunkHeight = 8 + Math.floor(rand() * 8); // 8-15

  // Check minimal clearance
  for (let dy = 0; dy <= 6; dy++) {
    if (world.getBlock(x, y + dy, z) !== Block.Air) return;
  }

  // 2x2 trunk for big trees
  const isBigTree = rand() < 0.3 && trunkHeight >= 12;

  if (isBigTree) {
    for (let dy = 0; dy < trunkHeight; dy++) {
      world.setBlock(x, y + dy, z, Block.JungleLog as BlockId);
      world.setBlock(x + 1, y + dy, z, Block.JungleLog as BlockId);
      world.setBlock(x, y + dy, z + 1, Block.JungleLog as BlockId);
      world.setBlock(x + 1, y + dy, z + 1, Block.JungleLog as BlockId);
    }
  } else {
    for (let dy = 0; dy < trunkHeight; dy++) {
      world.setBlock(x, y + dy, z, Block.JungleLog as BlockId);
    }
  }

  // Large canopy
  const canopyStart = trunkHeight - 3;
  const canopyTop = trunkHeight + 2;
  const canopyCenter = isBigTree ? 0.5 : 0;

  for (let dy = canopyStart; dy <= canopyTop; dy++) {
    const layerFromTop = canopyTop - dy;
    const radius = Math.min(4, layerFromTop + 1);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx * dx + dz * dz > radius * radius + 1) continue;

        const bx = x + dx + (isBigTree ? 1 : 0);
        const by = y + dy;
        const bz = z + dz + (isBigTree ? 1 : 0);

        if (world.getBlock(bx, by, bz) === Block.Air) {
          world.setBlock(bx, by, bz, Block.JungleLeaves as BlockId);
        }
      }
    }
  }

  // Vines hanging from canopy edges
  for (let dy = canopyStart; dy <= canopyTop; dy++) {
    const layerFromTop = canopyTop - dy;
    const radius = Math.min(4, layerFromTop + 1);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < radius - 0.5 || dist > radius + 0.5) continue;

        const bx = x + dx + (isBigTree ? 1 : 0);
        const bz = z + dz + (isBigTree ? 1 : 0);

        // Hang vine down from canopy edge
        if (rand() < 0.6) {
          const vineLength = 2 + Math.floor(rand() * 4);
          for (let vdy = 1; vdy <= vineLength; vdy++) {
            const vy = y + dy - vdy;
            if (vy <= y) break;
            if (world.getBlock(bx, vy, bz) === Block.Air) {
              world.setBlock(bx, vy, bz, Block.Vine as BlockId);
            } else {
              break;
            }
          }
        }
      }
    }
  }
}

/**
 * Place an acacia tree (diagonal trunk + flat canopy).
 * Acacia trees have a distinctive sideways-leaning trunk.
 */
function placeAcaciaTree(world: ChunkedWorld, x: number, y: number, z: number, rand: () => number): void {
  const trunkHeight = 4 + Math.floor(rand() * 3); // 4-6

  for (let dy = 0; dy <= trunkHeight + 2; dy++) {
    if (world.getBlock(x, y + dy, z) !== Block.Air) return;
  }

  // Straight lower trunk
  const bendAt = Math.floor(trunkHeight * 0.5);
  for (let dy = 0; dy < bendAt; dy++) {
    world.setBlock(x, y + dy, z, Block.AcaciaLog as BlockId);
  }

  // Diagonal upper trunk
  const bendDir = Math.floor(rand() * 4); // 0=+x, 1=-x, 2=+z, 3=-z
  let bx = x;
  let bz = z;

  for (let dy = bendAt; dy < trunkHeight; dy++) {
    // Move sideways every other block
    if ((dy - bendAt) % 2 === 1) {
      switch (bendDir) {
        case 0: bx++; break;
        case 1: bx--; break;
        case 2: bz++; break;
        case 3: bz--; break;
      }
    }
    world.setBlock(bx, y + dy, bz, Block.AcaciaLog as BlockId);
  }

  // Flat canopy at the top
  const canopyY = y + trunkHeight;
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      if (Math.abs(dx) === 3 && Math.abs(dz) === 3) continue; // round corners
      if (Math.abs(dx) + Math.abs(dz) > 4) continue;

      const cx = bx + dx;
      const cz2 = bz + dz;

      // Two layers: main canopy and sparse top
      if (world.getBlock(cx, canopyY, cz2) === Block.Air) {
        world.setBlock(cx, canopyY, cz2, Block.AcaciaLeaves as BlockId);
      }
      if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) {
        if (world.getBlock(cx, canopyY + 1, cz2) === Block.Air) {
          world.setBlock(cx, canopyY + 1, cz2, Block.AcaciaLeaves as BlockId);
        }
      }
    }
  }
}

/**
 * Place a dark oak tree (thick 2x2 trunk + dense canopy).
 */
function placeDarkOakTree(world: ChunkedWorld, x: number, y: number, z: number, rand: () => number): void {
  const trunkHeight = 5 + Math.floor(rand() * 3); // 5-7

  // 2x2 trunk
  for (let dy = 0; dy < trunkHeight; dy++) {
    world.setBlock(x, y + dy, z, Block.DarkOakLog as BlockId);
    world.setBlock(x + 1, y + dy, z, Block.DarkOakLog as BlockId);
    world.setBlock(x, y + dy, z + 1, Block.DarkOakLog as BlockId);
    world.setBlock(x + 1, y + dy, z + 1, Block.DarkOakLog as BlockId);
  }

  // Dense rounded canopy
  const canopyStart = trunkHeight - 2;
  const canopyTop = trunkHeight + 2;

  for (let dy = canopyStart; dy <= canopyTop; dy++) {
    const layerFromTop = canopyTop - dy;
    const radius = layerFromTop >= 2 ? 3 : layerFromTop >= 1 ? 2 : 1;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) === radius && Math.abs(dz) === radius) continue;

        const bx2 = x + dx + 1; // Center on 2x2 trunk
        const by = y + dy;
        const bz2 = z + dz + 1;

        if (world.getBlock(bx2, by, bz2) === Block.Air) {
          world.setBlock(bx2, by, bz2, Block.DarkOakLeaves as BlockId);
        }
      }
    }
  }
}

/**
 * Place a huge mushroom (red or brown).
 */
function placeHugeMushroom(world: ChunkedWorld, x: number, y: number, z: number, rand: () => number): void {
  const isRed = rand() < 0.5;
  const stemHeight = 5 + Math.floor(rand() * 4); // 5-8
  const capBlock = (isRed ? Block.RedMushroomBlock : Block.BrownMushroomBlock) as BlockId;

  // Stem
  for (let dy = 0; dy < stemHeight; dy++) {
    world.setBlock(x, y + dy, z, Block.MushroomStem as BlockId);
  }

  if (isRed) {
    // Red mushroom: rounded cap
    const capY = y + stemHeight;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        if (world.getBlock(x + dx, capY, z + dz) === Block.Air) {
          world.setBlock(x + dx, capY, z + dz, capBlock);
        }
      }
    }
    // Top of cap
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (world.getBlock(x + dx, capY + 1, z + dz) === Block.Air) {
          world.setBlock(x + dx, capY + 1, z + dz, capBlock);
        }
      }
    }
  } else {
    // Brown mushroom: flat wide cap
    const capY = y + stemHeight;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        if (Math.abs(dx) === 3 && Math.abs(dz) === 3) continue;
        if (world.getBlock(x + dx, capY, z + dz) === Block.Air) {
          world.setBlock(x + dx, capY, z + dz, capBlock);
        }
      }
    }
  }
}

// =============================================================================
// Tree Dispatch
// =============================================================================

function placeTree(
  world: ChunkedWorld,
  x: number,
  y: number,
  z: number,
  treeType: TreeType,
  rand: () => number,
): void {
  switch (treeType) {
    case 'oak': placeOakTree(world, x, y, z, rand); break;
    case 'birch': placeBirchTree(world, x, y, z, rand); break;
    case 'spruce': placeSpruceTree(world, x, y, z, rand); break;
    case 'jungle': placeJungleTree(world, x, y, z, rand); break;
    case 'acacia': placeAcaciaTree(world, x, y, z, rand); break;
    case 'dark_oak': placeDarkOakTree(world, x, y, z, rand); break;
    case 'huge_mushroom': placeHugeMushroom(world, x, y, z, rand); break;
    default: placeOakTree(world, x, y, z, rand); break;
  }
}

// =============================================================================
// Surface Block Checks
// =============================================================================

/** Check if a block is a valid surface for planting. */
function isPlantableSurface(blockId: BlockId): boolean {
  return (
    blockId === Block.Grass ||
    blockId === Block.Dirt ||
    blockId === Block.CoarseDirt ||
    blockId === Block.Podzol ||
    blockId === Block.Mycelium
  );
}

/** Check if a block is sand-like. */
function isSandLike(blockId: BlockId): boolean {
  return blockId === Block.Sand || blockId === Block.RedSand;
}

// =============================================================================
// Main Decoration Function
// =============================================================================

/**
 * Decorate a chunk with biome-appropriate features.
 *
 * This function operates on the ChunkedWorld, so it can place features
 * that span chunk boundaries (like trees). Should be called after the
 * chunk and all adjacent chunks have been terrain-generated.
 *
 * Features placed:
 * - Trees (biome-specific types and density)
 * - Flowers (biome-specific selection)
 * - Tall grass (plains, forest biomes)
 * - Sugar cane (near water on sand/dirt)
 * - Pumpkins (rare, in plains)
 * - Mushrooms (dark forest, swamp)
 * - Cactus (desert, 1-3 tall)
 * - Dead bushes (desert)
 * - Lily pads (swamp water surface)
 */
export function decorateChunk(
  world: ChunkedWorld,
  cx: number,
  cz: number,
  seed: number,
): void {
  const baseX = cx * CHUNK_WIDTH;
  const baseZ = cz * CHUNK_DEPTH;

  // Per-chunk PRNG
  const rand = seededRandom(positionSeed(seed, cx * 16, 50, cz * 16) + 12345);

  // --- Sample the biome at chunk center ---
  const chunk = world.getChunk(cx, cz);
  if (!chunk || !chunk.generated) return;

  // Iterate over columns in the chunk
  for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      const worldX = baseX + lx;
      const worldZ = baseZ + lz;

      const biomeIdx = chunk.biomes[lz * CHUNK_WIDTH + lx];
      const biome = BIOME_BY_INDEX[biomeIdx];
      if (!biome) continue;

      const surfaceY = world.getHighestBlock(worldX, worldZ);
      if (surfaceY <= 0 || surfaceY >= CHUNK_HEIGHT - 10) continue;

      const surfaceBlock = world.getBlock(worldX, surfaceY, worldZ) as BlockId;
      const aboveBlock = world.getBlock(worldX, surfaceY + 1, worldZ) as BlockId;

      // Only decorate if the block above is air (or snow layer)
      const isAboveAir = aboveBlock === Block.Air || aboveBlock === Block.SnowLayer;
      if (!isAboveAir) continue;

      // Skip underwater columns
      if (surfaceY < SEA_LEVEL && surfaceBlock === Block.Water) continue;

      const r = rand();

      // =================================================================
      // Trees
      // =================================================================
      if (biome.treeDensity > 0 && isPlantableSurface(surfaceBlock) && surfaceY > SEA_LEVEL) {
        // Tree chance per column based on density
        // density of 8 trees/chunk means ~8/(16*16) = 0.03125 chance per column
        const treeChance = biome.treeDensity / (CHUNK_WIDTH * CHUNK_DEPTH);

        if (r < treeChance) {
          // Minimum spacing: don't place tree too close to chunk edge
          // to prevent partial tree generation issues
          if (lx >= 2 && lx < CHUNK_WIDTH - 2 && lz >= 2 && lz < CHUNK_DEPTH - 2) {
            const treeType = selectTreeType(biome.treeTypes, rand());
            if (treeType) {
              placeTree(world, worldX, surfaceY + 1, worldZ, treeType, rand);
            }
          }
          continue;  // Skip other features for this column if tree was attempted
        }
      }

      // =================================================================
      // Tall Grass
      // =================================================================
      if (
        isPlantableSurface(surfaceBlock) &&
        surfaceY > SEA_LEVEL &&
        biome.features.includes('tall_grass')
      ) {
        const grassChance = biome.type === 'plains' ? 0.15 :
                           biome.type === 'savanna' ? 0.12 :
                           biome.type === 'forest' || biome.type === 'birch_forest' ? 0.08 :
                           biome.type === 'jungle' ? 0.20 : 0.05;

        if (r >= treeChanceFor(biome) && r < treeChanceFor(biome) + grassChance) {
          world.setBlock(worldX, surfaceY + 1, worldZ, Block.TallGrass as BlockId);
          continue;
        }
      }

      // =================================================================
      // Ferns (taiga, snowy taiga)
      // =================================================================
      if (
        isPlantableSurface(surfaceBlock) &&
        surfaceY > SEA_LEVEL &&
        biome.features.includes('ferns')
      ) {
        if (r >= 0.10 && r < 0.14) {
          world.setBlock(worldX, surfaceY + 1, worldZ, Block.Fern as BlockId);
          continue;
        }
      }

      // =================================================================
      // Flowers
      // =================================================================
      if (
        isPlantableSurface(surfaceBlock) &&
        surfaceY > SEA_LEVEL &&
        (biome.features.includes('flowers') || biome.features.includes('dense_flowers'))
      ) {
        const flowerChance = biome.features.includes('dense_flowers') ? 0.08 : 0.02;
        const flowerRange = treeChanceFor(biome) + 0.20;

        if (r >= flowerRange && r < flowerRange + flowerChance) {
          const flowers = getBiomeFlowers(biomeIdx);
          const flower = flowers[Math.floor(rand() * flowers.length)];
          world.setBlock(worldX, surfaceY + 1, worldZ, flower);
          continue;
        }
      }

      // =================================================================
      // Cactus (desert)
      // =================================================================
      if (
        isSandLike(surfaceBlock) &&
        surfaceY > SEA_LEVEL &&
        biome.features.includes('cactus')
      ) {
        if (r >= 0.30 && r < 0.315) {
          // Check no adjacent blocks (cactus needs clear sides)
          let canPlace = true;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (world.getBlock(worldX + dx, surfaceY + 1, worldZ + dz) !== Block.Air) {
              canPlace = false;
              break;
            }
          }
          if (canPlace) {
            const height = 1 + Math.floor(rand() * 3); // 1-3
            for (let dy = 1; dy <= height; dy++) {
              world.setBlock(worldX, surfaceY + dy, worldZ, Block.Cactus as BlockId);
            }
          }
          continue;
        }
      }

      // =================================================================
      // Dead Bushes (desert)
      // =================================================================
      if (
        isSandLike(surfaceBlock) &&
        surfaceY > SEA_LEVEL &&
        biome.features.includes('dead_bush')
      ) {
        if (r >= 0.32 && r < 0.34) {
          world.setBlock(worldX, surfaceY + 1, worldZ, Block.DeadBush as BlockId);
          continue;
        }
      }

      // =================================================================
      // Sugar Cane (near water on sand/dirt)
      // =================================================================
      if (
        (isPlantableSurface(surfaceBlock) || isSandLike(surfaceBlock)) &&
        surfaceY >= SEA_LEVEL &&
        surfaceY < SEA_LEVEL + 4
      ) {
        if (r >= 0.35 && r < 0.36) {
          // Check if adjacent to water
          let nearWater = false;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const adj = world.getBlock(worldX + dx, surfaceY, worldZ + dz);
            if (adj === Block.Water || adj === Block.StillWater) {
              nearWater = true;
              break;
            }
          }
          if (nearWater) {
            const height = 1 + Math.floor(rand() * 3); // 1-3
            for (let dy = 1; dy <= height; dy++) {
              if (world.getBlock(worldX, surfaceY + dy, worldZ) === Block.Air) {
                world.setBlock(worldX, surfaceY + dy, worldZ, Block.SugarCane as BlockId);
              } else {
                break;
              }
            }
          }
          continue;
        }
      }

      // =================================================================
      // Pumpkins (rare, plains)
      // =================================================================
      if (
        isPlantableSurface(surfaceBlock) &&
        surfaceY > SEA_LEVEL &&
        biome.features.includes('pumpkins')
      ) {
        if (r >= 0.37 && r < 0.372) {
          world.setBlock(worldX, surfaceY + 1, worldZ, Block.PumpkinBlock as BlockId);
          continue;
        }
      }

      // =================================================================
      // Mushrooms (dark forest, swamp, taiga)
      // =================================================================
      if (
        isPlantableSurface(surfaceBlock) &&
        surfaceY > SEA_LEVEL &&
        biome.features.includes('mushrooms')
      ) {
        if (r >= 0.38 && r < 0.39) {
          const mush = rand() < 0.5 ? Block.BrownMushroom : Block.RedMushroom;
          world.setBlock(worldX, surfaceY + 1, worldZ, mush as BlockId);
          continue;
        }
      }

      // =================================================================
      // Lily Pads (swamp, on water surface)
      // =================================================================
      if (biome.features.includes('lily_pads')) {
        // Check if the surface at this column is water at sea level
        const waterSurface = world.getBlock(worldX, SEA_LEVEL, worldZ);
        const aboveWater = world.getBlock(worldX, SEA_LEVEL + 1, worldZ);

        if (
          (waterSurface === Block.Water || waterSurface === Block.StillWater) &&
          aboveWater === Block.Air
        ) {
          if (r >= 0.40 && r < 0.43) {
            world.setBlock(worldX, SEA_LEVEL + 1, worldZ, Block.LilyPad as BlockId);
          }
        }
      }

      // =================================================================
      // Vines (jungle, swamp — on tree trunks handled in tree gen)
      // =================================================================

      // =================================================================
      // Sweet Berries (taiga)
      // =================================================================
      if (
        isPlantableSurface(surfaceBlock) &&
        surfaceY > SEA_LEVEL &&
        biome.features.includes('sweet_berries')
      ) {
        if (r >= 0.44 && r < 0.445) {
          world.setBlock(worldX, surfaceY + 1, worldZ, Block.SweetBerryBush as BlockId);
        }
      }
    }
  }
}

// =============================================================================
// Helper: tree chance threshold for a biome (used to offset other features)
// =============================================================================

function treeChanceFor(biome: BiomeProperties): number {
  return biome.treeDensity / (CHUNK_WIDTH * CHUNK_DEPTH);
}
