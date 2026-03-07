// =============================================================
// Voxel World Background - Terrain Generation
// Noise functions, terrain height, world palettes, block colors,
// VoxelData interface, and generateVoxelWorld()
// =============================================================

import * as THREE from 'three';
import type { TerrainPhase } from './tetris/types';

// Simple seeded random for deterministic terrain
export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// 2D noise for terrain generation
export function noise2D(x: number, z: number, seed: number): number {
  const rand = seededRandom(
    Math.floor(x * 73856093) ^ Math.floor(z * 19349663) ^ seed
  );
  return rand();
}

export function smoothNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);

  const n00 = noise2D(ix, iz, seed);
  const n10 = noise2D(ix + 1, iz, seed);
  const n01 = noise2D(ix, iz + 1, seed);
  const n11 = noise2D(ix + 1, iz + 1, seed);

  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);
  return nx0 + sz * (nx1 - nx0);
}

// Hilly terrain for vanilla mode — generates height up to 20 blocks for 16x20x16 terrain
function terrainHeightVanilla(x: number, z: number, seed: number): number {
  const s1 = smoothNoise(x * 0.08, z * 0.08, seed);
  const s2 = smoothNoise(x * 0.15, z * 0.15, seed + 100);
  const s3 = smoothNoise(x * 0.3, z * 0.3, seed + 200);
  const h = s1 * 12 + s2 * 5 + s3 * 2;
  return Math.max(1, Math.min(20, Math.floor(h + 2)));
}

// Flat terrain for TD mode
function terrainHeightTD(_x: number, _z: number, _seed: number): number {
  return 1;
}

// World-specific block color palettes for vanilla mode
// Each world has layers: top (surface), mid (subsurface), deep (bedrock)
// Colors are derived from the world theme colors in WORLDS constant
type WorldBlockPalette = {
  top: THREE.Color;
  mid: THREE.Color;
  deep: THREE.Color;
  accent: THREE.Color;
};

function getWorldPalette(worldIdx: number): WorldBlockPalette {
  switch (worldIdx) {
    case 0: // Melodia (pink/rose)
      return {
        top: new THREE.Color(0.85, 0.42, 0.55),    // rose surface
        mid: new THREE.Color(0.65, 0.30, 0.42),     // dark rose
        deep: new THREE.Color(0.45, 0.22, 0.32),    // deep mauve
        accent: new THREE.Color(1.0, 0.71, 0.76),   // light pink
      };
    case 1: // Harmonia (teal/ocean)
      return {
        top: new THREE.Color(0.20, 0.65, 0.55),     // sea green
        mid: new THREE.Color(0.15, 0.50, 0.48),     // deep teal
        deep: new THREE.Color(0.10, 0.33, 0.36),    // ocean floor
        accent: new THREE.Color(0.30, 0.80, 0.77),  // aqua
      };
    case 2: // Crescenda (gold/sun)
      return {
        top: new THREE.Color(0.85, 0.75, 0.28),     // golden surface
        mid: new THREE.Color(0.70, 0.58, 0.18),     // amber
        deep: new THREE.Color(0.50, 0.40, 0.12),    // dark gold
        accent: new THREE.Color(1.0, 0.90, 0.43),   // bright gold
      };
    case 3: // Fortissimo (red/fire)
      return {
        top: new THREE.Color(0.80, 0.30, 0.25),     // lava surface
        mid: new THREE.Color(0.60, 0.18, 0.15),     // deep red
        deep: new THREE.Color(0.35, 0.10, 0.08),    // obsidian
        accent: new THREE.Color(1.0, 0.50, 0.30),   // fire orange
      };
    case 4: // Seijaku (purple/ethereal)
      return {
        top: new THREE.Color(0.55, 0.50, 0.85),     // amethyst surface
        mid: new THREE.Color(0.40, 0.35, 0.70),     // deep purple
        deep: new THREE.Color(0.25, 0.20, 0.50),    // dark violet
        accent: new THREE.Color(0.75, 0.70, 0.95),  // light lavender
      };
    default: // Fallback earth tones
      return {
        top: new THREE.Color(0.35, 0.55, 0.25),
        mid: new THREE.Color(0.45, 0.35, 0.25),
        deep: new THREE.Color(0.4, 0.4, 0.4),
        accent: new THREE.Color(0.50, 0.65, 0.35),
      };
  }
}

