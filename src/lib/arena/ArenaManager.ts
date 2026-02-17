import type {
  ArenaPlayer,
  ArenaRoomState,
  ArenaGimmick,
  ArenaAction,
  GimmickType,
  ArenaRanking,
  ArenaSessionStats,
} from '@/types/arena';
import {
  ARENA_MAX_PLAYERS,
  ARENA_MIN_PLAYERS,
  ARENA_BASE_BPM,
  ARENA_CHAOS_DECAY_RATE,
  ARENA_CHAOS_GIMMICK_THRESHOLD,
  ARENA_CHAOS_FRENZY_THRESHOLD,
  ARENA_TEMPO_COLLAPSE_THRESHOLD,
  ARENA_TICK_RATE,
  GIMMICK_DURATIONS,
  GIMMICK_WEIGHTS,
} from '@/types/arena';

// ===== Arena Room (Server-side) =====

export interface ArenaRoom {
  code: string;
  name: string;
  hostId: string;
  players: ArenaPlayer[];
  status: 'waiting' | 'countdown' | 'playing' | 'ended';
  maxPlayers: number;
  createdAt: number;
  gameStartedAt: number | null;
  gameSeed: number | null;

  // Tempo engine
  bpm: number;
  baseBpm: number;
  beatPhase: number;
  lastBeatTime: number;
  tempoCollapseCount: number;

  // Chaos system
  chaosLevel: number;
  peakChaos: number;

  // Gimmick system
  activeGimmick: ArenaGimmick | null;
  gimmickCooldown: number;
  totalGimmicks: number;

  // Player sync tracking
  syncMap: Map<string, number>;

  // Stats
  peakBpm: number;
  lowestBpm: number;

  // Elimination tracking
  eliminationOrder: string[];
}

// ===== Callbacks for server integration =====

export interface ArenaCallbacks {
  onBroadcast: (roomCode: string, message: object, excludePlayerId?: string) => void;
  onSendToPlayer: (playerId: string, message: object) => void;
  onSessionEnd: (roomCode: string) => void;
}

// ===== Arena Room Manager =====

export class ArenaRoomManager {
  private rooms = new Map<string, ArenaRoom>();
  private playerToRoom = new Map<string, string>();
  private tickIntervals = new Map<string, NodeJS.Timeout>();
  private readonly ROOM_TIMEOUT = 10 * 60 * 1000;
  private cleanupInterval: NodeJS.Timeout;
  private callbacks: ArenaCallbacks;

  constructor(callbacks: ArenaCallbacks) {
    this.callbacks = callbacks;
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
  }

  // ===== Room Lifecycle =====

  createRoom(
    playerId: string,
    playerName: string,
    roomName?: string,
  ): { roomCode: string; player: ArenaPlayer } {
    const roomCode = this.generateRoomCode();
    const sanitizedName = (playerName || 'Player').slice(0, 20);
    const sanitizedRoomName = (roomName || `${sanitizedName}'s Arena`).slice(0, 30);

    const player: ArenaPlayer = {
      id: playerId,
      name: sanitizedName,
      ready: false,
      connected: true,
      alive: true,
      score: 0,
      lines: 0,
      combo: 0,
      syncAccuracy: 1.0,
      chaosContribution: 0,
      kills: 0,
      placement: null,
    };

    const room: ArenaRoom = {
      code: roomCode,
      name: sanitizedRoomName,
      hostId: playerId,
      players: [player],
      status: 'waiting',
      maxPlayers: ARENA_MAX_PLAYERS,
      createdAt: Date.now(),
      gameStartedAt: null,
      gameSeed: null,
      bpm: ARENA_BASE_BPM,
      baseBpm: ARENA_BASE_BPM,
      beatPhase: 0,
      lastBeatTime: 0,
      tempoCollapseCount: 0,
      chaosLevel: 0,
      peakChaos: 0,
      activeGimmick: null,
      gimmickCooldown: 0,
      totalGimmicks: 0,
      syncMap: new Map(),
      peakBpm: ARENA_BASE_BPM,
      lowestBpm: ARENA_BASE_BPM,
      eliminationOrder: [],
    };

    this.rooms.set(roomCode, room);
    this.playerToRoom.set(playerId, roomCode);

    return { roomCode, player };
  }

  joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string,
  ): { success: boolean; error?: string; player?: ArenaPlayer } {
    const normalized = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalized);

    if (!room) return { success: false, error: 'Arena not found' };
    if (room.status !== 'waiting') return { success: false, error: 'Arena already in progress' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'Arena is full' };

    const existing = room.players.find(p => p.id === playerId);
    if (existing) {
      existing.connected = true;
      return { success: true, player: existing };
    }

    const player: ArenaPlayer = {
      id: playerId,
      name: (playerName || 'Player').slice(0, 20),
      ready: false,
      connected: true,
      alive: true,
      score: 0,
      lines: 0,
      combo: 0,
      syncAccuracy: 1.0,
      chaosContribution: 0,
      kills: 0,
      placement: null,
    };

    room.players.push(player);
    this.playerToRoom.set(playerId, normalized);

    return { success: true, player };
  }

  setPlayerReady(playerId: string, ready: boolean): { success: boolean; error?: string } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return { success: false, error: 'Not in an arena' };

    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Arena not found' };
    if (room.status !== 'waiting') return { success: false, error: 'Arena already started' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    player.ready = ready;
    return { success: true };
  }

  startGame(playerId: string): { success: boolean; error?: string; gameSeed?: number } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return { success: false, error: 'Not in an arena' };

    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Arena not found' };
    if (room.hostId !== playerId) return { success: false, error: 'Only the host can start' };
    if (room.players.length < ARENA_MIN_PLAYERS) {
      return { success: false, error: `Need at least ${ARENA_MIN_PLAYERS} players` };
    }

    const notReady = room.players.filter(p => !p.ready && p.id !== room.hostId);
    if (notReady.length > 0) return { success: false, error: 'All players must be ready' };

    const gameSeed = Math.floor(Math.random() * 2147483647);
    room.status = 'countdown';
    room.gameSeed = gameSeed;

    return { success: true, gameSeed };
  }

  beginPlaying(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'countdown') return;

    room.status = 'playing';
    room.gameStartedAt = Date.now();
    room.lastBeatTime = Date.now();

    // Initialize sync map
    for (const p of room.players) {
      room.syncMap.set(p.id, 1.0);
      p.alive = true;
      p.score = 0;
      p.lines = 0;
      p.combo = 0;
      p.syncAccuracy = 1.0;
      p.chaosContribution = 0;
      p.kills = 0;
      p.placement = null;
    }

    // Start the game tick loop
    this.startTickLoop(roomCode);
  }

  removePlayer(playerId: string): { roomCode?: string; room?: ArenaRoom } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.playerToRoom.delete(playerId);
      return {};
    }

    // During gameplay, mark as eliminated rather than removing
    if (room.status === 'playing') {
      const player = room.players.find(p => p.id === playerId);
      if (player && player.alive) {
        this.eliminatePlayer(room, playerId, null);
      }
    }

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerToRoom.delete(playerId);
    room.syncMap.delete(playerId);

    if (room.players.length === 0) {
      this.stopTickLoop(roomCode);
      this.rooms.delete(roomCode);
      return { roomCode };
    }

    // Transfer host
    if (room.hostId === playerId) {
      const next = room.players.find(p => p.connected) || room.players[0];
      room.hostId = next.id;
    }

    return { roomCode, room };
  }

  markDisconnected(playerId: string): { roomCode?: string } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) return {};

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;
      if (room.status === 'playing' && player.alive) {
        this.eliminatePlayer(room, playerId, null);
      }
    }

    return { roomCode };
  }

  // ===== Game Actions =====

  handleAction(playerId: string, action: ArenaAction): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.alive) return;

    // Calculate beat sync accuracy for this action
    const beatInterval = 60000 / room.bpm;
    const now = Date.now();
    const elapsed = (now - room.lastBeatTime) % beatInterval;
    const phase = elapsed / beatInterval;
    const onBeat = phase > 0.75 || phase < 0.15;

    // Update player sync (rolling average)
    const syncScore = onBeat ? 1.0 : Math.max(0, 1.0 - Math.abs(phase - 0.5) * 2);
    player.syncAccuracy = player.syncAccuracy * 0.8 + syncScore * 0.2;
    room.syncMap.set(playerId, player.syncAccuracy);

    // Chaos contribution from actions
    let chaosIncrease = 0;
    switch (action.action) {
      case 'piece_placed':
        chaosIncrease = 0.5;
        break;
      case 'line_clear':
        chaosIncrease = 2 + (action.value || 1);
        break;
      case 'hard_drop':
        chaosIncrease = 1;
        break;
      case 'combo':
        chaosIncrease = (action.value || 1) * 1.5;
        break;
      case 't_spin':
        chaosIncrease = 4;
        break;
      case 'tetris_clear':
        chaosIncrease = 8;
        // Tetris clears send garbage to all other alive players
        this.broadcastGarbageToAll(room, playerId, 2);
        break;
      case 'game_over':
        this.eliminatePlayer(room, playerId, null);
        return;
    }

    // Off-beat actions add more chaos
    if (!onBeat) {
      chaosIncrease *= 1.5;
    }

    player.chaosContribution += chaosIncrease;
    room.chaosLevel = Math.min(100, room.chaosLevel + chaosIncrease);
    if (room.chaosLevel > room.peakChaos) {
      room.peakChaos = room.chaosLevel;
    }

    // Line clears send garbage proportional to lines cleared
    if (action.action === 'line_clear' && action.value && action.value >= 2) {
      const garbageLines = Math.max(0, (action.value || 0) - 1);
      if (garbageLines > 0) {
        this.broadcastGarbageToAll(room, playerId, garbageLines);
      }
    }

    // Broadcast the action to all other players
    this.callbacks.onBroadcast(roomCode, {
      type: 'arena_player_action',
      playerId,
      playerName: player.name,
      action,
      onBeat,
    }, playerId);
  }

  handleRelay(playerId: string, payload: object): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    // Broadcast board state to all other players
    this.callbacks.onBroadcast(roomCode, {
      type: 'arena_relayed',
      fromPlayerId: playerId,
      payload,
    }, playerId);
  }

  // ===== Tick Loop (Server-authoritative tempo + gimmicks) =====

  private startTickLoop(roomCode: string): void {
    const tickInterval = 1000 / ARENA_TICK_RATE;

    const interval = setInterval(() => {
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'playing') {
        this.stopTickLoop(roomCode);
        return;
      }

      this.tick(room);
    }, tickInterval);

    this.tickIntervals.set(roomCode, interval);
  }

  private stopTickLoop(roomCode: string): void {
    const interval = this.tickIntervals.get(roomCode);
    if (interval) {
      clearInterval(interval);
      this.tickIntervals.delete(roomCode);
    }
  }

  private tick(room: ArenaRoom): void {
    const now = Date.now();
    const elapsed = room.gameStartedAt ? now - room.gameStartedAt : 0;

    // 1. Update beat phase
    const beatInterval = 60000 / room.bpm;
    const beatElapsed = (now - room.lastBeatTime) % beatInterval;
    room.beatPhase = beatElapsed / beatInterval;

    // Track beat transitions
    if (beatElapsed < beatInterval / ARENA_TICK_RATE) {
      room.lastBeatTime = now - beatElapsed;
    }

    // 2. Chaos decay
    room.chaosLevel = Math.max(0, room.chaosLevel - ARENA_CHAOS_DECAY_RATE / ARENA_TICK_RATE);

    // 3. Calculate average sync
    const alivePlayers = room.players.filter(p => p.alive && p.connected);
    const avgSync = alivePlayers.length > 0
      ? alivePlayers.reduce((sum, p) => sum + p.syncAccuracy, 0) / alivePlayers.length
      : 0;

    // 4. Tempo adjustment based on sync + chaos
    this.updateTempo(room, avgSync);

    // 5. Check for tempo collapse
    if (avgSync < ARENA_TEMPO_COLLAPSE_THRESHOLD && alivePlayers.length > 1) {
      room.tempoCollapseCount++;

      this.callbacks.onBroadcast(room.code, {
        type: 'arena_tempo_collapse',
        avgSync,
        bpmDeviation: Math.abs(room.bpm - room.baseBpm),
      });

      // After 3 collapses, end the session
      if (room.tempoCollapseCount >= 3) {
        this.endSession(room, 'tempo_collapse');
        return;
      }
    }

    // 6. Gimmick management
    this.updateGimmicks(room, now);

    // 7. Check win condition
    if (alivePlayers.length <= 1 && room.players.filter(p => p.alive).length <= 1) {
      this.endSession(room, 'last_standing');
      return;
    }

    // 8. Chaos overload check
    if (room.chaosLevel >= 100) {
      this.endSession(room, 'chaos_overload');
      return;
    }

    // 9. Broadcast tempo update every 5 ticks (~500ms)
    if (Math.floor(elapsed / (1000 / ARENA_TICK_RATE)) % 5 === 0) {
      this.callbacks.onBroadcast(room.code, {
        type: 'arena_tempo',
        bpm: room.bpm,
        beatPhase: room.beatPhase,
        serverTime: now,
      });
    }

    // 10. Broadcast chaos update every 10 ticks (~1s)
    if (Math.floor(elapsed / (1000 / ARENA_TICK_RATE)) % 10 === 0) {
      const syncMapObj: Record<string, number> = {};
      room.syncMap.forEach((v, k) => { syncMapObj[k] = Math.round(v * 100) / 100; });

      this.callbacks.onBroadcast(room.code, {
        type: 'arena_chaos',
        chaosLevel: Math.round(room.chaosLevel * 10) / 10,
        syncMap: syncMapObj,
      });
    }
  }

  private updateTempo(room: ArenaRoom, avgSync: number): void {
    // Base tempo increases gradually over time
    const elapsed = room.gameStartedAt ? Date.now() - room.gameStartedAt : 0;
    const timeScaling = 1 + (elapsed / 120000) * 0.3; // +30% over 2 minutes

    // Sync affects tempo stability
    // High sync = stable near baseBpm * timeScaling
    // Low sync = erratic BPM swings
    const syncFactor = avgSync;
    const chaosModifier = (room.chaosLevel / 100) * 0.4; // Up to 40% BPM swing from chaos

    const targetBpm = room.baseBpm * timeScaling;
    const instability = (1 - syncFactor) * 30 + chaosModifier * 20;

    // Add some controlled randomness for instability
    const jitter = (Math.random() - 0.5) * instability;

    // Smooth towards target with jitter
    room.bpm = room.bpm * 0.95 + (targetBpm + jitter) * 0.05;
    room.bpm = Math.max(60, Math.min(240, room.bpm));

    // Track extremes
    if (room.bpm > room.peakBpm) room.peakBpm = room.bpm;
    if (room.bpm < room.lowestBpm) room.lowestBpm = room.bpm;
  }

  private updateGimmicks(room: ArenaRoom, now: number): void {
    // Check if active gimmick has expired
    if (room.activeGimmick) {
      const elapsed = now - room.activeGimmick.startedAt;
      if (elapsed >= room.activeGimmick.durationMs) {
        room.activeGimmick = null;
      }
    }

    // Cooldown
    if (room.gimmickCooldown > 0) {
      room.gimmickCooldown -= 1000 / ARENA_TICK_RATE;
      return;
    }

    // Spawn gimmick based on chaos level
    if (!room.activeGimmick && room.chaosLevel >= ARENA_CHAOS_GIMMICK_THRESHOLD) {
      const shouldSpawn = Math.random() < (room.chaosLevel / 100) * 0.02; // Higher chaos = more likely
      if (shouldSpawn) {
        const gimmick = this.pickRandomGimmick(room);
        room.activeGimmick = gimmick;
        room.totalGimmicks++;
        room.gimmickCooldown = 5000; // 5 second minimum between gimmicks

        this.callbacks.onBroadcast(room.code, {
          type: 'arena_gimmick',
          gimmick,
        });

        // Apply gimmick effects
        this.applyGimmickEffect(room, gimmick);
      }
    }
  }

  private pickRandomGimmick(room: ArenaRoom): ArenaGimmick {
    // Weight selection
    const types = Object.keys(GIMMICK_WEIGHTS) as GimmickType[];
    const weights = types.map(t => GIMMICK_WEIGHTS[t]);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;

    let selectedType: GimmickType = 'tempo_shift';
    for (let i = 0; i < types.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        selectedType = types[i];
        break;
      }
    }

    // Intensity scales with chaos
    const intensity = room.chaosLevel >= ARENA_CHAOS_FRENZY_THRESHOLD ? 3
      : room.chaosLevel >= ARENA_CHAOS_GIMMICK_THRESHOLD + 20 ? 2 : 1;

    return {
      type: selectedType,
      durationMs: GIMMICK_DURATIONS[selectedType] * (1 + (intensity - 1) * 0.3),
      intensity,
      startedAt: Date.now(),
    };
  }

  private applyGimmickEffect(room: ArenaRoom, gimmick: ArenaGimmick): void {
    switch (gimmick.type) {
      case 'tempo_shift': {
        const shift = gimmick.intensity * 20 * (Math.random() > 0.5 ? 1 : -1);
        room.bpm = Math.max(60, Math.min(240, room.bpm + shift));
        break;
      }
      case 'garbage_rain': {
        // Send garbage to everyone
        const lines = gimmick.intensity;
        for (const p of room.players) {
          if (p.alive && p.connected) {
            this.callbacks.onSendToPlayer(p.id, {
              type: 'arena_relayed',
              fromPlayerId: 'GIMMICK',
              payload: {
                event: 'garbage',
                lines,
              },
            });
          }
        }
        break;
      }
      // Other gimmick effects are handled client-side based on the broadcast
    }
  }

  // ===== Player Elimination =====

  private eliminatePlayer(room: ArenaRoom, playerId: string, eliminatedBy: string | null): void {
    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.alive) return;

    player.alive = false;
    const aliveCount = room.players.filter(p => p.alive).length;
    player.placement = aliveCount + 1;
    room.eliminationOrder.push(playerId);

    // Credit the eliminator
    if (eliminatedBy) {
      const killer = room.players.find(p => p.id === eliminatedBy);
      if (killer) killer.kills++;
    }

    this.callbacks.onBroadcast(room.code, {
      type: 'arena_player_eliminated',
      playerId,
      playerName: player.name,
      placement: player.placement,
      eliminatedBy,
    });
  }

  private broadcastGarbageToAll(room: ArenaRoom, fromPlayerId: string, lines: number): void {
    for (const p of room.players) {
      if (p.id !== fromPlayerId && p.alive && p.connected) {
        this.callbacks.onSendToPlayer(p.id, {
          type: 'arena_relayed',
          fromPlayerId,
          payload: {
            event: 'garbage',
            lines,
          },
        });
      }
    }
  }

  // ===== Session End =====

  private endSession(
    room: ArenaRoom,
    reason: 'last_standing' | 'tempo_collapse' | 'chaos_overload',
  ): void {
    room.status = 'ended';
    this.stopTickLoop(room.code);

    // Determine winner
    const alivePlayers = room.players.filter(p => p.alive);
    let winnerId: string | null = null;
    let winnerName: string | null = null;

    if (alivePlayers.length === 1) {
      winnerId = alivePlayers[0].id;
      winnerName = alivePlayers[0].name;
      alivePlayers[0].placement = 1;
    } else if (alivePlayers.length > 1) {
      // Multiple survivors: winner = highest score
      alivePlayers.sort((a, b) => b.score - a.score);
      for (let i = 0; i < alivePlayers.length; i++) {
        alivePlayers[i].placement = i + 1;
      }
      winnerId = alivePlayers[0].id;
      winnerName = alivePlayers[0].name;
    }

    // Build rankings
    const rankings: ArenaRanking[] = room.players
      .filter(p => p.placement !== null)
      .sort((a, b) => (a.placement || 999) - (b.placement || 999))
      .map(p => ({
        playerId: p.id,
        playerName: p.name,
        placement: p.placement!,
        score: p.score,
        lines: p.lines,
        kills: p.kills,
        avgSync: Math.round(p.syncAccuracy * 100) / 100,
      }));

    const stats: ArenaSessionStats = {
      totalDurationMs: room.gameStartedAt ? Date.now() - room.gameStartedAt : 0,
      peakChaos: Math.round(room.peakChaos * 10) / 10,
      totalGimmicks: room.totalGimmicks,
      tempoCollapses: room.tempoCollapseCount,
      peakBpm: Math.round(room.peakBpm),
      lowestBpm: Math.round(room.lowestBpm),
    };

    this.callbacks.onBroadcast(room.code, {
      type: 'arena_session_end',
      reason,
      winnerId,
      winnerName,
      rankings,
      stats,
    });

    this.callbacks.onSessionEnd(room.code);
  }

  // ===== Queries =====

  getRoomState(roomCode: string): ArenaRoomState | null {
    const room = this.rooms.get(roomCode.toUpperCase().trim());
    if (!room) return null;

    return {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      players: room.players.map(p => ({ ...p })),
      status: room.status,
      maxPlayers: room.maxPlayers,
      bpm: Math.round(room.bpm * 10) / 10,
      beatPhase: room.beatPhase,
      chaosLevel: Math.round(room.chaosLevel * 10) / 10,
      activeGimmick: room.activeGimmick,
      aliveCount: room.players.filter(p => p.alive).length,
      elapsedMs: room.gameStartedAt ? Date.now() - room.gameStartedAt : 0,
    };
  }

  getRoomByPlayerId(playerId: string): ArenaRoom | null {
    const code = this.playerToRoom.get(playerId);
    if (!code) return null;
    return this.rooms.get(code) || null;
  }

  getPlayerIdsInRoom(roomCode: string): string[] {
    const room = this.rooms.get(roomCode.toUpperCase().trim());
    if (!room) return [];
    return room.players.filter(p => p.connected).map(p => p.id);
  }

  getPublicArenas(): { code: string; name: string; playerCount: number; maxPlayers: number }[] {
    const result: { code: string; name: string; playerCount: number; maxPlayers: number }[] = [];
    this.rooms.forEach(room => {
      if (room.status === 'waiting' && room.players.length < room.maxPlayers) {
        result.push({
          code: room.code,
          name: room.name,
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
        });
      }
    });
    return result;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  // ===== Utilities =====

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let attempts = 0;
    do {
      code = 'A'; // Prefix A for arena rooms
      const len = attempts > 100 ? 5 : 4;
      for (let i = 1; i < len; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
    } while (this.rooms.has(code));
    return code;
  }

  private cleanupStaleRooms(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.rooms.forEach((room, code) => {
      const connected = room.players.filter(p => p.connected);
      if (connected.length === 0 && now - room.createdAt > this.ROOM_TIMEOUT) {
        toDelete.push(code);
      }
      if (room.status === 'ended' && now - (room.gameStartedAt || room.createdAt) > this.ROOM_TIMEOUT) {
        toDelete.push(code);
      }
    });

    toDelete.forEach(code => {
      this.stopTickLoop(code);
      const room = this.rooms.get(code);
      if (room) {
        room.players.forEach(p => this.playerToRoom.delete(p.id));
      }
      this.rooms.delete(code);
      console.log(`[ARENA CLEANUP] Removed stale arena ${code}`);
    });
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.tickIntervals.forEach(interval => clearInterval(interval));
    this.tickIntervals.clear();
  }
}
