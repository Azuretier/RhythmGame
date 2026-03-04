// =============================================================================
// Minecraft: Nintendo Switch Edition — Tumble Mini-Game
// =============================================================================
// 8-player spleef variant where players destroy platforms under opponents to
// make them fall into lava. Supports Shovel mode (break blocks directly) and
// Snowball mode (knock opponents with snowball projectiles). Features stacked
// breakable layers, timed layer collapse, and multiple block types including
// explosive TNT blocks. Three pre-built arenas: Icicle (snow-only, 3 layers),
// Mosaic (mixed wool colors, 3 layers), and Dynamite (TNT chain-explosion, 2
// layers). Matches Minecraft: Nintendo Switch Edition Tumble mini-game pack.
// =============================================================================

import type {
  PlayerPosition,
} from '@/types/minecraft-switch';
import { Block } from '@/types/minecraft-switch';

// =============================================================================
// TYPES
// =============================================================================

export type TumblePhase = 'lobby' | 'countdown' | 'playing' | 'round_over' | 'finished';

export type TumbleMode = 'shovel' | 'snowball';

export type TumbleLayerType = 'snow' | 'clay' | 'stained_glass' | 'tnt_mixed' | 'wool' | 'tnt_only';

export type TumbleArenaId = 'icicle' | 'mosaic' | 'dynamite';

export interface TumblePlayer {
  id: string;
  name: string;
  alive: boolean;
  score: number;
  kills: number;
  roundWins: number;
  position: PlayerPosition;
  velocity: { x: number; y: number; z: number };
  currentLayer: number;
  connected: boolean;
  ready: boolean;
  snowballCooldown: number;
  /** Knockback immunity ticks after being hit. */
  knockbackImmunity: number;
  /** ID of the last player that hit this player (for kill credit). */
  lastHitBy: string | null;
  /** Ticks since last hit (reset on new hit, used for kill credit timeout). */
  lastHitTimer: number;
}

export interface TumbleSnowball {
  id: string;
  ownerId: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  lifetime: number;
}

export interface TumbleLayer {
  index: number;
  y: number;
  type: TumbleLayerType;
  /** 2D grid of blocks; 0 = air/destroyed, >0 = block ID. */
  blocks: number[][];
  radius: number;
  collapseTimer: number;
  collapseTimerMax: number;
  collapsing: boolean;
  collapsed: boolean;
}

export interface TumbleArenaDefinition {
  id: TumbleArenaId;
  name: string;
  nameJa: string;
  description: string;
  layerCount: number;
  layerRadius: number;
  layerSpacing: number;
  layerTypes: TumbleLayerType[];
  collapseTimePerLayer: number;
  /** TNT explosion radius override for this arena (default 3). */
  tntExplosionRadius: number;
  /** Whether TNT chain-reacts to nearby TNT blocks. */
  tntChainReaction: boolean;
}

export interface TumbleConfig {
  mode: TumbleMode;
  arena: TumbleArenaId;
  baseY: number;
  roundsToWin: number;
  countdownDuration: number;
  snowballSpeed: number;
  snowballKnockback: number;
  snowballCooldownTicks: number;
  /** Gravity acceleration per tick (blocks/tick^2). */
  gravity: number;
  /** Horizontal drag factor applied per tick (0-1, lower = more drag). */
  horizontalDrag: number;
  /** Kill credit timeout in ticks. */
  killCreditTimeout: number;
}

export interface TumbleGameState {
  phase: TumblePhase;
  mode: TumbleMode;
  arena: TumbleArenaId;
  players: TumblePlayer[];
  layers: TumbleLayer[];
  snowballs: TumbleSnowball[];
  roundNumber: number;
  roundsToWin: number;
  timer: number;
  countdownTimer: number;
  winner: string | null;
  eliminationFeed: TumbleEliminationEntry[];
  eliminationOrder: string[];
}

export interface TumbleEliminationEntry {
  playerId: string;
  playerName: string;
  cause: 'fell' | 'snowball' | 'tnt' | 'collapse';
  attackerId: string | null;
  attackerName: string | null;
  timestamp: number;
}

export interface TumbleResults {
  winner: TumblePlayer | null;
  rankings: TumblePlayerResult[];
  totalRounds: number;
  arena: TumbleArenaId;
  mode: TumbleMode;
}

export interface TumblePlayerResult {
  id: string;
  name: string;
  rank: number;
  roundWins: number;
  kills: number;
  score: number;
}

// =============================================================================
// ARENA DEFINITIONS
// =============================================================================

