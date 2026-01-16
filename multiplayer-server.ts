import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import type { IncomingMessage } from 'http';
import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { MultiplayerRoomManager } from './src/lib/multiplayer/RoomManager';
import { FirestoreRoomService } from './src/lib/multiplayer/FirestoreRoomService';
import type {
  ClientMessage,
  ServerMessage,
  ErrorMessage,
  PublicRoomInfo,
} from './src/types/multiplayer';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'null', 'file://'];

// Stability settings
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 45000; // 45 seconds without pong = dead
const RECONNECT_GRACE_PERIOD = 60000; // 60 seconds to reconnect
const CLEANUP_INTERVAL = 300000; // 5 minutes for Firestore cleanup

// Initialize Firebase Admin (optional - only if credentials provided)
let firestoreService: FirestoreRoomService | null = null;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
    initializeApp({
      credential: cert(serviceAccount),
    });
    const firestore = getFirestore();
    firestoreService = new FirestoreRoomService(firestore);
    console.log('Firestore integration enabled');
  } else {
    console.log('Firestore integration disabled (no credentials provided)');
  }
} catch (error) {
  console.warn('Failed to initialize Firestore:', error);
  console.log('Running without Firestore persistence');
}

// Initialize room manager
const roomManager = new MultiplayerRoomManager();

// Track player connections with metadata
interface PlayerConnection {
  ws: WebSocket;
  isAlive: boolean;
  lastPing: number;
  reconnectToken?: string;
}

const playerConnections = new Map<string, PlayerConnection>();
const reconnectTokens = new Map<string, { playerId: string; expires: number }>();

/**
 * Generate a unique player ID
 */
function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Generate a reconnect token
 */
function generateReconnectToken(): string {
  return `reconnect_${Date.now()}_${Math.random().toString(36).slice(2, 16)}`;
}

/**
 * Send a message to a specific player
 */
