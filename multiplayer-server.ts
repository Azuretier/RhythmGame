import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import type { IncomingMessage } from 'http';
import { MultiplayerRoomManager } from './src/lib/multiplayer/RoomManager';
import { ArenaRoomManager } from './src/lib/arena/ArenaManager';
import { MinecraftBoardManager } from './src/lib/minecraft-board/MinecraftBoardManager';
import type {
  ClientMessage,
  ServerMessage,
  ErrorMessage,
  RelayPayload,
} from './src/types/multiplayer';
import type {
  ArenaClientMessage,
  ArenaAction,
  ArenaBoardPayload,
} from './src/types/arena';
import {
  ARENA_MAX_PLAYERS,
  ARENA_QUEUE_TIMEOUT,
} from './src/types/arena';
import type { MCServerMessage, Direction } from './src/types/minecraft-board';

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
const RANKED_MATCH_TIMEOUT = 8000; // 8 seconds before AI fallback
const RANKED_POINT_RANGE = 500;    // Match within this point range

// Player connection tracking
interface PlayerConnection {
  ws: WebSocket;
  isAlive: boolean;
  lastActivity: number;
  reconnectToken?: string;
}

// Ranked matchmaking queue
interface QueuedPlayer {
  playerId: string;
  playerName: string;
  rankPoints: number;
  queuedAt: number;
}

const rankedQueue: Map<string, QueuedPlayer> = new Map();
const rankedTimers: Map<string, NodeJS.Timeout> = new Map();

const playerConnections = new Map<string, PlayerConnection>();
const reconnectTokens = new Map<string, { playerId: string; expires: number }>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();

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

// Arena matchmaking queue
interface ArenaQueuedPlayer {
  playerId: string;
  playerName: string;
  queuedAt: number;
}

const arenaQueue: Map<string, ArenaQueuedPlayer> = new Map();
const arenaQueueTimers: Map<string, NodeJS.Timeout> = new Map();

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
  const message: ServerMessage = { type: 'online_count', count };
  playerConnections.forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      try {
        conn.ws.send(JSON.stringify(message));
      } catch {}
    }
  });
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
    broadcastToArena(roomCode, { type: 'arena_state', arenaState } as unknown as ServerMessage);
  }
}

function startArenaCountdown(roomCode: string, gameSeed: number): void {
  const playerIds = arenaManager.getPlayerIdsInRoom(roomCode);
  let count = COUNTDOWN_SECONDS;

  const tick = () => {
    if (count > 0) {
      broadcastToArena(roomCode, { type: 'arena_countdown', count } as unknown as ServerMessage);
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
      } as unknown as ServerMessage);
      sendArenaState(roomCode);
      console.log(`[ARENA] Game started in room ${roomCode} with ${playerIds.length} players`);
    }
  };

  tick();
}

function tryFormArenaMatch(): boolean {
  // Need at least 3 players to form an arena
  if (arenaQueue.size < 3) return false;

  // Grab up to 9 players from the queue
  const players: ArenaQueuedPlayer[] = [];
  for (const [, queued] of arenaQueue) {
    players.push(queued);
    if (players.length >= ARENA_MAX_PLAYERS) break;
  }

  if (players.length < 3) return false;

  // Create the arena room with the first player as host
  const host = players[0];
  const { roomCode } = arenaManager.createRoom(host.playerId, host.playerName);

  // Remove host from queue
  arenaQueue.delete(host.playerId);
  clearArenaTimer(host.playerId);

  const hostToken = issueReconnectToken(host.playerId);
  sendToPlayer(host.playerId, {
    type: 'arena_created',
    arenaCode: roomCode,
    playerId: host.playerId,
    reconnectToken: hostToken,
  } as unknown as ServerMessage);

  // Join remaining players
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
      } as unknown as ServerMessage);
    }
  }

  // Auto-ready all and start after brief delay
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

function isArenaMessage(type: string): boolean {
  return type.startsWith('arena_') || type === 'create_arena' || type === 'join_arena' || type === 'queue_arena' || type === 'cancel_arena_queue';
}

function isMCBoardMessage(type: string): boolean {
  return type.startsWith('mc_');
}

