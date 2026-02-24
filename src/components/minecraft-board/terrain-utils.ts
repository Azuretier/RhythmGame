// =============================================================
// Minecraft Board Game - 3D Terrain Utilities
// Converts 2D tile data into stacked voxel blocks for rendering
// =============================================================

import * as THREE from 'three';
import type {
  WorldTile, MCTileUpdate, BlockType, Biome,
} from '@/types/minecraft-board';
import { BLOCK_COLORS } from '@/types/minecraft-board';

// === Noise functions (from DungeonMapVoxel) ===

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function noise2D(x: number, z: number, seed: number): number {
  const rand = seededRandom(
    Math.floor(x * 73856093) ^ Math.floor(z * 19349663) ^ seed
  );
  return rand();
}

function smoothNoise(x: number, z: number, seed: number): number {
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

export function fractalNoise(x: number, z: number, seed: number, octaves = 3): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, z * frequency, seed + i * 1000) * amplitude;
    maxAmp += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxAmp;
}

// === Biome palettes (Minecraft Dungeons warm style) ===

type BiomePalette = { top: THREE.Color; mid: THREE.Color; deep: THREE.Color };

export const BIOME_3D_PALETTES: Record<Biome, BiomePalette> = {
  plains:    { top: new THREE.Color('#6db833'), mid: new THREE.Color('#7a5535'), deep: new THREE.Color('#5a5560') },
  forest:    { top: new THREE.Color('#3d7b1a'), mid: new THREE.Color('#6a4525'), deep: new THREE.Color('#3a3848') },
  desert:    { top: new THREE.Color('#dbb86a'), mid: new THREE.Color('#b88a40'), deep: new THREE.Color('#8c7858') },
  mountains: { top: new THREE.Color('#8090a0'), mid: new THREE.Color('#606878'), deep: new THREE.Color('#404858') },
  snowy:     { top: new THREE.Color('#dce8f4'), mid: new THREE.Color('#98b8d0'), deep: new THREE.Color('#708090') },
  swamp:     { top: new THREE.Color('#3d5e22'), mid: new THREE.Color('#4a3a1e'), deep: new THREE.Color('#2a2820') },
  ocean:     { top: new THREE.Color('#3a7ab8'), mid: new THREE.Color('#286090'), deep: new THREE.Color('#1a4870') },
};

// Blocks that override biome palette (ores, special blocks)
const BLOCK_3D_OVERRIDES: Partial<Record<BlockType, THREE.Color>> = {
  coal_ore:       new THREE.Color('#4A4A4A'),
  iron_ore:       new THREE.Color('#B8A590'),
  gold_ore:       new THREE.Color('#C4A43A'),
  diamond_ore:    new THREE.Color('#4AEDD9'),
  obsidian:       new THREE.Color('#1A0A2E'),
  bedrock:        new THREE.Color('#333333'),
  crafting_table: new THREE.Color('#8B6914'),
  furnace:        new THREE.Color('#6B6B6B'),
  chest:          new THREE.Color('#A0782C'),
  planks:         new THREE.Color('#B8935A'),
  cobblestone:    new THREE.Color('#6B6B6B'),
  ice:            new THREE.Color('#A5D6F7'),
  clay:           new THREE.Color('#9EAAB4'),
  gravel:         new THREE.Color('#9A9A9A'),
};

// === Voxel block data ===

export interface VoxelBlock {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
}

function blockColor(y: number, maxY: number, palette: BiomePalette): THREE.Color {
  const t = maxY > 1 ? y / (maxY - 1) : 1;
  if (t > 0.7) return palette.top.clone();
  if (t > 0.3) return palette.mid.clone();
  return palette.deep.clone();
}

