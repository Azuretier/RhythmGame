// =============================================================================
// Biome Definitions & Climate Mapping
// =============================================================================
// Defines 19 overworld biomes with full properties (surface blocks, trees,
// vegetation, colors). Uses multi-layer noise for temperature, humidity,
// continentalness, and erosion to map world positions to biomes with smooth
// boundary blending.
// =============================================================================

import {
  Block,
  BlockId,
  type BiomeType,
  type TreeType,
} from '@/types/minecraft-switch';

import { PerlinNoise } from './chunk-world';

// =============================================================================
// Biome Numeric Index
// =============================================================================

/**
 * Numeric indices for biomes stored in chunk biome arrays.
 * These must remain stable — chunk data references them by number.
 */
export const BiomeIndex: Record<string, number> = {
  plains: 0,
  forest: 1,
  birch_forest: 2,
  dark_forest: 3,
  flower_forest: 4,
  taiga: 5,
  snowy_taiga: 6,
  snowy_plains: 7,
  desert: 8,
  savanna: 9,
  jungle: 10,
  swamp: 11,
  mountains: 12,
  snowy_mountains: 13,
  ocean: 14,
  deep_ocean: 15,
  river: 16,
  beach: 17,
  mushroom_fields: 18,
} as const;

/** Reverse lookup: numeric index -> BiomeType string. */
export const BiomeFromIndex: BiomeType[] = [
  'plains',
  'forest',
  'birch_forest',
  'dark_forest',
  'flower_forest',
  'taiga',
  'snowy_taiga',
  'snowy_plains',
  'desert',
  'savanna',
  'jungle',
  'swamp',
  'mountains',
  'snowy_mountains',
  'ocean',
  'deep_ocean',
  'river',
  'beach',
  'mushroom_fields',
];

// =============================================================================
// Tree Weight Entry
// =============================================================================

export interface TreeWeight {
  type: TreeType;
  /** Relative weight (normalized at usage time). */
  weight: number;
}

// =============================================================================
// Biome Properties
// =============================================================================

export interface BiomeProperties {
  /** BiomeType string identifier. */
  type: BiomeType;
  /** Numeric index for chunk storage. */
  index: number;
  /** Temperature value (0 = freezing, 1 = scorching). */
  temperature: number;
  /** Rainfall value (0 = arid, 1 = tropical). */
  rainfall: number;
  /** Base terrain height above sea level. */
  baseHeight: number;
  /** Height variation amplitude. */
  heightVariation: number;
  /** Surface block placed at the topmost solid position. */
  surfaceBlock: BlockId;
  /** Subsurface block placed 1-3 blocks below surface. */
  subsurfaceBlock: BlockId;
  /** Optional underwater surface block (e.g., gravel for rivers). */
  underwaterBlock: BlockId;
  /** Average trees per chunk. */
  treeDensity: number;
  /** Weighted tree types for this biome. */
  treeTypes: TreeWeight[];
  /** Grass color tint (hex). */
  grassColor: string;
  /** Foliage color tint (hex). */
  foliageColor: string;
  /** Water color tint (hex). */
  waterColor: string;
  /** Whether snow can fall/accumulate. */
  snowy: boolean;
  /** Whether rain falls (false for deserts and frozen biomes). */
  rainy: boolean;
  /** Unique features. */
  features: string[];
}

// =============================================================================
// Full Biome Registry
// =============================================================================