// ===== Minecraft Board Game System =====

const mcBoardManager = new MinecraftBoardManager({
  onSendToPlayer: (playerId: string, message: MCServerMessage) => {
    sendToPlayer(playerId, message as unknown as ServerMessage);
  },
  onBroadcastToRoom: (roomCode: string, message: MCServerMessage, excludePlayerId?: string) => {
    broadcastToMCBoard(roomCode, message as unknown as ServerMessage, excludePlayerId);
  },
});

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
    broadcastToMCBoard(roomCode, { type: 'mc_room_state', roomState } as unknown as ServerMessage);
  }
}

function startMCBoardCountdown(roomCode: string, gameSeed: number): void {
  let count = COUNTDOWN_SECONDS;
  const tick = () => {
    if (count > 0) {
      broadcastToMCBoard(roomCode, { type: 'mc_countdown', count } as unknown as ServerMessage);
      count--;
      setTimeout(tick, 1000);
    } else {
      mcBoardManager.beginPlaying(roomCode);
      broadcastToMCBoard(roomCode, { type: 'mc_game_started', seed: gameSeed } as unknown as ServerMessage);
      console.log(`[MC_BOARD] Game started in room ${roomCode}`);
    }
  };
  tick();
}

// ===== Message Validation =====

function isValidMessage(data: unknown): data is ClientMessage {
  if (!data || typeof data !== 'object') return false;
  if (typeof (data as Record<string, unknown>).type !== 'string') return false;
  return true;
}

// ===== Countdown Logic =====

