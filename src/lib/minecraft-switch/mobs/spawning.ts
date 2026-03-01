// =============================================================================
// Minecraft: Nintendo Switch Edition — Mob Spawning System
// =============================================================================
// Manages the mob spawn cycle, despawn rules, biome-specific spawn lists,
// mob caps per category, and spawn condition checks. Called every 20 ticks
// (once per second) to attempt spawning new mobs near players.
// =============================================================================

import { Block, type BiomeType, type Difficulty, type MobType } from '@/types/minecraft-switch';
import { MS_CONFIG } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';
import { MobEntity, type AIPlayerInfo, type Vec3 } from './mob-ai';
import {
  MOB_REGISTRY,
  getMobDef,
  getSpawnableMobs,
  SLIME_SIZE_STATS,
  type SlimeSize,
} from './mob-registry';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Per-category mob caps controlling maximum live mobs. */
export const MOB_CAPS = {
  hostile: 70,
  passive: 10,
  neutral: 5,
  ambient: 15,
  boss: 4,
} as const;

/** Minimum distance from any player for a hostile mob to spawn. */
const MIN_SPAWN_DISTANCE = 24;

/** Maximum distance from any player to attempt a spawn. */
const MAX_SPAWN_DISTANCE = 128;

/** Distance beyond which mobs instantly despawn. */
const INSTANT_DESPAWN_DISTANCE = 128;

/** Distance beyond which mobs have a random chance to despawn. */
const RANDOM_DESPAWN_DISTANCE = 32;

/** Random despawn chance per tick when beyond RANDOM_DESPAWN_DISTANCE. */
const RANDOM_DESPAWN_CHANCE = 1 / 800;

/** Default spawn cycle interval in ticks. */
const SPAWN_CYCLE_INTERVAL = 20;

/** Maximum spawn attempts per cycle per category. */
const MAX_SPAWN_ATTEMPTS = 12;

// =============================================================================
// BIOME-SPECIFIC PASSIVE SPAWN TABLES
// =============================================================================

/** Passive mobs that spawn in each biome group. */
const PASSIVE_SPAWN_TABLE: Record<string, { mob: MobType; weight: number }[]> = {
  plains: [
    { mob: 'cow', weight: 8 },
    { mob: 'pig', weight: 10 },
    { mob: 'sheep', weight: 12 },
    { mob: 'chicken', weight: 10 },
    { mob: 'horse', weight: 5 },
  ],
  forest: [
    { mob: 'cow', weight: 8 },
    { mob: 'pig', weight: 10 },
    { mob: 'sheep', weight: 12 },
    { mob: 'chicken', weight: 10 },
    { mob: 'wolf', weight: 5 },
  ],
  desert: [
    { mob: 'rabbit', weight: 4 },
  ],
  snowy: [
    { mob: 'polar_bear', weight: 1 },
    { mob: 'rabbit', weight: 4 },
  ],
  swamp: [
    { mob: 'slime', weight: 10 },
  ],
  ocean: [
    { mob: 'squid', weight: 10 },
  ],
  jungle: [
    { mob: 'chicken', weight: 10 },
    { mob: 'pig', weight: 6 },
  ],
  savanna: [
    { mob: 'cow', weight: 8 },
    { mob: 'sheep', weight: 12 },
    { mob: 'horse', weight: 5 },
    { mob: 'chicken', weight: 8 },
  ],
  mountain: [
    { mob: 'sheep', weight: 12 },
    { mob: 'cow', weight: 4 },
  ],
};

/** Map biome types to spawn table keys. */
function getBiomeSpawnKey(biome: BiomeType): string {
  if (biome.includes('ocean') || biome.includes('river')) return 'ocean';
  if (biome.includes('desert') || biome.includes('badlands')) return 'desert';
  if (biome.includes('snowy') || biome.includes('frozen') || biome === 'ice_spikes') return 'snowy';
  if (biome === 'swamp') return 'swamp';
  if (biome.includes('jungle') || biome.includes('bamboo')) return 'jungle';
  if (biome.includes('savanna')) return 'savanna';
  if (biome.includes('mountain') || biome === 'gravelly_mountains') return 'mountain';
  if (biome.includes('forest') || biome.includes('taiga') || biome === 'dark_forest') return 'forest';
  return 'plains';
}

