import type { Player, RoomState, PublicRoomInfo } from '@/types/multiplayer';

export interface Room {
  code: string;
  name: string;
  hostId: string;
  hostName: string;
  players: Player[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  isPublic: boolean;
  maxPlayers: number;
  createdAt: number;
  gameStartedAt?: number;
  gameSeed?: number;
}

export class MultiplayerRoomManager {
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>();
  private readonly ROOM_TIMEOUT = 5 * 60 * 1000;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
  }

  private cleanupStaleRooms(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.rooms.forEach((room, code) => {
      const connectedPlayers = room.players.filter(p => p.connected);
      if (connectedPlayers.length === 0 && now - room.createdAt > this.ROOM_TIMEOUT) {
        toDelete.push(code);
      }
      if (room.status === 'finished' && now - (room.gameStartedAt || room.createdAt) > this.ROOM_TIMEOUT) {
        toDelete.push(code);
      }
    });

    toDelete.forEach(code => {
      const room = this.rooms.get(code);
      if (room) {
        room.players.forEach(p => this.playerToRoom.delete(p.id));
      }
      this.rooms.delete(code);
      console.log(`[CLEANUP] Removed stale room ${code}`);
    });
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let attempts = 0;
    do {
      code = '';
      const len = attempts > 100 ? 5 : 4;
      for (let i = 0; i < len; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
    } while (this.rooms.has(code));
    return code;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getPublicRooms(): PublicRoomInfo[] {
    const result: PublicRoomInfo[] = [];

    this.rooms.forEach((room) => {
      if (room.isPublic && room.status === 'waiting' && room.players.length < room.maxPlayers) {
        result.push({
          code: room.code,
          name: room.name,
          hostName: room.hostName,
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
        });
      }
    });

    return result.sort((a, b) => {
      const roomA = this.rooms.get(a.code);
      const roomB = this.rooms.get(b.code);
      return (roomB?.createdAt || 0) - (roomA?.createdAt || 0);
    });
  }

  createRoom(
    playerId: string,
    playerName: string,
    roomName?: string,
    isPublic = true,
    maxPlayers = 2,
  ): { roomCode: string; player: Player } {
    const roomCode = this.generateRoomCode();
    const sanitizedPlayerName = (playerName || 'Player').slice(0, 20);
    const sanitizedRoomName = (roomName || `${sanitizedPlayerName}'s Room`).slice(0, 30);

    const player: Player = {
      id: playerId,
      name: sanitizedPlayerName,
      ready: false,
      connected: true,
    };

    const room: Room = {
      code: roomCode,
      name: sanitizedRoomName,
      hostId: playerId,
      hostName: sanitizedPlayerName,
      players: [player],
      status: 'waiting',
      isPublic,
      maxPlayers: Math.min(Math.max(maxPlayers, 2), 8),
      createdAt: Date.now(),
    };

    this.rooms.set(roomCode, room);
    this.playerToRoom.set(playerId, roomCode);

    return { roomCode, player };
  }

  joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string,
  ): { success: boolean; error?: string; player?: Player } {
    const normalizedCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'Game already in progress' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    // Reconnecting player
    const existing = room.players.find(p => p.id === playerId);
    if (existing) {
      existing.connected = true;
      return { success: true, player: existing };
    }

    const player: Player = {
      id: playerId,
      name: (playerName || 'Player').slice(0, 20),
      ready: false,
      connected: true,
    };

    room.players.push(player);
    this.playerToRoom.set(playerId, normalizedCode);

    return { success: true, player };
  }

  transferPlayer(oldPlayerId: string, newPlayerId: string): boolean {
    const roomCode = this.playerToRoom.get(oldPlayerId);
    if (!roomCode) return false;

    const room = this.rooms.get(roomCode);
    if (!room) return false;

    const player = room.players.find(p => p.id === oldPlayerId);
    if (!player) return false;

    player.id = newPlayerId;
    player.connected = true;

    if (room.hostId === oldPlayerId) {
      room.hostId = newPlayerId;
    }

    this.playerToRoom.delete(oldPlayerId);
    this.playerToRoom.set(newPlayerId, roomCode);

    return true;
  }

  removePlayerFromRoom(playerId: string): { roomCode?: string; room?: Room } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.playerToRoom.delete(playerId);
      return {};
    }

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerToRoom.delete(playerId);

    if (room.players.length === 0) {
      return { roomCode };
    }

    // Transfer host if needed
    if (room.hostId === playerId) {
      const connectedPlayer = room.players.find(p => p.connected) || room.players[0];
      room.hostId = connectedPlayer.id;
      room.hostName = connectedPlayer.name;
    }

    // End game if not enough players during gameplay
    if (room.status === 'playing' && room.players.filter(p => p.connected).length < 2) {
      room.status = 'finished';
    }

    return { roomCode, room };
  }

  markPlayerDisconnected(playerId: string): { roomCode?: string; room?: Room } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) return {};

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;
    }

    // End game if not enough connected players during gameplay
    if (room.status === 'playing' && room.players.filter(p => p.connected).length < 2) {
      room.status = 'finished';
    }

    return { roomCode, room };
  }

  reconnectPlayer(playerId: string): { roomCode?: string; room?: Room } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) return {};

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.connected = true;
    }

    return { roomCode, room };
  }

  setPlayerReady(playerId: string, ready: boolean): { success: boolean; error?: string } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return { success: false, error: 'Not in a room' };

    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    if (room.status !== 'waiting') {
      return { success: false, error: 'Game already started' };
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    player.ready = ready;
    return { success: true };
  }

  startGame(playerId: string): { success: boolean; error?: string; gameSeed?: number } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return { success: false, error: 'Not in a room' };

    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    if (room.hostId !== playerId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    if (room.players.length < 2) {
      return { success: false, error: 'Need at least 2 players' };
    }

    const notReady = room.players.filter(p => !p.ready && p.id !== room.hostId);
    if (notReady.length > 0) {
      return { success: false, error: 'All players must be ready' };
    }

    const gameSeed = Math.floor(Math.random() * 2147483647);
    room.status = 'countdown';
    room.gameStartedAt = Date.now();
    room.gameSeed = gameSeed;

    return { success: true, gameSeed };
  }

  setRoomPlaying(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room && room.status === 'countdown') {
      room.status = 'playing';
    }
  }

  endGame(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.status = 'finished';
    }
  }

  resetRoom(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    room.status = 'waiting';
    room.gameStartedAt = undefined;
    room.gameSeed = undefined;
    room.players.forEach(p => {
      p.ready = false;
    });

    return true;
  }

  getRoomState(roomCode: string): RoomState | null {
    const normalizedCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalizedCode);
    if (!room) return null;

    return {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        ready: p.ready,
        connected: p.connected,
      })),
      status: room.status,
      maxPlayers: room.maxPlayers,
      isPublic: room.isPublic,
    };
  }

  getRoomByPlayerId(playerId: string): Room | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;
    return this.rooms.get(roomCode) || null;
  }

  getPlayerIdsInRoom(roomCode: string): string[] {
    const normalizedCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalizedCode);
    if (!room) return [];
    return room.players.filter(p => p.connected).map(p => p.id);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
