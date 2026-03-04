// =============================================================================
// Minecraft: Nintendo Switch Edition — Mob Registry
// =============================================================================
// Complete registry of 30+ mob types with stats, drops, spawn biomes, and
// behavioral metadata. Each MobDefinition provides all static data needed by
// the AI, spawning, and combat systems. Matches Nintendo Switch Edition parity.
// =============================================================================

import type {
  MobType,
  MobDefinition,
  MobStats,
  MobDropEntry,
  EntityCategory,
  BiomeType,
} from '@/types/minecraft-switch';

// =============================================================================
// HELPER — Create MobDefinition with sensible defaults
// =============================================================================

function mobDef(
  overrides: Partial<MobDefinition> & {
    type: MobType;
    name: string;
    nameJa: string;
    category: EntityCategory;
    stats: MobStats;
  },
): MobDefinition {
  return {
    drops: [],
    spawnBiomes: [],
    burnsInDaylight: false,
    canSwim: false,
    tameable: false,
    breedable: false,
    breedingItems: [],
    color: '#FFFFFF',
    icon: '?',
    ...overrides,
  };
}

/** Create a MobStats object with defaults. */
function stats(overrides: Partial<MobStats> & { maxHealth: number }): MobStats {
  return {
    attackDamage: 0,
    movementSpeed: 0.25,
    knockbackResistance: 0,
    followRange: 16,
    armor: 0,
    armorToughness: 0,
    spawnWeight: 10,
    experienceDrop: 5,
    ...overrides,
  };
}

// =============================================================================
// Common Biome Groups
// =============================================================================

const OVERWORLD_SURFACE: BiomeType[] = [
  'plains', 'sunflower_plains', 'forest', 'flower_forest', 'birch_forest',
  'dark_forest', 'taiga', 'snowy_taiga', 'giant_tree_taiga', 'jungle',
  'bamboo_jungle', 'desert', 'savanna', 'savanna_plateau', 'mountains',
  'snowy_mountains', 'gravelly_mountains', 'swamp', 'badlands',
  'eroded_badlands', 'wooded_badlands', 'snowy_plains', 'ice_spikes',
];

const GRASSY_BIOMES: BiomeType[] = [
  'plains', 'sunflower_plains', 'forest', 'flower_forest', 'birch_forest',
  'dark_forest', 'taiga', 'giant_tree_taiga', 'savanna', 'savanna_plateau',
];

const SNOWY_BIOMES: BiomeType[] = [
  'snowy_taiga', 'snowy_mountains', 'snowy_plains', 'ice_spikes',
  'snowy_beach', 'frozen_river', 'frozen_ocean', 'deep_frozen_ocean',
];

const OCEAN_BIOMES: BiomeType[] = [
  'ocean', 'deep_ocean', 'warm_ocean', 'lukewarm_ocean',
  'cold_ocean', 'frozen_ocean', 'deep_frozen_ocean',
];

const FOREST_BIOMES: BiomeType[] = [
  'forest', 'flower_forest', 'birch_forest', 'dark_forest',
  'taiga', 'giant_tree_taiga', 'snowy_taiga',
];

// =============================================================================
// MOB REGISTRY — 30+ mob definitions
// =============================================================================

