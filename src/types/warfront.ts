// ===== Warfront Types — Combined Game Mode =====
// All game modes (Rhythmia, FPS, Minecraft) combined in a shared voxel world
// with cross-mode effects and territory control.

// ===== Constants =====

export const WF_TICK_RATE = 10; // Server ticks per second
export const WF_MAX_PLAYERS = 8;
export const WF_MIN_PLAYERS = 2;
export const WF_TERRITORY_GRID = 4; // 4x4 = 16 zones of 32x32 blocks
export const WF_TERRITORY_SIZE = 32; // blocks per territory zone side
export const WF_DEFAULT_DURATION = 600000; // 10 minutes
export const WF_COUNTDOWN_SECONDS = 5;
export const WF_POSITION_BROADCAST_RATE = 100; // ms (10Hz)
export const WF_TERRITORY_BROADCAST_INTERVAL = 10; // ticks (1s)
export const WF_RESOURCE_BROADCAST_INTERVAL = 10; // ticks (1s)
export const WF_CAPTURE_RATE = 1; // progress per tick per soldier in zone
export const WF_CAPTURE_THRESHOLD = 100; // progress to capture a territory
export const WF_TERRITORY_MAX_HEALTH = 100;
export const WF_TERRITORY_MAX_FORTIFICATION = 3;
export const WF_RESPAWN_DELAY = 3000; // ms

// Team colors
export const WF_TEAM_COLORS = {
  alpha: '#3B82F6', // blue
  bravo: '#EF4444', // red
} as const;

// FFA player colors
export const WF_PLAYER_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
] as const;

// ===== Roles =====

export type WarfrontRole = 'defender' | 'soldier' | 'engineer' | 'commander';

export const WF_ROLE_INFO: Record<WarfrontRole, { label: string; description: string; icon: string }> = {
  defender: { label: 'Defender', description: 'Play Rhythmia to defend territories and generate energy', icon: '🛡' },
  soldier: { label: 'Soldier', description: 'FPS combat in the voxel world, capture territories', icon: '⚔' },
  engineer: { label: 'Engineer', description: 'Build fortifications and mine resources', icon: '⛏' },
  commander: { label: 'Commander', description: 'Tactical overview, spend resources on abilities', icon: '📡' },
};

// ===== Resource Pool =====

export interface ResourcePool {
  iron: number;
  diamond: number;
  wood: number;
  stone: number;
  energy: number;
}

export const WF_INITIAL_RESOURCES: ResourcePool = {
  iron: 0,
  diamond: 0,
  wood: 0,
  stone: 0,
  energy: 50,
};

// ===== Cross-Mode Effects =====

export type CrossModeEffectType =
  | 'shield_boost'        // Defender combo → soldier damage resistance
  | 'score_bonus'         // Soldier kill → defender score multiplier
  | 'resource_grant'      // Engineer mining → team resource pool
  | 'territory_heal'      // Defender performance → territory health
  | 'territory_damage'    // Soldier combat → enemy territory damage
  | 'fortification_buff'  // Engineer craft → territory defense boost
  | 'energy_pulse'        // Defender combo → energy generation
  | 'debuff_slow'         // Commander ability → enemies slowed
  | 'build_speed'         // Defender streak → engineer faster building
  | 'ammo_resupply'       // Engineer craft → soldier ammo
  | 'vision_reveal'       // Commander scan → reveals enemies
  | 'rhythm_power'        // Defender perfect → extra energy
  ;

export interface CrossModeEffect {
  id: string;
  sourcePlayerId: string;
  sourceRole: WarfrontRole;
  effectType: CrossModeEffectType;
  targetScope: 'team' | 'self' | 'enemy_team' | 'territory' | 'all';
  targetTeamId?: string;
  targetTerritoryId?: number;
  value: number;
  durationMs: number; // 0 = instant
  timestamp: number;
}

