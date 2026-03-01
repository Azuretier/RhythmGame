import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import type { IncomingMessage } from 'http';
import { MultiplayerRoomManager } from './src/lib/multiplayer/RoomManager';
import { ArenaRoomManager } from './src/lib/arena/ArenaManager';
import { MinecraftBoardManager } from './src/lib/minecraft-board/MinecraftBoardManager';
import { EoEManager } from './src/lib/echoes/EoEManager';
import { MinecraftWorldManager } from './src/lib/minecraft-world/MinecraftWorldManager';
import { FPSArenaManager } from './src/lib/fps-arena/FPSArenaManager';
import { MinecraftSwitchManager } from './src/lib/minecraft-switch/MinecraftSwitchManager';
import { WarfrontManager } from './src/lib/warfront/WarfrontManager';
import { notifyPlayerOnline, cleanupNotificationCooldowns } from './src/lib/discord-bot/notifications';
import type {
  ClientMessage,
  ServerMessage,
  ErrorMessage,
  SetProfileMessage,
} from './src/types/multiplayer';
import type { EoEServerMessage } from './src/types/echoes';
import {
  ARENA_MAX_PLAYERS,
} from './src/types/arena';

// Handler imports
import type { HandlerContext, PlayerConnection, QueuedPlayer, ArenaQueuedPlayer } from './src/server/handler-context';
import { handleRhythmiaMessage } from './src/server/handlers/rhythmia';
import { handleArenaMessage } from './src/server/handlers/arena';
import { handleMinecraftBoardMessage } from './src/server/handlers/minecraft-board';
import { handleMinecraftWorldMessage } from './src/server/handlers/minecraft-world';
import { handleFPSArenaMessage } from './src/server/handlers/fps-arena';
import { handleEoEMessage } from './src/server/handlers/echoes';
import { handleWarfrontMessage } from './src/server/handlers/warfront';
import { handleMinecraftSwitchMessage } from './src/server/handlers/minecraft-switch';
import type { WarfrontHandlerContext } from './src/server/handlers/warfront';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'null', 'file://'];

// Timing constants
const HEARTBEAT_INTERVAL = 15000;
const CLIENT_TIMEOUT = 45000;
const RECONNECT_GRACE_PERIOD = 60000;
const COUNTDOWN_SECONDS = 3;

// Initialize room manager
const roomManager = new MultiplayerRoomManager();

// Ranked matchmaking constants
const RANKED_MATCH_TIMEOUT = 8000;
const RANKED_POINT_RANGE = 500;

// Global state
const playerConnections = new Map<string, PlayerConnection>();
const reconnectTokens = new Map<string, { playerId: string; expires: number }>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();
const rankedQueue: Map<string, QueuedPlayer> = new Map();
const rankedTimers: Map<string, NodeJS.Timeout> = new Map();
const rankedRetryIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

// ===== Arena System =====

const arenaManager = new ArenaRoomManager({
  onBroadcast: (roomCode, message, excludePlayerId) => {
    broadcastToArena(roomCode, message as ServerMessage, excludePlayerId);
  },
  onSendToPlayer: (playerId, message) => {
    sendToPlayer(playerId, message as ServerMessage);
  },
  onSessionEnd: (roomCode) => {
    console.log(`[ARENA] Session ended in room ${roomCode}`);
  },
});

const arenaQueue: Map<string, ArenaQueuedPlayer> = new Map();
const arenaQueueTimers: Map<string, NodeJS.Timeout> = new Map();

// ===== Minecraft Board Game System =====

const mcBoardManager = new MinecraftBoardManager({
  onSendToPlayer: (playerId, message) => {
    sendToPlayer(playerId, message);
  },
  onBroadcastToRoom: (roomCode, message, excludePlayerId) => {
    broadcastToMCBoard(roomCode, message, excludePlayerId);
  },
});

// ===== Minecraft World System =====

const mwManager = new MinecraftWorldManager({
  onSendToPlayer: (playerId, message) => {
    sendToPlayer(playerId, message);
  },
  onBroadcastToRoom: (roomCode, message, excludePlayerId) => {
    broadcastToMW(roomCode, message, excludePlayerId);
  },
});

// ===== FPS Arena System =====

const fpsManager = new FPSArenaManager({
  onSendToPlayer: (playerId, message) => {
    sendToPlayer(playerId, message);
  },
  onBroadcastToRoom: (roomCode, message, excludePlayerId) => {
    broadcastToFPS(roomCode, message, excludePlayerId);
  },
});

// ===== Minecraft Switch System =====

const mcsManager = new MinecraftSwitchManager({
  onSendToPlayer: (playerId, message) => {
    sendToPlayer(playerId, message);
  },
  onBroadcastToRoom: (roomCode, message, excludePlayerId) => {
    broadcastToMCS(roomCode, message, excludePlayerId);
  },
});

