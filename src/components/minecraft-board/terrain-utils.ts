// =============================================================
// Minecraft Board Game - 3D Terrain Utilities
// Converts 2D tile data into stacked voxel blocks for rendering
// =============================================================

import * as THREE from 'three';
import type {
  WorldTile, MCTileUpdate, BlockType, Biome,
} from '@/types/minecraft-board';
import { BLOCK_COLORS } from '@/types/minecraft-board';
import {
  BLOCK_REGISTRY,
  BIOME_TERRAIN_STACKS,
  getStackLayerColor,
} from '@/lib/minecraft-board/blocks';

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

// === Biome palettes (derived from block registry terrain stacks) ===

type BiomePalette = { top: THREE.Color; mid: THREE.Color; deep: THREE.Color };

// Build palettes from the BIOME_TERRAIN_STACKS registry
function buildPalettes(): Record<Biome, BiomePalette> {
  const result = {} as Record<Biome, BiomePalette>;
  for (const [biome, stack] of Object.entries(BIOME_TERRAIN_STACKS)) {
    result[biome as Biome] = {
      top: new THREE.Color(stack.palette.top),
      mid: new THREE.Color(stack.palette.mid),
      deep: new THREE.Color(stack.palette.deep),
    };
  }
  return result;
}

export const BIOME_3D_PALETTES: Record<Biome, BiomePalette> = buildPalettes();

// Build override map from blocks that have overrideBiomePalette set in the registry
function buildOverrides(): Map<BlockType, THREE.Color> {
  const map = new Map<BlockType, THREE.Color>();
  for (const [block, def] of Object.entries(BLOCK_REGISTRY)) {
    if (def.overrideBiomePalette) {
      map.set(block as BlockType, new THREE.Color(def.voxelColor));
    }
  }
  return map;
}

const BLOCK_3D_OVERRIDES = buildOverrides();

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

// Compute height for a tile based on its elevation and biome
export function computeTileHeight(tile: WorldTile): number {
  // elevation is 0-10 from world generator (Math.round(elev * 10))
  const noiseH = fractalNoise(tile.elevation * 0.3, tile.elevation * 0.5, 42069, 2);
  const stack = BIOME_TERRAIN_STACKS[tile.biome];

  switch (tile.biome) {
    case 'ocean':
      return tile.block === 'deep_water' ? 1 : 2;
    case 'mountains':
      return Math.max(2, Math.floor(tile.elevation / 1.5) + 2 + Math.floor(noiseH * 2));
    case 'desert':
      // Desert uses dune-like height variation: base + elevation + noise
      return Math.max(
        stack.baseHeight,
        stack.baseHeight + Math.floor(tile.elevation / 3) + Math.floor(noiseH * stack.heightVariation),
      );
    case 'snowy':
      return Math.max(1, Math.floor(tile.elevation / 2.5) + 2 + Math.floor(noiseH));
    case 'swamp':
      return Math.max(1, Math.floor(tile.elevation / 3) + 2);
    default:
      return Math.max(1, Math.floor(tile.elevation / 2.5) + 2 + Math.floor(noiseH));
  }
}

// Surface blocks that generate 3D features (trees, flowers, etc.)
// Built from the block registry — any block with isFeature: true
const FEATURE_BLOCKS = new Set<BlockType>(
  (Object.entries(BLOCK_REGISTRY) as [BlockType, typeof BLOCK_REGISTRY[BlockType]][])
    .filter(([, def]) => def.isFeature)
    .map(([block]) => block)
);

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
    const stack = BIOME_TERRAIN_STACKS[tile.biome];
    const baseHeight = computeTileHeight(tile);
    heightMap.set(`${x},${tileY}`, baseHeight);

    // Check if this block has a special override color (ores, crafting table, etc.)
    const overrideColor = BLOCK_3D_OVERRIDES.get(tile.block);
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
        // Use the terrain stack to determine layer colors for sub-surface blocks
        // yFromTop: distance from the top of the column (0 = top)
        const yFromTop = baseHeight - 1 - ly;
        const layerColor = getStackLayerColor(stack, yFromTop);
        col = new THREE.Color(layerColor);
      }

      // Add per-block color noise
      const colorNoise = (noise2D(x + ly * 7, tileY + ly * 13, seed + 500) - 0.5) * 0.06;
      col.r = Math.max(0, Math.min(1, col.r + colorNoise));
      col.g = Math.max(0, Math.min(1, col.g + colorNoise));
      col.b = Math.max(0, Math.min(1, col.b + colorNoise));

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
        const trunkHeight = 2 + Math.floor(detailNoise * 2);

        for (let ty = 0; ty < trunkHeight; ty++) {
          const tc = trunkColor.clone();
          if (isDimmed) tc.multiplyScalar(0.35);
          blocks.push({ x, y: topY + ty, z: tileY, color: tc });
        }

        // Leaf canopy
        const canopyBase = topY + trunkHeight;
        const leafBase = new THREE.Color('#2e7a20');
        const leafVar = noise2D(x * 3, tileY * 3, seed + 999) * 0.08;

        // Lower canopy: cross shape
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const lc = leafBase.clone();
          lc.g += leafVar + (noise2D(x + dx, tileY + dz, seed + 888) - 0.5) * 0.05;
          if (isDimmed) lc.multiplyScalar(0.35);
          blocks.push({ x: x + dx, y: canopyBase, z: tileY + dz, color: lc });
        }

        // Upper canopy
        const ucol = leafBase.clone();
        if (isDimmed) ucol.multiplyScalar(0.35);
        blocks.push({ x, y: canopyBase + 1, z: tileY, color: ucol });
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (noise2D(x + dx * 2, tileY + dz * 2, seed + 777) > 0.4) {
            const lc = leafBase.clone();
            lc.g += (noise2D(x + dx, tileY + dz, seed + 666) - 0.5) * 0.06;
            if (isDimmed) lc.multiplyScalar(0.35);
            blocks.push({ x: x + dx, y: canopyBase + 1, z: tileY + dz, color: lc });
          }
        }
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

      case 'dead_bush': {
        // Small dry shrub – single block with brownish color
        const db = new THREE.Color(BLOCK_REGISTRY.dead_bush.voxelColor);
        if (isDimmed) db.multiplyScalar(0.35);
        blocks.push({ x, y: topY, z: tileY, color: db });
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