export const TUMBLE_ARENAS: Record<TumbleArenaId, TumbleArenaDefinition> = {
  icicle: {
    id: 'icicle',
    name: 'Icicle',
    nameJa: 'つらら',
    description: 'A frozen arena made entirely of snow blocks. Three fragile layers that crumble quickly under your feet. Pure spleef at its finest.',
    layerCount: 3,
    layerRadius: 14,
    layerSpacing: 6,
    layerTypes: ['snow', 'snow', 'snow'],
    collapseTimePerLayer: 50,
    tntExplosionRadius: 3,
    tntChainReaction: false,
  },
  mosaic: {
    id: 'mosaic',
    name: 'Mosaic',
    nameJa: 'モザイク',
    description: 'A colorful arena with layers made of mixed wool colors arranged in intricate patterns. Three layers of rainbow destruction.',
    layerCount: 3,
    layerRadius: 12,
    layerSpacing: 6,
    layerTypes: ['wool', 'wool', 'wool'],
    collapseTimePerLayer: 60,
    tntExplosionRadius: 3,
    tntChainReaction: false,
  },
  dynamite: {
    id: 'dynamite',
    name: 'Dynamite',
    nameJa: 'ダイナマイト',
    description: 'A volatile arena loaded with TNT blocks that chain-explode when broken. Only two layers — every block you break could set off a devastating chain reaction.',
    layerCount: 2,
    layerRadius: 15,
    layerSpacing: 8,
    layerTypes: ['tnt_mixed', 'tnt_only'],
    collapseTimePerLayer: 75,
    tntExplosionRadius: 4,
    tntChainReaction: true,
  },
};

// =============================================================================
// LAYER BLOCK TYPES
// =============================================================================

const WOOL_BLOCKS: number[] = [
  Block.WhiteWool, Block.OrangeWool, Block.MagentaWool, Block.LightBlueWool,
  Block.YellowWool, Block.LimeWool, Block.PinkWool, Block.GrayWool,
  Block.LightGrayWool, Block.CyanWool, Block.PurpleWool, Block.BlueWool,
  Block.BrownWool, Block.GreenWool, Block.RedWool, Block.BlackWool,
];

const STAINED_GLASS_BLOCKS: number[] = [
  Block.WhiteStainedGlass, Block.OrangeStainedGlass,
  Block.MagentaStainedGlass, Block.LightBlueStainedGlass,
  Block.YellowStainedGlass, Block.LimeStainedGlass,
  Block.PinkStainedGlass, Block.CyanStainedGlass,
  Block.PurpleStainedGlass, Block.BlueStainedGlass,
  Block.GreenStainedGlass, Block.RedStainedGlass,
];

const LAYER_BLOCK_MAP: Record<TumbleLayerType, number[]> = {
  snow: [Block.SnowBlock],
  clay: [Block.Clay],
  stained_glass: STAINED_GLASS_BLOCKS,
  tnt_mixed: [Block.TNT, Block.TNT, Block.SnowBlock, Block.Clay],
  wool: WOOL_BLOCKS,
  tnt_only: [Block.TNT],
};

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_TUMBLE_CONFIG: TumbleConfig = {
  mode: 'shovel',
  arena: 'icicle',
  baseY: 40,
  roundsToWin: 3,
  countdownDuration: 3,
  snowballSpeed: 1.2,
  snowballKnockback: 0.8,
  snowballCooldownTicks: 10,
  gravity: 0.06,
  horizontalDrag: 0.92,
  killCreditTimeout: 100, // 5 seconds at 20 tps
};

// =============================================================================
// PATTERN GENERATORS
// =============================================================================

/**
 * Generates a circular layer of blocks with the given block options.
 * All blocks placed randomly from the available block options.
 */
function generateUniformLayer(
  radius: number,
  blockOptions: number[],
): number[][] {
  const size = radius * 2 + 1;
  const blocks: number[][] = [];

  for (let z = 0; z < size; z++) {
    blocks[z] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - radius;
      const dz = z - radius;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= radius) {
        const blockId = blockOptions[Math.floor(Math.random() * blockOptions.length)];
        blocks[z][x] = blockId;
      } else {
        blocks[z][x] = Block.Air;
      }
    }
  }

  return blocks;
}

/**
 * Generates a mosaic (concentric ring) pattern layer with wool blocks.
 * Each ring from center outward uses a different wool color.
 */
