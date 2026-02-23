// =============================================================
// Minecraft Board Game - Server-Side Game Manager
// Authoritative game state, tick loop, room management
// =============================================================

import type {
  WorldTile, BlockType, Direction, ItemType, MobType, DayPhase,
  MCPlayerState, MCMobState, MCRoomState, MCLobbyPlayer, MCPublicRoom,
  MCVisiblePlayer, MCTileUpdate, MCGameStateUpdate, MCServerMessage,
  InventoryItem,
  SideBoardSide, SideBoardState, CorruptionNode, RaidMob, AnomalyEvent,
  SideBoardVisibleState, AnomalyAlert,
} from '@/types/minecraft-board';
import {
  MC_BOARD_CONFIG, BLOCK_PROPERTIES, ITEM_PROPERTIES,
  TOOL_TIER_LEVEL, MOB_STATS, MOB_DROPS,
} from '@/types/minecraft-board';
import { WorldGenerator, SeededRandom } from './world';
import { getRecipeById, canCraft } from './recipes';

// === Internal Room State ===

interface MCRoom {
  code: string;
  name: string;
  hostId: string;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  players: Map<string, MCPlayerState>;
  world: WorldTile[][] | null;
  mobs: Map<string, MCMobState>;
  seed: number;
  tick: number;
  timeOfDay: number;
  dayPhase: DayPhase;
  mobIdCounter: number;
  createdAt: number;
  // Side boards & anomaly system
  sideBoards: { left: SideBoardState; right: SideBoardState };
  anomalies: Map<string, AnomalyEvent>;
  raidMobs: Map<string, RaidMob>;
  raidMobIdCounter: number;
  anomalyIdCounter: number;
}

interface ManagerCallbacks {
  onSendToPlayer: (playerId: string, message: MCServerMessage) => void;
  onBroadcastToRoom: (roomCode: string, message: MCServerMessage, excludePlayerId?: string) => void;
}

// === Room Code Generator ===

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// === Manager Class ===

export class MinecraftBoardManager {
  private rooms = new Map<string, MCRoom>();
  private playerRoomMap = new Map<string, string>(); // playerId -> roomCode
  private tickIntervals = new Map<string, NodeJS.Timeout>();
  private callbacks: ManagerCallbacks;

  constructor(callbacks: ManagerCallbacks) {
    this.callbacks = callbacks;
  }

  // === Room Management ===

  createRoom(playerId: string, playerName: string, roomName?: string): { roomCode: string; player: MCLobbyPlayer } {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const color = MC_BOARD_CONFIG.PLAYER_COLORS[0];
    const player = this.createPlayerState(playerId, playerName, color, 0, 0);

    const room: MCRoom = {
      code,
      name: roomName || `${playerName}'s World`,
      hostId: playerId,
      status: 'waiting',
      maxPlayers: MC_BOARD_CONFIG.MAX_PLAYERS,
      players: new Map([[playerId, player]]),
      world: null,
      mobs: new Map(),
      seed: 0,
      tick: 0,
      timeOfDay: 0,
      dayPhase: 'day',
      mobIdCounter: 0,
      createdAt: Date.now(),
      sideBoards: {
        left: { side: 'left', width: MC_BOARD_CONFIG.SIDE_BOARD_WIDTH, height: MC_BOARD_CONFIG.SIDE_BOARD_HEIGHT, corruption: [] },
        right: { side: 'right', width: MC_BOARD_CONFIG.SIDE_BOARD_WIDTH, height: MC_BOARD_CONFIG.SIDE_BOARD_HEIGHT, corruption: [] },
      },
      anomalies: new Map(),
      raidMobs: new Map(),
      raidMobIdCounter: 0,
      anomalyIdCounter: 0,
    };

    this.rooms.set(code, room);
    this.playerRoomMap.set(playerId, code);

    return {
      roomCode: code,
      player: this.toLobbyPlayer(player),
    };
  }

  joinRoom(roomCode: string, playerId: string, playerName: string): {
    success: boolean; error?: string; player?: MCLobbyPlayer;
  } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already in progress' };
    if (room.players.size >= room.maxPlayers) return { success: false, error: 'Room is full' };

    const colorIndex = room.players.size % MC_BOARD_CONFIG.PLAYER_COLORS.length;
    const color = MC_BOARD_CONFIG.PLAYER_COLORS[colorIndex];
    const player = this.createPlayerState(playerId, playerName, color, 0, 0);

    room.players.set(playerId, player);
    this.playerRoomMap.set(playerId, room.code);