// ===== Echoes of Eternity System =====

const eoeManager = new EoEManager({
  onBroadcast: (roomCode, message) => {
    broadcastToEoE(roomCode, message);
  },
  onSendToPlayer: (playerId, message) => {
    sendToPlayer(playerId, message as unknown as ServerMessage);
  },
  onSessionEnd: (roomCode) => {
    console.log(`[EOE] Session ended in room ${roomCode}`);
  },
});

// ===== Warfront System =====

const wfManager = new WarfrontManager({
  onSendToPlayer: (playerId, message) => {
    sendToPlayer(playerId, message as unknown as ServerMessage);
  },
  onBroadcastToRoom: (roomCode, message, excludePlayerId) => {
    broadcastToWF(roomCode, message as unknown as ServerMessage, excludePlayerId);
  },
});

// Countdown timers
const activeCountdowns = new Map<string, ReturnType<typeof setTimeout>>();

// ===== Utility Functions =====

function generatePlayerId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateReconnectToken(): string {
  return `rt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function sendToPlayer(playerId: string, message: ServerMessage): boolean {
  const conn = playerConnections.get(playerId);
  if (conn && conn.ws.readyState === WebSocket.OPEN) {
    try {
      conn.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[SEND] Failed for ${playerId}:`, error);
      conn.ws.terminate();
      handleDisconnect(playerId, 'send_failed');
      return false;
    }
  }
  return false;
}

function broadcastToRoom(roomCode: string, message: ServerMessage, excludePlayerId?: string): void {
  const playerIds = roomManager.getPlayerIdsInRoom(roomCode);
  for (const pid of playerIds) {
    if (pid !== excludePlayerId) {
      sendToPlayer(pid, message);
    }
  }
}

function broadcastOnlineCount(): void {
  const count = playerConnections.size;
  const users = getOnlineUsers();
  const countMsg = JSON.stringify({ type: 'online_count', count } as ServerMessage);
  const usersMsg = JSON.stringify({ type: 'online_users', users } as ServerMessage);
  playerConnections.forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      try {
        conn.ws.send(countMsg);
        conn.ws.send(usersMsg);
      } catch { }
    }
  });
}

function getOnlineUsers(): { name: string; icon: string }[] {
  const users: { name: string; icon: string }[] = [];
  playerConnections.forEach((conn) => {
    if (conn.profileName && conn.ws.readyState === WebSocket.OPEN && !conn.profilePrivate) {
      users.push({ name: conn.profileName, icon: conn.profileIcon || '' });
    }
  });
  return users;
}

function sendError(playerId: string, message: string, code?: string): void {
  const msg: ErrorMessage = { type: 'error', message, code };
  sendToPlayer(playerId, msg);
}

function sendRoomState(roomCode: string): void {
  const roomState = roomManager.getRoomState(roomCode);
  if (roomState) {
    broadcastToRoom(roomCode, { type: 'room_state', roomState });
  }
}

function issueReconnectToken(playerId: string): string {
  const conn = playerConnections.get(playerId);
  const token = generateReconnectToken();
  if (conn) {
    conn.reconnectToken = token;
  }
  reconnectTokens.set(token, {
    playerId,
    expires: Date.now() + RECONNECT_GRACE_PERIOD,
  });
  return token;
}

// ===== Arena Helpers =====

function broadcastToArena(roomCode: string, message: ServerMessage, excludePlayerId?: string): void {
  const playerIds = arenaManager.getPlayerIdsInRoom(roomCode);
  for (const pid of playerIds) {
    if (pid !== excludePlayerId) {
      sendToPlayer(pid, message);
    }
  }
}

function sendArenaState(roomCode: string): void {
  const arenaState = arenaManager.getRoomState(roomCode);
  if (arenaState) {
    broadcastToArena(roomCode, { type: 'arena_state', arenaState } as ServerMessage);
  }
}

function startArenaCountdown(roomCode: string, gameSeed: number): void {
  const playerIds = arenaManager.getPlayerIdsInRoom(roomCode);
  let count = COUNTDOWN_SECONDS;

  const tick = () => {
    if (count > 0) {
      broadcastToArena(roomCode, { type: 'arena_countdown', count } as ServerMessage);
      count--;
      setTimeout(tick, 1000);
    } else {
      arenaManager.beginPlaying(roomCode);
      const arenaState = arenaManager.getRoomState(roomCode);
      broadcastToArena(roomCode, {
        type: 'arena_started',
        gameSeed,
        bpm: arenaState?.bpm || 120,
        serverTime: Date.now(),
        players: playerIds,
      } as ServerMessage);
      sendArenaState(roomCode);
      console.log(`[ARENA] Game started in room ${roomCode} with ${playerIds.length} players`);
    }
  };

  tick();
}

