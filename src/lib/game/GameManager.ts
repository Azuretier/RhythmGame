import { Room, Player, RoomState, ScoreEvent, GAME_CONFIG, RATE_LIMIT } from '@/types/game';

export class GameManager {
  private rooms: Map<string, Room> = new Map();
  private roomCodeToId: Map<string, string> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  private scoreEventCounts: Map<string, number[]> = new Map();

  /**
   * Generate a unique room code
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = Array.from({ length: GAME_CONFIG.ROOM_CODE_LENGTH }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
    } while (this.roomCodeToId.has(code));
    return code;
  }

  /**
   * Create a new game room
   */
  createRoom(hostId: string, hostName: string): { roomId: string; roomCode: string } {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const roomCode = this.generateRoomCode();

    const host: Player = {
      id: hostId,
      name: hostName,
      score: 0,
      isHost: true,
      connected: true,
    };

    const room: Room = {
      id: roomId,
      code: roomCode,
      hostId,
      players: new Map([[hostId, host]]),
      state: RoomState.LOBBY,
      gameDuration: GAME_CONFIG.DEFAULT_DURATION,
      maxPlayers: GAME_CONFIG.MAX_PLAYERS,
    };

    this.rooms.set(roomId, room);
    this.roomCodeToId.set(roomCode, roomId);
    this.playerToRoom.set(hostId, roomId);

    return { roomId, roomCode };
  }

  /**
   * Join an existing room
   */
  joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string
  ): { success: boolean; roomId?: string; room?: Room; error?: string } {
    const roomId = this.roomCodeToId.get(roomCode);

    if (!roomId) {
      return { success: false, error: 'Room not found' };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.state !== RoomState.LOBBY) {
      return { success: false, error: 'Game already in progress' };
    }

    if (room.players.size >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    // Check if player is already in a room
    const existingRoomId = this.playerToRoom.get(playerId);
    if (existingRoomId && existingRoomId !== roomId) {
      this.leaveRoom(playerId);
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      isHost: false,
      connected: true,
    };

    room.players.set(playerId, player);
    this.playerToRoom.set(playerId, roomId);

    return { success: true, roomId, room };
  }

  /**
   * Leave a room
   */
  leaveRoom(playerId: string): boolean {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.players.delete(playerId);
    this.playerToRoom.delete(playerId);
    this.scoreEventCounts.delete(playerId);

    // If host leaves, assign new host or delete room
    if (room.hostId === playerId) {
      if (room.players.size > 0) {
        const newHost = Array.from(room.players.values())[0];
        newHost.isHost = true;
        room.hostId = newHost.id;
      } else {
        // Room is empty, delete it
        this.roomCodeToId.delete(room.code);
        this.rooms.delete(roomId);
      }
    }

    return true;
  }

  /**
   * Handle player disconnect
   */
  handleDisconnect(playerId: string): { roomId?: string; room?: Room } {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return {};

    const room = this.rooms.get(roomId);
    if (!room) return {};

    const player = room.players.get(playerId);
    if (player) {
      player.connected = false;
    }

    // If host disconnects during lobby, remove them
    if (room.state === RoomState.LOBBY && room.hostId === playerId) {
      this.leaveRoom(playerId);
    }

    return { roomId, room };
  }

  /**
   * Handle player reconnect
   */
  handleReconnect(playerId: string, roomId: string): { success: boolean; room?: Room } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false };
    }

    const player = room.players.get(playerId);
    if (!player) {
      return { success: false };
    }

    player.connected = true;
    this.playerToRoom.set(playerId, roomId);

    return { success: true, room };
  }

  /**
   * Start a game
   */
  startGame(playerId: string): { success: boolean; room?: Room; error?: string } {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) {
      return { success: false, error: 'Not in a room' };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.hostId !== playerId) {
      return { success: false, error: 'Only host can start the game' };
    }

    if (room.state !== RoomState.LOBBY) {
      return { success: false, error: 'Game already started' };
    }

    if (room.players.size < GAME_CONFIG.MIN_PLAYERS) {
      return { success: false, error: 'Not enough players' };
    }

    // Set game start time (in the future to allow for countdown)
    room.gameStartTime = Date.now() + GAME_CONFIG.COUNTDOWN_DURATION * 1000;
    room.state = RoomState.COUNTDOWN;

    // Reset all player scores
    room.players.forEach((player) => {
      player.score = 0;
    });

    // Schedule state change to ACTIVE
    setTimeout(() => {
      const currentRoom = this.rooms.get(roomId);
      if (currentRoom && currentRoom.state === RoomState.COUNTDOWN) {
        currentRoom.state = RoomState.ACTIVE;
      }
    }, GAME_CONFIG.COUNTDOWN_DURATION * 1000);

    // Schedule game end
    setTimeout(() => {
      const currentRoom = this.rooms.get(roomId);
      if (currentRoom && currentRoom.state === RoomState.ACTIVE) {
        this.endGame(roomId);
      }
    }, (GAME_CONFIG.COUNTDOWN_DURATION + room.gameDuration) * 1000);

    return { success: true, room };
  }

  /**
   * Process score event with rate limiting
   */
  processScoreEvent(
    playerId: string,
    event: ScoreEvent
  ): { success: boolean; newScore?: number; error?: string } {
    // Rate limiting check
    const now = Date.now();
    const eventTimes = this.scoreEventCounts.get(playerId) || [];
    const recentEvents = eventTimes.filter(
      (time) => now - time < RATE_LIMIT.MAX_EVENTS_WINDOW_MS
    );

    if (recentEvents.length >= RATE_LIMIT.MAX_EVENTS_PER_SECOND) {
      return { success: false, error: 'Rate limit exceeded' };
    }

    recentEvents.push(now);
    this.scoreEventCounts.set(playerId, recentEvents);

    // Get room and player
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) {
      return { success: false, error: 'Not in a room' };
    }

    const room = this.rooms.get(roomId);
    if (!room || room.state !== RoomState.ACTIVE) {
      return { success: false, error: 'Game not active' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Validate event
    if (!['click', 'combo', 'bonus'].includes(event.type)) {
      return { success: false, error: 'Invalid event type' };
    }

    if (event.value < 0 || event.value > GAME_CONFIG.MAX_EVENT_VALUE) {
      return { success: false, error: 'Invalid event value' };
    }

    // Update score
    player.score += event.value;
    player.lastScoreEventTime = now;

    return { success: true, newScore: player.score };
  }

  /**
   * End a game
   */
  private endGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.state = RoomState.FINISHED;

    // Clean up rate limit tracking
    room.players.forEach((player) => {
      this.scoreEventCounts.delete(player.id);
    });

    // Auto return to lobby after 10 seconds
    setTimeout(() => {
      const currentRoom = this.rooms.get(roomId);
      if (currentRoom && currentRoom.state === RoomState.FINISHED) {
        currentRoom.state = RoomState.LOBBY;
        currentRoom.gameStartTime = undefined;
        currentRoom.players.forEach((player) => {
          player.score = 0;
        });
      }
    }, 10000);
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get room ID by player ID
   */
  getRoomIdByPlayer(playerId: string): string | undefined {
    return this.playerToRoom.get(playerId);
  }

  /**
   * Get leaderboard for a room
   */
  getLeaderboard(roomId: string): Player[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.players.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get players as array (for serialization)
   */
  getPlayersArray(room: Room): Player[] {
    return Array.from(room.players.values());
  }
}

// Singleton instance
export const gameManager = new GameManager();
