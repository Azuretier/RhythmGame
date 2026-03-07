// =============================================================================
// Minecraft: Nintendo Switch Edition — Configuration, Utilities & Constants
// =============================================================================
// MS_CONFIG, tier system, loot tables, achievements, game state,
// physics constants, rendering constants, HUD types, Firestore room,
// and utility types/helpers.
// =============================================================================

import { Block, type BlockId, type MaterialTier, type DyeColor } from './blocks';
import {
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  type GameMode,
  type StatusEffectInstance,
  type InventorySlot,
  type PlayerPosition,
  type BlockCoord,
  type EnchantmentInstance,
} from './world-player';
import type {
  Difficulty,
  WorldType,
  BlockFace,
} from './multiplayer-protocol';

// =============================================================================
// 22. GAME CONFIGURATION
// =============================================================================

export const MS_CONFIG = {
  // World
  WORLD_HEIGHT: 256,
  CHUNK_SIZE: 16,
  SEA_LEVEL: 63,
  RENDER_DISTANCE: 8,           // chunks
  SIMULATION_DISTANCE: 4,      // chunks
  TICK_RATE: 20,                // ticks per second (standard Minecraft)

  // Players
  MAX_PLAYERS: 8,               // Switch Edition max
  MIN_PLAYERS: 1,
  PLAYER_REACH: 4.5,            // block interaction range (blocks)
  PLAYER_ATTACK_REACH: 3.0,
  PLAYER_EYE_HEIGHT: 1.62,
  PLAYER_HEIGHT: 1.8,
  PLAYER_WIDTH: 0.6,
  PLAYER_BASE_SPEED: 4.317,     // blocks per second (walking)
  PLAYER_SPRINT_SPEED: 5.612,   // blocks per second (sprinting)
  PLAYER_SNEAK_SPEED: 1.295,    // blocks per second (sneaking)
  PLAYER_SWIM_SPEED: 2.2,
  PLAYER_FLY_SPEED: 10.89,     // creative flight
  PLAYER_JUMP_VELOCITY: 0.42,  // blocks per tick
  GRAVITY: 0.08,               // blocks per tick^2

  // Health & Hunger
  MAX_HEALTH: 20,
  MAX_HUNGER: 20,
  MAX_SATURATION: 20,
  NATURAL_REGEN_THRESHOLD: 18,  // hunger level for natural regen
  SPRINT_THRESHOLD: 6,          // minimum hunger to sprint
  STARVATION_DAMAGE_INTERVAL: 80, // ticks between starvation damage
  FOOD_EXHAUSTION_WALK: 0.01,
  FOOD_EXHAUSTION_SPRINT: 0.1,
  FOOD_EXHAUSTION_JUMP: 0.05,
  FOOD_EXHAUSTION_ATTACK: 0.1,
  FOOD_EXHAUSTION_MINE: 0.005,
  FOOD_EXHAUSTION_REGEN: 6.0,

  // Combat
  ATTACK_COOLDOWN_TICKS: 10,    // ticks between attacks
  INVULNERABILITY_TICKS: 10,    // after taking damage
  KNOCKBACK_BASE: 0.4,
  CRITICAL_HIT_MULTIPLIER: 1.5,

  // Experience
  MAX_LEVEL: 100,
  XP_ORB_PICKUP_RANGE: 7.5,    // blocks

  // Drowning
  MAX_AIR_SUPPLY: 300,          // ticks (15 seconds)
  DROWNING_DAMAGE_INTERVAL: 20, // ticks

  // Fire
  FIRE_DAMAGE_INTERVAL: 20,    // ticks
  FIRE_DURATION_DEFAULT: 160,   // ticks (8 seconds)
  LAVA_FIRE_DURATION: 300,      // ticks (15 seconds)

  // Mining
  INSTANT_BREAK_THRESHOLD: 0.0, // hardness at which a block breaks instantly

  // Network
  POSITION_BROADCAST_RATE: 50,  // ms between position broadcasts (20Hz)
  STATE_UPDATE_INTERVAL: 1,     // ticks between state snapshots
  MAX_CHAT_LENGTH: 256,
  ROOM_NAME_MAX: 32,
  PLAYER_NAME_MAX: 16,

  // Day/Night cycle
  DAY_LENGTH: 24000,            // ticks per full day
  DAWN_START: 0,
  DAY_START: 1000,
  DUSK_START: 12000,
  NIGHT_START: 13000,
  MIDNIGHT: 18000,

  // Mob spawning
  MOB_SPAWN_RANGE: 24,         // blocks from player min
  MOB_DESPAWN_RANGE: 128,      // blocks from player
  HOSTILE_CAP: 70,             // per world
  PASSIVE_CAP: 10,             // per chunk
  MOB_SPAWN_INTERVAL: 1,      // ticks (checked every tick with random chance)

  // Redstone
  REDSTONE_MAX_POWER: 15,
  REDSTONE_TICK: 2,            // game ticks per redstone tick
  PISTON_PUSH_LIMIT: 12,

  // Explosion
  TNT_FUSE_TICKS: 80,          // 4 seconds
  CREEPER_FUSE_TICKS: 30,      // 1.5 seconds
  CREEPER_EXPLOSION_RADIUS: 3,
  TNT_EXPLOSION_RADIUS: 4,

  // Colors
  PLAYER_COLORS: [
    '#FF4444', '#4488FF', '#44DD44', '#FFDD44', '#DD44DD',
    '#44DDDD', '#FF8844', '#FF88AA',
  ] as readonly string[],
} as const;