function tryFormArenaMatch(): boolean {
  if (arenaQueue.size < 3) return false;

  const players: ArenaQueuedPlayer[] = [];
  for (const [, queued] of arenaQueue) {
    players.push(queued);
    if (players.length >= ARENA_MAX_PLAYERS) break;
  }

  if (players.length < 3) return false;

  const host = players[0];
  const { roomCode } = arenaManager.createRoom(host.playerId, host.playerName);

  arenaQueue.delete(host.playerId);
  clearArenaTimer(host.playerId);

  const hostToken = issueReconnectToken(host.playerId);
  sendToPlayer(host.playerId, {
    type: 'arena_created',
    arenaCode: roomCode,
    playerId: host.playerId,
    reconnectToken: hostToken,
  } as ServerMessage);

  for (let i = 1; i < players.length; i++) {
    const p = players[i];
    arenaQueue.delete(p.playerId);
    clearArenaTimer(p.playerId);

    const joinResult = arenaManager.joinRoom(roomCode, p.playerId, p.playerName);
    if (joinResult.success) {
      const token = issueReconnectToken(p.playerId);
      const arenaState = arenaManager.getRoomState(roomCode);
      sendToPlayer(p.playerId, {
        type: 'arena_joined',
        arenaCode: roomCode,
        playerId: p.playerId,
        arenaState,
        reconnectToken: token,
      } as ServerMessage);
    }
  }

  setTimeout(() => {
    for (const p of players) {
      arenaManager.setPlayerReady(p.playerId, true);
    }
    const startResult = arenaManager.startGame(host.playerId);
    if (startResult.success && startResult.gameSeed) {
      sendArenaState(roomCode);
      startArenaCountdown(roomCode, startResult.gameSeed);
    }
  }, 2000);

  console.log(`[ARENA] Match formed with ${players.length} players (Room: ${roomCode})`);
  return true;
}

function clearArenaTimer(playerId: string): void {
  const timer = arenaQueueTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    arenaQueueTimers.delete(playerId);
  }
}

// ===== MC Board Helpers =====

function broadcastToMCBoard(roomCode: string, message: ServerMessage, excludePlayerId?: string): void {
  const playerIds = mcBoardManager.getPlayerIdsInRoom(roomCode);
  for (const pid of playerIds) {
    if (pid !== excludePlayerId) {
      sendToPlayer(pid, message);
    }
  }
}

function sendMCBoardRoomState(roomCode: string): void {
  const roomState = mcBoardManager.getRoomState(roomCode);
  if (roomState) {
    broadcastToMCBoard(roomCode, { type: 'mc_room_state', roomState } as ServerMessage);
  }
}

function startMCBoardCountdown(roomCode: string, gameSeed: number): void {
  let count = COUNTDOWN_SECONDS;
  const tick = () => {
    if (count > 0) {
      broadcastToMCBoard(roomCode, { type: 'mc_countdown', count } as ServerMessage);
      count--;
      setTimeout(tick, 1000);
    } else {
      broadcastToMCBoard(roomCode, { type: 'mc_game_started', seed: gameSeed } as ServerMessage);
      try {
        mcBoardManager.beginPlaying(roomCode);
      } catch (err) {
        console.error(`[MC_BOARD] beginPlaying failed for room ${roomCode}:`, err);
        broadcastToMCBoard(roomCode, { type: 'mc_error', message: 'Failed to start game' } as ServerMessage);
      }
      console.log(`[MC_BOARD] Game started in room ${roomCode}`);
    }
  };
  tick();
}

// ===== MC World Helpers =====

function broadcastToMW(roomCode: string, message: ServerMessage, excludePlayerId?: string): void {
  const playerIds = mwManager.getPlayerIdsInRoom(roomCode);
  for (const pid of playerIds) {
    if (pid !== excludePlayerId) {
      sendToPlayer(pid, message);
    }
  }
}

function sendMWRoomState(roomCode: string): void {
  const roomState = mwManager.getRoomState(roomCode);
  if (roomState) {
    broadcastToMW(roomCode, { type: 'mw_room_state', roomState } as unknown as ServerMessage);
  }
}

function startMWCountdown(roomCode: string, gameSeed: number): void {
  let count = COUNTDOWN_SECONDS;
  const tick = () => {
    if (count > 0) {
      broadcastToMW(roomCode, { type: 'mw_countdown', count } as unknown as ServerMessage);
      count--;
      setTimeout(tick, 1000);
    } else {
      broadcastToMW(roomCode, { type: 'mw_game_started', seed: gameSeed } as unknown as ServerMessage);
      mwManager.beginPlaying(roomCode);
      console.log(`[MW] Game started in room ${roomCode} with seed ${gameSeed}`);
    }
  };
  tick();
}

// ===== FPS Helpers =====