function generateMosaicLayer(radius: number): number[][] {
  const size = radius * 2 + 1;
  const blocks: number[][] = [];
  const ringWidth = 2;

  for (let z = 0; z < size; z++) {
    blocks[z] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - radius;
      const dz = z - radius;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= radius) {
        // Determine which ring we are in based on distance from center
        const ringIndex = Math.floor(dist / ringWidth);
        // Use a mix of pattern and randomness for visual interest
        const colorIndex = (ringIndex + Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI / 4))) % WOOL_BLOCKS.length;
        blocks[z][x] = WOOL_BLOCKS[colorIndex];
      } else {
        blocks[z][x] = Block.Air;
      }
    }
  }

  return blocks;
}

/**
 * Generates a Dynamite arena layer with TNT blocks interspersed with
 * other block types. For tnt_only layers, every block is TNT.
 */
function generateDynamiteLayer(
  radius: number,
  type: TumbleLayerType,
): number[][] {
  const size = radius * 2 + 1;
  const blocks: number[][] = [];
  const blockOptions = LAYER_BLOCK_MAP[type];

  for (let z = 0; z < size; z++) {
    blocks[z] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - radius;
      const dz = z - radius;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= radius) {
        if (type === 'tnt_only') {
          blocks[z][x] = Block.TNT;
        } else {
          // Checkerboard-ish TNT distribution for visual variety
          const isTntSpot = (x + z) % 3 === 0;
          if (isTntSpot) {
            blocks[z][x] = Block.TNT;
          } else {
            const nonTnt = blockOptions.filter((b) => b !== Block.TNT);
            blocks[z][x] = nonTnt.length > 0
              ? nonTnt[Math.floor(Math.random() * nonTnt.length)]
              : Block.TNT;
          }
        }
      } else {
        blocks[z][x] = Block.Air;
      }
    }
  }

  return blocks;
}

// =============================================================================
// TUMBLE MANAGER
// =============================================================================

export class TumbleManager {
  phase: TumblePhase = 'lobby';
  mode: TumbleMode;
  arena: TumbleArenaId;
  players: Map<string, TumblePlayer> = new Map();
  layers: TumbleLayer[] = [];
  snowballs: TumbleSnowball[] = [];
  roundNumber: number = 0;
  roundsToWin: number;
  timer: number = 0;
  countdownTimer: number = 0;
  winner: string | null = null;
  eliminationFeed: TumbleEliminationEntry[] = [];
  eliminationOrder: string[] = [];
  config: TumbleConfig;

  private snowballIdCounter: number = 0;
  private arenaDefinition: TumbleArenaDefinition;

  constructor(config?: Partial<TumbleConfig>) {
    this.config = { ...DEFAULT_TUMBLE_CONFIG, ...config };
    this.mode = this.config.mode;
    this.arena = this.config.arena;
    this.roundsToWin = this.config.roundsToWin;
    this.arenaDefinition = TUMBLE_ARENAS[this.arena];
  }

  // ---------------------------------------------------------------------------
  // Player Management
  // ---------------------------------------------------------------------------