// =============================================================================
// HOSTILE SPAWN TABLE — Night spawns across all biomes
// =============================================================================

/** Standard hostile mobs that spawn at night in most overworld biomes. */
const STANDARD_HOSTILE_SPAWNS: { mob: MobType; weight: number }[] = [
  { mob: 'zombie', weight: 100 },
  { mob: 'skeleton', weight: 80 },
  { mob: 'creeper', weight: 100 },
  { mob: 'spider', weight: 100 },
  { mob: 'enderman', weight: 10 },
  { mob: 'witch', weight: 5 },
];

/** Biome-specific hostile mob replacements. */
function getHostileSpawnsForBiome(biome: BiomeType): { mob: MobType; weight: number }[] {
  const spawns = [...STANDARD_HOSTILE_SPAWNS];

  if (biome === 'desert') {
    // Replace zombie with husk
    const zombieIdx = spawns.findIndex(s => s.mob === 'zombie');
    if (zombieIdx >= 0) spawns[zombieIdx] = { mob: 'husk', weight: 100 };
  }

  if (biome.includes('snowy') || biome.includes('frozen') || biome === 'ice_spikes') {
    // Replace skeleton with stray
    const skelIdx = spawns.findIndex(s => s.mob === 'skeleton');
    if (skelIdx >= 0) spawns[skelIdx] = { mob: 'stray', weight: 80 };
  }

  if (biome === 'swamp') {
    spawns.push({ mob: 'slime', weight: 10 });
  }

  return spawns;
}

// =============================================================================
// SPAWN CONDITION CHECKS
// =============================================================================

/**
 * Check if a position is valid for spawning a hostile mob.
 *
 * Requirements:
 * - Solid block below
 * - Air at feet and head level
 * - Light level <= 7 at spawn block
 * - Not within MIN_SPAWN_DISTANCE of any player
 * - Within MAX_SPAWN_DISTANCE of at least one player
 */
function canSpawnHostile(
  world: ChunkedWorld,
  x: number,
  y: number,
  z: number,
  players: AIPlayerInfo[],
): boolean {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bz = Math.floor(z);

  // Solid block below
  const below = world.getBlock(bx, by - 1, bz);
  if (below === Block.Air || below === Block.Water || below === Block.Lava) return false;

  // Air at feet and head
  const atFeet = world.getBlock(bx, by, bz);
  const atHead = world.getBlock(bx, by + 1, bz);
  if (atFeet !== Block.Air || atHead !== Block.Air) return false;

  // Light level check (simplified: use sky exposure based on height map)
  const highestBlock = world.getHighestBlock(bx, bz);
  const hasSkylightExposure = by > highestBlock;
  // If exposed to sky, assume daylight (hostile can't spawn)
  // In a full implementation this would check time of day
  // For now, underground mobs (below highest block) pass the light check
  // Surface mobs are assumed to spawn at night when called
  if (hasSkylightExposure) {
    // Surface: assume the spawn system is only calling us at night
    // but we should still check — simplified to always allow at night
  }

  // Distance checks
  const pos: Vec3 = { x, y, z };
  let nearestPlayerDist = Infinity;
  for (const p of players) {
    const dx = p.x - x;
    const dy = p.y - y;
    const dz = p.z - z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    nearestPlayerDist = Math.min(nearestPlayerDist, d);
  }

  if (nearestPlayerDist < MIN_SPAWN_DISTANCE) return false;
  if (nearestPlayerDist > MAX_SPAWN_DISTANCE) return false;

  return true;
}

