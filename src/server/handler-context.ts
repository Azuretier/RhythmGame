import type { WebSocket } from 'ws';
import type { ServerMessage, ErrorMessage } from '../types/multiplayer';
import type { MultiplayerRoomManager } from '../lib/multiplayer/RoomManager';
import type { ArenaRoomManager } from '../lib/arena/ArenaManager';
import type { MinecraftBoardManager } from '../lib/minecraft-board/MinecraftBoardManager';
import type { MinecraftWorldManager } from '../lib/minecraft-world/MinecraftWorldManager';
import type { FPSArenaManager } from '../lib/fps-arena/FPSArenaManager';
import type { EoEManager } from '../lib/echoes/EoEManager';
import type { MinecraftSwitchManager } from '../lib/minecraft-switch/MinecraftSwitchManager';

// Player connection tracking
export interface PlayerConnection {
  ws: WebSocket;
  isAlive: boolean;
  lastActivity: number;
  reconnectToken?: string;
  profileName?: string;
  profileIcon?: string;
  profilePrivate?: boolean;
}

// Ranked matchmaking queue entry
export interface QueuedPlayer {
  playerId: string;
  playerName: string;
  rankPoints: number;
  queuedAt: number;
}

// Arena matchmaking queue entry
export interface ArenaQueuedPlayer {
  playerId: string;
  playerName: string;
  queuedAt: number;
}

// Shared context passed to all handler modules
export interface HandlerContext {
  // Shared state
  playerConnections: Map<string, PlayerConnection>;
  reconnectTokens: Map<string, { playerId: string; expires: number }>;
  disconnectTimers: Map<string, NodeJS.Timeout>;

  // Managers
  roomManager: MultiplayerRoomManager;
  arenaManager: ArenaRoomManager;
  mcBoardManager: MinecraftBoardManager;
  mwManager: MinecraftWorldManager;
  fpsManager: FPSArenaManager;
  eoeManager: EoEManager;
  mcsManager: MinecraftSwitchManager;

  // Ranked state
  rankedQueue: Map<string, QueuedPlayer>;
  rankedTimers: Map<string, NodeJS.Timeout>;
  rankedRetryIntervals: Map<string, ReturnType<typeof setInterval>>;

  // Arena queue state
  arenaQueue: Map<string, ArenaQueuedPlayer>;
  arenaQueueTimers: Map<string, NodeJS.Timeout>;

  // Countdown tracking
  activeCountdowns: Map<string, ReturnType<typeof setTimeout>>;

  // Utility functions
  sendToPlayer: (playerId: string, message: ServerMessage) => boolean;
  sendError: (playerId: string, message: string, code?: string) => void;
  broadcastToRoom: (roomCode: string, message: ServerMessage, excludePlayerId?: string) => void;
  broadcastOnlineCount: () => void;
  sendRoomState: (roomCode: string) => void;
  issueReconnectToken: (playerId: string) => string;

  // Arena helpers
  broadcastToArena: (roomCode: string, message: ServerMessage, excludePlayerId?: string) => void;
  sendArenaState: (roomCode: string) => void;
  startArenaCountdown: (roomCode: string, gameSeed: number) => void;
  tryFormArenaMatch: () => boolean;
  clearArenaTimer: (playerId: string) => void;

  // MC Board helpers
  broadcastToMCBoard: (roomCode: string, message: ServerMessage, excludePlayerId?: string) => void;
  sendMCBoardRoomState: (roomCode: string) => void;
  startMCBoardCountdown: (roomCode: string, gameSeed: number) => void;

  // MC World helpers
  broadcastToMW: (roomCode: string, message: ServerMessage, excludePlayerId?: string) => void;
  sendMWRoomState: (roomCode: string) => void;
  startMWCountdown: (roomCode: string, gameSeed: number) => void;

  // FPS helpers
  broadcastToFPS: (roomCode: string, message: ServerMessage, excludePlayerId?: string) => void;
  sendFPSRoomState: (roomCode: string) => void;
  startFPSCountdown: (roomCode: string, gameSeed: number) => void;

  // MC Switch helpers
  broadcastToMCS: (roomCode: string, message: ServerMessage, excludePlayerId?: string) => void;
  sendMCSRoomState: (roomCode: string) => void;
  startMCSCountdown: (roomCode: string, gameSeed: number) => void;

  // Countdown helpers
  startCountdown: (roomCode: string, gameSeed: number) => void;
  cancelCountdown: (roomCode: string) => void;

  // Ranked helpers
  tryRankedMatch: (playerId: string) => boolean;
  spawnAIMatch: (playerId: string) => void;
  clearRankedTimer: (playerId: string) => void;
  clearRankedRetryInterval: (playerId: string) => void;

  // Disconnect handler
  handleDisconnect: (playerId: string, reason: string) => void;

  // Notification
  notifyPlayerOnline: (name: string, icon: string, count: number) => void;

  // Constants
  COUNTDOWN_SECONDS: number;
  RANKED_MATCH_TIMEOUT: number;
  RANKED_POINT_RANGE: number;
}
