// =============================================================================
// MinecraftSwitchManager — Server-authoritative game manager
// Handles room lifecycle, game loop, block interaction, player sync, and chat
// for the Minecraft: Nintendo Switch Edition multiplayer mode.
// =============================================================================

import type { ServerMessage } from '@/types/multiplayer';
import {
  MS_PLAYER_COLORS,
  MS_CONFIG,
  Block,
} from '@/types/minecraft-switch';
import type {
  MSPlayer,
  MSRoomState,
  MSPublicRoom,
  GameMode,
  Difficulty,
  WorldType,
  BlockId,
  BlockFace,
  PlayerPosition,
  PlayerInventory,
  InventorySlot,
} from '@/types/minecraft-switch';
import {
  getGameModeConfig,
  getDifficultyConfig,
  getDefaultGameRules,
  canPlayerBreak,
  canPlayerPlace,
  getCreativeInventory,
} from './game-modes';
import type { GameRules, GameModeConfig, DifficultyConfig } from './game-modes';

// =============================================================================
// Internal Types
// =============================================================================

interface MSPlayerState {
  id: string;
  name: string;
  color: string;
  ready: boolean;
  connected: boolean;
  gameMode: GameMode;
  ping: number;
  // Position & movement
  position: PlayerPosition;
  velocity: { x: number; y: number; z: number };
  onGround: boolean;
  sprinting: boolean;
  sneaking: boolean;
  swimming: boolean;
  flying: boolean;
  // Stats
  health: number;
  maxHealth: number;
  hunger: number;
  saturation: number;
  experience: number;
  level: number;
  armorPoints: number;
  // Inventory
  inventory: PlayerInventory;
  // Timing
  lastPositionBroadcast: number;
  lastActivity: number;
  invulnerabilityTicks: number;
  fireTicks: number;
  airSupply: number;
}

interface MSRoom {
  code: string;
  name: string;
  hostId: string;
  players: MSPlayerState[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  seed: number;
  worldType: WorldType;
  gameMode: GameMode;
  difficulty: Difficulty;
  gameRules: GameRules;
  tickCount: number;
  dayTime: number;
  weather: 'clear' | 'rain' | 'thunder';
  weatherDuration: number;
  createdAt: number;
  lastActivity: number;
  // Block changes as delta over seed-generated world
  // Key format: "x,y,z" -> blockId
  blockChanges: Map<string, number>;
  // Pending player actions for tick processing
  pendingActions: PendingAction[];
  // Game loop interval
  gameLoopInterval: ReturnType<typeof setInterval> | null;
}

type PendingAction =
  | { type: 'block_break'; playerId: string; x: number; y: number; z: number }
  | { type: 'block_place'; playerId: string; x: number; y: number; z: number; blockId: BlockId; face: BlockFace }
  | { type: 'chat'; playerId: string; message: string }
  | { type: 'gamemode_change'; playerId: string; mode: GameMode }
  | { type: 'difficulty_change'; playerId: string; difficulty: Difficulty };

interface ManagerCallbacks {
  onSendToPlayer: (playerId: string, message: ServerMessage) => void;
  onBroadcastToRoom: (roomCode: string, message: ServerMessage, excludePlayerId?: string) => void;
  onSessionEnd?: (roomCode: string) => void;
}

// =============================================================================
// Utility
// =============================================================================

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function blockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function defaultInventory(): PlayerInventory {
  return {
    main: new Array(27).fill(null),
    hotbar: new Array(9).fill(null),
    armor: new Array(4).fill(null),
    offhand: null,
    selectedSlot: 0,
  };
}

function defaultSpawnPosition(): PlayerPosition {
  return { x: 0, y: 64, z: 0, yaw: 0, pitch: 0 };
}

function distanceSq(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dz = z1 - z2;
  return dx * dx + dy * dy + dz * dz;
}

// =============================================================================
// MinecraftSwitchManager
// =============================================================================

export class MinecraftSwitchManager {
  private rooms = new Map<string, MSRoom>();
  private playerToRoom = new Map<string, string>();
  private callbacks: ManagerCallbacks;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(callbacks: ManagerCallbacks) {
    this.callbacks = callbacks;
    // Cleanup stale rooms every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
  }

