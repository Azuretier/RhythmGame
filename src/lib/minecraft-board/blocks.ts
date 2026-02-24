// =============================================================
// Minecraft Board Game - Block Registry
// Reusable block definitions for map rendering & terrain generation
// =============================================================
//
// This module is the single source of truth for how blocks look and
// behave during rendering and procedural generation. Both the 2D
// BoardRenderer and the 3D terrain pipeline read from this registry.
// To add a new block, define its entry in BLOCK_REGISTRY below.
// =============================================================

import type { BlockType, Biome } from '@/types/minecraft-board';

// === Terrain layer descriptor ===
// Describes how a block type stacks vertically when generating 3D terrain.

export interface TerrainLayer {
  /** Block placed in this layer */
  block: BlockType;
  /** Hex color used for 3D voxel rendering of this layer */
  color: string;
  /** Number of blocks in this layer (can vary per-tile via noise) */
  depth: number;
}

// === Block render definition ===

export interface BlockRenderDef {
  /** Primary color used for 2D map rendering */
  mapColor: string;
  /** 3D voxel color – top face / override color */
  voxelColor: string;
  /**
   * Optional 3D mid-layer color (used when the block appears in
   * the middle of a terrain stack). Falls back to voxelColor.
   */
  voxelMidColor?: string;
  /**
   * Optional 3D deep-layer color (used for the lowest blocks
   * in a terrain stack). Falls back to voxelMidColor → voxelColor.
   */
  voxelDeepColor?: string;
  /** Whether this block is rendered as a surface feature (tree, flower) rather than terrain */
  isFeature?: boolean;
  /** Whether the 3D renderer should override biome palette for the top block */
  overrideBiomePalette?: boolean;
}

// === The registry ===

