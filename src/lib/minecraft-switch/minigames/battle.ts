// =============================================================================
// Minecraft: Nintendo Switch Edition — Battle Mini-Game
// =============================================================================
// 8-player last-person-standing PvP mini-game. Players explore an arena during
// a grace period, loot chests, then fight to the death. Features shrinking
// border mechanics, best-of-N round scoring, and three unique arena maps.
// Matches the Minecraft: Nintendo Switch Edition Battle mini-game pack.
// =============================================================================

import type {
  BlockCoord,
  InventorySlot,
  PlayerPosition,
} from '@/types/minecraft-switch';

// =============================================================================
// TYPES
// =============================================================================

export type BattlePhase = 'lobby' | 'exploration' | 'fighting' | 'finished';

export type BattleArenaId = 'crucible' | 'cove' | 'cavern';

export interface BattlePlayer {
  id: string;
  name: string;
  alive: boolean;
  kills: number;
  deaths: number;
  health: number;
  maxHealth: number;
  hunger: number;
  inventory: (InventorySlot | null)[];
  armor: (InventorySlot | null)[];
  position: PlayerPosition;
  ready: boolean;
  roundWins: number;
  connected: boolean;
  /** Ticks since last damage for immunity frames. */
  invulnerabilityTicks: number;
  /** Whether the player is spectating (dead this round). */
  spectating: boolean;
  /** ID of the player being spectated. */
  spectateTarget: string | null;
}

export interface BattleBorder {
  centerX: number;
  centerZ: number;
  radius: number;
  shrinkRate: number;
  minRadius: number;
  /** Whether the border is actively shrinking. */
  shrinking: boolean;
}

export interface BattleChest {
  position: BlockCoord;
  opened: boolean;
  openedBy: string | null;
  loot: (InventorySlot | null)[];
}

export interface BattleKillFeedEntry {
  killerId: string | null;
  killerName: string | null;
  victimId: string;
  victimName: string;
  weapon: string;
  timestamp: number;
}

export interface BattleConfig {
  maxRounds: number;
  arena: BattleArenaId;
  explorationTime: number;
  borderShrinkDelay: number;
  borderShrinkRate: number;
  borderMinRadius: number;
  borderDamagePerSecond: number;
}

export interface BattleGameState {
  phase: BattlePhase;
  players: BattlePlayer[];
  arena: BattleArenaId;
  roundNumber: number;
  maxRounds: number;
  timer: number;
  border: BattleBorder;
  chests: BattleChest[];
  killFeed: BattleKillFeedEntry[];
  winner: string | null;
  config: BattleConfig;
}

// =============================================================================
// ARENA DEFINITIONS
// =============================================================================

export interface BattleArenaDefinition {
  id: BattleArenaId;
  name: string;
  nameJa: string;
  description: string;
  size: { width: number; height: number; depth: number };
  spawnPoints: PlayerPosition[];
  chestPositions: BlockCoord[];
  borderCenter: { x: number; z: number };
  borderInitialRadius: number;
}