function startCountdown(roomCode: string, gameSeed: number): void {
  const playerIds = roomManager.getPlayerIdsInRoom(roomCode);
  let count = COUNTDOWN_SECONDS;

  const tick = () => {
    if (count > 0) {
      broadcastToRoom(roomCode, { type: 'countdown', count });
      count--;
      setTimeout(tick, 1000);
    } else {
      // Countdown finished - start game
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

  // Find a suitable opponent in the queue
  for (const [otherId, other] of rankedQueue) {
    if (otherId === playerId) continue;
    const pointDiff = Math.abs(queued.rankPoints - other.rankPoints);
    // Expand range over time: after 4s, accept wider range
    const elapsed = Date.now() - queued.queuedAt;
    const expandedRange = RANKED_POINT_RANGE + Math.floor(elapsed / 1000) * 200;
    if (pointDiff <= expandedRange) {
      // Match found! Create a room for them
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
  // Remove both from queue
  rankedQueue.delete(player1Id);
  rankedQueue.delete(player2Id);
  clearRankedTimer(player1Id);
  clearRankedTimer(player2Id);

  // Leave any existing rooms
  const existing1 = roomManager.getRoomByPlayerId(player1Id);
  if (existing1) roomManager.removePlayerFromRoom(player1Id);
  const existing2 = roomManager.getRoomByPlayerId(player2Id);
  if (existing2) roomManager.removePlayerFromRoom(player2Id);

  // Create room with player1 as host
  const { roomCode } = roomManager.createRoom(player1Id, player1.playerName, 'Ranked Match', false, 2);
  const joinResult = roomManager.joinRoom(roomCode, player2Id, player2.playerName);

  const gameSeed = Math.floor(Math.random() * 2147483647);
  const token1 = issueReconnectToken(player1Id);
  const token2 = issueReconnectToken(player2Id);

  // Notify both players
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

  // Auto-start countdown after a brief delay
  setTimeout(() => {
    // Set both players ready and start
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

  // Remove from queue
  rankedQueue.delete(playerId);
  clearRankedTimer(playerId);

  // Leave any existing room
  const existing = roomManager.getRoomByPlayerId(playerId);
  if (existing) roomManager.removePlayerFromRoom(playerId);

  // Create room with player as host
  const { roomCode } = roomManager.createRoom(playerId, queued.playerName, 'Ranked Match', false, 2);

  const gameSeed = Math.floor(Math.random() * 2147483647);
  const token = issueReconnectToken(playerId);

  // Notify player — AI match
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
}

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

  switch (message.type) {
    case 'pong': {
      if (conn) conn.isAlive = true;
      break;
    }

    case 'create_room': {
      // Leave any existing room
      const existing = roomManager.getRoomByPlayerId(playerId);
      if (existing) {
        roomManager.removePlayerFromRoom(playerId);
      }

      const { roomCode, player } = roomManager.createRoom(
        playerId,
        message.playerName,
        message.roomName,
        message.isPublic !== false,
      );

      const reconnectToken = issueReconnectToken(playerId);

      sendToPlayer(playerId, {
        type: 'room_created',
        roomCode,
        playerId: player.id,
        reconnectToken,
      });

      sendRoomState(roomCode);
      console.log(`[ROOM] ${roomCode} created by ${player.name}`);
      break;
    }

    case 'join_room': {
      // Leave any existing room
      const existing = roomManager.getRoomByPlayerId(playerId);
      if (existing) {
        roomManager.removePlayerFromRoom(playerId);
      }

      const result = roomManager.joinRoom(message.roomCode, playerId, message.playerName);
      if (!result.success || !result.player) {
        sendError(playerId, result.error || 'Failed to join', 'JOIN_FAILED');
        break;
      }

      const roomState = roomManager.getRoomState(message.roomCode);
      if (!roomState) {
        sendError(playerId, 'Room not found', 'ROOM_NOT_FOUND');
        break;
      }

      const reconnectToken = issueReconnectToken(playerId);

      sendToPlayer(playerId, {
        type: 'joined_room',
        roomCode: message.roomCode.toUpperCase().trim(),
        playerId: result.player.id,
        roomState,
        reconnectToken,
      });

      broadcastToRoom(
        message.roomCode,
        { type: 'player_joined', player: result.player },
        playerId,
      );

      sendRoomState(message.roomCode);
      console.log(`[JOIN] ${result.player.name} joined room ${message.roomCode}`);
      break;
    }

    case 'reconnect': {
      const tokenData = reconnectTokens.get(message.reconnectToken);
      if (!tokenData || tokenData.expires < Date.now()) {
        sendError(playerId, 'Invalid or expired reconnect token', 'RECONNECT_FAILED');
        break;
      }

      const oldPlayerId = tokenData.playerId;

      // Cancel the grace period removal timer
      const graceTimer = disconnectTimers.get(oldPlayerId);
      if (graceTimer) {
        clearTimeout(graceTimer);
        disconnectTimers.delete(oldPlayerId);
      }

      const room = roomManager.getRoomByPlayerId(oldPlayerId);
      if (!room) {
        sendError(playerId, 'Room no longer exists', 'ROOM_GONE');
        reconnectTokens.delete(message.reconnectToken);
        break;
      }

      roomManager.transferPlayer(oldPlayerId, playerId);
      roomManager.reconnectPlayer(playerId);
      reconnectTokens.delete(message.reconnectToken);

      const newToken = issueReconnectToken(playerId);
      const roomState = roomManager.getRoomState(room.code);

      sendToPlayer(playerId, {
        type: 'reconnected',
        roomCode: room.code,
        playerId,
        roomState: roomState!,
        reconnectToken: newToken,
      });

      // Notify other players of reconnection
      sendRoomState(room.code);

      console.log(`[RECONNECT] Player reconnected to room ${room.code}`);
      break;
    }

    case 'leave_room': {
      // Cancel any pending grace timer
      const graceTimer = disconnectTimers.get(playerId);
      if (graceTimer) {
        clearTimeout(graceTimer);
        disconnectTimers.delete(playerId);
      }

      const result = roomManager.removePlayerFromRoom(playerId);

      // Clear reconnect token
      if (conn?.reconnectToken) {
        reconnectTokens.delete(conn.reconnectToken);
      }

      if (result.roomCode) {
        broadcastToRoom(result.roomCode, {
          type: 'player_left',
          playerId,
          reason: 'left',
        });

        if (result.room) {
          sendRoomState(result.roomCode);
        }

        console.log(`[LEAVE] Player ${playerId} left room ${result.roomCode}`);
      }
      break;
    }

    case 'set_ready': {
      const result = roomManager.setPlayerReady(playerId, message.ready);
      if (!result.success) {
        sendError(playerId, result.error || 'Failed to set ready');
        break;
      }

      const room = roomManager.getRoomByPlayerId(playerId);
      if (room) {
        broadcastToRoom(room.code, {
          type: 'player_ready',
          playerId,
          ready: message.ready,
        });
        sendRoomState(room.code);
      }
      break;
    }

    case 'start_game': {
      const result = roomManager.startGame(playerId);
      if (!result.success || !result.gameSeed) {
        sendError(playerId, result.error || 'Failed to start game', 'START_FAILED');
        break;
      }

      const room = roomManager.getRoomByPlayerId(playerId);
      if (room) {
        sendRoomState(room.code);
        startCountdown(room.code, result.gameSeed);
      }
      break;
    }

    case 'get_rooms': {
      const rooms = roomManager.getPublicRooms();
      sendToPlayer(playerId, { type: 'room_list', rooms });
      break;
    }

    case 'relay': {
      const room = roomManager.getRoomByPlayerId(playerId);
      if (!room) break;

      broadcastToRoom(
        room.code,
        {
          type: 'relayed',
          fromPlayerId: playerId,
          payload: message.payload as RelayPayload,
        },
        playerId,
      );
      break;
    }

    case 'rematch': {
      const room = roomManager.getRoomByPlayerId(playerId);
      if (!room) break;

      if (roomManager.resetRoom(room.code)) {
        broadcastToRoom(room.code, { type: 'rematch_started' });
        sendRoomState(room.code);
        console.log(`[REMATCH] Room ${room.code} reset for rematch`);
      }
      break;
    }

    case 'queue_ranked': {
      // Remove from any existing room
      const existing = roomManager.getRoomByPlayerId(playerId);
      if (existing) {
        roomManager.removePlayerFromRoom(playerId);
      }

      // Remove from queue if already in it
      rankedQueue.delete(playerId);
      clearRankedTimer(playerId);

      // Add to queue
      const queueEntry: QueuedPlayer = {
        playerId,
        playerName: (message.playerName || 'Player').slice(0, 20),
        rankPoints: typeof message.rankPoints === 'number' ? message.rankPoints : 0,
        queuedAt: Date.now(),
      };
      rankedQueue.set(playerId, queueEntry);

      // Notify player they're queued
      sendToPlayer(playerId, {
        type: 'ranked_queued',
        position: rankedQueue.size,
      });

      console.log(`[RANKED] ${queueEntry.playerName} queued (${queueEntry.rankPoints} pts, ${rankedQueue.size} in queue)`);

      // Try to find a match immediately
      if (!tryRankedMatch(playerId)) {
        // Set timeout for AI fallback
        const timer = setTimeout(() => {
          rankedTimers.delete(playerId);
          // Try one more time to find a human match
          if (rankedQueue.has(playerId) && !tryRankedMatch(playerId)) {
            spawnAIMatch(playerId);
          }
        }, RANKED_MATCH_TIMEOUT);
        rankedTimers.set(playerId, timer);

        // Also periodically retry matching during the wait
        const retryInterval = setInterval(() => {
          if (!rankedQueue.has(playerId)) {
            clearInterval(retryInterval);
            return;
          }
          if (tryRankedMatch(playerId)) {
            clearInterval(retryInterval);
          }
        }, 1000);

        // Clean up retry interval after timeout
        setTimeout(() => clearInterval(retryInterval), RANKED_MATCH_TIMEOUT + 500);
      }
      break;
    }

    case 'cancel_ranked': {
      rankedQueue.delete(playerId);
      clearRankedTimer(playerId);
      console.log(`[RANKED] ${playerId} cancelled queue`);
      break;
    }

    // ===== Arena Messages =====

    case 'create_arena': {
      const existing = arenaManager.getRoomByPlayerId(playerId);
      if (existing) arenaManager.removePlayer(playerId);

      const { roomCode, player } = arenaManager.createRoom(
        playerId,
        (message as unknown as { playerName: string }).playerName,
        (message as unknown as { roomName?: string }).roomName,
      );

      const reconnectToken = issueReconnectToken(playerId);
      sendToPlayer(playerId, {
        type: 'arena_created',
        arenaCode: roomCode,
        playerId: player.id,
        reconnectToken,
      } as unknown as ServerMessage);

      sendArenaState(roomCode);
      console.log(`[ARENA] ${roomCode} created by ${player.name}`);
      break;
    }

    case 'join_arena': {
      const existing = arenaManager.getRoomByPlayerId(playerId);
      if (existing) arenaManager.removePlayer(playerId);

      const arenaMsg = message as unknown as { arenaCode: string; playerName: string };
      const result = arenaManager.joinRoom(arenaMsg.arenaCode, playerId, arenaMsg.playerName);
      if (!result.success || !result.player) {
        sendError(playerId, result.error || 'Failed to join arena', 'ARENA_JOIN_FAILED');
        break;
      }

      const arenaState = arenaManager.getRoomState(arenaMsg.arenaCode);
      if (!arenaState) {
        sendError(playerId, 'Arena not found', 'ARENA_NOT_FOUND');
        break;
      }

      const reconnectToken = issueReconnectToken(playerId);
      sendToPlayer(playerId, {
        type: 'arena_joined',
        arenaCode: arenaMsg.arenaCode.toUpperCase().trim(),
        playerId: result.player.id,
        arenaState,
        reconnectToken,
      } as unknown as ServerMessage);

      broadcastToArena(arenaMsg.arenaCode, {
        type: 'arena_player_joined',
        player: result.player,
      } as unknown as ServerMessage, playerId);

      sendArenaState(arenaMsg.arenaCode);
      console.log(`[ARENA] ${result.player.name} joined arena ${arenaMsg.arenaCode}`);
      break;
    }

    case 'queue_arena': {
      const existing = arenaManager.getRoomByPlayerId(playerId);
      if (existing) arenaManager.removePlayer(playerId);

      arenaQueue.delete(playerId);
      clearArenaTimer(playerId);

      const queueMsg = message as unknown as { playerName: string };
      const entry: ArenaQueuedPlayer = {
        playerId,
        playerName: (queueMsg.playerName || 'Player').slice(0, 20),
        queuedAt: Date.now(),
      };
      arenaQueue.set(playerId, entry);

      sendToPlayer(playerId, {
        type: 'arena_queued',
        position: arenaQueue.size,
        queueSize: arenaQueue.size,
      } as unknown as ServerMessage);

      console.log(`[ARENA] ${entry.playerName} queued (${arenaQueue.size} in queue)`);

      // Try to form a match immediately
      if (!tryFormArenaMatch()) {
        // Set timeout for forming with whatever we have (min 3)
        const timer = setTimeout(() => {
          arenaQueueTimers.delete(playerId);
          if (arenaQueue.has(playerId)) {
            tryFormArenaMatch();
          }
        }, ARENA_QUEUE_TIMEOUT);
        arenaQueueTimers.set(playerId, timer);

        // Retry periodically
        const retryInterval = setInterval(() => {
          if (!arenaQueue.has(playerId)) {
            clearInterval(retryInterval);
            return;
          }
          if (tryFormArenaMatch()) {
            clearInterval(retryInterval);
          }
        }, 3000);

        setTimeout(() => clearInterval(retryInterval), ARENA_QUEUE_TIMEOUT + 1000);
      }
      break;
    }

    case 'cancel_arena_queue': {
      arenaQueue.delete(playerId);
      clearArenaTimer(playerId);
      console.log(`[ARENA] ${playerId} cancelled arena queue`);
      break;
    }

    case 'arena_ready': {
      const readyMsg = message as unknown as { ready: boolean };
      const result = arenaManager.setPlayerReady(playerId, readyMsg.ready);
      if (!result.success) {
        sendError(playerId, result.error || 'Failed to set ready');
        break;
      }

      const room = arenaManager.getRoomByPlayerId(playerId);
      if (room) sendArenaState(room.code);
      break;
    }

    case 'arena_start': {
      const result = arenaManager.startGame(playerId);
      if (!result.success || !result.gameSeed) {
        sendError(playerId, result.error || 'Failed to start arena', 'ARENA_START_FAILED');
        break;
      }

      const room = arenaManager.getRoomByPlayerId(playerId);
      if (room) {
        sendArenaState(room.code);
        startArenaCountdown(room.code, result.gameSeed);
      }
      break;
    }

    case 'arena_action': {
      const actionMsg = message as unknown as { action: ArenaAction };
      arenaManager.handleAction(playerId, actionMsg.action);
      break;
    }

    case 'arena_relay': {
      const relayMsg = message as unknown as { payload: ArenaBoardPayload };
      arenaManager.handleRelay(playerId, relayMsg.payload);
      break;
    }

    case 'arena_leave': {
      const result = arenaManager.removePlayer(playerId);

      if (conn?.reconnectToken) {
        reconnectTokens.delete(conn.reconnectToken);
      }

      if (result.roomCode) {
        broadcastToArena(result.roomCode, {
          type: 'arena_player_left',
          playerId,
        } as unknown as ServerMessage);

        if (result.room) {
          sendArenaState(result.roomCode);
        }

        console.log(`[ARENA] Player ${playerId} left arena ${result.roomCode}`);
      }
      break;
    }

    // ===== Minecraft Board Game Messages =====

    case 'mc_create_room': {
      const mcMsg = message as unknown as { playerName: string; roomName?: string };
      const existing = mcBoardManager.getRoomByPlayerId(playerId);
      if (existing) mcBoardManager.removePlayer(playerId);

      const { roomCode, player } = mcBoardManager.createRoom(
        playerId,
        (mcMsg.playerName || 'Player').slice(0, 16),
        mcMsg.roomName,
      );

      const reconnectToken = issueReconnectToken(playerId);
      sendToPlayer(playerId, {
        type: 'mc_room_created',
        roomCode,
        playerId: player.id,
        reconnectToken,
      } as unknown as ServerMessage);

      sendMCBoardRoomState(roomCode);
      console.log(`[MC_BOARD] Room ${roomCode} created by ${player.name}`);
      break;
    }

    case 'mc_join_room': {
      const mcMsg = message as unknown as { roomCode: string; playerName: string };
      const existing = mcBoardManager.getRoomByPlayerId(playerId);
      if (existing) mcBoardManager.removePlayer(playerId);

      const result = mcBoardManager.joinRoom(mcMsg.roomCode, playerId, (mcMsg.playerName || 'Player').slice(0, 16));
      if (!result.success || !result.player) {
        sendError(playerId, result.error || 'Failed to join', 'MC_JOIN_FAILED');
        break;
      }

      const roomState = mcBoardManager.getRoomState(mcMsg.roomCode.toUpperCase());
      if (!roomState) {
        sendError(playerId, 'Room not found', 'MC_ROOM_NOT_FOUND');
        break;
      }

      const reconnectToken = issueReconnectToken(playerId);
      sendToPlayer(playerId, {
        type: 'mc_joined_room',
        roomCode: mcMsg.roomCode.toUpperCase().trim(),
        playerId: result.player.id,
        roomState,
        reconnectToken,
      } as unknown as ServerMessage);

      broadcastToMCBoard(mcMsg.roomCode.toUpperCase(), {
        type: 'mc_player_joined',
        player: result.player,
      } as unknown as ServerMessage, playerId);

      sendMCBoardRoomState(mcMsg.roomCode.toUpperCase());
      console.log(`[MC_BOARD] ${result.player.name} joined room ${mcMsg.roomCode}`);
      break;
    }

    case 'mc_get_rooms': {
      const rooms = mcBoardManager.getPublicRooms();
      sendToPlayer(playerId, { type: 'mc_room_list', rooms } as unknown as ServerMessage);
      break;
    }

    case 'mc_leave': {
      const result = mcBoardManager.removePlayer(playerId);
      if (conn?.reconnectToken) {
        reconnectTokens.delete(conn.reconnectToken);
      }
      if (result.roomCode) {
        broadcastToMCBoard(result.roomCode, {
          type: 'mc_player_left',
          playerId,
        } as unknown as ServerMessage);
        if (result.room) {
          sendMCBoardRoomState(result.roomCode);
        }
        console.log(`[MC_BOARD] Player ${playerId} left room ${result.roomCode}`);
      }
      break;
    }

    case 'mc_ready': {
      const mcMsg = message as unknown as { ready: boolean };
      const result = mcBoardManager.setPlayerReady(playerId, mcMsg.ready);
      if (!result.success) {
        sendError(playerId, result.error || 'Failed to set ready');
        break;
      }
      const room = mcBoardManager.getRoomByPlayerId(playerId);
      if (room) {
        broadcastToMCBoard(room.code, {
          type: 'mc_player_ready',
          playerId,
          ready: mcMsg.ready,
        } as unknown as ServerMessage);
        sendMCBoardRoomState(room.code);
      }
      break;
    }

    case 'mc_start': {
      const result = mcBoardManager.startGame(playerId);
      if (!result.success || !result.gameSeed) {
        sendError(playerId, result.error || 'Failed to start', 'MC_START_FAILED');
        break;
      }
      const room = mcBoardManager.getRoomByPlayerId(playerId);
      if (room) {
        sendMCBoardRoomState(room.code);
        startMCBoardCountdown(room.code, result.gameSeed);
      }
      break;
    }

    case 'mc_move': {
      const mcMsg = message as unknown as { direction: Direction };
      mcBoardManager.handleMove(playerId, mcMsg.direction);
      break;
    }

    case 'mc_mine': {
      const mcMsg = message as unknown as { x: number; y: number };
      mcBoardManager.handleMine(playerId, mcMsg.x, mcMsg.y);
      break;
    }

    case 'mc_cancel_mine': {
      mcBoardManager.handleCancelMine(playerId);
      break;
    }

    case 'mc_craft': {
      const mcMsg = message as unknown as { recipeId: string };
      mcBoardManager.handleCraft(playerId, mcMsg.recipeId);
      break;
    }

    case 'mc_attack': {
      const mcMsg = message as unknown as { targetId: string };
      mcBoardManager.handleAttack(playerId, mcMsg.targetId);
      break;
    }

    case 'mc_place_block': {
      const mcMsg = message as unknown as { x: number; y: number; itemIndex: number };
      mcBoardManager.handlePlaceBlock(playerId, mcMsg.x, mcMsg.y, mcMsg.itemIndex);
      break;
    }

    case 'mc_eat': {
      const mcMsg = message as unknown as { itemIndex: number };
      mcBoardManager.handleEat(playerId, mcMsg.itemIndex);
      break;
    }

    case 'mc_select_slot': {
      const mcMsg = message as unknown as { slot: number };
      mcBoardManager.handleSelectSlot(playerId, mcMsg.slot);
      break;
    }

    case 'mc_chat': {
      const mcMsg = message as unknown as { message: string };
      mcBoardManager.handleChat(playerId, mcMsg.message);
      break;
    }

    default:
      sendError(playerId, `Unknown message type`, 'UNKNOWN_TYPE');
  }
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

  const result = roomManager.markPlayerDisconnected(playerId);
  playerConnections.delete(playerId);

  // Broadcast updated online count to all clients
  broadcastOnlineCount();

  if (result.roomCode) {
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
    }));
  } else if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connections: playerConnections.size,
      rooms: roomManager.getRoomCount(),
      arenas: arenaManager.getRoomCount(),
      mcBoards: mcBoardManager.getRoomCount(),
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

// Token cleanup
const tokenCleanupInterval = setInterval(() => {
  const now = Date.now();
  reconnectTokens.forEach((data, token) => {
    if (data.expires < now) {
      reconnectTokens.delete(token);
    }
  });
}, 60000);

// ===== Connection Handler =====

wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
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

  playerConnections.forEach((conn) => {
    try {
      const msg: ServerMessage = {
        type: 'server_shutdown',
        message: 'Server is restarting, please reconnect',
      };
      conn.ws.send(JSON.stringify(msg));
      conn.ws.close(1001, 'Server shutdown');
    } catch {}
  });

  wss.close(() => {
    server.close(() => {
      roomManager.destroy();
      arenaManager.destroy();
      mcBoardManager.destroy();
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
