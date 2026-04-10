// Procedural Minecraft world generation with Perlin noise
// Generates terrain with biomes, caves, ores, trees, and structures

import { Block, BlockType } from './textures';

export const WORLD_WIDTH = 128;
export const WORLD_DEPTH = 128;
export const WORLD_HEIGHT = 80;
export const SEA_LEVEL = 30;
export const CHUNK_SIZE = 16;

// Biome types
export const Biome = {
  Plains: 0,
  Forest: 1,
  Desert: 2,
  Snowy: 3,
  Mountains: 4,
  Swamp: 5,
} as const;

type BiomeType = (typeof Biome)[keyof typeof Biome];

// World data container
export class WorldData {
  readonly blocks: Uint8Array;
  readonly width: number;
  readonly depth: number;
  readonly height: number;

  constructor(width: number, depth: number, height: number) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.blocks = new Uint8Array(width * depth * height);
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= this.width || z < 0 || z >= this.depth || y < 0 || y >= this.height) {
      return Block.Air;
    }
    return this.blocks[x + z * this.width + y * this.width * this.depth] as BlockType;
  }

  setBlock(x: number, y: number, z: number, block: BlockType) {
    if (x < 0 || x >= this.width || z < 0 || z >= this.depth || y < 0 || y >= this.height) return;
    this.blocks[x + z * this.width + y * this.width * this.depth] = block;
  }
}

// Perlin noise implementation
class PerlinNoise {
  private perm: Uint8Array;

  constructor(seed: number) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad2d(hash: number, x: number, y: number): number {
    const h = hash & 3;
    return ((h & 1) === 0 ? x : -x) + ((h & 2) === 0 ? y : -y);
  }

  noise2d(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[xi] + yi];
    const ab = this.perm[this.perm[xi] + yi + 1];
    const ba = this.perm[this.perm[xi + 1] + yi];
    const bb = this.perm[this.perm[xi + 1] + yi + 1];

    return this.lerp(
      this.lerp(this.grad2d(aa, xf, yf), this.grad2d(ba, xf - 1, yf), u),
      this.lerp(this.grad2d(ab, xf, yf - 1), this.grad2d(bb, xf - 1, yf - 1), u),
      v,
    );
  }

  fbm2d(x: number, y: number, octaves: number, lacunarity = 2, gain = 0.5): number {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let max = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.noise2d(x * freq, y * freq) * amp;
      max += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / max;
  }

  private grad3d(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise3d(x: number, y: number, z: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const zi = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);

    const aaa = this.perm[this.perm[this.perm[xi] + yi] + zi];
    const aba = this.perm[this.perm[this.perm[xi] + yi + 1] + zi];
    const aab = this.perm[this.perm[this.perm[xi] + yi] + zi + 1];
    const abb = this.perm[this.perm[this.perm[xi] + yi + 1] + zi + 1];
    const baa = this.perm[this.perm[this.perm[xi + 1] + yi] + zi];
    const bba = this.perm[this.perm[this.perm[xi + 1] + yi + 1] + zi];
    const bab = this.perm[this.perm[this.perm[xi + 1] + yi] + zi + 1];
    const bbb = this.perm[this.perm[this.perm[xi + 1] + yi + 1] + zi + 1];

    return this.lerp(
      this.lerp(
        this.lerp(this.grad3d(aaa, xf, yf, zf), this.grad3d(baa, xf - 1, yf, zf), u),
        this.lerp(this.grad3d(aba, xf, yf - 1, zf), this.grad3d(bba, xf - 1, yf - 1, zf), u),
        v,
      ),
      this.lerp(
        this.lerp(this.grad3d(aab, xf, yf, zf - 1), this.grad3d(bab, xf - 1, yf, zf - 1), u),
        this.lerp(this.grad3d(abb, xf, yf - 1, zf - 1), this.grad3d(bbb, xf - 1, yf - 1, zf - 1), u),
        v,
      ),
      w,
    );
  }
}