export const BLOCK_REGISTRY: Record<BlockType, BlockRenderDef> = {
  // --- Terrain blocks ---
  air:            { mapColor: 'transparent', voxelColor: '#000000' },
  grass:          { mapColor: '#5D8C3E', voxelColor: '#7db044', voxelMidColor: '#8b6b47', voxelDeepColor: '#6a6870' },
  dirt:           { mapColor: '#8B6B47', voxelColor: '#8b6b47', voxelMidColor: '#7a5a3a', voxelDeepColor: '#6a6870' },
  stone:          { mapColor: '#808080', voxelColor: '#8a8890', voxelMidColor: '#6a6870', voxelDeepColor: '#504e56', overrideBiomePalette: true },
  cobblestone:    { mapColor: '#6B6B6B', voxelColor: '#6B6B6B', overrideBiomePalette: true },
  sand:           { mapColor: '#DBC67B', voxelColor: '#e0c878', voxelMidColor: '#d4b86a', voxelDeepColor: '#c4a858' },
  sandstone:      { mapColor: '#D4B86A', voxelColor: '#d4b86a', voxelMidColor: '#c4a050', voxelDeepColor: '#b09040', overrideBiomePalette: true },
  red_sand:       { mapColor: '#C2713A', voxelColor: '#c2713a', voxelMidColor: '#a85e30', voxelDeepColor: '#8e4e28' },
  terracotta:     { mapColor: '#9E5B3C', voxelColor: '#9e5b3c', voxelMidColor: '#8a4e34', voxelDeepColor: '#76422c', overrideBiomePalette: true },
  water:          { mapColor: '#3B7DD8', voxelColor: '#4a90c8', voxelMidColor: '#3570a0', voxelDeepColor: '#2a5580' },
  deep_water:     { mapColor: '#1A3D6E', voxelColor: '#2a5580', voxelMidColor: '#1a3d6e', voxelDeepColor: '#102848' },
  snow_block:     { mapColor: '#F0F0FF', voxelColor: '#e8eaf0', voxelMidColor: '#c8ccd8', voxelDeepColor: '#a0a4b0' },
  ice:            { mapColor: '#A5D6F7', voxelColor: '#A5D6F7', overrideBiomePalette: true },
  bedrock:        { mapColor: '#333333', voxelColor: '#333333', overrideBiomePalette: true },
  gravel:         { mapColor: '#9A9A9A', voxelColor: '#9A9A9A', overrideBiomePalette: true },
  clay:           { mapColor: '#9EAAB4', voxelColor: '#9EAAB4', overrideBiomePalette: true },
  planks:         { mapColor: '#B8935A', voxelColor: '#B8935A', overrideBiomePalette: true },

  // --- Ore blocks (always override biome palette) ---
  coal_ore:       { mapColor: '#4A4A4A', voxelColor: '#4A4A4A', overrideBiomePalette: true },
  iron_ore:       { mapColor: '#B8A590', voxelColor: '#B8A590', overrideBiomePalette: true },
  gold_ore:       { mapColor: '#C4A43A', voxelColor: '#C4A43A', overrideBiomePalette: true },
  diamond_ore:    { mapColor: '#4AEDD9', voxelColor: '#4AEDD9', overrideBiomePalette: true },
  obsidian:       { mapColor: '#1A0A2E', voxelColor: '#1A0A2E', overrideBiomePalette: true },

  // --- Functional blocks ---
  crafting_table: { mapColor: '#8B6914', voxelColor: '#8B6914', overrideBiomePalette: true },
  furnace:        { mapColor: '#6B6B6B', voxelColor: '#6B6B6B', overrideBiomePalette: true },
  chest:          { mapColor: '#A0782C', voxelColor: '#A0782C', overrideBiomePalette: true },

  // --- Feature blocks (rendered as surface decorations, not terrain) ---
  wood:           { mapColor: '#6B4226', voxelColor: '#6a4820', isFeature: true },
  leaves:         { mapColor: '#3A7D22', voxelColor: '#3a7d22', isFeature: true },
  tall_grass:     { mapColor: '#6B9E3E', voxelColor: '#6B9E3E', isFeature: true },
  flower_red:     { mapColor: '#5D8C3E', voxelColor: '#e06878', isFeature: true },
  flower_yellow:  { mapColor: '#5D8C3E', voxelColor: '#e0c040', isFeature: true },
  mushroom_red:   { mapColor: '#5D8C3E', voxelColor: '#c04030', isFeature: true },
  mushroom_brown: { mapColor: '#5D8C3E', voxelColor: '#8a6040', isFeature: true },
  cactus:         { mapColor: '#2D6B2D', voxelColor: '#2D6B2D', isFeature: true },
  sugar_cane:     { mapColor: '#7DB84B', voxelColor: '#7DB84B', isFeature: true },
  dead_bush:      { mapColor: '#8B7355', voxelColor: '#8B7355', isFeature: true },
  torch:          { mapColor: '#5D8C3E', voxelColor: '#FFA500', isFeature: true },
};

// === Biome terrain stack definitions ===
// Describes the vertical block composition for each biome.
// Layers are ordered top-to-bottom. The terrain generator uses
// these to build multi-material voxel columns.

export interface BiomeTerrainStack {
  /** Layers from top (surface) to bottom (deep). Each layer defines
   *  the block type, its color, and how many blocks deep it runs. */
  layers: TerrainLayer[];
  /** Base height before noise is applied */
  baseHeight: number;
  /** Height variation range added by noise */
  heightVariation: number;
  /** 3D palette colors (top/mid/deep) used for non-override blocks */
  palette: { top: string; mid: string; deep: string };
}