function broadcastToFPS(roomCode: string, message: ServerMessage, excludePlayerId?: string): void {
  const playerIds = fpsManager.getPlayerIdsInRoom(roomCode);
  for (const pid of playerIds) {
    if (pid !== excludePlayerId) {
      sendToPlayer(pid, message);
    }
  }
}

function sendFPSRoomState(roomCode: string): void {
  const roomState = fpsManager.getRoomState(roomCode);
  if (roomState) {
    broadcastToFPS(roomCode, { type: 'fps_room_state', roomState } as unknown as ServerMessage);
  }
}

function startFPSCountdown(roomCode: string, gameSeed: number): void {
  let count = COUNTDOWN_SECONDS;
  const tick = () => {
    if (count > 0) {
      broadcastToFPS(roomCode, { type: 'fps_countdown', count } as unknown as ServerMessage);
      count--;
      setTimeout(tick, 1000);
    } else {
      broadcastToFPS(roomCode, { type: 'fps_game_started', seed: gameSeed } as unknown as ServerMessage);
      fpsManager.beginPlaying(roomCode);
      console.log(`[FPS] Game started in room ${roomCode} with seed ${gameSeed}`);
    }
  };
  tick();
}

// ===== Warfront Helpers =====

function broadcastToWF(roomCode: string, message: ServerMessage, excludePlayerId?: string): void {
  const playerIds = wfManager.getPlayerIdsInRoom(roomCode);
  for (const pid of playerIds) {
    if (pid !== excludePlayerId) {
      sendToPlayer(pid, message);
    }
  }
}

function sendWFRoomState(roomCode: string): void {
  const roomState = wfManager.getRoomState(roomCode);
  if (roomState) {
    broadcastToWF(roomCode, { type: 'wf_room_state', roomState } as unknown as ServerMessage);
  }
}

// ===== Minecraft Switch Helpers =====

function broadcastToMCS(roomCode: string, message: ServerMessage, excludePlayerId?: string): void {
  const playerIds = mcsManager.getPlayerIdsInRoom(roomCode);
  for (const pid of playerIds) {
    if (pid !== excludePlayerId) {
      sendToPlayer(pid, message);
    }
  }
}

function sendMCSRoomState(roomCode: string): void {
  const roomState = mcsManager.getRoomState(roomCode);
  if (roomState) {
    broadcastToMCS(roomCode, { type: 'ms_room_state', roomState } as unknown as ServerMessage);
  }
}

function startMCSCountdown(roomCode: string, gameSeed: number): void {
  let count = COUNTDOWN_SECONDS;
  const tick = () => {
    if (count > 0) {
      broadcastToMCS(roomCode, { type: 'ms_countdown', count } as unknown as ServerMessage);
      count--;
      setTimeout(tick, 1000);
    } else {
      const roomState = mcsManager.getRoomState(roomCode);
      broadcastToMCS(roomCode, {
        type: 'ms_game_started',
        seed: gameSeed,
        worldType: roomState?.worldType || 'default',
      } as unknown as ServerMessage);
      mcsManager.beginPlaying(roomCode);
      console.log(`[MCS] Game started in room ${roomCode} with seed ${gameSeed}`);
    }
  };
  tick();
}

// ===== EoE Helpers =====

function broadcastToEoE(roomCode: string, message: EoEServerMessage): void {
  const room = eoeManager.getRoomByCode(roomCode);
  if (!room) return;
  for (const playerId of room.players.keys()) {
    sendToPlayer(playerId, message as unknown as ServerMessage);
  }
}

// ===== Countdown Logic =====

function cancelCountdown(roomCode: string): void {
  const timer = activeCountdowns.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    activeCountdowns.delete(roomCode);
  }
}

function startCountdown(roomCode: string, gameSeed: number): void {
  cancelCountdown(roomCode);
  const playerIds = roomManager.getPlayerIdsInRoom(roomCode);
  let count = COUNTDOWN_SECONDS;

  const tick = () => {
    const room = roomManager.getRoomByPlayerId(playerIds[0]);
    if (!room || room.code !== roomCode) {
      activeCountdowns.delete(roomCode);
      return;
    }

    if (count > 0) {
      broadcastToRoom(roomCode, { type: 'countdown', count });
      count--;
      const timer = setTimeout(tick, 1000);
      activeCountdowns.set(roomCode, timer);
    } else {
      activeCountdowns.delete(roomCode);
      roomManager.setRoomPlaying(roomCode);
      broadcastToRoom(roomCode, {
        type: 'game_started',
        gameSeed,
        players: playerIds,
        timestamp: Date.now(),
      });
      sendRoomState(roomCode);
      console.log(`[GAME] Started in room ${roomCode} with ${playerIds.length} players`);
    }
  };

  tick();
}

// ===== Ranked Matchmaking =====

