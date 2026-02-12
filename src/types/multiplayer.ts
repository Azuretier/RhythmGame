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

// Arena client messages (sent on the same WebSocket)
export interface ArenaGenericMessage {
  type:
    | 'create_arena'
    | 'join_arena'
    | 'queue_arena'
    | 'cancel_arena_queue'
    | 'arena_ready'
    | 'arena_start'
    | 'arena_action'
    | 'arena_relay'
    | 'arena_leave';
  [key: string]: unknown;
}

// Minecraft Board Game client messages
export interface MCBoardGenericMessage {
  type:
    | 'mc_create_room'
    | 'mc_join_room'
    | 'mc_get_rooms'
    | 'mc_leave'
    | 'mc_ready'
    | 'mc_start'
    | 'mc_move'
    | 'mc_mine'
    | 'mc_cancel_mine'
    | 'mc_craft'
    | 'mc_attack'
    | 'mc_place_block'
    | 'mc_eat'
    | 'mc_select_slot'
    | 'mc_chat';
  [key: string]: unknown;
}

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
  | ArenaGenericMessage
  | MCBoardGenericMessage;

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
  | ServerShutdownMessage
  | RankedMatchFoundMessage
  | RankedQueuedMessage;

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

export type RelayPayload =
  | BoardUpdatePayload
  | GarbagePayload
  | GameOverPayload
  | KOPayload;

// ===== Shared Game Types =====

export interface BoardCell {
  color: string;
}
