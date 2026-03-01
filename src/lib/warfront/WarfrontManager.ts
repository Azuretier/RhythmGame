import type {
  WarfrontRoomState,
  WarfrontPlayer,
  WarfrontTeam,
  WarfrontTerritory,
  WarfrontRole,
  WarfrontGameMode,
  WarfrontPhase,
  WFPublicRoom,
  CrossModeEffect,
  ResourcePool,
  DefenderStats,
  SoldierStats,
  EngineerStats,
  CommanderStats,
  WFClientMessage,
  WFServerMessage,
} from '@/types/warfront';
import {
  WF_MAX_PLAYERS,
  WF_MIN_PLAYERS,
  WF_TICK_RATE,
  WF_DEFAULT_DURATION,
  WF_TERRITORY_BROADCAST_INTERVAL,
  WF_RESOURCE_BROADCAST_INTERVAL,
  WF_TERRITORY_GRID,
} from '@/types/warfront';
import {
  createTerritories,
  assignTeamTerritories,
  getTerritoryIdFromPosition,
  tickCapture,
  healTerritory,
  damageTerritory,
  fortifyTerritory,
  countTerritories,
} from './territories';
import { createEffect, effectToActive, cleanExpiredEffects } from './effects';
import { createResourcePool, addResources, spendResources, getResourceForBlock, getAbilityCost } from './resources';
import { EFFECT_VALUES } from './constants';

// Internal room structure (server-side only)
interface WFRoom {
  code: string;
  name: string;
  hostId: string;
  status: WarfrontPhase;
  mode: WarfrontGameMode;
  maxPlayers: number;
  seed: number | null;
  createdAt: number;
  lastActivity: number;
  gameStartedAt: number | null;
  gameDurationMs: number;
  elapsedMs: number;
  teams: WarfrontTeam[];
  players: Map<string, WarfrontPlayer>;
  territories: WarfrontTerritory[];
  effectQueue: CrossModeEffect[];
  tickCount: number;
  // Win condition tracking
  territoryHoldStart: Record<string, number>; // teamId → timestamp when they first held 12+
}

interface WarfrontManagerOptions {
  onSendToPlayer: (playerId: string, message: WFServerMessage) => void;
  onBroadcastToRoom: (roomCode: string, message: WFServerMessage, excludePlayerId?: string) => void;
}

export class WarfrontManager {
  private rooms = new Map<string, WFRoom>();
  private playerToRoom = new Map<string, string>();
  private tickIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private onSendToPlayer: WarfrontManagerOptions['onSendToPlayer'];
  private onBroadcastToRoom: WarfrontManagerOptions['onBroadcastToRoom'];
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(options: WarfrontManagerOptions) {
    this.onSendToPlayer = options.onSendToPlayer;
    this.onBroadcastToRoom = options.onBroadcastToRoom;
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
  }

  // ===== Room Lifecycle =====