export const BATTLE_ARENAS: Record<BattleArenaId, BattleArenaDefinition> = {
  crucible: {
    id: 'crucible',
    name: 'Crucible',
    nameJa: 'るつぼ',
    description: 'A volcanic arena with lava pits and narrow bridges over the abyss.',
    size: { width: 80, height: 40, depth: 80 },
    spawnPoints: [
      { x: 10, y: 20, z: 10, yaw: 225, pitch: 0 },
      { x: 70, y: 20, z: 10, yaw: 315, pitch: 0 },
      { x: 70, y: 20, z: 70, yaw: 45, pitch: 0 },
      { x: 10, y: 20, z: 70, yaw: 135, pitch: 0 },
      { x: 40, y: 25, z: 10, yaw: 270, pitch: 0 },
      { x: 70, y: 25, z: 40, yaw: 0, pitch: 0 },
      { x: 40, y: 25, z: 70, yaw: 90, pitch: 0 },
      { x: 10, y: 25, z: 40, yaw: 180, pitch: 0 },
    ],
    chestPositions: [
      { x: 20, y: 20, z: 20 }, { x: 60, y: 20, z: 20 },
      { x: 60, y: 20, z: 60 }, { x: 20, y: 20, z: 60 },
      { x: 40, y: 22, z: 30 }, { x: 40, y: 22, z: 50 },
      { x: 30, y: 22, z: 40 }, { x: 50, y: 22, z: 40 },
      { x: 15, y: 18, z: 40 }, { x: 65, y: 18, z: 40 },
      { x: 40, y: 18, z: 15 }, { x: 40, y: 18, z: 65 },
      { x: 25, y: 25, z: 25 }, { x: 55, y: 25, z: 55 },
      { x: 55, y: 25, z: 25 }, { x: 25, y: 25, z: 55 },
    ],
    borderCenter: { x: 40, z: 40 },
    borderInitialRadius: 45,
  },
  cove: {
    id: 'cove',
    name: 'Cove',
    nameJa: '入り江',
    description: 'A tropical island cove with shipwrecks, palm trees, and hidden caves.',
    size: { width: 90, height: 35, depth: 90 },
    spawnPoints: [
      { x: 15, y: 15, z: 15, yaw: 225, pitch: 0 },
      { x: 75, y: 15, z: 15, yaw: 315, pitch: 0 },
      { x: 75, y: 15, z: 75, yaw: 45, pitch: 0 },
      { x: 15, y: 15, z: 75, yaw: 135, pitch: 0 },
      { x: 45, y: 20, z: 15, yaw: 270, pitch: 0 },
      { x: 75, y: 20, z: 45, yaw: 0, pitch: 0 },
      { x: 45, y: 20, z: 75, yaw: 90, pitch: 0 },
      { x: 15, y: 20, z: 45, yaw: 180, pitch: 0 },
    ],
    chestPositions: [
      { x: 25, y: 14, z: 25 }, { x: 65, y: 14, z: 25 },
      { x: 65, y: 14, z: 65 }, { x: 25, y: 14, z: 65 },
      { x: 45, y: 16, z: 35 }, { x: 45, y: 16, z: 55 },
      { x: 35, y: 16, z: 45 }, { x: 55, y: 16, z: 45 },
      { x: 10, y: 12, z: 45 }, { x: 80, y: 12, z: 45 },
      { x: 45, y: 12, z: 10 }, { x: 45, y: 12, z: 80 },
      { x: 30, y: 20, z: 30 }, { x: 60, y: 20, z: 60 },
    ],
    borderCenter: { x: 45, z: 45 },
    borderInitialRadius: 50,
  },
  cavern: {
    id: 'cavern',
    name: 'Cavern',
    nameJa: '洞窟',
    description: 'A sprawling underground cavern with glowstone pillars and mineshaft tunnels.',
    size: { width: 85, height: 50, depth: 85 },
    spawnPoints: [
      { x: 12, y: 25, z: 12, yaw: 225, pitch: 0 },
      { x: 73, y: 25, z: 12, yaw: 315, pitch: 0 },
      { x: 73, y: 25, z: 73, yaw: 45, pitch: 0 },
      { x: 12, y: 25, z: 73, yaw: 135, pitch: 0 },
      { x: 42, y: 30, z: 12, yaw: 270, pitch: 0 },
      { x: 73, y: 30, z: 42, yaw: 0, pitch: 0 },
      { x: 42, y: 30, z: 73, yaw: 90, pitch: 0 },
      { x: 12, y: 30, z: 42, yaw: 180, pitch: 0 },
    ],
    chestPositions: [
      { x: 22, y: 24, z: 22 }, { x: 63, y: 24, z: 22 },
      { x: 63, y: 24, z: 63 }, { x: 22, y: 24, z: 63 },
      { x: 42, y: 26, z: 32 }, { x: 42, y: 26, z: 52 },
      { x: 32, y: 26, z: 42 }, { x: 52, y: 26, z: 42 },
      { x: 18, y: 22, z: 42 }, { x: 67, y: 22, z: 42 },
      { x: 42, y: 22, z: 18 }, { x: 42, y: 22, z: 67 },
      { x: 30, y: 30, z: 30 }, { x: 55, y: 30, z: 55 },
      { x: 42, y: 35, z: 42 },
    ],
    borderCenter: { x: 42, z: 42 },
    borderInitialRadius: 48,
  },
};

