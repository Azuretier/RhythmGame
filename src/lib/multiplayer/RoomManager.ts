import {
  MultiplayerPlayer,
  RoomPhase,
  RoomStateData,
  MULTIPLAYER_CONFIG,
} from '../../types/multiplayer';

interface Room {
  code: string;
  hostId: string;
  players: Map<string, MultiplayerPlayer>;
  phase: RoomPhase;
  maxPlayers: number;
}

export class MultiplayerRoomManager {
  private rooms: Map<string, Room> = new Map();
  private roomCodeToId: Map<string, string> = new Map();
  private playerToRoomCode: Map<string, string> = new Map();

  /**
   * Generate a unique room code using base32-like uppercase chars
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = Array.from(
        { length: MULTIPLAYER_CONFIG.ROOM_CODE_LENGTH },
        () => chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error('Failed to generate unique room code');
      }
    } while (this.roomCodeToId.has(code));

    return code;
  }

  /**
   * Validate room code format
   */
  private isValidRoomCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    if (code.length !== MULTIPLAYER_CONFIG.ROOM_CODE_LENGTH) return false;
    const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    return validChars.test(code);
  }

  /**
   * Create a new room
   */
  createRoom(
    playerId: string,
    playerName: string
  ): { roomCode: string; player: MultiplayerPlayer } {
    // Clean player name
    const cleanName = (playerName || 'Player').trim().slice(0, 20);

    // Remove player from any existing room
    this.removePlayerFromRoom(playerId);

    const roomCode = this.generateRoomCode();
    const player: MultiplayerPlayer = {
      id: playerId,
      name: cleanName,
      isHost: true,
      isReady: false,
      connected: true,
    };

    const room: Room = {
      code: roomCode,
      hostId: playerId,
      players: new Map([[playerId, player]]),
      phase: RoomPhase.LOBBY,
      maxPlayers: MULTIPLAYER_CONFIG.DEFAULT_MAX_PLAYERS,
    };

    this.rooms.set(roomCode, room);
    this.roomCodeToId.set(roomCode, roomCode);
    this.playerToRoomCode.set(playerId, roomCode);

    return { roomCode, player };
  }

  /**
   * Join an existing room
   */
  joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string
  ): { success: boolean; player?: MultiplayerPlayer; room?: Room; error?: string } {
    // Validate room code format
    if (!this.isValidRoomCode(roomCode)) {
      return { success: false, error: 'Invalid room code format' };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.phase !== RoomPhase.LOBBY) {
      return { success: false, error: 'Game already in progress' };
    }

    if (room.players.size >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    // Check if player is already in the room
    if (room.players.has(playerId)) {
      return { success: false, error: 'Already in this room' };
    }

    // Remove player from any other room
    this.removePlayerFromRoom(playerId);

    // Clean player name
    const cleanName = (playerName || 'Player').trim().slice(0, 20);

    const player: MultiplayerPlayer = {
      id: playerId,
      name: cleanName,
      isHost: false,
      isReady: false,
      connected: true,
    };

    room.players.set(playerId, player);
    this.playerToRoomCode.set(playerId, roomCode);

    return { success: true, player, room };
  }

  /**
   * Set player ready status
   */
  setPlayerReady(
    playerId: string,
    ready: boolean
  ): { success: boolean; room?: Room; error?: string } {
    const roomCode = this.playerToRoomCode.get(playerId);
    if (!roomCode) {
      return { success: false, error: 'Not in a room' };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found in room' };
    }

    player.isReady = ready;
    return { success: true, room };
  }

  /**
   * Start game (host only)
   */
  startGame(playerId: string): { success: boolean; room?: Room; error?: string } {
    const roomCode = this.playerToRoomCode.get(playerId);
    if (!roomCode) {
      return { success: false, error: 'Not in a room' };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.hostId !== playerId) {
      return { success: false, error: 'Only host can start the game' };
    }

    if (room.phase !== RoomPhase.LOBBY) {
      return { success: false, error: 'Game already started' };
    }

    // Check if all players are ready (except host)
    const nonHostPlayers = Array.from(room.players.values()).filter(
      (p) => !p.isHost
    );
    const allReady = nonHostPlayers.every((p) => p.isReady);

    if (!allReady && nonHostPlayers.length > 0) {
      return { success: false, error: 'Not all players are ready' };
    }

    room.phase = RoomPhase.PLAYING;
    return { success: true, room };
  }

  /**
   * Remove player from their current room
   */
  removePlayerFromRoom(playerId: string): { roomCode?: string; room?: Room } {
    const roomCode = this.playerToRoomCode.get(playerId);
    if (!roomCode) {
      return {};
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.playerToRoomCode.delete(playerId);
      return {};
    }

    room.players.delete(playerId);
    this.playerToRoomCode.delete(playerId);

    // Handle host migration or room deletion
    if (room.hostId === playerId) {
      if (room.players.size > 0) {
        // Migrate host to next player
        const newHost = Array.from(room.players.values())[0];
        newHost.isHost = true;
        room.hostId = newHost.id;
        console.log(`Host migrated to ${newHost.name} in room ${roomCode}`);
      } else {
        // Room is empty, delete it
        this.rooms.delete(roomCode);
        this.roomCodeToId.delete(roomCode);
        console.log(`Room ${roomCode} deleted (empty)`);
        return { roomCode };
      }
    }

    return { roomCode, room };
  }

  /**
   * Mark player as disconnected
   */
  markPlayerDisconnected(playerId: string): { roomCode?: string; room?: Room } {
    const roomCode = this.playerToRoomCode.get(playerId);
    if (!roomCode) {
      return {};
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return {};
    }

    const player = room.players.get(playerId);
    if (player) {
      player.connected = false;
    }

    // If it's the host in lobby, remove them immediately
    if (room.hostId === playerId && room.phase === RoomPhase.LOBBY) {
      return this.removePlayerFromRoom(playerId);
    }

    return { roomCode, room };
  }

  /**
   * Get room state for serialization
   */
  getRoomState(roomCode: string): RoomStateData | null {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return null;
    }

    return {
      roomCode: room.code,
      hostId: room.hostId,
      players: Array.from(room.players.values()),
      phase: room.phase,
      maxPlayers: room.maxPlayers,
    };
  }

  /**
   * Get room by player ID
   */
  getRoomByPlayerId(playerId: string): Room | null {
    const roomCode = this.playerToRoomCode.get(playerId);
    if (!roomCode) {
      return null;
    }
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Get all player IDs in a room
   */
  getPlayerIdsInRoom(roomCode: string): string[] {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return [];
    }
    return Array.from(room.players.keys());
  }
}