// Compute height for a tile based on its elevation, biome, and spatial position.
// Using x/z coords produces smooth, natural height transitions between neighbours.
export function computeTileHeight(tile: WorldTile, x = 0, z = 0): number {
  // elevation is 0-10 from world generator (Math.round(elev * 10))
  // Mix spatial position with elevation so nearby tiles vary smoothly
  const noiseH = fractalNoise(x * 0.18 + tile.elevation * 0.04, z * 0.18 + tile.elevation * 0.04, 42069, 3);

  switch (tile.biome) {
    case 'ocean':
      return tile.block === 'deep_water' ? 1 : 2;
    case 'mountains':
      return Math.max(3, Math.floor(tile.elevation / 1.5) + 3 + Math.floor(noiseH * 3));
    case 'desert':
      return Math.max(1, Math.floor(tile.elevation / 3) + 1 + Math.floor(noiseH * 0.8));
    case 'snowy':
      return Math.max(2, Math.floor(tile.elevation / 2) + 2 + Math.floor(noiseH * 2));
    case 'swamp':
      return Math.max(1, Math.floor(tile.elevation / 4) + 1 + Math.floor(noiseH * 0.5));
    default:
      return Math.max(1, Math.floor(tile.elevation / 2.5) + 1 + Math.floor(noiseH * 2));
  }
}

// Surface blocks that generate 3D features (trees, flowers, etc.)
const FEATURE_BLOCKS = new Set<BlockType>([
  'wood', 'leaves', 'flower_red', 'flower_yellow',
  'mushroom_red', 'mushroom_brown', 'cactus', 'sugar_cane', 'torch',
]);

// === Build terrain voxel data from tile updates ===

export function buildTerrainBlocks(
  tiles: MCTileUpdate[],
  isDimmed: boolean,
  seed: number,
): { blocks: VoxelBlock[]; heightMap: Map<string, number> } {
  const blocks: VoxelBlock[] = [];
  const heightMap = new Map<string, number>();

  for (const tu of tiles) {
    const { x, y: tileY, tile } = tu;
    const palette = BIOME_3D_PALETTES[tile.biome];
    const baseHeight = computeTileHeight(tile, x, tileY);
    heightMap.set(`${x},${tileY}`, baseHeight);

    // Check if this block has a special override color (ores, crafting table, etc.)
    const overrideColor = BLOCK_3D_OVERRIDES[tile.block];
    const isFeature = FEATURE_BLOCKS.has(tile.block);

    // Stack terrain blocks vertically
    for (let ly = 0; ly < baseHeight; ly++) {
      let col: THREE.Color;

      if (ly === baseHeight - 1 && overrideColor && !isFeature) {
        // Top block uses override color for special blocks
        col = overrideColor.clone();
      } else if (ly === baseHeight - 1 && !isFeature) {
        // Top block uses biome top color but tinted toward actual block color
        const biomeCol = blockColor(ly, baseHeight, palette);
        const actualCol = new THREE.Color(BLOCK_COLORS[tile.block] || '#808080');
        col = biomeCol.clone().lerp(actualCol, 0.4);
      } else {
        col = blockColor(ly, baseHeight, palette);
      }

      // Add per-block color noise (stronger variation on top face, subtle on sides)
      const colorNoise = (noise2D(x + ly * 7, tileY + ly * 13, seed + 500) - 0.5) * 0.09;
      const sideNoise  = (noise2D(x * 3 + ly, tileY * 3 + ly, seed + 501) - 0.5) * 0.04;
      const cn = ly === baseHeight - 1 ? colorNoise : sideNoise;
      col.r = Math.max(0, Math.min(1, col.r + cn));
      col.g = Math.max(0, Math.min(1, col.g + cn));
      col.b = Math.max(0, Math.min(1, col.b + cn));

      // Dim colors for explored-but-not-visible tiles
      if (isDimmed) {
        col.multiplyScalar(0.35);
      }

      blocks.push({ x, y: ly, z: tileY, color: col });
    }
  }

  return { blocks, heightMap };
}

// === Build surface feature voxel data (trees, flowers, etc.) ===

