// =============================================================================
// ChunkedWorld — Core chunk-based world data structure
// =============================================================================
// Stores 16x256x16 chunks in a Map, providing block get/set with automatic
// world-to-chunk coordinate resolution. Includes PerlinNoise and seeded PRNG
// ported from the existing terrain.ts implementation.
// =============================================================================

import {
  Block,
  BlockId,
  Chunk,
  ChunkCoord,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  CHUNK_DEPTH,
} from '@/types/minecraft-switch';

// =============================================================================
// World Size Presets (matching Nintendo Switch Edition)
// =============================================================================

export type WorldSizePreset = 'classic' | 'small' | 'medium';

export interface WorldSizeConfig {
  /** Total world width in blocks along X axis. */
  widthBlocks: number;
  /** Total world depth in blocks along Z axis. */
  depthBlocks: number;
  /** Width in chunks. */
  widthChunks: number;
  /** Depth in chunks. */
  depthChunks: number;
  /** Display name. */
  label: string;
}

export const WORLD_SIZES: Record<WorldSizePreset, WorldSizeConfig> = {
  classic: {
    widthBlocks: 864,
    depthBlocks: 864,
    widthChunks: 54,  // 864 / 16
    depthChunks: 54,
    label: 'Classic (864x864)',
  },
  small: {
    widthBlocks: 1024,
    depthBlocks: 1024,
    widthChunks: 64,
    depthChunks: 64,
    label: 'Small (1024x1024)',
  },
  medium: {
    widthBlocks: 3072,
    depthBlocks: 3072,
    widthChunks: 192,
    depthChunks: 192,
    label: 'Medium (3072x3072)',
  },
};

// =============================================================================
// Perlin Noise — Deterministic procedural noise generator
// =============================================================================

export class PerlinNoise {
  private perm: Uint8Array;

  constructor(seed: number) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    // Fisher-Yates shuffle with LCG seeded PRNG
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
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

  /** 2D Perlin noise, returns value in approximately [-1, 1]. */
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

  /** Fractal Brownian Motion (2D) — layered noise with configurable octaves. */
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

  /** 3D Perlin noise, returns value in approximately [-1, 1]. */
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

  /** Fractal Brownian Motion (3D) — layered noise with configurable octaves. */
  fbm3d(x: number, y: number, z: number, octaves: number, lacunarity = 2, gain = 0.5): number {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let max = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.noise3d(x * freq, y * freq, z * freq) * amp;
      max += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / max;
  }
}

// =============================================================================
// Seeded PRNG — Deterministic random number generator
// =============================================================================

/**
 * Creates a seeded pseudo-random number generator.
 * Returns a function that produces values in [0, 1) on each call.
 * Based on a splitmix-style hash.
 */
export function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a position-seeded random value.
 * Useful for deterministic per-block or per-column decisions.
 */
export function positionSeed(baseSeed: number, x: number, y: number, z: number): number {
  let h = baseSeed;
  h = (Math.imul(h ^ x, 0x45d9f3b) + 0x5555) | 0;
  h = (Math.imul(h ^ y, 0x45d9f3b) + 0xAAAA) | 0;
  h = (Math.imul(h ^ z, 0x45d9f3b) + 0xFFFF) | 0;
  return h;
}

// =============================================================================
// Chunk Key Helpers
// =============================================================================

/** Convert chunk coordinates to a string key for Map storage. */
export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/** Parse a chunk key back to coordinates. */
export function parseChunkKey(key: string): ChunkCoord {
  const parts = key.split(',');
  return { x: parseInt(parts[0], 10), z: parseInt(parts[1], 10) };
}

/** Convert world block coordinates to chunk coordinates. */
export function worldToChunkCoord(wx: number, wz: number): ChunkCoord {
  return {
    x: Math.floor(wx / CHUNK_WIDTH),
    z: Math.floor(wz / CHUNK_DEPTH),
  };
}

/** Convert world block coordinates to local coordinates within a chunk. */
export function worldToLocalCoord(wx: number, wz: number): { lx: number; lz: number } {
  // Use modulo that handles negative values correctly
  let lx = wx % CHUNK_WIDTH;
  let lz = wz % CHUNK_DEPTH;
  if (lx < 0) lx += CHUNK_WIDTH;
  if (lz < 0) lz += CHUNK_DEPTH;
  return { lx, lz };
}