export const BIOME_REGISTRY: BiomeProperties[] = [
  // --- Plains ---
  {
    type: 'plains',
    index: BiomeIndex.plains,
    temperature: 0.8,
    rainfall: 0.4,
    baseHeight: 4,
    heightVariation: 3,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 0.3,
    treeTypes: [{ type: 'oak', weight: 1.0 }],
    grassColor: '#91BD59',
    foliageColor: '#77AB2F',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: true,
    features: ['tall_grass', 'flowers', 'pumpkins'],
  },

  // --- Forest ---
  {
    type: 'forest',
    index: BiomeIndex.forest,
    temperature: 0.7,
    rainfall: 0.8,
    baseHeight: 5,
    heightVariation: 5,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 8,
    treeTypes: [
      { type: 'oak', weight: 0.6 },
      { type: 'birch', weight: 0.4 },
    ],
    grassColor: '#79C05A',
    foliageColor: '#59AE30',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: true,
    features: ['tall_grass', 'flowers', 'mushrooms'],
  },

  // --- Birch Forest ---
  {
    type: 'birch_forest',
    index: BiomeIndex.birch_forest,
    temperature: 0.6,
    rainfall: 0.6,
    baseHeight: 5,
    heightVariation: 4,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 7,
    treeTypes: [{ type: 'birch', weight: 1.0 }],
    grassColor: '#88BB67',
    foliageColor: '#6BA941',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: true,
    features: ['tall_grass', 'flowers'],
  },

  // --- Dark Forest ---
  {
    type: 'dark_forest',
    index: BiomeIndex.dark_forest,
    temperature: 0.7,
    rainfall: 0.8,
    baseHeight: 5,
    heightVariation: 4,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 14,
    treeTypes: [
      { type: 'dark_oak', weight: 0.7 },
      { type: 'oak', weight: 0.2 },
      { type: 'huge_mushroom', weight: 0.1 },
    ],
    grassColor: '#507A32',
    foliageColor: '#59AE30',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: true,
    features: ['mushrooms', 'tall_grass'],
  },

  // --- Flower Forest ---
  {
    type: 'flower_forest',
    index: BiomeIndex.flower_forest,
    temperature: 0.7,
    rainfall: 0.8,
    baseHeight: 5,
    heightVariation: 5,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 4,
    treeTypes: [
      { type: 'oak', weight: 0.5 },
      { type: 'birch', weight: 0.5 },
    ],
    grassColor: '#79C05A',
    foliageColor: '#59AE30',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: true,
    features: ['dense_flowers', 'tall_grass'],
  },

  // --- Taiga ---
  {
    type: 'taiga',
    index: BiomeIndex.taiga,
    temperature: 0.25,
    rainfall: 0.8,
    baseHeight: 5,
    heightVariation: 5,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 8,
    treeTypes: [{ type: 'spruce', weight: 1.0 }],
    grassColor: '#86B783',
    foliageColor: '#68A55F',
    waterColor: '#287082',
    snowy: false,
    rainy: true,
    features: ['ferns', 'sweet_berries', 'mushrooms'],
  },

  // --- Snowy Taiga ---
  {
    type: 'snowy_taiga',
    index: BiomeIndex.snowy_taiga,
    temperature: -0.5,
    rainfall: 0.4,
    baseHeight: 5,
    heightVariation: 5,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 8,
    treeTypes: [{ type: 'spruce', weight: 1.0 }],
    grassColor: '#80B497',
    foliageColor: '#60A17B',
    waterColor: '#205E83',
    snowy: true,
    rainy: false,
    features: ['snow_layer', 'ferns'],
  },

  // --- Snowy Plains ---
  {
    type: 'snowy_plains',
    index: BiomeIndex.snowy_plains,
    temperature: 0.0,
    rainfall: 0.5,
    baseHeight: 4,
    heightVariation: 2,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 0.1,
    treeTypes: [{ type: 'spruce', weight: 1.0 }],
    grassColor: '#80B497',
    foliageColor: '#60A17B',
    waterColor: '#3D57D6',
    snowy: true,
    rainy: false,
    features: ['snow_layer'],
  },

  // --- Desert ---
  {
    type: 'desert',
    index: BiomeIndex.desert,
    temperature: 2.0,
    rainfall: 0.0,
    baseHeight: 3,
    heightVariation: 2,
    surfaceBlock: Block.Sand as BlockId,
    subsurfaceBlock: Block.Sand as BlockId,
    underwaterBlock: Block.Sand as BlockId,
    treeDensity: 0,
    treeTypes: [],
    grassColor: '#BFB755',
    foliageColor: '#AEA42A',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: false,
    features: ['cactus', 'dead_bush', 'desert_well'],
  },

  // --- Savanna ---
  {
    type: 'savanna',
    index: BiomeIndex.savanna,
    temperature: 1.2,
    rainfall: 0.0,
    baseHeight: 4,
    heightVariation: 3,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 1.5,
    treeTypes: [{ type: 'acacia', weight: 1.0 }],
    grassColor: '#BFB755',
    foliageColor: '#AEA42A',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: false,
    features: ['tall_grass'],
  },

  // --- Jungle ---
  {
    type: 'jungle',
    index: BiomeIndex.jungle,
    temperature: 0.95,
    rainfall: 0.9,
    baseHeight: 5,
    heightVariation: 6,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 16,
    treeTypes: [
      { type: 'jungle', weight: 0.8 },
      { type: 'oak', weight: 0.2 },
    ],
    grassColor: '#59C93C',
    foliageColor: '#30BB0B',
    waterColor: '#14A2C5',
    snowy: false,
    rainy: true,
    features: ['vines', 'melons', 'cocoa', 'tall_grass'],
  },

  // --- Swamp ---
  {
    type: 'swamp',
    index: BiomeIndex.swamp,
    temperature: 0.8,
    rainfall: 0.9,
    baseHeight: 0,
    heightVariation: 2,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Clay as BlockId,
    treeDensity: 3,
    treeTypes: [{ type: 'oak', weight: 1.0 }],
    grassColor: '#6A7039',
    foliageColor: '#6A7039',
    waterColor: '#617B64',
    snowy: false,
    rainy: true,
    features: ['lily_pads', 'mushrooms', 'vines', 'witch_hut'],
  },

  // --- Mountains ---
  {
    type: 'mountains',
    index: BiomeIndex.mountains,
    temperature: 0.2,
    rainfall: 0.3,
    baseHeight: 20,
    heightVariation: 30,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Stone as BlockId,
    underwaterBlock: Block.Gravel as BlockId,
    treeDensity: 1,
    treeTypes: [
      { type: 'oak', weight: 0.5 },
      { type: 'spruce', weight: 0.5 },
    ],
    grassColor: '#8AB689',
    foliageColor: '#6DA36B',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: true,
    features: ['emerald_ore', 'silverfish', 'infested_stone'],
  },

  // --- Snowy Mountains ---
  {
    type: 'snowy_mountains',
    index: BiomeIndex.snowy_mountains,
    temperature: -0.5,
    rainfall: 0.3,
    baseHeight: 20,
    heightVariation: 30,
    surfaceBlock: Block.Grass as BlockId,
    subsurfaceBlock: Block.Stone as BlockId,
    underwaterBlock: Block.Gravel as BlockId,
    treeDensity: 0.5,
    treeTypes: [{ type: 'spruce', weight: 1.0 }],
    grassColor: '#80B497',
    foliageColor: '#60A17B',
    waterColor: '#3D57D6',
    snowy: true,
    rainy: false,
    features: ['snow_layer', 'emerald_ore'],
  },

  // --- Ocean ---
  {
    type: 'ocean',
    index: BiomeIndex.ocean,
    temperature: 0.5,
    rainfall: 0.5,
    baseHeight: -15,
    heightVariation: 5,
    surfaceBlock: Block.Gravel as BlockId,
    subsurfaceBlock: Block.Gravel as BlockId,
    underwaterBlock: Block.Gravel as BlockId,
    treeDensity: 0,
    treeTypes: [],
    grassColor: '#8EB971',
    foliageColor: '#71A74D',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: true,
    features: ['kelp', 'seagrass', 'ocean_monument'],
  },

  // --- Deep Ocean ---
  {
    type: 'deep_ocean',
    index: BiomeIndex.deep_ocean,
    temperature: 0.5,
    rainfall: 0.5,
    baseHeight: -30,
    heightVariation: 5,
    surfaceBlock: Block.Gravel as BlockId,
    subsurfaceBlock: Block.Gravel as BlockId,
    underwaterBlock: Block.Gravel as BlockId,
    treeDensity: 0,
    treeTypes: [],
    grassColor: '#8EB971',
    foliageColor: '#71A74D',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: true,
    features: ['kelp', 'seagrass', 'ocean_monument'],
  },

  // --- River ---
  {
    type: 'river',
    index: BiomeIndex.river,
    temperature: 0.5,
    rainfall: 0.5,
    baseHeight: -5,
    heightVariation: 1,
    surfaceBlock: Block.Sand as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Gravel as BlockId,
    treeDensity: 0,
    treeTypes: [],
    grassColor: '#8EB971',
    foliageColor: '#71A74D',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: true,
    features: ['sugar_cane', 'clay'],
  },

  // --- Beach ---
  {
    type: 'beach',
    index: BiomeIndex.beach,
    temperature: 0.8,
    rainfall: 0.4,
    baseHeight: 0,
    heightVariation: 1,
    surfaceBlock: Block.Sand as BlockId,
    subsurfaceBlock: Block.Sand as BlockId,
    underwaterBlock: Block.Sand as BlockId,
    treeDensity: 0,
    treeTypes: [],
    grassColor: '#91BD59',
    foliageColor: '#77AB2F',
    waterColor: '#3F76E4',
    snowy: false,
    rainy: true,
    features: ['sugar_cane'],
  },

  // --- Mushroom Island ---
  {
    type: 'mushroom_fields',
    index: BiomeIndex.mushroom_fields,
    temperature: 0.9,
    rainfall: 1.0,
    baseHeight: 5,
    heightVariation: 4,
    surfaceBlock: Block.Mycelium as BlockId,
    subsurfaceBlock: Block.Dirt as BlockId,
    underwaterBlock: Block.Dirt as BlockId,
    treeDensity: 4,
    treeTypes: [{ type: 'huge_mushroom', weight: 1.0 }],
    grassColor: '#55C93F',
    foliageColor: '#2BBB0F',
    waterColor: '#8E7FA8',
    snowy: false,
    rainy: true,
    features: ['mushrooms', 'mooshroom_spawn'],
  },
];