  addPlayer(id: string, name: string): boolean {
    if (this.players.size >= 8) return false;
    if (this.phase !== 'lobby') return false;
    if (this.players.has(id)) return false;

    const spawnY = this.config.baseY
      + (this.arenaDefinition.layerCount * this.arenaDefinition.layerSpacing) + 2;

    this.players.set(id, {
      id,
      name,
      alive: true,
      score: 0,
      kills: 0,
      roundWins: 0,
      position: { x: 0, y: spawnY, z: 0, yaw: 0, pitch: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      currentLayer: this.arenaDefinition.layerCount - 1,
      connected: true,
      ready: false,
      snowballCooldown: 0,
      knockbackImmunity: 0,
      lastHitBy: null,
      lastHitTimer: 0,
    });

    return true;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    if (this.phase === 'playing') {
      this.checkRoundEnd();
    }
  }

  setReady(id: string, ready: boolean): void {
    const player = this.players.get(id);
    if (player) player.ready = ready;
  }

  setMode(mode: TumbleMode): void {
    if (this.phase !== 'lobby') return;
    this.mode = mode;
    this.config.mode = mode;
  }

  setArena(arenaId: TumbleArenaId): void {
    if (this.phase !== 'lobby') return;
    this.arena = arenaId;
    this.config.arena = arenaId;
    this.arenaDefinition = TUMBLE_ARENAS[arenaId];
  }

  setRoundsToWin(rounds: number): void {
    if (this.phase !== 'lobby') return;
    this.roundsToWin = Math.max(1, Math.min(5, rounds));
    this.config.roundsToWin = this.roundsToWin;
  }

  // ---------------------------------------------------------------------------
  // Game Flow
  // ---------------------------------------------------------------------------

  startGame(): boolean {
    if (this.phase !== 'lobby') return false;
    if (this.players.size < 2) return false;

    this.roundNumber = 1;
    this.startCountdown();
    return true;
  }

  private startCountdown(): void {
    this.phase = 'countdown';
    this.countdownTimer = this.config.countdownDuration;
    this.eliminationFeed = [];
    this.eliminationOrder = [];
    this.snowballs = [];

    // Generate layers based on arena definition
    this.layers = [];
    const def = this.arenaDefinition;

    for (let i = 0; i < def.layerCount; i++) {
      const layerType = def.layerTypes[i] ?? def.layerTypes[def.layerTypes.length - 1];
      const y = this.config.baseY + i * def.layerSpacing;
      this.layers.push(this.generateLayer(i, y, layerType, def.layerRadius));
    }

    // Spawn players on top layer in a circle
    const topLayer = this.layers[this.layers.length - 1];
    const playerCount = this.players.size;
    let idx = 0;

    for (const player of this.players.values()) {
      const angle = (idx / playerCount) * Math.PI * 2;
      const spawnRadius = topLayer.radius * 0.6;
      player.alive = true;
      player.position = {
        x: Math.cos(angle) * spawnRadius,
        y: topLayer.y + 1.5,
        z: Math.sin(angle) * spawnRadius,
        yaw: ((angle * 180) / Math.PI + 180) % 360,
        pitch: 0,
      };
      player.velocity = { x: 0, y: 0, z: 0 };
      player.currentLayer = this.layers.length - 1;
      player.snowballCooldown = 0;
      player.knockbackImmunity = 0;
      player.lastHitBy = null;
      player.lastHitTimer = 0;
      idx++;
    }

    this.timer = 0;
  }

  startRound(): void {
    this.startCountdown();
  }

  private generateLayer(
    index: number,
    y: number,
    type: TumbleLayerType,
    radius: number,
  ): TumbleLayer {
    let blocks: number[][];

    switch (this.arena) {
      case 'mosaic':
        blocks = generateMosaicLayer(radius);
        break;
      case 'dynamite':
        blocks = generateDynamiteLayer(radius, type);
        break;
      default:
        blocks = generateUniformLayer(radius, LAYER_BLOCK_MAP[type]);
        break;
    }

    return {
      index,
      y,
      type,
      blocks,
      radius,
      collapseTimer: this.arenaDefinition.collapseTimePerLayer,
      collapseTimerMax: this.arenaDefinition.collapseTimePerLayer,
      collapsing: false,
      collapsed: false,
    };
  }

  tick(): void {
    if (this.phase === 'lobby' || this.phase === 'finished') return;

    // Handle countdown phase
    if (this.phase === 'countdown') {
      this.countdownTimer -= 1 / 20;
      if (this.countdownTimer <= 0) {
        this.phase = 'playing';
        this.countdownTimer = 0;
      }
      return;
    }

    if (this.phase === 'round_over') return;

    // --- Playing phase ---
    this.timer += 1 / 20;

    // Update snowball cooldowns and knockback immunity
    for (const player of this.players.values()) {
      if (player.snowballCooldown > 0) player.snowballCooldown--;
      if (player.knockbackImmunity > 0) player.knockbackImmunity--;
      if (player.lastHitTimer > 0) {
        player.lastHitTimer--;
        if (player.lastHitTimer <= 0) {
          player.lastHitBy = null;
        }
      }
    }

    // Update player physics
    this.updatePlayerPhysics();

    // Update snowballs
    this.updateSnowballs();

    // Update layer collapse timers
    this.updateLayerCollapse();

    // Check player falls
    this.checkPlayerFalls();

    // Clean old elimination feed (10s)
    const now = Date.now();
    this.eliminationFeed = this.eliminationFeed.filter((e) => now - e.timestamp < 10000);
  }

  // ---------------------------------------------------------------------------
  // Player Physics
  // ---------------------------------------------------------------------------

  private updatePlayerPhysics(): void {
    for (const player of this.players.values()) {
      if (!player.alive) continue;

      // Apply gravity
      player.velocity.y -= this.config.gravity;

      // Apply horizontal drag
      player.velocity.x *= this.config.horizontalDrag;
      player.velocity.z *= this.config.horizontalDrag;

      // Update position
      player.position.x += player.velocity.x;
      player.position.y += player.velocity.y;
      player.position.z += player.velocity.z;

      // Check floor collision with layers
      let landed = false;
      for (let i = this.layers.length - 1; i >= 0; i--) {
        const layer = this.layers[i];
        if (layer.collapsed) continue;

        // Only check if player is at or below this layer's surface
        if (player.position.y > layer.y + 1.5) continue;

        const localX = Math.floor(player.position.x + layer.radius);
        const localZ = Math.floor(player.position.z + layer.radius);

        if (
          localZ >= 0 && localZ < layer.blocks.length &&
          localX >= 0 && localX < (layer.blocks[0]?.length ?? 0) &&
          layer.blocks[localZ][localX] !== Block.Air
        ) {
          // Land on this block
          if (player.position.y < layer.y + 1) {
            player.position.y = layer.y + 1;
            player.velocity.y = 0;
            player.currentLayer = layer.index;
            landed = true;
            break;
          }
        }
      }

      // Clamp to arena boundaries (prevent walking off edge of top layer)
      const activeLayer = this.getActiveLayer();
      if (activeLayer) {
        const maxDist = activeLayer.radius + 0.5;
        const hDist = Math.sqrt(
          player.position.x * player.position.x +
          player.position.z * player.position.z
        );
        if (hDist > maxDist && landed) {
          // Allow falling off edge, but ensure we don't teleport back
          // Players can fall off — this is intentional
        }
      }
    }
  }

  updatePlayerPosition(playerId: string, position: PlayerPosition): void {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;
    player.position = { ...position };
  }

  updatePlayerVelocity(playerId: string, velocity: { x: number; y: number; z: number }): void {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;
    player.velocity = { ...velocity };
  }

  // ---------------------------------------------------------------------------
  // Block Breaking (Shovel Mode)
  // ---------------------------------------------------------------------------

  breakBlock(playerId: string, x: number, y: number, z: number): boolean {
    if (this.mode !== 'shovel') return false;
    if (this.phase !== 'playing') return false;

    const player = this.players.get(playerId);
    if (!player || !player.alive) return false;

    // Check distance — player must be close enough to break blocks
    const dx = player.position.x - x;
    const dz = player.position.z - z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    if (horizontalDist > 5) return false;

    // Find the layer at this Y
    const layer = this.layers.find((l) => l.y === y);
    if (!layer || layer.collapsed) return false;

    // Convert to layer-local coordinates
    const localX = Math.floor(x + layer.radius);
    const localZ = Math.floor(z + layer.radius);

    if (localX < 0 || localX >= (layer.blocks[0]?.length ?? 0) || localZ < 0 || localZ >= layer.blocks.length) {
      return false;
    }

    const blockId = layer.blocks[localZ][localX];
    if (blockId === Block.Air) return false;

    // Handle TNT blocks — chain explosion or single explosion
    if (blockId === Block.TNT) {
      if (this.arenaDefinition.tntChainReaction) {
        this.chainExplodeTNT(layer, localX, localZ, playerId);
      } else {
        this.explodeTNT(layer, localX, localZ, playerId);
      }
    } else {
      // Instant break for snow/clay/wool in shovel mode
      layer.blocks[localZ][localX] = Block.Air;
    }

    return true;
  }

  private explodeTNT(layer: TumbleLayer, cx: number, cz: number, breakerId: string): void {
    const explosionRadius = this.arenaDefinition.tntExplosionRadius;

    for (let dz = -explosionRadius; dz <= explosionRadius; dz++) {
      for (let dx = -explosionRadius; dx <= explosionRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > explosionRadius) continue;

        const bx = cx + dx;
        const bz = cz + dz;
        if (bz >= 0 && bz < layer.blocks.length && bx >= 0 && bx < (layer.blocks[0]?.length ?? 0)) {
          layer.blocks[bz][bx] = Block.Air;
        }
      }
    }

    // Apply knockback to nearby players
    this.applyExplosionKnockback(layer, cx, cz, explosionRadius, breakerId);
  }