  createRoom(
    playerId: string,
    playerName: string,
    roomName?: string,
    mode: WarfrontGameMode = 'teams',
  ): { roomCode: string; player: WarfrontPlayer } {
    const code = this.generateRoomCode();
    const teamId = mode === 'teams' ? 'alpha' : playerId;

    const player: WarfrontPlayer = {
      id: playerId,
      name: playerName.slice(0, 20),
      teamId,
      role: 'soldier', // default role
      connected: true,
      ready: false,
      position: { x: 64, y: 40, z: 64 },
      activeEffects: [],
      roleStats: this.createRoleStats('soldier'),
      health: 100,
      maxHealth: 100,
    };

    const teams: WarfrontTeam[] = mode === 'teams'
      ? [
        { id: 'alpha', name: 'Alpha', color: '#3B82F6', resourcePool: createResourcePool(), score: 0, territoryCount: 4 },
        { id: 'bravo', name: 'Bravo', color: '#EF4444', resourcePool: createResourcePool(), score: 0, territoryCount: 4 },
      ]
      : [
        { id: playerId, name: playerName, color: '#3B82F6', resourcePool: createResourcePool(), score: 0, territoryCount: 0 },
      ];

    const room: WFRoom = {
      code,
      name: roomName || `Warfront ${code}`,
      hostId: playerId,
      status: 'waiting',
      mode,
      maxPlayers: WF_MAX_PLAYERS,
      seed: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      gameStartedAt: null,
      gameDurationMs: WF_DEFAULT_DURATION,
      elapsedMs: 0,
      teams,
      players: new Map([[playerId, player]]),
      territories: createTerritories(),
      effectQueue: [],
      tickCount: 0,
      territoryHoldStart: {},
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(playerId, code);
    return { roomCode: code, player };
  }

  joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string,
  ): { success: boolean; player?: WarfrontPlayer; error?: string } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };
    if (room.players.size >= room.maxPlayers) return { success: false, error: 'Room is full' };

    // Assign team
    let teamId: string;
    if (room.mode === 'teams') {
      // Balance teams
      const alphaCt = Array.from(room.players.values()).filter(p => p.teamId === 'alpha').length;
      const bravoCt = Array.from(room.players.values()).filter(p => p.teamId === 'bravo').length;
      teamId = alphaCt <= bravoCt ? 'alpha' : 'bravo';
    } else {
      teamId = playerId;
      room.teams.push({
        id: playerId,
        name: playerName,
        color: '#22C55E',
        resourcePool: createResourcePool(),
        score: 0,
        territoryCount: 0,
      });
    }

    const player: WarfrontPlayer = {
      id: playerId,
      name: playerName.slice(0, 20),
      teamId,
      role: 'soldier',
      connected: true,
      ready: false,
      position: { x: 64, y: 40, z: 64 },
      activeEffects: [],
      roleStats: this.createRoleStats('soldier'),
      health: 100,
      maxHealth: 100,
    };

    room.players.set(playerId, player);
    room.lastActivity = Date.now();
    this.playerToRoom.set(playerId, code);
    return { success: true, player };
  }

  selectRole(playerId: string, role: WarfrontRole): { success: boolean; error?: string } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, error: 'Not in a room' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };

    const player = room.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    player.role = role;
    player.roleStats = this.createRoleStats(role);
    return { success: true };
  }

  selectTeam(playerId: string, teamId: string): { success: boolean; error?: string } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, error: 'Not in a room' };
    if (room.mode !== 'teams') return { success: false, error: 'Not a team game' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };
    if (teamId !== 'alpha' && teamId !== 'bravo') return { success: false, error: 'Invalid team' };

    const player = room.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    player.teamId = teamId;
    return { success: true };
  }

  setPlayerReady(playerId: string, ready: boolean): { success: boolean; error?: string } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, error: 'Not in a room' };

    const player = room.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    player.ready = ready;
    return { success: true };
  }

  startGame(hostId: string): { success: boolean; gameSeed?: number; error?: string } {
    const room = this.getRoomByPlayerId(hostId);
    if (!room) return { success: false, error: 'Not in a room' };
    if (room.hostId !== hostId) return { success: false, error: 'Not the host' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };
    if (room.players.size < WF_MIN_PLAYERS) return { success: false, error: `Need at least ${WF_MIN_PLAYERS} players` };

    // Check all players are ready
    for (const [, p] of room.players) {
      if (!p.ready) return { success: false, error: 'Not all players are ready' };
    }

    room.status = 'countdown';
    room.seed = Math.floor(Math.random() * 2147483647);
    return { success: true, gameSeed: room.seed };
  }

  beginPlaying(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.status = 'playing';
    room.gameStartedAt = Date.now();

    // Assign starting territories for teams mode
    if (room.mode === 'teams') {
      const teamIds = room.teams.map(t => t.id);
      assignTeamTerritories(room.territories, teamIds);
    }

    // Assign defenders to territories
    for (const [, player] of room.players) {
      if (player.role === 'defender') {
        // Find an owned territory for this defender
        const ownedTerritories = room.territories.filter(t => t.ownerId === player.teamId);
        if (ownedTerritories.length > 0) {
          player.assignedTerritoryId = ownedTerritories[0].id;
        }
      }
    }

    this.startTickLoop(roomCode);
  }

  // ===== Tick Loop =====

  private startTickLoop(roomCode: string): void {
    const tickInterval = 1000 / WF_TICK_RATE;
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

  private tick(room: WFRoom): void {
    room.tickCount++;
    room.elapsedMs = Date.now() - (room.gameStartedAt || Date.now());

    // 1. Process effect queue
    this.processEffectQueue(room);

    // 2. Update territory capture progress based on soldier positions
    this.updateTerritoryCapture(room);

    // 3. Clean expired effects from players
    this.cleanPlayerEffects(room);

    // 4. Broadcast territory state periodically
    if (room.tickCount % WF_TERRITORY_BROADCAST_INTERVAL === 0) {
      this.onBroadcastToRoom(room.code, {
        type: 'wf_territory_update',
        territories: room.territories,
      });

      // Update team territory counts
      const counts = countTerritories(room.territories);
      for (const team of room.teams) {
        team.territoryCount = counts[team.id] || 0;
      }

      this.onBroadcastToRoom(room.code, {
        type: 'wf_team_scores',
        teams: room.teams.map(t => ({ id: t.id, score: t.score, territoryCount: t.territoryCount })),
      });
    }

    // 5. Broadcast resource state periodically
    if (room.tickCount % WF_RESOURCE_BROADCAST_INTERVAL === 0) {
      for (const team of room.teams) {
        this.onBroadcastToRoom(room.code, {
          type: 'wf_resources_update',
          teamId: team.id,
          resources: team.resourcePool,
        });
      }
    }

    // 6. Check win condition
    this.checkWinCondition(room);
  }

  private processEffectQueue(room: WFRoom): void {
    while (room.effectQueue.length > 0) {
      const effect = room.effectQueue.shift()!;
      this.applyEffect(room, effect);
      this.onBroadcastToRoom(room.code, { type: 'wf_effect_applied', effect });
    }
  }

  private applyEffect(room: WFRoom, effect: CrossModeEffect): void {
    switch (effect.effectType) {
      case 'territory_heal': {
        if (effect.targetTerritoryId != null) {
          const territory = room.territories[effect.targetTerritoryId];
          if (territory) healTerritory(territory, effect.value);
        }
        break;
      }

      case 'territory_damage': {
        if (effect.targetTerritoryId != null) {
          const territory = room.territories[effect.targetTerritoryId];
          if (territory) damageTerritory(territory, effect.value);
        }
        break;
      }

      case 'fortification_buff': {
        if (effect.targetTerritoryId != null) {
          const territory = room.territories[effect.targetTerritoryId];
          if (territory) fortifyTerritory(territory);
        }
        break;
      }

      case 'resource_grant':
      case 'energy_pulse': {
        const team = room.teams.find(t => t.id === effect.targetTeamId);
        if (team) {
          addResources(team.resourcePool, { energy: effect.value });
        }
        break;
      }

      case 'shield_boost':
      case 'score_bonus':
      case 'build_speed':
      case 'vision_reveal':
      case 'debuff_slow':
      case 'rhythm_power':
      case 'ammo_resupply': {
        // Apply as active effect to target players
        const activeEffect = effectToActive(effect);
        if (!activeEffect) break;

        for (const [, player] of room.players) {
          let applies = false;
          if (effect.targetScope === 'team' && player.teamId === effect.targetTeamId) applies = true;
          if (effect.targetScope === 'self' && player.id === effect.sourcePlayerId) applies = true;
          if (effect.targetScope === 'enemy_team' && player.teamId !== effect.targetTeamId) applies = true;
          if (effect.targetScope === 'all') applies = true;

          if (applies) {
            player.activeEffects.push({ ...activeEffect });
          }
        }
        break;
      }
    }
  }

  private updateTerritoryCapture(room: WFRoom): void {
    // Group soldiers by territory and team
    const soldiersByTerritory = new Map<number, Map<string, number>>();

    for (const [, player] of room.players) {
      if (player.role !== 'soldier' || !player.connected) continue;
      const territoryId = getTerritoryIdFromPosition(player.position.x, player.position.z);
      if (!soldiersByTerritory.has(territoryId)) {
        soldiersByTerritory.set(territoryId, new Map());
      }
      const teamMap = soldiersByTerritory.get(territoryId)!;
      teamMap.set(player.teamId, (teamMap.get(player.teamId) || 0) + 1);
    }

    for (const [territoryId, teamMap] of soldiersByTerritory) {
      const territory = room.territories[territoryId];
      if (!territory) continue;

      for (const [teamId, count] of teamMap) {
        const captured = tickCapture(territory, teamId, count);
        if (captured) {
          console.log(`[WF] Territory ${territoryId} captured by team ${teamId}`);
        }
      }
    }
  }

  private cleanPlayerEffects(room: WFRoom): void {
    for (const [, player] of room.players) {
      const expired = cleanExpiredEffects(player.activeEffects);
      for (const effectId of expired) {
        this.onBroadcastToRoom(room.code, {
          type: 'wf_effect_expired',
          effectId,
          playerId: player.id,
        });
      }
    }
  }

  private checkWinCondition(room: WFRoom): void {
    // Check time limit
    if (room.elapsedMs >= room.gameDurationMs) {
      this.endGame(room, 'time_up');
      return;
    }

    // Teams mode: hold 12/16 territories for 30 seconds
    if (room.mode === 'teams') {
      const counts = countTerritories(room.territories);
      const totalTerritories = WF_TERRITORY_GRID * WF_TERRITORY_GRID;
      const winThreshold = Math.ceil(totalTerritories * 0.75); // 12 of 16

      for (const team of room.teams) {
        const count = counts[team.id] || 0;
        if (count >= winThreshold) {
          if (!room.territoryHoldStart[team.id]) {
            room.territoryHoldStart[team.id] = Date.now();
          } else if (Date.now() - room.territoryHoldStart[team.id] >= 30000) {
            this.endGame(room, 'territory_domination', team.id);
            return;
          }
        } else {
          delete room.territoryHoldStart[team.id];
        }
      }
    }

    // FFA: first to 6 territories
    if (room.mode === 'ffa') {
      const counts = countTerritories(room.territories);
      for (const [teamId, count] of Object.entries(counts)) {
        if (count >= 6) {
          this.endGame(room, 'territory_domination', teamId);
          return;
        }
      }
    }
  }

  private endGame(room: WFRoom, reason: string, winnerId?: string): void {
    room.status = 'ended';
    this.stopTickLoop(room.code);

    // Determine winner if not specified
    if (!winnerId) {
      const counts = countTerritories(room.territories);
      let maxCount = 0;
      for (const [teamId, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          winnerId = teamId;
        }
      }
    }

    const rankings = Array.from(room.players.values()).map(p => ({
      playerId: p.id,
      playerName: p.name,
      teamId: p.teamId,
      role: p.role,
      score: room.teams.find(t => t.id === p.teamId)?.score || 0,
      roleStats: p.roleStats,
    }));

    this.onBroadcastToRoom(room.code, {
      type: 'wf_game_ended',
      reason,
      winnerId: winnerId || 'none',
      rankings,
    });
  }

  // ===== Role-Specific Message Handling =====

  handleDefenderAction(playerId: string, actionType: string, value: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;
    const player = room.players.get(playerId);
    if (!player || player.role !== 'defender') return;

    const stats = player.roleStats as DefenderStats;

    // Broadcast to team
    this.onBroadcastToRoom(room.code, {
      type: 'wf_defender_action_broadcast',
      playerId,
      actionType,
      value,
    });

    // Generate cross-mode effects based on action
    switch (actionType) {
      case 'line_clear': {
        stats.linesCleared += value;
        // Single line clear → heal territory
        if (player.assignedTerritoryId != null) {
          room.effectQueue.push(createEffect(playerId, 'defender', 'territory_heal', 'territory', EFFECT_VALUES.line_clear_heal, {
            targetTerritoryId: player.assignedTerritoryId,
          }));
        }
        // 2+ lines → shield boost for team soldiers
        if (value >= 2) {
          room.effectQueue.push(createEffect(playerId, 'defender', 'shield_boost', 'team', EFFECT_VALUES.line_clear_shield, {
            targetTeamId: player.teamId,
          }));
        }
        break;
      }

      case 'combo': {
        if (value > stats.maxCombo) stats.maxCombo = value;
        if (value >= 3) {
          const energy = EFFECT_VALUES.combo_energy * value;
          stats.energyGenerated += energy;
          room.effectQueue.push(createEffect(playerId, 'defender', 'energy_pulse', 'team', energy, {
            targetTeamId: player.teamId,
          }));
        }
        break;
      }

      case 't_spin': {
        stats.tSpins += value;
        room.effectQueue.push(createEffect(playerId, 'defender', 'build_speed', 'team', EFFECT_VALUES.tspin_build_speed, {
          targetTeamId: player.teamId,
        }));
        break;
      }

      case 'tetris': {
        // Find a random enemy territory to damage
        const enemyTerritories = room.territories.filter(t => t.ownerId && t.ownerId !== player.teamId);
        if (enemyTerritories.length > 0) {
          const target = enemyTerritories[Math.floor(Math.random() * enemyTerritories.length)];
          room.effectQueue.push(createEffect(playerId, 'defender', 'territory_damage', 'territory', EFFECT_VALUES.tetris_territory_damage, {
            targetTerritoryId: target.id,
          }));
        }
        break;
      }
    }
  }

  handleSoldierPosition(
    playerId: string,
    x: number, y: number, z: number,
    rx: number, ry: number,
    weaponId: string, health: number,
  ): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;
    const player = room.players.get(playerId);
    if (!player) return;

    player.position = { x, y, z };
    player.health = health;

    // Relay to all 3D-view players (soldiers + engineers)
    for (const [pid, p] of room.players) {
      if (pid === playerId) continue;
      if (p.role === 'soldier' || p.role === 'engineer') {
        this.onSendToPlayer(pid, {
          type: 'wf_soldier_position_update',
          playerId, x, y, z, rx, ry, weaponId, health,
        });
      }
    }
  }

  handleSoldierShoot(
    playerId: string,
    x: number, y: number, z: number,
    dx: number, dy: number, dz: number,
    weaponId: string,
  ): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;

    // Relay to all 3D-view players
    for (const [pid, p] of room.players) {
      if (pid === playerId) continue;
      if (p.role === 'soldier' || p.role === 'engineer') {
        this.onSendToPlayer(pid, {
          type: 'wf_soldier_shot',
          playerId, x, y, z, dx, dy, dz, weaponId,
        });
      }
    }
  }

  handleSoldierHit(
    playerId: string,
    targetId: string, damage: number,
    weaponId: string, headshot: boolean,
  ): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;

    const stats = room.players.get(playerId)?.roleStats as SoldierStats | undefined;
    if (stats) stats.damageDealt += damage;

    this.onBroadcastToRoom(room.code, {
      type: 'wf_soldier_hit_confirm',
      targetId, attackerId: playerId, damage, weaponId, headshot,
    });
  }

  handleSoldierDied(playerId: string, killerId: string, weaponId: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;

    const victim = room.players.get(playerId);
    const killer = room.players.get(killerId);

    if (victim) {
      const vStats = victim.roleStats as SoldierStats;
      vStats.deaths++;
    }

    if (killer) {
      const kStats = killer.roleStats as SoldierStats;
      kStats.kills++;

      // Kill → score_bonus for team defenders
      room.effectQueue.push(createEffect(killerId, 'soldier', 'score_bonus', 'team', EFFECT_VALUES.kill_score_bonus, {
        targetTeamId: killer.teamId,
      }));

      // Kill → territory_damage to victim's territory
      if (victim) {
        const territoryId = getTerritoryIdFromPosition(victim.position.x, victim.position.z);
        room.effectQueue.push(createEffect(killerId, 'soldier', 'territory_damage', 'territory', EFFECT_VALUES.kill_territory_damage, {
          targetTerritoryId: territoryId,
        }));
      }

      // Headshot → vision reveal
      if (killer && (killer.roleStats as SoldierStats).headshots !== undefined) {
        (killer.roleStats as SoldierStats).headshots++;
      }
    }

    this.onBroadcastToRoom(room.code, {
      type: 'wf_soldier_died_broadcast',
      playerId, killerId, weaponId,
    });
  }

  handleSoldierRespawn(playerId: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
      player.health = player.maxHealth;
      // Spawn at a friendly territory
      const friendlyTerritories = room.territories.filter(t => t.ownerId === player.teamId);
      if (friendlyTerritories.length > 0) {
        const spawn = friendlyTerritories[Math.floor(Math.random() * friendlyTerritories.length)];
        player.position = {
          x: spawn.gridX * 32 + 16,
          y: 40,
          z: spawn.gridZ * 32 + 16,
        };
      }
    }

    this.onBroadcastToRoom(room.code, {
      type: 'wf_soldier_respawned',
      playerId,
    });
  }

  handleEngineerPosition(
    playerId: string,
    x: number, y: number, z: number,
    rx: number, ry: number,
  ): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;
    const player = room.players.get(playerId);
    if (!player) return;

    player.position = { x, y, z };

    // Relay to all 3D-view players
    for (const [pid, p] of room.players) {
      if (pid === playerId) continue;
      if (p.role === 'soldier' || p.role === 'engineer') {
        this.onSendToPlayer(pid, {
          type: 'wf_engineer_position_update',
          playerId, x, y, z, rx, ry,
        });
      }
    }
  }

  handleEngineerMine(playerId: string, x: number, y: number, z: number, blockType: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;
    const player = room.players.get(playerId);
    if (!player || player.role !== 'engineer') return;

    const stats = player.roleStats as EngineerStats;
    stats.blocksMined++;

    // Grant resources
    const resources = getResourceForBlock(blockType);
    if (resources) {
      const team = room.teams.find(t => t.id === player.teamId);
      if (team) {
        addResources(team.resourcePool, resources);
        stats.resourcesGathered++;
      }
    }

    // Relay block change to all 3D-view players
    this.onBroadcastToRoom(room.code, {
      type: 'wf_engineer_block_mined',
      playerId, x, y, z, blockType,
    });
  }

  handleEngineerPlace(playerId: string, x: number, y: number, z: number, blockType: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;
    const player = room.players.get(playerId);
    if (!player || player.role !== 'engineer') return;

    const stats = player.roleStats as EngineerStats;
    stats.blocksPlaced++;

    // Check if placing in owned territory → fortification
    const territoryId = getTerritoryIdFromPosition(x, z);
    const territory = room.territories[territoryId];
    if (territory && territory.ownerId === player.teamId) {
      room.effectQueue.push(createEffect(playerId, 'engineer', 'fortification_buff', 'territory', 1, {
        targetTerritoryId: territoryId,
      }));
      stats.fortificationsBuilt++;
    }

    // Relay block change to all 3D-view players
    this.onBroadcastToRoom(room.code, {
      type: 'wf_engineer_block_placed',
      playerId, x, y, z, blockType,
    });
  }

  handleEngineerCraft(playerId: string, recipeId: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;
    const player = room.players.get(playerId);
    if (!player || player.role !== 'engineer') return;

    const stats = player.roleStats as EngineerStats;
    stats.itemsCrafted++;

    // Supply crafting → ammo_resupply for team soldiers
    room.effectQueue.push(createEffect(playerId, 'engineer', 'ammo_resupply', 'team', EFFECT_VALUES.ammo_resupply_percent, {
      targetTeamId: player.teamId,
    }));
  }

  handleCommanderScan(playerId: string, targetTerritoryId: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;
    const player = room.players.get(playerId);
    if (!player || player.role !== 'commander') return;

    const team = room.teams.find(t => t.id === player.teamId);
    if (!team) return;

    const cost = getAbilityCost('scan');
    if (!cost || !spendResources(team.resourcePool, cost)) return;

    const stats = player.roleStats as CommanderStats;
    stats.scansUsed++;
    stats.energySpent += cost.energy || 0;

    // Reveal enemies in target territory
    const territory = room.territories[targetTerritoryId];
    if (!territory) return;

    const enemyPositions: { x: number; z: number }[] = [];
    for (const [, p] of room.players) {
      if (p.teamId === player.teamId || !p.connected) continue;
      const pTerritoryId = getTerritoryIdFromPosition(p.position.x, p.position.z);
      if (pTerritoryId === targetTerritoryId) {
        enemyPositions.push({ x: p.position.x, z: p.position.z });
      }
    }

    // Send result to team
    for (const [pid, p] of room.players) {
      if (p.teamId === player.teamId) {
        this.onSendToPlayer(pid, {
          type: 'wf_commander_scan_result',
          territoryId: targetTerritoryId,
          enemyPositions,
        });
      }
    }

    room.effectQueue.push(createEffect(playerId, 'commander', 'vision_reveal', 'team', 1, {
      targetTeamId: player.teamId,
    }));
  }

  handleCommanderAbility(playerId: string, abilityId: string, targetTerritoryId: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;
    const player = room.players.get(playerId);
    if (!player || player.role !== 'commander') return;

    const team = room.teams.find(t => t.id === player.teamId);
    if (!team) return;

    const cost = getAbilityCost(abilityId);
    if (!cost || !spendResources(team.resourcePool, cost)) return;

    const stats = player.roleStats as CommanderStats;
    stats.abilitiesUsed++;
    stats.energySpent += (cost.energy || 0) + (cost.diamond || 0) + (cost.iron || 0);

    switch (abilityId) {
      case 'shield_generator':
        room.effectQueue.push(createEffect(playerId, 'commander', 'shield_boost', 'team', 0.3, {
          targetTeamId: player.teamId,
        }));
        break;

      case 'rally':
        room.effectQueue.push(createEffect(playerId, 'commander', 'energy_pulse', 'team', 20, {
          targetTeamId: player.teamId,
        }));
        break;

      case 'emp':
        room.effectQueue.push(createEffect(playerId, 'commander', 'debuff_slow', 'enemy_team', 0.25, {
          targetTeamId: player.teamId,
        }));
        break;
    }
  }

  handleCommanderPing(playerId: string, x: number, z: number, pingType: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;

    const stats = player.roleStats as CommanderStats;
    stats.ordersIssued++;

    // Broadcast ping to team
    for (const [pid, p] of room.players) {
      if (p.teamId === player.teamId) {
        this.onSendToPlayer(pid, {
          type: 'wf_commander_ping_broadcast',
          playerId, x, z, pingType,
          teamId: player.teamId,
        });
      }
    }
  }

  handleChat(playerId: string, message: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;

    this.onBroadcastToRoom(room.code, {
      type: 'wf_chat_message',
      playerId,
      playerName: player.name,
      message: message.slice(0, 200),
    });
  }

  // ===== Queries =====

  getRoomByPlayerId(playerId: string): WFRoom | undefined {
    const code = this.playerToRoom.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  getRoomState(roomCode: string): WarfrontRoomState | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const players: Record<string, WarfrontPlayer> = {};
    for (const [id, p] of room.players) {
      players[id] = p;
    }

    return {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      status: room.status,
      mode: room.mode,
      maxPlayers: room.maxPlayers,
      seed: room.seed,
      createdAt: room.createdAt,
      gameStartedAt: room.gameStartedAt,
      gameDurationMs: room.gameDurationMs,
      elapsedMs: room.elapsedMs,
      teams: room.teams,
      players,
      territories: room.territories,
    };
  }

  getPlayerIdsInRoom(roomCode: string): string[] {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    return Array.from(room.players.keys());
  }

  getPublicRooms(): WFPublicRoom[] {
    const rooms: WFPublicRoom[] = [];
    for (const [, room] of this.rooms) {
      if (room.status === 'waiting' || room.status === 'playing') {
        const host = room.players.get(room.hostId);
        rooms.push({
          code: room.code,
          name: room.name,
          hostName: host?.name || 'Unknown',
          playerCount: room.players.size,
          maxPlayers: room.maxPlayers,
          mode: room.mode,
          status: room.status,
        });
      }
    }
    return rooms;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  // ===== Player Management =====

  removePlayer(playerId: string): { roomCode?: string; room?: WFRoom } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return {};

    room.players.delete(playerId);
    this.playerToRoom.delete(playerId);
    room.lastActivity = Date.now();

    // If host left, transfer to next player
    if (room.hostId === playerId) {
      const nextPlayer = room.players.keys().next().value;
      if (nextPlayer) {
        room.hostId = nextPlayer;
      }
    }

    // If room is empty, clean up
    if (room.players.size === 0) {
      this.stopTickLoop(room.code);
      this.rooms.delete(room.code);
      return { roomCode: room.code };
    }

    return { roomCode: room.code, room };
  }

  markDisconnected(playerId: string): { roomCode?: string } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return {};

    const player = room.players.get(playerId);
    if (player) {
      player.connected = false;
    }

    return { roomCode: room.code };
  }

  markReconnected(playerId: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (player) {
      player.connected = true;
    }
  }

  transferPlayer(oldPlayerId: string, newPlayerId: string): void {
    const code = this.playerToRoom.get(oldPlayerId);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;

    const player = room.players.get(oldPlayerId);
    if (!player) return;

    player.id = newPlayerId;
    room.players.delete(oldPlayerId);
    room.players.set(newPlayerId, player);
    this.playerToRoom.delete(oldPlayerId);
    this.playerToRoom.set(newPlayerId, code);

    if (room.hostId === oldPlayerId) {
      room.hostId = newPlayerId;
    }
  }

  // ===== Cleanup =====

  private cleanupStaleRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > 600000) { // 10 minutes
        this.stopTickLoop(code);
        for (const pid of room.players.keys()) {
          this.playerToRoom.delete(pid);
        }
        this.rooms.delete(code);
        console.log(`[WF] Cleaned up stale room ${code}`);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    for (const code of this.tickIntervals.keys()) {
      this.stopTickLoop(code);
    }
    this.rooms.clear();
    this.playerToRoom.clear();
  }

  // ===== Helpers =====

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  private createRoleStats(role: WarfrontRole): DefenderStats | SoldierStats | EngineerStats | CommanderStats {
    switch (role) {
      case 'defender':
        return { linesCleared: 0, maxCombo: 0, tSpins: 0, energyGenerated: 0, territoriesHealed: 0 };
      case 'soldier':
        return { kills: 0, deaths: 0, damageDealt: 0, territoriesCaptured: 0, headshots: 0 };
      case 'engineer':
        return { blocksMined: 0, blocksPlaced: 0, resourcesGathered: 0, fortificationsBuilt: 0, itemsCrafted: 0 };
      case 'commander':
        return { scansUsed: 0, abilitiesUsed: 0, energySpent: 0, ordersIssued: 0 };
    }
  }
}
