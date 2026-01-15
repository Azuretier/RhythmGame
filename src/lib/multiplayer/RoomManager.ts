// Types
export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
  lastSeen: number;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  gameStartedAt?: number;
  maxPlayers: number;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  players: Player[];
  phase: 'lobby' | 'ready' | 'playing' | 'finished';
  maxPlayers: number;
}

/**
 * Manages multiplayer game rooms with stability features
 */
export class MultiplayerRoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  
  // Room cleanup interval (5 minutes for empty/stale rooms)
  private readonly ROOM_TIMEOUT = 5 * 60 * 1000;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Periodically clean up stale rooms
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
  }

  /**
   * Clean up empty or stale rooms
   */
  private cleanupStaleRooms(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.rooms.forEach((room, code) => {
      // Remove rooms with no players that are older than timeout
      if (room.players.length === 0 && now - room.createdAt > this.ROOM_TIMEOUT) {
        toDelete.push(code);
      }
      // Remove finished games after timeout
      if (room.status === 'finished' && now - (room.gameStartedAt || room.createdAt) > this.ROOM_TIMEOUT) {
        toDelete.push(code);
      }
    });

    toDelete.forEach(code => {
      this.rooms.delete(code);
      console.log(`[CLEANUP] Removed stale room ${code}`);
    });
  }

  /**
   * Generate a random 4-character room code
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
      if (attempts > 100) {
        // Fallback to longer code if too many collisions
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * Get total room count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Create a new room
   */
  createRoom(playerId: string, playerName: string): { roomCode: string; player: Player } {
    const roomCode = this.generateRoomCode();
    const now = Date.now();
    
    const player: Player = {
      id: playerId,
      name: (playerName || 'Player').slice(0, 20),
      isHost: true, // Add this - creator is always host
      isReady: false,
      connected: true,
      lastSeen: now,
    };

    const room: Room = {
      code: roomCode,
      hostId: playerId,
      players: [player],
      status: 'waiting',
      createdAt: now,
      maxPlayers: 2,
    };

    this.rooms.set(roomCode, room);
    this.playerToRoom.set(playerId, roomCode);

    return { roomCode, player };
  }

  /**
   * Join an existing room
   */
  joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string
  ): { success: boolean; error?: string; player?: Player } {
    const normalizedCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'ルームが見つかりません' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'ゲームは既に開始しています' };
    }

    if (room.players.length >= 2) {
      return { success: false, error: 'ルームが満員です' };
    }

    // Check if player is already in this room
    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
      existingPlayer.connected = true;
      existingPlayer.lastSeen = Date.now();
      return { success: true, player: existingPlayer };
    }

    const player: Player = {
      id: playerId,
      name: (playerName || 'Player').slice(0, 20),
      isHost: false, // Add this - joiners are not host
      isReady: false,
      connected: true,
      lastSeen: Date.now(),
    };

    room.players.push(player);
    this.playerToRoom.set(playerId, normalizedCode);

    return { success: true, player };
  }

  /**
   * Transfer player ID (for reconnection)
   */
  transferPlayer(oldPlayerId: string, newPlayerId: string): boolean {
    const roomCode = this.playerToRoom.get(oldPlayerId);
    if (!roomCode) return false;

    const room = this.rooms.get(roomCode);
    if (!room) return false;

    const player = room.players.find(p => p.id === oldPlayerId);
    if (!player) return false;

    // Update player ID
    player.id = newPlayerId;
    player.connected = true;
    player.lastSeen = Date.now();

    // Update host if needed
    if (room.hostId === oldPlayerId && room.players.length > 0) {
      const newHost = room.players[0];
      room.hostId = newHost.id;
      newHost.isHost = true; // Add this - mark new host
    }

    // Update mapping
    this.playerToRoom.delete(oldPlayerId);
    this.playerToRoom.set(newPlayerId, roomCode);

    return true;
  }

  /**
   * Remove a player from their room
   */
  removePlayerFromRoom(playerId: string): { roomCode?: string; room?: Room } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) {
      return {};
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.playerToRoom.delete(playerId);
      return {};
    }

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerToRoom.delete(playerId);

    // If room is empty, mark for cleanup but don't delete immediately
    // (allows for reconnection)
    if (room.players.length === 0) {
      // Room will be cleaned up by cleanupStaleRooms
      return { roomCode };
    }

    // If host left, transfer host to remaining player
    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }

    // If game was in progress and only one player left, end the game
    if (room.status === 'playing' && room.players.length < 2) {
      room.status = 'finished';
    }

    return { roomCode, room };
  }

  /**
   * Mark a player as disconnected (but don't remove immediately)
   */
  markPlayerDisconnected(playerId: string): { roomCode?: string; room?: Room } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) {
      return {};
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return {};
    }

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;
      player.lastSeen = Date.now();
    }

    // For now, remove disconnected players immediately
    // In production, you might want to keep them for a grace period
    return this.removePlayerFromRoom(playerId);
  }

  /**
   * Set a player's ready status
   */
  setPlayerReady(playerId: string, ready: boolean): { success: boolean; error?: string } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) {
      return { success: false, error: 'ルームに参加していません' };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'ルームが見つかりません' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'ゲームは既に開始しています' };
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'プレイヤーが見つかりません' };
    }

    player.isReady = ready;
    player.lastSeen = Date.now();
    return { success: true };
  }

  /**
   * Start the game (host only)
   */
  startGame(playerId: string): { success: boolean; error?: string } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) {
      return { success: false, error: 'ルームに参加していません' };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'ルームが見つかりません' };
    }

    if (room.hostId !== playerId) {
      return { success: false, error: 'ホストのみがゲームを開始できます' };
    }

    if (room.players.length < 2) {
      return { success: false, error: '2人のプレイヤーが必要です' };
    }

    const notReadyPlayers = room.players.filter(p => !p.isReady);
    if (notReadyPlayers.length > 0) {
      return { success: false, error: '全員が準備完了する必要があります' };
    }

    room.status = 'playing';
    room.gameStartedAt = Date.now();
    return { success: true };
  }

  /**
   * End the game
   */
  endGame(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.status = 'finished';
    }
  }

  /**
   * Reset room for rematch
   */
  resetRoom(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    room.status = 'waiting';
    room.gameStartedAt = undefined;
    room.players.forEach(p => {
      p.isReady = false;
    });

    return true;
  }

  /**
   * Get room state
   */
  getRoomState(roomCode: string): RoomState | null {
    const normalizedCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalizedCode);
    if (!room) {
      return null;
    }

    return {
      roomCode: room.code,
      hostId: room.hostId,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isReady: p.isReady,
        connected: p.connected,
        lastSeen: p.lastSeen,
      })),
      phase: room.status as 'lobby' | 'ready' | 'playing' | 'finished',
      maxPlayers: room.maxPlayers,
    };
  }

  /**
   * Get room by player ID
   */
  getRoomByPlayerId(playerId: string): Room | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) {
      return null;
    }
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Get all player IDs in a room
   */
  getPlayerIdsInRoom(roomCode: string): string[] {
    const normalizedCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalizedCode);
    if (!room) {
      return [];
    }
    return room.players.filter(p => p.connected).map(p => p.id);
  }

  /**
   * Update player's last seen timestamp
   */
  updatePlayerActivity(playerId: string): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.lastSeen = Date.now();
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}