export const MOB_REGISTRY: Record<string, MobDefinition> = {
  // =========================================================================
  // HOSTILE MOBS
  // =========================================================================

  zombie: mobDef({
    type: 'zombie',
    name: 'Zombie',
    nameJa: 'ゾンビ',
    category: 'hostile',
    stats: stats({
      maxHealth: 20,
      attackDamage: 3, // easy; 4 normal, 6 hard (scaled at runtime by difficulty)
      movementSpeed: 0.23,
      followRange: 35,
      armor: 2,
      spawnWeight: 100,
      experienceDrop: 5,
    }),
    drops: [
      { item: 'rotten_flesh', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'iron_ingot', countMin: 1, countMax: 1, chance: 0.025, lootingBonus: 0.01 },
      { item: 'carrot', countMin: 1, countMax: 1, chance: 0.025, lootingBonus: 0.01 },
      { item: 'potato', countMin: 1, countMax: 1, chance: 0.025, lootingBonus: 0.01 },
    ],
    spawnBiomes: OVERWORLD_SURFACE,
    burnsInDaylight: true,
    color: '#00AA00',
    icon: 'Z',
  }),

  skeleton: mobDef({
    type: 'skeleton',
    name: 'Skeleton',
    nameJa: 'スケルトン',
    category: 'hostile',
    stats: stats({
      maxHealth: 20,
      attackDamage: 2, // ranged arrow damage varies 1-4 based on difficulty
      movementSpeed: 0.25,
      followRange: 16,
      spawnWeight: 80,
      experienceDrop: 5,
    }),
    drops: [
      { item: 'bone', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'arrow', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'bow', countMin: 1, countMax: 1, chance: 0.085, lootingBonus: 0.01 },
    ],
    spawnBiomes: OVERWORLD_SURFACE,
    burnsInDaylight: true,
    color: '#C0C0C0',
    icon: 'S',
  }),

  creeper: mobDef({
    type: 'creeper',
    name: 'Creeper',
    nameJa: 'クリーパー',
    category: 'hostile',
    stats: stats({
      maxHealth: 20,
      attackDamage: 0, // Explodes instead — radius 3, power 49 normal / 97 charged
      movementSpeed: 0.25,
      followRange: 16,
      spawnWeight: 100,
      experienceDrop: 5,
    }),
    drops: [
      { item: 'gunpowder', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      // music_disc dropped if killed by skeleton (handled in combat logic)
    ],
    spawnBiomes: OVERWORLD_SURFACE,
    color: '#00DD00',
    icon: 'C',
  }),

  spider: mobDef({
    type: 'spider',
    name: 'Spider',
    nameJa: 'クモ',
    category: 'neutral', // neutral during day, hostile at night
    stats: stats({
      maxHealth: 16,
      attackDamage: 2, // 2 easy, 3 normal+
      movementSpeed: 0.3,
      followRange: 16,
      spawnWeight: 100,
      experienceDrop: 5,
    }),
    drops: [
      { item: 'string', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'spider_eye', countMin: 1, countMax: 1, chance: 0.33, lootingBonus: 0.01 },
    ],
    spawnBiomes: OVERWORLD_SURFACE,
    color: '#342D28',
    icon: 'Sp',
  }),

  cave_spider: mobDef({
    type: 'cave_spider',
    name: 'Cave Spider',
    nameJa: '洞窟グモ',
    category: 'hostile',
    stats: stats({
      maxHealth: 12,
      attackDamage: 2, // + poison (7s easy, 15s normal/hard)
      movementSpeed: 0.3,
      followRange: 16,
      spawnWeight: 0, // Only spawns from spawner blocks in mineshafts
      experienceDrop: 5,
    }),
    drops: [
      { item: 'string', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'spider_eye', countMin: 1, countMax: 1, chance: 0.33, lootingBonus: 0.01 },
    ],
    spawnBiomes: [],
    color: '#0C424E',
    icon: 'CS',
  }),

  enderman: mobDef({
    type: 'enderman',
    name: 'Enderman',
    nameJa: 'エンダーマン',
    category: 'neutral', // neutral until provoked (looked at or attacked)
    stats: stats({
      maxHealth: 40,
      attackDamage: 4.5, // 4.5 easy, 7 normal, 10.5 hard
      movementSpeed: 0.3,
      followRange: 64,
      spawnWeight: 10,
      experienceDrop: 5,
    }),
    drops: [
      { item: 'ender_pearl', countMin: 0, countMax: 1, chance: 1.0, lootingBonus: 0.01 },
    ],
    spawnBiomes: [...OVERWORLD_SURFACE, 'the_end', 'end_highlands', 'end_midlands', 'end_barrens', 'nether_wastes', 'warped_forest'],
    color: '#161616',
    icon: 'E',
  }),

  witch: mobDef({
    type: 'witch',
    name: 'Witch',
    nameJa: 'ウィッチ',
    category: 'hostile',
    stats: stats({
      maxHealth: 26,
      attackDamage: 0, // Uses splash potions
      movementSpeed: 0.25,
      followRange: 16,
      spawnWeight: 5,
      experienceDrop: 5,
    }),
    drops: [
      { item: 'glass_bottle', countMin: 0, countMax: 2, chance: 0.125, lootingBonus: 0.01 },
      { item: 'glowstone_dust', countMin: 0, countMax: 2, chance: 0.125, lootingBonus: 0.01 },
      { item: 'gunpowder', countMin: 0, countMax: 2, chance: 0.125, lootingBonus: 0.01 },
      { item: 'redstone', countMin: 0, countMax: 2, chance: 0.125, lootingBonus: 0.01 },
      { item: 'spider_eye', countMin: 0, countMax: 2, chance: 0.125, lootingBonus: 0.01 },
      { item: 'sugar', countMin: 0, countMax: 2, chance: 0.125, lootingBonus: 0.01 },
      { item: 'stick', countMin: 0, countMax: 2, chance: 0.125, lootingBonus: 0.01 },
    ],
    spawnBiomes: ['swamp'],
    color: '#340000',
    icon: 'W',
  }),

  slime: mobDef({
    type: 'slime',
    name: 'Slime',
    nameJa: 'スライム',
    category: 'hostile',
    stats: stats({
      maxHealth: 16, // big=16, medium=4, small=1
      attackDamage: 4, // big=4, medium=3, small=0
      movementSpeed: 0.4, // big/medium=0.4, small=0.6
      followRange: 16,
      spawnWeight: 10,
      experienceDrop: 4, // big=4, medium=2, small=1
    }),
    drops: [
      { item: 'slimeball', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      // Only small slimes drop slimeballs; handled in drop logic
    ],
    spawnBiomes: ['swamp'],
    color: '#51A03E',
    icon: 'Sl',
  }),

  phantom: mobDef({
    type: 'phantom',
    name: 'Phantom',
    nameJa: 'ファントム',
    category: 'hostile',
    stats: stats({
      maxHealth: 20,
      attackDamage: 2, // 2 easy, 3 normal, 4 hard
      movementSpeed: 0.5,
      followRange: 64,
      spawnWeight: 0, // Spawns conditionally (player hasn't slept 3+ days)
      experienceDrop: 5,
    }),
    drops: [
      { item: 'phantom_membrane', countMin: 0, countMax: 1, chance: 1.0, lootingBonus: 0.01 },
    ],
    spawnBiomes: OVERWORLD_SURFACE,
    burnsInDaylight: true,
    color: '#4D568C',
    icon: 'Ph',
  }),

  drowned: mobDef({
    type: 'drowned',
    name: 'Drowned',
    nameJa: 'ドラウンド',
    category: 'hostile',
    stats: stats({
      maxHealth: 20,
      attackDamage: 3, // + trident 7 if equipped
      movementSpeed: 0.23,
      followRange: 16,
      spawnWeight: 5,
      experienceDrop: 5,
    }),
    drops: [
      { item: 'rotten_flesh', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'trident', countMin: 1, countMax: 1, chance: 0.085, lootingBonus: 0.01 },
      { item: 'nautilus_shell', countMin: 1, countMax: 1, chance: 0.03, lootingBonus: 0.01 },
    ],
    spawnBiomes: [...OCEAN_BIOMES, 'river', 'frozen_river'],
    canSwim: true,
    color: '#3E8E66',
    icon: 'Dr',
  }),

  husk: mobDef({
    type: 'husk',
    name: 'Husk',
    nameJa: 'ハスク',
    category: 'hostile',
    stats: stats({
      maxHealth: 20,
      attackDamage: 3, // + hunger status effect; 3/4/6 by difficulty
      movementSpeed: 0.23,
      followRange: 35,
      armor: 2,
      spawnWeight: 80,
      experienceDrop: 5,
    }),
    drops: [
      { item: 'rotten_flesh', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'iron_ingot', countMin: 1, countMax: 1, chance: 0.025, lootingBonus: 0.01 },
    ],
    spawnBiomes: ['desert'],
    burnsInDaylight: false, // Husks do NOT burn in sunlight
    color: '#776B55',
    icon: 'H',
  }),

  stray: mobDef({
    type: 'stray',
    name: 'Stray',
    nameJa: 'ストレイ',
    category: 'hostile',
    stats: stats({
      maxHealth: 20,
      attackDamage: 2, // ranged + slowness tipped arrows
      movementSpeed: 0.25,
      followRange: 16,
      spawnWeight: 80,
      experienceDrop: 5,
    }),
    drops: [
      { item: 'bone', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'arrow', countMin: 0, countMax: 2, chance: 0.5, lootingBonus: 0.01 },
      { item: 'tipped_arrow_slowness', countMin: 0, countMax: 1, chance: 0.5, lootingBonus: 0.01 },
    ],
    spawnBiomes: SNOWY_BIOMES,
    burnsInDaylight: true,
    color: '#AEBDBE',
    icon: 'St',
  }),

  silverfish: mobDef({
    type: 'silverfish',
    name: 'Silverfish',
    nameJa: 'シルバーフィッシュ',
    category: 'hostile',
    stats: stats({
      maxHealth: 8,
      attackDamage: 1,
      movementSpeed: 0.25,
      followRange: 16,
      spawnWeight: 0, // Spawns from infested blocks only
      experienceDrop: 5,
    }),
    drops: [], // No drops
    spawnBiomes: ['mountains'],
    color: '#6E6E6E',
    icon: 'Si',
  }),

  guardian: mobDef({
    type: 'guardian',
    name: 'Guardian',
    nameJa: 'ガーディアン',
    category: 'hostile',
    stats: stats({
      maxHealth: 30,
      attackDamage: 6, // laser attack
      movementSpeed: 0.5,
      followRange: 16,
      spawnWeight: 5,
      experienceDrop: 10,
    }),
    drops: [
      { item: 'prismarine_shard', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'raw_cod', countMin: 0, countMax: 1, chance: 0.4, lootingBonus: 0.01 },
      { item: 'prismarine_crystals', countMin: 0, countMax: 1, chance: 0.33, lootingBonus: 0.01 },
    ],
    spawnBiomes: ['deep_ocean'],
    canSwim: true,
    color: '#6A9595',
    icon: 'Gd',
  }),

  elder_guardian: mobDef({
    type: 'elder_guardian',
    name: 'Elder Guardian',
    nameJa: 'エルダーガーディアン',
    category: 'hostile',
    stats: stats({
      maxHealth: 80,
      attackDamage: 8, // laser + mining_fatigue aura
      movementSpeed: 0.5,
      knockbackResistance: 0.5,
      followRange: 16,
      spawnWeight: 0, // Only spawns in ocean monuments
      experienceDrop: 10,
    }),
    drops: [
      { item: 'prismarine_shard', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'wet_sponge', countMin: 1, countMax: 1, chance: 1.0, lootingBonus: 0.0 },
      { item: 'raw_cod', countMin: 0, countMax: 1, chance: 0.4, lootingBonus: 0.01 },
      { item: 'tide_armor_trim', countMin: 1, countMax: 1, chance: 0.2, lootingBonus: 0.0 },
    ],
    spawnBiomes: ['deep_ocean'],
    canSwim: true,
    color: '#BEA488',
    icon: 'EG',
  }),

  // =========================================================================
  // NEUTRAL MOBS
  // =========================================================================

  wolf: mobDef({
    type: 'wolf',
    name: 'Wolf',
    nameJa: 'オオカミ',
    category: 'neutral',
    stats: stats({
      maxHealth: 8, // wild=8, tamed=20
      attackDamage: 2, // wild=2, tamed=4
      movementSpeed: 0.3,
      followRange: 16,
      spawnWeight: 8,
      experienceDrop: 1,
    }),
    drops: [], // No drops from wolves
    spawnBiomes: FOREST_BIOMES,
    tameable: true,
    breedable: true,
    breedingItems: ['raw_beef', 'cooked_beef', 'raw_porkchop', 'cooked_porkchop', 'raw_mutton', 'cooked_mutton', 'raw_chicken', 'cooked_chicken', 'raw_rabbit', 'cooked_rabbit', 'rotten_flesh'],
    color: '#D7D3D3',
    icon: 'Wo',
  }),

  iron_golem: mobDef({
    type: 'iron_golem',
    name: 'Iron Golem',
    nameJa: 'アイアンゴーレム',
    category: 'neutral',
    stats: stats({
      maxHealth: 100,
      attackDamage: 14, // 7-21 depending on target health
      movementSpeed: 0.25,
      knockbackResistance: 1.0,
      followRange: 20,
      spawnWeight: 0, // Spawns in villages or player-built
      experienceDrop: 0,
    }),
    drops: [
      { item: 'iron_ingot', countMin: 3, countMax: 5, chance: 1.0, lootingBonus: 0.0 },
      { item: 'poppy', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.0 },
    ],
    spawnBiomes: [],
    color: '#DBCABA',
    icon: 'IG',
  }),

  bee: mobDef({
    type: 'bee',
    name: 'Bee',
    nameJa: 'ミツバチ',
    category: 'neutral',
    stats: stats({
      maxHealth: 10,
      attackDamage: 2, // + poison 10s; bee dies after stinging
      movementSpeed: 0.6,
      followRange: 16,
      spawnWeight: 5,
      experienceDrop: 1,
    }),
    drops: [], // No drops
    spawnBiomes: ['plains', 'sunflower_plains', 'flower_forest', 'forest', 'birch_forest'],
    breedable: true,
    breedingItems: ['poppy', 'dandelion', 'blue_orchid', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'oxeye_daisy', 'sunflower', 'lilac', 'peony', 'rose_bush'],
    color: '#E5A91A',
    icon: 'Be',
  }),

  polar_bear: mobDef({
    type: 'polar_bear',
    name: 'Polar Bear',
    nameJa: 'シロクマ',
    category: 'neutral',
    stats: stats({
      maxHealth: 30,
      attackDamage: 6,
      movementSpeed: 0.25,
      followRange: 16,
      spawnWeight: 1,
      experienceDrop: 1,
    }),
    drops: [
      { item: 'raw_cod', countMin: 0, countMax: 2, chance: 0.75, lootingBonus: 0.01 },
    ],
    spawnBiomes: SNOWY_BIOMES,
    canSwim: true,
    color: '#F0EFE8',
    icon: 'PB',
  }),

  // =========================================================================
  // PASSIVE MOBS
  // =========================================================================

  cow: mobDef({
    type: 'cow',
    name: 'Cow',
    nameJa: 'ウシ',
    category: 'passive',
    stats: stats({
      maxHealth: 10,
      movementSpeed: 0.2,
      spawnWeight: 8,
      experienceDrop: 1,
    }),
    drops: [
      { item: 'raw_beef', countMin: 1, countMax: 3, chance: 1.0, lootingBonus: 0.01 },
      { item: 'leather', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
    ],
    spawnBiomes: GRASSY_BIOMES,
    breedable: true,
    breedingItems: ['wheat'],
    color: '#443626',
    icon: 'Co',
  }),

  pig: mobDef({
    type: 'pig',
    name: 'Pig',
    nameJa: 'ブタ',
    category: 'passive',
    stats: stats({
      maxHealth: 10,
      movementSpeed: 0.25,
      spawnWeight: 10,
      experienceDrop: 1,
    }),
    drops: [
      { item: 'raw_porkchop', countMin: 1, countMax: 3, chance: 1.0, lootingBonus: 0.01 },
    ],
    spawnBiomes: GRASSY_BIOMES,
    breedable: true,
    breedingItems: ['carrot', 'potato', 'beetroot'],
    color: '#F0A5A2',
    icon: 'Pi',
  }),

  sheep: mobDef({
    type: 'sheep',
    name: 'Sheep',
    nameJa: 'ヒツジ',
    category: 'passive',
    stats: stats({
      maxHealth: 8,
      movementSpeed: 0.23,
      spawnWeight: 12,
      experienceDrop: 1,
    }),
    drops: [
      { item: 'raw_mutton', countMin: 1, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
      { item: 'white_wool', countMin: 1, countMax: 1, chance: 1.0, lootingBonus: 0.0 },
    ],
    spawnBiomes: GRASSY_BIOMES,
    breedable: true,
    breedingItems: ['wheat'],
    color: '#E7E7E7',
    icon: 'Sh',
  }),

  chicken: mobDef({
    type: 'chicken',
    name: 'Chicken',
    nameJa: 'ニワトリ',
    category: 'passive',
    stats: stats({
      maxHealth: 4,
      movementSpeed: 0.25,
      spawnWeight: 10,
      experienceDrop: 1,
    }),
    drops: [
      { item: 'raw_chicken', countMin: 1, countMax: 1, chance: 1.0, lootingBonus: 0.0 },
      { item: 'feather', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
    ],
    spawnBiomes: GRASSY_BIOMES,
    breedable: true,
    breedingItems: ['wheat_seeds', 'melon_seeds', 'pumpkin_seeds', 'beetroot_seeds'],
    color: '#A1A1A1',
    icon: 'Ch',
  }),

  horse: mobDef({
    type: 'horse',
    name: 'Horse',
    nameJa: 'ウマ',
    category: 'passive',
    stats: stats({
      maxHealth: 22, // random 15-30
      movementSpeed: 0.225, // random 0.1125-0.3375
      spawnWeight: 5,
      experienceDrop: 1,
    }),
    drops: [
      { item: 'leather', countMin: 0, countMax: 2, chance: 1.0, lootingBonus: 0.01 },
    ],
    spawnBiomes: ['plains', 'sunflower_plains', 'savanna', 'savanna_plateau'],
    tameable: true,
    breedable: true,
    breedingItems: ['golden_carrot', 'golden_apple'],
    color: '#C09E7D',
    icon: 'Ho',
  }),

  rabbit: mobDef({
    type: 'rabbit',
    name: 'Rabbit',
    nameJa: 'ウサギ',
    category: 'passive',
    stats: stats({
      maxHealth: 3,
      movementSpeed: 0.3,
      spawnWeight: 4,
      experienceDrop: 1,
    }),
    drops: [
      { item: 'raw_rabbit', countMin: 0, countMax: 1, chance: 1.0, lootingBonus: 0.01 },
      { item: 'rabbit_hide', countMin: 0, countMax: 1, chance: 1.0, lootingBonus: 0.01 },
      { item: 'rabbit_foot', countMin: 1, countMax: 1, chance: 0.1, lootingBonus: 0.03 },
    ],
    spawnBiomes: ['desert', 'snowy_plains', 'snowy_taiga', 'flower_forest', 'taiga', 'giant_tree_taiga'],
    color: '#995F40',
    icon: 'Ra',
  }),

  squid: mobDef({
    type: 'squid',
    name: 'Squid',
    nameJa: 'イカ',
    category: 'passive',
    stats: stats({
      maxHealth: 10,
      movementSpeed: 0.2,
      spawnWeight: 10,
      experienceDrop: 1,
    }),
    drops: [
      { item: 'ink_sac', countMin: 1, countMax: 3, chance: 1.0, lootingBonus: 0.01 },
    ],
    spawnBiomes: OCEAN_BIOMES,
    canSwim: true,
    color: '#233466',
    icon: 'Sq',
  }),

  bat: mobDef({
    type: 'bat',
    name: 'Bat',
    nameJa: 'コウモリ',
    category: 'passive',
    stats: stats({
      maxHealth: 6,
      movementSpeed: 0.5,
      spawnWeight: 10,
      experienceDrop: 0,
    }),
    drops: [], // No drops
    spawnBiomes: OVERWORLD_SURFACE,
    color: '#4C3E2C',
    icon: 'Ba',
  }),

  villager: mobDef({
    type: 'villager',
    name: 'Villager',
    nameJa: '村人',
    category: 'passive',
    stats: stats({
      maxHealth: 20,
      movementSpeed: 0.5,
      spawnWeight: 0, // Only spawns in villages
      experienceDrop: 0,
    }),
    drops: [], // No drops
    spawnBiomes: [],
    color: '#5F3E1B',
    icon: 'Vi',
  }),

  // =========================================================================
  // BOSS MOBS
  // =========================================================================

  ender_dragon: mobDef({
    type: 'ender_dragon',
    name: 'Ender Dragon',
    nameJa: 'エンダードラゴン',
    category: 'boss',
    stats: stats({
      maxHealth: 200,
      attackDamage: 6, // melee=6, charge=10
      movementSpeed: 0.7,
      knockbackResistance: 1.0,
      followRange: 128,
      spawnWeight: 0,
      experienceDrop: 12000,
    }),
    drops: [
      // Dragon egg is placed as a block, not a drop
    ],
    spawnBiomes: ['the_end'],
    color: '#1A1A2A',
    icon: 'ED',
  }),

  wither: mobDef({
    type: 'wither',
    name: 'Wither',
    nameJa: 'ウィザー',
    category: 'boss',
    stats: stats({
      maxHealth: 300,
      attackDamage: 8, // skull damage 5-12
      movementSpeed: 0.6,
      knockbackResistance: 1.0,
      followRange: 70,
      armor: 4,
      spawnWeight: 0, // Player-summoned only (3 wither skeleton skulls + 4 soul sand)
      experienceDrop: 50,
    }),
    drops: [
      { item: 'nether_star', countMin: 1, countMax: 1, chance: 1.0, lootingBonus: 0.0 },
    ],
    spawnBiomes: [],
    color: '#141414',
    icon: 'Wi',
  }),
};

// =============================================================================
// DIFFICULTY DAMAGE SCALING
// =============================================================================

/**
 * Difficulty multiplier table for mob attack damage.
 * Index: 0 = peaceful, 1 = easy, 2 = normal, 3 = hard.
 */
export const DIFFICULTY_DAMAGE_MULTIPLIER: Record<string, number[]> = {
  zombie:    [0, 2.5, 3, 4.5],
  husk:      [0, 2.5, 3, 4.5],
  skeleton:  [0, 1, 3, 4],
  stray:     [0, 1, 3, 4],
  spider:    [0, 2, 2, 3],
  cave_spider: [0, 2, 2, 3],
  creeper:   [0, 22.5, 43, 64.5], // explosion damage, not melee
  enderman:  [0, 4.5, 7, 10.5],
  slime:     [0, 3, 4, 6],
  phantom:   [0, 2, 3, 4],
  drowned:   [0, 2.5, 3, 4.5],
  witch:     [0, 0, 0, 0], // damage via potions
  guardian:  [0, 4.5, 6, 9],
  elder_guardian: [0, 5, 8, 12],
  polar_bear: [0, 4, 6, 9],
  wolf:      [0, 3, 4, 6],
  iron_golem: [0, 7, 14, 21],
  bee:       [0, 2, 2, 3],
  ender_dragon: [0, 6, 10, 15],
  wither:    [0, 5, 8, 12],
};

// =============================================================================
// SLIME SIZE VARIANTS
// =============================================================================

/** Stats overrides for slime size variants. */
export const SLIME_SIZE_STATS = {
  big:    { maxHealth: 16, attackDamage: 4, movementSpeed: 0.4, experienceDrop: 4, splitCount: { min: 2, max: 4 } },
  medium: { maxHealth: 4,  attackDamage: 3, movementSpeed: 0.4, experienceDrop: 2, splitCount: { min: 2, max: 4 } },
  small:  { maxHealth: 1,  attackDamage: 0, movementSpeed: 0.6, experienceDrop: 1, splitCount: { min: 0, max: 0 } },
} as const;

export type SlimeSize = keyof typeof SLIME_SIZE_STATS;

// =============================================================================
// CREEPER EXPLOSION CONSTANTS
// =============================================================================

export const CREEPER_CONFIG = {
  FUSE_TICKS: 30,           // 1.5 seconds
  EXPLOSION_RADIUS: 3,
  NORMAL_POWER: 49,         // base explosion power
  CHARGED_POWER: 97,        // hit by lightning
  FLEE_FROM_CATS_RANGE: 6,  // blocks
  IGNITE_RANGE: 3,          // blocks from player
} as const;

// =============================================================================
// ENDERMAN BEHAVIOR CONSTANTS
// =============================================================================

export const ENDERMAN_CONFIG = {
  TELEPORT_COOLDOWN: 120,   // ticks between random teleports
  TELEPORT_RANGE: 32,       // max teleport distance
  STARE_PROVOKE_RANGE: 64,  // blocks at which staring provokes
  WATER_DAMAGE: 1,          // damage per tick in water
  CARRYABLE_BLOCKS: [
    'grass', 'dirt', 'sand', 'gravel', 'clay', 'pumpkin_block',
    'melon_block', 'mycelium', 'podzol', 'dandelion', 'poppy',
    'red_mushroom', 'brown_mushroom', 'cactus', 'tnt',
  ],
} as const;

// =============================================================================
// SKELETON / STRAY RANGED CONSTANTS
// =============================================================================

export const SKELETON_CONFIG = {
  PREFERRED_DISTANCE: 8,     // tries to stay 8 blocks from target
  ARROW_SPEED: 1.6,          // base arrow velocity
  ARROW_INACCURACY: 10,      // spread in degrees (decreases with difficulty)
  FIRE_RATE_TICKS: 20,       // ticks between shots (1 per second)
  STRAFE_SPEED: 0.5,         // sideways movement speed while shooting
} as const;

// =============================================================================
// SPIDER BEHAVIOR CONSTANTS
// =============================================================================

export const SPIDER_CONFIG = {
  CLIMB_SPEED: 0.15,        // blocks per tick when climbing walls
  NEUTRAL_LIGHT_LEVEL: 12,  // light level above which spiders become neutral
  POUNCE_RANGE: 4,          // blocks — triggers a leap attack
  POUNCE_VELOCITY: 0.4,
} as const;

// =============================================================================
// PHANTOM BEHAVIOR CONSTANTS
// =============================================================================

export const PHANTOM_CONFIG = {
  INSOMNIA_THRESHOLD: 72000, // ticks (3 in-game days) without sleeping
  CIRCLE_RADIUS: 16,         // blocks above target
  CIRCLE_HEIGHT: 20,         // blocks above ground
  SWOOP_INTERVAL: 60,        // ticks between swoop attacks
  SWOOP_SPEED: 1.0,          // blocks per tick during swoop
} as const;

// =============================================================================
// UNDEAD CLASSIFICATION
// =============================================================================

/** Mob types classified as undead (affected by Smite, healed by Instant Damage). */
export const UNDEAD_MOBS: Set<MobType> = new Set([
  'zombie', 'husk', 'drowned', 'zombie_villager',
  'skeleton', 'stray', 'wither_skeleton',
  'phantom', 'wither', 'skeleton_horse',
]);

/** Mob types classified as arthropods (affected by Bane of Arthropods). */
export const ARTHROPOD_MOBS: Set<MobType> = new Set([
  'spider', 'cave_spider', 'bee', 'silverfish', 'endermite',
]);

/** Mob types classified as aquatic. */
export const AQUATIC_MOBS: Set<MobType> = new Set([
  'squid', 'cod', 'salmon', 'pufferfish', 'tropical_fish',
  'dolphin', 'guardian', 'elder_guardian', 'turtle', 'drowned',
]);

// =============================================================================
// REGISTRY ACCESS FUNCTIONS
// =============================================================================

/**
 * Get the mob definition for a given mob type.
 * Returns undefined if the type is not registered.
 */
export function getMobDef(type: MobType): MobDefinition | undefined {
  return MOB_REGISTRY[type as string];
}

/**
 * Get all mob definitions matching a given entity category.
 */
export function getMobsByCategory(category: EntityCategory): MobDefinition[] {
  return Object.values(MOB_REGISTRY).filter(m => m.category === category);
}

/**
 * Get mobs that can naturally spawn in a given biome with the given conditions.
 *
 * @param biome - The biome type to check
 * @param dimension - Current dimension
 * @param lightLevel - Light level at the spawn position (0-15)
 * @returns Array of mob definitions that can spawn under these conditions
 */
export function getSpawnableMobs(
  biome: BiomeType,
  dimension: string,
  lightLevel: number,
): MobDefinition[] {
  return Object.values(MOB_REGISTRY).filter(mob => {
    // Must be spawnable (spawnWeight > 0)
    if (mob.stats.spawnWeight <= 0) return false;

    // Must be able to spawn in this biome
    if (mob.spawnBiomes.length > 0 && !mob.spawnBiomes.includes(biome)) return false;

    // Hostile mobs need low light
    if (mob.category === 'hostile' && lightLevel > 7) return false;

    // Passive mobs need higher light
    if (mob.category === 'passive' && lightLevel < 9) return false;

    // Dimension-specific filtering
    if (dimension === 'the_end') {
      // Only endermen and ender dragon spawn in the End
      if (mob.type !== 'enderman' && mob.type !== 'ender_dragon') return false;
    }

    if (dimension === 'nether') {
      // Filter to nether-appropriate mobs
      const netherMobs: MobType[] = [
        'zombified_piglin', 'piglin', 'hoglin', 'ghast', 'blaze',
        'wither_skeleton', 'magma_cube', 'strider', 'enderman', 'piglin_brute',
      ];
      if (!netherMobs.includes(mob.type)) return false;
    }

    return true;
  });
}

/**
 * Get difficulty-scaled attack damage for a mob.
 */
export function getMobDamage(type: MobType, difficulty: number): number {
  const multipliers = DIFFICULTY_DAMAGE_MULTIPLIER[type as string];
  if (multipliers && difficulty >= 0 && difficulty < multipliers.length) {
    return multipliers[difficulty];
  }
  const def = getMobDef(type);
  return def?.stats.attackDamage ?? 0;
}

/**
 * Check whether a mob type is classified as undead.
 */
export function isUndeadMob(type: MobType): boolean {
  return UNDEAD_MOBS.has(type);
}

/**
 * Check whether a mob type is classified as an arthropod.
 */
export function isArthropodMob(type: MobType): boolean {
  return ARTHROPOD_MOBS.has(type);
}

/**
 * Check whether a mob type is classified as aquatic.
 */
export function isAquaticMob(type: MobType): boolean {
  return AQUATIC_MOBS.has(type);
}