function tryRankedMatch(playerId: string): boolean {
  const queued = rankedQueue.get(playerId);
  if (!queued) return false;

  const now = Date.now();

  for (const [otherId, other] of rankedQueue) {
    if (otherId === playerId) continue;
    const pointDiff = Math.abs(queued.rankPoints - other.rankPoints);
    const elapsedSelf = now - queued.queuedAt;
    const elapsedOther = now - other.queuedAt;
    const selfRange = RANKED_POINT_RANGE + Math.floor(elapsedSelf / 1000) * 200;
    const otherRange = RANKED_POINT_RANGE + Math.floor(elapsedOther / 1000) * 200;
    if (pointDiff <= selfRange && pointDiff <= otherRange) {
      createRankedRoom(playerId, queued, otherId, other);
      return true;
    }
  }
  return false;
}

function createRankedRoom(
  player1Id: string, player1: QueuedPlayer,
  player2Id: string, player2: QueuedPlayer,
): void {
  rankedQueue.delete(player1Id);
  rankedQueue.delete(player2Id);
  clearRankedTimer(player1Id);
  clearRankedTimer(player2Id);

  const existing1 = roomManager.getRoomByPlayerId(player1Id);
  if (existing1) {
    const oldCode1 = existing1.code;
    roomManager.removePlayerFromRoom(player1Id);
    broadcastToRoom(oldCode1, { type: 'player_left', playerId: player1Id, reason: 'left' });
    sendRoomState(oldCode1);
  }
  const existing2 = roomManager.getRoomByPlayerId(player2Id);
  if (existing2) {
    const oldCode2 = existing2.code;
    roomManager.removePlayerFromRoom(player2Id);
    broadcastToRoom(oldCode2, { type: 'player_left', playerId: player2Id, reason: 'left' });
    sendRoomState(oldCode2);
  }

  const { roomCode } = roomManager.createRoom(player1Id, player1.playerName, 'Ranked Match', false, 2);
  roomManager.joinRoom(roomCode, player2Id, player2.playerName);

  const gameSeed = Math.floor(Math.random() * 2147483647);
  const token1 = issueReconnectToken(player1Id);
  const token2 = issueReconnectToken(player2Id);

  sendToPlayer(player1Id, {
    type: 'ranked_match_found',
    roomCode,
    opponentName: player2.playerName,
    opponentId: player2Id,
    isAI: false,
    gameSeed,
    reconnectToken: token1,
  });

  sendToPlayer(player2Id, {
    type: 'ranked_match_found',
    roomCode,
    opponentName: player1.playerName,
    opponentId: player1Id,
    isAI: false,
    gameSeed,
    reconnectToken: token2,
  });

  setTimeout(() => {
    roomManager.setPlayerReady(player1Id, true);
    roomManager.setPlayerReady(player2Id, true);
    const startResult = roomManager.startGame(player1Id);
    if (startResult.success && startResult.gameSeed) {
      sendRoomState(roomCode);
      startCountdown(roomCode, gameSeed);
    }
  }, 1500);

  console.log(`[RANKED] Match created: ${player1.playerName} vs ${player2.playerName} (Room: ${roomCode})`);
}

function spawnAIMatch(playerId: string): void {
  const queued = rankedQueue.get(playerId);
  if (!queued) return;

  rankedQueue.delete(playerId);
  clearRankedTimer(playerId);

  const existing = roomManager.getRoomByPlayerId(playerId);
  if (existing) {
    const oldCode = existing.code;
    roomManager.removePlayerFromRoom(playerId);
    broadcastToRoom(oldCode, { type: 'player_left', playerId, reason: 'left' });
    sendRoomState(oldCode);
  }

  const { roomCode } = roomManager.createRoom(playerId, queued.playerName, 'Ranked Match', false, 2);

  const gameSeed = Math.floor(Math.random() * 2147483647);
  const token = issueReconnectToken(playerId);

  sendToPlayer(playerId, {
    type: 'ranked_match_found',
    roomCode,
    opponentName: 'AI Rival',
    opponentId: `ai_${Date.now()}`,
    isAI: true,
    gameSeed,
    reconnectToken: token,
  });

  console.log(`[RANKED] AI match spawned for ${queued.playerName} (Room: ${roomCode})`);
}

function clearRankedTimer(playerId: string): void {
  const timer = rankedTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    rankedTimers.delete(playerId);
  }
  clearRankedRetryInterval(playerId);
}

function clearRankedRetryInterval(playerId: string): void {
  const interval = rankedRetryIntervals.get(playerId);
  if (interval) {
    clearInterval(interval);
    rankedRetryIntervals.delete(playerId);
  }
}

// ===== Message Validation =====

function isValidMessage(data: unknown): data is ClientMessage {
  if (!data || typeof data !== 'object') return false;
  if (typeof (data as Record<string, unknown>).type !== 'string') return false;
  return true;
}

// ===== Handler Context =====

