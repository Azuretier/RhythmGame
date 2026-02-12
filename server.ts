import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';
import { gameManager } from './src/lib/game/GameManager';
import {
  GAME_CONFIG,
  type ServerToClientEvents,
  type ClientToServerEvents,
  type Player,
} from './src/types/game';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: dev ? ['http://localhost:3000'] : [],
      methods: ['GET', 'POST'],
    },
  });

  // Broadcast current online count to all clients
  function broadcastOnlineCount() {
    const count = io.engine.clientsCount;
    io.emit('online:count', count);
  }

  // Socket.IO event handlers
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log('Client connected:', socket.id);

    // Send current online count to all clients
    broadcastOnlineCount();

    // Create room
    socket.on('room:create', (playerName: string, callback) => {
      try {
        const { roomId, roomCode } = gameManager.createRoom(socket.id, playerName);
        socket.join(roomId);
        callback({ success: true, roomCode, roomId });
        console.log(`Room created: ${roomCode} by ${playerName}`);
      } catch (error) {
        console.error('Error creating room:', error);
        callback({ success: false, error: 'Failed to create room' });
      }
    });

    // Join room
    socket.on('room:join', ({ roomCode, playerName }, callback) => {
      try {
        const result = gameManager.joinRoom(roomCode, socket.id, playerName);
        
        if (!result.success) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.join(result.roomId!);
        const players = gameManager.getPlayersArray(result.room!);
        
        callback({
          success: true,
          roomId: result.roomId,
          players,
          state: result.room!.state,
        });

        // Notify others in the room
        const player = result.room!.players.get(socket.id);
        if (player) {
          socket.to(result.roomId!).emit('room:player-joined', player);
        }

        // Broadcast full player list to ensure all clients are in sync
        const allPlayers = gameManager.getPlayersArray(result.room!);
        io.to(result.roomId!).emit('room:players-sync', allPlayers);

        console.log(`${playerName} joined room: ${roomCode}`);
      } catch (error) {
        console.error('Error joining room:', error);
        callback({ success: false, error: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('room:leave', () => {
      const roomId = gameManager.getRoomIdByPlayer(socket.id);
      if (roomId) {
        gameManager.leaveRoom(socket.id);
        socket.to(roomId).emit('room:player-left', socket.id);
        socket.leave(roomId);
        console.log(`Player ${socket.id} left room ${roomId}`);
      }
    });

    // Start game
    socket.on('game:start', (callback) => {
      try {
        const result = gameManager.startGame(socket.id);
        
        if (!result.success) {
          callback({ success: false, error: result.error });
          return;
        }

        const roomId = gameManager.getRoomIdByPlayer(socket.id)!;
        const room = result.room!;

        // Notify all players about game starting
        io.to(roomId).emit('room:state-changed', room.state);
        io.to(roomId).emit('game:starting', {
          startAt: room.gameStartTime!,
          duration: room.gameDuration,
        });

        callback({ success: true });

        // Emit game started after countdown
        setTimeout(() => {
          const currentRoom = gameManager.getRoom(roomId);
          if (currentRoom) {
            io.to(roomId).emit('game:started');
            io.to(roomId).emit('room:state-changed', currentRoom.state);
          }
        }, GAME_CONFIG.COUNTDOWN_DURATION * 1000);

        // Emit game finished after game duration
        setTimeout(() => {
          const currentRoom = gameManager.getRoom(roomId);
          if (currentRoom) {
            const leaderboard = gameManager.getLeaderboard(roomId);
            io.to(roomId).emit('game:finished', leaderboard);
            io.to(roomId).emit('room:state-changed', currentRoom.state);
          }
        }, (GAME_CONFIG.COUNTDOWN_DURATION + room.gameDuration) * 1000);

        console.log(`Game started in room ${roomId}`);
      } catch (error) {
        console.error('Error starting game:', error);
        callback({ success: false, error: 'Failed to start game' });
      }
    });

    // Process score event
    socket.on('game:score-event', (event) => {
      try {
        const result = gameManager.processScoreEvent(socket.id, event);
        
        if (result.success) {
          const roomId = gameManager.getRoomIdByPlayer(socket.id);
          if (roomId) {
            io.to(roomId).emit('game:score-update', {
              playerId: socket.id,
              score: result.newScore!,
            });
          }
        }
      } catch (error) {
        console.error('Error processing score event:', error);
      }
    });

    // Reconnection attempt
    socket.on('reconnect:attempt', ({ roomId, playerId }) => {
      try {
        const result = gameManager.handleReconnect(playerId, roomId);
        
        if (result.success) {
          socket.join(roomId);
          const players = gameManager.getPlayersArray(result.room!);
          socket.emit('room:joined', {
            roomId,
            players,
            state: result.room!.state,
          });
          socket.to(roomId).emit('room:player-reconnected', playerId);
          console.log(`Player ${playerId} reconnected to room ${roomId}`);
        }
      } catch (error) {
        console.error('Error reconnecting:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const result = gameManager.handleDisconnect(socket.id);

      if (result.roomId) {
        socket.to(result.roomId).emit('room:player-disconnected', socket.id);
        console.log(`Player ${socket.id} disconnected from room ${result.roomId}`);
      }

      console.log('Client disconnected:', socket.id);

      // Update online count for remaining clients
      broadcastOnlineCount();
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
