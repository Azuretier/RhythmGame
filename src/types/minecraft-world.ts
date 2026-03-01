// Minecraft World multiplayer types
// Defines the WebSocket protocol, room state, and player state

// ===== Player Colors =====

export const MW_PLAYER_COLORS = [
  '#FF4444', '#44CC44', '#4488FF', '#FFDD44',
  '#FF44FF', '#44DDDD', '#FF8844', '#8844FF', '#44FF88',
] as const;

// ===== Configuration =====

export const MW_CONFIG = {
  MAX_PLAYERS: 9,
  POSITION_BROADCAST_RATE: 100, // ms between position broadcasts (10Hz)
  MAX_CHAT_LENGTH: 200,
  ROOM_NAME_MAX: 32,
  PLAYER_NAME_MAX: 16,
} as const;

// ===== Room & Player State =====

export interface MWPlayer {
  id: string;
  name: string;
  color: string;
  ready: boolean;
  connected: boolean;
}

export interface MWRoomState {
  code: string;
  name: string;
  hostId: string;
  players: MWPlayer[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  seed?: number;
}

export interface MWPublicRoom {
  code: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing';
}

export interface MWPlayerPosition {
  id: string;
  x: number;
  y: number;
  z: number;
  rx: number; // rotation X (pitch)
  ry: number; // rotation Y (yaw)
}

export type MWGamePhase = 'menu' | 'lobby' | 'countdown' | 'playing';

// ===== Client → Server Messages =====

export type MWClientMessage =
  | { type: 'mw_create_room'; playerName: string; roomName?: string }
  | { type: 'mw_join_room'; roomCode: string; playerName: string }
  | { type: 'mw_get_rooms' }
  | { type: 'mw_leave' }
  | { type: 'mw_ready'; ready: boolean }
  | { type: 'mw_start' }
  | { type: 'mw_position'; x: number; y: number; z: number; rx: number; ry: number }
  | { type: 'mw_break_block'; x: number; y: number; z: number }
  | { type: 'mw_place_block'; x: number; y: number; z: number; blockType: number }
  | { type: 'mw_chat'; message: string };

// ===== Server → Client Messages =====

export type MWServerMessage =
  | { type: 'mw_room_created'; roomCode: string; playerId: string; reconnectToken: string }
  | { type: 'mw_joined_room'; roomCode: string; playerId: string; roomState: MWRoomState; reconnectToken: string }
  | { type: 'mw_room_state'; roomState: MWRoomState }
  | { type: 'mw_room_list'; rooms: MWPublicRoom[] }
  | { type: 'mw_player_joined'; player: MWPlayer }
  | { type: 'mw_player_left'; playerId: string }
  | { type: 'mw_player_ready'; playerId: string; ready: boolean }
  | { type: 'mw_countdown'; count: number }
  | { type: 'mw_game_started'; seed: number; serverTime: number }
  | { type: 'mw_player_position'; player: MWPlayerPosition }
  | { type: 'mw_block_changed'; playerId: string; x: number; y: number; z: number; blockType: number }
  | { type: 'mw_time_sync'; dayTime: number }
  | { type: 'mw_chat_message'; playerId: string; playerName: string; message: string }
  | { type: 'mw_error'; message: string; code?: string }
  | { type: 'mw_reconnected'; roomCode: string; playerId: string; roomState: MWRoomState; reconnectToken: string; blockChanges: MWBlockChange[]; serverTime: number };

// ===== Block Change Record =====

export interface MWBlockChange {
  playerId: string;
  x: number;
  y: number;
  z: number;
  blockType: number; // 0 = air (broken)
  tick: number;
}

// ===== Firestore Room Document =====

export interface MWFirestoreRoom {
  code: string;
  name: string;
  hostName: string;
  status: 'open' | 'playing' | 'closed';
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
  updatedAt: number;
}
