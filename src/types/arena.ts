// ===== Arena Types — 9-Player Multiplayer Arena =====
// All nine players participate simultaneously with shared tempo,
// synchronized music, communal gimmicks, and a chaos system.

import type { BoardCell } from './multiplayer';

// ===== Arena Constants =====

export const ARENA_MAX_PLAYERS = 9;
export const ARENA_MIN_PLAYERS = 3;
export const ARENA_QUEUE_TIMEOUT = 30000; // 30s before filling with AI
export const ARENA_TICK_RATE = 10; // Server ticks per second
export const ARENA_BASE_BPM = 120;
export const ARENA_CHAOS_DECAY_RATE = 0.5; // Per second
export const ARENA_CHAOS_GIMMICK_THRESHOLD = 40;
export const ARENA_CHAOS_FRENZY_THRESHOLD = 75;
export const ARENA_TEMPO_COLLAPSE_THRESHOLD = 0.3; // If avg sync < 30%, tempo collapses

// ===== Arena Player =====

export interface ArenaPlayer {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  alive: boolean;
  score: number;
  lines: number;
  combo: number;
  /** 0.0 - 1.0: how well this player is synced to the beat */
  syncAccuracy: number;
  /** Contribution to the chaos meter this tick */
  chaosContribution: number;
  /** Number of eliminations this player caused */
  kills: number;
  placement: number | null;
}

// ===== Arena Room State =====

export interface ArenaRoomState {
  code: string;
  name: string;
  hostId: string;
  players: ArenaPlayer[];
  status: 'waiting' | 'countdown' | 'playing' | 'ended';
  maxPlayers: number;
  /** Current global BPM — authoritative from server */
  bpm: number;
  /** Current beat phase 0.0-1.0 for sync reference */
  beatPhase: number;
  /** Global chaos meter 0-100 */
  chaosLevel: number;
  /** Active gimmick, if any */
  activeGimmick: ArenaGimmick | null;
  /** Number of players still alive */
  aliveCount: number;
  /** Total elapsed time in ms since game start */
  elapsedMs: number;
}

// ===== Gimmick System =====

export type GimmickType =
  | 'tempo_shift'      // BPM suddenly changes (faster or slower)
  | 'gravity_surge'    // All pieces fall much faster
  | 'mirror_mode'      // Controls are reversed for everyone
  | 'garbage_rain'     // Everyone receives garbage lines
  | 'blackout'         // Brief screen dimming / visibility reduction
  | 'speed_frenzy'     // Everything speeds up dramatically
  | 'freeze_frame'     // Brief input delay for all
  | 'shuffle_preview'; // Next piece queues get shuffled

export interface ArenaGimmick {
  type: GimmickType;
  /** Duration in milliseconds */
  durationMs: number;
  /** Intensity 1-3, affects severity */
  intensity: number;
  /** Timestamp when gimmick started */
  startedAt: number;
  /** Additional data depending on type */
  data?: Record<string, number | string | boolean>;
}

export const GIMMICK_DURATIONS: Record<GimmickType, number> = {
  tempo_shift: 8000,
  gravity_surge: 5000,
  mirror_mode: 6000,
  garbage_rain: 1000, // Instant burst
  blackout: 3000,
  speed_frenzy: 5000,
  freeze_frame: 2000,
  shuffle_preview: 1000, // Instant
};

export const GIMMICK_WEIGHTS: Record<GimmickType, number> = {
  tempo_shift: 20,
  gravity_surge: 15,
  mirror_mode: 10,
  garbage_rain: 20,
  blackout: 10,
  speed_frenzy: 15,
  freeze_frame: 5,
  shuffle_preview: 5,
};

// ===== Action Types (player → server) =====

export type ArenaActionType =
  | 'piece_placed'
  | 'line_clear'
  | 'hard_drop'
  | 'combo'
  | 't_spin'
  | 'tetris_clear'  // 4-line clear
  | 'game_over';

export interface ArenaAction {
  action: ArenaActionType;
  /** Beat phase when action occurred (client-reported) */
  beatPhase: number;
  /** Additional context */
  value?: number;
}

// ===== Client → Server Messages =====

export interface CreateArenaMessage {
  type: 'create_arena';
  playerName: string;
  roomName?: string;
}

export interface JoinArenaMessage {
  type: 'join_arena';
  arenaCode: string;
  playerName: string;
}

export interface QueueArenaMessage {
  type: 'queue_arena';
  playerName: string;
}

export interface CancelArenaQueueMessage {
  type: 'cancel_arena_queue';
}

export interface ArenaReadyMessage {
  type: 'arena_ready';
  ready: boolean;
}