// =============================================================================
// 23. TOOL TIER SYSTEM
// =============================================================================

export const MATERIAL_TIER_LEVEL: Record<MaterialTier, number> = {
  hand: 0,
  wood: 1,
  stone: 2,
  iron: 3,
  diamond: 4,
  netherite: 5,
};

export interface MaterialTierConfig {
  tier: MaterialTier;
  level: number;
  durability: number;
  miningSpeed: number;
  attackDamageBonus: number;
  enchantability: number;
  repairMaterial: string;
  color: string;
}

export const MATERIAL_TIER_CONFIG: Record<MaterialTier, MaterialTierConfig> = {
  hand:      { tier: 'hand',      level: 0, durability: 0,    miningSpeed: 1.0,  attackDamageBonus: 0, enchantability: 0,  repairMaterial: '',              color: '#A0A0A0' },
  wood:      { tier: 'wood',      level: 1, durability: 59,   miningSpeed: 2.0,  attackDamageBonus: 0, enchantability: 15, repairMaterial: 'oak_planks',    color: '#B8935A' },
  stone:     { tier: 'stone',     level: 2, durability: 131,  miningSpeed: 4.0,  attackDamageBonus: 1, enchantability: 5,  repairMaterial: 'cobblestone',   color: '#808080' },
  iron:      { tier: 'iron',      level: 3, durability: 250,  miningSpeed: 6.0,  attackDamageBonus: 2, enchantability: 14, repairMaterial: 'iron_ingot',    color: '#D4D4D4' },
  diamond:   { tier: 'diamond',   level: 4, durability: 1561, miningSpeed: 8.0,  attackDamageBonus: 3, enchantability: 10, repairMaterial: 'diamond',       color: '#4AEDD9' },
  netherite: { tier: 'netherite', level: 5, durability: 2031, miningSpeed: 9.0,  attackDamageBonus: 4, enchantability: 15, repairMaterial: 'netherite_ingot', color: '#4D3D37' },
};