// =============================================================================
// CHEST LOOT TABLE
// =============================================================================

interface LootTableEntry {
  item: string;
  countMin: number;
  countMax: number;
  weight: number;
}

const BATTLE_LOOT_TABLE: LootTableEntry[] = [
  // Weapons
  { item: 'iron_sword', countMin: 1, countMax: 1, weight: 20 },
  { item: 'diamond_sword', countMin: 1, countMax: 1, weight: 5 },
  { item: 'stone_sword', countMin: 1, countMax: 1, weight: 25 },
  { item: 'bow', countMin: 1, countMax: 1, weight: 15 },
  // Armor
  { item: 'iron_helmet', countMin: 1, countMax: 1, weight: 15 },
  { item: 'iron_chestplate', countMin: 1, countMax: 1, weight: 12 },
  { item: 'iron_leggings', countMin: 1, countMax: 1, weight: 12 },
  { item: 'iron_boots', countMin: 1, countMax: 1, weight: 15 },
  { item: 'diamond_helmet', countMin: 1, countMax: 1, weight: 3 },
  { item: 'diamond_chestplate', countMin: 1, countMax: 1, weight: 2 },
  { item: 'diamond_leggings', countMin: 1, countMax: 1, weight: 2 },
  { item: 'diamond_boots', countMin: 1, countMax: 1, weight: 3 },
  { item: 'chainmail_chestplate', countMin: 1, countMax: 1, weight: 8 },
  { item: 'chainmail_leggings', countMin: 1, countMax: 1, weight: 8 },
  // Ranged
  { item: 'arrow', countMin: 4, countMax: 16, weight: 20 },
  // Consumables
  { item: 'golden_apple', countMin: 1, countMax: 2, weight: 10 },
  { item: 'ender_pearl', countMin: 1, countMax: 2, weight: 8 },
  // Potions
  { item: 'potion_healing', countMin: 1, countMax: 1, weight: 12 },
  { item: 'potion_speed', countMin: 1, countMax: 1, weight: 10 },
  { item: 'potion_strength', countMin: 1, countMax: 1, weight: 8 },
  { item: 'splash_potion_healing', countMin: 1, countMax: 1, weight: 6 },
  { item: 'splash_potion_harming', countMin: 1, countMax: 1, weight: 4 },
  // Blocks
  { item: 'oak_planks', countMin: 8, countMax: 32, weight: 15 },
  { item: 'cobblestone', countMin: 8, countMax: 32, weight: 15 },
  // Food
  { item: 'cooked_beef', countMin: 2, countMax: 5, weight: 18 },
  { item: 'bread', countMin: 3, countMax: 6, weight: 18 },
];

function rollLoot(count: number): (InventorySlot | null)[] {
  const totalWeight = BATTLE_LOOT_TABLE.reduce((sum, e) => sum + e.weight, 0);
  const slots: (InventorySlot | null)[] = [];

  for (let i = 0; i < count; i++) {
    let roll = Math.random() * totalWeight;
    let selected: LootTableEntry | null = null;

    for (const entry of BATTLE_LOOT_TABLE) {
      roll -= entry.weight;
      if (roll <= 0) {
        selected = entry;
        break;
      }
    }

    if (selected) {
      const amount = selected.countMin + Math.floor(
        Math.random() * (selected.countMax - selected.countMin + 1)
      );
      slots.push({ item: selected.item, count: amount });
    } else {
      slots.push(null);
    }
  }

  return slots;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  maxRounds: 3,
  arena: 'crucible',
  explorationTime: 60, // seconds
  borderShrinkDelay: 120, // seconds into fighting phase before border starts shrinking
  borderShrinkRate: 0.2, // blocks per second (1 block / 5 seconds)
  borderMinRadius: 5,
  borderDamagePerSecond: 1,
};