// Seeded PRNG for tree/feature placement
function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getBiome(temperature: number, moisture: number, elevation: number): BiomeType {
  if (temperature > 0.55 && moisture < 0.35) return Biome.Desert;
  if (temperature < 0.25) return Biome.Snowy;
  if (elevation > 0.6) return Biome.Mountains;
  if (moisture > 0.55 && temperature > 0.3) return Biome.Forest;
  if (moisture > 0.6 && temperature > 0.35 && temperature < 0.55) return Biome.Swamp;
  return Biome.Plains;
}

function getBaseHeight(biome: BiomeType, heightNoise: number): number {
  switch (biome) {
    case Biome.Plains:
      return SEA_LEVEL + 2 + Math.floor(heightNoise * 4);
    case Biome.Forest:
      return SEA_LEVEL + 3 + Math.floor(heightNoise * 6);
    case Biome.Desert:
      return SEA_LEVEL + 1 + Math.floor(heightNoise * 3);
    case Biome.Snowy:
      return SEA_LEVEL + 2 + Math.floor(heightNoise * 5);
    case Biome.Mountains:
      return SEA_LEVEL + 8 + Math.floor(heightNoise * 18);
    case Biome.Swamp:
      return SEA_LEVEL + Math.floor(heightNoise * 2);
    default:
      return SEA_LEVEL + 3;
  }
}

function getSurfaceBlock(biome: BiomeType): BlockType {
  switch (biome) {
    case Biome.Desert: return Block.Sand;
    case Biome.Snowy: return Block.SnowGrass;
    case Biome.Swamp: return Block.Grass;
    default: return Block.Grass;
  }
}

function getSubsurfaceBlock(biome: BiomeType): BlockType {
  switch (biome) {
    case Biome.Desert: return Block.Sand;
    default: return Block.Dirt;
  }
}

function placeTree(world: WorldData, x: number, y: number, z: number, biome: BiomeType) {
  const logBlock = biome === Biome.Snowy ? Block.BirchLog : Block.OakLog;
  const leafBlock = Block.OakLeaves;

  // Trunk height varies by biome
  const trunkHeight = biome === Biome.Forest ? 6 : biome === Biome.Snowy ? 5 : 4;

  // Place trunk
  for (let dy = 0; dy < trunkHeight; dy++) {
    world.setBlock(x, y + dy, z, logBlock);
  }

  // Place leaves (rounded crown)
  const leafStart = trunkHeight - 2;
  const leafTop = trunkHeight + 1;
  for (let dy = leafStart; dy <= leafTop; dy++) {
    const radius = dy === leafTop ? 1 : dy === leafStart ? 2 : 2;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx === 0 && dz === 0 && dy < leafTop) continue; // trunk goes through
        if (Math.abs(dx) === radius && Math.abs(dz) === radius && dy !== leafStart) continue; // round corners
        const bx = x + dx, by = y + dy, bz = z + dz;
        if (world.getBlock(bx, by, bz) === Block.Air) {
          world.setBlock(bx, by, bz, leafBlock);
        }
      }
    }
  }

  // Top leaf
  world.setBlock(x, y + leafTop, z, leafBlock);
}

function placeCactus(world: WorldData, x: number, y: number, z: number) {
  const height = 2 + Math.floor(Math.random() * 2);
  for (let dy = 0; dy < height; dy++) {
    world.setBlock(x, y + dy, z, Block.Cactus);
  }
}