/** Quick lookup: biome index -> properties. */
export const BIOME_BY_INDEX: (BiomeProperties | undefined)[] = [];
for (const biome of BIOME_REGISTRY) {
  BIOME_BY_INDEX[biome.index] = biome;
}

/** Quick lookup: BiomeType string -> properties. */
export const BIOME_BY_TYPE: Partial<Record<BiomeType, BiomeProperties>> = {};
for (const biome of BIOME_REGISTRY) {
  BIOME_BY_TYPE[biome.type] = biome;
}

// =============================================================================
// Sea Level Constant
// =============================================================================

export const SEA_LEVEL = 62;

// =============================================================================
// Climate Noise Layers
// =============================================================================

/**
 * Holds pre-initialized noise generators for biome selection.
 * Create once per seed and reuse across all chunk generations.
 */
export class ClimateNoise {
  readonly temperature: PerlinNoise;
  readonly humidity: PerlinNoise;
  readonly continentalness: PerlinNoise;
  readonly erosion: PerlinNoise;
  readonly weirdness: PerlinNoise;

  constructor(seed: number) {
    this.temperature = new PerlinNoise(seed + 1000);
    this.humidity = new PerlinNoise(seed + 2000);
    this.continentalness = new PerlinNoise(seed + 3000);
    this.erosion = new PerlinNoise(seed + 4000);
    this.weirdness = new PerlinNoise(seed + 5000);
  }
}