// =============================================================================
// BATTLE MANAGER
// =============================================================================

export class BattleManager {
  phase: BattlePhase = 'lobby';
  players: Map<string, BattlePlayer> = new Map();
  arena: BattleArenaId;
  roundNumber: number = 0;
  maxRounds: number;
  timer: number = 0;
  border: BattleBorder;
  chests: BattleChest[] = [];
  killFeed: BattleKillFeedEntry[] = [];
  winner: string | null = null;
  config: BattleConfig;

  private hostId: string;
  private arenaDefinition: BattleArenaDefinition;
  private fightingElapsed: number = 0;

  constructor(hostId: string, config?: Partial<BattleConfig>) {
    this.config = { ...DEFAULT_BATTLE_CONFIG, ...config };
    this.hostId = hostId;
    this.arena = this.config.arena;
    this.maxRounds = this.config.maxRounds;
    this.arenaDefinition = BATTLE_ARENAS[this.arena];

    this.border = {
      centerX: this.arenaDefinition.borderCenter.x,
      centerZ: this.arenaDefinition.borderCenter.z,
      radius: this.arenaDefinition.borderInitialRadius,
      shrinkRate: this.config.borderShrinkRate,
      minRadius: this.config.borderMinRadius,
      shrinking: false,
    };
  }

  // ---------------------------------------------------------------------------
  // Player Management
  // ---------------------------------------------------------------------------

  addPlayer(id: string, name: string): boolean {
    if (this.players.size >= 8) return false;
    if (this.phase !== 'lobby') return false;
    if (this.players.has(id)) return false;

    const spawnIndex = this.players.size;
    const spawn = this.arenaDefinition.spawnPoints[spawnIndex] ?? {
      x: this.arenaDefinition.borderCenter.x,
      y: 20,
      z: this.arenaDefinition.borderCenter.z,
      yaw: 0,
      pitch: 0,
    };

    this.players.set(id, {
      id,
      name,
      alive: true,
      kills: 0,
      deaths: 0,
      health: 20,
      maxHealth: 20,
      hunger: 20,
      inventory: new Array(36).fill(null),
      armor: new Array(4).fill(null),
      position: { ...spawn },
      ready: false,
      roundWins: 0,
      connected: true,
      invulnerabilityTicks: 0,
      spectating: false,
      spectateTarget: null,
    });

    return true;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    if (this.phase === 'fighting' || this.phase === 'exploration') {
      this.checkRoundEnd();
    }
  }

  setReady(id: string, ready: boolean): void {
    const player = this.players.get(id);
    if (player) player.ready = ready;
  }

  setArena(arenaId: BattleArenaId): void {
    if (this.phase !== 'lobby') return;
    this.arena = arenaId;
    this.config.arena = arenaId;
    this.arenaDefinition = BATTLE_ARENAS[arenaId];
    this.border.centerX = this.arenaDefinition.borderCenter.x;
    this.border.centerZ = this.arenaDefinition.borderCenter.z;
    this.border.radius = this.arenaDefinition.borderInitialRadius;
  }

  setMaxRounds(rounds: number): void {
    if (this.phase !== 'lobby') return;
    this.maxRounds = Math.max(1, Math.min(5, rounds));
    this.config.maxRounds = this.maxRounds;
  }

  // ---------------------------------------------------------------------------
  // Game Flow
  // ---------------------------------------------------------------------------

  startGame(): boolean {
    if (this.phase !== 'lobby') return false;
    if (this.players.size < 2) return false;

    this.roundNumber = 1;
    this.startRound();
    return true;
  }