export interface ActiveEffect {
  effectId: string;
  effectType: CrossModeEffectType;
  value: number;
  expiresAt: number;
  sourcePlayerId: string;
}

// ===== Territory =====

export interface WarfrontTerritory {
  id: number; // 0-15
  gridX: number; // 0-3
  gridZ: number; // 0-3
  ownerId: string | null; // team ID or null (neutral)
  health: number; // 0-100
  maxHealth: number;
  fortificationLevel: number; // 0-3
  captureProgress: Record<string, number>; // teamId → progress (0-100)
}

// ===== Player =====

export interface DefenderStats {
  linesCleared: number;
  maxCombo: number;
  tSpins: number;
  energyGenerated: number;
  territoriesHealed: number;
}

export interface SoldierStats {
  kills: number;
  deaths: number;
  damageDealt: number;
  territoriesCaptured: number;
  headshots: number;
}

export interface EngineerStats {
  blocksMined: number;
  blocksPlaced: number;
  resourcesGathered: number;
  fortificationsBuilt: number;
  itemsCrafted: number;
}

export interface CommanderStats {
  scansUsed: number;
  abilitiesUsed: number;
  energySpent: number;
  ordersIssued: number;
}

export type RoleStats = DefenderStats | SoldierStats | EngineerStats | CommanderStats;

export interface WarfrontPlayer {
  id: string;
  name: string;
  teamId: string;
  role: WarfrontRole;
  connected: boolean;
  ready: boolean;
  position: { x: number; y: number; z: number };
  activeEffects: ActiveEffect[];
  roleStats: RoleStats;
  health: number;
  maxHealth: number;
  assignedTerritoryId?: number; // For defenders
}

// ===== Team =====

export interface WarfrontTeam {
  id: string;
  name: string;
  color: string;
  resourcePool: ResourcePool;
  score: number;
  territoryCount: number;
}

// ===== Room State =====

export type WarfrontGameMode = 'teams' | 'ffa';
export type WarfrontPhase = 'waiting' | 'countdown' | 'playing' | 'ended';

export interface WarfrontRoomState {
  code: string;
  name: string;
  hostId: string;
  status: WarfrontPhase;
  mode: WarfrontGameMode;
  maxPlayers: number;
  seed: number | null;
  createdAt: number;
  gameStartedAt: number | null;
  gameDurationMs: number;
  elapsedMs: number;
  teams: WarfrontTeam[];
  players: Record<string, WarfrontPlayer>;
  territories: WarfrontTerritory[];
}

export interface WFPublicRoom {
  code: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  mode: WarfrontGameMode;
  status: WarfrontPhase;
}

// ===== Client → Server Messages =====

export type WFClientMessage =
  // Room lifecycle
  | { type: 'wf_create_room'; playerName: string; roomName?: string; mode: WarfrontGameMode }
  | { type: 'wf_join_room'; roomCode: string; playerName: string }
  | { type: 'wf_get_rooms' }
  | { type: 'wf_leave' }
  | { type: 'wf_ready'; ready: boolean }
  | { type: 'wf_select_role'; role: WarfrontRole }
  | { type: 'wf_select_team'; teamId: string }
  | { type: 'wf_start' }
  | { type: 'wf_chat'; message: string }

  // Defender (Rhythmia)
  | { type: 'wf_defender_action'; actionType: string; value: number }
  | { type: 'wf_defender_board'; board: number[][] }

  // Soldier (FPS)
  | { type: 'wf_soldier_position'; x: number; y: number; z: number; rx: number; ry: number; weaponId: string; health: number }
  | { type: 'wf_soldier_shoot'; x: number; y: number; z: number; dx: number; dy: number; dz: number; weaponId: string }
  | { type: 'wf_soldier_hit'; targetId: string; damage: number; weaponId: string; headshot: boolean }
  | { type: 'wf_soldier_died'; killerId: string; weaponId: string }
  | { type: 'wf_soldier_respawn' }

  // Engineer (Minecraft)
  | { type: 'wf_engineer_position'; x: number; y: number; z: number; rx: number; ry: number }
  | { type: 'wf_engineer_mine'; x: number; y: number; z: number; blockType: number }
  | { type: 'wf_engineer_place'; x: number; y: number; z: number; blockType: number }
  | { type: 'wf_engineer_craft'; recipeId: string }

  // Commander
  | { type: 'wf_commander_scan'; targetTerritoryId: number }
  | { type: 'wf_commander_ability'; abilityId: string; targetTerritoryId: number }
  | { type: 'wf_commander_ping'; x: number; z: number; pingType: string }
  ;