  /**
   * Chain-explode TNT: when a TNT block is broken, it explodes and any TNT
   * blocks caught in the blast radius also explode, causing a chain reaction.
   * Uses a BFS approach to prevent infinite recursion.
   */
  private chainExplodeTNT(layer: TumbleLayer, startX: number, startZ: number, breakerId: string): void {
    const explosionRadius = this.arenaDefinition.tntExplosionRadius;
    const visited = new Set<string>();
    const queue: Array<{ x: number; z: number }> = [{ x: startX, z: startZ }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.x},${current.z}`;
      if (visited.has(key)) continue;
      visited.add(key);

      // Explode this block's radius
      for (let dz = -explosionRadius; dz <= explosionRadius; dz++) {
        for (let dx = -explosionRadius; dx <= explosionRadius; dx++) {
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > explosionRadius) continue;

          const bx = current.x + dx;
          const bz = current.z + dz;

          if (bz < 0 || bz >= layer.blocks.length) continue;
          if (bx < 0 || bx >= (layer.blocks[0]?.length ?? 0)) continue;

          const blockAtPos = layer.blocks[bz][bx];

          // If this is a TNT block we haven't processed yet, queue it for chain explosion
          if (blockAtPos === Block.TNT && !visited.has(`${bx},${bz}`)) {
            queue.push({ x: bx, z: bz });
          }

          layer.blocks[bz][bx] = Block.Air;
        }
      }

      // Apply knockback from each explosion center
      this.applyExplosionKnockback(layer, current.x, current.z, explosionRadius, breakerId);
    }
  }

  /**
   * Apply knockback to players within explosion radius.
   * Also sets lastHitBy for kill credit if the player subsequently falls.
   */
  private applyExplosionKnockback(
    layer: TumbleLayer,
    cx: number,
    cz: number,
    radius: number,
    breakerId: string,
  ): void {
    // Convert local coords back to world coords
    const worldX = cx - layer.radius;
    const worldZ = cz - layer.radius;

    for (const player of this.players.values()) {
      if (!player.alive) continue;

      const dx = player.position.x - worldX;
      const dz = player.position.z - worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < radius + 2) {
        // Knockback scales inversely with distance
        const knockbackStrength = Math.max(0, 1 - dist / (radius + 2));
        const dirMag = dist || 1;
        player.velocity.x += (dx / dirMag) * knockbackStrength * 1.5;
        player.velocity.y += knockbackStrength * 0.6;
        player.velocity.z += (dz / dirMag) * knockbackStrength * 1.5;

        // Credit the breaker if it's a different player
        if (player.id !== breakerId) {
          player.lastHitBy = breakerId;
          player.lastHitTimer = this.config.killCreditTimeout;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Snowball Throwing (Snowball Mode)
  // ---------------------------------------------------------------------------

  throwSnowball(playerId: string, direction: { x: number; y: number; z: number }): boolean {
    if (this.mode !== 'snowball') return false;
    if (this.phase !== 'playing') return false;

    const player = this.players.get(playerId);
    if (!player || !player.alive) return false;
    if (player.snowballCooldown > 0) return false;

    // Normalize direction
    const mag = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    if (mag === 0) return false;

    const speed = this.config.snowballSpeed;
    const nx = (direction.x / mag) * speed;
    const ny = (direction.y / mag) * speed;
    const nz = (direction.z / mag) * speed;

    this.snowballs.push({
      id: `sb_${this.snowballIdCounter++}`,
      ownerId: playerId,
      position: {
        x: player.position.x,
        y: player.position.y + 1.4,
        z: player.position.z,
      },
      velocity: { x: nx, y: ny, z: nz },
      lifetime: 60, // 3 seconds at 20 tps
    });

    player.snowballCooldown = this.config.snowballCooldownTicks;
    return true;
  }

  private updateSnowballs(): void {
    const toRemove: string[] = [];

    for (const snowball of this.snowballs) {
      // Apply gravity
      snowball.velocity.y -= 0.04;

      // Move
      snowball.position.x += snowball.velocity.x;
      snowball.position.y += snowball.velocity.y;
      snowball.position.z += snowball.velocity.z;

      snowball.lifetime--;

      // Check for player collisions
      for (const player of this.players.values()) {
        if (!player.alive || player.id === snowball.ownerId) continue;
        if (player.knockbackImmunity > 0) continue;

        const dx = player.position.x - snowball.position.x;
        const dy = player.position.y - snowball.position.y;
        const dz = player.position.z - snowball.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 1.0) {
          // Apply knockback
          const kb = this.config.snowballKnockback;
          const knockDir = Math.sqrt(dx * dx + dz * dz) || 1;
          player.velocity.x += (dx / knockDir) * kb;
          player.velocity.y += 0.2;
          player.velocity.z += (dz / knockDir) * kb;
          player.knockbackImmunity = 10;

          // Credit the snowball thrower for kill tracking
          player.lastHitBy = snowball.ownerId;
          player.lastHitTimer = this.config.killCreditTimeout;

          toRemove.push(snowball.id);
          break;
        }
      }

      // Check for block hits in snowball mode (snowballs break blocks too)
      if (!toRemove.includes(snowball.id)) {
        for (const layer of this.layers) {
          if (layer.collapsed) continue;

          if (Math.abs(snowball.position.y - layer.y) < 1) {
            const localX = Math.floor(snowball.position.x + layer.radius);
            const localZ = Math.floor(snowball.position.z + layer.radius);

            if (
              localZ >= 0 && localZ < layer.blocks.length &&
              localX >= 0 && localX < (layer.blocks[0]?.length ?? 0) &&
              layer.blocks[localZ][localX] !== Block.Air
            ) {
              const blockId = layer.blocks[localZ][localX];
              if (blockId === Block.TNT && this.arenaDefinition.tntChainReaction) {
                this.chainExplodeTNT(layer, localX, localZ, snowball.ownerId);
              } else if (blockId === Block.TNT) {
                this.explodeTNT(layer, localX, localZ, snowball.ownerId);
              } else {
                layer.blocks[localZ][localX] = Block.Air;
              }
              toRemove.push(snowball.id);
              break;
            }
          }
        }
      }

      // Remove expired snowballs or those below the world
      if (snowball.lifetime <= 0 || snowball.position.y < this.config.baseY - 10) {
        toRemove.push(snowball.id);
      }
    }

    this.snowballs = this.snowballs.filter((s) => !toRemove.includes(s.id));
  }

  // ---------------------------------------------------------------------------
  // Layer Collapse
  // ---------------------------------------------------------------------------

  private updateLayerCollapse(): void {
    // Find the topmost active (non-collapsed) layer
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.collapsed) continue;

      layer.collapseTimer -= 1 / 20;

      // Start collapsing animation 10 seconds before full collapse
      if (layer.collapseTimer <= 10 && !layer.collapsing) {
        layer.collapsing = true;
      }

      if (layer.collapsing) {
        // Remove random blocks progressively (more aggressive as timer drops)
        const totalBlocks = (layer.radius * 2 + 1) * (layer.radius * 2 + 1);
        const urgency = Math.max(0.01, 1 - (layer.collapseTimer / 10));
        const blocksToRemove = Math.ceil(totalBlocks * 0.02 * urgency);
        let removed = 0;

        while (removed < blocksToRemove) {
          const rx = Math.floor(Math.random() * (layer.radius * 2 + 1));
          const rz = Math.floor(Math.random() * (layer.radius * 2 + 1));
          if (layer.blocks[rz]?.[rx] !== undefined && layer.blocks[rz][rx] !== Block.Air) {
            // If it's TNT and we have chain reactions, trigger one
            if (layer.blocks[rz][rx] === Block.TNT && this.arenaDefinition.tntChainReaction) {
              // Small chance of chain during collapse for dramatic effect
              if (Math.random() < 0.3) {
                this.chainExplodeTNT(layer, rx, rz, '');
              } else {
                layer.blocks[rz][rx] = Block.Air;
              }
            } else {
              layer.blocks[rz][rx] = Block.Air;
            }
            removed++;
          } else {
            // If we hit air, just count it to avoid infinite loops
            removed++;
          }
        }
      }

      if (layer.collapseTimer <= 0) {
        // Fully collapse layer
        for (let z = 0; z < layer.blocks.length; z++) {
          for (let x = 0; x < layer.blocks[z].length; x++) {
            layer.blocks[z][x] = Block.Air;
          }
        }
        layer.collapsed = true;
      }

      // Only process the topmost non-collapsed layer
      break;
    }
  }

  // ---------------------------------------------------------------------------
  // Fall Detection & Elimination
  // ---------------------------------------------------------------------------

  handlePlayerFall(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;

    // Check if player is below all layers (fallen into lava at y=0)
    if (player.position.y < this.config.baseY - 2) {
      player.alive = false;

      // Determine cause and credit kills
      let cause: TumbleEliminationEntry['cause'] = 'fell';
      let attackerId: string | null = null;
      let attackerName: string | null = null;

      if (player.lastHitBy) {
        const attacker = this.players.get(player.lastHitBy);
        if (attacker) {
          attackerId = attacker.id;
          attackerName = attacker.name;
          attacker.kills++;
          attacker.score += 5;

          // Determine cause based on mode
          cause = this.mode === 'snowball' ? 'snowball' : 'fell';
        }
      }

      this.eliminationFeed.push({
        playerId: player.id,
        playerName: player.name,
        cause,
        attackerId,
        attackerName,
        timestamp: Date.now(),
      });

      this.eliminationOrder.push(player.id);
      this.checkRoundEnd();
    }
  }

  private checkPlayerFalls(): void {
    for (const player of this.players.values()) {
      if (!player.alive) continue;

      // Check if the block below the player exists
      let onSolidGround = false;

      for (const layer of this.layers) {
        if (layer.collapsed) continue;

        // Check if player is at this layer's height
        if (Math.abs(player.position.y - (layer.y + 1)) < 1.5) {
          const localX = Math.floor(player.position.x + layer.radius);
          const localZ = Math.floor(player.position.z + layer.radius);

          if (
            localZ >= 0 && localZ < layer.blocks.length &&
            localX >= 0 && localX < (layer.blocks[0]?.length ?? 0) &&
            layer.blocks[localZ][localX] !== Block.Air
          ) {
            onSolidGround = true;
            player.currentLayer = layer.index;
            break;
          }
        }
      }

      if (!onSolidGround && player.position.y < this.config.baseY - 2) {
        this.handlePlayerFall(player.id);
      }
    }
  }

  private checkRoundEnd(): void {
    const alivePlayers = Array.from(this.players.values()).filter((p) => p.alive && p.connected);

    if (alivePlayers.length <= 1) {
      this.phase = 'round_over';

      if (alivePlayers.length === 1) {
        const roundWinner = alivePlayers[0];
        roundWinner.roundWins++;
        roundWinner.score += 10;
      }

      // Check game over
      const overallWinner = Array.from(this.players.values()).find(
        (p) => p.roundWins >= this.roundsToWin
      );

      if (overallWinner) {
        this.phase = 'finished';
        this.winner = overallWinner.id;
      } else {
        this.roundNumber++;
        // Round will be started by external call or after delay
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  getAlivePlayers(): TumblePlayer[] {
    return Array.from(this.players.values()).filter((p) => p.alive && p.connected);
  }

  getAliveCount(): number {
    return this.getAlivePlayers().length;
  }

  getRemainingBlocks(): number {
    let count = 0;
    for (const layer of this.layers) {
      if (layer.collapsed) continue;
      for (const row of layer.blocks) {
        for (const block of row) {
          if (block !== Block.Air) count++;
        }
      }
    }
    return count;
  }

  getActiveLayerIndex(): number {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      if (!this.layers[i].collapsed) return i;
    }
    return -1;
  }

  getActiveLayer(): TumbleLayer | null {
    const idx = this.getActiveLayerIndex();
    return idx >= 0 ? this.layers[idx] : null;
  }

  getBlockAt(worldX: number, layerIndex: number, worldZ: number): number {
    if (layerIndex < 0 || layerIndex >= this.layers.length) return Block.Air;
    const layer = this.layers[layerIndex];
    if (layer.collapsed) return Block.Air;

    const localX = Math.floor(worldX + layer.radius);
    const localZ = Math.floor(worldZ + layer.radius);

    if (localZ < 0 || localZ >= layer.blocks.length) return Block.Air;
    if (localX < 0 || localX >= (layer.blocks[0]?.length ?? 0)) return Block.Air;

    return layer.blocks[localZ][localX];
  }

  getLayerCollapsePercent(layerIndex: number): number {
    if (layerIndex < 0 || layerIndex >= this.layers.length) return 0;
    const layer = this.layers[layerIndex];
    if (layer.collapsed) return 1;
    return 1 - (layer.collapseTimer / layer.collapseTimerMax);
  }

  getLeaderboard(): TumblePlayer[] {
    return Array.from(this.players.values()).sort((a, b) => {
      if (b.roundWins !== a.roundWins) return b.roundWins - a.roundWins;
      if (b.score !== a.score) return b.score - a.score;
      if (b.kills !== a.kills) return b.kills - a.kills;
      return 0;
    });
  }

  getResults(): TumbleResults {
    const rankings = this.getLeaderboard();

    return {
      winner: this.winner ? this.players.get(this.winner) ?? null : null,
      rankings: rankings.map((p, i) => ({
        id: p.id,
        name: p.name,
        rank: i + 1,
        roundWins: p.roundWins,
        kills: p.kills,
        score: p.score,
      })),
      totalRounds: this.roundNumber,
      arena: this.arena,
      mode: this.mode,
    };
  }

  getGameState(): TumbleGameState {
    return {
      phase: this.phase,
      mode: this.mode,
      arena: this.arena,
      players: Array.from(this.players.values()),
      layers: this.layers.map((l) => ({
        ...l,
        blocks: l.blocks.map((row) => [...row]),
      })),
      snowballs: [...this.snowballs],
      roundNumber: this.roundNumber,
      roundsToWin: this.roundsToWin,
      timer: this.timer,
      countdownTimer: this.countdownTimer,
      winner: this.winner,
      eliminationFeed: [...this.eliminationFeed],
      eliminationOrder: [...this.eliminationOrder],
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createTumbleGame(config?: Partial<TumbleConfig>): TumbleManager {
  return new TumbleManager(config);
}
