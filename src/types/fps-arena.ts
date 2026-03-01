// FPS Arena multiplayer types
// Defines the WebSocket protocol for real-time FPS gameplay

// ===== Player Colors =====

export const FPS_PLAYER_COLORS = [
    '#FF4444', '#44CC44', '#4488FF', '#FFDD44',
    '#FF44FF', '#44DDDD', '#FF8844', '#8844FF',
] as const;

// ===== Configuration =====

export const FPS_CONFIG = {
    MAX_PLAYERS: 8,
    POSITION_BROADCAST_RATE: 100, // ms between position broadcasts (10Hz)
    MAX_CHAT_LENGTH: 200,
    ROOM_NAME_MAX: 32,
    PLAYER_NAME_MAX: 16,
} as const;

// ===== Room & Player State =====

export interface FPSPlayer {
    id: string;
    name: string;
    color: string;
    ready: boolean;
    connected: boolean;
}

export interface FPSRoomState {
    code: string;
    name: string;
    hostId: string;
    players: FPSPlayer[];
    status: 'waiting' | 'countdown' | 'playing' | 'finished';
    maxPlayers: number;
    seed?: number;
}

export interface FPSPublicRoom {
    code: string;
    name: string;
    hostName: string;
    playerCount: number;
    maxPlayers: number;
    status: 'waiting' | 'playing';
}

export interface FPSPlayerPosition {
    id: string;
    x: number;
    y: number;
    z: number;
    rx: number; // rotation X (pitch)
    ry: number; // rotation Y (yaw)
    weaponId: string;
    health: number;
}

export type FPSGamePhase = 'menu' | 'lobby' | 'countdown' | 'playing';

// ===== Client → Server Messages =====

export type FPSClientMessage =
    | { type: 'fps_create_room'; playerName: string; roomName?: string }
    | { type: 'fps_join_room'; roomCode: string; playerName: string }
    | { type: 'fps_get_rooms' }
    | { type: 'fps_leave' }
    | { type: 'fps_ready'; ready: boolean }
    | { type: 'fps_start' }
    | { type: 'fps_position'; x: number; y: number; z: number; rx: number; ry: number; weaponId: string; health: number }
    | { type: 'fps_shoot'; x: number; y: number; z: number; dx: number; dy: number; dz: number; weaponId: string }
    | { type: 'fps_hit'; targetId: string; damage: number; weaponId: string; headshot: boolean }
    | { type: 'fps_died'; killerId: string; weaponId: string }
    | { type: 'fps_respawn' }
    | { type: 'fps_chat'; message: string };

// ===== Server → Client Messages =====

export type FPSServerMessage =
    | { type: 'fps_room_created'; roomCode: string; playerId: string; reconnectToken: string }
    | { type: 'fps_joined_room'; roomCode: string; playerId: string; roomState: FPSRoomState; reconnectToken: string }
    | { type: 'fps_room_state'; roomState: FPSRoomState }
    | { type: 'fps_room_list'; rooms: FPSPublicRoom[] }
    | { type: 'fps_player_joined'; player: FPSPlayer }
    | { type: 'fps_player_left'; playerId: string }
    | { type: 'fps_player_ready'; playerId: string; ready: boolean }
    | { type: 'fps_countdown'; count: number }
    | { type: 'fps_game_started'; seed: number }
    | { type: 'fps_player_position'; player: FPSPlayerPosition }
    | { type: 'fps_player_shot'; playerId: string; x: number; y: number; z: number; dx: number; dy: number; dz: number; weaponId: string }
    | { type: 'fps_player_hit'; targetId: string; attackerId: string; damage: number; weaponId: string; headshot: boolean }
    | { type: 'fps_player_died'; playerId: string; killerId: string; weaponId: string }
    | { type: 'fps_player_respawned'; playerId: string }
    | { type: 'fps_chat_message'; playerId: string; playerName: string; message: string }
    | { type: 'fps_error'; message: string; code?: string }
    | { type: 'fps_reconnected'; roomCode: string; playerId: string; roomState: FPSRoomState; reconnectToken: string };

// ===== Firestore Room Document =====

export interface FPSFirestoreRoom {
    code: string;
    name: string;
    hostName: string;
    status: 'open' | 'playing' | 'closed';
    playerCount: number;
    maxPlayers: number;
    createdAt: number;
    updatedAt: number;
}
