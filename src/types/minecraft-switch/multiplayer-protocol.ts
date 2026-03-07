// =============================================================================
// Minecraft: Nintendo Switch Edition — Multiplayer Protocol Types
// =============================================================================
// Room/lobby types, client/server message types, entity state sync,
// and player colors.
// =============================================================================

import type { BlockId } from './blocks';
import type { MobType } from './items-entities';
import type {
  GameMode,
  PlayerInventory,
  PlayerState,
  StatusEffectInstance,
  ParticleEmitter,
  SoundEvent,
  WeatherType,
  DayPhase,
  DamageSource,
  BlockCoord,
} from './world-player';

// =============================================================================
// 18. MULTIPLAYER — ROOM & LOBBY
// =============================================================================

export const MS_PLAYER_COLORS = [
  '#FF4444', '#44CC44', '#4488FF', '#FFDD44',
  '#FF44FF', '#44DDDD', '#FF8844', '#8844FF', '#44FF88',
] as const;

export interface MSPlayer {
  id: string;
  name: string;
  color: string;
  ready: boolean;
  connected: boolean;
  gameMode: GameMode;
  ping: number;
}

export interface MSRoomState {
  code: string;
  name: string;
  hostId: string;
  players: MSPlayer[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  seed?: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  worldType: WorldType;
}

export interface MSPublicRoom {
  code: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing';
  gameMode: GameMode;
}

export type Difficulty = 'peaceful' | 'easy' | 'normal' | 'hard';
export type WorldType = 'default' | 'superflat' | 'large_biomes' | 'amplified';

export type MSGamePhase = 'menu' | 'lobby' | 'countdown' | 'loading' | 'playing';

// =============================================================================
// 19. MULTIPLAYER — CLIENT -> SERVER MESSAGES
// =============================================================================

export type MSClientMessage =
  // Room management
  | { type: 'ms_create_room'; playerName: string; roomName?: string; gameMode?: GameMode; difficulty?: Difficulty; worldType?: WorldType }
  | { type: 'ms_join_room'; roomCode: string; playerName: string }
  | { type: 'ms_get_rooms' }
  | { type: 'ms_leave' }
  | { type: 'ms_ready'; ready: boolean }
  | { type: 'ms_start' }
  // Movement & position
  | { type: 'ms_position'; x: number; y: number; z: number; yaw: number; pitch: number; onGround: boolean }
  | { type: 'ms_sprint'; sprinting: boolean }
  | { type: 'ms_sneak'; sneaking: boolean }
  | { type: 'ms_jump' }
  | { type: 'ms_swim'; swimming: boolean }
  // Block interaction
  | { type: 'ms_break_block'; x: number; y: number; z: number }
  | { type: 'ms_start_breaking'; x: number; y: number; z: number }
  | { type: 'ms_cancel_breaking' }
  | { type: 'ms_place_block'; x: number; y: number; z: number; blockId: BlockId; face: BlockFace }
  | { type: 'ms_interact_block'; x: number; y: number; z: number }
  // Inventory & items
  | { type: 'ms_select_slot'; slot: number }
  | { type: 'ms_swap_items'; fromSlot: number; toSlot: number; fromContainer: InventoryContainer; toContainer: InventoryContainer }
  | { type: 'ms_drop_item'; slot: number; count: number }
  | { type: 'ms_craft'; recipeId: string }
  | { type: 'ms_eat'; slot: number }
  // Combat
  | { type: 'ms_attack_entity'; entityId: string }
  | { type: 'ms_use_item' }
  // Chat
  | { type: 'ms_chat'; message: string }
  // Settings
  | { type: 'ms_change_gamemode'; gameMode: GameMode }
  | { type: 'ms_change_difficulty'; difficulty: Difficulty };

export type BlockFace = 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';

export type InventoryContainer = 'hotbar' | 'main' | 'armor' | 'offhand' | 'crafting' | 'chest' | 'furnace';

// =============================================================================
// 20. MULTIPLAYER — SERVER -> CLIENT MESSAGES
// =============================================================================

export type MSServerMessage =
  // Room lifecycle
  | { type: 'ms_room_created'; roomCode: string; playerId: string; reconnectToken: string }
  | { type: 'ms_joined_room'; roomCode: string; playerId: string; roomState: MSRoomState; reconnectToken: string }
  | { type: 'ms_room_state'; roomState: MSRoomState }
  | { type: 'ms_room_list'; rooms: MSPublicRoom[] }
  | { type: 'ms_player_joined'; player: MSPlayer }
  | { type: 'ms_player_left'; playerId: string }
  | { type: 'ms_player_ready'; playerId: string; ready: boolean }
  | { type: 'ms_countdown'; count: number }
  | { type: 'ms_game_started'; seed: number; worldType: WorldType }
  | { type: 'ms_reconnected'; roomCode: string; playerId: string; roomState: MSRoomState; reconnectToken: string }
  // World state
  | { type: 'ms_chunk_data'; chunkX: number; chunkZ: number; blocks: number[]; biomes: number[]; heightMap: number[] }
  | { type: 'ms_block_update'; x: number; y: number; z: number; blockId: BlockId }
  | { type: 'ms_multi_block_update'; updates: { x: number; y: number; z: number; blockId: BlockId }[] }
  // Player updates
  | { type: 'ms_player_position'; playerId: string; x: number; y: number; z: number; yaw: number; pitch: number; onGround: boolean }
  | { type: 'ms_player_state'; playerId: string; health: number; hunger: number; armor: number; gameMode: GameMode }
  | { type: 'ms_player_sprint'; playerId: string; sprinting: boolean }
  | { type: 'ms_player_sneak'; playerId: string; sneaking: boolean }
  | { type: 'ms_player_animation'; playerId: string; animation: PlayerAnimation }
  // Block events
  | { type: 'ms_block_broken'; x: number; y: number; z: number; playerId: string; newBlockId: BlockId }
  | { type: 'ms_block_placed'; x: number; y: number; z: number; blockId: BlockId; playerId: string }
  | { type: 'ms_breaking_progress'; playerId: string; x: number; y: number; z: number; progress: number }
  // Entity events
  | { type: 'ms_entity_spawn'; entity: EntityState }
  | { type: 'ms_entity_move'; entityId: string; x: number; y: number; z: number; yaw: number; pitch: number }
  | { type: 'ms_entity_despawn'; entityId: string }
  | { type: 'ms_entity_damage'; entityId: string; damage: number; sourceId?: string; newHealth: number }
  | { type: 'ms_entity_death'; entityId: string; killerId?: string }
  // Item events
  | { type: 'ms_item_drop'; entityId: string; item: string; count: number; x: number; y: number; z: number }
  | { type: 'ms_item_pickup'; playerId: string; entityId: string; item: string; count: number }
  | { type: 'ms_inventory_update'; inventory: PlayerInventory }
  | { type: 'ms_crafted'; recipeId: string; result: string; count: number }
  // Combat
  | { type: 'ms_damage'; targetId: string; damage: number; source: DamageSource; attackerId?: string; newHealth: number }
  | { type: 'ms_player_died'; playerId: string; deathMessage: string; killerId?: string }
  | { type: 'ms_player_respawned'; playerId: string; x: number; y: number; z: number }
  // Effects
  | { type: 'ms_status_effect'; playerId: string; effect: StatusEffectInstance; action: 'add' | 'remove' | 'update' }
  | { type: 'ms_particle'; particle: ParticleEmitter }
  | { type: 'ms_sound'; sound: SoundEvent; x: number; y: number; z: number }
  | { type: 'ms_explosion'; x: number; y: number; z: number; radius: number; blocksDestroyed: BlockCoord[] }
  // World events
  | { type: 'ms_time_update'; totalTicks: number; dayTime: number }
  | { type: 'ms_weather_change'; weather: WeatherType; duration: number }
  | { type: 'ms_day_phase'; phase: DayPhase }
  // Chat & UI
  | { type: 'ms_chat_message'; playerId: string; playerName: string; message: string }
  | { type: 'ms_system_message'; message: string; color?: string }
  | { type: 'ms_title'; title: string; subtitle?: string; fadeIn: number; stay: number; fadeOut: number }
  | { type: 'ms_actionbar'; message: string }
  // Error
  | { type: 'ms_error'; message: string; code?: string };

export type PlayerAnimation = 'swing_arm' | 'hurt' | 'critical_hit' | 'eat' | 'wake_up';

// =============================================================================
// 21. ENTITY STATE (for network sync)
// =============================================================================

export interface EntityState {
  id: string;
  type: MobType | 'item' | 'arrow' | 'experience_orb' | 'falling_block' | 'tnt';
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  health: number;
  maxHealth: number;
  /** Custom name (name tag). */
  customName?: string;
  /** Whether the entity is on fire. */
  onFire: boolean;
  /** Whether the entity is invisible. */
  invisible: boolean;
  /** Additional data depending on entity type. */
  metadata: Record<string, unknown>;
}

// =============================================================================
// 26. GAME STATE UPDATE (periodic snapshot sent to clients)
// =============================================================================

export interface MSGameStateUpdate {
  /** Server tick. */
  tick: number;
  /** Player's own state. */
  self: PlayerState;
  /** Other visible players. */
  players: MSVisiblePlayer[];
  /** Visible entities (mobs, items, etc.). */
  entities: EntityState[];
  /** Block updates since last snapshot. */
  blockUpdates: { x: number; y: number; z: number; blockId: BlockId }[];
  /** Time of day (0-24000). */
  dayTime: number;
  /** Current day phase. */
  dayPhase: DayPhase;
  /** Current weather. */
  weather: WeatherType;
  /** System/game messages. */
  messages: MSChatEntry[];
}

export interface MSVisiblePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  color: string;
  sneaking: boolean;
  sprinting: boolean;
  swimming: boolean;
  gameMode: GameMode;
  heldItem?: string;
  armorSet?: string[];
  animation?: PlayerAnimation;
}

export interface MSChatEntry {
  playerId?: string;
  playerName?: string;
  message: string;
  timestamp: number;
  color?: string;
  system: boolean;
}