export function buildSurfaceFeatures(
  tiles: MCTileUpdate[],
  heightMap: Map<string, number>,
  isDimmed: boolean,
  seed: number,
): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];

  for (const tu of tiles) {
    const { x, y: tileY, tile } = tu;
    const baseHeight = heightMap.get(`${x},${tileY}`) ?? 2;
    const topY = baseHeight;

    switch (tile.block) {
      case 'wood': {
        // Tree trunk
        const trunkColor = new THREE.Color('#6a4820');
        const detailNoise = smoothNoise(x * 0.4, tileY * 0.4, seed + 300);
        // Trunk height: 3 base + 0-1 noise variation → range 3-4 blocks
        const trunkHeight = 3 + Math.floor(detailNoise * 2);

        for (let ty = 0; ty < trunkHeight; ty++) {
          const tc = trunkColor.clone();
          const tn = (noise2D(x + ty * 3, tileY + ty * 5, seed + 400) - 0.5) * 0.06;
          tc.r = Math.max(0, Math.min(1, tc.r + tn));
          tc.g = Math.max(0, Math.min(1, tc.g + tn));
          if (isDimmed) tc.multiplyScalar(0.35);
          blocks.push({ x, y: topY + ty, z: tileY, color: tc });
        }

        // Leaf canopy — layered diamond shape for a fuller Dungeons-style tree
        const canopyBase = topY + trunkHeight;
        const leafBase = new THREE.Color('#2c7818');

        // Bottom canopy ring (wide: radius 2)
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            // Manhattan distance > 3 clips the 5×5 grid into a diamond shape with radius 2
            if (Math.abs(dx) + Math.abs(dz) > 3) continue;
            const lc = leafBase.clone();
            lc.g += (noise2D(x + dx * 2, tileY + dz * 2, seed + 888) - 0.5) * 0.08;
            if (isDimmed) lc.multiplyScalar(0.35);
            blocks.push({ x: x + dx, y: canopyBase, z: tileY + dz, color: lc });
          }
        }

        // Mid canopy ring (radius 1.5)
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const lc = leafBase.clone();
          lc.g += (noise2D(x + dx, tileY + dz, seed + 777) - 0.5) * 0.07;
          if (isDimmed) lc.multiplyScalar(0.35);
          blocks.push({ x: x + dx, y: canopyBase + 1, z: tileY + dz, color: lc });
        }

        // Top canopy peak
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const lc = leafBase.clone();
          lc.g += (noise2D(x + dx * 3, tileY + dz * 3, seed + 666) - 0.5) * 0.06;
          if (isDimmed) lc.multiplyScalar(0.35);
          blocks.push({ x: x + dx, y: canopyBase + 2, z: tileY + dz, color: lc });
        }

        // Crown tip
        const crown = leafBase.clone().lerp(new THREE.Color('#4aaa28'), 0.25);
        if (isDimmed) crown.multiplyScalar(0.35);
        blocks.push({ x, y: canopyBase + 3, z: tileY, color: crown });
        break;
      }

      case 'leaves': {
        // Standalone leaves (around trees) — small green tuft
        const lc = new THREE.Color('#3a7d22');
        if (isDimmed) lc.multiplyScalar(0.35);
        blocks.push({ x, y: topY, z: tileY, color: lc });
        break;
      }

      case 'flower_red': {
        const fc = new THREE.Color('#e06878');
        if (isDimmed) fc.multiplyScalar(0.35);
        blocks.push({ x, y: topY, z: tileY, color: fc });
        break;
      }

      case 'flower_yellow': {
        const fc = new THREE.Color('#e0c040');
        if (isDimmed) fc.multiplyScalar(0.35);
        blocks.push({ x, y: topY, z: tileY, color: fc });
        break;
      }

      case 'mushroom_red': {
        // Stem + red cap
        const stemCol = new THREE.Color('#e8dcc0');
        const capCol = new THREE.Color('#c04030');
        if (isDimmed) { stemCol.multiplyScalar(0.35); capCol.multiplyScalar(0.35); }
        blocks.push({ x, y: topY, z: tileY, color: stemCol });
        blocks.push({ x, y: topY + 1, z: tileY, color: capCol });
        break;
      }

      case 'mushroom_brown': {
        const stemCol = new THREE.Color('#e8dcc0');
        const capCol = new THREE.Color('#8a6040');
        if (isDimmed) { stemCol.multiplyScalar(0.35); capCol.multiplyScalar(0.35); }
        blocks.push({ x, y: topY, z: tileY, color: stemCol });
        blocks.push({ x, y: topY + 1, z: tileY, color: capCol });
        break;
      }

      case 'cactus': {
        const cc = new THREE.Color('#2D6B2D');
        if (isDimmed) cc.multiplyScalar(0.35);
        blocks.push({ x, y: topY, z: tileY, color: cc });
        blocks.push({ x, y: topY + 1, z: tileY, color: cc.clone() });
        break;
      }

      case 'sugar_cane': {
        const sc = new THREE.Color('#7DB84B');
        if (isDimmed) sc.multiplyScalar(0.35);
        blocks.push({ x, y: topY, z: tileY, color: sc });
        blocks.push({ x, y: topY + 1, z: tileY, color: sc.clone() });
        break;
      }

      case 'torch': {
        const tc = new THREE.Color('#FFA500');
        if (isDimmed) tc.multiplyScalar(0.35);
        blocks.push({ x, y: topY, z: tileY, color: tc });
        break;
      }
    }
  }

  return blocks;
}