    return { success: true, player: this.toLobbyPlayer(player) };
  }

  setPlayerReady(playerId: string, ready: boolean): { success: boolean; error?: string } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, error: 'Not in a room' };
    const player = room.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found' };
    player.ready = ready;
    return { success: true };
  }

  removePlayer(playerId: string): { roomCode?: string; room?: MCRoom } {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.playerRoomMap.delete(playerId);
      return {};
    }

    room.players.delete(playerId);
    this.playerRoomMap.delete(playerId);

    if (room.players.size === 0) {
      this.stopTickLoop(roomCode);
      this.rooms.delete(roomCode);
      return { roomCode };
    }

    // Transfer host if needed
    if (room.hostId === playerId) {
      const nextHost = room.players.keys().next().value;
      if (nextHost) room.hostId = nextHost;
    }

    return { roomCode, room };
  }

  markDisconnected(playerId: string): { roomCode?: string } {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) return {};
    const room = this.rooms.get(roomCode);
    if (!room) return {};
    const player = room.players.get(playerId);
    if (player) player.connected = false;
    return { roomCode };
  }

  transferPlayer(oldPlayerId: string, newPlayerId: string): void {
    const roomCode = this.playerRoomMap.get(oldPlayerId);
    if (!roomCode) return;
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const player = room.players.get(oldPlayerId);
    if (!player) return;

    player.id = newPlayerId;
    player.connected = true;
    room.players.delete(oldPlayerId);
    room.players.set(newPlayerId, player);
    this.playerRoomMap.delete(oldPlayerId);
    this.playerRoomMap.set(newPlayerId, roomCode);
    if (room.hostId === oldPlayerId) room.hostId = newPlayerId;
  }

  markReconnected(playerId: string): void {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) return;
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    if (player) player.connected = true;
  }

  // === Game Start ===

  startGame(playerId: string): { success: boolean; error?: string; gameSeed?: number } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, error: 'Not in a room' };
    if (room.hostId !== playerId) return { success: false, error: 'Only the host can start' };
    if (room.status !== 'waiting') return { success: false, error: 'Game not in waiting state' };

    const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected);
    if (connectedPlayers.length < MC_BOARD_CONFIG.MIN_PLAYERS) {
      return { success: false, error: 'Not enough players' };
    }

    const allReady = connectedPlayers.every(p => p.ready || p.id === playerId);
    if (!allReady) return { success: false, error: 'Not all players are ready' };

    const seed = Math.floor(Math.random() * 2147483647);
    room.seed = seed;
    room.status = 'countdown';

    return { success: true, gameSeed: seed };
  }

  beginPlaying(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.status = 'playing';
    room.tick = 0;
    room.timeOfDay = 0;
    room.dayPhase = 'day';

    // Generate world
    const gen = new WorldGenerator(room.seed);
    room.world = gen.generate();

    // Assign spawn positions
    const players = Array.from(room.players.values());
    const spawns = gen.getSpawnPositions(players.length);
    players.forEach((player, i) => {
      player.x = spawns[i].x;
      player.y = spawns[i].y;
      player.health = MC_BOARD_CONFIG.MAX_HEALTH;
      player.hunger = MC_BOARD_CONFIG.MAX_HUNGER;
      player.dead = false;
      player.mining = null;
      player.lastMoveTick = 0;
      player.lastAttackTick = 0;
      player.inventory = new Array(MC_BOARD_CONFIG.INVENTORY_SIZE).fill(null);
    });

    // Initialize side boards
    room.sideBoards = {
      left: { side: 'left', width: MC_BOARD_CONFIG.SIDE_BOARD_WIDTH, height: MC_BOARD_CONFIG.SIDE_BOARD_HEIGHT, corruption: [] },
      right: { side: 'right', width: MC_BOARD_CONFIG.SIDE_BOARD_WIDTH, height: MC_BOARD_CONFIG.SIDE_BOARD_HEIGHT, corruption: [] },
    };
    room.anomalies = new Map();
    room.raidMobs = new Map();
    room.raidMobIdCounter = 0;
    room.anomalyIdCounter = 0;

    // Spawn passive mobs
    this.spawnInitialMobs(room);

    // Send initial state to each player
    for (const player of room.players.values()) {
      this.sendStateUpdate(room, player.id);
    }

    // Start tick loop
    this.startTickLoop(roomCode);
  }

  // === Tick Loop ===

  private startTickLoop(roomCode: string): void {
    const interval = setInterval(() => {
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'playing') {
        this.stopTickLoop(roomCode);
        return;
      }
      this.tick(room);
    }, 1000 / MC_BOARD_CONFIG.TICK_RATE);
    this.tickIntervals.set(roomCode, interval);
  }

  private stopTickLoop(roomCode: string): void {
    const interval = this.tickIntervals.get(roomCode);
    if (interval) {
      clearInterval(interval);
      this.tickIntervals.delete(roomCode);
    }
  }

  private tick(room: MCRoom): void {
    room.tick++;

    // Day/night cycle
    this.updateDayNight(room);

    // Process mining
    this.processMining(room);

    // Mob AI
    if (room.tick % MC_BOARD_CONFIG.MOB_MOVE_INTERVAL === 0) {
      this.updateMobs(room);
    }

    // Mob spawning at night
    if (room.dayPhase === 'night' && room.tick % MC_BOARD_CONFIG.MOB_SPAWN_INTERVAL === 0) {
      this.spawnHostileMobs(room);
    }

    // Hunger drain
    if (room.tick % MC_BOARD_CONFIG.HUNGER_TICK_INTERVAL === 0) {
      this.applyHunger(room);
    }

    // Hunger damage
    if (room.tick % MC_BOARD_CONFIG.HUNGER_DAMAGE_INTERVAL === 0) {
      this.applyHungerDamage(room);
    }

    // Respawn dead players
    this.processRespawns(room);

    // Corruption seeding
    if (room.tick % MC_BOARD_CONFIG.CORRUPTION_SEED_INTERVAL === 0 && room.tick > 0) {
      this.seedCorruption(room);
    }

    // Corruption growth
    if (room.tick % MC_BOARD_CONFIG.CORRUPTION_GROWTH_INTERVAL === 0 && room.tick > 0) {
      this.growCorruption(room);
    }

    // Process active anomalies (wave spawning)
    this.processAnomalies(room);

    // Raid mob AI
    if (room.tick % 5 === 0) {
      this.updateRaidMobs(room);
    }

    // Broadcast state updates
    if (room.tick % MC_BOARD_CONFIG.STATE_UPDATE_INTERVAL === 0) {
      for (const player of room.players.values()) {
        if (player.connected) {
          this.sendStateUpdate(room, player.id);
        }
      }
    }
  }

  // === Day/Night Cycle ===

  private updateDayNight(room: MCRoom): void {
    room.timeOfDay++;
    const totalCycle = MC_BOARD_CONFIG.DAY_TICKS + MC_BOARD_CONFIG.DUSK_TICKS +
      MC_BOARD_CONFIG.NIGHT_TICKS + MC_BOARD_CONFIG.DAWN_TICKS;
    const cyclePos = room.timeOfDay % totalCycle;

    let newPhase: DayPhase;
    if (cyclePos < MC_BOARD_CONFIG.DAY_TICKS) {
      newPhase = 'day';
    } else if (cyclePos < MC_BOARD_CONFIG.DAY_TICKS + MC_BOARD_CONFIG.DUSK_TICKS) {
      newPhase = 'dusk';
    } else if (cyclePos < MC_BOARD_CONFIG.DAY_TICKS + MC_BOARD_CONFIG.DUSK_TICKS + MC_BOARD_CONFIG.NIGHT_TICKS) {
      newPhase = 'night';
    } else {
      newPhase = 'dawn';
    }

    if (newPhase !== room.dayPhase) {
      room.dayPhase = newPhase;
      this.broadcastToRoom(room.code, {
        type: 'mc_day_phase',
        phase: newPhase,
        timeOfDay: room.timeOfDay,
      });

      // Despawn hostile mobs at dawn
      if (newPhase === 'dawn') {
        for (const [mobId, mob] of room.mobs) {
          if (mob.hostile) {
            room.mobs.delete(mobId);
          }
        }
      }
    }
  }

  // === Player Actions ===

  handleMove(playerId: string, direction: Direction): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing' || !room.world) return;

    const player = room.players.get(playerId);
    if (!player || player.dead) return;

    // Cooldown check
    if (room.tick - player.lastMoveTick < MC_BOARD_CONFIG.MOVE_COOLDOWN_TICKS) return;

    // Cancel mining on move
    if (player.mining) {
      player.mining = null;
      this.broadcastToRoom(room.code, { type: 'mc_mining_cancelled', playerId });
    }

    const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
    const nx = player.x + dx;
    const ny = player.y + dy;

    // Bounds check
    if (nx < 0 || nx >= MC_BOARD_CONFIG.WORLD_SIZE || ny < 0 || ny >= MC_BOARD_CONFIG.WORLD_SIZE) return;

    // Walkability check
    const tile = room.world[ny][nx];
    const blockProps = BLOCK_PROPERTIES[tile.block];
    if (!blockProps.walkable && blockProps.solid) return;

    // Player collision check
    for (const other of room.players.values()) {
      if (other.id !== playerId && !other.dead && other.x === nx && other.y === ny) return;
    }

    player.x = nx;
    player.y = ny;
    player.lastMoveTick = room.tick;

    this.broadcastToRoom(room.code, {
      type: 'mc_player_moved',
      playerId,
      x: nx,
      y: ny,
    });
  }

  handleMine(playerId: string, tx: number, ty: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing' || !room.world) return;

    const player = room.players.get(playerId);
    if (!player || player.dead) return;

    // Range check (must be adjacent or on same tile)
    const dist = Math.abs(player.x - tx) + Math.abs(player.y - ty);
    if (dist > 1) return;

    // Bounds check
    if (tx < 0 || tx >= MC_BOARD_CONFIG.WORLD_SIZE || ty < 0 || ty >= MC_BOARD_CONFIG.WORLD_SIZE) return;

    const tile = room.world[ty][tx];
    const blockProps = BLOCK_PROPERTIES[tile.block];
    if (!blockProps.mineable) return;

    // Tool tier check
    const equippedItem = player.inventory[player.selectedSlot];
    const toolTier: string = equippedItem ? (ITEM_PROPERTIES[equippedItem.type].tier || 'hand') : 'hand';
    if (TOOL_TIER_LEVEL[toolTier as keyof typeof TOOL_TIER_LEVEL] < TOOL_TIER_LEVEL[blockProps.requiredTier]) {
      this.sendToPlayer(playerId, { type: 'mc_error', message: 'Better tool required!' });
      return;
    }

    // Calculate mining time
    let miningTicks = blockProps.hardness;
    if (equippedItem) {
      const itemProps = ITEM_PROPERTIES[equippedItem.type];
      if (itemProps.toolType === blockProps.preferredTool) {
        miningTicks = Math.ceil(miningTicks / itemProps.miningSpeed);
      } else if (itemProps.miningSpeed > 1) {
        miningTicks = Math.ceil(miningTicks / (itemProps.miningSpeed * 0.5));
      }
    }

    // Instant mine for 0-hardness blocks
    if (miningTicks <= 0) {
      this.completeMining(room, player, tx, ty);
      return;
    }

    player.mining = { x: tx, y: ty, progress: 0, total: miningTicks };
    this.broadcastToRoom(room.code, {
      type: 'mc_mining_started',
      playerId,
      x: tx,
      y: ty,
      totalTicks: miningTicks,
    });
  }

  handleCancelMine(playerId: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;
    if (player.mining) {
      player.mining = null;
      this.broadcastToRoom(room.code, { type: 'mc_mining_cancelled', playerId });
    }
  }

  handleCraft(playerId: string, recipeId: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing' || !room.world) return;

    const player = room.players.get(playerId);
    if (!player || player.dead) return;

    const recipe = getRecipeById(recipeId);
    if (!recipe) return;

    // Check proximity to crafting table / furnace
    const nearCraftingTable = this.isNearBlock(room.world, player.x, player.y, 'crafting_table');
    const nearFurnace = this.isNearBlock(room.world, player.x, player.y, 'furnace');

    if (!canCraft(recipe, player.inventory, nearCraftingTable, nearFurnace)) {
      this.sendToPlayer(playerId, { type: 'mc_error', message: 'Cannot craft: missing materials or station' });
      return;
    }

    // Consume inputs
    for (const input of recipe.inputs) {
      this.removeFromInventory(player, input.item, input.quantity);
    }

    // Add output
    this.addToInventory(player, recipe.output.item, recipe.output.quantity);

    this.broadcastToRoom(room.code, {
      type: 'mc_crafted',
      playerId,
      recipeId,
      item: recipe.output.item,
    });

    // Check win condition
    if (recipe.output.item === 'ender_portal_frame') {
      this.endGame(room, playerId);
    }
  }

  handleAttack(playerId: string, targetId: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;

    const player = room.players.get(playerId);
    if (!player || player.dead) return;

    // Attack cooldown
    if (room.tick - player.lastAttackTick < MC_BOARD_CONFIG.ATTACK_COOLDOWN_TICKS) return;
    player.lastAttackTick = room.tick;

    // Calculate damage
    const equippedItem = player.inventory[player.selectedSlot];
    let damage = 1; // fist
    if (equippedItem) {
      damage = ITEM_PROPERTIES[equippedItem.type].damage;
    }

    // Check if attacking a mob
    const mob = room.mobs.get(targetId);
    if (mob) {
      const dist = Math.abs(player.x - mob.x) + Math.abs(player.y - mob.y);
      if (dist > 1) return;

      mob.health -= damage;
      this.broadcastToRoom(room.code, {
        type: 'mc_damage',
        targetId,
        damage,
        sourceId: playerId,
        targetHp: Math.max(0, mob.health),
      });

      if (mob.health <= 0) {
        this.killMob(room, targetId, player);
      } else {
        // Aggro the mob
        mob.targetPlayerId = playerId;
      }
      return;
    }

    // Check if attacking a raid mob on the main board
    const raidMob = room.raidMobs.get(targetId);
    if (raidMob && raidMob.boardSide === 'main') {
      const dist = Math.abs(player.x - raidMob.x) + Math.abs(player.y - raidMob.y);
      if (dist > 1) return;

      raidMob.health -= damage;
      this.broadcastToRoom(room.code, {
        type: 'mc_damage',
        targetId,
        damage,
        sourceId: playerId,
        targetHp: Math.max(0, raidMob.health),
      });

      if (raidMob.health <= 0) {
        this.killRaidMob(room, targetId, player);
      }
      return;
    }

    // Check if attacking another player
    const target = room.players.get(targetId);
    if (target && !target.dead) {
      const dist = Math.abs(player.x - target.x) + Math.abs(player.y - target.y);
      if (dist > 1) return;

      // Apply armor reduction
      let actualDamage = damage;
      if (target.armor) {
        const armorDef = ITEM_PROPERTIES[target.armor].defense;
        actualDamage = Math.max(1, damage - Math.floor(armorDef / 2));
      }

      target.health -= actualDamage;
      this.broadcastToRoom(room.code, {
        type: 'mc_damage',
        targetId,
        damage: actualDamage,
        sourceId: playerId,
        targetHp: Math.max(0, target.health),
      });

      if (target.health <= 0) {
        this.killPlayer(room, target, playerId);
      }
    }
  }

  handlePlaceBlock(playerId: string, tx: number, ty: number, itemIndex: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing' || !room.world) return;

    const player = room.players.get(playerId);
    if (!player || player.dead) return;

    // Range check
    const dist = Math.abs(player.x - tx) + Math.abs(player.y - ty);
    if (dist > 1 || dist === 0) return; // Can't place on self

    // Bounds check
    if (tx < 0 || tx >= MC_BOARD_CONFIG.WORLD_SIZE || ty < 0 || ty >= MC_BOARD_CONFIG.WORLD_SIZE) return;

    // Check target tile is air/walkable
    const targetTile = room.world[ty][tx];
    if (targetTile.block !== 'air' && targetTile.block !== 'grass' && targetTile.block !== 'tall_grass' &&
        targetTile.block !== 'flower_red' && targetTile.block !== 'flower_yellow' &&
        targetTile.block !== 'mushroom_red' && targetTile.block !== 'mushroom_brown') {
      return;
    }

    // Check no player is standing there
    for (const other of room.players.values()) {
      if (!other.dead && other.x === tx && other.y === ty) return;
    }

    // Check inventory item
    if (itemIndex < 0 || itemIndex >= MC_BOARD_CONFIG.INVENTORY_SIZE) return;
    const item = player.inventory[itemIndex];
    if (!item) return;

    const itemProps = ITEM_PROPERTIES[item.type];
    if (!itemProps.placeable || !itemProps.placeBlock) return;

    const blockType = itemProps.placeBlock;

    // Consume item
    item.quantity--;
    if (item.quantity <= 0) player.inventory[itemIndex] = null;

    // Place block
    room.world[ty][tx] = { ...targetTile, block: blockType };

    this.broadcastToRoom(room.code, {
      type: 'mc_block_placed',
      x: tx,
      y: ty,
      block: blockType,
      playerId,
    });
  }

  handleEat(playerId: string, itemIndex: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing') return;

    const player = room.players.get(playerId);
    if (!player || player.dead) return;

    if (itemIndex < 0 || itemIndex >= MC_BOARD_CONFIG.INVENTORY_SIZE) return;
    const item = player.inventory[itemIndex];
    if (!item) return;

    const itemProps = ITEM_PROPERTIES[item.type];
    if (!itemProps.edible) return;

    // Consume item
    item.quantity--;
    if (item.quantity <= 0) player.inventory[itemIndex] = null;

    // Restore hunger
    if (itemProps.hungerRestore) {
      player.hunger = Math.min(MC_BOARD_CONFIG.MAX_HUNGER, player.hunger + itemProps.hungerRestore);
    }
    if (itemProps.healthRestore) {
      player.health = Math.min(MC_BOARD_CONFIG.MAX_HEALTH, player.health + itemProps.healthRestore);
    }
  }

  handleSelectSlot(playerId: string, slot: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;
    if (slot >= 0 && slot < MC_BOARD_CONFIG.HOTBAR_SIZE) {
      player.selectedSlot = slot;
    }
  }

  handleChat(playerId: string, message: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;

    const sanitized = message.slice(0, 100).trim();
    if (!sanitized) return;

    this.broadcastToRoom(room.code, {
      type: 'mc_chat_message',
      playerId,
      playerName: player.name,
      message: sanitized,
    });
  }

  // === Mining Processing ===

  private processMining(room: MCRoom): void {
    if (!room.world) return;

    for (const player of room.players.values()) {
      if (!player.mining || player.dead) continue;

      player.mining.progress++;
      if (player.mining.progress >= player.mining.total) {
        const { x, y } = player.mining;
        player.mining = null;
        this.completeMining(room, player, x, y);
      }
    }
  }

  private completeMining(room: MCRoom, player: MCPlayerState, tx: number, ty: number): void {
    if (!room.world) return;

    const tile = room.world[ty][tx];
    const blockProps = BLOCK_PROPERTIES[tile.block];

    // Generate drops
    const rng = new SeededRandom(room.tick + tx * 1000 + ty);
    for (const drop of blockProps.drops) {
      if (rng.chance(drop.chance)) {
        this.addToInventory(player, drop.item, drop.quantity);
        this.sendToPlayer(player.id, {
          type: 'mc_item_gained',
          playerId: player.id,
          item: drop.item,
          quantity: drop.quantity,
        });
      }
    }

    // Replace block
    const newBlock: BlockType = tile.biome === 'desert' ? 'sand' :
      tile.biome === 'snowy' ? 'snow_block' : 'grass';
    room.world[ty][tx] = { ...tile, block: newBlock };

    player.blocksMined++;

    this.broadcastToRoom(room.code, {
      type: 'mc_tile_mined',
      x: tx,
      y: ty,
      newBlock,
      playerId: player.id,
    });
  }

  // === Mob System ===

  private spawnInitialMobs(room: MCRoom): void {
    if (!room.world) return;
    const rng = new SeededRandom(room.seed + 9000);
    const passiveTypes: MobType[] = ['cow', 'pig', 'chicken'];

    for (let i = 0; i < 12; i++) {
      const type = passiveTypes[rng.nextInt(0, passiveTypes.length - 1)];
      const x = rng.nextInt(2, MC_BOARD_CONFIG.WORLD_SIZE - 3);
      const y = rng.nextInt(2, MC_BOARD_CONFIG.WORLD_SIZE - 3);

      const tile = room.world[y][x];
      if (!BLOCK_PROPERTIES[tile.block].walkable) continue;
      if (tile.block === 'water' || tile.block === 'deep_water') continue;

      this.spawnMob(room, type, x, y);
    }
  }

  private spawnHostileMobs(room: MCRoom): void {
    if (!room.world) return;
    if (room.mobs.size >= MC_BOARD_CONFIG.MAX_MOBS) return;

    const rng = new SeededRandom(room.tick);
    const hostileTypes: MobType[] = ['zombie', 'skeleton', 'spider', 'creeper'];
    const players = Array.from(room.players.values()).filter(p => !p.dead);
    if (players.length === 0) return;

    // Spawn near a random player
    const target = players[rng.nextInt(0, players.length - 1)];
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextInt(6, 10);
    const x = Math.round(target.x + Math.cos(angle) * dist);
    const y = Math.round(target.y + Math.sin(angle) * dist);

    if (x < 1 || x >= MC_BOARD_CONFIG.WORLD_SIZE - 1 || y < 1 || y >= MC_BOARD_CONFIG.WORLD_SIZE - 1) return;

    const tile = room.world[y][x];
    if (!BLOCK_PROPERTIES[tile.block].walkable) return;

    const type = hostileTypes[rng.nextInt(0, hostileTypes.length - 1)];
    const mob = this.spawnMob(room, type, x, y);
    if (mob) {
      this.broadcastToRoom(room.code, { type: 'mc_mob_spawned', mob });
    }
  }

  private spawnMob(room: MCRoom, type: MobType, x: number, y: number): MCMobState | null {
    const stats = MOB_STATS[type];
    const id = `mob_${room.mobIdCounter++}`;
    const mob: MCMobState = {
      id,
      type,
      x,
      y,
      health: stats.health,
      maxHealth: stats.health,
      targetPlayerId: null,
      lastMoveTick: room.tick,
      hostile: stats.hostile,
    };
    room.mobs.set(id, mob);
    return mob;
  }

  private updateMobs(room: MCRoom): void {
    if (!room.world) return;

    for (const mob of room.mobs.values()) {
      if (room.tick - mob.lastMoveTick < MOB_STATS[mob.type].speed) continue;
      mob.lastMoveTick = room.tick;

      if (mob.hostile) {
        this.updateHostileMob(room, mob);
      } else {
        this.updatePassiveMob(room, mob);
      }
    }
  }

  private updateHostileMob(room: MCRoom, mob: MCMobState): void {
    if (!room.world) return;

    // Find nearest player
    let nearestPlayer: MCPlayerState | null = null;
    let nearestDist = Infinity;
    for (const player of room.players.values()) {
      if (player.dead || !player.connected) continue;
      const dist = Math.abs(player.x - mob.x) + Math.abs(player.y - mob.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }

    if (!nearestPlayer || nearestDist > 12) return;

    // Attack if adjacent
    if (nearestDist <= 1) {
      const damage = MOB_STATS[mob.type].damage;
      let actualDamage = damage;
      if (nearestPlayer.armor) {
        const armorDef = ITEM_PROPERTIES[nearestPlayer.armor].defense;
        actualDamage = Math.max(1, damage - Math.floor(armorDef / 2));
      }
      nearestPlayer.health -= actualDamage;
      this.broadcastToRoom(room.code, {
        type: 'mc_damage',
        targetId: nearestPlayer.id,
        damage: actualDamage,
        sourceId: mob.id,
        targetHp: Math.max(0, nearestPlayer.health),
      });
      if (nearestPlayer.health <= 0) {
        this.killPlayer(room, nearestPlayer, mob.id);
      }
      return;
    }

    // Move toward player
    this.moveMobToward(room, mob, nearestPlayer.x, nearestPlayer.y);
  }

  private updatePassiveMob(room: MCRoom, mob: MCMobState): void {
    if (!room.world) return;
    const rng = new SeededRandom(room.tick + mob.x * 100 + mob.y);
    if (!rng.chance(0.3)) return; // Only move sometimes

    const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const [dx, dy] = dirs[rng.nextInt(0, 3)];
    const nx = mob.x + dx;
    const ny = mob.y + dy;

    if (nx < 1 || nx >= MC_BOARD_CONFIG.WORLD_SIZE - 1 || ny < 1 || ny >= MC_BOARD_CONFIG.WORLD_SIZE - 1) return;
    if (!BLOCK_PROPERTIES[room.world[ny][nx].block].walkable) return;

    mob.x = nx;
    mob.y = ny;
  }

  private moveMobToward(room: MCRoom, mob: MCMobState, targetX: number, targetY: number): void {
    if (!room.world) return;

    const dx = Math.sign(targetX - mob.x);
    const dy = Math.sign(targetY - mob.y);

    // Try primary direction
    const options: [number, number][] = [];
    if (dx !== 0) options.push([dx, 0]);
    if (dy !== 0) options.push([0, dy]);

    for (const [mx, my] of options) {
      const nx = mob.x + mx;
      const ny = mob.y + my;
      if (nx < 1 || nx >= MC_BOARD_CONFIG.WORLD_SIZE - 1 || ny < 1 || ny >= MC_BOARD_CONFIG.WORLD_SIZE - 1) continue;
      if (!BLOCK_PROPERTIES[room.world[ny][nx].block].walkable) continue;

      mob.x = nx;
      mob.y = ny;
      return;
    }
  }

  private killMob(room: MCRoom, mobId: string, killer: MCPlayerState): void {
    const mob = room.mobs.get(mobId);
    if (!mob) return;

    // Generate drops
    const drops = MOB_DROPS[mob.type];
    const rng = new SeededRandom(room.tick + mob.x);
    for (const drop of drops) {
      if (rng.chance(drop.chance)) {
        this.addToInventory(killer, drop.item, drop.quantity);
        this.sendToPlayer(killer.id, {
          type: 'mc_item_gained',
          playerId: killer.id,
          item: drop.item,
          quantity: drop.quantity,
        });
      }
    }

    killer.kills++;
    killer.experience += mob.hostile ? 5 : 1;
    room.mobs.delete(mobId);

    this.broadcastToRoom(room.code, {
      type: 'mc_mob_died',
      mobId,
      killerName: killer.name,
    });
  }

  // === Corruption & Anomaly System ===

  private seedCorruption(room: MCRoom): void {
    const rng = new SeededRandom(room.tick + 7777);

    for (const side of ['left', 'right'] as SideBoardSide[]) {
      const board = room.sideBoards[side];
      if (board.corruption.length >= MC_BOARD_CONFIG.MAX_CORRUPTION_NODES_PER_BOARD) continue;

      const x = rng.nextInt(0, board.width - 1);
      const y = rng.nextInt(0, board.height - 1);

      // Don't place on existing corruption
      const exists = board.corruption.some(c => c.x === x && c.y === y);
      if (exists) continue;

      const node: CorruptionNode = {
        x, y,
        level: 0,
        maxLevel: MC_BOARD_CONFIG.CORRUPTION_MAX_LEVEL,
        spawnTick: room.tick,
        lastGrowTick: room.tick,
      };
      board.corruption.push(node);

      this.broadcastToRoom(room.code, {
        type: 'mc_corruption_spread',
        side,
        node,
      });
    }
  }

  private growCorruption(room: MCRoom): void {
    const rng = new SeededRandom(room.tick + 8888);

    for (const side of ['left', 'right'] as SideBoardSide[]) {
      const board = room.sideBoards[side];
      const maturedNodes: CorruptionNode[] = [];

      for (const node of board.corruption) {
        if (node.level >= node.maxLevel) continue;

        node.level++;
        node.lastGrowTick = room.tick;

        // Spread: chance to create adjacent corruption
        if (rng.chance(MC_BOARD_CONFIG.CORRUPTION_SPREAD_CHANCE) &&
            board.corruption.length < MC_BOARD_CONFIG.MAX_CORRUPTION_NODES_PER_BOARD) {
          const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
          const [dx, dy] = dirs[rng.nextInt(0, 3)];
          const nx = node.x + dx;
          const ny = node.y + dy;
          if (nx >= 0 && nx < board.width && ny >= 0 && ny < board.height) {
            const exists = board.corruption.some(c => c.x === nx && c.y === ny);
            if (!exists) {
              board.corruption.push({
                x: nx, y: ny,
                level: 0,
                maxLevel: MC_BOARD_CONFIG.CORRUPTION_MAX_LEVEL,
                spawnTick: room.tick,
                lastGrowTick: room.tick,
              });
            }
          }
        }

        // Check if matured
        if (node.level >= node.maxLevel) {
          maturedNodes.push(node);
        }
      }

      // Trigger anomaly for matured nodes
      for (const matured of maturedNodes) {
        this.triggerAnomaly(room, side);
        // Remove the matured corruption node (it has "burst")
        board.corruption = board.corruption.filter(c => c !== matured);
      }
    }
  }

  private triggerAnomaly(room: MCRoom, side: SideBoardSide): void {
    const anomalyId = `anomaly_${room.anomalyIdCounter++}`;

    const anomaly: AnomalyEvent = {
      id: anomalyId,
      side,
      triggerTick: room.tick,
      raidMobs: [],
      waveCount: 0,
      maxWaves: MC_BOARD_CONFIG.RAID_MAX_WAVES,
      nextWaveTick: room.tick,  // First wave spawns immediately
      active: true,
    };

    room.anomalies.set(anomalyId, anomaly);

    this.broadcastToRoom(room.code, {
      type: 'mc_anomaly_start',
      side,
      message: `Anomaly detected on the ${side}! A raid is incoming!`,
    });
  }

  private processAnomalies(room: MCRoom): void {
    for (const [anomalyId, anomaly] of room.anomalies) {
      if (!anomaly.active) continue;

      if (room.tick >= anomaly.nextWaveTick && anomaly.waveCount < anomaly.maxWaves) {
        this.spawnRaidWave(room, anomaly);
        anomaly.waveCount++;
        anomaly.nextWaveTick = room.tick + MC_BOARD_CONFIG.RAID_WAVE_INTERVAL;
      }

      // Check if anomaly is finished (all waves spawned and all raid mobs dead)
      if (anomaly.waveCount >= anomaly.maxWaves) {
        const aliveRaidMobs = anomaly.raidMobs.filter(id => room.raidMobs.has(id));
        if (aliveRaidMobs.length === 0) {
          anomaly.active = false;
          this.broadcastToRoom(room.code, {
            type: 'mc_anomaly_end',
            side: anomaly.side,
          });
          room.anomalies.delete(anomalyId);
        }
      }
    }
  }

  private spawnRaidWave(room: MCRoom, anomaly: AnomalyEvent): void {
    if (room.raidMobs.size >= MC_BOARD_CONFIG.MAX_RAID_MOBS) return;

    const rng = new SeededRandom(room.tick + anomaly.waveCount * 1000);
    const hostileTypes: MobType[] = ['zombie', 'skeleton', 'spider', 'creeper'];
    const board = room.sideBoards[anomaly.side];

    // Spawn at the outer edge of the side board
    const spawnEdgeX = anomaly.side === 'left' ? 0 : board.width - 1;
    const centerY = Math.floor(MC_BOARD_CONFIG.WORLD_SIZE / 2);

    for (let i = 0; i < MC_BOARD_CONFIG.RAID_WAVE_SIZE; i++) {
      if (room.raidMobs.size >= MC_BOARD_CONFIG.MAX_RAID_MOBS) break;

      const id = `raid_${room.raidMobIdCounter++}`;
      const type = hostileTypes[rng.nextInt(0, hostileTypes.length - 1)];
      const spawnY = rng.nextInt(
        Math.max(0, centerY - 8),
        Math.min(MC_BOARD_CONFIG.WORLD_SIZE - 1, centerY + 8)
      );

      // Target: the connection point where the side board meets the main board
      const targetX = anomaly.side === 'left' ? 0 : MC_BOARD_CONFIG.WORLD_SIZE - 1;

      const raidMob: RaidMob = {
        id,
        type,
        x: spawnEdgeX,
        y: spawnY,
        health: MC_BOARD_CONFIG.RAID_MOB_HEALTH,
        maxHealth: MC_BOARD_CONFIG.RAID_MOB_HEALTH,
        boardSide: anomaly.side,
        originSide: anomaly.side,
        targetX,
        targetY: spawnY,
        speed: MC_BOARD_CONFIG.RAID_MOB_SPEED,
        damage: MC_BOARD_CONFIG.RAID_MOB_DAMAGE,
        lastMoveTick: room.tick,
      };

      room.raidMobs.set(id, raidMob);
      anomaly.raidMobs.push(id);
    }
  }

  private updateRaidMobs(room: MCRoom): void {
    if (!room.world) return;

    for (const raidMob of room.raidMobs.values()) {
      if (room.tick - raidMob.lastMoveTick < raidMob.speed) continue;
      raidMob.lastMoveTick = room.tick;

      if (raidMob.boardSide !== 'main') {
        this.moveRaidMobOnSideBoard(room, raidMob);
      } else {
        this.moveRaidMobOnMainBoard(room, raidMob);
      }
    }
  }

  private moveRaidMobOnSideBoard(room: MCRoom, mob: RaidMob): void {
    const board = room.sideBoards[mob.boardSide as SideBoardSide];
    const originSide = mob.originSide;

    // Move toward the main board edge
    const connectionEdgeX = originSide === 'left' ? board.width - 1 : 0;
    const dx = Math.sign(connectionEdgeX - mob.x);

    if (dx !== 0) {
      mob.x += dx;
    }

    // Check if mob has reached the connection edge
    const reachedEdge = (originSide === 'left' && mob.x >= board.width - 1) ||
                         (originSide === 'right' && mob.x <= 0);

    if (reachedEdge) {
      // Transition to main board
      mob.boardSide = 'main';
      mob.x = originSide === 'left' ? 1 : MC_BOARD_CONFIG.WORLD_SIZE - 2;

      // Find a walkable tile near the entry point
      if (room.world) {
        let placed = false;
        for (let dy = 0; dy <= 3; dy++) {
          for (const offset of dy === 0 ? [0] : [-dy, dy]) {
            const ny = mob.y + offset;
            if (ny >= 0 && ny < MC_BOARD_CONFIG.WORLD_SIZE) {
              const tile = room.world[ny]?.[mob.x];
              if (tile && BLOCK_PROPERTIES[tile.block].walkable) {
                mob.y = ny;
                placed = true;
                break;
              }
            }
          }
          if (placed) break;
        }
        // If no walkable tile found, despawn
        if (!placed) {
          room.raidMobs.delete(mob.id);
          return;
        }
      }

      this.broadcastToRoom(room.code, {
        type: 'mc_raid_mob_entered_main',
        mobId: mob.id,
        x: mob.x,
        y: mob.y,
      });
    }
  }

  private moveRaidMobOnMainBoard(room: MCRoom, mob: RaidMob): void {
    if (!room.world) return;

    // Find nearest player
    let nearestPlayer: MCPlayerState | null = null;
    let nearestDist = Infinity;
    for (const player of room.players.values()) {
      if (player.dead || !player.connected) continue;
      const dist = Math.abs(player.x - mob.x) + Math.abs(player.y - mob.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }

    if (!nearestPlayer) return;

    // Attack if adjacent
    if (nearestDist <= 1) {
      let actualDamage = mob.damage;
      if (nearestPlayer.armor) {
        const armorDef = ITEM_PROPERTIES[nearestPlayer.armor].defense;
        actualDamage = Math.max(1, mob.damage - Math.floor(armorDef / 2));
      }
      nearestPlayer.health -= actualDamage;
      this.broadcastToRoom(room.code, {
        type: 'mc_damage',
        targetId: nearestPlayer.id,
        damage: actualDamage,
        sourceId: mob.id,
        targetHp: Math.max(0, nearestPlayer.health),
      });
      if (nearestPlayer.health <= 0) {
        this.killPlayer(room, nearestPlayer, mob.id);
      }
      return;
    }

    // Chase player (extended detection range for raid mobs)
    if (nearestDist <= 20) {
      // Use a RaidMob-compatible move: reuse moveMobToward logic inline
      const dx = Math.sign(nearestPlayer.x - mob.x);
      const dy = Math.sign(nearestPlayer.y - mob.y);

      const options: [number, number][] = [];
      if (dx !== 0) options.push([dx, 0]);
      if (dy !== 0) options.push([0, dy]);

      for (const [mx, my] of options) {
        const nx = mob.x + mx;
        const ny = mob.y + my;
        if (nx < 1 || nx >= MC_BOARD_CONFIG.WORLD_SIZE - 1 || ny < 1 || ny >= MC_BOARD_CONFIG.WORLD_SIZE - 1) continue;
        if (!BLOCK_PROPERTIES[room.world[ny][nx].block].walkable) continue;

        mob.x = nx;
        mob.y = ny;
        return;
      }
    }
  }

  private killRaidMob(room: MCRoom, mobId: string, killer: MCPlayerState): void {
    const mob = room.raidMobs.get(mobId);
    if (!mob) return;

    // Enhanced loot drops from raid mobs
    const rng = new SeededRandom(room.tick + mob.x);
    if (rng.chance(0.5)) {
      this.addToInventory(killer, 'iron_ingot', 1);
      this.sendToPlayer(killer.id, { type: 'mc_item_gained', playerId: killer.id, item: 'iron_ingot', quantity: 1 });
    }
    if (rng.chance(0.2)) {
      this.addToInventory(killer, 'diamond', 1);
      this.sendToPlayer(killer.id, { type: 'mc_item_gained', playerId: killer.id, item: 'diamond', quantity: 1 });
    }
    if (rng.chance(0.3)) {
      this.addToInventory(killer, 'ender_pearl', 1);
      this.sendToPlayer(killer.id, { type: 'mc_item_gained', playerId: killer.id, item: 'ender_pearl', quantity: 1 });
    }

    killer.kills++;
    killer.experience += 10;
    room.raidMobs.delete(mobId);

    this.broadcastToRoom(room.code, {
      type: 'mc_mob_died',
      mobId,
      killerName: killer.name,
    });
  }

  // === Player Death & Respawn ===

  private killPlayer(room: MCRoom, player: MCPlayerState, killerId: string): void {
    player.dead = true;
    player.health = 0;
    player.mining = null;
    player.respawnTick = room.tick + MC_BOARD_CONFIG.RESPAWN_TICKS;

    // Drop half inventory
    const rng = new SeededRandom(room.tick);
    for (let i = 0; i < player.inventory.length; i++) {
      if (player.inventory[i] && rng.chance(0.5)) {
        player.inventory[i] = null;
      }
    }

    this.broadcastToRoom(room.code, {
      type: 'mc_player_died',
      playerId: player.id,
      killerId: killerId || undefined,
    });
  }

  private processRespawns(room: MCRoom): void {
    const gen = new WorldGenerator(room.seed);
    const spawns = gen.getSpawnPositions(room.players.size);

    let idx = 0;
    for (const player of room.players.values()) {
      if (player.dead && room.tick >= player.respawnTick) {
        player.dead = false;
        player.health = MC_BOARD_CONFIG.MAX_HEALTH;
        player.hunger = Math.max(10, player.hunger);
        const spawn = spawns[idx % spawns.length];
        player.x = spawn.x;
        player.y = spawn.y;

        this.broadcastToRoom(room.code, {
          type: 'mc_player_respawned',
          playerId: player.id,
          x: player.x,
          y: player.y,
        });
      }
      idx++;
    }
  }

  // === Hunger System ===

  private applyHunger(room: MCRoom): void {
    for (const player of room.players.values()) {
      if (player.dead || !player.connected) continue;
      if (player.hunger > 0) {
        player.hunger = Math.max(0, player.hunger - 1);
      }
    }
  }

  private applyHungerDamage(room: MCRoom): void {
    for (const player of room.players.values()) {
      if (player.dead || !player.connected) continue;
      if (player.hunger <= 0) {
        player.health -= 1;
        if (player.health <= 0) {
          this.killPlayer(room, player, 'starvation');
        }
      }
    }
  }

  // === Win Condition ===

  private endGame(room: MCRoom, winnerId: string): void {
    const winner = room.players.get(winnerId);
    if (!winner) return;

    room.status = 'finished';
    this.stopTickLoop(room.code);

    this.broadcastToRoom(room.code, {
      type: 'mc_game_over',
      winnerId,
      winnerName: winner.name,
    });
  }

  // === State Updates ===

  private sendStateUpdate(room: MCRoom, playerId: string): void {
    if (!room.world) return;
    const player = room.players.get(playerId);
    if (!player) return;

    const vr = MC_BOARD_CONFIG.VISION_RADIUS;
    const visibleTiles: MCTileUpdate[] = [];

    // Collect visible tiles
    for (let dy = -vr; dy <= vr; dy++) {
      for (let dx = -vr; dx <= vr; dx++) {
        const x = player.x + dx;
        const y = player.y + dy;
        if (x < 0 || x >= MC_BOARD_CONFIG.WORLD_SIZE || y < 0 || y >= MC_BOARD_CONFIG.WORLD_SIZE) continue;
        if (Math.abs(dx) + Math.abs(dy) > vr + 2) continue; // Diamond-shaped vision
        visibleTiles.push({ x, y, tile: room.world[y][x] });
      }
    }

    // Visible players
    const visiblePlayers: MCVisiblePlayer[] = [];
    for (const other of room.players.values()) {
      const dist = Math.abs(other.x - player.x) + Math.abs(other.y - player.y);
      if (dist <= vr + 2) {
        visiblePlayers.push({
          id: other.id,
          name: other.name,
          x: other.x,
          y: other.y,
          health: other.health,
          maxHealth: other.maxHealth,
          color: other.color,
          mining: other.mining,
          dead: other.dead,
        });
      }
    }

    // Visible mobs
    const visibleMobs: MCMobState[] = [];
    for (const mob of room.mobs.values()) {
      const dist = Math.abs(mob.x - player.x) + Math.abs(mob.y - player.y);
      if (dist <= vr + 2) {
        visibleMobs.push({ ...mob });
      }
    }

    // Include raid mobs on the main board as visible mobs
    for (const raidMob of room.raidMobs.values()) {
      if (raidMob.boardSide === 'main') {
        const dist = Math.abs(raidMob.x - player.x) + Math.abs(raidMob.y - player.y);
        if (dist <= vr + 2) {
          visibleMobs.push({
            id: raidMob.id,
            type: raidMob.type,
            x: raidMob.x,
            y: raidMob.y,
            health: raidMob.health,
            maxHealth: raidMob.maxHealth,
            targetPlayerId: null,
            lastMoveTick: raidMob.lastMoveTick,
            hostile: true,
          });
        }
      }
    }

    // Build side board visible states
    const sideBoards: SideBoardVisibleState[] = [
      {
        side: 'left',
        width: room.sideBoards.left.width,
        height: room.sideBoards.left.height,
        corruption: [...room.sideBoards.left.corruption],
        raidMobs: Array.from(room.raidMobs.values()).filter(m => m.boardSide === 'left'),
      },
      {
        side: 'right',
        width: room.sideBoards.right.width,
        height: room.sideBoards.right.height,
        corruption: [...room.sideBoards.right.corruption],
        raidMobs: Array.from(room.raidMobs.values()).filter(m => m.boardSide === 'right'),
      },
    ];

    // Build anomaly alerts
    const anomalyAlerts: AnomalyAlert[] = Array.from(room.anomalies.values())
      .filter(a => a.active)
      .map(a => ({
        side: a.side,
        message: `Raid wave ${a.waveCount}/${a.maxWaves}`,
        active: true,
      }));

    const totalCycle = MC_BOARD_CONFIG.DAY_TICKS + MC_BOARD_CONFIG.DUSK_TICKS +
      MC_BOARD_CONFIG.NIGHT_TICKS + MC_BOARD_CONFIG.DAWN_TICKS;
    const normalizedTime = (room.timeOfDay % totalCycle) / totalCycle;

    const update: MCGameStateUpdate = {
      visibleTiles,
      players: visiblePlayers,
      mobs: visibleMobs,
      self: player,
      timeOfDay: normalizedTime,
      dayPhase: room.dayPhase,
      tick: room.tick,
      sideBoards,
      anomalyAlerts: anomalyAlerts.length > 0 ? anomalyAlerts : undefined,
    };

    this.sendToPlayer(playerId, { type: 'mc_state_update', state: update });
  }

  // === Inventory Helpers ===

  private addToInventory(player: MCPlayerState, itemType: ItemType, quantity: number): boolean {
    const maxStack = ITEM_PROPERTIES[itemType].maxStack;
    let remaining = quantity;

    // Try to stack with existing items
    for (let i = 0; i < player.inventory.length && remaining > 0; i++) {
      const slot = player.inventory[i];
      if (slot && slot.type === itemType && slot.quantity < maxStack) {
        const add = Math.min(remaining, maxStack - slot.quantity);
        slot.quantity += add;
        remaining -= add;
      }
    }

    // Try empty slots
    for (let i = 0; i < player.inventory.length && remaining > 0; i++) {
      if (!player.inventory[i]) {
        const add = Math.min(remaining, maxStack);
        player.inventory[i] = { type: itemType, quantity: add };
        remaining -= add;
      }
    }

    return remaining === 0;
  }

  private removeFromInventory(player: MCPlayerState, itemType: ItemType, quantity: number): boolean {
    let remaining = quantity;

    // Remove from last to first (preserve hotbar)
    for (let i = player.inventory.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = player.inventory[i];
      if (slot && slot.type === itemType) {
        const remove = Math.min(remaining, slot.quantity);
        slot.quantity -= remove;
        remaining -= remove;
        if (slot.quantity <= 0) player.inventory[i] = null;
      }
    }

    return remaining === 0;
  }

  // === Helper Methods ===

  private createPlayerState(id: string, name: string, color: string, x: number, y: number): MCPlayerState {
    return {
      id,
      name: name.slice(0, 16),
      x, y,
      health: MC_BOARD_CONFIG.MAX_HEALTH,
      maxHealth: MC_BOARD_CONFIG.MAX_HEALTH,
      hunger: MC_BOARD_CONFIG.MAX_HUNGER,
      maxHunger: MC_BOARD_CONFIG.MAX_HUNGER,
      inventory: new Array(MC_BOARD_CONFIG.INVENTORY_SIZE).fill(null),
      selectedSlot: 0,
      armor: null,
      experience: 0,
      kills: 0,
      blocksMined: 0,
      connected: true,
      ready: false,
      color,
      mining: null,
      lastMoveTick: 0,
      lastAttackTick: 0,
      dead: false,
      respawnTick: 0,
    };
  }

  private toLobbyPlayer(player: MCPlayerState): MCLobbyPlayer {
    return {
      id: player.id,
      name: player.name,
      ready: player.ready,
      connected: player.connected,
      color: player.color,
    };
  }

  private isNearBlock(world: WorldTile[][], px: number, py: number, blockType: BlockType): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = px + dx;
        const y = py + dy;
        if (x >= 0 && x < MC_BOARD_CONFIG.WORLD_SIZE && y >= 0 && y < MC_BOARD_CONFIG.WORLD_SIZE) {
          if (world[y][x].block === blockType) return true;
        }
      }
    }
    return false;
  }

  // === State Resync ===

  /** Send current game state to a specific player (used for reconnect/resync) */
  sendStateToPlayer(playerId: string): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.status !== 'playing' || !room.world) return;
    const player = room.players.get(playerId);
    if (!player) return;
    this.sendStateUpdate(room, playerId);
  }

  // === Accessors ===

  getRoomByPlayerId(playerId: string): MCRoom | undefined {
    const code = this.playerRoomMap.get(playerId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  getRoomState(roomCode: string): MCRoomState | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    return {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      players: Array.from(room.players.values()).map(p => this.toLobbyPlayer(p)),
      status: room.status,
      maxPlayers: room.maxPlayers,
    };
  }

  getPublicRooms(): MCPublicRoom[] {
    const rooms: MCPublicRoom[] = [];
    for (const room of this.rooms.values()) {
      if (room.status === 'waiting') {
        const host = room.players.get(room.hostId);
        rooms.push({
          code: room.code,
          name: room.name,
          hostName: host?.name || 'Unknown',
          playerCount: room.players.size,
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
    return Array.from(room.players.keys());
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  // === Communication Helpers ===

  private sendToPlayer(playerId: string, message: MCServerMessage): void {
    this.callbacks.onSendToPlayer(playerId, message);
  }

  private broadcastToRoom(roomCode: string, message: MCServerMessage, excludePlayerId?: string): void {
    this.callbacks.onBroadcastToRoom(roomCode, message, excludePlayerId);
  }

  // === Cleanup ===

  destroy(): void {
    for (const roomCode of this.tickIntervals.keys()) {
      this.stopTickLoop(roomCode);
    }
    this.rooms.clear();
    this.playerRoomMap.clear();
  }
}