// =============================================================================
// Chunk Factory
// =============================================================================

/** Block index within a chunk's flat Uint16Array. Indexed as y * 256 + z * 16 + x. */
export function blockIndex(lx: number, ly: number, lz: number): number {
  return ly * (CHUNK_WIDTH * CHUNK_DEPTH) + lz * CHUNK_WIDTH + lx;
}

/** Create a new empty chunk at the given coordinates. */
export function createEmptyChunk(cx: number, cz: number): Chunk {
  const totalBlocks = CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH; // 16 * 256 * 16 = 65536
  return {
    coord: { x: cx, z: cz },
    blocks: new Uint16Array(totalBlocks),           // All Air (0)
    blockLight: new Uint8Array(totalBlocks / 2),     // Nibble packed
    skyLight: new Uint8Array(totalBlocks / 2),       // Nibble packed
    biomes: new Uint8Array(CHUNK_WIDTH * CHUNK_DEPTH), // 256 entries
    heightMap: new Uint8Array(CHUNK_WIDTH * CHUNK_DEPTH),
    generated: false,
    dirty: false,
    lastModified: 0,
  };
}

// =============================================================================
// Chunk Generator Function Type
// =============================================================================

/** A function that generates a chunk given its coordinates. */
export type ChunkGenerator = (cx: number, cz: number) => Chunk;

// =============================================================================
// ChunkedWorld — Main world data structure
// =============================================================================

/**
 * ChunkedWorld manages a finite, chunk-based voxel world.
 *
 * Chunks are 16 wide (X) x 256 tall (Y) x 16 deep (Z), stored in a Map keyed
 * by "cx,cz". Block IDs are stored in Uint16Array since the block registry
 * exceeds 255 entries. Supports lazy generation: chunks are created on-demand
 * when first accessed via getOrGenerateChunk().
 *
 * World coordinates range from (0, 0) to (widthBlocks-1, depthBlocks-1).
 * Chunk coordinates range from (0, 0) to (widthChunks-1, depthChunks-1).
 */
export class ChunkedWorld {
  /** Chunk storage, keyed by "cx,cz". */
  private chunks: Map<string, Chunk>;

  /** World size configuration. */
  readonly size: WorldSizeConfig;

  /** World seed for generation. */
  readonly seed: number;

  constructor(sizePreset: WorldSizePreset, seed: number) {
    this.chunks = new Map();
    this.size = WORLD_SIZES[sizePreset];
    this.seed = seed;
  }

  // ---------------------------------------------------------------------------
  // Chunk Access
  // ---------------------------------------------------------------------------