const handlerCtx: HandlerContext = {
  // Shared state
  playerConnections,
  reconnectTokens,
  disconnectTimers,

  // Managers
  roomManager,
  arenaManager,
  mcBoardManager,
  mwManager,
  fpsManager,
  eoeManager,
  mcsManager,

  // Ranked state
  rankedQueue,
  rankedTimers,
  rankedRetryIntervals,

  // Arena queue state
  arenaQueue,
  arenaQueueTimers,

  // Countdown tracking
  activeCountdowns,

  // Utility functions
  sendToPlayer,
  sendError,
  broadcastToRoom,
  broadcastOnlineCount,
  sendRoomState,
  issueReconnectToken,

  // Arena helpers
  broadcastToArena,
  sendArenaState,
  startArenaCountdown,
  tryFormArenaMatch,
  clearArenaTimer,

  // MC Board helpers
  broadcastToMCBoard,
  sendMCBoardRoomState,
  startMCBoardCountdown,

  // MC World helpers
  broadcastToMW,
  sendMWRoomState,
  startMWCountdown,

  // FPS helpers
  broadcastToFPS,
  sendFPSRoomState,
  startFPSCountdown,

  // MC Switch helpers
  broadcastToMCS,
  sendMCSRoomState,
  startMCSCountdown,

  // Warfront helpers
  wfManager,
  broadcastToWF,
  sendWFRoomState,

  // Countdown helpers
  startCountdown,
  cancelCountdown,

  // Ranked helpers
  tryRankedMatch,
  spawnAIMatch,
  clearRankedTimer,
  clearRankedRetryInterval,

  // Disconnect handler
  handleDisconnect,

  // Notification
  notifyPlayerOnline,

  // Constants
  COUNTDOWN_SECONDS,
  RANKED_MATCH_TIMEOUT,
  RANKED_POINT_RANGE,
};

// Extended context for warfront handler (handlerCtx now includes wfManager)
const wfHandlerCtx: WarfrontHandlerContext = handlerCtx;

// ===== Message Handler =====

function handleMessage(playerId: string, raw: string): void {
  let message: ClientMessage;

  try {
    message = JSON.parse(raw);
  } catch {
    sendError(playerId, 'Invalid JSON', 'INVALID_JSON');
    return;
  }

  if (!isValidMessage(message)) {
    sendError(playerId, 'Invalid message format', 'INVALID_FORMAT');
    return;
  }

  // Update activity
  const conn = playerConnections.get(playerId);
  if (conn) {
    conn.lastActivity = Date.now();
  }

  // System messages handled inline
  switch (message.type) {
    case 'pong': {
      if (conn) conn.isAlive = true;
      return;
    }

    case 'set_profile': {
      const profileMsg = message as SetProfileMessage;
      if (conn) {
        const name = typeof profileMsg.name === 'string' ? profileMsg.name : '';
        const icon = typeof profileMsg.icon === 'string' ? profileMsg.icon : '';
        const isNewProfile = !conn.profileName;
        conn.profileName = name.slice(0, 20);
        conn.profileIcon = icon.slice(0, 30);
        conn.profilePrivate = !!profileMsg.isPrivate;
        broadcastOnlineCount();
        if (isNewProfile && conn.profileName) {
          notifyPlayerOnline(conn.profileName, conn.profileIcon || '', playerConnections.size);
        }
      }
      return;
    }

    case 'get_online_users': {
      const users = getOnlineUsers();
      sendToPlayer(playerId, { type: 'online_users', users } as ServerMessage);
      return;
    }
  }

  // Dispatch to handler modules by message type prefix
  const type = message.type;

  // Rhythmia / 1v1 / ranked (no prefix)
  if (
    type === 'create_room' || type === 'join_room' || type === 'reconnect' ||
    type === 'leave_room' || type === 'set_ready' || type === 'start_game' ||
    type === 'get_rooms' || type === 'relay' || type === 'rematch' ||
    type === 'queue_ranked' || type === 'cancel_ranked'
  ) {
    if (handleRhythmiaMessage(playerId, message, handlerCtx)) return;
  }

  // Arena
  if (
    type === 'create_arena' || type === 'join_arena' || type === 'queue_arena' ||
    type === 'cancel_arena_queue' || type.startsWith('arena_')
  ) {
    if (handleArenaMessage(playerId, message, handlerCtx)) return;
  }

  // Minecraft Board
  if (type.startsWith('mc_')) {
    if (handleMinecraftBoardMessage(playerId, message, handlerCtx)) return;
  }

  // Minecraft World
  if (type.startsWith('mw_')) {
    if (handleMinecraftWorldMessage(playerId, message, handlerCtx)) return;
  }

  // FPS Arena
  if (type.startsWith('fps_')) {
    if (handleFPSArenaMessage(playerId, message, handlerCtx)) return;
  }

  // Minecraft Switch
  if (type.startsWith('ms_')) {
    if (handleMinecraftSwitchMessage(playerId, message, handlerCtx)) return;
  }

  // Warfront
  if (type.startsWith('wf_')) {
    if (handleWarfrontMessage(playerId, message, wfHandlerCtx)) return;
  }

  // Echoes of Eternity (eoe_ prefix, handled in default)
  if (handleEoEMessage(playerId, message, handlerCtx)) return;

  sendError(playerId, `Unknown message type`, 'UNKNOWN_TYPE');
}