// =============================================================================
// Climate Sampling
// =============================================================================

interface ClimateValues {
  temperature: number;   // [-1, 1] range normalized to [0, 1]
  humidity: number;      // [-1, 1] range normalized to [0, 1]
  continentalness: number;
  erosion: number;
  weirdness: number;
}

/**
 * Sample climate values at a world position using multiple noise layers.
 * Each parameter uses different frequency and octave counts to produce
 * large-scale climate regions.
 */
function sampleClimate(climate: ClimateNoise, x: number, z: number): ClimateValues {
  const scale = 0.002;  // Large-scale biome regions

  const temperature = (climate.temperature.fbm2d(x * scale, z * scale, 4) + 1) * 0.5;
  const humidity = (climate.humidity.fbm2d(x * scale * 0.8, z * scale * 0.8, 4) + 1) * 0.5;
  const continentalness = climate.continentalness.fbm2d(x * scale * 0.5, z * scale * 0.5, 5);
  const erosion = (climate.erosion.fbm2d(x * scale * 1.2, z * scale * 1.2, 3) + 1) * 0.5;
  const weirdness = climate.weirdness.fbm2d(x * scale * 0.6, z * scale * 0.6, 3);

  return { temperature, humidity, continentalness, erosion, weirdness };
}

// =============================================================================
// Biome Selection from Climate Values
// =============================================================================

