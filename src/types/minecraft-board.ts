// =============================================================
// Minecraft Board Game - Type Definitions & Game Data
// =============================================================

// === Core Type Aliases ===

export type BlockType =
  | 'air' | 'grass' | 'dirt' | 'stone' | 'cobblestone' | 'sand'
  | 'water' | 'deep_water' | 'snow_block' | 'ice' | 'wood' | 'leaves'
  | 'coal_ore' | 'iron_ore' | 'gold_ore' | 'diamond_ore'
  | 'obsidian' | 'bedrock' | 'gravel' | 'clay'
  | 'tall_grass' | 'flower_red' | 'flower_yellow'
  | 'mushroom_red' | 'mushroom_brown' | 'cactus' | 'sugar_cane'
  | 'crafting_table' | 'furnace' | 'chest' | 'torch' | 'planks';

export type Biome =
  | 'plains' | 'forest' | 'desert' | 'mountains' | 'snowy' | 'swamp' | 'ocean';

export type ItemType =
  // Raw materials
  | 'wood' | 'planks' | 'stick' | 'cobblestone' | 'coal'
  | 'raw_iron' | 'raw_gold' | 'diamond' | 'iron_ingot' | 'gold_ingot'
  | 'obsidian_item' | 'sand_item' | 'dirt_item' | 'snowball'
  | 'clay_ball' | 'string' | 'bone' | 'gunpowder' | 'ender_pearl' | 'leather'
  // Tools
  | 'wooden_pickaxe' | 'stone_pickaxe' | 'iron_pickaxe' | 'diamond_pickaxe'
  | 'wooden_sword' | 'stone_sword' | 'iron_sword' | 'diamond_sword'
  | 'wooden_axe' | 'stone_axe' | 'iron_axe' | 'diamond_axe'
  // Placeable
  | 'crafting_table_item' | 'furnace_item' | 'torch_item' | 'chest_item'
  // Armor
  | 'leather_armor' | 'iron_armor' | 'diamond_armor'
  // Food
  | 'apple' | 'raw_meat' | 'cooked_meat' | 'bread' | 'mushroom_stew'
  // Win condition
  | 'ender_portal_frame';

export type ToolTier = 'hand' | 'wood' | 'stone' | 'iron' | 'diamond';
export type ToolType = 'pickaxe' | 'axe' | 'sword' | 'shovel' | 'none';
export type MobType = 'zombie' | 'skeleton' | 'creeper' | 'spider' | 'cow' | 'pig' | 'chicken';
export type DayPhase = 'day' | 'dusk' | 'night' | 'dawn';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type MCGamePhase = 'menu' | 'lobby' | 'countdown' | 'playing' | 'ended';

// === Data Structures ===

export interface WorldTile {
  block: BlockType;
  biome: Biome;
  elevation: number;
}

export interface InventoryItem {
  type: ItemType;
  quantity: number;
}

export interface MCPlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  inventory: (InventoryItem | null)[];
  selectedSlot: number;
  armor: ItemType | null;
  experience: number;
  kills: number;
  blocksMined: number;
  connected: boolean;
  ready: boolean;
  color: string;
  mining: { x: number; y: number; progress: number; total: number } | null;
  lastMoveTick: number;
  lastAttackTick: number;
  dead: boolean;
  respawnTick: number;
}

export interface MCVisiblePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  color: string;
  mining: { x: number; y: number; progress: number; total: number } | null;
  dead: boolean;
}

export interface MCMobState {
  id: string;
  type: MobType;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  targetPlayerId: string | null;
  lastMoveTick: number;
  hostile: boolean;
}

export interface MCTileUpdate {
  x: number;
  y: number;
  tile: WorldTile;
}

// === Lobby & Room State ===

export interface MCLobbyPlayer {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  color: string;
}