// === Pack VoxelBlock[] into typed arrays for InstancedMesh ===

export function packBlocks(blocks: VoxelBlock[]): {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
} {
  const count = blocks.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const b = blocks[i];
    positions[i * 3] = b.x;
    positions[i * 3 + 1] = b.y;
    positions[i * 3 + 2] = b.z;
    colors[i * 3] = b.color.r;
    colors[i * 3 + 1] = b.color.g;
    colors[i * 3 + 2] = b.color.b;
  }

  return { positions, colors, count };
}

// === Day/night lighting presets ===

export interface LightingPreset {
  ambientIntensity: number;
  ambientColor: string;
  hemisphereTop: string;
  hemisphereBottom: string;
  hemisphereIntensity: number;
  directionalIntensity: number;
  directionalColor: string;
  bgColor: string;
}

export const DAY_NIGHT_PRESETS: Record<string, LightingPreset> = {
  day: {
    ambientIntensity: 1.6,
    ambientColor: '#fff8f0',
    hemisphereTop: '#ffeedd',
    hemisphereBottom: '#556644',
    hemisphereIntensity: 0.6,
    directionalIntensity: 2.5,
    directionalColor: '#fff0d8',
    bgColor: '#1e1812',
  },
  dusk: {
    ambientIntensity: 0.8,
    ambientColor: '#ffb870',
    hemisphereTop: '#cc8844',
    hemisphereBottom: '#332211',
    hemisphereIntensity: 0.4,
    directionalIntensity: 1.2,
    directionalColor: '#ff9050',
    bgColor: '#1a1008',
  },
  night: {
    ambientIntensity: 0.3,
    ambientColor: '#6070a0',
    hemisphereTop: '#203050',
    hemisphereBottom: '#101020',
    hemisphereIntensity: 0.25,
    directionalIntensity: 0.4,
    directionalColor: '#8090c0',
    bgColor: '#0a0810',
  },
  dawn: {
    ambientIntensity: 0.6,
    ambientColor: '#ffb0a0',
    hemisphereTop: '#dd9988',
    hemisphereBottom: '#334433',
    hemisphereIntensity: 0.35,
    directionalIntensity: 1.0,
    directionalColor: '#ffc0a0',
    bgColor: '#16100c',
  },
};
