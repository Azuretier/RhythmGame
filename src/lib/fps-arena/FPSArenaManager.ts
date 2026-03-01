// Server-side room manager for FPS Arena multiplayer
// Handles room lifecycle, position relay, and game events (no server-side physics)

import type { ServerMessage } from '@/types/multiplayer';
import { FPS_PLAYER_COLORS, FPS_CONFIG } from '@/types/fps-arena';
import type { FPSPlayer, FPSRoomState, FPSPublicRoom, FPSPlayerPosition } from '@/types/fps-arena';

interface FPSRoom {
    code: string;
    name: string;
    hostId: string;
    players: FPSPlayer[];
    status: 'waiting' | 'countdown' | 'playing' | 'finished';
    maxPlayers: number;
    seed: number;
    createdAt: number;
    lastActivity: number;
    positions: Map<string, FPSPlayerPosition>;
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

export class FPSArenaManager {
    private rooms = new Map<string, FPSRoom>();
    private playerToRoom = new Map<string, string>();
    private callbacks: ManagerCallbacks;
    private cleanupInterval: ReturnType<typeof setInterval>;

    constructor(callbacks: ManagerCallbacks) {
        this.callbacks = callbacks;
        this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
    }

    createRoom(playerId: string, playerName: string, roomName?: string): { roomCode: string; player: FPSPlayer } {
        // Leave existing room
        this.removePlayer(playerId);

        let code = generateRoomCode();
        while (this.rooms.has(code)) {
            code = generateRoomCode();
        }

        const player: FPSPlayer = {
            id: playerId,
            name: playerName.slice(0, FPS_CONFIG.PLAYER_NAME_MAX),
            color: FPS_PLAYER_COLORS[0],
            ready: false,
            connected: true,
        };

        const room: FPSRoom = {
            code,
            name: (roomName || `FPS Arena ${code}`).slice(0, FPS_CONFIG.ROOM_NAME_MAX),
            hostId: playerId,
            players: [player],
            status: 'waiting',
            maxPlayers: FPS_CONFIG.MAX_PLAYERS,
            seed: Math.floor(Math.random() * 2147483647),
            createdAt: Date.now(),
            lastActivity: Date.now(),
            positions: new Map(),
        };

        this.rooms.set(code, room);
        this.playerToRoom.set(playerId, code);
        console.log(`[FPS] Room ${code} created by ${playerName}`);
        return { roomCode: code, player };
    }

    joinRoom(roomCode: string, playerId: string, playerName: string): { success: boolean; error?: string; player?: FPSPlayer } {
        const code = roomCode.toUpperCase().trim();
        const room = this.rooms.get(code);
        if (!room) return { success: false, error: 'Room not found' };
        if (room.status !== 'waiting') return { success: false, error: 'Game already in progress' };
        if (room.players.length >= room.maxPlayers) return { success: false, error: 'Room is full' };

        // Leave existing
        this.removePlayer(playerId);

        const colorIndex = room.players.length % FPS_PLAYER_COLORS.length;
        const player: FPSPlayer = {
            id: playerId,
            name: playerName.slice(0, FPS_CONFIG.PLAYER_NAME_MAX),
            color: FPS_PLAYER_COLORS[colorIndex],
            ready: false,
            connected: true,
        };

        room.players.push(player);
        room.lastActivity = Date.now();
        this.playerToRoom.set(playerId, code);
        console.log(`[FPS] ${playerName} joined room ${code}`);
        return { success: true, player };
    }

    removePlayer(playerId: string): { roomCode?: string; room?: FPSRoom } {
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
            console.log(`[FPS] Room ${roomCode} deleted (empty)`);
            return { roomCode };
        }

        // Transfer host
        if (room.hostId === playerId) {
            room.hostId = room.players[0].id;
        }

        return { roomCode, room };
    }

    setPlayerReady(playerId: string, ready: boolean): { success: boolean; error?: string } {
        const roomCode = this.playerToRoom.get(playerId);
        if (!roomCode) return { success: false, error: 'Not in a room' };

        const room = this.rooms.get(roomCode);
        if (!room) return { success: false, error: 'Room not found' };

        const player = room.players.find(p => p.id === playerId);
        if (player) player.ready = ready;

        return { success: true };
    }

