/**
 * WebSocket Multiplayer Message Protocol
 * Uses JSON messages with a 'type' field for routing
 */

// Player in a multiplayer room
export interface MultiplayerPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
}

// Room phases
export enum RoomPhase {
  LOBBY = 'lobby',
  READY = 'ready',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

// Room state
export interface RoomStateData {
  roomCode: string;
  hostId: string;
  players: MultiplayerPlayer[];
  phase: RoomPhase;
  maxPlayers: number;
}

export interface PongMessage {
  type: 'pong';
}

// Client to Server Messages
export interface CreateRoomMessage {
  type: 'create_room';
  playerName: string;
}

export interface JoinRoomMessage {
  type: 'join_room';
  roomCode: string;
  playerName: string;
}

export interface LeaveRoomMessage {
  type: 'leave_room';
}

export interface SetReadyMessage {
  type: 'set_ready';
  ready: boolean;
}

export interface StartGameMessage {
  type: 'start_game';
}

export interface RelayMessage {
  type: 'relay';
  payload: any; // Intentionally generic - games can send custom data structures
}

export type ClientMessage =
  | PongMessage
  | CreateRoomMessage
  | JoinRoomMessage
  | LeaveRoomMessage
  | SetReadyMessage
  | StartGameMessage
  | RelayMessage;

// Server to Client Messages
export interface RoomCreatedMessage {
  type: 'room_created';
  roomCode: string;
  playerId: string;
}

export interface JoinedRoomMessage {
  type: 'joined_room';
  roomCode: string;
  playerId: string;
  roomState: RoomStateData;
}

export interface RoomStateMessage {
  type: 'room_state';
  roomState: RoomStateData;
}

export interface PlayerJoinedMessage {
  type: 'player_joined';
  player: MultiplayerPlayer;
}

export interface PlayerLeftMessage {
  type: 'player_left';
  playerId: string;
}

export interface PlayerReadyMessage {
  type: 'player_ready';
  playerId: string;
  ready: boolean;
}

export interface GameStartedMessage {
  type: 'game_started';
}

export interface RelayedMessage {
  type: 'relayed';
  fromPlayerId: string;
  payload: any; // Intentionally generic - games can send custom data structures
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

export interface ConnectedMessage {
  type: 'connected';
  playerId: string;
}

export type ServerMessage =
  | RoomCreatedMessage
  | JoinedRoomMessage
  | RoomStateMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerReadyMessage
  | GameStartedMessage
  | RelayedMessage
  | ErrorMessage
  | ConnectedMessage;

// Configuration
export const MULTIPLAYER_CONFIG = {
  MAX_PLAYERS: 8,
  ROOM_CODE_LENGTH: 6,
  DEFAULT_MAX_PLAYERS: 4,
};