  /** Get a chunk by chunk coordinates. Returns undefined if not loaded. */
  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cz));
  }

  /** Get a chunk, creating an empty one if it does not exist. */
  ensureChunk(cx: number, cz: number): Chunk {
    const key = chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = createEmptyChunk(cx, cz);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  /**
   * Get a chunk, generating it via the provided generator if it does not exist.
   * The generator is called lazily only when the chunk is first needed.
   */
  getOrGenerateChunk(cx: number, cz: number, generator: ChunkGenerator): Chunk {
    const key = chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = generator(cx, cz);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  /** Store a chunk (replaces any existing chunk at the same coordinates). */
  setChunk(cx: number, cz: number, chunk: Chunk): void {
    this.chunks.set(chunkKey(cx, cz), chunk);
  }

  /** Check if a chunk is loaded (exists in the map). */
  hasChunk(cx: number, cz: number): boolean {
    return this.chunks.has(chunkKey(cx, cz));
  }

  /** Remove a chunk from the world (for unloading). */
  unloadChunk(cx: number, cz: number): boolean {
    return this.chunks.delete(chunkKey(cx, cz));
  }

  /** Get all loaded chunk keys. */
  getLoadedChunkKeys(): string[] {
    return Array.from(this.chunks.keys());
  }

  /** Get the number of currently loaded chunks. */
  getLoadedChunkCount(): number {
    return this.chunks.size;
  }

  /** Iterate over all loaded chunks. */
  forEachChunk(callback: (chunk: Chunk, key: string) => void): void {
    this.chunks.forEach(callback);
  }

  // ---------------------------------------------------------------------------
  // World Boundary Checks
  // ---------------------------------------------------------------------------

  /** Check if world block coordinates are within the world boundaries. */
  isInBounds(x: number, z: number): boolean {
    return x >= 0 && x < this.size.widthBlocks && z >= 0 && z < this.size.depthBlocks;
  }

  /** Check if a Y coordinate is valid. */
  isYInBounds(y: number): boolean {
    return y >= 0 && y < CHUNK_HEIGHT;
  }

  /** Check if chunk coordinates are within the world grid. */
  isChunkInBounds(cx: number, cz: number): boolean {
    return cx >= 0 && cx < this.size.widthChunks && cz >= 0 && cz < this.size.depthChunks;
  }

  // ---------------------------------------------------------------------------
  // Block Access (World Coordinates)
  // ---------------------------------------------------------------------------

  /**
   * Get a block at world coordinates. Returns Air (0) if the position
   * is out of bounds or the chunk is not loaded.
   */
  getBlock(x: number, y: number, z: number): BlockId {
    if (y < 0 || y >= CHUNK_HEIGHT) return Block.Air as BlockId;
    if (!this.isInBounds(x, z)) return Block.Air as BlockId;

    const cc = worldToChunkCoord(x, z);
    const chunk = this.chunks.get(chunkKey(cc.x, cc.z));
    if (!chunk) return Block.Air as BlockId;

    const { lx, lz } = worldToLocalCoord(x, z);
    return chunk.blocks[blockIndex(lx, y, lz)] as BlockId;
  }

  /**
   * Set a block at world coordinates. Automatically creates the chunk
   * if it does not exist. Does nothing if Y is out of bounds.
   */
  setBlock(x: number, y: number, z: number, blockId: BlockId): void {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    if (!this.isInBounds(x, z)) return;

    const cc = worldToChunkCoord(x, z);
    const chunk = this.ensureChunk(cc.x, cc.z);
    const { lx, lz } = worldToLocalCoord(x, z);
    const idx = blockIndex(lx, y, lz);

    chunk.blocks[idx] = blockId;
    chunk.dirty = true;
    chunk.lastModified = Date.now();

    // Update height map if necessary
    const hmIdx = lz * CHUNK_WIDTH + lx;
    if (blockId !== Block.Air) {
      if (y > chunk.heightMap[hmIdx]) {
        chunk.heightMap[hmIdx] = y;
      }
    } else if (y === chunk.heightMap[hmIdx]) {
      // Block removed at top of column — scan downward for new highest
      let newTop = 0;
      for (let scanY = y - 1; scanY >= 0; scanY--) {
        if (chunk.blocks[blockIndex(lx, scanY, lz)] !== Block.Air) {
          newTop = scanY;
          break;
        }
      }
      chunk.heightMap[hmIdx] = newTop;
    }
  }

  // ---------------------------------------------------------------------------
  // Height Map Utilities
  // ---------------------------------------------------------------------------

  /**
   * Get the Y coordinate of the highest non-air block at the given world
   * position. Returns 0 if the chunk is not loaded or the column is empty.
   */
  getHighestBlock(x: number, z: number): number {
    if (!this.isInBounds(x, z)) return 0;

    const cc = worldToChunkCoord(x, z);
    const chunk = this.chunks.get(chunkKey(cc.x, cc.z));
    if (!chunk) return 0;

    const { lx, lz } = worldToLocalCoord(x, z);
    return chunk.heightMap[lz * CHUNK_WIDTH + lx];
  }

  /**
   * Recalculate the height map for an entire chunk by scanning all columns
   * from top to bottom. Call this after bulk block modifications.
   */
  recalculateHeightMap(cx: number, cz: number): void {
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (!chunk) return;

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
  }

  // ---------------------------------------------------------------------------
  // Biome Access
  // ---------------------------------------------------------------------------

  /**
   * Get the biome index at a world column. Returns 0 if not loaded.
   * The biome value is a numeric index into the biome registry.
   */
  getBiomeAt(x: number, z: number): number {
    if (!this.isInBounds(x, z)) return 0;

    const cc = worldToChunkCoord(x, z);
    const chunk = this.chunks.get(chunkKey(cc.x, cc.z));
    if (!chunk) return 0;

    const { lx, lz } = worldToLocalCoord(x, z);
    return chunk.biomes[lz * CHUNK_WIDTH + lx];
  }

  /**
   * Set the biome index at a world column.
   */
  setBiomeAt(x: number, z: number, biomeIndex: number): void {
    if (!this.isInBounds(x, z)) return;

    const cc = worldToChunkCoord(x, z);
    const chunk = this.ensureChunk(cc.x, cc.z);
    const { lx, lz } = worldToLocalCoord(x, z);
    chunk.biomes[lz * CHUNK_WIDTH + lx] = biomeIndex;
  }

  // ---------------------------------------------------------------------------
  // Chunk-local Block Access (for generators that already know the chunk)
  // ---------------------------------------------------------------------------

  /**
   * Get block from a chunk using local coordinates.
   * Faster than getBlock() when you already have the chunk reference.
   */
  static getBlockLocal(chunk: Chunk, lx: number, ly: number, lz: number): BlockId {
    if (lx < 0 || lx >= CHUNK_WIDTH || ly < 0 || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_DEPTH) {
      return Block.Air as BlockId;
    }
    return chunk.blocks[blockIndex(lx, ly, lz)] as BlockId;
  }

  /**
   * Set block in a chunk using local coordinates.
   * Faster than setBlock() when you already have the chunk reference.
   */
  static setBlockLocal(chunk: Chunk, lx: number, ly: number, lz: number, blockId: BlockId): void {
    if (lx < 0 || lx >= CHUNK_WIDTH || ly < 0 || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_DEPTH) {
      return;
    }
    chunk.blocks[blockIndex(lx, ly, lz)] = blockId;
  }

  // ---------------------------------------------------------------------------
  // Spawn Finding
  // ---------------------------------------------------------------------------

  /**
   * Find a suitable spawn point near the world center.
   * Looks for the first solid block with 2 blocks of air above it
   * near the center of the world.
   */
  findSpawnPoint(): { x: number; y: number; z: number } {
    const centerX = Math.floor(this.size.widthBlocks / 2);
    const centerZ = Math.floor(this.size.depthBlocks / 2);

    // Search in a spiral pattern outward from center
    for (let radius = 0; radius < 64; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
          const x = centerX + dx;
          const z = centerZ + dz;
          if (!this.isInBounds(x, z)) continue;

          const topY = this.getHighestBlock(x, z);
          if (topY < 1 || topY >= CHUNK_HEIGHT - 3) continue;

          const topBlock = this.getBlock(x, topY, z);
          // Check for solid non-liquid ground
          if (
            topBlock !== Block.Air &&
            topBlock !== Block.Water &&
            topBlock !== Block.StillWater &&
            topBlock !== Block.Lava &&
            topBlock !== Block.StillLava
          ) {
            // Ensure 2 blocks of air above
            if (
              this.getBlock(x, topY + 1, z) === Block.Air &&
              this.getBlock(x, topY + 2, z) === Block.Air
            ) {
              return { x, y: topY + 1, z };
            }
          }
        }
      }
    }

    // Fallback: center of world, y=64
    return { x: centerX, y: 64, z: centerZ };
  }

  // ---------------------------------------------------------------------------
  // Serialization Helpers
  // ---------------------------------------------------------------------------

  /** Get a compact representation of chunk coordinates for network transfer. */
  getChunkList(): ChunkCoord[] {
    const list: ChunkCoord[] = [];
    this.chunks.forEach((chunk) => {
      list.push({ x: chunk.coord.x, z: chunk.coord.z });
    });
    return list;
  }

  /** Get all dirty (modified) chunks. */
  getDirtyChunks(): Chunk[] {
    const dirty: Chunk[] = [];
    this.chunks.forEach((chunk) => {
      if (chunk.dirty) dirty.push(chunk);
    });
    return dirty;
  }

  /** Mark all chunks as clean (not dirty). */
  clearDirtyFlags(): void {
    this.chunks.forEach((chunk) => {
      chunk.dirty = false;
    });
  }
}
