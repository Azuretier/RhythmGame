// =============================================================================
// Minecraft: Nintendo Switch Edition — Item, Entity, Biome & Structure Types
// =============================================================================
// Item system types, entity/mob types, biome/world generation types,
// and structure types.
// =============================================================================

import type { BlockId, MaterialTier, ToolCategory } from './blocks';
import type { StatusEffectInstance } from './world-player';

// =============================================================================
// 4. ITEM SYSTEM
// =============================================================================

// ---------------------------------------------------------------------------
// 4a. Item Categories
// ---------------------------------------------------------------------------

export type ItemCategory =
  | 'block'           // Placeable block items
  | 'tool'            // Pickaxe, axe, shovel, hoe
  | 'weapon'          // Sword, bow, crossbow, trident
  | 'armor'           // Helmet, chestplate, leggings, boots
  | 'food'            // Edible items
  | 'material'        // Crafting materials (ingots, sticks, string, etc.)
  | 'potion'          // Potions and splash/lingering variants
  | 'redstone'        // Redstone components as items
  | 'decoration'      // Dyes, paintings, banners
  | 'transport'       // Boats, minecarts
  | 'combat'          // Arrows, shields
  | 'misc';           // Everything else (maps, clocks, compass, etc.)

export type ArmorSlot = 'helmet' | 'chestplate' | 'leggings' | 'boots';

export type EquipSlot = 'mainhand' | 'offhand' | ArmorSlot;

// ---------------------------------------------------------------------------
// 4b. Tool / Weapon Definitions
// ---------------------------------------------------------------------------

export interface ToolStats {
  /** Material tier (wood, stone, iron, diamond, netherite). */
  tier: MaterialTier;
  /** Damage added on top of base player damage. */
  attackDamage: number;
  /** Attacks per second. */
  attackSpeed: number;
  /** Total durability before breaking. */
  durability: number;
  /** Mining speed multiplier. */
  miningSpeed: number;
  /** Tool category for block harvesting. */
  toolType: ToolCategory;
  /** Enchantability (higher = better enchantments). */
  enchantability: number;
}

export interface ArmorStats {
  slot: ArmorSlot;
  tier: MaterialTier;
  defense: number;
  toughness: number;
  durability: number;
  knockbackResistance: number;
  enchantability: number;
}

// ---------------------------------------------------------------------------
// 4c. Food Properties
// ---------------------------------------------------------------------------

export interface FoodProperties {
  /** Hunger points restored (each shank = 2 points). */
  hunger: number;
  /** Saturation modifier (controls how fast hunger depletes after eating). */
  saturation: number;
  /** Time in ticks to consume. */
  eatTime: number;
  /** Whether the item can be eaten when hunger is full. */
  alwaysEdible: boolean;
  /** Status effects applied on consumption. */
  effects: StatusEffectInstance[];
}

// ---------------------------------------------------------------------------
// 4d. Item Definition
// ---------------------------------------------------------------------------

export interface ItemDefinition {
  /** Unique string ID (e.g. 'diamond_pickaxe'). */
  id: string;
  /** Display name in English. */
  name: string;
  /** Display name in Japanese. */
  nameJa: string;
  /** Category for inventory/creative menu sorting. */
  category: ItemCategory;
  /** Maximum stack size (1, 16, or 64). */
  maxStack: 1 | 16 | 64;
  /** If this item places a block, which block ID. */
  placesBlock?: BlockId;
  /** Tool stats (if this is a tool). */
  tool?: ToolStats;
  /** Armor stats (if this is armor). */
  armor?: ArmorStats;
  /** Food properties (if edible). */
  food?: FoodProperties;
  /** Base durability (for tools, armor, shields, etc.). 0 = no durability. */
  durability: number;
  /** Rarity tier for display color. */
  rarity: ItemRarity;
  /** Whether this item is fireproof (netherite items). */
  fireproof: boolean;
  /** Hex color used for inventory icon tinting. */
  color: string;
  /** Emoji or icon character for text-mode rendering. */
  icon: string;
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export const ITEM_RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#FFFFFF',
  uncommon: '#FFFF55',
  rare: '#55FFFF',
  epic: '#FF55FF',
};

// =============================================================================
// 5. ENTITY & MOB SYSTEM
// =============================================================================

// ---------------------------------------------------------------------------
// 5a. Entity Categories
// ---------------------------------------------------------------------------

export type EntityCategory = 'passive' | 'neutral' | 'hostile' | 'boss' | 'utility' | 'projectile' | 'vehicle' | 'item';

/** Every mob/entity type in Switch Edition. */
export type MobType =
  // Passive
  | 'bat' | 'cat' | 'chicken' | 'cod' | 'cow' | 'donkey' | 'fox'
  | 'horse' | 'mooshroom' | 'mule' | 'ocelot' | 'parrot' | 'pig'
  | 'pufferfish' | 'rabbit' | 'salmon' | 'sheep' | 'skeleton_horse'
  | 'squid' | 'strider' | 'tropical_fish' | 'turtle' | 'villager'
  | 'wandering_trader'
  // Neutral
  | 'bee' | 'dolphin' | 'enderman' | 'iron_golem' | 'llama'
  | 'panda' | 'piglin' | 'polar_bear' | 'snow_golem' | 'spider'
  | 'wolf' | 'zombified_piglin'
  // Hostile
  | 'blaze' | 'cave_spider' | 'creeper' | 'drowned' | 'elder_guardian'
  | 'endermite' | 'evoker' | 'ghast' | 'guardian' | 'hoglin'
  | 'husk' | 'magma_cube' | 'phantom' | 'piglin_brute' | 'pillager'
  | 'ravager' | 'shulker' | 'silverfish' | 'skeleton' | 'slime'
  | 'stray' | 'vex' | 'vindicator' | 'witch' | 'wither_skeleton'
  | 'zoglin' | 'zombie' | 'zombie_villager'
  // Boss
  | 'ender_dragon' | 'wither';

