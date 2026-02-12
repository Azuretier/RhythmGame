// =============================================================
// Minecraft Board Game - Procedural World Generator
// =============================================================

import type { BlockType, Biome, WorldTile } from '@/types/minecraft-board';
import { MC_BOARD_CONFIG } from '@/types/minecraft-board';

// === Seeded PRNG (Mulberry32) ===

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  next(): number {
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

// === Value Noise Generator ===

class ValueNoise {
  private grid: number[][] = [];
  private gridSize: number;

  constructor(private rng: SeededRandom, gridSize: number) {
    this.gridSize = gridSize;
    for (let y = 0; y <= gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x <= gridSize; x++) {
        this.grid[y][x] = rng.next();
      }
    }
  }

  private cosInterpolate(a: number, b: number, t: number): number {
    const ct = (1 - Math.cos(t * Math.PI)) / 2;
    return a * (1 - ct) + b * ct;
  }

  sample(x: number, y: number): number {
    const gx = (x / this.gridSize) * (this.grid[0].length - 1);
    const gy = (y / this.gridSize) * (this.grid.length - 1);

    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, this.grid[0].length - 1);
    const y1 = Math.min(y0 + 1, this.grid.length - 1);

    const fx = gx - x0;
    const fy = gy - y0;

    const top = this.cosInterpolate(this.grid[y0][x0], this.grid[y0][x1], fx);
    const bot = this.cosInterpolate(this.grid[y1][x0], this.grid[y1][x1], fx);
    return this.cosInterpolate(top, bot, fy);
  }
}

// === Octave Noise ===

function octaveNoise(
  rng: SeededRandom,
  width: number,
  height: number,
  octaves: number,
  baseScale: number,
): number[][] {
  const result: number[][] = [];
  for (let y = 0; y < height; y++) {
    result[y] = new Array(width).fill(0);
  }

  let amplitude = 1;
  let totalAmplitude = 0;

  for (let oct = 0; oct < octaves; oct++) {
    const gridSize = Math.max(2, Math.floor(width * baseScale * Math.pow(2, oct)));
    const noise = new ValueNoise(rng, gridSize);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        result[y][x] += noise.sample(x, y) * amplitude;
      }
    }

    totalAmplitude += amplitude;
    amplitude *= 0.5;
  }

  // Normalize to 0-1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y][x] /= totalAmplitude;
    }
  }

  return result;
}

// === Biome Determination ===

function determineBiome(temperature: number, moisture: number, elevation: number): Biome {
  if (elevation < 0.2) return 'ocean';
  if (elevation > 0.8) return 'mountains';
  if (temperature > 0.7 && moisture < 0.3) return 'desert';
  if (temperature < 0.3 && moisture > 0.3) return 'snowy';
  if (moisture > 0.65 && temperature > 0.3 && temperature < 0.7) return 'swamp';
  if (moisture > 0.5 && temperature > 0.35) return 'forest';
  return 'plains';
}

// === Block Placement by Biome ===

function getBaseBlock(biome: Biome, elevation: number): BlockType {
  switch (biome) {
    case 'ocean': return elevation < 0.12 ? 'deep_water' : 'water';
    case 'desert': return 'sand';
    case 'snowy': return 'snow_block';
    case 'mountains': return elevation > 0.9 ? 'stone' : 'grass';
    case 'swamp': return 'grass';
    case 'forest': return 'grass';
    case 'plains': return 'grass';
  }
}

// === World Generator ===

export class WorldGenerator {
  private rng: SeededRandom;
  private width: number;
  private height: number;

  constructor(private seed: number) {
    this.rng = new SeededRandom(seed);
    this.width = MC_BOARD_CONFIG.WORLD_SIZE;
    this.height = MC_BOARD_CONFIG.WORLD_SIZE;
  }

  generate(): WorldTile[][] {
    const w = this.width;
    const h = this.height;

    // Generate noise maps
    const temperature = octaveNoise(new SeededRandom(this.seed), w, h, 2, 0.08);
    const moisture = octaveNoise(new SeededRandom(this.seed + 1000), w, h, 2, 0.06);
    const elevation = octaveNoise(new SeededRandom(this.seed + 2000), w, h, 3, 0.07);
    const oreNoise = octaveNoise(new SeededRandom(this.seed + 3000), w, h, 2, 0.15);

    // Build base world
    const world: WorldTile[][] = [];
    for (let y = 0; y < h; y++) {
      world[y] = [];
      for (let x = 0; x < w; x++) {
        const temp = temperature[y][x];
        const moist = moisture[y][x];
        const elev = elevation[y][x];
        const biome = determineBiome(temp, moist, elev);
        const block = getBaseBlock(biome, elev);

        world[y][x] = {
          block,
          biome,
          elevation: Math.round(elev * 10),
        };
      }
    }

    // Place features
    this.placeFeatures(world, oreNoise);

    // Create spawn clearing
    this.createSpawnClearing(world);

    // Place border bedrock
    this.placeBorder(world);

    return world;
  }

