import type {
  GameState, TDPlayerState, TDMultiplayerRoom, EnemyType, TowerType,
  Tower, Enemy,
} from '@/types/tower-defense';
import {
  SEND_ENEMY_COSTS, SEND_POINTS_PER_KILL, ENEMY_DEFS,
  TOTAL_WAVES, WAVE_PREP_TIME,
} from '@/types/tower-defense';
import {
  createInitialState, placeTower, sellTower, upgradeTower,
  updateGame, startWave,
} from './engine';
import { WAVES } from './waves';

// ===== Callbacks for server integration =====

export interface TDMPCallbacks {
  onBroadcast: (roomCode: string, message: object, excludePlayerId?: string) => void;
  onSendToPlayer: (playerId: string, message: object) => void;
  onSessionEnd: (roomCode: string) => void;
}

// ===== Internal room state =====

interface TDMPRoom {
  code: string;
  name: string;
  hostId: string;
  players: TDMPPlayer[];
  status: 'waiting' | 'countdown' | 'playing' | 'ended';
  maxPlayers: number;
  mapIndex: number;
  currentWave: number;
  waveActive: boolean;
  winner: string | null;
  createdAt: number;
  gameStartedAt: number | null;
  waveBuildTimer: number;
  // Track previous kill counts per player for sendPoints delta
  prevKillCounts: Map<string, number>;
}

interface TDMPPlayer {
  playerId: string;
  playerName: string;
  gameState: GameState;
  ready: boolean;
  connected: boolean;
  sendPoints: number;
  totalSent: number;
  totalReceived: number;
  eliminated: boolean;
  eliminatedAt: number | null;
  defaultTarget: string | null;
}

// ===== Constants =====

const TD_TICK_RATE = 20; // 20 ticks/sec = 50ms per tick
const TD_MAX_PLAYERS = 4;
const TD_MIN_PLAYERS = 2;
const ROOM_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const COUNTDOWN_SECONDS = 3;

// ===== Manager =====

export class TDMultiplayerManager {
  private rooms = new Map<string, TDMPRoom>();
  private playerToRoom = new Map<string, string>();
  private tickIntervals = new Map<string, NodeJS.Timeout>();
  private cleanupInterval: NodeJS.Timeout;
  private callbacks: TDMPCallbacks;

  constructor(callbacks: TDMPCallbacks) {
    this.callbacks = callbacks;
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
  }

  // ===== Room Lifecycle =====

  createRoom(
    playerId: string,
    playerName: string,
    mapIndex: number = 0,
  ): { roomCode: string } {
    const roomCode = this.generateRoomCode();
    const sanitizedName = (playerName || 'Player').slice(0, 20);

    const player: TDMPPlayer = {
      playerId,
      playerName: sanitizedName,
      gameState: createInitialState(mapIndex),
      ready: false,
      connected: true,
      sendPoints: 0,
      totalSent: 0,
      totalReceived: 0,
      eliminated: false,
      eliminatedAt: null,
      defaultTarget: null,
    };

    const room: TDMPRoom = {
      code: roomCode,
      name: `${sanitizedName}'s TD`,
      hostId: playerId,
      players: [player],
      status: 'waiting',
      maxPlayers: TD_MAX_PLAYERS,
      mapIndex,
      currentWave: 0,
      waveActive: false,
      winner: null,
      createdAt: Date.now(),
      gameStartedAt: null,
      waveBuildTimer: WAVE_PREP_TIME,
      prevKillCounts: new Map(),
    };

    this.rooms.set(roomCode, room);
    this.playerToRoom.set(playerId, roomCode);

    return { roomCode };
  }

  joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string,
  ): { success: boolean; error?: string } {
    const normalized = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalized);

    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already in progress' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'Room is full' };

    const existing = room.players.find(p => p.playerId === playerId);
    if (existing) {
      existing.connected = true;
      return { success: true };
    }

    const sanitizedName = (playerName || 'Player').slice(0, 20);
    const player: TDMPPlayer = {
      playerId,
      playerName: sanitizedName,
      gameState: createInitialState(room.mapIndex),
      ready: false,
      connected: true,
      sendPoints: 0,
      totalSent: 0,
      totalReceived: 0,
      eliminated: false,
      eliminatedAt: null,
      defaultTarget: null,
    };

    room.players.push(player);
    this.playerToRoom.set(playerId, normalized);

    // Broadcast player joined to others
    this.callbacks.onBroadcast(normalized, {
      type: 'td_player_joined',
      player: this.toPlayerState(player),
    }, playerId);

    return { success: true };
  }

  leaveRoom(playerId: string): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.playerToRoom.delete(playerId);
      return;
    }

    // During gameplay, mark as eliminated
    if (room.status === 'playing') {
      const player = room.players.find(p => p.playerId === playerId);
      if (player && !player.eliminated) {
        this.eliminatePlayer(room, playerId);
      }
    }

    room.players = room.players.filter(p => p.playerId !== playerId);
    this.playerToRoom.delete(playerId);

    if (room.players.length === 0) {
      this.stopTickLoop(roomCode);
      this.rooms.delete(roomCode);
      return;
    }

    // Transfer host
    if (room.hostId === playerId) {
      const next = room.players.find(p => p.connected) || room.players[0];
      room.hostId = next.playerId;
    }

    this.callbacks.onBroadcast(roomCode, {
      type: 'td_player_left',
      playerId,
    });
  }

  handleDisconnect(playerId: string): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.playerId === playerId);
    if (player) {
      player.connected = false;
    }
  }

  setReady(playerId: string, ready: boolean): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'waiting') return;

    const player = room.players.find(p => p.playerId === playerId);
    if (!player) return;

    player.ready = ready;

    this.callbacks.onBroadcast(roomCode, {
      type: 'td_player_ready',
      playerId,
      ready,
    });
  }

  startGame(playerId: string): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== playerId) {
      this.callbacks.onSendToPlayer(playerId, {
        type: 'error',
        message: 'Only the host can start the game',
      });
      return;
    }
    if (room.players.length < TD_MIN_PLAYERS) {
      this.callbacks.onSendToPlayer(playerId, {
        type: 'error',
        message: `Need at least ${TD_MIN_PLAYERS} players`,
      });
      return;
    }

    const notReady = room.players.filter(p => !p.ready && p.playerId !== room.hostId);
    if (notReady.length > 0) {
      this.callbacks.onSendToPlayer(playerId, {
        type: 'error',
        message: 'All players must be ready',
      });
      return;
    }

    // Start countdown
    room.status = 'countdown';
    let countdown = COUNTDOWN_SECONDS;

    const countdownInterval = setInterval(() => {
      this.callbacks.onBroadcast(roomCode, {
        type: 'td_countdown',
        seconds: countdown,
      });

      countdown--;

      if (countdown < 0) {
        clearInterval(countdownInterval);
        this.beginPlaying(roomCode);
      }
    }, 1000);
  }

  private beginPlaying(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'countdown') return;

    room.status = 'playing';
    room.gameStartedAt = Date.now();
    room.currentWave = 0;
    room.waveActive = false;
    room.waveBuildTimer = WAVE_PREP_TIME;

    // Reset all player game states
    for (const player of room.players) {
      player.gameState = createInitialState(room.mapIndex);
      player.gameState.phase = 'build';
      player.sendPoints = 0;
      player.totalSent = 0;
      player.totalReceived = 0;
      player.eliminated = false;
      player.eliminatedAt = null;
    }

    // Initialize kill tracking
    room.prevKillCounts.clear();
    for (const player of room.players) {
      room.prevKillCounts.set(player.playerId, 0);
    }

    this.callbacks.onBroadcast(roomCode, {
      type: 'td_game_started',
      mapIndex: room.mapIndex,
      wave: 0,
    });

    this.startTickLoop(roomCode);
  }

  // ===== Game Actions =====

  placeTower(
    playerId: string,
    towerType: TowerType,
    gridX: number,
    gridZ: number,
  ): { success: boolean; error?: string } {
    const room = this.getPlayerRoom(playerId);
    if (!room || room.status !== 'playing') return { success: false, error: 'Not in an active game' };

    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.eliminated) return { success: false, error: 'Player eliminated' };

    const prevGold = player.gameState.gold;
    player.gameState = placeTower(player.gameState, towerType, gridX, gridZ);

    if (player.gameState.gold === prevGold) {
      return { success: false, error: 'Cannot place tower there' };
    }

    // Find the newly placed tower
    const newTower = player.gameState.towers[player.gameState.towers.length - 1];

    this.callbacks.onBroadcast(room.code, {
      type: 'td_tower_placed',
      playerId,
      tower: newTower,
    });

    return { success: true };
  }

  sellTower(playerId: string, towerId: string): { success: boolean; error?: string } {
    const room = this.getPlayerRoom(playerId);
    if (!room || room.status !== 'playing') return { success: false, error: 'Not in an active game' };

    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.eliminated) return { success: false, error: 'Player eliminated' };

    const hadTower = player.gameState.towers.some(t => t.id === towerId);
    if (!hadTower) return { success: false, error: 'Tower not found' };

    player.gameState = sellTower(player.gameState, towerId);

    this.callbacks.onBroadcast(room.code, {
      type: 'td_tower_sold',
      playerId,
      towerId,
    });

    return { success: true };
  }

  upgradeTower(playerId: string, towerId: string): { success: boolean; error?: string } {
    const room = this.getPlayerRoom(playerId);
    if (!room || room.status !== 'playing') return { success: false, error: 'Not in an active game' };

    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.eliminated) return { success: false, error: 'Player eliminated' };

    const tower = player.gameState.towers.find(t => t.id === towerId);
    if (!tower) return { success: false, error: 'Tower not found' };

    const prevLevel = tower.level;
    player.gameState = upgradeTower(player.gameState, towerId);

    const updatedTower = player.gameState.towers.find(t => t.id === towerId);
    if (!updatedTower || updatedTower.level === prevLevel) {
      return { success: false, error: 'Cannot upgrade tower' };
    }

    this.callbacks.onBroadcast(room.code, {
      type: 'td_tower_upgraded',
      playerId,
      towerId,
      level: updatedTower.level,
    });

    return { success: true };
  }

  startWave(playerId: string): void {
    const room = this.getPlayerRoom(playerId);
    if (!room || room.status !== 'playing') return;

    // Only host can start waves
    if (room.hostId !== playerId) return;
    if (room.waveActive) return;
    if (room.currentWave >= TOTAL_WAVES) return;

    this.triggerWave(room);
  }

  private triggerWave(room: TDMPRoom): void {
    room.waveActive = true;
    room.currentWave++;

    // Start wave on each non-eliminated player's game state
    for (const player of room.players) {
      if (player.eliminated) continue;
      player.gameState = startWave(player.gameState);
    }

    this.callbacks.onBroadcast(room.code, {
      type: 'td_wave_started',
      waveNumber: room.currentWave,
    });
  }

  // ===== Enemy Sending =====

  sendEnemy(
    playerId: string,
    targetPlayerId: string,
    enemyType: EnemyType,
  ): { success: boolean; error?: string } {
    const room = this.getPlayerRoom(playerId);
    if (!room || room.status !== 'playing') return { success: false, error: 'Not in an active game' };

    const sender = room.players.find(p => p.playerId === playerId);
    if (!sender || sender.eliminated) return { success: false, error: 'Sender eliminated' };

    const target = room.players.find(p => p.playerId === targetPlayerId);
    if (!target || target.eliminated) return { success: false, error: 'Target eliminated' };
    if (playerId === targetPlayerId) return { success: false, error: 'Cannot target yourself' };

    const costEntry = SEND_ENEMY_COSTS.find(c => c.enemyType === enemyType);
    if (!costEntry) return { success: false, error: 'Invalid enemy type' };

    if (sender.sendPoints < costEntry.cost) {
      return { success: false, error: 'Not enough send points' };
    }

    // Deduct cost
    sender.sendPoints -= costEntry.cost;

    // Spawn enemies on target's board
    const enemyDef = ENEMY_DEFS[enemyType];
    const spawnPos = target.gameState.map.spawnPoints[0];

    for (let i = 0; i < costEntry.count; i++) {
      const enemy: Enemy = {
        id: `sent_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        type: enemyType,
        hp: Math.round(enemyDef.hp * costEntry.hpMultiplier),
        maxHp: Math.round(enemyDef.hp * costEntry.hpMultiplier),
        speed: enemyDef.speed,
        armor: enemyDef.armor,
        position: { ...spawnPos },
        waypointIndex: 0,
        progress: 0,
        effects: [],
        flying: enemyDef.flying,
        dead: false,
      };
      target.gameState.enemies.push(enemy);
    }

    // Update stats
    sender.totalSent += costEntry.count;
    target.totalReceived += costEntry.count;

    // Broadcast to all
    this.callbacks.onBroadcast(room.code, {
      type: 'td_enemy_sent',
      fromPlayerId: playerId,
      toPlayerId: targetPlayerId,
      enemyType,
      count: costEntry.count,
    });

    // Send warning to target
    this.callbacks.onSendToPlayer(targetPlayerId, {
      type: 'td_enemies_incoming',
      fromPlayerName: sender.playerName,
      enemyType,
      count: costEntry.count,
    });

    return { success: true };
  }

  selectTarget(playerId: string, targetPlayerId: string): void {
    const room = this.getPlayerRoom(playerId);
    if (!room || room.status !== 'playing') return;

    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.eliminated) return;

    const target = room.players.find(p => p.playerId === targetPlayerId && !p.eliminated);
    if (!target || targetPlayerId === playerId) return;

    player.defaultTarget = targetPlayerId;
  }

  // ===== Tick Loop =====

  private startTickLoop(roomCode: string): void {
    const tickInterval = 1000 / TD_TICK_RATE;

    const interval = setInterval(() => {
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'playing') {
        this.stopTickLoop(roomCode);
        return;
      }

      this.tickRoom(room);
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

  private tickRoom(room: TDMPRoom): void {
    const dt = 1 / TD_TICK_RATE;
    let allWavesDone = true;

    for (const player of room.players) {
      if (player.eliminated) continue;

      // Count kills before update
      const prevKills = this.getTotalKills(player.gameState);

      // Run game engine update
      player.gameState = updateGame(player.gameState, dt);

      // Count kills after update
      const newKills = this.getTotalKills(player.gameState);
      const killDelta = newKills - prevKills;

      // Award sendPoints for kills
      if (killDelta > 0) {
        // We approximate by using the per-enemy-type points
        // Since we can't easily track which enemies died, award a flat per-kill bonus
        // based on the enemy composition
        const prevCount = room.prevKillCounts.get(player.playerId) || 0;
        const currentTowerKills = player.gameState.towers.reduce((sum, t) => sum + t.kills, 0);
        const delta = currentTowerKills - prevCount;
        if (delta > 0) {
          // Award average sendPoints (roughly 1.5 per kill as a compromise)
          player.sendPoints += delta * 2;
          room.prevKillCounts.set(player.playerId, currentTowerKills);
        }
      }

      // Check if player lost
      if (player.gameState.phase === 'lost' && !player.eliminated) {
        this.eliminatePlayer(room, player.playerId);
      }

      // Check if player's wave is still active
      if (player.gameState.phase === 'wave') {
        allWavesDone = false;
      }
    }

    // If all living players finished the wave, transition to build phase
    if (room.waveActive && allWavesDone) {
      const alivePlayers = room.players.filter(p => !p.eliminated);
      const allInBuild = alivePlayers.every(
        p => p.gameState.phase === 'build' || p.gameState.phase === 'won'
      );

      if (allInBuild) {
        room.waveActive = false;
        room.waveBuildTimer = WAVE_PREP_TIME;

        const waveDef = WAVES[room.currentWave - 1];
        const reward = waveDef?.reward ?? 0;

        this.callbacks.onBroadcast(room.code, {
          type: 'td_wave_complete',
          waveNumber: room.currentWave,
          reward,
        });

        // Check if all waves done
        if (room.currentWave >= TOTAL_WAVES) {
          this.endGame(room);
          return;
        }
      }
    }

    // Build phase countdown for auto-wave start
    if (!room.waveActive && room.currentWave < TOTAL_WAVES) {
      room.waveBuildTimer -= dt;
      if (room.waveBuildTimer <= 0) {
        this.triggerWave(room);
      }
    }

    // Check win condition
    const alivePlayers = room.players.filter(p => !p.eliminated);
    if (alivePlayers.length <= 1 && room.players.length >= TD_MIN_PLAYERS) {
      this.endGame(room);
      return;
    }

    // Broadcast state update every 3 ticks (~150ms) to reduce bandwidth
    const elapsed = room.gameStartedAt ? Date.now() - room.gameStartedAt : 0;
    const tickCount = Math.floor(elapsed / (1000 / TD_TICK_RATE));
    if (tickCount % 3 === 0) {
      this.broadcastStateUpdate(room);
    }
  }

  private getTotalKills(state: GameState): number {
    return state.towers.reduce((sum, t) => sum + t.kills, 0);
  }

  private broadcastStateUpdate(room: TDMPRoom): void {
    const playerStates = room.players
      .filter(p => !p.eliminated)
      .map(p => ({
        playerId: p.playerId,
        towers: p.gameState.towers,
        enemies: p.gameState.enemies,
        projectiles: p.gameState.projectiles,
        gold: p.gameState.gold,
        lives: p.gameState.lives,
        score: p.gameState.score,
        sendPoints: p.sendPoints,
        phase: p.gameState.phase,
      }));

    this.callbacks.onBroadcast(room.code, {
      type: 'td_state_update',
      playerStates,
    });
  }

  // ===== Elimination =====

  private eliminatePlayer(room: TDMPRoom, playerId: string): void {
    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.eliminated) return;

    player.eliminated = true;
    player.eliminatedAt = Date.now();

    const aliveCount = room.players.filter(p => !p.eliminated).length;
    const rank = aliveCount + 1;

    this.callbacks.onBroadcast(room.code, {
      type: 'td_player_eliminated',
      playerId,
      rank,
    });
  }

  // ===== Game End =====

  private endGame(room: TDMPRoom): void {
    room.status = 'ended';
    this.stopTickLoop(room.code);

    const alivePlayers = room.players.filter(p => !p.eliminated);

    // Determine winner: last standing or highest score
    let winnerId: string | null = null;
    if (alivePlayers.length === 1) {
      winnerId = alivePlayers[0].playerId;
    } else if (alivePlayers.length > 1) {
      alivePlayers.sort((a, b) => b.gameState.score - a.gameState.score);
      winnerId = alivePlayers[0].playerId;
    }

    room.winner = winnerId;

    // Build rankings
    const rankings: Array<{ playerId: string; rank: number; score: number }> = [];

    // Alive players ranked by score
    const sortedAlive = [...alivePlayers].sort((a, b) => b.gameState.score - a.gameState.score);
    sortedAlive.forEach((p, i) => {
      rankings.push({ playerId: p.playerId, rank: i + 1, score: p.gameState.score });
    });

    // Eliminated players ranked by elimination time (later = better)
    const eliminated = room.players
      .filter(p => p.eliminated)
      .sort((a, b) => (b.eliminatedAt || 0) - (a.eliminatedAt || 0));

    eliminated.forEach((p, i) => {
      rankings.push({
        playerId: p.playerId,
        rank: sortedAlive.length + i + 1,
        score: p.gameState.score,
      });
    });

    this.callbacks.onBroadcast(room.code, {
      type: 'td_game_over',
      winnerId: winnerId || '',
      rankings,
    });

    this.callbacks.onSessionEnd(room.code);
  }

  // ===== Queries =====

  getRoom(roomCode: string): TDMultiplayerRoom | null {
    const normalized = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalized);
    if (!room) return null;

    return {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      players: room.players.map(p => this.toPlayerState(p)),
      status: room.status,
      maxPlayers: room.maxPlayers,
      mapIndex: room.mapIndex,
      currentWave: room.currentWave,
      waveActive: room.waveActive,
      winner: room.winner,
    };
  }

  getPlayerIdsInRoom(roomCode: string): string[] {
    const normalized = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalized);
    if (!room) return [];
    return room.players.filter(p => p.connected).map(p => p.playerId);
  }

  getRoomByPlayerId(playerId: string): TDMPRoom | null {
    const code = this.playerToRoom.get(playerId);
    if (!code) return null;
    return this.rooms.get(code) || null;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  // ===== Utilities =====

  private getPlayerRoom(playerId: string): TDMPRoom | null {
    const code = this.playerToRoom.get(playerId);
    if (!code) return null;
    return this.rooms.get(code) || null;
  }

  private toPlayerState(player: TDMPPlayer): TDPlayerState {
    return {
      playerId: player.playerId,
      playerName: player.playerName,
      gameState: player.gameState,
      ready: player.ready,
      connected: player.connected,
      sendPoints: player.sendPoints,
      totalSent: player.totalSent,
      totalReceived: player.totalReceived,
      eliminated: player.eliminated,
      eliminatedAt: player.eliminatedAt,
    };
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let attempts = 0;
    do {
      code = 'T'; // Prefix T for tower defense rooms
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
      if (connected.length === 0 && now - room.createdAt > ROOM_TIMEOUT) {
        toDelete.push(code);
      }
      if (room.status === 'ended' && now - (room.gameStartedAt || room.createdAt) > ROOM_TIMEOUT) {
        toDelete.push(code);
      }
    });

    toDelete.forEach(code => {
      this.stopTickLoop(code);
      const room = this.rooms.get(code);
      if (room) {
        room.players.forEach(p => this.playerToRoom.delete(p.playerId));
      }
      this.rooms.delete(code);
      console.log(`[TD CLEANUP] Removed stale TD room ${code}`);
    });
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.tickIntervals.forEach(interval => clearInterval(interval));
    this.tickIntervals.clear();
  }
}