export const ARMOR_TIER_CONFIG: Record<MaterialTier, { helmet: number; chestplate: number; leggings: number; boots: number; toughness: number; knockbackResistance: number }> = {
  hand:      { helmet: 0, chestplate: 0, leggings: 0, boots: 0, toughness: 0, knockbackResistance: 0 },
  wood:      { helmet: 0, chestplate: 0, leggings: 0, boots: 0, toughness: 0, knockbackResistance: 0 },
  stone:     { helmet: 0, chestplate: 0, leggings: 0, boots: 0, toughness: 0, knockbackResistance: 0 },
  iron:      { helmet: 2, chestplate: 6, leggings: 5, boots: 2, toughness: 0, knockbackResistance: 0 },
  diamond:   { helmet: 3, chestplate: 8, leggings: 6, boots: 3, toughness: 2, knockbackResistance: 0 },
  netherite: { helmet: 3, chestplate: 8, leggings: 6, boots: 3, toughness: 3, knockbackResistance: 0.1 },
};

// =============================================================================
// 24. LOOT TABLE
// =============================================================================

export interface LootEntry {
  item: string;
  countMin: number;
  countMax: number;
  weight: number;
  enchantments?: EnchantmentInstance[];
}

export interface LootPool {
  rolls: number;
  rollsMax: number;
  entries: LootEntry[];
}

export interface LootTable {
  id: string;
  pools: LootPool[];
}

// =============================================================================
// 25. ACHIEVEMENTS / ADVANCEMENTS
// =============================================================================

export type AdvancementCategory = 'story' | 'nether' | 'end' | 'adventure' | 'husbandry';

export interface AdvancementCriteria {
  type: string;
  /** Conditions vary by criteria type. */
  conditions: Record<string, unknown>;
}

export interface AdvancementDefinition {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  category: AdvancementCategory;
  /** Parent advancement ID (null for root). */
  parent: string | null;
  /** Icon item ID. */
  icon: string;
  /** Frame type determines border style. */
  frame: 'task' | 'goal' | 'challenge';
  /** Criteria to complete this advancement. */
  criteria: Record<string, AdvancementCriteria>;
  /** Whether all criteria must be met (AND) or any (OR). */
  requireAll: boolean;
  /** Experience reward. */
  experienceReward: number;
  /** Item rewards. */
  itemRewards: { item: string; count: number }[];
}

// =============================================================================
// 27. PHYSICS CONSTANTS
// =============================================================================

export const PHYSICS = {
  GRAVITY: 0.08,
  DRAG: 0.98,                  // air resistance per tick
  WATER_DRAG: 0.8,
  TERMINAL_VELOCITY: 3.92,
  JUMP_FORCE: 0.42,
  SPRINT_JUMP_BOOST: 0.2,      // forward velocity bonus
  STEP_HEIGHT: 0.6,            // max block height auto-climb
  SWIM_FORCE: 0.04,
  KNOCKBACK_HORIZONTAL: 0.4,
  KNOCKBACK_VERTICAL: 0.4,
  FALL_DAMAGE_THRESHOLD: 3,    // blocks (fall > 3 blocks = damage)
  FALL_DAMAGE_PER_BLOCK: 1,    // half-heart per block after threshold
  SLIME_BOUNCE_FACTOR: 1.0,    // velocity retention on slime block
  ICE_FRICTION: 0.98,
  NORMAL_FRICTION: 0.6,
  SOUL_SAND_SPEED: 0.4,
  HONEY_SPEED: 0.4,
  LADDER_SPEED: 0.15,
  LADDER_MAX_FALL: 0.15,
  WATER_BUOYANCY: 0.02,
  LAVA_BUOYANCY: 0.02,
  LAVA_SPEED_MULTIPLIER: 0.5,
} as const;

// =============================================================================
// 28. RENDERING CONSTANTS
// =============================================================================

