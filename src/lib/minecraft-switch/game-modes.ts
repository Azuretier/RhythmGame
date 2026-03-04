// =============================================================================
// Game Mode Definitions and Rules
// Minecraft: Nintendo Switch Edition
// =============================================================================

import { Block } from '@/types/minecraft-switch';
import type {
  GameMode,
  Difficulty,
  BlockId,
  PlayerInventory,
  InventorySlot,
} from '@/types/minecraft-switch';

// =============================================================================
// Game Mode Configuration
// =============================================================================

export interface GameModeConfig {
  canBreakBlocks: boolean;
  canPlaceBlocks: boolean;
  canTakeDamage: boolean;
  canFly: boolean;
  instantBreak: boolean;
  infiniteResources: boolean;
  showHunger: boolean;
  naturalRegen: boolean;
  mobsSpawn: boolean;
  keepInventoryOnDeath: boolean;
  dropItemsOnDeath: boolean;
  canInteractWithBlocks: boolean;
  pvpEnabled: boolean;
}

const SURVIVAL_CONFIG: GameModeConfig = {
  canBreakBlocks: true,
  canPlaceBlocks: true,
  canTakeDamage: true,
  canFly: false,
  instantBreak: false,
  infiniteResources: false,
  showHunger: true,
  naturalRegen: true,
  mobsSpawn: true,
  keepInventoryOnDeath: false,
  dropItemsOnDeath: true,
  canInteractWithBlocks: true,
  pvpEnabled: true,
};

const CREATIVE_CONFIG: GameModeConfig = {
  canBreakBlocks: true,
  canPlaceBlocks: true,
  canTakeDamage: false,
  canFly: true,
  instantBreak: true,
  infiniteResources: true,
  showHunger: false,
  naturalRegen: true,
  mobsSpawn: true,
  keepInventoryOnDeath: true,
  dropItemsOnDeath: false,
  canInteractWithBlocks: true,
  pvpEnabled: false,
};

const ADVENTURE_CONFIG: GameModeConfig = {
  canBreakBlocks: false,   // Only with correct tool (CanDestroy tag)
  canPlaceBlocks: false,   // Only with CanPlaceOn tag
  canTakeDamage: true,
  canFly: false,
  instantBreak: false,
  infiniteResources: false,
  showHunger: true,
  naturalRegen: true,
  mobsSpawn: true,
  keepInventoryOnDeath: false,
  dropItemsOnDeath: true,
  canInteractWithBlocks: true,
  pvpEnabled: true,
};

const SPECTATOR_CONFIG: GameModeConfig = {
  canBreakBlocks: false,
  canPlaceBlocks: false,
  canTakeDamage: false,
  canFly: true,
  instantBreak: false,
  infiniteResources: false,
  showHunger: false,
  naturalRegen: false,
  mobsSpawn: false,
  keepInventoryOnDeath: true,
  dropItemsOnDeath: false,
  canInteractWithBlocks: false,
  pvpEnabled: false,
};

const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  survival: SURVIVAL_CONFIG,
  creative: CREATIVE_CONFIG,
  adventure: ADVENTURE_CONFIG,
  spectator: SPECTATOR_CONFIG,
};

/**
 * Returns the configuration object for a given game mode.
 */
export function getGameModeConfig(mode: GameMode): GameModeConfig {
  return GAME_MODE_CONFIGS[mode];
}

// =============================================================================
// Difficulty Configuration
// =============================================================================

export interface DifficultyConfig {
  /** Whether hostile mobs spawn. */
  hostileMobsSpawn: boolean;
  /** Damage multiplier for mob attacks. */
  mobDamageMultiplier: number;
  /** Whether starvation can kill the player. */
  starvationKills: boolean;
  /** Health threshold below which starvation stops. 0 = kills */
  starvationHealthFloor: number;
  /** Whether hunger regenerates instantly. */
  instantHungerRegen: boolean;
  /** Whether zombies can break doors. */
  zombieDoorBreaking: boolean;
  /** Whether mobs can spawn with armor. */
  armorOnMobs: boolean;
  /** Extra chance for mobs to spawn with equipment. */
  mobEquipmentChance: number;
  /** Spider chance to have a potion effect. */
  spiderPotionChance: number;
  /** Whether raids can occur. */
  raidsEnabled: boolean;
  /** Name for display. */
  name: string;
  /** Japanese name. */
  nameJa: string;
  /** Description for UI. */
  description: string;
}

