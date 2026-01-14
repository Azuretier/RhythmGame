import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import type { IncomingMessage } from 'http';
import { MultiplayerRoomManager } from './src/lib/multiplayer/RoomManager';
import type {
  ClientMessage,
  ServerMessage,
  ErrorMessage,
} from './src/types/multiplayer';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

// Initialize room manager
const roomManager = new MultiplayerRoomManager();

// Track player connections
const playerConnections = new Map<string, WebSocket>();

/**
 * Generate a unique player ID
 */
function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Send a message to a specific player
 */
function sendToPlayer(playerId: string, message: ServerMessage): void {
  const ws = playerConnections.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
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
function handleMessage(playerId: string, data: string): void {
  let message: ClientMessage;

  try {
    message = JSON.parse(data);
  } catch (error) {
    sendError(playerId, 'Invalid JSON message');
    return;
  }

  if (!isValidMessage(message)) {
    sendError(playerId, 'Invalid message format');
    return;
  }

  try {
    switch (message.type) {
      case 'create_room': {
        const { roomCode, player } = roomManager.createRoom(playerId, message.playerName);
        
        sendToPlayer(playerId, {
          type: 'room_created',
          roomCode,
          playerId: player.id,
        });

        const roomState = roomManager.getRoomState(roomCode);
        if (roomState) {
          sendToPlayer(playerId, {
            type: 'room_state',
            roomState,
          });
        }

        console.log(`Room ${roomCode} created by ${player.name}`);
        break;
      }

      case 'join_room': {
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

        sendToPlayer(playerId, {
          type: 'joined_room',
          roomCode: message.roomCode,
          playerId: result.player!.id,
          roomState,
        });

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
        broadcastToRoom(message.roomCode, {
          type: 'room_state',
          roomState,
        });

        console.log(`${result.player!.name} joined room ${message.roomCode}`);
        break;
      }

      case 'leave_room': {
        const result = roomManager.removePlayerFromRoom(playerId);
        
        if (result.roomCode) {
          broadcastToRoom(result.roomCode, {
            type: 'player_left',
            playerId,
          });

          if (result.room) {
            const roomState = roomManager.getRoomState(result.roomCode);
            if (roomState) {
              broadcastToRoom(result.roomCode, {
                type: 'room_state',
                roomState,
              });
            }
          }

          console.log(`Player ${playerId} left room ${result.roomCode}`);
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
              roomState,
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
          broadcastToRoom(roomCode, {
            type: 'game_started',
          });

          const roomState = roomManager.getRoomState(roomCode);
          if (roomState) {
            broadcastToRoom(roomCode, {
              type: 'room_state',
              roomState,
            });
          }

          console.log(`Game started in room ${roomCode}`);
        }
        break;
      }

      case 'relay': {
        const room = roomManager.getRoomByPlayerId(playerId);
        if (room) {
          const roomCode = room.code;
          broadcastToRoom(
            roomCode,
            {
              type: 'relayed',
              fromPlayerId: playerId,
              payload: message.payload,
            },
            playerId
          );
        }
        break;
      }

      default:
        sendError(playerId, `Unknown message type: ${(message as any).type}`);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendError(playerId, 'Internal server error');
  }
}

/**
 * Handle player disconnect
 */
function handleDisconnect(playerId: string): void {
  const result = roomManager.markPlayerDisconnected(playerId);
  
  if (result.roomCode) {
    broadcastToRoom(result.roomCode, {
      type: 'player_left',
      playerId,
    });

    if (result.room) {
      const roomState = roomManager.getRoomState(result.roomCode);
      if (roomState) {
        broadcastToRoom(result.roomCode, {
          type: 'room_state',
          roomState,
        });
      }
    }
  }

  playerConnections.delete(playerId);
  console.log(`Player ${playerId} disconnected`);
}

/**
 * Validate origin header
 */
function validateOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  
  if (!origin) {
    // Allow connections without origin (e.g., native apps)
    return true;
  }

  return ALLOWED_ORIGINS.includes(origin);
}

// Create HTTP server
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
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
      console.log(`Rejected connection from origin: ${info.req.headers.origin}`);
    }
    return isValid;
  }
});

wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
  const playerId = generatePlayerId();
  playerConnections.set(playerId, ws);

  console.log(`Player ${playerId} connected from ${request.socket.remoteAddress}`);

  // Send player ID to client
  const connectedMsg: ServerMessage = { type: 'connected', playerId };
  ws.send(JSON.stringify(connectedMsg));

  ws.on('message', (data: Buffer) => {
    try {
      handleMessage(playerId, data.toString());
    } catch (error) {
      console.error('Error processing message:', error);
      sendError(playerId, 'Failed to process message');
    }
  });

  ws.on('close', () => {
    handleDisconnect(playerId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for player ${playerId}:`, error);
    handleDisconnect(playerId);
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`WebSocket multiplayer server running on ${HOST}:${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