export const RENDER_CONFIG = {
  /** Texture atlas tile size in pixels. */
  TILE_SIZE: 16,
  /** Atlas columns. */
  ATLAS_COLS: 32,
  /** Atlas rows. */
  ATLAS_ROWS: 32,
  /** Total atlas size in pixels. */
  ATLAS_SIZE: 512,
  /** FOV in degrees. */
  DEFAULT_FOV: 70,
  /** Near clipping plane. */
  NEAR_CLIP: 0.1,
  /** Far clipping plane. */
  FAR_CLIP: 1000,
  /** Ambient occlusion strength. */
  AO_STRENGTH: 0.25,
  /** Skybox gradient colors. */
  SKY_DAY_TOP: '#78A7FF',
  SKY_DAY_BOTTOM: '#C8E0FF',
  SKY_NIGHT_TOP: '#0C1445',
  SKY_NIGHT_BOTTOM: '#1A2355',
  SKY_SUNSET_TOP: '#2244AA',
  SKY_SUNSET_BOTTOM: '#FF6633',
  /** Block highlight color (when looking at a block). */
  BLOCK_HIGHLIGHT_COLOR: 'rgba(255, 255, 255, 0.3)',
  /** Crosshair color. */
  CROSSHAIR_COLOR: '#FFFFFF',
  /** Maximum particle count for performance. */
  MAX_PARTICLES: 2000,
} as const;

// =============================================================================
// 29. HUD & UI TYPES
// =============================================================================

export interface HUDState {
  health: number;
  maxHealth: number;
  hunger: number;
  saturation: number;
  armorPoints: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  selectedSlot: number;
  hotbar: (InventorySlot | null)[];
  offhand: InventorySlot | null;
  statusEffects: StatusEffectInstance[];
  gameMode: GameMode;
  /** Coordinates display (F3 style). */
  coordinates: PlayerPosition;
  /** Direction the player is facing. */
  facing: string;
  /** Current biome name. */
  biome: string;
  /** FPS counter. */
  fps: number;
  /** Ping in ms. */
  ping: number;
}

export type ScreenType =
  | 'none' | 'inventory' | 'crafting_table' | 'furnace'
  | 'blast_furnace' | 'smoker' | 'enchanting' | 'anvil'
  | 'brewing_stand' | 'chest' | 'double_chest' | 'ender_chest'
  | 'shulker_box' | 'hopper' | 'dispenser' | 'dropper'
  | 'villager_trade' | 'stonecutter' | 'loom' | 'cartography_table'
  | 'grindstone' | 'smithing_table' | 'beacon'
  | 'creative_inventory' | 'death_screen' | 'pause_menu' | 'settings';

// =============================================================================
// 30. FIRESTORE ROOM DOCUMENT (for server-side room persistence)
// =============================================================================

export interface MSFirestoreRoom {
  code: string;
  name: string;
  hostName: string;
  status: 'open' | 'playing' | 'closed';
  playerCount: number;
  maxPlayers: number;
  gameMode: GameMode;
  difficulty: Difficulty;
  worldType: WorldType;
  seed: number;
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// 31. UTILITY TYPES & HELPERS
// =============================================================================

/** Direction vectors for the 6 block faces. */
export const FACE_NORMALS: Record<BlockFace, BlockCoord> = {
  top:    { x: 0, y: 1, z: 0 },
  bottom: { x: 0, y: -1, z: 0 },
  north:  { x: 0, y: 0, z: -1 },
  south:  { x: 0, y: 0, z: 1 },
  east:   { x: 1, y: 0, z: 0 },
  west:   { x: -1, y: 0, z: 0 },
};

/** All six directions for neighbor iteration. */
export const ALL_FACES: BlockFace[] = ['top', 'bottom', 'north', 'south', 'east', 'west'];

/** Convert world coordinates to chunk coordinates. */
export function worldToChunk(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.floor(x / CHUNK_WIDTH),
    z: Math.floor(z / CHUNK_DEPTH),
  };
}