function sendToPlayer(playerId: string, message: ServerMessage): boolean {
  const conn = playerConnections.get(playerId);
  if (conn && conn.ws.readyState === WebSocket.OPEN) {
    try {
      conn.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Failed to send to ${playerId}:`, error);
      return false;
    }
  }
  return false;
}

/**
 * Broadcast a message to all players in a room
 */
function broadcastToRoom(roomCode: string, message: ServerMessage, excludePlayerId?: string): void {
  const playerIds = roomManager.getPlayerIdsInRoom(roomCode);
  playerIds.forEach((playerId) => {
    if (playerId !== excludePlayerId) {
      sendToPlayer(playerId, message);
    }
  });
}

/**
 * Send an error message to a player
 */
function sendError(playerId: string, errorMessage: string, code?: string): void {
  const message: ErrorMessage = {
    type: 'error',
    message: errorMessage,
    code,
  };
  sendToPlayer(playerId, message);
}

/**
 * Sync room to Firestore
 */
async function syncRoomToFirestore(roomCode: string): Promise<void> {
  if (!firestoreService) return;
  
  try {
    const roomState = roomManager.getRoomState(roomCode);
    if (roomState) {
      // Convert RoomState to Firestore format
      const firestoreRoom = {
        code: roomState.code,
        name: roomState.name,
        hostId: roomState.hostId,
        status: roomState.status,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maxPlayers: 8, // Default max players
        players: roomState.players.map(p => ({
          id: p.id,
          name: p.name,
          isHost: p.id === roomState.hostId,
          joinedAt: Date.now(),
        })),
      };
      await firestoreService.saveRoom(firestoreRoom as any);
    }
  } catch (error) {
    console.error('Error syncing room to Firestore:', error);
  }
}

/**
 * Delete room from Firestore
 */
async function deleteRoomFromFirestore(roomCode: string): Promise<void> {
  if (!firestoreService) return;
  
  try {
    await firestoreService.deleteRoom(roomCode);
  } catch (error) {
    console.error('Error deleting room from Firestore:', error);
  }
}

/**
 * Get public rooms from Firestore
 */
async function getPublicRoomsFromFirestore(): Promise<PublicRoomInfo[]> {
  if (!firestoreService) {
    // Fallback to in-memory rooms
    return roomManager.getPublicRooms();
  }
  
  try {
    const firestoreRooms = await firestoreService.listOpenRooms();
    return firestoreRooms.map(room => ({
      code: room.code,
      name: room.name,
      hostName: room.players.find(p => p.isHost)?.name || 'Unknown',
      playerCount: room.players.length,
    }));
  } catch (error) {
    console.error('Error getting rooms from Firestore:', error);
    // Fallback to in-memory
    return roomManager.getPublicRooms();
  }
}

/**
 * Validate message structure
 */
function isValidMessage(data: any): data is ClientMessage {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.type !== 'string') return false;
  return true;
}

/**
 * Handle incoming messages from clients
 */
async function handleMessage(playerId: string, data: string): Promise<void> {
  let message: ClientMessage;

  try {
    message = JSON.parse(data);
  } catch (error) {
    sendError(playerId, 'Invalid JSON message', 'INVALID_JSON');
    return;
  }

  if (!isValidMessage(message)) {
    sendError(playerId, 'Invalid message format', 'INVALID_FORMAT');
    return;
  }

  // Update last activity
  const conn = playerConnections.get(playerId);
  if (conn) {
    conn.lastPing = Date.now();
  }

  try {
    switch (message.type) {
      case 'pong': {
        // Client responded to ping - connection is alive
        if (conn) {
          conn.isAlive = true;
        }
        break;
      }

      case 'create_room': {
        // Check if player is already in a room
        const existingRoom = roomManager.getRoomByPlayerId(playerId);
        if (existingRoom) {
          roomManager.removePlayerFromRoom(playerId);
        }

        const { roomCode, player } = roomManager.createRoom(
          playerId, 
          message.playerName,
          (message as any).roomName,
          (message as any).isPublic !== false
        );
        
        // Generate reconnect token
        const reconnectToken = generateReconnectToken();
        if (conn) {
          conn.reconnectToken = reconnectToken;
        }
        reconnectTokens.set(reconnectToken, { 
          playerId, 
          expires: Date.now() + RECONNECT_GRACE_PERIOD 
        });

        sendToPlayer(playerId, {
          type: 'room_created',
          roomCode,
          playerId: player.id,
          reconnectToken,
        } as any);

        const roomState = roomManager.getRoomState(roomCode);
        if (roomState) {
          sendToPlayer(playerId, {
            type: 'room_state',
            roomState: roomState as any,
          });
        }

        console.log(`[ROOM] ${roomCode} created by ${player.name}`);
        
        // Sync to Firestore
        syncRoomToFirestore(roomCode);
        break;
      }

      case 'join_room': {
        // Check if player is already in a room
        const existingRoom = roomManager.getRoomByPlayerId(playerId);
        if (existingRoom) {
          roomManager.removePlayerFromRoom(playerId);
        }

        const result = roomManager.joinRoom(
          message.roomCode,
          playerId,
          message.playerName
        );

        if (!result.success) {
          sendError(playerId, result.error || 'Failed to join room', 'JOIN_FAILED');
          break;
        }

        const roomState = roomManager.getRoomState(message.roomCode);
        if (!roomState) {
          sendError(playerId, 'Room not found', 'ROOM_NOT_FOUND');
          break;
        }

        // Generate reconnect token
        const reconnectToken = generateReconnectToken();
        if (conn) {
          conn.reconnectToken = reconnectToken;
        }
        reconnectTokens.set(reconnectToken, { 
          playerId, 
          expires: Date.now() + RECONNECT_GRACE_PERIOD 
        });

        sendToPlayer(playerId, {
          type: 'joined_room',
          roomCode: message.roomCode,
          playerId: result.player!.id,
          roomState: roomState as any,
          reconnectToken,
        } as any);

        // Notify other players
        broadcastToRoom(
          message.roomCode,
          {
            type: 'player_joined',
            player: result.player!,
          },
          playerId
        );

        // Send updated room state to all players
        const updatedState = roomManager.getRoomState(message.roomCode);
        if (updatedState) {
          broadcastToRoom(message.roomCode, {
            type: 'room_state',
            roomState: updatedState as any,
          });
        }

        console.log(`[JOIN] ${result.player!.name} joined room ${message.roomCode}`);
        
        // Sync to Firestore
        syncRoomToFirestore(message.roomCode);
        break;
      }

      case 'reconnect': {
        const tokenData = reconnectTokens.get((message as any).reconnectToken);
        if (!tokenData || tokenData.expires < Date.now()) {
          sendError(playerId, 'Invalid or expired reconnect token', 'RECONNECT_FAILED');
          break;
        }

        const oldPlayerId = tokenData.playerId;
        const room = roomManager.getRoomByPlayerId(oldPlayerId);
        
        if (!room) {
          sendError(playerId, 'Room no longer exists', 'ROOM_GONE');
          reconnectTokens.delete((message as any).reconnectToken);
          break;
        }

        // Transfer connection to new player ID
        roomManager.transferPlayer(oldPlayerId, playerId);
        reconnectTokens.delete((message as any).reconnectToken);

        // Generate new reconnect token
        const newReconnectToken = generateReconnectToken();
        if (conn) {
          conn.reconnectToken = newReconnectToken;
        }
        reconnectTokens.set(newReconnectToken, { 
          playerId, 
          expires: Date.now() + RECONNECT_GRACE_PERIOD 
        });

        const roomState = roomManager.getRoomState(room.code);
        sendToPlayer(playerId, {
          type: 'reconnected',
          roomCode: room.code,
          playerId,
          roomState: roomState as any,
          reconnectToken: newReconnectToken,
        } as any);

        console.log(`[RECONNECT] Player reconnected to room ${room.code}`);
        break;
      }

      case 'leave_room': {
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
          } as any);

          if (result.room) {
            const roomState = roomManager.getRoomState(result.roomCode);
            if (roomState) {
              broadcastToRoom(result.roomCode, {
                type: 'room_state',
                roomState: roomState as any,
              });
            }
          }

          console.log(`[LEAVE] Player ${playerId} left room ${result.roomCode}`);
          
          // Sync or delete from Firestore
          if (result.room) {
            syncRoomToFirestore(result.roomCode);
          } else {
            deleteRoomFromFirestore(result.roomCode);
          }
        }
        break;
      }

      case 'set_ready': {
        const result = roomManager.setPlayerReady(playerId, message.ready);
        
        if (!result.success) {
          sendError(playerId, result.error || 'Failed to set ready status');
          break;
        }

        const room = roomManager.getRoomByPlayerId(playerId);
        if (room) {
          const roomCode = room.code;
          broadcastToRoom(roomCode, {
            type: 'player_ready',
            playerId,
            ready: message.ready,
          });

          const roomState = roomManager.getRoomState(roomCode);
          if (roomState) {
            broadcastToRoom(roomCode, {
              type: 'room_state',
              roomState: roomState as any,
            });
          }
        }
        break;
      }

      case 'start_game': {
        const result = roomManager.startGame(playerId);
        
        if (!result.success) {
          sendError(playerId, result.error || 'Failed to start game', 'START_FAILED');
          break;
        }

        const room = roomManager.getRoomByPlayerId(playerId);
        if (room) {
          const roomCode = room.code;
          
          // Generate shared game seed for deterministic randomness
          const gameSeed = Math.floor(Math.random() * 1000000);
          
          broadcastToRoom(roomCode, {
            type: 'game_started',
            gameSeed,
            timestamp: Date.now(),
          } as any);

          const roomState = roomManager.getRoomState(roomCode);
          if (roomState) {
            broadcastToRoom(roomCode, {
              type: 'room_state',
              roomState: roomState as any,
            });
          }

          console.log(`[GAME] Started in room ${roomCode}`);
          
          // Sync to Firestore
          syncRoomToFirestore(roomCode);
        }
        break;
      }

      case 'get_rooms': {
        // Get rooms from Firestore if available, otherwise fall back to in-memory
        const publicRooms = await getPublicRoomsFromFirestore();
        sendToPlayer(playerId, {
          type: 'room_list',
          rooms: publicRooms,
        } as any);
        break;
      }

      case 'relay': {
        const room = roomManager.getRoomByPlayerId(playerId);
        if (room) {
          const roomCode = room.code;
          
          // Add timestamp and sequence for ordering
          const payload = {
            ...(message as any).payload,
            _ts: Date.now(),
            _from: playerId,
          };
          
          broadcastToRoom(
            roomCode,
            {
              type: 'relayed',
              fromPlayerId: playerId,
              payload,
              timestamp: Date.now(),
            } as any,
            playerId
          );
        }
        break;
      }

      case 'sync_request': {
        // Request full state sync from other player
        const room = roomManager.getRoomByPlayerId(playerId);
        if (room) {
          broadcastToRoom(
            room.code,
            {
              type: 'sync_request',
              fromPlayerId: playerId,
            } as any,
            playerId
          );
        }
        break;
      }

      default:
        sendError(playerId, `Unknown message type: ${(message as any).type}`, 'UNKNOWN_TYPE');
    }
  } catch (error) {
    console.error('[ERROR] Handling message:', error);
    sendError(playerId, 'Internal server error', 'INTERNAL_ERROR');
  }
}

/**
 * Handle player disconnect
 */
function handleDisconnect(playerId: string, reason: string = 'disconnect'): void {
  const conn = playerConnections.get(playerId);
  const result = roomManager.markPlayerDisconnected(playerId);
  
  if (result.roomCode) {
    broadcastToRoom(result.roomCode, {
      type: 'player_left',
      playerId,
      reason,
    } as any);

    if (result.room) {
      const roomState = roomManager.getRoomState(result.roomCode);
      if (roomState) {
        broadcastToRoom(result.roomCode, {
          type: 'room_state',
          roomState: roomState as any,
        });
      }
    }
  }

  // Keep reconnect token valid for grace period
  // (already set when joining/creating room)

  playerConnections.delete(playerId);
  console.log(`[DISCONNECT] Player ${playerId} (${reason})`);
}

/**
 * Validate origin header
 */
function validateOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  
  if (!origin) {
    return true;
  }

  return ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || 
    origin.startsWith(allowed) || 
    allowed === '*'
  );
}

// Create HTTP server
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health') {
    const stats = {
      status: 'ok',
      timestamp: Date.now(),
      connections: playerConnections.size,
      rooms: roomManager.getRoomCount(),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
  } else if (req.url === '/stats') {
    const stats = {
      connections: playerConnections.size,
      rooms: roomManager.getRoomCount(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  verifyClient: (info: { req: IncomingMessage; origin: string; secure: boolean }) => {
    const isValid = validateOrigin(info.req);
    if (!isValid) {
      console.log(`[REJECT] Connection from origin: ${info.req.headers.origin}`);
    }
    return isValid;
  }
});

// Heartbeat to detect dead connections
const heartbeatInterval = setInterval(() => {
  playerConnections.forEach((conn, playerId) => {
    if (!conn.isAlive) {
      // Connection didn't respond to last ping
      console.log(`[TIMEOUT] Player ${playerId} - no heartbeat response`);
      conn.ws.terminate();
      handleDisconnect(playerId, 'timeout');
      return;
    }

    // Mark as not alive and send ping
    conn.isAlive = false;
    try {
      conn.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    } catch (e) {
      // Failed to send ping
      conn.ws.terminate();
      handleDisconnect(playerId, 'ping_failed');
    }
  });
}, HEARTBEAT_INTERVAL);

// Clean up expired reconnect tokens
const tokenCleanupInterval = setInterval(() => {
  const now = Date.now();
  reconnectTokens.forEach((data, token) => {
    if (data.expires < now) {
      reconnectTokens.delete(token);
    }
  });
}, 60000); // Every minute

// Periodic cleanup of stale Firestore rooms
let firestoreCleanupInterval: NodeJS.Timeout | null = null;
if (firestoreService) {
  firestoreCleanupInterval = setInterval(async () => {
    try {
      const count = await firestoreService!.cleanupStaleRooms();
      if (count > 0) {
        console.log(`[FIRESTORE CLEANUP] Removed ${count} stale rooms`);
      }
    } catch (error) {
      console.error('[FIRESTORE CLEANUP] Error:', error);
    }
  }, CLEANUP_INTERVAL);
  console.log(`Firestore cleanup task scheduled every ${CLEANUP_INTERVAL / 1000}s`);
}

wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
  const playerId = generatePlayerId();
  
  const conn: PlayerConnection = {
    ws,
    isAlive: true,
    lastPing: Date.now(),
  };
  playerConnections.set(playerId, conn);

  console.log(`[CONNECT] Player ${playerId} from ${request.socket.remoteAddress}`);

  // Send connection confirmation with server time for sync
  const connectedMsg: ServerMessage = { 
    type: 'connected', 
    playerId,
    serverTime: Date.now(),
  } as any;
  ws.send(JSON.stringify(connectedMsg));

  ws.on('message', (data: Buffer) => {
    try {
      handleMessage(playerId, data.toString());
    } catch (error) {
      console.error('[ERROR] Processing message:', error);
      sendError(playerId, 'Failed to process message', 'PROCESS_ERROR');
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[CLOSE] Player ${playerId} - code: ${code}`);
    handleDisconnect(playerId, 'closed');
  });

  ws.on('error', (error) => {
    console.error(`[ERROR] WebSocket for ${playerId}:`, error.message);
    handleDisconnect(playerId, 'error');
  });

  // Handle pong from native WebSocket ping
  ws.on('pong', () => {
    const conn = playerConnections.get(playerId);
    if (conn) {
      conn.isAlive = true;
    }
  });
});