  private startRound(): void {
    this.phase = 'exploration';
    this.timer = this.config.explorationTime;
    this.fightingElapsed = 0;
    this.killFeed = [];

    // Reset border
    this.border.radius = this.arenaDefinition.borderInitialRadius;
    this.border.shrinking = false;

    // Generate chests
    this.chests = this.arenaDefinition.chestPositions.map((pos) => ({
      position: { ...pos },
      opened: false,
      openedBy: null,
      loot: rollLoot(3 + Math.floor(Math.random() * 4)), // 3-6 items
    }));

    // Reset players
    let spawnIdx = 0;
    for (const player of this.players.values()) {
      const spawn = this.arenaDefinition.spawnPoints[spawnIdx % this.arenaDefinition.spawnPoints.length];
      player.alive = true;
      player.health = 20;
      player.maxHealth = 20;
      player.hunger = 20;
      player.inventory = new Array(36).fill(null);
      player.armor = new Array(4).fill(null);
      player.position = { ...spawn };
      player.invulnerabilityTicks = 0;
      player.spectating = false;
      player.spectateTarget = null;
      player.kills = 0;
      player.deaths = 0;
      spawnIdx++;
    }
  }

  tick(): void {
    if (this.phase === 'lobby' || this.phase === 'finished') return;

    // Update invulnerability frames
    for (const player of this.players.values()) {
      if (player.invulnerabilityTicks > 0) {
        player.invulnerabilityTicks--;
      }
    }

    if (this.phase === 'exploration') {
      this.timer -= 1 / 20; // 20 ticks per second
      if (this.timer <= 0) {
        this.phase = 'fighting';
        this.timer = 0;
        this.fightingElapsed = 0;
      }
    } else if (this.phase === 'fighting') {
      this.fightingElapsed += 1 / 20;

      // Start border shrinking after delay
      if (!this.border.shrinking && this.fightingElapsed >= this.config.borderShrinkDelay) {
        this.border.shrinking = true;
      }

      // Shrink border
      if (this.border.shrinking && this.border.radius > this.border.minRadius) {
        this.border.radius = Math.max(
          this.border.minRadius,
          this.border.radius - (this.border.shrinkRate / 20)
        );
      }

      // Apply border damage
      for (const player of this.players.values()) {
        if (!player.alive || player.spectating) continue;

        const dx = player.position.x - this.border.centerX;
        const dz = player.position.z - this.border.centerZ;
        const distFromCenter = Math.sqrt(dx * dx + dz * dz);

        if (distFromCenter > this.border.radius) {
          // Damage per second, applied per tick
          const damage = this.config.borderDamagePerSecond / 20;
          player.health = Math.max(0, player.health - damage);

          if (player.health <= 0) {
            this.handlePlayerDeath(player.id, null, 'border');
          }
        }
      }

      // Clean up old kill feed entries (older than 10 seconds)
      const now = Date.now();
      this.killFeed = this.killFeed.filter((entry) => now - entry.timestamp < 10000);
    }
  }

  // ---------------------------------------------------------------------------
  // Combat
  // ---------------------------------------------------------------------------

  handlePlayerDeath(playerId: string, killerId?: string | null, cause: string = 'combat'): void {
    const victim = this.players.get(playerId);
    if (!victim || !victim.alive) return;

    victim.alive = false;
    victim.health = 0;
    victim.deaths++;
    victim.spectating = true;

    // Assign spectate target to first alive player
    const alivePlayers = this.getAlivePlayers();
    if (alivePlayers.length > 0) {
      victim.spectateTarget = alivePlayers[0].id;
    }

    // Credit the kill
    if (killerId) {
      const killer = this.players.get(killerId);
      if (killer) {
        killer.kills++;
      }
    }

    // Add kill feed entry
    const killer = killerId ? this.players.get(killerId) : null;
    this.killFeed.push({
      killerId: killerId ?? null,
      killerName: killer?.name ?? null,
      victimId: playerId,
      victimName: victim.name,
      weapon: cause,
      timestamp: Date.now(),
    });

    this.checkRoundEnd();
  }