export interface MCRoomState {
  code: string;
  name: string;
  hostId: string;
  players: MCLobbyPlayer[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
}

export interface MCPublicRoom {
  code: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
}

// === Game State Update (sent periodically to each client) ===

export interface MCGameStateUpdate {
  visibleTiles: MCTileUpdate[];
  players: MCVisiblePlayer[];
  mobs: MCMobState[];
  self: MCPlayerState;
  timeOfDay: number;
  dayPhase: DayPhase;
  tick: number;
  gameMessage?: string;
}

// === Game Configuration ===

export const MC_BOARD_CONFIG = {
  WORLD_SIZE: 48,
  MAX_PLAYERS: 9,
  MIN_PLAYERS: 1,
  TICK_RATE: 10,
  VISION_RADIUS: 7,
  VIEWPORT_SIZE: 15,
  MOVE_COOLDOWN_TICKS: 2,
  ATTACK_COOLDOWN_TICKS: 5,
  MAX_HEALTH: 20,
  MAX_HUNGER: 20,
  HUNGER_TICK_INTERVAL: 300,
  HUNGER_DAMAGE_INTERVAL: 50,
  RESPAWN_TICKS: 50,
  DAY_TICKS: 900,
  NIGHT_TICKS: 450,
  DAWN_TICKS: 100,
  DUSK_TICKS: 100,
  MOB_SPAWN_INTERVAL: 50,
  MOB_MOVE_INTERVAL: 10,
  MAX_MOBS: 20,
  INVENTORY_SIZE: 27,
  HOTBAR_SIZE: 9,
  STACK_SIZE: 64,
  STATE_UPDATE_INTERVAL: 3,
  PLAYER_COLORS: [
    '#FF4444', '#4488FF', '#44DD44', '#FFDD44', '#DD44DD',
    '#44DDDD', '#FF8844', '#FF88AA', '#DDDDDD',
  ] as readonly string[],
  SPAWN_CLEARING_RADIUS: 4,
} as const;

// === Tool Tier Ordering (for mining requirement checks) ===

export const TOOL_TIER_LEVEL: Record<ToolTier, number> = {
  hand: 0,
  wood: 1,
  stone: 2,
  iron: 3,
  diamond: 4,
};

// === Block Properties ===

export interface BlockProperties {
  solid: boolean;
  mineable: boolean;
  hardness: number;
  requiredTier: ToolTier;
  preferredTool: ToolType;
  drops: { item: ItemType; quantity: number; chance: number }[];
  walkable: boolean;
  transparent: boolean;
}

function blk(overrides: Partial<BlockProperties> = {}): BlockProperties {
  return {
    solid: true, mineable: true, hardness: 15, requiredTier: 'hand',
    preferredTool: 'pickaxe', drops: [], walkable: false, transparent: false,
    ...overrides,
  };
}

export const BLOCK_PROPERTIES: Record<BlockType, BlockProperties> = {
  air:            blk({ solid: false, mineable: false, hardness: 0, walkable: true, transparent: true }),
  grass:          blk({ hardness: 6, preferredTool: 'shovel', drops: [{ item: 'dirt_item', quantity: 1, chance: 1 }], walkable: true }),
  dirt:           blk({ hardness: 5, preferredTool: 'shovel', drops: [{ item: 'dirt_item', quantity: 1, chance: 1 }], walkable: true }),
  stone:          blk({ hardness: 15, drops: [{ item: 'cobblestone', quantity: 1, chance: 1 }] }),
  cobblestone:    blk({ hardness: 20, drops: [{ item: 'cobblestone', quantity: 1, chance: 1 }] }),
  sand:           blk({ hardness: 5, preferredTool: 'shovel', drops: [{ item: 'sand_item', quantity: 1, chance: 1 }], walkable: true }),
  water:          blk({ solid: false, mineable: false, hardness: 0, walkable: true, transparent: true }),
  deep_water:     blk({ solid: false, mineable: false, hardness: 0, walkable: false, transparent: true }),
  snow_block:     blk({ hardness: 3, preferredTool: 'shovel', drops: [{ item: 'snowball', quantity: 4, chance: 1 }], walkable: true }),
  ice:            blk({ hardness: 5, transparent: true, walkable: true }),
  wood:           blk({ hardness: 10, preferredTool: 'axe', drops: [{ item: 'wood', quantity: 1, chance: 1 }, { item: 'apple', quantity: 1, chance: 0.15 }] }),
  leaves:         blk({ hardness: 2, preferredTool: 'axe', drops: [{ item: 'apple', quantity: 1, chance: 0.1 }, { item: 'stick', quantity: 1, chance: 0.2 }], transparent: true, walkable: true }),
  coal_ore:       blk({ hardness: 15, requiredTier: 'wood', drops: [{ item: 'coal', quantity: 1, chance: 1 }] }),
  iron_ore:       blk({ hardness: 20, requiredTier: 'stone', drops: [{ item: 'raw_iron', quantity: 1, chance: 1 }] }),
  gold_ore:       blk({ hardness: 25, requiredTier: 'iron', drops: [{ item: 'raw_gold', quantity: 1, chance: 1 }] }),
  diamond_ore:    blk({ hardness: 30, requiredTier: 'iron', drops: [{ item: 'diamond', quantity: 1, chance: 1 }] }),
  obsidian:       blk({ hardness: 50, requiredTier: 'diamond', drops: [{ item: 'obsidian_item', quantity: 1, chance: 1 }] }),
  bedrock:        blk({ mineable: false, hardness: Infinity }),
  gravel:         blk({ hardness: 6, preferredTool: 'shovel', drops: [{ item: 'cobblestone', quantity: 1, chance: 0.8 }], walkable: true }),
  clay:           blk({ hardness: 6, preferredTool: 'shovel', drops: [{ item: 'clay_ball', quantity: 4, chance: 1 }] }),
  tall_grass:     blk({ solid: false, hardness: 0, walkable: true, transparent: true, drops: [] }),
  flower_red:     blk({ solid: false, hardness: 0, walkable: true, transparent: true, drops: [{ item: 'apple', quantity: 1, chance: 0.3 }] }),
  flower_yellow:  blk({ solid: false, hardness: 0, walkable: true, transparent: true, drops: [{ item: 'apple', quantity: 1, chance: 0.3 }] }),
  mushroom_red:   blk({ solid: false, hardness: 0, walkable: true, transparent: true, drops: [{ item: 'mushroom_stew', quantity: 1, chance: 0.5 }] }),
  mushroom_brown: blk({ solid: false, hardness: 0, walkable: true, transparent: true, drops: [{ item: 'mushroom_stew', quantity: 1, chance: 0.5 }] }),
  cactus:         blk({ hardness: 4, walkable: false, transparent: true, drops: [] }),
  sugar_cane:     blk({ solid: false, hardness: 0, walkable: true, transparent: true, drops: [] }),
  crafting_table: blk({ hardness: 10, preferredTool: 'axe', drops: [{ item: 'crafting_table_item', quantity: 1, chance: 1 }], walkable: true }),
  furnace:        blk({ hardness: 15, drops: [{ item: 'furnace_item', quantity: 1, chance: 1 }], walkable: true }),
  chest:          blk({ hardness: 10, preferredTool: 'axe', drops: [{ item: 'chest_item', quantity: 1, chance: 1 }], walkable: true }),
  torch:          blk({ solid: false, hardness: 0, walkable: true, transparent: true, drops: [{ item: 'torch_item', quantity: 1, chance: 1 }] }),
  planks:         blk({ hardness: 10, preferredTool: 'axe', drops: [{ item: 'planks', quantity: 1, chance: 1 }], walkable: true }),
};

// === Item Properties ===

export interface ItemProperties {
  maxStack: number;
  placeable: boolean;
  placeBlock?: BlockType;
  edible: boolean;
  hungerRestore?: number;
  healthRestore?: number;
  damage: number;
  defense: number;
  tier?: ToolTier;
  toolType?: ToolType;
  miningSpeed: number;
}

function itm(overrides: Partial<ItemProperties> = {}): ItemProperties {
  return {
    maxStack: 64, placeable: false, edible: false,
    damage: 1, defense: 0, miningSpeed: 1,
    ...overrides,
  };
}

export const ITEM_PROPERTIES: Record<ItemType, ItemProperties> = {
  // Raw materials
  wood:           itm(),
  planks:         itm({ placeable: true, placeBlock: 'planks' }),
  stick:          itm(),
  cobblestone:    itm({ placeable: true, placeBlock: 'cobblestone' }),
  coal:           itm(),
  raw_iron:       itm(),
  raw_gold:       itm(),
  diamond:        itm(),
  iron_ingot:     itm(),
  gold_ingot:     itm(),
  obsidian_item:  itm({ placeable: true, placeBlock: 'obsidian' }),
  sand_item:      itm({ placeable: true, placeBlock: 'sand' }),
  dirt_item:      itm({ placeable: true, placeBlock: 'dirt' }),
  snowball:       itm({ maxStack: 16 }),
  clay_ball:      itm(),
  string:         itm(),
  bone:           itm(),
  gunpowder:      itm(),
  ender_pearl:    itm({ maxStack: 16 }),
  leather:        itm(),
  // Pickaxes
  wooden_pickaxe:  itm({ maxStack: 1, damage: 2, tier: 'wood', toolType: 'pickaxe', miningSpeed: 2 }),
  stone_pickaxe:   itm({ maxStack: 1, damage: 3, tier: 'stone', toolType: 'pickaxe', miningSpeed: 3 }),
  iron_pickaxe:    itm({ maxStack: 1, damage: 4, tier: 'iron', toolType: 'pickaxe', miningSpeed: 4 }),
  diamond_pickaxe: itm({ maxStack: 1, damage: 5, tier: 'diamond', toolType: 'pickaxe', miningSpeed: 5 }),
  // Swords
  wooden_sword:    itm({ maxStack: 1, damage: 4, tier: 'wood', toolType: 'sword' }),
  stone_sword:     itm({ maxStack: 1, damage: 5, tier: 'stone', toolType: 'sword' }),
  iron_sword:      itm({ maxStack: 1, damage: 6, tier: 'iron', toolType: 'sword' }),
  diamond_sword:   itm({ maxStack: 1, damage: 8, tier: 'diamond', toolType: 'sword' }),
  // Axes
  wooden_axe:      itm({ maxStack: 1, damage: 3, tier: 'wood', toolType: 'axe', miningSpeed: 2 }),
  stone_axe:       itm({ maxStack: 1, damage: 4, tier: 'stone', toolType: 'axe', miningSpeed: 3 }),
  iron_axe:        itm({ maxStack: 1, damage: 5, tier: 'iron', toolType: 'axe', miningSpeed: 4 }),
  diamond_axe:     itm({ maxStack: 1, damage: 6, tier: 'diamond', toolType: 'axe', miningSpeed: 5 }),
  // Placeable
  crafting_table_item: itm({ maxStack: 1, placeable: true, placeBlock: 'crafting_table' }),
  furnace_item:   itm({ maxStack: 1, placeable: true, placeBlock: 'furnace' }),
  torch_item:     itm({ placeable: true, placeBlock: 'torch' }),
  chest_item:     itm({ maxStack: 1, placeable: true, placeBlock: 'chest' }),
  // Armor
  leather_armor:  itm({ maxStack: 1, defense: 3 }),
  iron_armor:     itm({ maxStack: 1, defense: 6 }),
  diamond_armor:  itm({ maxStack: 1, defense: 10 }),
  // Food
  apple:          itm({ edible: true, hungerRestore: 4 }),
  raw_meat:       itm({ edible: true, hungerRestore: 2 }),
  cooked_meat:    itm({ edible: true, hungerRestore: 8 }),
  bread:          itm({ edible: true, hungerRestore: 5 }),
  mushroom_stew:  itm({ maxStack: 1, edible: true, hungerRestore: 6, healthRestore: 2 }),
  // Win condition
  ender_portal_frame: itm({ maxStack: 1 }),
};

// === Block Visual Data (for client rendering) ===

export const BLOCK_COLORS: Record<BlockType, string> = {
  air: 'transparent',
  grass: '#5D8C3E',
  dirt: '#8B6B47',
  stone: '#808080',
  cobblestone: '#6B6B6B',
  sand: '#DBC67B',
  water: '#3B7DD8',
  deep_water: '#1A3D6E',
  snow_block: '#F0F0FF',
  ice: '#A5D6F7',
  wood: '#6B4226',
  leaves: '#3A7D22',
  coal_ore: '#4A4A4A',
  iron_ore: '#B8A590',
  gold_ore: '#C4A43A',
  diamond_ore: '#4AEDD9',
  obsidian: '#1A0A2E',
  bedrock: '#333333',
  gravel: '#9A9A9A',
  clay: '#9EAAB4',
  tall_grass: '#6B9E3E',
  flower_red: '#5D8C3E',
  flower_yellow: '#5D8C3E',
  mushroom_red: '#5D8C3E',
  mushroom_brown: '#5D8C3E',
  cactus: '#2D6B2D',
  sugar_cane: '#7DB84B',
  crafting_table: '#8B6914',
  furnace: '#6B6B6B',
  chest: '#A0782C',
  torch: '#5D8C3E',
  planks: '#B8935A',
};

export const BLOCK_ICONS: Partial<Record<BlockType, string>> = {
  wood: '|',
  leaves: '*',
  coal_ore: 'c',
  iron_ore: 'i',
  gold_ore: 'g',
  diamond_ore: 'd',
  obsidian: 'O',
  flower_red: 'r',
  flower_yellow: 'y',
  mushroom_red: 'm',
  mushroom_brown: 'm',
  cactus: '#',
  sugar_cane: '|',
  crafting_table: 'T',
  furnace: 'F',
  chest: 'C',
  torch: 't',
  water: '~',
  deep_water: '~',
  tall_grass: ',',
};

export const ITEM_ICONS: Partial<Record<ItemType, string>> = {
  wood: 'W', planks: 'P', stick: '/', cobblestone: 'S', coal: 'C',
  raw_iron: 'i', raw_gold: 'g', diamond: 'D', iron_ingot: 'I', gold_ingot: 'G',
  obsidian_item: 'O', apple: 'a', raw_meat: 'r', cooked_meat: 'M', bread: 'b',
  mushroom_stew: 's',
  wooden_pickaxe: 'P', stone_pickaxe: 'P', iron_pickaxe: 'P', diamond_pickaxe: 'P',
  wooden_sword: 'S', stone_sword: 'S', iron_sword: 'S', diamond_sword: 'S',
  wooden_axe: 'A', stone_axe: 'A', iron_axe: 'A', diamond_axe: 'A',
  crafting_table_item: 'T', furnace_item: 'F', torch_item: 't', chest_item: 'C',
  leather_armor: 'L', iron_armor: 'I', diamond_armor: 'D',
  ender_pearl: 'E', ender_portal_frame: '*',
  leather: 'l', string: '~', bone: 'b', gunpowder: 'g',
};

export const ITEM_COLORS: Partial<Record<ItemType, string>> = {
  wood: '#6B4226', planks: '#B8935A', stick: '#8B6B47', cobblestone: '#808080',
  coal: '#222222', raw_iron: '#D4C4A8', raw_gold: '#FFD700', diamond: '#4AEDD9',
  iron_ingot: '#D4D4D4', gold_ingot: '#FFD700', obsidian_item: '#1A0A2E',
  apple: '#FF4444', raw_meat: '#CC6644', cooked_meat: '#AA4400', bread: '#DAA520',
  mushroom_stew: '#884422',
  wooden_pickaxe: '#B8935A', stone_pickaxe: '#808080', iron_pickaxe: '#D4D4D4', diamond_pickaxe: '#4AEDD9',
  wooden_sword: '#B8935A', stone_sword: '#808080', iron_sword: '#D4D4D4', diamond_sword: '#4AEDD9',
  wooden_axe: '#B8935A', stone_axe: '#808080', iron_axe: '#D4D4D4', diamond_axe: '#4AEDD9',
  crafting_table_item: '#8B6914', furnace_item: '#6B6B6B', torch_item: '#FFA500',
  leather_armor: '#8B4513', iron_armor: '#D4D4D4', diamond_armor: '#4AEDD9',
  ender_pearl: '#00FFAA', ender_portal_frame: '#FFAA00',
  leather: '#8B4513', string: '#CCCCCC', bone: '#F5F5DC', gunpowder: '#444444',
};

// === Mob Visual Data ===

export const MOB_COLORS: Record<MobType, string> = {
  zombie: '#4A7A2E',
  skeleton: '#C8C8C8',
  creeper: '#2DCC2D',
  spider: '#4A3728',
  cow: '#6B4226',
  pig: '#ECA0A0',
  chicken: '#F5F5DC',
};

export const MOB_ICONS: Record<MobType, string> = {
  zombie: 'Z',
  skeleton: 'K',
  creeper: 'C',
  spider: 'S',
  cow: 'w',
  pig: 'p',
  chicken: 'k',
};

export const MOB_STATS: Record<MobType, { health: number; damage: number; hostile: boolean; speed: number }> = {
  zombie:   { health: 20, damage: 3, hostile: true, speed: 15 },
  skeleton: { health: 20, damage: 4, hostile: true, speed: 12 },
  creeper:  { health: 20, damage: 10, hostile: true, speed: 20 },
  spider:   { health: 16, damage: 2, hostile: true, speed: 8 },
  cow:      { health: 10, damage: 0, hostile: false, speed: 30 },
  pig:      { health: 10, damage: 0, hostile: false, speed: 30 },
  chicken:  { health: 4, damage: 0, hostile: false, speed: 25 },
};

export const MOB_DROPS: Record<MobType, { item: ItemType; quantity: number; chance: number }[]> = {
  zombie:   [{ item: 'raw_meat', quantity: 1, chance: 0.6 }, { item: 'iron_ingot', quantity: 1, chance: 0.05 }],
  skeleton: [{ item: 'bone', quantity: 1, chance: 0.8 }, { item: 'string', quantity: 1, chance: 0.3 }],
  creeper:  [{ item: 'gunpowder', quantity: 1, chance: 0.8 }],
  spider:   [{ item: 'string', quantity: 1, chance: 0.7 }, { item: 'ender_pearl', quantity: 1, chance: 0.02 }],
  cow:      [{ item: 'raw_meat', quantity: 2, chance: 1 }, { item: 'leather', quantity: 1, chance: 0.8 }],
  pig:      [{ item: 'raw_meat', quantity: 2, chance: 1 }],
  chicken:  [{ item: 'raw_meat', quantity: 1, chance: 1 }],
};

// === Client <-> Server Message Types ===

export type MCClientMessage =
  | { type: 'mc_create_room'; playerName: string; roomName?: string }
  | { type: 'mc_join_room'; roomCode: string; playerName: string }
  | { type: 'mc_get_rooms' }
  | { type: 'mc_leave' }
  | { type: 'mc_ready'; ready: boolean }
  | { type: 'mc_start' }
  | { type: 'mc_move'; direction: Direction }
  | { type: 'mc_mine'; x: number; y: number }
  | { type: 'mc_cancel_mine' }
  | { type: 'mc_craft'; recipeId: string }
  | { type: 'mc_attack'; targetId: string }
  | { type: 'mc_place_block'; x: number; y: number; itemIndex: number }
  | { type: 'mc_eat'; itemIndex: number }
  | { type: 'mc_select_slot'; slot: number }
  | { type: 'mc_chat'; message: string };

export type MCServerMessage =
  | { type: 'mc_room_created'; roomCode: string; playerId: string; reconnectToken: string }
  | { type: 'mc_joined_room'; roomCode: string; playerId: string; roomState: MCRoomState; reconnectToken: string }
  | { type: 'mc_room_state'; roomState: MCRoomState }
  | { type: 'mc_room_list'; rooms: MCPublicRoom[] }
  | { type: 'mc_player_joined'; player: MCLobbyPlayer }
  | { type: 'mc_player_left'; playerId: string }
  | { type: 'mc_player_ready'; playerId: string; ready: boolean }
  | { type: 'mc_countdown'; count: number }
  | { type: 'mc_game_started'; seed: number }
  | { type: 'mc_state_update'; state: MCGameStateUpdate }
  | { type: 'mc_player_moved'; playerId: string; x: number; y: number }
  | { type: 'mc_tile_mined'; x: number; y: number; newBlock: BlockType; playerId: string }
  | { type: 'mc_mining_started'; playerId: string; x: number; y: number; totalTicks: number }
  | { type: 'mc_mining_cancelled'; playerId: string }
  | { type: 'mc_item_gained'; playerId: string; item: ItemType; quantity: number }
  | { type: 'mc_damage'; targetId: string; damage: number; sourceId: string; targetHp: number }
  | { type: 'mc_player_died'; playerId: string; killerId?: string }
  | { type: 'mc_player_respawned'; playerId: string; x: number; y: number }
  | { type: 'mc_crafted'; playerId: string; recipeId: string; item: ItemType }
  | { type: 'mc_block_placed'; x: number; y: number; block: BlockType; playerId: string }
  | { type: 'mc_chat_message'; playerId: string; playerName: string; message: string }
  | { type: 'mc_day_phase'; phase: DayPhase; timeOfDay: number }
  | { type: 'mc_mob_spawned'; mob: MCMobState }
  | { type: 'mc_mob_died'; mobId: string; killerName: string }
  | { type: 'mc_game_over'; winnerId: string; winnerName: string }
  | { type: 'mc_error'; message: string };