export interface ArenaStartMessage {
  type: 'arena_start';
}

export interface ArenaActionMessage {
  type: 'arena_action';
  action: ArenaAction;
}

export interface ArenaRelayMessage {
  type: 'arena_relay';
  payload: ArenaBoardPayload;
}

export interface ArenaLeaveMessage {
  type: 'arena_leave';
}

export type ArenaClientMessage =
  | CreateArenaMessage
  | JoinArenaMessage
  | QueueArenaMessage
  | CancelArenaQueueMessage
  | ArenaReadyMessage
  | ArenaStartMessage
  | ArenaActionMessage
  | ArenaRelayMessage
  | ArenaLeaveMessage;

// ===== Server → Client Messages =====

export interface ArenaCreatedMessage {
  type: 'arena_created';
  arenaCode: string;
  playerId: string;
  reconnectToken: string;
}

export interface ArenaJoinedMessage {
  type: 'arena_joined';
  arenaCode: string;
  playerId: string;
  arenaState: ArenaRoomState;
  reconnectToken: string;
}

export interface ArenaStateMessage {
  type: 'arena_state';
  arenaState: ArenaRoomState;
}

export interface ArenaPlayerJoinedMessage {
  type: 'arena_player_joined';
  player: ArenaPlayer;
}

export interface ArenaPlayerLeftMessage {
  type: 'arena_player_left';
  playerId: string;
}

export interface ArenaCountdownMessage {
  type: 'arena_countdown';
  count: number;
}

export interface ArenaStartedMessage {
  type: 'arena_started';
  gameSeed: number;
  bpm: number;
  serverTime: number;
  players: string[];
}

export interface ArenaTempoMessage {
  type: 'arena_tempo';
  bpm: number;
  beatPhase: number;
  /** Server timestamp for sync calibration */
  serverTime: number;
}

export interface ArenaGimmickMessage {
  type: 'arena_gimmick';
  gimmick: ArenaGimmick;
}

export interface ArenaChaosMessage {
  type: 'arena_chaos';
  chaosLevel: number;
  /** Per-player sync accuracy array */
  syncMap: Record<string, number>;
}

export interface ArenaPlayerActionMessage {
  type: 'arena_player_action';
  playerId: string;
  playerName: string;
  action: ArenaAction;
  /** Whether this action was on-beat */
  onBeat: boolean;
}

export interface ArenaPlayerEliminatedMessage {
  type: 'arena_player_eliminated';
  playerId: string;
  playerName: string;
  placement: number;
  eliminatedBy: string | null;
}

export interface ArenaRelayedMessage {
  type: 'arena_relayed';
  fromPlayerId: string;
  payload: ArenaBoardPayload;
}

export interface ArenaSessionEndMessage {
  type: 'arena_session_end';
  reason: 'last_standing' | 'tempo_collapse' | 'chaos_overload';
  winnerId: string | null;
  winnerName: string | null;
  rankings: ArenaRanking[];
  /** Final stats */
  stats: ArenaSessionStats;
}

export interface ArenaQueuedMessage {
  type: 'arena_queued';
  position: number;
  queueSize: number;
}

export interface ArenaTempoCollapseMessage {
  type: 'arena_tempo_collapse';
  /** Current average sync across all players */
  avgSync: number;
  /** How much BPM is deviating */
  bpmDeviation: number;
}

export type ArenaServerMessage =
  | ArenaCreatedMessage
  | ArenaJoinedMessage
  | ArenaStateMessage
  | ArenaPlayerJoinedMessage
  | ArenaPlayerLeftMessage
  | ArenaCountdownMessage
  | ArenaStartedMessage
  | ArenaTempoMessage
  | ArenaGimmickMessage
  | ArenaChaosMessage
  | ArenaPlayerActionMessage
  | ArenaPlayerEliminatedMessage
  | ArenaRelayedMessage
  | ArenaSessionEndMessage
  | ArenaQueuedMessage
  | ArenaTempoCollapseMessage;

// ===== Relay Payload =====

export interface ArenaBoardPayload {
  board: (BoardCell | null)[][];
  score: number;
  lines: number;
  combo: number;
  piece?: string;
  hold?: string | null;
  alive: boolean;
}

// ===== Session Stats =====

export interface ArenaRanking {
  playerId: string;
  playerName: string;
  placement: number;
  score: number;
  lines: number;
  kills: number;
  avgSync: number;
}

export interface ArenaSessionStats {
  totalDurationMs: number;
  peakChaos: number;
  totalGimmicks: number;
  tempoCollapses: number;
  peakBpm: number;
  lowestBpm: number;
}