const PEACEFUL_CONFIG: DifficultyConfig = {
  hostileMobsSpawn: false,
  mobDamageMultiplier: 0,
  starvationKills: false,
  starvationHealthFloor: 20, // Full health maintained
  instantHungerRegen: true,
  zombieDoorBreaking: false,
  armorOnMobs: false,
  mobEquipmentChance: 0,
  spiderPotionChance: 0,
  raidsEnabled: false,
  name: 'Peaceful',
  nameJa: 'ピースフル',
  description: 'No hostile mobs spawn. Health regenerates over time.',
};

const EASY_CONFIG: DifficultyConfig = {
  hostileMobsSpawn: true,
  mobDamageMultiplier: 0.5,
  starvationKills: false,
  starvationHealthFloor: 10, // Starvation stops at 5 hearts
  instantHungerRegen: false,
  zombieDoorBreaking: false,
  armorOnMobs: false,
  mobEquipmentChance: 0,
  spiderPotionChance: 0,
  raidsEnabled: true,
  name: 'Easy',
  nameJa: 'イージー',
  description: 'Hostile mobs deal reduced damage. Starvation stops at 5 hearts.',
};

const NORMAL_CONFIG: DifficultyConfig = {
  hostileMobsSpawn: true,
  mobDamageMultiplier: 1.0,
  starvationKills: false,
  starvationHealthFloor: 1, // Starvation stops at half heart
  instantHungerRegen: false,
  zombieDoorBreaking: false,
  armorOnMobs: true,
  mobEquipmentChance: 0.05,
  spiderPotionChance: 0.1,
  raidsEnabled: true,
  name: 'Normal',
  nameJa: 'ノーマル',
  description: 'Standard difficulty. Mobs deal normal damage.',
};

const HARD_CONFIG: DifficultyConfig = {
  hostileMobsSpawn: true,
  mobDamageMultiplier: 1.5,
  starvationKills: true,
  starvationHealthFloor: 0, // Starvation can kill
  instantHungerRegen: false,
  zombieDoorBreaking: true,
  armorOnMobs: true,
  mobEquipmentChance: 0.15,
  spiderPotionChance: 0.25,
  raidsEnabled: true,
  name: 'Hard',
  nameJa: 'ハード',
  description: 'Mobs deal increased damage. Starvation kills. Zombies can break doors.',
};

const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  peaceful: PEACEFUL_CONFIG,
  easy: EASY_CONFIG,
  normal: NORMAL_CONFIG,
  hard: HARD_CONFIG,
};

/**
 * Returns the configuration object for a given difficulty level.
 */
export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}

// =============================================================================
// Game Rules
// =============================================================================

export interface GameRules {
  keepInventory: boolean;
  mobGriefing: boolean;
  doDaylightCycle: boolean;
  doWeatherCycle: boolean;
  pvp: boolean;
  showCoordinates: boolean;
  doFireTick: boolean;
  commandBlockOutput: boolean;
  naturalRegeneration: boolean;
  doTileDrops: boolean;
  doMobLoot: boolean;
  doMobSpawning: boolean;
  randomTickSpeed: number;
  spawnRadius: number;
}

/**
 * Returns the default game rules matching vanilla Minecraft behavior.
 */
export function getDefaultGameRules(): GameRules {
  return {
    keepInventory: false,
    mobGriefing: true,
    doDaylightCycle: true,
    doWeatherCycle: true,
    pvp: true,
    showCoordinates: false,
    doFireTick: true,
    commandBlockOutput: true,
    naturalRegeneration: true,
    doTileDrops: true,
    doMobLoot: true,
    doMobSpawning: true,
    randomTickSpeed: 3,
    spawnRadius: 10,
  };
}