// ===== Disconnect Handler =====

function handleDisconnect(playerId: string, reason: string): void {
  // Prevent double-handling
  if (disconnectTimers.has(playerId)) return;

  // Clean up ranked queue
  rankedQueue.delete(playerId);
  clearRankedTimer(playerId);

  // Clean up arena queue
  arenaQueue.delete(playerId);
  clearArenaTimer(playerId);

  // Handle arena disconnect
  const arenaResult = arenaManager.markDisconnected(playerId);
  if (arenaResult.roomCode) {
    sendArenaState(arenaResult.roomCode);
  }

  // Handle MC board disconnect
  const mcResult = mcBoardManager.markDisconnected(playerId);
  if (mcResult.roomCode) {
    sendMCBoardRoomState(mcResult.roomCode);
  }

  // Handle Minecraft World disconnect
  const mwResult = mwManager.markDisconnected(playerId);
  if (mwResult.roomCode) {
    sendMWRoomState(mwResult.roomCode);
  }

  // Handle FPS Arena disconnect
  const fpsResult = fpsManager.markDisconnected(playerId);
  if (fpsResult.roomCode) {
    broadcastToFPS(fpsResult.roomCode, { type: 'fps_player_left', playerId } as unknown as ServerMessage);
    sendFPSRoomState(fpsResult.roomCode);
  }

  // Handle Minecraft Switch disconnect
  const mcsResult = mcsManager.markDisconnected(playerId);
  if (mcsResult.roomCode) {
    sendMCSRoomState(mcsResult.roomCode);
  }

  // Handle Warfront disconnect
  const wfResult = wfManager.markDisconnected(playerId);
  if (wfResult.roomCode) {
    sendWFRoomState(wfResult.roomCode);
  }

  // Handle EoE disconnect
  eoeManager.removePlayer(playerId);
  eoeManager.dequeuePlayer(playerId);

  const result = roomManager.markPlayerDisconnected(playerId);
  playerConnections.delete(playerId);

  // Broadcast updated online count to all clients
  broadcastOnlineCount();

  if (result.roomCode) {
    // Cancel any active countdown if the room no longer has enough players
    const roomAfterDisconnect = roomManager.getRoomByPlayerId(playerId);
    if (roomAfterDisconnect && roomAfterDisconnect.status === 'countdown') {
      const connectedCount = roomAfterDisconnect.players.filter(p => p.connected).length;
      if (connectedCount < 2) {
        cancelCountdown(result.roomCode);
      }
    }

    // Broadcast updated room state showing the player as disconnected
    sendRoomState(result.roomCode);

    // Start grace period timer — actually remove player after timeout
    const timer = setTimeout(() => {
      disconnectTimers.delete(playerId);

      const removeResult = roomManager.removePlayerFromRoom(playerId);
      if (removeResult.roomCode) {
        broadcastToRoom(removeResult.roomCode, {
          type: 'player_left',
          playerId,
          reason: 'timeout',
        });

        if (removeResult.room) {
          sendRoomState(removeResult.roomCode);
        }
      }

      console.log(`[GRACE_EXPIRED] Player ${playerId} removed from room`);
    }, RECONNECT_GRACE_PERIOD);

    disconnectTimers.set(playerId, timer);
  }

  console.log(`[DISCONNECT] Player ${playerId} (${reason}) — grace period started`);
}

// ===== Origin Validation =====

function validateOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;

  return ALLOWED_ORIGINS.some(allowed =>
    origin === allowed ||
    origin.startsWith(allowed) ||
    allowed === '*'
  );
}

// ===== HTTP Server =====

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: Date.now(),
      connections: playerConnections.size,
      rooms: roomManager.getRoomCount(),
      arenas: arenaManager.getRoomCount(),
      mcBoards: mcBoardManager.getRoomCount(),
      mcWorlds: mwManager.getRoomCount(),
      mcSwitch: mcsManager.getRoomCount(),
      fpsArenas: fpsManager.getRoomCount(),
      warfront: wfManager.getRoomCount(),
    }));
  } else if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connections: playerConnections.size,
      rooms: roomManager.getRoomCount(),
      arenas: arenaManager.getRoomCount(),
      mcBoards: mcBoardManager.getRoomCount(),
      mcWorlds: mwManager.getRoomCount(),
      mcSwitch: mcsManager.getRoomCount(),
      fpsArenas: fpsManager.getRoomCount(),
      warfront: wfManager.getRoomCount(),
      arenaQueue: arenaQueue.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// ===== WebSocket Server =====