export const BIOME_TERRAIN_STACKS: Record<Biome, BiomeTerrainStack> = {
  plains: {
    layers: [
      { block: 'grass', color: '#7db044', depth: 1 },
      { block: 'dirt',  color: '#8b6b47', depth: 2 },
      { block: 'stone', color: '#6a6870', depth: 10 },
    ],
    baseHeight: 3,
    heightVariation: 2,
    palette: { top: '#7db044', mid: '#8b6b47', deep: '#6a6870' },
  },
  forest: {
    layers: [
      { block: 'grass', color: '#5e8a32', depth: 1 },
      { block: 'dirt',  color: '#7a5530', depth: 2 },
      { block: 'stone', color: '#504e56', depth: 10 },
    ],
    baseHeight: 3,
    heightVariation: 2,
    palette: { top: '#5e8a32', mid: '#7a5530', deep: '#504e56' },
  },
  desert: {
    layers: [
      { block: 'sand',      color: '#e0c878', depth: 3 },
      { block: 'sandstone', color: '#d4b86a', depth: 3 },
      { block: 'terracotta', color: '#9e5b3c', depth: 2 },
      { block: 'stone',     color: '#8a8890', depth: 10 },
    ],
    baseHeight: 3,
    heightVariation: 3,
    palette: { top: '#e0c878', mid: '#d4b86a', deep: '#9e5b3c' },
  },
  mountains: {
    layers: [
      { block: 'stone',  color: '#8a8890', depth: 2 },
      { block: 'stone',  color: '#6a6870', depth: 4 },
      { block: 'stone',  color: '#504e56', depth: 10 },
    ],
    baseHeight: 4,
    heightVariation: 5,
    palette: { top: '#8a8890', mid: '#6a6870', deep: '#504e56' },
  },
  snowy: {
    layers: [
      { block: 'snow_block', color: '#e8eaf0', depth: 2 },
      { block: 'dirt',       color: '#c8ccd8', depth: 2 },
      { block: 'stone',      color: '#a0a4b0', depth: 10 },
    ],
    baseHeight: 3,
    heightVariation: 2,
    palette: { top: '#e8eaf0', mid: '#c8ccd8', deep: '#a0a4b0' },
  },
  swamp: {
    layers: [
      { block: 'grass', color: '#4a6828', depth: 1 },
      { block: 'dirt',  color: '#5a4a30', depth: 2 },
      { block: 'clay',  color: '#3a3828', depth: 10 },
    ],
    baseHeight: 2,
    heightVariation: 1,
    palette: { top: '#4a6828', mid: '#5a4a30', deep: '#3a3828' },
  },
  ocean: {
    layers: [
      { block: 'water', color: '#4a90c8', depth: 2 },
      { block: 'sand',  color: '#bca068', depth: 1 },
      { block: 'stone', color: '#2a5580', depth: 10 },
    ],
    baseHeight: 2,
    heightVariation: 1,
    palette: { top: '#4a90c8', mid: '#3570a0', deep: '#2a5580' },
  },
};

// === Helper: resolve the layer color for a given depth within a terrain stack ===

/**
 * Given a biome terrain stack and a vertical position within the column,
 * returns the color for that layer. `yFromTop` is 0 for the top-most block.
 */
export function getStackLayerColor(
  stack: BiomeTerrainStack,
  yFromTop: number,
): string {
  let accumulated = 0;
  for (const layer of stack.layers) {
    accumulated += layer.depth;
    if (yFromTop < accumulated) {
      return layer.color;
    }
  }
  // Default to deepest layer
  return stack.layers[stack.layers.length - 1].color;
}

/**
 * Given a biome terrain stack and a vertical position within the column,
 * returns the block type for that layer.
 */
export function getStackLayerBlock(
  stack: BiomeTerrainStack,
  yFromTop: number,
): BlockType {
  let accumulated = 0;
  for (const layer of stack.layers) {
    accumulated += layer.depth;
    if (yFromTop < accumulated) {
      return layer.block;
    }
  }
  return stack.layers[stack.layers.length - 1].block;
}

// === Helper: quick render lookups ===

export function getBlockVoxelColor(block: BlockType): string {
  return BLOCK_REGISTRY[block].voxelColor;
}

export function getBlockMapColor(block: BlockType): string {
  return BLOCK_REGISTRY[block].mapColor;
}

export function isFeatureBlock(block: BlockType): boolean {
  return BLOCK_REGISTRY[block].isFeature === true;
}

export function shouldOverrideBiomePalette(block: BlockType): boolean {
  return BLOCK_REGISTRY[block].overrideBiomePalette === true;
}