// =============================================================================
// Adventure Mode Block Restrictions
// =============================================================================

/**
 * In adventure mode, players can only break blocks if they have the correct
 * tool with a CanDestroy tag. This is a simplified check — in a full
 * implementation, we would check the held tool's NBT data.
 *
 * For now, this always returns false (adventure mode cannot break blocks
 * without special tools), which the caller should handle by preventing
 * block breaking unless the player has a tagged tool.
 */
export function canPlayerBreak(
  _mode: GameMode,
  _x: number,
  _y: number,
  _z: number,
  _tool?: string,
): boolean {
  // Adventure mode: block breaking restricted to tools with CanDestroy tag
  // Simplified: always return false (tool-based restriction not yet implemented)
  return false;
}

/**
 * In adventure mode, players can only place blocks if the block item has
 * a CanPlaceOn tag. Simplified check.
 */
export function canPlayerPlace(
  _mode: GameMode,
  _blockId: BlockId,
  _targetBlockId?: BlockId,
): boolean {
  // Adventure mode: block placing restricted to items with CanPlaceOn tag
  // Simplified: always return false
  return false;
}

// =============================================================================
// Creative Inventory
// =============================================================================

/**
 * Returns a full creative mode inventory with a representative selection
 * of blocks and items in the hotbar.
 */
export function getCreativeInventory(): PlayerInventory {
  const hotbar: (InventorySlot | null)[] = [
    { item: 'stone', count: 64 },
    { item: 'oak_planks', count: 64 },
    { item: 'cobblestone', count: 64 },
    { item: 'glass', count: 64 },
    { item: 'diamond_sword', count: 1, durability: 1561 },
    { item: 'diamond_pickaxe', count: 1, durability: 1561 },
    { item: 'diamond_axe', count: 1, durability: 1561 },
    { item: 'diamond_shovel', count: 1, durability: 1561 },
    { item: 'torch', count: 64 },
  ];

  const main: (InventorySlot | null)[] = [
    // Building blocks
    { item: 'dirt', count: 64 },
    { item: 'grass_block', count: 64 },
    { item: 'sand', count: 64 },
    { item: 'gravel', count: 64 },
    { item: 'bricks', count: 64 },
    { item: 'stone_bricks', count: 64 },
    { item: 'oak_log', count: 64 },
    { item: 'spruce_planks', count: 64 },
    { item: 'birch_planks', count: 64 },
    // Ores & minerals
    { item: 'iron_block', count: 64 },
    { item: 'gold_block', count: 64 },
    { item: 'diamond_block', count: 64 },
    { item: 'emerald_block', count: 64 },
    { item: 'coal_block', count: 64 },
    { item: 'lapis_block', count: 64 },
    { item: 'redstone_block', count: 64 },
    // Decorative
    { item: 'white_wool', count: 64 },
    { item: 'white_concrete', count: 64 },
    // Utility
    { item: 'crafting_table', count: 64 },
    { item: 'furnace', count: 64 },
    { item: 'chest', count: 64 },
    { item: 'tnt', count: 64 },
    // Tools & weapons
    { item: 'bow', count: 1, durability: 384 },
    { item: 'arrow', count: 64 },
    { item: 'shield', count: 1, durability: 336 },
    // Armor
    { item: 'diamond_helmet', count: 1, durability: 363 },
    { item: 'diamond_chestplate', count: 1, durability: 528 },
  ];

  return {
    main,
    hotbar,
    armor: [
      { item: 'diamond_helmet', count: 1, durability: 363 },
      { item: 'diamond_chestplate', count: 1, durability: 528 },
      { item: 'diamond_leggings', count: 1, durability: 495 },
      { item: 'diamond_boots', count: 1, durability: 429 },
    ],
    offhand: null,
    selectedSlot: 0,
  };
}

// =============================================================================
// Game Mode Metadata (for UI display)
// =============================================================================

export interface GameModeInfo {
  mode: GameMode;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  icon: string;
  color: string;
}