export function generateWorld(seed = 12345): WorldData {
  const world = new WorldData(WORLD_WIDTH, WORLD_DEPTH, WORLD_HEIGHT);

  const heightNoise = new PerlinNoise(seed);
  const tempNoise = new PerlinNoise(seed + 100);
  const moistNoise = new PerlinNoise(seed + 200);
  const caveNoise = new PerlinNoise(seed + 300);
  const elevNoise = new PerlinNoise(seed + 400);
  const oreNoise = new PerlinNoise(seed + 500);

  // Pre-compute height map and biome map
  const heightMap = new Int32Array(WORLD_WIDTH * WORLD_DEPTH);
  const biomeMap = new Uint8Array(WORLD_WIDTH * WORLD_DEPTH);

  for (let x = 0; x < WORLD_WIDTH; x++) {
    for (let z = 0; z < WORLD_DEPTH; z++) {
      const nx = x / WORLD_WIDTH;
      const nz = z / WORLD_DEPTH;

      const temp = (tempNoise.fbm2d(nx * 3, nz * 3, 4) + 1) * 0.5;
      const moist = (moistNoise.fbm2d(nx * 3 + 50, nz * 3 + 50, 4) + 1) * 0.5;
      const elev = (elevNoise.fbm2d(nx * 2, nz * 2, 3) + 1) * 0.5;

      const biome = getBiome(temp, moist, elev);
      biomeMap[x + z * WORLD_WIDTH] = biome;

      const hn = (heightNoise.fbm2d(nx * 4, nz * 4, 5) + 1) * 0.5;
      const height = getBaseHeight(biome, hn);
      heightMap[x + z * WORLD_WIDTH] = Math.min(height, WORLD_HEIGHT - 10);
    }
  }

  // Fill blocks
  for (let x = 0; x < WORLD_WIDTH; x++) {
    for (let z = 0; z < WORLD_DEPTH; z++) {
      const surfaceY = heightMap[x + z * WORLD_WIDTH];
      const biome = biomeMap[x + z * WORLD_WIDTH] as BiomeType;

      for (let y = 0; y < WORLD_HEIGHT; y++) {
        if (y === 0) {
          world.setBlock(x, y, z, Block.Bedrock);
        } else if (y < surfaceY - 4) {
          world.setBlock(x, y, z, Block.Stone);
        } else if (y < surfaceY) {
          world.setBlock(x, y, z, getSubsurfaceBlock(biome));
        } else if (y === surfaceY) {
          world.setBlock(x, y, z, getSurfaceBlock(biome));
        } else if (y <= SEA_LEVEL && y > surfaceY) {
          world.setBlock(x, y, z, Block.Water);
        }
        // Above surface and above sea level: Air (default 0)
      }

      // Sandstone under desert sand
      if (biome === Biome.Desert) {
        for (let y = surfaceY - 4; y < surfaceY; y++) {
          if (y > 0) world.setBlock(x, y, z, Block.Sandstone);
        }
      }
    }
  }

  // Carve caves using 3D noise
  for (let x = 0; x < WORLD_WIDTH; x++) {
    for (let z = 0; z < WORLD_DEPTH; z++) {
      const surfaceY = heightMap[x + z * WORLD_WIDTH];
      for (let y = 2; y < surfaceY - 1; y++) {
        const nx = x / 16;
        const ny = y / 16;
        const nz = z / 16;
        const cave1 = caveNoise.noise3d(nx * 2, ny * 2, nz * 2);
        const cave2 = caveNoise.noise3d(nx * 3 + 100, ny * 3, nz * 3 + 100);

        if (cave1 > 0.4 && cave2 > 0.35) {
          world.setBlock(x, y, z, Block.Air);
        }
      }
    }
  }

  // Place ores
  const rand = seededRandom(seed + 600);
  for (let x = 0; x < WORLD_WIDTH; x++) {
    for (let z = 0; z < WORLD_DEPTH; z++) {
      const surfaceY = heightMap[x + z * WORLD_WIDTH];
      for (let y = 1; y < surfaceY - 2; y++) {
        if (world.getBlock(x, y, z) !== Block.Stone) continue;

        const oreVal = (oreNoise.noise3d(x / 8, y / 8, z / 8) + 1) * 0.5;
        const r = rand();

        // Coal: y 5-50, relatively common
        if (y < 50 && y > 5 && oreVal > 0.7 && r < 0.03) {
          world.setBlock(x, y, z, Block.CoalOre);
        }
        // Iron: y 5-40
        else if (y < 40 && y > 5 && oreVal > 0.72 && r < 0.02) {
          world.setBlock(x, y, z, Block.IronOre);
        }
        // Gold: y 5-25
        else if (y < 25 && y > 5 && oreVal > 0.75 && r < 0.01) {
          world.setBlock(x, y, z, Block.GoldOre);
        }
        // Diamond: y 5-16
        else if (y < 16 && y > 5 && oreVal > 0.78 && r < 0.005) {
          world.setBlock(x, y, z, Block.DiamondOre);
        }
        // Gravel patches
        else if (y < surfaceY - 3 && oreVal < 0.15 && r < 0.02) {
          world.setBlock(x, y, z, Block.Gravel);
        }
      }
    }
  }

  // Place trees and features
  const treeRand = seededRandom(seed + 700);
  for (let x = 3; x < WORLD_WIDTH - 3; x++) {
    for (let z = 3; z < WORLD_DEPTH - 3; z++) {
      const surfaceY = heightMap[x + z * WORLD_WIDTH];
      const biome = biomeMap[x + z * WORLD_WIDTH] as BiomeType;

      if (surfaceY <= SEA_LEVEL) continue; // underwater, skip
      if (world.getBlock(x, surfaceY, z) === Block.Air) continue; // cave opening

      const r = treeRand();

      // Trees
      let treeChance = 0;
      if (biome === Biome.Forest) treeChance = 0.04;
      else if (biome === Biome.Plains) treeChance = 0.005;
      else if (biome === Biome.Snowy) treeChance = 0.015;
      else if (biome === Biome.Swamp) treeChance = 0.02;

      if (r < treeChance) {
        // Check space above
        let canPlace = true;
        for (let dy = 1; dy <= 6; dy++) {
          if (world.getBlock(x, surfaceY + dy, z) !== Block.Air) {
            canPlace = false;
            break;
          }
        }
        if (canPlace) {
          placeTree(world, x, surfaceY + 1, z, biome);
        }
      }

      // Desert cacti
      if (biome === Biome.Desert && r >= treeChance && r < treeChance + 0.008) {
        if (world.getBlock(x, surfaceY + 1, z) === Block.Air) {
          placeCactus(world, x, surfaceY + 1, z);
        }
      }

      // Pumpkins
      if (biome === Biome.Plains && r >= 0.008 && r < 0.01) {
        if (world.getBlock(x, surfaceY + 1, z) === Block.Air) {
          world.setBlock(x, surfaceY + 1, z, Block.Pumpkin);
        }
      }
    }
  }

  // Clay near water edges
  for (let x = 1; x < WORLD_WIDTH - 1; x++) {
    for (let z = 1; z < WORLD_DEPTH - 1; z++) {
      const surfaceY = heightMap[x + z * WORLD_WIDTH];
      if (surfaceY === SEA_LEVEL || surfaceY === SEA_LEVEL - 1) {
        // Check if near water
        let nearWater = false;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (world.getBlock(x + dx, SEA_LEVEL, z + dz) === Block.Water) {
              nearWater = true;
            }
          }
        }
        if (nearWater && treeRand() < 0.3) {
          world.setBlock(x, surfaceY, z, Block.Clay);
          if (surfaceY > 1) world.setBlock(x, surfaceY - 1, z, Block.Clay);
        }
      }
    }
  }

  // Ice on water in snowy biomes
  for (let x = 0; x < WORLD_WIDTH; x++) {
    for (let z = 0; z < WORLD_DEPTH; z++) {
      const biome = biomeMap[x + z * WORLD_WIDTH] as BiomeType;
      if (biome === Biome.Snowy && world.getBlock(x, SEA_LEVEL, z) === Block.Water) {
        world.setBlock(x, SEA_LEVEL, z, Block.Ice);
      }
    }
  }

  return world;
}