  private placeFeatures(world: WorldTile[][], oreNoise: number[][]): void {
    const rng = new SeededRandom(this.seed + 5000);

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const tile = world[y][x];
        
        // Ice in snowy biome - must be placed BEFORE skipping water tiles
        if (tile.biome === 'snowy' && (tile.block === 'water' || tile.block === 'deep_water')) {
          world[y][x] = { ...tile, block: 'ice' };
          continue;
        }
        
        if (tile.block === 'water' || tile.block === 'deep_water') continue;

        // Trees
        if (tile.biome === 'forest' && rng.chance(0.2)) {
          world[y][x] = { ...tile, block: 'wood' };
          // Place leaves around tree
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                const neighbor = world[ny][nx];
                if (neighbor.block === 'grass' || neighbor.block === 'tall_grass') {
                  world[ny][nx] = { ...neighbor, block: 'leaves' };
                }
              }
            }
          }
        } else if (tile.biome === 'plains' && rng.chance(0.03)) {
          world[y][x] = { ...tile, block: 'wood' };
        }

        // Tall grass and flowers
        if (tile.block === 'grass') {
          if (tile.biome === 'plains' && rng.chance(0.15)) {
            world[y][x] = { ...tile, block: 'tall_grass' };
          } else if (tile.biome === 'forest' && rng.chance(0.08)) {
            world[y][x] = { ...tile, block: 'tall_grass' };
          } else if (rng.chance(0.02)) {
            world[y][x] = { ...tile, block: rng.chance(0.5) ? 'flower_red' : 'flower_yellow' };
          }
        }

        // Mushrooms in swamp
        if (tile.biome === 'swamp' && tile.block === 'grass' && rng.chance(0.05)) {
          world[y][x] = { ...tile, block: rng.chance(0.5) ? 'mushroom_red' : 'mushroom_brown' };
        }

        // Cactus in desert
        if (tile.biome === 'desert' && rng.chance(0.04)) {
          world[y][x] = { ...tile, block: 'cactus' };
        }

        // Sugar cane near water
        if ((tile.biome === 'swamp' || tile.biome === 'plains') && tile.block === 'grass' && rng.chance(0.03)) {
          const hasWater = this.hasAdjacentBlock(world, x, y, 'water');
          if (hasWater) {
            world[y][x] = { ...tile, block: 'sugar_cane' };
          }
        }

        // Ore deposits - use ore noise for clustering
        if (tile.biome === 'mountains' || tile.elevation >= 6) {
          const ore = oreNoise[y][x];
          if (tile.block === 'stone' || tile.block === 'grass') {
            if (ore > 0.82) {
              world[y][x] = { ...tile, block: 'diamond_ore' };
            } else if (ore > 0.75) {
              world[y][x] = { ...tile, block: 'gold_ore' };
            } else if (ore > 0.65) {
              world[y][x] = { ...tile, block: 'iron_ore' };
            } else if (ore > 0.55) {
              world[y][x] = { ...tile, block: 'coal_ore' };
            }
          }
        }

        // Scattered ores elsewhere (lower chance)
        if (tile.block === 'stone' || (tile.block === 'grass' && tile.elevation >= 4)) {
          const ore = oreNoise[y][x];
          if (ore > 0.9 && rng.chance(0.3)) {
            world[y][x] = { ...tile, block: 'iron_ore' };
          } else if (ore > 0.85 && rng.chance(0.5)) {
            world[y][x] = { ...tile, block: 'coal_ore' };
          }
        }

        // Stone outcrops in mountains
        if (tile.biome === 'mountains' && tile.block === 'grass' && rng.chance(0.2)) {
          world[y][x] = { ...tile, block: 'stone' };
        }

        // Clay near water in swamp
        if (tile.biome === 'swamp' && tile.block === 'grass' && rng.chance(0.05)) {
          if (this.hasAdjacentBlock(world, x, y, 'water')) {
            world[y][x] = { ...tile, block: 'clay' };
          }
        }

        // Gravel in mountains
        if (tile.biome === 'mountains' && rng.chance(0.05)) {
          world[y][x] = { ...tile, block: 'gravel' };
        }

        // Obsidian - very rare, deep in mountains
        if (tile.biome === 'mountains' && tile.elevation >= 8 && rng.chance(0.02)) {
          world[y][x] = { ...tile, block: 'obsidian' };
        }
      }
    }
  }

  private createSpawnClearing(world: WorldTile[][]): void {
    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);
    const radius = MC_BOARD_CONFIG.SPAWN_CLEARING_RADIUS;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          world[y][x] = {
            block: 'grass',
            biome: 'plains',
            elevation: 5,
          };
        }
      }
    }

    // Place a crafting table at spawn
    world[cy][cx] = {
      block: 'crafting_table',
      biome: 'plains',
      elevation: 5,
    };
  }

  private placeBorder(world: WorldTile[][]): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
          world[y][x] = {
            block: 'bedrock',
            biome: world[y][x].biome,
            elevation: 0,
          };
        }
      }
    }
  }

  private hasAdjacentBlock(world: WorldTile[][], x: number, y: number, block: BlockType): boolean {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        if (world[ny][nx].block === block) return true;
      }
    }
    return false;
  }

  getSpawnPositions(playerCount: number): { x: number; y: number }[] {
    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);
    const radius = MC_BOARD_CONFIG.SPAWN_CLEARING_RADIUS - 1;
    const positions: { x: number; y: number }[] = [];

    // Distribute players evenly around the spawn center
    for (let i = 0; i < playerCount; i++) {
      const angle = (i / playerCount) * Math.PI * 2;
      const px = cx + Math.round(Math.cos(angle) * radius);
      const py = cy + Math.round(Math.sin(angle) * radius);
      positions.push({ x: px, y: py });
    }

    return positions;
  }
}