export const GAME_MODE_INFO: GameModeInfo[] = [
  {
    mode: 'survival',
    name: 'Survival',
    nameJa: 'サバイバル',
    description: 'Gather resources, craft items, and survive against mobs. Health and hunger must be managed.',
    descriptionJa: '資源を集め、アイテムをクラフトし、モブに対抗して生き延びよう。体力と空腹を管理する必要があります。',
    icon: 'sword',
    color: '#DD8844',
  },
  {
    mode: 'creative',
    name: 'Creative',
    nameJa: 'クリエイティブ',
    description: 'Unlimited resources, instant block breaking, and the ability to fly. Build without limits.',
    descriptionJa: '無限の資源、ブロックの即時破壊、飛行能力。制限なく建築しよう。',
    icon: 'star',
    color: '#44DD44',
  },
  {
    mode: 'adventure',
    name: 'Adventure',
    nameJa: 'アドベンチャー',
    description: 'Explore custom maps. Blocks can only be broken or placed with the correct tools.',
    descriptionJa: 'カスタムマップを探検しよう。ブロックは正しいツールでのみ破壊・設置が可能です。',
    icon: 'map',
    color: '#4488DD',
  },
  {
    mode: 'spectator',
    name: 'Spectator',
    nameJa: 'スペクテイター',
    description: 'Fly through the world freely without interacting. Click entities to spectate from their view.',
    descriptionJa: 'インタラクションなしで自由にワールドを飛び回ろう。エンティティをクリックしてその視点で観戦できます。',
    icon: 'eye',
    color: '#AAAADD',
  },
];

export interface DifficultyInfo {
  difficulty: Difficulty;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  color: string;
}

export const DIFFICULTY_INFO: DifficultyInfo[] = [
  {
    difficulty: 'peaceful',
    name: 'Peaceful',
    nameJa: 'ピースフル',
    description: 'No hostile mobs. Health regenerates quickly.',
    descriptionJa: '敵対モブなし。体力が素早く回復します。',
    color: '#44DD44',
  },
  {
    difficulty: 'easy',
    name: 'Easy',
    nameJa: 'イージー',
    description: 'Hostile mobs deal reduced damage.',
    descriptionJa: '敵対モブのダメージが軽減されます。',
    color: '#88DD44',
  },
  {
    difficulty: 'normal',
    name: 'Normal',
    nameJa: 'ノーマル',
    description: 'Standard Minecraft difficulty.',
    descriptionJa: '標準的なマインクラフトの難易度。',
    color: '#DDAA44',
  },
  {
    difficulty: 'hard',
    name: 'Hard',
    nameJa: 'ハード',
    description: 'Increased mob damage. Starvation kills.',
    descriptionJa: 'モブのダメージ増加。飢餓で死亡する可能性あり。',
    color: '#DD4444',
  },
];

// =============================================================================
// World Size Presets (Switch Edition specific)
// =============================================================================

export interface WorldSizePreset {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  sizeBlocks: number; // Width/depth in blocks
  sizeChunks: number; // Width/depth in chunks
}

export const WORLD_SIZE_PRESETS: WorldSizePreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    nameJa: 'クラシック',
    description: '864 x 864 blocks (54 x 54 chunks)',
    descriptionJa: '864 x 864 ブロック（54 x 54 チャンク）',
    sizeBlocks: 864,
    sizeChunks: 54,
  },
  {
    id: 'small',
    name: 'Small',
    nameJa: 'スモール',
    description: '1024 x 1024 blocks (64 x 64 chunks)',
    descriptionJa: '1024 x 1024 ブロック（64 x 64 チャンク）',
    sizeBlocks: 1024,
    sizeChunks: 64,
  },
  {
    id: 'medium',
    name: 'Medium',
    nameJa: 'ミディアム',
    description: '3072 x 3072 blocks (192 x 192 chunks)',
    descriptionJa: '3072 x 3072 ブロック（192 x 192 チャンク）',
    sizeBlocks: 3072,
    sizeChunks: 192,
  },
];