/** Convert world coordinates to local chunk coordinates. */
export function worldToLocal(x: number, y: number, z: number): BlockCoord {
  return {
    x: ((x % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH,
    y,
    z: ((z % CHUNK_DEPTH) + CHUNK_DEPTH) % CHUNK_DEPTH,
  };
}

/** Index into a flat chunk block array. */
export function blockIndex(x: number, y: number, z: number): number {
  return y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x;
}

/** Check if a block ID represents a transparent block. */
export function isTransparent(blockId: BlockId): boolean {
  return blockId === Block.Air
    || blockId === Block.Water
    || blockId === Block.StillWater
    || blockId === Block.Glass
    || (blockId >= Block.WhiteStainedGlass && blockId <= Block.BlackStainedGlass)
    || blockId === Block.GlassPane
    || blockId === Block.IronBars
    || blockId === Block.OakLeaves
    || blockId === Block.SpruceLeaves
    || blockId === Block.BirchLeaves
    || blockId === Block.JungleLeaves
    || blockId === Block.AcaciaLeaves
    || blockId === Block.DarkOakLeaves
    || blockId === Block.Ice
    || blockId === Block.Vine
    || blockId === Block.Cobweb
    || blockId === Block.Torch
    || blockId === Block.Ladder
    || blockId === Block.TallGrass
    || blockId === Block.Fern
    || blockId === Block.DeadBush
    || (blockId >= Block.Dandelion && blockId <= Block.RoseBush);
}

/** Check if a block ID represents a liquid. */
export function isLiquid(blockId: BlockId): boolean {
  return blockId === Block.Water
    || blockId === Block.Lava
    || blockId === Block.StillWater
    || blockId === Block.StillLava;
}

/** Check if a block ID is a solid full cube. */
export function isSolidCube(blockId: BlockId): boolean {
  if (blockId === Block.Air) return false;
  if (isLiquid(blockId)) return false;
  if (isTransparent(blockId)) return false;
  // Slabs, stairs, fences, walls are not full cubes
  if (blockId >= Block.StoneSlab && blockId <= Block.DarkPrismarineSlab) return false;
  if (blockId >= Block.StoneStairs && blockId <= Block.PrismarineBrickStairs) return false;
  if (blockId >= Block.CobblestoneWall && blockId <= Block.RedSandstoneWall) return false;
  return true;
}

/** Check if a block emits light. */
export function getLuminance(blockId: BlockId): number {
  switch (blockId) {
    case Block.Glowstone: return 15;
    case Block.SeaLantern: return 15;
    case Block.Lantern: return 15;
    case Block.SoulLantern: return 10;
    case Block.Lava: return 15;
    case Block.StillLava: return 15;
    case Block.Torch: return 14;
    case Block.RedstoneTorch: return 7;
    case Block.RedstoneTorch_Wall: return 7;
    case Block.Campfire: return 15;
    case Block.SoulCampfire: return 10;
    case Block.ShroomLight: return 15;
    case Block.EndRod: return 14;
    case Block.Beacon: return 15;
    case Block.Conduit: return 15;
    case Block.EnchantingTable: return 7;
    case Block.BrewingStand: return 1;
    case Block.SeaPickle: return 6;
    case Block.MagmaBlock: return 3;
    case Block.RedstoneOre: return 9;
    case Block.RespawnAnchor: return 15;
    default: return 0;
  }
}

/** Dye color hex values for wool, terracotta, concrete, etc. */
export const DYE_COLORS: Record<DyeColor, string> = {
  white: '#F9FFFE',
  orange: '#F9801D',
  magenta: '#C74EBD',
  light_blue: '#3AB3DA',
  yellow: '#FED83D',
  lime: '#80C71F',
  pink: '#F38BAA',
  gray: '#474F52',
  light_gray: '#9D9D97',
  cyan: '#169C9C',
  purple: '#8932B8',
  blue: '#3C44AA',
  brown: '#835432',
  green: '#5E7C16',
  red: '#B02E26',
  black: '#1D1D21',
};

/** Block name lookup for common blocks (for UI display). */
export const BLOCK_NAMES: Partial<Record<BlockId, { en: string; ja: string }>> = {
  [Block.Air]: { en: 'Air', ja: '空気' },
  [Block.Stone]: { en: 'Stone', ja: '石' },
  [Block.Granite]: { en: 'Granite', ja: '花崗岩' },
  [Block.Diorite]: { en: 'Diorite', ja: '閃緑岩' },
  [Block.Andesite]: { en: 'Andesite', ja: '安山岩' },
  [Block.Grass]: { en: 'Grass Block', ja: '草ブロック' },
  [Block.Dirt]: { en: 'Dirt', ja: '土' },
  [Block.CoarseDirt]: { en: 'Coarse Dirt', ja: '粗い土' },
  [Block.Cobblestone]: { en: 'Cobblestone', ja: '丸石' },
  [Block.Bedrock]: { en: 'Bedrock', ja: '岩盤' },
  [Block.Sand]: { en: 'Sand', ja: '砂' },
  [Block.RedSand]: { en: 'Red Sand', ja: '赤い砂' },
  [Block.Gravel]: { en: 'Gravel', ja: '砂利' },
  [Block.CoalOre]: { en: 'Coal Ore', ja: '石炭鉱石' },
  [Block.IronOre]: { en: 'Iron Ore', ja: '鉄鉱石' },
  [Block.GoldOre]: { en: 'Gold Ore', ja: '金鉱石' },
  [Block.DiamondOre]: { en: 'Diamond Ore', ja: 'ダイヤモンド鉱石' },
  [Block.EmeraldOre]: { en: 'Emerald Ore', ja: 'エメラルド鉱石' },
  [Block.LapisOre]: { en: 'Lapis Lazuli Ore', ja: 'ラピスラズリ鉱石' },
  [Block.RedstoneOre]: { en: 'Redstone Ore', ja: 'レッドストーン鉱石' },
  [Block.OakLog]: { en: 'Oak Log', ja: 'オークの原木' },
  [Block.OakPlanks]: { en: 'Oak Planks', ja: 'オークの板材' },
  [Block.SpruceLog]: { en: 'Spruce Log', ja: 'トウヒの原木' },
  [Block.SprucePlanks]: { en: 'Spruce Planks', ja: 'トウヒの板材' },
  [Block.BirchLog]: { en: 'Birch Log', ja: 'シラカバの原木' },
  [Block.BirchPlanks]: { en: 'Birch Planks', ja: 'シラカバの板材' },
  [Block.JungleLog]: { en: 'Jungle Log', ja: 'ジャングルの原木' },
  [Block.JunglePlanks]: { en: 'Jungle Planks', ja: 'ジャングルの板材' },
  [Block.AcaciaLog]: { en: 'Acacia Log', ja: 'アカシアの原木' },
  [Block.AcaciaPlanks]: { en: 'Acacia Planks', ja: 'アカシアの板材' },
  [Block.DarkOakLog]: { en: 'Dark Oak Log', ja: 'ダークオークの原木' },
  [Block.DarkOakPlanks]: { en: 'Dark Oak Planks', ja: 'ダークオークの板材' },
  [Block.OakLeaves]: { en: 'Oak Leaves', ja: 'オークの葉' },
  [Block.Water]: { en: 'Water', ja: '水' },
  [Block.Lava]: { en: 'Lava', ja: '溶岩' },
  [Block.Glass]: { en: 'Glass', ja: 'ガラス' },
  [Block.WhiteWool]: { en: 'White Wool', ja: '白色の羊毛' },
  [Block.CraftingTable]: { en: 'Crafting Table', ja: '作業台' },
  [Block.Furnace]: { en: 'Furnace', ja: 'かまど' },
  [Block.Chest]: { en: 'Chest', ja: 'チェスト' },
  [Block.Torch]: { en: 'Torch', ja: '松明' },
  [Block.Obsidian]: { en: 'Obsidian', ja: '黒曜石' },
  [Block.DiamondBlock]: { en: 'Diamond Block', ja: 'ダイヤモンドブロック' },
  [Block.IronBlock]: { en: 'Iron Block', ja: '鉄ブロック' },
  [Block.GoldBlock]: { en: 'Gold Block', ja: '金ブロック' },
  [Block.Netherrack]: { en: 'Netherrack', ja: 'ネザーラック' },
  [Block.SoulSand]: { en: 'Soul Sand', ja: 'ソウルサンド' },
  [Block.Glowstone]: { en: 'Glowstone', ja: 'グロウストーン' },
  [Block.EndStone]: { en: 'End Stone', ja: 'エンドストーン' },
  [Block.Beacon]: { en: 'Beacon', ja: 'ビーコン' },
  [Block.TNT]: { en: 'TNT', ja: 'TNT' },
  [Block.Bookshelf]: { en: 'Bookshelf', ja: '本棚' },
};

/** Map color palette for minimap rendering. */
export const BLOCK_MAP_COLORS: Partial<Record<BlockId, string>> = {
  [Block.Air]: 'transparent',
  [Block.Stone]: '#7F7F7F',
  [Block.Granite]: '#9A6C50',
  [Block.Diorite]: '#B8B8B8',
  [Block.Andesite]: '#888888',
  [Block.Grass]: '#7CBD6B',
  [Block.Dirt]: '#866043',
  [Block.CoarseDirt]: '#6D4E35',
  [Block.Cobblestone]: '#6B6B6B',
  [Block.Sand]: '#DBD3A0',
  [Block.RedSand]: '#A55226',
  [Block.Gravel]: '#838383',
  [Block.Clay]: '#A4A8B8',
  [Block.Water]: '#3F76E4',
  [Block.Lava]: '#D4610A',
  [Block.OakLog]: '#6B4D2D',
  [Block.OakPlanks]: '#BC9862',
  [Block.OakLeaves]: '#3B6B22',
  [Block.SpruceLog]: '#3B2810',
  [Block.BirchLog]: '#D5CEA5',
  [Block.Ice]: '#A0D5F6',
  [Block.PackedIce]: '#8DB4D9',
  [Block.BlueIce]: '#74ADD5',
  [Block.Snow]: '#FAFAFA',
  [Block.SnowBlock]: '#F0F0F0',
  [Block.Obsidian]: '#0F0A18',
  [Block.Netherrack]: '#6B3535',
  [Block.SoulSand]: '#51392E',
  [Block.Glowstone]: '#F9D49C',
  [Block.EndStone]: '#DBD4A2',
  [Block.Bedrock]: '#343434',
  [Block.CoalOre]: '#636363',
  [Block.IronOre]: '#887768',
  [Block.GoldOre]: '#8A7443',
  [Block.DiamondOre]: '#5DECF5',
  [Block.EmeraldOre]: '#17DD62',
  [Block.LapisOre]: '#1E3C8E',
  [Block.RedstoneOre]: '#960000',
  [Block.Cactus]: '#0D6B1A',
  [Block.Bricks]: '#966B5B',
  [Block.StoneBricks]: '#7D7D7D',
  [Block.WhiteWool]: '#DBDBDB',
  [Block.OrangeWool]: '#D87F33',
  [Block.MagentaWool]: '#B24CD8',
  [Block.LightBlueWool]: '#6699D8',
  [Block.YellowWool]: '#E5E533',
  [Block.LimeWool]: '#7FCC19',
  [Block.PinkWool]: '#F27FA5',
  [Block.GrayWool]: '#4C4C4C',
  [Block.LightGrayWool]: '#999999',
  [Block.CyanWool]: '#4C7F99',
  [Block.PurpleWool]: '#7F3FB2',
  [Block.BlueWool]: '#334CB2',
  [Block.BrownWool]: '#664C33',
  [Block.GreenWool]: '#667F33',
  [Block.RedWool]: '#993333',
  [Block.BlackWool]: '#191919',
  [Block.Terracotta]: '#9E6246',
  [Block.TNT]: '#DB4C35',
  [Block.Bookshelf]: '#6B4D2D',
  [Block.CraftingTable]: '#825B2D',
  [Block.Furnace]: '#6B6B6B',
  [Block.Chest]: '#825B2D',
};

