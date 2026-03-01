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
import type { TDPlayerState, TDMultiplayerRoom, EnemyType, TowerType, Tower, Enemy, Projectile, GamePhase } from './tower-defense';

export type { ArenaClientMessage, ArenaServerMessage, MCClientMessage, MCBoardServerMessage, MWClientMessage };

// ===== Tower Defense Multiplayer Messages =====

// --- Client → Server ---

export interface TDCreateRoomMessage {
  type: 'td_create_room';
  playerName: string;
  mapIndex?: number;
}

export interface TDJoinRoomMessage {
  type: 'td_join_room';
  roomCode: string;
  playerName: string;
}

export interface TDLeaveRoomMessage {
  type: 'td_leave_room';
}

export interface TDSetReadyMessage {
  type: 'td_set_ready';
  ready: boolean;
}

export interface TDStartGameMessage {
  type: 'td_start_game';
}

export interface TDPlaceTowerMessage {
  type: 'td_place_tower';
  towerType: TowerType;
  gridX: number;
  gridZ: number;
}

export interface TDSellTowerMessage {
  type: 'td_sell_tower';
  towerId: string;
}

export interface TDUpgradeTowerMessage {
  type: 'td_upgrade_tower';
  towerId: string;
}

export interface TDStartWaveMessage {
  type: 'td_start_wave';
}

export interface TDSendEnemyMessage {
  type: 'td_send_enemy';
  targetPlayerId: string;
  enemyType: EnemyType;
}

export interface TDSelectTargetMessage {
  type: 'td_select_target';
  targetPlayerId: string;
}

export type TDClientMessage =
  | TDCreateRoomMessage
  | TDJoinRoomMessage
  | TDLeaveRoomMessage
  | TDSetReadyMessage
  | TDStartGameMessage
  | TDPlaceTowerMessage
  | TDSellTowerMessage
  | TDUpgradeTowerMessage
  | TDStartWaveMessage
  | TDSendEnemyMessage
  | TDSelectTargetMessage;

// --- Server → Client ---

export interface TDRoomCreatedMessage {
  type: 'td_room_created';
  roomCode: string;
  playerId: string;
}

export interface TDRoomJoinedMessage {
  type: 'td_room_joined';
  roomCode: string;
  room: TDMultiplayerRoom;
}

export interface TDRoomStateMessage {
  type: 'td_room_state';
  room: TDMultiplayerRoom;
}

export interface TDPlayerJoinedMessage {
  type: 'td_player_joined';
  player: TDPlayerState;
}

export interface TDPlayerLeftMessage {
  type: 'td_player_left';
  playerId: string;
}

export interface TDPlayerReadyMessage {
  type: 'td_player_ready';
  playerId: string;
  ready: boolean;
}

export interface TDCountdownMessage {
  type: 'td_countdown';
  seconds: number;
}

export interface TDGameStartedMessage {
  type: 'td_game_started';
  mapIndex: number;
  wave: number;
}

export interface TDStateUpdatePlayer {
  playerId: string;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  gold: number;
  lives: number;
  score: number;
  sendPoints: number;
  phase: GamePhase;
}

export interface TDStateUpdateMessage {
  type: 'td_state_update';
  playerStates: TDStateUpdatePlayer[];
}

export interface TDTowerPlacedMessage {
  type: 'td_tower_placed';
  playerId: string;
  tower: Tower;
}

export interface TDTowerSoldMessage {
  type: 'td_tower_sold';
  playerId: string;
  towerId: string;
}

export interface TDTowerUpgradedMessage {
  type: 'td_tower_upgraded';
  playerId: string;
  towerId: string;
  level: number;
}

export interface TDWaveStartedMessage {
  type: 'td_wave_started';
  waveNumber: number;
}

export interface TDWaveCompleteMessage {
  type: 'td_wave_complete';
  waveNumber: number;
  reward: number;
}

export interface TDEnemySentMessage {
  type: 'td_enemy_sent';
  fromPlayerId: string;
  toPlayerId: string;
  enemyType: EnemyType;
  count: number;
}

export interface TDEnemiesIncomingMessage {
  type: 'td_enemies_incoming';
  fromPlayerName: string;
  enemyType: EnemyType;
  count: number;
}

export interface TDPlayerEliminatedMessage {
  type: 'td_player_eliminated';
  playerId: string;
  rank: number;
}

export interface TDGameOverMessage {
  type: 'td_game_over';
  winnerId: string;
  rankings: Array<{ playerId: string; rank: number; score: number }>;
}

export type TDServerMessage =
  | TDRoomCreatedMessage
  | TDRoomJoinedMessage
  | TDRoomStateMessage
  | TDPlayerJoinedMessage
  | TDPlayerLeftMessage
  | TDPlayerReadyMessage
  | TDCountdownMessage
  | TDGameStartedMessage
  | TDStateUpdateMessage
  | TDTowerPlacedMessage
  | TDTowerSoldMessage
  | TDTowerUpgradedMessage
  | TDWaveStartedMessage
  | TDWaveCompleteMessage
  | TDEnemySentMessage
  | TDEnemiesIncomingMessage
  | TDPlayerEliminatedMessage
  | TDGameOverMessage;

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
  | TDClientMessage
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
  | MCBoardServerMessage
  | TDServerMessage;

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