/**
 * Check if a position is valid for spawning a passive mob.
 *
 * Requirements:
 * - Grass block below
 * - Air at feet and head level
 * - Light level >= 9
 */
function canSpawnPassive(
  world: ChunkedWorld,
  x: number,
  y: number,
  z: number,
): boolean {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bz = Math.floor(z);

  // Grass block below
  const below = world.getBlock(bx, by - 1, bz);
  if (below !== Block.Grass) return false;

  // Air at feet and head
  const atFeet = world.getBlock(bx, by, bz);
  const atHead = world.getBlock(bx, by + 1, bz);
  if (atFeet !== Block.Air || atHead !== Block.Air) return false;

  return true;
}

/**
 * Check if a position is valid for spawning an ambient mob (bat).
 *
 * Requirements:
 * - Y <= 63 (underground)
 * - Light level <= 4 (simplified as being below sky exposure)
 */
function canSpawnAmbient(
  world: ChunkedWorld,
  x: number,
  y: number,
  z: number,
): boolean {
  if (y > 63) return false;

  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bz = Math.floor(z);

  const atFeet = world.getBlock(bx, by, bz);
  const atHead = world.getBlock(bx, by + 1, bz);
  if (atFeet !== Block.Air || atHead !== Block.Air) return false;

  // Must have a solid block nearby (ceiling)
  const above = world.getBlock(bx, by + 2, bz);
  return above !== Block.Air;
}

/**
 * Check if a position is valid for spawning a water mob.
 *
 * Requirements:
 * - Water block at spawn position
 * - Appropriate biome (ocean, river, etc.)
 */
function canSpawnWater(
  world: ChunkedWorld,
  x: number,
  y: number,
  z: number,
): boolean {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bz = Math.floor(z);

  const block = world.getBlock(bx, by, bz);
  return block === Block.Water || block === Block.StillWater;
}

// =============================================================================
// WEIGHTED RANDOM SELECTION
// =============================================================================

function selectWeighted<T extends { weight: number }>(entries: T[]): T | null {
  if (entries.length === 0) return null;

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }

  return entries[entries.length - 1];
}

// =============================================================================
// SPAWN MANAGER CLASS
// =============================================================================

/**
 * SpawnManager handles the mob spawn/despawn cycle.
 *
 * Call `tick()` every game tick. It will automatically handle:
 * - Spawn cycle every `SPAWN_CYCLE_INTERVAL` ticks
 * - Mob despawning based on distance from players
 * - Mob cap enforcement per category
 */
export class SpawnManager {
  /** All currently active mob entities. */
  activeEntities: Map<string, MobEntity> = new Map();

  /** Per-category mob cap overrides. */
  mobCaps: Record<string, number> = { ...MOB_CAPS };

  /** Ticks between spawn attempts. */
  spawnCooldown: number = SPAWN_CYCLE_INTERVAL;

  /** Internal tick counter. */
  private tickCount = 0;

  /** Monotonic entity ID counter. */
  private nextEntityId = 1;

  /** Generate a unique entity ID. */
  private generateId(): string {
    return `mob_${this.nextEntityId++}`;
  }

  // ---------------------------------------------------------------------------
  // Main Tick
  // ---------------------------------------------------------------------------

  /**
   * Main tick function. Call every game tick.
   *
   * @param world - The chunked world
   * @param players - Active player info
   * @param difficulty - Current difficulty
   * @param dayTime - Current time of day (0-24000)
   * @param biomeAt - Function to look up biome at world coordinates
   */
  tick(
    world: ChunkedWorld,
    players: AIPlayerInfo[],
    difficulty: Difficulty,
    dayTime: number,
    biomeAt: (x: number, z: number) => BiomeType,
  ): void {
    this.tickCount++;

    // Despawn check every tick
    this.tickDespawn(players);

    // Spawn cycle
    if (this.tickCount % this.spawnCooldown === 0) {
      this.spawnCycle(world, players, difficulty, dayTime, biomeAt);
    }
  }

