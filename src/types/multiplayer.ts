// ===== Player & Room Types =====

export interface Player {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
}

export interface RoomState {
  code: string;
  name: string;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  isPublic: boolean;
}

export interface PublicRoomInfo {
  code: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
}

// ===== Game Actions =====

export type GameAction =
  | { type: 'move'; direction: 'left' | 'right' | 'down' }
  | { type: 'rotate'; direction: 'cw' | 'ccw' }
  | { type: 'hard_drop' }
  | { type: 'hold' };

// ===== Client -> Server Messages =====

export interface CreateRoomMessage {
  type: 'create_room';
  playerName: string;
  roomName?: string;
  isPublic?: boolean;
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

export interface GetRoomsMessage {
  type: 'get_rooms';
}

export interface RelayMessage {
  type: 'relay';
  payload: RelayPayload;
}

export interface PongMessage {
  type: 'pong';
}

export interface ReconnectMessage {
  type: 'reconnect';
  reconnectToken: string;
}

export interface RematchMessage {
  type: 'rematch';
}

export interface QueueRankedMessage {
  type: 'queue_ranked';
  playerName: string;
  rankPoints: number;
}

export interface CancelRankedMessage {
  type: 'cancel_ranked';
}

// Arena client messages (re-exported from arena types for the unified union)
import type { ArenaClientMessage, ArenaServerMessage } from './arena';
import type { MCClientMessage, MCServerMessage as MCBoardServerMessage } from './minecraft-board';
import type { EoEClientMessage } from './echoes';
import type { MWClientMessage } from './minecraft-world';
import type { FPSClientMessage } from './fps-arena';
import type { MSClientMessage } from './minecraft-switch';

export type { ArenaClientMessage, ArenaServerMessage, MCClientMessage, MCBoardServerMessage, MWClientMessage, FPSClientMessage, MSClientMessage };

export type ClientMessage =
  | CreateRoomMessage
  | JoinRoomMessage
  | LeaveRoomMessage
  | SetReadyMessage
  | StartGameMessage
  | GetRoomsMessage
  | RelayMessage
  | PongMessage
  | ReconnectMessage
  | RematchMessage
  | QueueRankedMessage
  | CancelRankedMessage
  | ArenaClientMessage
  | MCClientMessage
  | MWClientMessage
  | EoEClientMessage
  | FPSClientMessage
  | MSClientMessage
  | SetProfileMessage
  | GetOnlineUsersMessage;

// ===== Server -> Client Messages =====

export interface ConnectedMessage {
  type: 'connected';
  playerId: string;
  serverTime: number;
}

export interface RoomCreatedMessage {
  type: 'room_created';
  roomCode: string;
  playerId: string;
  reconnectToken: string;
}

export interface JoinedRoomMessage {
  type: 'joined_room';
  roomCode: string;
  playerId: string;
  roomState: RoomState;
  reconnectToken: string;
}

export interface RoomStateMessage {
  type: 'room_state';
  roomState: RoomState;
}

export interface RoomListMessage {
  type: 'room_list';
  rooms: PublicRoomInfo[];
}

export interface PlayerJoinedMessage {
  type: 'player_joined';
  player: Player;
}

export interface PlayerLeftMessage {
  type: 'player_left';
  playerId: string;
  reason: 'left' | 'disconnected' | 'timeout';
}

export interface PlayerReadyMessage {
  type: 'player_ready';
  playerId: string;
  ready: boolean;
}

export interface CountdownMessage {
  type: 'countdown';
  count: number;
}

export interface GameStartedMessage {
  type: 'game_started';
  gameSeed: number;
  players: string[];
  timestamp: number;
}

export interface RelayedMessage {
  type: 'relayed';
  fromPlayerId: string;
  payload: RelayPayload;
}

export interface PingMessage {
  type: 'ping';
  timestamp: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

export interface ReconnectedMessage {
  type: 'reconnected';
  roomCode: string;
  playerId: string;
  roomState: RoomState;
  reconnectToken: string;
}

export interface RematchStartedMessage {
  type: 'rematch_started';
}

export interface OnlineCountMessage {
  type: 'online_count';
  count: number;
}

export interface OnlineUser {
  name: string;
  icon: string;
}

export interface OnlineUsersMessage {
  type: 'online_users';
  users: OnlineUser[];
}

export interface SetProfileMessage {
  type: 'set_profile';
  name: string;
  icon: string;
  isPrivate?: boolean;
}

export interface GetOnlineUsersMessage {
  type: 'get_online_users';
}

export interface ServerShutdownMessage {
  type: 'server_shutdown';
  message: string;
}

export interface RankedMatchFoundMessage {
  type: 'ranked_match_found';
  roomCode: string;
  opponentName: string;
  opponentId: string;
  isAI: boolean;
  gameSeed: number;
  reconnectToken: string;
}

export interface RankedQueuedMessage {
  type: 'ranked_queued';
  position: number;
}

export type ServerMessage =
  | ConnectedMessage
  | RoomCreatedMessage
  | JoinedRoomMessage
  | RoomStateMessage
  | RoomListMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerReadyMessage
  | CountdownMessage
  | GameStartedMessage
  | RelayedMessage
  | PingMessage
  | ErrorMessage
  | ReconnectedMessage
  | RematchStartedMessage
  | OnlineCountMessage
  | OnlineUsersMessage
  | ServerShutdownMessage
  | RankedMatchFoundMessage
  | RankedQueuedMessage
  | ArenaServerMessage
  | MCBoardServerMessage;

// ===== Relay Payload Types =====
// These are game-specific messages relayed between players

export interface BoardUpdatePayload {
  event: 'board_update';
  board: (BoardCell | null)[][];
  score: number;
  lines: number;
  combo: number;
  piece?: string;
  hold?: string | null;
}

export interface GarbagePayload {
  event: 'garbage';
  lines: number;
}

export interface GameOverPayload {
  event: 'game_over';
}

export interface KOPayload {
  event: 'ko';
  winnerId: string;
  loserId: string;
}

export interface ElementalGarbagePayload {
  event: 'elemental_garbage';
  lines: number;
  element: string;
  reaction?: string;
}

export type RelayPayload =
  | BoardUpdatePayload
  | GarbagePayload
  | GameOverPayload
  | KOPayload
  | ElementalGarbagePayload;

// ===== Shared Game Types =====

export interface BoardCell {
  color: string;
}