// ===== Server → Client Messages =====

export type WFServerMessage =
  // Room lifecycle
  | { type: 'wf_room_created'; roomCode: string; playerId: string; reconnectToken: string }
  | { type: 'wf_joined_room'; roomCode: string; playerId: string; roomState: WarfrontRoomState; reconnectToken: string }
  | { type: 'wf_room_state'; roomState: WarfrontRoomState }
  | { type: 'wf_room_list'; rooms: WFPublicRoom[] }
  | { type: 'wf_player_joined'; player: WarfrontPlayer }
  | { type: 'wf_player_left'; playerId: string }
  | { type: 'wf_player_ready'; playerId: string; ready: boolean }
  | { type: 'wf_role_selected'; playerId: string; role: WarfrontRole }
  | { type: 'wf_team_selected'; playerId: string; teamId: string }
  | { type: 'wf_countdown'; count: number }
  | { type: 'wf_game_started'; seed: number; territories: WarfrontTerritory[]; teams: WarfrontTeam[] }
  | { type: 'wf_error'; message: string; code?: string }
  | { type: 'wf_chat_message'; playerId: string; playerName: string; message: string }

  // Game state broadcasts (from tick loop)
  | { type: 'wf_territory_update'; territories: WarfrontTerritory[] }
  | { type: 'wf_resources_update'; teamId: string; resources: ResourcePool }
  | { type: 'wf_effect_applied'; effect: CrossModeEffect }
  | { type: 'wf_effect_expired'; effectId: string; playerId: string }
  | { type: 'wf_team_scores'; teams: { id: string; score: number; territoryCount: number }[] }
  | { type: 'wf_game_ended'; reason: string; winnerId: string; rankings: WFRanking[] }

  // Relayed role-specific events
  | { type: 'wf_soldier_position_update'; playerId: string; x: number; y: number; z: number; rx: number; ry: number; weaponId: string; health: number }
  | { type: 'wf_soldier_shot'; playerId: string; x: number; y: number; z: number; dx: number; dy: number; dz: number; weaponId: string }
  | { type: 'wf_soldier_hit_confirm'; targetId: string; attackerId: string; damage: number; weaponId: string; headshot: boolean }
  | { type: 'wf_soldier_died_broadcast'; playerId: string; killerId: string; weaponId: string }
  | { type: 'wf_soldier_respawned'; playerId: string }
  | { type: 'wf_engineer_position_update'; playerId: string; x: number; y: number; z: number; rx: number; ry: number }
  | { type: 'wf_engineer_block_mined'; playerId: string; x: number; y: number; z: number; blockType: number }
  | { type: 'wf_engineer_block_placed'; playerId: string; x: number; y: number; z: number; blockType: number }
  | { type: 'wf_defender_action_broadcast'; playerId: string; actionType: string; value: number }
  | { type: 'wf_commander_ping_broadcast'; playerId: string; x: number; z: number; pingType: string; teamId: string }
  | { type: 'wf_commander_scan_result'; territoryId: number; enemyPositions: { x: number; z: number }[] }
  ;

// ===== Rankings =====

export interface WFRanking {
  playerId: string;
  playerName: string;
  teamId: string;
  role: WarfrontRole;
  score: number;
  roleStats: RoleStats;
}