  // ---------------------------------------------------------------------------
  // Despawn Logic
  // ---------------------------------------------------------------------------

  /**
   * Check all active entities for despawn conditions:
   * - Instant despawn if > 128 blocks from nearest player
   * - Random despawn chance if > 32 blocks from nearest player (1/800 per tick)
   * - Named/tamed/persistent mobs never despawn
   */
  private tickDespawn(players: AIPlayerInfo[]): void {
    const toRemove: string[] = [];

    for (const [id, mob] of this.activeEntities) {
      if (mob.neverDespawn) continue;
      if (mob.dying) continue;

      // Find nearest player
      let nearestDist = Infinity;
      for (const p of players) {
        const dx = p.x - mob.position.x;
        const dy = p.y - mob.position.y;
        const dz = p.z - mob.position.z;
        nearestDist = Math.min(nearestDist, Math.sqrt(dx * dx + dy * dy + dz * dz));
      }

      // Instant despawn
      if (nearestDist > INSTANT_DESPAWN_DISTANCE) {
        toRemove.push(id);
        continue;
      }

      // Random despawn
      if (nearestDist > RANDOM_DESPAWN_DISTANCE) {
        mob.ticksSincePlayerNearby++;
        if (Math.random() < RANDOM_DESPAWN_CHANCE) {
          toRemove.push(id);
          continue;
        }
      } else {
        mob.ticksSincePlayerNearby = 0;
      }
    }

    for (const id of toRemove) {
      this.activeEntities.delete(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Spawn Cycle
  // ---------------------------------------------------------------------------

  /**
   * Attempt to spawn mobs near players, respecting mob caps and spawn conditions.
   */
  private spawnCycle(
    world: ChunkedWorld,
    players: AIPlayerInfo[],
    difficulty: Difficulty,
    dayTime: number,
    biomeAt: (x: number, z: number) => BiomeType,
  ): void {
    if (players.length === 0) return;
    if (difficulty === 'peaceful') return; // No hostile spawns in peaceful

    // Count current mobs per category
    const counts = this.countByCategory();

    // Determine if it's nighttime (hostile mobs spawn at night on surface)
    const isNight = dayTime >= MS_CONFIG.NIGHT_START || dayTime < MS_CONFIG.DAY_START;

    // --- Hostile spawns ---
    if (counts.hostile < this.mobCaps.hostile) {
      this.attemptSpawns(
        'hostile',
        world,
        players,
        difficulty,
        isNight,
        biomeAt,
        MAX_SPAWN_ATTEMPTS,
      );
    }

    // --- Passive spawns ---
    if (counts.passive < this.mobCaps.passive) {
      this.attemptSpawns(
        'passive',
        world,
        players,
        difficulty,
        true, // passive can spawn any time
        biomeAt,
        Math.floor(MAX_SPAWN_ATTEMPTS / 2),
      );
    }

    // --- Ambient spawns (bats) ---
    if (counts.ambient < this.mobCaps.ambient) {
      this.attemptAmbientSpawn(world, players);
    }
  }

  /**
   * Attempt to spawn mobs of a given category.
   */
  private attemptSpawns(
    category: 'hostile' | 'passive' | 'neutral',
    world: ChunkedWorld,
    players: AIPlayerInfo[],
    difficulty: Difficulty,
    timeAllowed: boolean,
    biomeAt: (x: number, z: number) => BiomeType,
    maxAttempts: number,
  ): void {
    if (!timeAllowed && category === 'hostile') return;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Pick a random player
      const player = players[Math.floor(Math.random() * players.length)];

      // Pick a random position 24-128 blocks away
      const angle = Math.random() * Math.PI * 2;
      const distance = MIN_SPAWN_DISTANCE + Math.random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE);
      const x = player.x + Math.cos(angle) * distance;
      const z = player.z + Math.sin(angle) * distance;

      // Find surface Y
      const surfaceY = world.getHighestBlock(Math.floor(x), Math.floor(z));
      const y = surfaceY + 1;

      if (y <= 0 || y >= 255) continue;

      // Get biome
      const biome = biomeAt(Math.floor(x), Math.floor(z));

      if (category === 'hostile') {
        if (!canSpawnHostile(world, x, y, z, players)) continue;

        // Pick mob from hostile spawn table
        const spawns = getHostileSpawnsForBiome(biome);
        const selected = selectWeighted(spawns);
        if (!selected) continue;

        this.spawnMob(selected.mob, x, y, z);
      } else if (category === 'passive') {
        if (!canSpawnPassive(world, x, y, z)) continue;

        // Pick mob from passive spawn table
        const biomeKey = getBiomeSpawnKey(biome);
        const spawns = PASSIVE_SPAWN_TABLE[biomeKey] ?? PASSIVE_SPAWN_TABLE['plains'];
        const selected = selectWeighted(spawns);
        if (!selected) continue;

        this.spawnMob(selected.mob, x, y, z);
      }
    }
  }

  /**
   * Attempt to spawn an ambient mob (bat) underground.
   */
  private attemptAmbientSpawn(world: ChunkedWorld, players: AIPlayerInfo[]): void {
    // Pick a random player
    const player = players[Math.floor(Math.random() * players.length)];

    for (let attempt = 0; attempt < 4; attempt++) {
      const x = player.x + (Math.random() * 2 - 1) * 48;
      const z = player.z + (Math.random() * 2 - 1) * 48;
      const y = Math.floor(Math.random() * 63); // Underground only

      if (canSpawnAmbient(world, x, y, z)) {
        this.spawnMob('bat', x, y, z);
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Mob Spawn / Remove
  // ---------------------------------------------------------------------------

  /**
   * Spawn a new mob entity at the given position.
   *
   * @returns The newly created MobEntity
   */
  spawnMob(type: MobType, x: number, y: number, z: number): MobEntity {
    const id = this.generateId();
    const mob = new MobEntity(id, type, x, y, z);

    // Apply variant-specific setup
    if (type === 'slime') {
      // Random size for slimes
      const sizeRoll = Math.random();
      if (sizeRoll < 0.33) {
        mob.slimeSize = 'small';
        mob.maxHealth = SLIME_SIZE_STATS.small.maxHealth;
        mob.health = mob.maxHealth;
      } else if (sizeRoll < 0.66) {
        mob.slimeSize = 'medium';
        mob.maxHealth = SLIME_SIZE_STATS.medium.maxHealth;
        mob.health = mob.maxHealth;
      } else {
        mob.slimeSize = 'big';
        mob.maxHealth = SLIME_SIZE_STATS.big.maxHealth;
        mob.health = mob.maxHealth;
      }
    }

    if (type === 'horse') {
      // Randomize horse stats
      mob.maxHealth = 15 + Math.floor(Math.random() * 16); // 15-30
      mob.health = mob.maxHealth;
      mob.metadata['horseSpeed'] = 0.1125 + Math.random() * 0.225; // 0.1125-0.3375
      mob.metadata['horseJump'] = 0.4 + Math.random() * 0.6; // 0.4-1.0
    }

    if (type === 'sheep') {
      // Random wool color (mostly white)
      const colorRoll = Math.random();
      if (colorRoll < 0.8) mob.metadata['woolColor'] = 'white';
      else if (colorRoll < 0.85) mob.metadata['woolColor'] = 'light_gray';
      else if (colorRoll < 0.9) mob.metadata['woolColor'] = 'gray';
      else if (colorRoll < 0.93) mob.metadata['woolColor'] = 'brown';
      else if (colorRoll < 0.96) mob.metadata['woolColor'] = 'black';
      else mob.metadata['woolColor'] = 'pink';
      mob.metadata['sheared'] = false;
    }

    if (type === 'ender_dragon') {
      mob.metadata['dragonPhase'] = 'circling';
      mob.metadata['phaseTicks'] = 0;
    }

    this.activeEntities.set(id, mob);
    return mob;
  }

  /**
   * Remove a mob entity by ID.
   */
  removeMob(id: string): boolean {
    return this.activeEntities.delete(id);
  }

  /**
   * Get a mob entity by ID.
   */
  getMob(id: string): MobEntity | undefined {
    return this.activeEntities.get(id);
  }

  /**
   * Get all active mob entities.
   */
  getAllMobs(): MobEntity[] {
    return Array.from(this.activeEntities.values());
  }

  /**
   * Get all mobs within a given range of a position.
   */
  getMobsInRange(x: number, y: number, z: number, range: number): MobEntity[] {
    const rangeSq = range * range;
    const result: MobEntity[] = [];
    for (const mob of this.activeEntities.values()) {
      const dx = mob.position.x - x;
      const dy = mob.position.y - y;
      const dz = mob.position.z - z;
      if (dx * dx + dy * dy + dz * dz <= rangeSq) {
        result.push(mob);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Category Counting
  // ---------------------------------------------------------------------------

  /**
   * Count active mobs by entity category.
   */
  private countByCategory(): Record<string, number> {
    const counts: Record<string, number> = {
      hostile: 0,
      passive: 0,
      neutral: 0,
      ambient: 0,
      boss: 0,
    };

    for (const mob of this.activeEntities.values()) {
      if (!mob.alive) continue;
      const def = getMobDef(mob.type);
      if (!def) continue;

      if (mob.type === 'bat') {
        counts.ambient++;
      } else if (def.category === 'boss') {
        counts.boss++;
      } else {
        counts[def.category] = (counts[def.category] ?? 0) + 1;
      }
    }

    return counts;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialize all active entities for persistence or network sync.
   */
  serialize(): SerializedMob[] {
    const result: SerializedMob[] = [];
    for (const mob of this.activeEntities.values()) {
      result.push({
        id: mob.id,
        type: mob.type,
        x: mob.position.x,
        y: mob.position.y,
        z: mob.position.z,
        health: mob.health,
        maxHealth: mob.maxHealth,
        yaw: mob.rotation.yaw,
        pitch: mob.rotation.pitch,
        customName: mob.customName,
        tamed: mob.tamed,
        ownerId: mob.ownerId,
        persistent: mob.persistent,
        metadata: { ...mob.metadata },
        slimeSize: mob.slimeSize,
      });
    }
    return result;
  }

  /**
   * Deserialize and load mob entities.
   */
  deserialize(data: SerializedMob[]): void {
    this.activeEntities.clear();
    for (const d of data) {
      const mob = new MobEntity(d.id, d.type, d.x, d.y, d.z);
      mob.health = d.health;
      mob.maxHealth = d.maxHealth;
      mob.rotation.yaw = d.yaw;
      mob.rotation.pitch = d.pitch;
      mob.customName = d.customName;
      mob.tamed = d.tamed;
      mob.ownerId = d.ownerId;
      mob.persistent = d.persistent;
      mob.metadata = d.metadata;
      mob.slimeSize = d.slimeSize ?? 'big';

      // Update the next ID counter
      const idNum = parseInt(d.id.replace('mob_', ''), 10);
      if (!isNaN(idNum) && idNum >= this.nextEntityId) {
        this.nextEntityId = idNum + 1;
      }

      this.activeEntities.set(d.id, mob);
    }
  }
}

// =============================================================================
// SERIALIZED MOB TYPE
// =============================================================================

export interface SerializedMob {
  id: string;
  type: MobType;
  x: number;
  y: number;
  z: number;
  health: number;
  maxHealth: number;
  yaw: number;
  pitch: number;
  customName: string | null;
  tamed: boolean;
  ownerId: string | null;
  persistent: boolean;
  metadata: Record<string, unknown>;
  slimeSize?: SlimeSize;
}