  private checkRoundEnd(): void {
    const alivePlayers = this.getAlivePlayers();

    if (alivePlayers.length <= 1) {
      // Round over
      if (alivePlayers.length === 1) {
        const roundWinner = alivePlayers[0];
        roundWinner.roundWins++;
      }

      // Check if game is over
      const requiredWins = Math.ceil(this.maxRounds / 2);
      const overallWinner = Array.from(this.players.values()).find(
        (p) => p.roundWins >= requiredWins
      );

      if (overallWinner || this.roundNumber >= this.maxRounds) {
        this.phase = 'finished';
        this.winner = overallWinner?.id ?? this.getLeaderboard()[0]?.id ?? null;
      } else {
        // Start next round after a short delay (handled by UI)
        this.roundNumber++;
        this.startRound();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Chest Interaction
  // ---------------------------------------------------------------------------

  openChest(playerId: string, chestIndex: number): (InventorySlot | null)[] | null {
    if (chestIndex < 0 || chestIndex >= this.chests.length) return null;

    const chest = this.chests[chestIndex];
    if (chest.opened) return null;

    const player = this.players.get(playerId);
    if (!player || !player.alive) return null;

    // Check distance
    const dx = player.position.x - chest.position.x;
    const dy = player.position.y - chest.position.y;
    const dz = player.position.z - chest.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 4.5) return null;

    chest.opened = true;
    chest.openedBy = playerId;

    // Add loot to player inventory
    const addedLoot: (InventorySlot | null)[] = [];
    for (const lootItem of chest.loot) {
      if (!lootItem) continue;
      const emptySlot = player.inventory.findIndex((s) => s === null);
      if (emptySlot !== -1) {
        player.inventory[emptySlot] = { ...lootItem };
        addedLoot.push({ ...lootItem });
      }
    }

    return addedLoot;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  getAlivePlayers(): BattlePlayer[] {
    return Array.from(this.players.values()).filter((p) => p.alive && p.connected);
  }

  getAliveCount(): number {
    return this.getAlivePlayers().length;
  }

  isPlayerAlive(id: string): boolean {
    return this.players.get(id)?.alive ?? false;
  }

  getLeaderboard(): BattlePlayer[] {
    return Array.from(this.players.values()).sort((a, b) => {
      // Sort by round wins descending, then kills descending, then deaths ascending
      if (b.roundWins !== a.roundWins) return b.roundWins - a.roundWins;
      if (b.kills !== a.kills) return b.kills - a.kills;
      return a.deaths - b.deaths;
    });
  }

  isPlayerOutsideBorder(id: string): boolean {
    const player = this.players.get(id);
    if (!player) return false;

    const dx = player.position.x - this.border.centerX;
    const dz = player.position.z - this.border.centerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return dist > this.border.radius;
  }

  getDistanceToBorder(id: string): number {
    const player = this.players.get(id);
    if (!player) return 0;

    const dx = player.position.x - this.border.centerX;
    const dz = player.position.z - this.border.centerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return this.border.radius - dist;
  }

  getGameState(): BattleGameState {
    return {
      phase: this.phase,
      players: Array.from(this.players.values()),
      arena: this.arena,
      roundNumber: this.roundNumber,
      maxRounds: this.maxRounds,
      timer: this.timer,
      border: { ...this.border },
      chests: this.chests.map((c) => ({
        position: { ...c.position },
        opened: c.opened,
        openedBy: c.openedBy,
        loot: c.loot,
      })),
      killFeed: [...this.killFeed],
      winner: this.winner,
      config: { ...this.config },
    };
  }

  getHostId(): string {
    return this.hostId;
  }

  // ---------------------------------------------------------------------------
  // Spectator Controls
  // ---------------------------------------------------------------------------

  cycleSpectateTarget(playerId: string, direction: 'next' | 'prev'): string | null {
    const player = this.players.get(playerId);
    if (!player || !player.spectating) return null;

    const alive = this.getAlivePlayers();
    if (alive.length === 0) return null;

    const currentIdx = alive.findIndex((p) => p.id === player.spectateTarget);
    let nextIdx: number;

    if (direction === 'next') {
      nextIdx = (currentIdx + 1) % alive.length;
    } else {
      nextIdx = (currentIdx - 1 + alive.length) % alive.length;
    }

    player.spectateTarget = alive[nextIdx].id;
    return player.spectateTarget;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createBattleGame(
  hostId: string,
  config?: Partial<BattleConfig>
): BattleManager {
  return new BattleManager(hostId, config);
}
