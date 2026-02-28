// Server-side room manager for Minecraft World multiplayer
// Handles room lifecycle and position relay (no server-side physics)

import type { ServerMessage } from '@/types/multiplayer';
import { MW_PLAYER_COLORS, MW_CONFIG } from '@/types/minecraft-world';
import type { MWPlayer, MWRoomState, MWPublicRoom, MWPlayerPosition } from '@/types/minecraft-world';

interface MWRoom {
  code: string;
  name: string;
  hostId: string;
  players: MWPlayer[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  seed: number;
  createdAt: number;
  lastActivity: number;
  positions: Map<string, MWPlayerPosition>;
}

interface ManagerCallbacks {
  onSendToPlayer: (playerId: string, message: ServerMessage) => void;
  onBroadcastToRoom: (roomCode: string, message: ServerMessage, excludePlayerId?: string) => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class MinecraftWorldManager {
  private rooms = new Map<string, MWRoom>();
  private playerToRoom = new Map<string, string>();
  private callbacks: ManagerCallbacks;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(callbacks: ManagerCallbacks) {
    this.callbacks = callbacks;
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
  }

  createRoom(playerId: string, playerName: string, roomName?: string): { roomCode: string; player: MWPlayer } {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const player: MWPlayer = {
      id: playerId,
      name: playerName.slice(0, MW_CONFIG.PLAYER_NAME_MAX),
      color: MW_PLAYER_COLORS[0],
      ready: false,
      connected: true,
    };

    const room: MWRoom = {
      code,
      name: (roomName || `${playerName}'s World`).slice(0, MW_CONFIG.ROOM_NAME_MAX),
      hostId: playerId,
      players: [player],
      status: 'waiting',
      maxPlayers: MW_CONFIG.MAX_PLAYERS,
      seed: Math.floor(Math.random() * 2147483647),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      positions: new Map(),
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(playerId, code);

    return { roomCode: code, player };
  }

  joinRoom(roomCode: string, playerId: string, playerName: string): { success: boolean; error?: string; player?: MWPlayer } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already in progress' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'Room is full' };
    if (room.players.some(p => p.id === playerId)) return { success: false, error: 'Already in room' };

    const colorIndex = room.players.length % MW_PLAYER_COLORS.length;
    const player: MWPlayer = {
      id: playerId,
      name: playerName.slice(0, MW_CONFIG.PLAYER_NAME_MAX),
      color: MW_PLAYER_COLORS[colorIndex],
      ready: false,
      connected: true,
    };

    room.players.push(player);
    room.lastActivity = Date.now();
    this.playerToRoom.set(playerId, code);

    return { success: true, player };
  }

  removePlayer(playerId: string): { roomCode?: string; room?: MWRoom } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.playerToRoom.delete(playerId);
      return {};
    }

    room.players = room.players.filter(p => p.id !== playerId);
    room.positions.delete(playerId);
    this.playerToRoom.delete(playerId);
    room.lastActivity = Date.now();

    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
      return { roomCode };
    }

    // Transfer host if needed
    if (room.hostId === playerId) {
      const newHost = room.players.find(p => p.connected) || room.players[0];
      if (newHost) room.hostId = newHost.id;
    }

    return { roomCode, room };
  }

  setPlayerReady(playerId: string, ready: boolean): { success: boolean; error?: string } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return { success: false, error: 'Not in a room' };

    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };

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
    if (room.hostId !== playerId) return { success: false, error: 'Only the host can start' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };

    const connectedPlayers = room.players.filter(p => p.connected);
    if (connectedPlayers.length < 1) return { success: false, error: 'Not enough players' };

    const allReady = connectedPlayers.every(p => p.id === room.hostId || p.ready);
    if (!allReady) return { success: false, error: 'Not all players are ready' };

    room.status = 'countdown';
    return { success: true, gameSeed: room.seed };
  }

  beginPlaying(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.status = 'playing';
      room.lastActivity = Date.now();
    }
  }

  handlePosition(playerId: string, x: number, y: number, z: number, rx: number, ry: number): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    const pos: MWPlayerPosition = { id: playerId, x, y, z, rx, ry };
    room.positions.set(playerId, pos);

    // Relay position to all other players in the room
    this.callbacks.onBroadcastToRoom(roomCode, {
      type: 'mw_player_position',
      player: pos,
    } as unknown as ServerMessage, playerId);
  }

  handleChat(playerId: string, message: string): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    const trimmed = message.slice(0, MW_CONFIG.MAX_CHAT_LENGTH).trim();
    if (!trimmed) return;

    this.callbacks.onBroadcastToRoom(roomCode, {
      type: 'mw_chat_message',
      playerId,
      playerName: player.name,
      message: trimmed,
    } as unknown as ServerMessage);
  }

  // ===== Query Methods =====

  getRoomByPlayerId(playerId: string): MWRoom | null {
    const code = this.playerToRoom.get(playerId);
    return code ? this.rooms.get(code) || null : null;
  }

  getRoomState(roomCode: string): MWRoomState | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    return {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      players: room.players,
      status: room.status,
      maxPlayers: room.maxPlayers,
      seed: room.seed,
    };
  }

  getPublicRooms(): MWPublicRoom[] {
    const rooms: MWPublicRoom[] = [];
    for (const room of this.rooms.values()) {
      if (room.status === 'waiting' || room.status === 'playing') {
        const host = room.players.find(p => p.id === room.hostId);
        rooms.push({
          code: room.code,
          name: room.name,
          hostName: host?.name || 'Unknown',
          playerCount: room.players.filter(p => p.connected).length,
          maxPlayers: room.maxPlayers,
          status: room.status,
        });
      }
    }
    return rooms;
  }

  getPlayerIdsInRoom(roomCode: string): string[] {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    return room.players.filter(p => p.connected).map(p => p.id);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  // ===== Connection Management =====

  markDisconnected(playerId: string): { roomCode?: string } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) return {};

    const player = room.players.find(p => p.id === playerId);
    if (player) player.connected = false;

    return { roomCode };
  }

  markReconnected(playerId: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (player) player.connected = true;
  }

  transferPlayer(oldPlayerId: string, newPlayerId: string): void {
    const roomCode = this.playerToRoom.get(oldPlayerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === oldPlayerId);
    if (player) {
      player.id = newPlayerId;
      player.connected = true;
    }

    if (room.hostId === oldPlayerId) {
      room.hostId = newPlayerId;
    }

    // Transfer position
    const pos = room.positions.get(oldPlayerId);
    if (pos) {
      pos.id = newPlayerId;
      room.positions.set(newPlayerId, pos);
      room.positions.delete(oldPlayerId);
    }

    this.playerToRoom.delete(oldPlayerId);
    this.playerToRoom.set(newPlayerId, roomCode);
  }

  // ===== Cleanup =====

  private cleanupStaleRooms(): void {
    const now = Date.now();
    const staleTimeout = 300000; // 5 minutes

    for (const [code, room] of this.rooms) {
      const connectedCount = room.players.filter(p => p.connected).length;
      if (connectedCount === 0 && now - room.lastActivity > staleTimeout) {
        for (const p of room.players) {
          this.playerToRoom.delete(p.id);
        }
        this.rooms.delete(code);
        console.log(`[MW] Cleaned up stale room ${code}`);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.rooms.clear();
    this.playerToRoom.clear();
  }
}