wss.on('error', (error) => {
  console.error('[SERVER ERROR]', error);
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🎮 RHYTHMIA Multiplayer Server         ║
╠════════════════════════════════════════════╣
║  WebSocket: ws://${HOST}:${PORT}               ║
║  Health:    http://${HOST}:${PORT}/health      ║
║  Stats:     http://${HOST}:${PORT}/stats       ║
╠════════════════════════════════════════════╣
║  Heartbeat:  ${HEARTBEAT_INTERVAL / 1000}s                          ║
║  Timeout:    ${CLIENT_TIMEOUT / 1000}s                          ║
║  Reconnect:  ${RECONNECT_GRACE_PERIOD / 1000}s grace period          ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[SHUTDOWN] ${signal} received`);
  
  clearInterval(heartbeatInterval);
  clearInterval(tokenCleanupInterval);
  if (firestoreCleanupInterval) {
    clearInterval(firestoreCleanupInterval);
  }

  // Notify all connected players
  playerConnections.forEach((conn, playerId) => {
    try {
      conn.ws.send(JSON.stringify({ 
        type: 'server_shutdown',
        message: 'Server is restarting, please reconnect'
      }));
      conn.ws.close(1001, 'Server shutdown');
    } catch (e) {}
  });

  wss.close(() => {
    server.close(() => {
      console.log('[SHUTDOWN] Complete');
      process.exit(0);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('[SHUTDOWN] Forced exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