/**
 * Determine biome from climate parameters using a decision-tree approach
 * inspired by Minecraft's multi-noise biome source.
 *
 * The mapping uses continentalness to determine land vs. ocean, then
 * temperature and humidity to select the specific land or ocean biome.
 */
export function getBiomeFromClimate(
  temperature: number,
  humidity: number,
  continentalness: number,
  erosion: number,
): number {
  // --- Deep ocean ---
  if (continentalness < -0.45) {
    return BiomeIndex.deep_ocean;
  }

  // --- Ocean ---
  if (continentalness < -0.2) {
    return BiomeIndex.ocean;
  }

  // --- Beach / River transition ---
  if (continentalness < -0.05) {
    if (erosion > 0.6) {
      return BiomeIndex.river;
    }
    return BiomeIndex.beach;
  }

  // --- Mushroom island (rare: very high humidity + specific continentalness) ---
  if (continentalness > -0.05 && continentalness < 0.05 && humidity > 0.85 && temperature > 0.6) {
    return BiomeIndex.mushroom_fields;
  }

  // --- Mountains ---
  if (erosion < 0.2 && continentalness > 0.3) {
    if (temperature < 0.2) {
      return BiomeIndex.snowy_mountains;
    }
    return BiomeIndex.mountains;
  }

  // --- Flat, dry, and hot: Desert ---
  if (temperature > 0.75 && humidity < 0.25) {
    return BiomeIndex.desert;
  }

  // --- Hot but not dry: Savanna ---
  if (temperature > 0.75 && humidity >= 0.25 && humidity < 0.55) {
    return BiomeIndex.savanna;
  }

  // --- Very warm and wet: Jungle ---
  if (temperature > 0.65 && humidity > 0.7) {
    return BiomeIndex.jungle;
  }

  // --- Swamp: warm and very wet with low erosion (flat, soggy) ---
  if (temperature > 0.45 && humidity > 0.7 && erosion > 0.55) {
    return BiomeIndex.swamp;
  }

  // --- Cold biomes ---
  if (temperature < 0.2) {
    if (humidity > 0.5) {
      return BiomeIndex.snowy_taiga;
    }
    return BiomeIndex.snowy_plains;
  }

  // --- Cool biomes ---
  if (temperature < 0.4) {
    return BiomeIndex.taiga;
  }

  // --- Temperate forest biomes ---
  if (humidity > 0.6) {
    if (erosion < 0.4) {
      return BiomeIndex.dark_forest;
    }
    if (temperature > 0.55) {
      return BiomeIndex.flower_forest;
    }
    return BiomeIndex.forest;
  }

  if (humidity > 0.4) {
    if (temperature < 0.55) {
      return BiomeIndex.birch_forest;
    }
    return BiomeIndex.forest;
  }

  // --- Default: Plains ---
  return BiomeIndex.plains;
}

// =============================================================================
// Biome At World Position (Single Sample)
// =============================================================================

/**
 * Get the biome index at a specific world position using climate noise.
 */
export function getBiomeAt(climate: ClimateNoise, x: number, z: number): number {
  const cv = sampleClimate(climate, x, z);
  return getBiomeFromClimate(cv.temperature, cv.humidity, cv.continentalness, cv.erosion);
}

// =============================================================================
// Biome Blending
// =============================================================================

/**
 * Get a blended biome at a position by sampling a 4x4 grid around the point
 * and returning the most common biome (majority vote). This creates smoother
 * biome boundaries rather than hard edges.
 *
 * For terrain height blending, use `getBlendedHeight()` instead.
 */