export interface MobStats {
  maxHealth: number;
  attackDamage: number;
  movementSpeed: number;     // blocks per second
  knockbackResistance: number; // 0-1
  followRange: number;       // blocks
  armor: number;
  armorToughness: number;
  spawnWeight: number;        // relative spawn probability
  experienceDrop: number;
}

export interface MobDropEntry {
  item: string;
  countMin: number;
  countMax: number;
  chance: number;
  lootingBonus: number;      // extra chance per Looting level
}

export interface MobDefinition {
  type: MobType;
  name: string;
  nameJa: string;
  category: EntityCategory;
  stats: MobStats;
  drops: MobDropEntry[];
  /** Biomes where this mob naturally spawns. */
  spawnBiomes: BiomeType[];
  /** Whether this mob is affected by daylight. */
  burnsInDaylight: boolean;
  /** Whether this mob can swim. */
  canSwim: boolean;
  /** Whether the mob is tameable. */
  tameable: boolean;
  /** Whether the mob is breedable. */
  breedable: boolean;
  /** Items used to breed (if breedable). */
  breedingItems: string[];
  /** Hex color for map/minimap dot. */
  color: string;
  /** Text-mode icon. */
  icon: string;
}

// =============================================================================
// 6. BIOME & WORLD GENERATION
// =============================================================================

export type BiomeType =
  // Overworld
  | 'plains' | 'sunflower_plains'
  | 'forest' | 'flower_forest' | 'birch_forest' | 'dark_forest'
  | 'taiga' | 'snowy_taiga' | 'giant_tree_taiga'
  | 'jungle' | 'bamboo_jungle'
  | 'desert'
  | 'savanna' | 'savanna_plateau'
  | 'mountains' | 'snowy_mountains' | 'gravelly_mountains'
  | 'swamp'
  | 'beach' | 'snowy_beach' | 'stone_shore'
  | 'river' | 'frozen_river'
  | 'ocean' | 'deep_ocean' | 'warm_ocean' | 'lukewarm_ocean'
  | 'cold_ocean' | 'frozen_ocean' | 'deep_frozen_ocean'
  | 'mushroom_fields'
  | 'badlands' | 'eroded_badlands' | 'wooded_badlands'
  | 'snowy_plains' | 'ice_spikes'
  // Nether
  | 'nether_wastes' | 'crimson_forest' | 'warped_forest'
  | 'soul_sand_valley' | 'basalt_deltas'
  // End
  | 'the_end' | 'end_highlands' | 'end_midlands' | 'end_barrens';

export type Dimension = 'overworld' | 'nether' | 'the_end';

export interface BiomeDefinition {
  type: BiomeType;
  name: string;
  nameJa: string;
  dimension: Dimension;
  /** Base terrain height (0-255). */
  baseHeight: number;
  /** Height variation scale. */
  heightVariation: number;
  /** Temperature (affects grass/foliage color, snow generation). */
  temperature: number;
  /** Rainfall (affects grass/foliage color, water features). */
  rainfall: number;
  /** Grass tint color. */
  grassColor: string;
  /** Foliage tint color. */
  foliageColor: string;
  /** Water tint color. */
  waterColor: string;
  /** Sky color. */
  skyColor: string;
  /** Fog color. */
  fogColor: string;
  /** Whether it rains (false = snow or nothing). */
  canRain: boolean;
  /** Whether it snows. */
  canSnow: boolean;
  /** Surface block ID. */
  topBlock: BlockId;
  /** Sub-surface block ID (1-3 blocks deep). */
  fillerBlock: BlockId;
  /** Tree types and densities. */
  trees: BiomeTreeConfig[];
  /** Mob spawn entries. */
  spawns: BiomeSpawnEntry[];
  /** Structures that can generate. */
  structures: StructureType[];
  /** Map display color. */
  mapColor: string;
}

export interface BiomeTreeConfig {
  /** Tree type (oak, birch, spruce, jungle, acacia, dark_oak). */
  type: TreeType;
  /** Spawns per chunk (average). */
  density: number;
}

export type TreeType = 'oak' | 'birch' | 'spruce' | 'jungle' | 'acacia' | 'dark_oak' | 'huge_mushroom' | 'chorus';

export interface BiomeSpawnEntry {
  mob: MobType;
  weight: number;
  minGroup: number;
  maxGroup: number;
}

// =============================================================================
// 7. STRUCTURES
// =============================================================================

export type StructureType =
  | 'village' | 'pillager_outpost' | 'desert_temple' | 'jungle_temple'
  | 'witch_hut' | 'woodland_mansion' | 'ocean_monument' | 'shipwreck'
  | 'ocean_ruins' | 'buried_treasure' | 'mineshaft' | 'stronghold'
  | 'dungeon' | 'igloo' | 'ruined_portal' | 'nether_fortress'
  | 'bastion_remnant' | 'end_city' | 'end_ship' | 'end_fountain';

export interface StructureDefinition {
  type: StructureType;
  name: string;
  nameJa: string;
  dimension: Dimension;
  /** Biomes where this structure can generate. */
  validBiomes: BiomeType[];
  /** Minimum spacing between structures (in chunks). */
  spacing: number;
  /** Randomization offset within spacing grid. */
  separation: number;
  /** Loot tables applied to chests. */
  lootTables: string[];
  /** Whether a boss spawns within. */
  hasBoss: boolean;
}