  // ===========================================================================
  // Room Management
  // ===========================================================================

  createRoom(
    playerId: string,
    playerName: string,
    roomName?: string,
    config?: {
      gameMode?: GameMode;
      difficulty?: Difficulty;
      worldType?: WorldType;
      seed?: number;
    },
  ): { roomCode: string; player: MSPlayer } {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const gameMode = config?.gameMode || 'survival';
    const difficulty = config?.difficulty || 'normal';

    const player: MSPlayerState = this.createPlayerState(
      playerId, playerName, 0, gameMode,
    );

    const room: MSRoom = {
      code,
      name: (roomName || `${playerName}'s World`).slice(0, MS_CONFIG.ROOM_NAME_MAX),
      hostId: playerId,
      players: [player],
      status: 'waiting',
      maxPlayers: MS_CONFIG.MAX_PLAYERS,
      seed: config?.seed ?? Math.floor(Math.random() * 2147483647),
      worldType: config?.worldType || 'default',
      gameMode,
      difficulty,
      gameRules: getDefaultGameRules(),
      tickCount: 0,
      dayTime: 1000, // Start at morning
      weather: 'clear',
      weatherDuration: 12000,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      blockChanges: new Map(),
      pendingActions: [],
      gameLoopInterval: null,
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(playerId, code);

    return { roomCode: code, player: this.toPublicPlayer(player) };
  }

  joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string,
  ): { success: boolean; error?: string; player?: MSPlayer; roomState?: MSRoomState } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'waiting' && room.status !== 'playing') {
      return { success: false, error: 'Cannot join this room' };
    }
    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }
    if (room.players.some(p => p.id === playerId)) {
      return { success: false, error: 'Already in room' };
    }

    const colorIndex = room.players.length % MS_PLAYER_COLORS.length;
    const player = this.createPlayerState(
      playerId, playerName, colorIndex, room.gameMode,
    );

    room.players.push(player);
    room.lastActivity = Date.now();
    this.playerToRoom.set(playerId, code);

    const roomState = this.getRoomState(code);
    return { success: true, player: this.toPublicPlayer(player), roomState: roomState || undefined };
  }

  removePlayer(playerId: string): { roomCode?: string; room?: MSRoom } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.playerToRoom.delete(playerId);
      return {};
    }

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerToRoom.delete(playerId);
    room.lastActivity = Date.now();

    if (room.players.length === 0) {
      this.stopGameLoop(roomCode);
      this.rooms.delete(roomCode);
      if (this.callbacks.onSessionEnd) {
        this.callbacks.onSessionEnd(roomCode);
      }
      return { roomCode };
    }

    // Transfer host if needed
    if (room.hostId === playerId) {
      const newHost = room.players.find(p => p.connected) || room.players[0];
      if (newHost) {
        room.hostId = newHost.id;
        this.callbacks.onBroadcastToRoom(roomCode, {
          type: 'ms_system_message',
          message: `${newHost.name} is now the host`,
          color: '#FFDD44',
        } as unknown as ServerMessage);
      }
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
    if (connectedPlayers.length < MS_CONFIG.MIN_PLAYERS) {
      return { success: false, error: 'Not enough players' };
    }

    const allReady = connectedPlayers.every(p => p.id === room.hostId || p.ready);
    if (!allReady) return { success: false, error: 'Not all players are ready' };

    room.status = 'countdown';
    return { success: true, gameSeed: room.seed };
  }

  beginPlaying(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.status = 'playing';
    room.lastActivity = Date.now();

    // Initialize player positions at spawn
    for (const player of room.players) {
      player.position = defaultSpawnPosition();
      player.health = MS_CONFIG.MAX_HEALTH;
      player.hunger = MS_CONFIG.MAX_HUNGER;
      player.saturation = 5.0;

      // Creative mode: give full creative inventory
      if (room.gameMode === 'creative') {
        player.inventory = getCreativeInventory();
      }
    }

    // Start the game loop
    this.startGameLoop(roomCode);
  }

  // ===========================================================================
  // Game Loop (20 ticks/sec)
  // ===========================================================================

  private startGameLoop(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || room.gameLoopInterval) return;

    const TICK_INTERVAL = 1000 / MS_CONFIG.TICK_RATE; // 50ms

    room.gameLoopInterval = setInterval(() => {
      this.gameTick(roomCode);
    }, TICK_INTERVAL);

    console.log(`[MCS] Game loop started for room ${roomCode} at ${MS_CONFIG.TICK_RATE} tps`);
  }

  private stopGameLoop(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameLoopInterval) return;

    clearInterval(room.gameLoopInterval);
    room.gameLoopInterval = null;
    console.log(`[MCS] Game loop stopped for room ${roomCode}`);
  }

  private gameTick(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    room.tickCount++;

    // Process pending actions
    this.processPendingActions(room);

    // Update day/night cycle
    if (room.gameRules.doDaylightCycle) {
      room.dayTime = (room.dayTime + 1) % MS_CONFIG.DAY_LENGTH;

      // Broadcast time update every 100 ticks (5 seconds)
      if (room.tickCount % 100 === 0) {
        this.callbacks.onBroadcastToRoom(roomCode, {
          type: 'ms_time_update',
          totalTicks: room.tickCount,
          dayTime: room.dayTime,
        } as unknown as ServerMessage);
      }
    }

    // Update weather
    if (room.gameRules.doWeatherCycle) {
      room.weatherDuration--;
      if (room.weatherDuration <= 0) {
        this.cycleWeather(room);
      }
    }

    // Process survival mechanics
    if (room.difficulty !== 'peaceful') {
      this.processSurvivalMechanics(room);
    }

    // Broadcast player state updates every 20 ticks (1 second)
    if (room.tickCount % 20 === 0) {
      this.broadcastPlayerStates(room);
    }

    // Process natural health regeneration
    if (room.gameRules.naturalRegeneration) {
      this.processNaturalRegen(room);
    }

    // Update invulnerability timers
    for (const player of room.players) {
      if (player.invulnerabilityTicks > 0) {
        player.invulnerabilityTicks--;
      }
      if (player.fireTicks > 0) {
        player.fireTicks--;
      }
    }
  }

  private processPendingActions(room: MSRoom): void {
    const actions = [...room.pendingActions];
    room.pendingActions = [];

    for (const action of actions) {
      switch (action.type) {
        case 'block_break':
          this.processBlockBreak(room, action.playerId, action.x, action.y, action.z);
          break;
        case 'block_place':
          this.processBlockPlace(room, action.playerId, action.x, action.y, action.z, action.blockId, action.face);
          break;
        case 'chat':
          this.processChat(room, action.playerId, action.message);
          break;
        case 'gamemode_change':
          this.processGameModeChange(room, action.playerId, action.mode);
          break;
        case 'difficulty_change':
          this.processDifficultyChange(room, action.playerId, action.difficulty);
          break;
      }
    }
  }

  private processBlockBreak(room: MSRoom, playerId: string, x: number, y: number, z: number): void {
    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.connected) return;

    const modeConfig = getGameModeConfig(player.gameMode);

    // Spectators cannot break blocks
    if (!modeConfig.canBreakBlocks) return;

    // Validate reach distance
    const reachSq = MS_CONFIG.PLAYER_REACH * MS_CONFIG.PLAYER_REACH;
    const dist = distanceSq(
      player.position.x, player.position.y + MS_CONFIG.PLAYER_EYE_HEIGHT, player.position.z,
      x + 0.5, y + 0.5, z + 0.5,
    );
    if (dist > reachSq) return;

    // Validate Y range
    if (y < 0 || y >= MS_CONFIG.WORLD_HEIGHT) return;

    // Check adventure mode restrictions
    if (player.gameMode === 'adventure') {
      if (!canPlayerBreak(player.gameMode, x, y, z)) return;
    }

    // Don't allow breaking bedrock (unless creative)
    const currentBlock = this.getBlockAt(room, x, y, z);
    if (currentBlock === Block.Bedrock && player.gameMode !== 'creative') return;

    // Update block to air
    room.blockChanges.set(blockKey(x, y, z), Block.Air);

    // Broadcast block update
    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'ms_block_broken',
      x, y, z,
      playerId,
      newBlockId: Block.Air,
    } as unknown as ServerMessage);

    // Also send a generic block update for world state
    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'ms_block_update',
      x, y, z,
      blockId: Block.Air,
    } as unknown as ServerMessage);
  }

  private processBlockPlace(
    room: MSRoom,
    playerId: string,
    x: number, y: number, z: number,
    blockId: BlockId,
    face: BlockFace,
  ): void {
    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.connected) return;

    const modeConfig = getGameModeConfig(player.gameMode);

    // Spectators cannot place blocks
    if (!modeConfig.canPlaceBlocks) return;

    // Validate reach distance
    const reachSq = MS_CONFIG.PLAYER_REACH * MS_CONFIG.PLAYER_REACH;
    const dist = distanceSq(
      player.position.x, player.position.y + MS_CONFIG.PLAYER_EYE_HEIGHT, player.position.z,
      x + 0.5, y + 0.5, z + 0.5,
    );
    if (dist > reachSq) return;

    // Validate Y range
    if (y < 0 || y >= MS_CONFIG.WORLD_HEIGHT) return;

    // Calculate placement position based on face
    const placePos = this.getPlacementPosition(x, y, z, face);
    if (placePos.y < 0 || placePos.y >= MS_CONFIG.WORLD_HEIGHT) return;

    // Check adventure mode restrictions
    if (player.gameMode === 'adventure') {
      if (!canPlayerPlace(player.gameMode, blockId)) return;
    }

    // Ensure we're not placing inside a player
    for (const p of room.players) {
      if (!p.connected) continue;
      const px = Math.floor(p.position.x);
      const py = Math.floor(p.position.y);
      const pz = Math.floor(p.position.z);
      if (
        placePos.x === px && placePos.z === pz &&
        (placePos.y === py || placePos.y === py + 1)
      ) {
        return; // Would place inside a player
      }
    }

    // Update block
    room.blockChanges.set(blockKey(placePos.x, placePos.y, placePos.z), blockId);

    // Broadcast block update
    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'ms_block_placed',
      x: placePos.x, y: placePos.y, z: placePos.z,
      blockId,
      playerId,
    } as unknown as ServerMessage);

    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'ms_block_update',
      x: placePos.x, y: placePos.y, z: placePos.z,
      blockId,
    } as unknown as ServerMessage);

    // Consume item from inventory (non-creative)
    if (!modeConfig.infiniteResources) {
      this.consumeHeldItem(player);
    }
  }

  private processChat(room: MSRoom, playerId: string, message: string): void {
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    const trimmed = message.slice(0, MS_CONFIG.MAX_CHAT_LENGTH).trim();
    if (!trimmed) return;

    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'ms_chat_message',
      playerId,
      playerName: player.name,
      message: trimmed,
    } as unknown as ServerMessage);
  }

  private processGameModeChange(room: MSRoom, playerId: string, mode: GameMode): void {
    // Only host can change game mode
    if (room.hostId !== playerId) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    room.gameMode = mode;

    // Update all players' game mode
    for (const p of room.players) {
      p.gameMode = mode;

      // Give creative inventory if switching to creative
      if (mode === 'creative') {
        p.inventory = getCreativeInventory();
        p.health = MS_CONFIG.MAX_HEALTH;
        p.hunger = MS_CONFIG.MAX_HUNGER;
      }
    }

    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'ms_system_message',
      message: `Game mode changed to ${mode}`,
      color: '#AAAAFF',
    } as unknown as ServerMessage);

    // Broadcast updated room state
    const roomState = this.getRoomState(room.code);
    if (roomState) {
      this.callbacks.onBroadcastToRoom(room.code, {
        type: 'ms_room_state',
        roomState,
      } as unknown as ServerMessage);
    }
  }

  private processDifficultyChange(room: MSRoom, playerId: string, difficulty: Difficulty): void {
    if (room.hostId !== playerId) return;

    room.difficulty = difficulty;
    const config = getDifficultyConfig(difficulty);

    // Peaceful: heal all players, remove hostile mobs
    if (difficulty === 'peaceful') {
      for (const p of room.players) {
        p.health = p.maxHealth;
        p.hunger = MS_CONFIG.MAX_HUNGER;
        p.saturation = MS_CONFIG.MAX_SATURATION;
      }
    }

    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'ms_system_message',
      message: `Difficulty set to ${difficulty}`,
      color: '#AAAAFF',
    } as unknown as ServerMessage);
  }

  // ===========================================================================
  // Survival Mechanics
  // ===========================================================================

  private processSurvivalMechanics(room: MSRoom): void {
    const diffConfig = getDifficultyConfig(room.difficulty);

    for (const player of room.players) {
      if (!player.connected) continue;
      if (player.gameMode !== 'survival' && player.gameMode !== 'adventure') continue;

      const modeConfig = getGameModeConfig(player.gameMode);
      if (!modeConfig.canTakeDamage) continue;

      // Starvation damage
      if (player.hunger <= 0 && room.tickCount % MS_CONFIG.STARVATION_DAMAGE_INTERVAL === 0) {
        if (room.difficulty === 'hard') {
          // Hard: starvation can kill
          this.damagePlayer(room, player, 1, 'starving');
        } else if (room.difficulty === 'normal' && player.health > 1) {
          // Normal: starvation stops at half heart
          this.damagePlayer(room, player, 1, 'starving');
        } else if (room.difficulty === 'easy' && player.health > 10) {
          // Easy: starvation stops at 5 hearts
          this.damagePlayer(room, player, 1, 'starving');
        }
      }

      // Hunger depletion from activity (simplified)
      if (player.sprinting && room.tickCount % 40 === 0) {
        player.saturation = Math.max(0, player.saturation - 0.1);
        if (player.saturation <= 0) {
          player.hunger = Math.max(0, player.hunger - 1);
        }
      }

      // Fire damage
      if (player.fireTicks > 0 && room.tickCount % MS_CONFIG.FIRE_DAMAGE_INTERVAL === 0) {
        this.damagePlayer(room, player, 1, 'fire');
      }

      // Drowning
      if (player.airSupply <= 0 && room.tickCount % MS_CONFIG.DROWNING_DAMAGE_INTERVAL === 0) {
        this.damagePlayer(room, player, 2, 'drowning');
      }
    }
  }

  private processNaturalRegen(room: MSRoom): void {
    for (const player of room.players) {
      if (!player.connected) continue;
      if (player.gameMode !== 'survival') continue;
      if (player.health >= player.maxHealth) continue;

      // Natural regen: requires hunger >= 18 (or 17.x saturation)
      if (player.hunger >= MS_CONFIG.NATURAL_REGEN_THRESHOLD) {
        // Regen 1 HP every 80 ticks (4 seconds) at full hunger
        if (room.tickCount % 80 === 0) {
          player.health = Math.min(player.maxHealth, player.health + 1);
          player.saturation = Math.max(0, player.saturation - MS_CONFIG.FOOD_EXHAUSTION_REGEN);
          if (player.saturation <= 0) {
            player.hunger = Math.max(0, player.hunger - 1);
          }
        }
      }
    }
  }

  private damagePlayer(room: MSRoom, player: MSPlayerState, amount: number, source: string): void {
    if (player.invulnerabilityTicks > 0) return;
    if (player.gameMode === 'creative' || player.gameMode === 'spectator') return;

    const modeConfig = getGameModeConfig(player.gameMode);
    if (!modeConfig.canTakeDamage) return;

    player.health = Math.max(0, player.health - amount);
    player.invulnerabilityTicks = MS_CONFIG.INVULNERABILITY_TICKS;

    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'ms_damage',
      targetId: player.id,
      damage: amount,
      source,
      newHealth: player.health,
    } as unknown as ServerMessage);

    if (player.health <= 0) {
      this.handlePlayerDeath(room, player, source);
    }
  }

  private handlePlayerDeath(room: MSRoom, player: MSPlayerState, source: string): void {
    const deathMessages: Record<string, string> = {
      starving: `${player.name} starved to death`,
      fire: `${player.name} burned to death`,
      drowning: `${player.name} drowned`,
      fall: `${player.name} fell to their death`,
      void: `${player.name} fell out of the world`,
      lava: `${player.name} tried to swim in lava`,
      generic: `${player.name} died`,
    };

    const deathMessage = deathMessages[source] || `${player.name} died`;

    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'ms_player_died',
      playerId: player.id,
      deathMessage,
    } as unknown as ServerMessage);

    // Drop items (unless keepInventory)
    if (!room.gameRules.keepInventory) {
      // In a full implementation we'd spawn item entities
      player.inventory = defaultInventory();
    }

    // Respawn after a short delay
    setTimeout(() => {
      this.respawnPlayer(room.code, player.id);
    }, 2000);
  }

  private respawnPlayer(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    player.health = MS_CONFIG.MAX_HEALTH;
    player.hunger = MS_CONFIG.MAX_HUNGER;
    player.saturation = 5.0;
    player.fireTicks = 0;
    player.airSupply = MS_CONFIG.MAX_AIR_SUPPLY;
    player.invulnerabilityTicks = 60; // 3 seconds of invulnerability on respawn
    player.position = defaultSpawnPosition();

    this.callbacks.onBroadcastToRoom(roomCode, {
      type: 'ms_player_respawned',
      playerId,
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    } as unknown as ServerMessage);
  }

  // ===========================================================================
  // Weather
  // ===========================================================================

  private cycleWeather(room: MSRoom): void {
    // Weighted random: 60% clear, 30% rain, 10% thunder
    const rand = Math.random();
    if (rand < 0.6) {
      room.weather = 'clear';
    } else if (rand < 0.9) {
      room.weather = 'rain';
    } else {
      room.weather = 'thunder';
    }

    // Duration: 3-7 minutes (3600-8400 ticks)
    room.weatherDuration = 3600 + Math.floor(Math.random() * 4800);

    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'ms_weather_change',
      weather: room.weather,
      duration: room.weatherDuration,
    } as unknown as ServerMessage);
  }

  // ===========================================================================
  // Player Actions (called from handler)
  // ===========================================================================

  handleBlockBreak(playerId: string, x: number, y: number, z: number): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    room.pendingActions.push({ type: 'block_break', playerId, x, y, z });
  }

  handleBlockPlace(playerId: string, x: number, y: number, z: number, blockId: BlockId, face: BlockFace): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    room.pendingActions.push({ type: 'block_place', playerId, x, y, z, blockId, face });
  }

  handlePlayerPosition(
    playerId: string,
    x: number, y: number, z: number,
    yaw: number, pitch: number,
    onGround: boolean,
  ): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    // Fall damage detection
    if (player.gameMode === 'survival' || player.gameMode === 'adventure') {
      if (onGround && !player.onGround && player.velocity.y < -0.5) {
        const fallDistance = Math.abs(player.velocity.y) * 20; // Approximate blocks fallen
        if (fallDistance > 3) {
          const damage = Math.floor(fallDistance - 3);
          if (damage > 0) {
            this.damagePlayer(room, player, damage, 'fall');
          }
        }
      }
    }

    player.position = { x, y, z, yaw, pitch };
    player.onGround = onGround;
    player.lastActivity = Date.now();
    room.lastActivity = Date.now();

    // Broadcast position to others (throttled by client to ~10Hz)
    const now = Date.now();
    if (now - player.lastPositionBroadcast >= MS_CONFIG.POSITION_BROADCAST_RATE) {
      player.lastPositionBroadcast = now;
      this.callbacks.onBroadcastToRoom(roomCode, {
        type: 'ms_player_position',
        playerId,
        x, y, z, yaw, pitch, onGround,
      } as unknown as ServerMessage, playerId);
    }
  }

  handleSprint(playerId: string, sprinting: boolean): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    // Cannot sprint with low hunger
    if (sprinting && player.hunger < MS_CONFIG.SPRINT_THRESHOLD) return;

    player.sprinting = sprinting;
    this.callbacks.onBroadcastToRoom(roomCode, {
      type: 'ms_player_sprint',
      playerId,
      sprinting,
    } as unknown as ServerMessage, playerId);
  }

  handleSneak(playerId: string, sneaking: boolean): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    player.sneaking = sneaking;
    this.callbacks.onBroadcastToRoom(roomCode, {
      type: 'ms_player_sneak',
      playerId,
      sneaking,
    } as unknown as ServerMessage, playerId);
  }

  handleChat(playerId: string, message: string): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.pendingActions.push({ type: 'chat', playerId, message });
  }

  handleGameModeChange(playerId: string, mode: GameMode): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.pendingActions.push({ type: 'gamemode_change', playerId, mode });
  }

  handleDifficultyChange(playerId: string, difficulty: Difficulty): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.pendingActions.push({ type: 'difficulty_change', playerId, difficulty });
  }

  handleSelectSlot(playerId: string, slot: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    if (slot < 0 || slot > 8) return;
    player.inventory.selectedSlot = slot;
  }

  // ===========================================================================
  // World State Queries
  // ===========================================================================

  private getBlockAt(room: MSRoom, x: number, y: number, z: number): number {
    const key = blockKey(x, y, z);
    const delta = room.blockChanges.get(key);
    if (delta !== undefined) return delta;
    // Without full world generation on server, return 0 (air) as default
    // Clients generate terrain from seed and apply deltas
    return Block.Air;
  }

  getBlockDeltas(roomCode: string, chunkX: number, chunkZ: number): { x: number; y: number; z: number; blockId: number }[] {
    const room = this.rooms.get(roomCode);
    if (!room) return [];

    const deltas: { x: number; y: number; z: number; blockId: number }[] = [];
    const minX = chunkX * 16;
    const minZ = chunkZ * 16;
    const maxX = minX + 16;
    const maxZ = minZ + 16;

    for (const [key, blockId] of room.blockChanges) {
      const [xs, ys, zs] = key.split(',').map(Number);
      if (xs >= minX && xs < maxX && zs >= minZ && zs < maxZ) {
        deltas.push({ x: xs, y: ys, z: zs, blockId });
      }
    }

    return deltas;
  }

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  getRoomByPlayerId(playerId: string): MSRoom | null {
    const code = this.playerToRoom.get(playerId);
    return code ? this.rooms.get(code) || null : null;
  }

  getRoomState(roomCode: string): MSRoomState | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    return {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      players: room.players.map(p => this.toPublicPlayer(p)),
      status: room.status,
      maxPlayers: room.maxPlayers,
      seed: room.seed,
      difficulty: room.difficulty,
      gameMode: room.gameMode,
      worldType: room.worldType,
    };
  }

  getPublicRooms(): MSPublicRoom[] {
    const rooms: MSPublicRoom[] = [];
    for (const room of this.rooms.values()) {
      if (room.status === 'waiting' || room.status === 'playing') {
        const host = room.players.find(p => p.id === room.hostId);
        rooms.push({
          code: room.code,
          name: room.name,
          hostName: host?.name || 'Unknown',
          playerCount: room.players.filter(p => p.connected).length,
          maxPlayers: room.maxPlayers,
          status: room.status === 'waiting' ? 'waiting' : 'playing',
          gameMode: room.gameMode,
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

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  markDisconnected(playerId: string): { roomCode?: string } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) return {};

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;

      this.callbacks.onBroadcastToRoom(roomCode, {
        type: 'ms_system_message',
        message: `${player.name} disconnected`,
        color: '#FF4444',
      } as unknown as ServerMessage, playerId);
    }

    // Check if all players disconnected
    const connectedCount = room.players.filter(p => p.connected).length;
    if (connectedCount === 0 && room.status === 'playing') {
      this.stopGameLoop(roomCode);
    }

    return { roomCode };
  }

  markReconnected(playerId: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.connected = true;

      this.callbacks.onBroadcastToRoom(room.code, {
        type: 'ms_system_message',
        message: `${player.name} reconnected`,
        color: '#44CC44',
      } as unknown as ServerMessage, playerId);

      // Restart game loop if it was stopped
      if (room.status === 'playing' && !room.gameLoopInterval) {
        this.startGameLoop(room.code);
      }
    }
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

    this.playerToRoom.delete(oldPlayerId);
    this.playerToRoom.set(newPlayerId, roomCode);
  }

  // ===========================================================================
  // Internal Helpers
  // ===========================================================================

  private createPlayerState(
    playerId: string,
    playerName: string,
    colorIndex: number,
    gameMode: GameMode,
  ): MSPlayerState {
    return {
      id: playerId,
      name: playerName.slice(0, MS_CONFIG.PLAYER_NAME_MAX),
      color: MS_PLAYER_COLORS[colorIndex % MS_PLAYER_COLORS.length],
      ready: false,
      connected: true,
      gameMode,
      ping: 0,
      position: defaultSpawnPosition(),
      velocity: { x: 0, y: 0, z: 0 },
      onGround: true,
      sprinting: false,
      sneaking: false,
      swimming: false,
      flying: false,
      health: MS_CONFIG.MAX_HEALTH,
      maxHealth: MS_CONFIG.MAX_HEALTH,
      hunger: MS_CONFIG.MAX_HUNGER,
      saturation: 5.0,
      experience: 0,
      level: 0,
      armorPoints: 0,
      inventory: defaultInventory(),
      lastPositionBroadcast: 0,
      lastActivity: Date.now(),
      invulnerabilityTicks: 0,
      fireTicks: 0,
      airSupply: MS_CONFIG.MAX_AIR_SUPPLY,
    };
  }

  private toPublicPlayer(player: MSPlayerState): MSPlayer {
    return {
      id: player.id,
      name: player.name,
      color: player.color,
      ready: player.ready,
      connected: player.connected,
      gameMode: player.gameMode,
      ping: player.ping,
    };
  }

  private getPlacementPosition(x: number, y: number, z: number, face: BlockFace): { x: number; y: number; z: number } {
    switch (face) {
      case 'top':    return { x, y: y + 1, z };
      case 'bottom': return { x, y: y - 1, z };
      case 'north':  return { x, y, z: z - 1 };
      case 'south':  return { x, y, z: z + 1 };
      case 'east':   return { x: x + 1, y, z };
      case 'west':   return { x: x - 1, y, z };
      default:       return { x, y, z };
    }
  }

  private consumeHeldItem(player: MSPlayerState): void {
    const slot = player.inventory.selectedSlot;
    const item = player.inventory.hotbar[slot];
    if (!item) return;

    item.count--;
    if (item.count <= 0) {
      player.inventory.hotbar[slot] = null;
    }
  }

  private broadcastPlayerStates(room: MSRoom): void {
    for (const player of room.players) {
      if (!player.connected) continue;

      this.callbacks.onBroadcastToRoom(room.code, {
        type: 'ms_player_state',
        playerId: player.id,
        health: player.health,
        hunger: player.hunger,
        armor: player.armorPoints,
        gameMode: player.gameMode,
      } as unknown as ServerMessage);
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  private cleanupStaleRooms(): void {
    const now = Date.now();
    const staleTimeout = 1800000; // 30 minutes

    for (const [code, room] of this.rooms) {
      const connectedCount = room.players.filter(p => p.connected).length;
      if (connectedCount === 0 && now - room.lastActivity > staleTimeout) {
        this.stopGameLoop(code);
        for (const p of room.players) {
          this.playerToRoom.delete(p.id);
        }
        this.rooms.delete(code);
        console.log(`[MCS] Cleaned up stale room ${code}`);
      }
    }
  }

  destroy(): void {
    for (const [code] of this.rooms) {
      this.stopGameLoop(code);
    }
    clearInterval(this.cleanupInterval);
    this.rooms.clear();
    this.playerToRoom.clear();
  }
}