const wss = new WebSocketServer({
  server,
  verifyClient: (info: { req: IncomingMessage; origin: string; secure: boolean }) => {
    const valid = validateOrigin(info.req);
    if (!valid) {
      console.log(`[REJECT] Origin: ${info.req.headers.origin}`);
    }
    return valid;
  },
});

// Heartbeat check — uses timestamp-based timeout to avoid false disconnects
const heartbeatInterval = setInterval(() => {
  const now = Date.now();
  playerConnections.forEach((conn, playerId) => {
    if (now - conn.lastActivity > CLIENT_TIMEOUT) {
      console.log(`[TIMEOUT] Player ${playerId} (no activity for ${Math.round((now - conn.lastActivity) / 1000)}s)`);
      conn.ws.terminate();
      handleDisconnect(playerId, 'timeout');
      return;
    }

    try {
      sendToPlayer(playerId, { type: 'ping', timestamp: now });
    } catch {
      conn.ws.terminate();
      handleDisconnect(playerId, 'ping_failed');
    }
  });
}, HEARTBEAT_INTERVAL);

// Token cleanup + notification cooldown cleanup
const tokenCleanupInterval = setInterval(() => {
  const now = Date.now();
  reconnectTokens.forEach((data, token) => {
    if (data.expires < now) {
      reconnectTokens.delete(token);
    }
  });
  cleanupNotificationCooldowns();
}, 60000);

// ===== Connection Handler =====

wss.on('connection', (ws: WebSocket, _request: IncomingMessage) => {
  const playerId = generatePlayerId();

  const conn: PlayerConnection = {
    ws,
    isAlive: true,
    lastActivity: Date.now(),
  };
  playerConnections.set(playerId, conn);

  console.log(`[CONNECT] Player ${playerId}`);

  sendToPlayer(playerId, {
    type: 'connected',
    playerId,
    serverTime: Date.now(),
  });

  // Broadcast updated online count to all clients
  broadcastOnlineCount();

  ws.on('message', (data: Buffer) => {
    try {
      handleMessage(playerId, data.toString());
    } catch (error) {
      console.error('[ERROR] Processing message:', error);
      sendError(playerId, 'Internal server error', 'INTERNAL_ERROR');
    }
  });

  ws.on('close', () => {
    handleDisconnect(playerId, 'closed');
  });

  ws.on('error', (error) => {
    console.error(`[ERROR] WS ${playerId}:`, error.message);
    handleDisconnect(playerId, 'error');
  });

  ws.on('pong', () => {
    const c = playerConnections.get(playerId);
    if (c) c.isAlive = true;
  });
});

wss.on('error', (error) => {
  console.error('[SERVER ERROR]', error);
});

// ===== Start Server =====

server.listen(PORT, HOST, () => {
  console.log(`
  RHYTHMIA Multiplayer Server
  ============================
  WebSocket: ws://${HOST}:${PORT}
  Health:    http://${HOST}:${PORT}/health
  Stats:     http://${HOST}:${PORT}/stats
  Heartbeat: ${HEARTBEAT_INTERVAL / 1000}s
  Timeout:   ${CLIENT_TIMEOUT / 1000}s
  Reconnect: ${RECONNECT_GRACE_PERIOD / 1000}s grace
  ============================
  `);
});

// ===== Graceful Shutdown =====

function shutdown(signal: string) {
  console.log(`\n[SHUTDOWN] ${signal} received`);

  clearInterval(heartbeatInterval);
  clearInterval(tokenCleanupInterval);

  // Clear all grace period timers
  disconnectTimers.forEach((timer) => clearTimeout(timer));
  disconnectTimers.clear();

  // Clear all active countdown timers
  activeCountdowns.forEach((timer) => clearTimeout(timer));
  activeCountdowns.clear();

  // Clear all ranked retry intervals
  rankedRetryIntervals.forEach((interval) => clearInterval(interval));
  rankedRetryIntervals.clear();

  playerConnections.forEach((conn) => {
    try {
      const msg: ServerMessage = {
        type: 'server_shutdown',
        message: 'Server is restarting, please reconnect',
      };
      conn.ws.send(JSON.stringify(msg));
      conn.ws.close(1001, 'Server shutdown');
    } catch { }
  });

  wss.close(() => {
    server.close(() => {
      roomManager.destroy();
      arenaManager.destroy();
      mcBoardManager.destroy();
      mwManager.destroy();
      fpsManager.destroy();
      mcsManager.destroy();
      wfManager.destroy();
      eoeManager.destroy();
      console.log('[SHUTDOWN] Complete');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.log('[SHUTDOWN] Forced exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