export function getBlendedBiome(climate: ClimateNoise, x: number, z: number): number {
  const step = 4; // Sample every 4 blocks
  const counts: Map<number, number> = new Map();

  for (let dx = -1; dx <= 2; dx++) {
    for (let dz = -1; dz <= 2; dz++) {
      const sx = x + dx * step;
      const sz = z + dz * step;
      const biome = getBiomeAt(climate, sx, sz);
      counts.set(biome, (counts.get(biome) || 0) + 1);
    }
  }

  // Return the biome with the highest count
  let bestBiome = 0;
  let bestCount = 0;
  counts.forEach((count, biome) => {
    if (count > bestCount) {
      bestCount = count;
      bestBiome = biome;
    }
  });

  return bestBiome;
}

/**
 * Get a blended terrain height multiplier at a position by sampling
 * neighboring biomes and averaging their height contributions.
 * This prevents abrupt terrain cliffs at biome boundaries.
 *
 * Returns a { baseHeight, heightVariation } average.
 */
export function getBlendedHeight(
  climate: ClimateNoise,
  x: number,
  z: number,
): { baseHeight: number; heightVariation: number } {
  const step = 4;
  let totalBase = 0;
  let totalVar = 0;
  let totalWeight = 0;

  for (let dx = -1; dx <= 2; dx++) {
    for (let dz = -1; dz <= 2; dz++) {
      const sx = x + dx * step;
      const sz = z + dz * step;

      // Weight decreases with distance from center
      const dist = Math.abs(dx - 0.5) + Math.abs(dz - 0.5);
      const weight = 1 / (1 + dist * 0.5);

      const biome = getBiomeAt(climate, sx, sz);
      const props = BIOME_BY_INDEX[biome];
      if (props) {
        totalBase += props.baseHeight * weight;
        totalVar += props.heightVariation * weight;
      }
      totalWeight += weight;
    }
  }

  return {
    baseHeight: totalBase / totalWeight,
    heightVariation: totalVar / totalWeight,
  };
}

// =============================================================================
// Utility: Select tree type from weighted list
// =============================================================================

/**
 * Pick a tree type from a biome's weighted tree list using a random value [0, 1).
 */
export function selectTreeType(treeTypes: TreeWeight[], rand: number): TreeType | null {
  if (treeTypes.length === 0) return null;

  let totalWeight = 0;
  for (const tw of treeTypes) totalWeight += tw.weight;

  let threshold = rand * totalWeight;
  for (const tw of treeTypes) {
    threshold -= tw.weight;
    if (threshold <= 0) return tw.type;
  }

  return treeTypes[treeTypes.length - 1].type;
}

// =============================================================================
// Utility: Get flowers for biome
// =============================================================================

/** Block IDs of flowers available by biome. */
export function getBiomeFlowers(biomeIndex: number): BlockId[] {
  const props = BIOME_BY_INDEX[biomeIndex];
  if (!props) return [Block.Dandelion as BlockId, Block.Poppy as BlockId];

  switch (props.type) {
    case 'flower_forest':
      return [
        Block.Dandelion, Block.Poppy, Block.BlueOrchid, Block.Allium,
        Block.AzureBluet, Block.RedTulip, Block.OrangeTulip,
        Block.WhiteTulip, Block.PinkTulip, Block.OxeyeDaisy,
      ] as BlockId[];

    case 'plains':
    case 'sunflower_plains':
      return [
        Block.Dandelion, Block.Poppy, Block.AzureBluet, Block.OxeyeDaisy,
      ] as BlockId[];

    case 'swamp':
      return [Block.BlueOrchid] as BlockId[];

    case 'forest':
    case 'birch_forest':
    case 'dark_forest':
      return [Block.Dandelion, Block.Poppy, Block.Lilac, Block.RoseBush, Block.Peony] as BlockId[];

    case 'taiga':
    case 'snowy_taiga':
      return [Block.Dandelion, Block.Poppy] as BlockId[];

    default:
      return [Block.Dandelion, Block.Poppy] as BlockId[];
  }
}