    startGame(playerId: string): { success: boolean; error?: string; gameSeed?: number } {
        const roomCode = this.playerToRoom.get(playerId);
        if (!roomCode) return { success: false, error: 'Not in a room' };

        const room = this.rooms.get(roomCode);
        if (!room) return { success: false, error: 'Room not found' };
        if (room.hostId !== playerId) return { success: false, error: 'Only host can start' };
        if (room.status !== 'waiting') return { success: false, error: 'Game already started' };

        const allReady = room.players.every(p => p.ready || p.id === room.hostId);
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

    handlePosition(playerId: string, x: number, y: number, z: number, rx: number, ry: number, weaponId: string, health: number): void {
        const roomCode = this.playerToRoom.get(playerId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
        if (!room || room.status !== 'playing') return;

        const pos: FPSPlayerPosition = { id: playerId, x, y, z, rx, ry, weaponId, health };
        room.positions.set(playerId, pos);
        room.lastActivity = Date.now();

        // Broadcast position to other players
        this.callbacks.onBroadcastToRoom(roomCode, {
            type: 'fps_player_position',
            player: pos,
        } as unknown as ServerMessage, playerId);
    }

    handleShoot(playerId: string, x: number, y: number, z: number, dx: number, dy: number, dz: number, weaponId: string): void {
        const roomCode = this.playerToRoom.get(playerId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
        if (!room || room.status !== 'playing') return;

        this.callbacks.onBroadcastToRoom(roomCode, {
            type: 'fps_player_shot',
            playerId, x, y, z, dx, dy, dz, weaponId,
        } as unknown as ServerMessage, playerId);
    }

    handleHit(attackerId: string, targetId: string, damage: number, weaponId: string, headshot: boolean): void {
        const roomCode = this.playerToRoom.get(attackerId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
        if (!room || room.status !== 'playing') return;

        // Broadcast hit to all players (including target)
        this.callbacks.onBroadcastToRoom(roomCode, {
            type: 'fps_player_hit',
            targetId, attackerId, damage, weaponId, headshot,
        } as unknown as ServerMessage);
    }

    handleDied(playerId: string, killerId: string, weaponId: string): void {
        const roomCode = this.playerToRoom.get(playerId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
        if (!room || room.status !== 'playing') return;

        this.callbacks.onBroadcastToRoom(roomCode, {
            type: 'fps_player_died',
            playerId, killerId, weaponId,
        } as unknown as ServerMessage);
    }

    handleRespawn(playerId: string): void {
        const roomCode = this.playerToRoom.get(playerId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
        if (!room || room.status !== 'playing') return;

        this.callbacks.onBroadcastToRoom(roomCode, {
            type: 'fps_player_respawned',
            playerId,
        } as unknown as ServerMessage);
    }

    handleChat(playerId: string, message: string): void {
        const roomCode = this.playerToRoom.get(playerId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === playerId);
        if (!player) return;

        const cleanMsg = message.slice(0, FPS_CONFIG.MAX_CHAT_LENGTH).trim();
        if (!cleanMsg) return;

        this.callbacks.onBroadcastToRoom(roomCode, {
            type: 'fps_chat_message',
            playerId,
            playerName: player.name,
            message: cleanMsg,
        } as unknown as ServerMessage);
    }

    // ===== Queries =====

    getRoomByPlayerId(playerId: string): FPSRoom | null {
        const code = this.playerToRoom.get(playerId);
        return code ? this.rooms.get(code) || null : null;
    }

    getRoomState(roomCode: string): FPSRoomState | null {
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

    getPublicRooms(): FPSPublicRoom[] {
        const rooms: FPSPublicRoom[] = [];
        for (const room of this.rooms.values()) {
            if (room.status === 'waiting' || room.status === 'playing') {
                const host = room.players.find(p => p.id === room.hostId);
                rooms.push({
                    code: room.code,
                    name: room.name,
                    hostName: host?.name || 'Unknown',
                    playerCount: room.players.length,
                    maxPlayers: room.maxPlayers,
                    status: room.status,
                });
            }
        }
        return rooms;
    }

    getPlayerIdsInRoom(roomCode: string): string[] {
        const room = this.rooms.get(roomCode);
        return room ? room.players.map(p => p.id) : [];
    }

    getRoomCount(): number {
        return this.rooms.size;
    }

    // ===== Disconnect / Reconnect =====

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
        const roomCode = this.playerToRoom.get(playerId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
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
        if (player) player.id = newPlayerId;

        if (room.hostId === oldPlayerId) room.hostId = newPlayerId;

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

    cleanupStaleRooms(): void {
        const now = Date.now();
        const staleTimeout = 10 * 60 * 1000; // 10 minutes

        for (const [code, room] of this.rooms) {
            if (now - room.lastActivity > staleTimeout) {
                for (const p of room.players) {
                    this.playerToRoom.delete(p.id);
                }
                this.rooms.delete(code);
                console.log(`[FPS] Cleaned up stale room ${code}`);
            }
        }
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
    }
}