// Block color for vanilla mode — world-themed layers by height
function blockColorVanilla(y: number, maxY: number, worldIdx: number = 0): THREE.Color {
  const palette = getWorldPalette(worldIdx);
  const t = maxY > 1 ? y / maxY : 0.5;
  if (y === maxY - 1) {
    // Topmost block gets accent highlight
    return palette.accent.clone().lerp(palette.top, 0.4);
  }
  if (t > 0.6) return palette.top;
  if (t > 0.25) return palette.mid;
  return palette.deep;
}

// Block color for TD mode — checkerboard board-game pattern
function blockColorTD(_y: number, _maxY: number, x?: number, z?: number): THREE.Color {
  if (x !== undefined && z !== undefined) {
    const isLight = ((Math.abs(x) + Math.abs(z)) % 2) === 0;
    if (isLight) {
      return new THREE.Color(0.30, 0.50, 0.25);
    } else {
      return new THREE.Color(0.38, 0.60, 0.32);
    }
  }
  return new THREE.Color(0.34, 0.55, 0.28);
}

export interface VoxelData {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
  /** TD mode only: map from "gx,gz" → instance index for color updates */
  gridIndexMap?: Map<string, number>;
}

// Vanilla terrain dimensions
const VANILLA_SIZE_X = 16;
const VANILLA_SIZE_Z = 16;

export function generateVoxelWorld(seed: number, size: number, mode: TerrainPhase = 'td', worldIdx: number = 0): VoxelData {
  const blocks: { x: number; y: number; z: number; color: THREE.Color }[] = [];

  const heightFn = mode === 'dig' ? terrainHeightVanilla : terrainHeightTD;

  if (mode === 'dig') {
    // Rectangular 16x20x16 terrain
    const halfX = Math.floor(VANILLA_SIZE_X / 2);
    const halfZ = Math.floor(VANILLA_SIZE_Z / 2);
    for (let x = -halfX; x < halfX; x++) {
      for (let z = -halfZ; z < halfZ; z++) {
        const maxY = heightFn(x, z, seed);
        for (let y = 0; y < maxY; y++) {
          const color = blockColorVanilla(y, maxY, worldIdx);
          blocks.push({ x, y, z, color });
        }
      }
    }
    // Sort blocks by height descending so reducing instancedMesh.count
    // removes the top blocks first
    blocks.sort((a, b) => b.y - a.y);
  } else {
    // TD mode: circular terrain
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist > size + 0.5) continue;

        const maxY = heightFn(x, z, seed);
        for (let y = 0; y < maxY; y++) {
          const color = blockColorTD(y, maxY, x, z);
          blocks.push({ x, y, z, color });
        }
      }
    }
  }

  const count = blocks.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  // Build grid-to-index map for TD mode (top block per column)
  const gridIndexMap = mode === 'td' ? new Map<string, number>() : undefined;

  blocks.forEach((block, i) => {
    positions[i * 3] = block.x;
    positions[i * 3 + 1] = block.y;
    positions[i * 3 + 2] = block.z;
    colors[i * 3] = block.color.r;
    colors[i * 3 + 1] = block.color.g;
    colors[i * 3 + 2] = block.color.b;

    // For TD mode, map each (x,z) to its instance index (flat terrain = 1 block high)
    if (gridIndexMap) {
      gridIndexMap.set(`${block.x},${block.z}`, i);
    }
  });

  return { positions, colors, count, gridIndexMap };
}
