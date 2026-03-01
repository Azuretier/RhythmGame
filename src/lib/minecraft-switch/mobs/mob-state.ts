// =============================================================================
// Minecraft: Nintendo Switch Edition — Mob State Manager
// =============================================================================
// High-level manager that orchestrates mob spawning, AI ticking, physics,
// damage, death, and drop calculations. Acts as the bridge between the
// SpawnManager, MobAI, and the game's combat/world systems.
// =============================================================================

import type {
  MobType,
  DamageSource,
  Difficulty,
  BiomeType,
  EnchantmentInstance,
  MobDropEntry,
} from '@/types/minecraft-switch';
import { MS_CONFIG } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';
import { MobEntity, tickAI, type AIPlayerInfo, type Vec3 } from './mob-ai';
import { SpawnManager, type SerializedMob } from './spawning';
import {
  getMobDef,
  getMobDamage,
  SLIME_SIZE_STATS,
  CREEPER_CONFIG,
  isUndeadMob,
  type SlimeSize,
} from './mob-registry';

// =============================================================================
// DROP RESULT TYPE
// =============================================================================

export interface DropResult {
  item: string;
  count: number;
}

// =============================================================================
// DAMAGE RESULT TYPE
// =============================================================================

export interface MobDamageResult {
  /** Actual damage dealt after modifiers. */
  damageDealt: number;
  /** Whether the mob was killed. */
  killed: boolean;
  /** New health value. */
  newHealth: number;
  /** Knockback vector applied to the mob. */
  knockback: Vec3;
}

// =============================================================================
// MOB DEATH EVENT
// =============================================================================

export interface MobDeathEvent {
  mobId: string;
  mobType: MobType;
  position: Vec3;
  drops: DropResult[];
  experienceDrop: number;
  killerId?: string;
  killerName?: string;
}

// =============================================================================
// MOB STATE MANAGER CLASS
// =============================================================================

/**
 * MobStateManager is the top-level manager for all mob entities in the world.
 *
 * It wraps SpawnManager and provides methods for:
 * - Spawning and removing mobs
 * - Applying damage with knockback and death handling
 * - Calculating drops (including Looting enchantment bonuses)
 * - Ticking all mob AI and physics each game tick
 * - Serializing/deserializing for persistence
 */
export class MobStateManager {
  /** The underlying spawn manager. */
  readonly spawnManager: SpawnManager;

  /** Callback for when a mob dies (for drop items, XP orbs, etc.). */
  onMobDeath: ((event: MobDeathEvent) => void) | null = null;

  /** Callback for when a creeper explodes. */
  onCreeperExplode: ((mob: MobEntity, charged: boolean) => void) | null = null;

  /** Callback for when a mob attacks a player (melee). */
  onMobAttackPlayer: ((mob: MobEntity, playerId: string, damage: number) => void) | null = null;

  /** Callback for when a mob shoots a projectile. */
  onMobShootProjectile: ((mob: MobEntity, target: Vec3) => void) | null = null;

  /** Current game difficulty. */
  difficulty: Difficulty = 'normal';

  constructor() {
    this.spawnManager = new SpawnManager();
  }

  // ---------------------------------------------------------------------------
  // Mob Access
  // ---------------------------------------------------------------------------

  /** Spawn a new mob at the given position. */
  spawnMob(type: MobType, x: number, y: number, z: number): MobEntity {
    return this.spawnManager.spawnMob(type, x, y, z);
  }

  /** Remove a mob by ID. */
  removeMob(id: string): void {
    this.spawnManager.removeMob(id);
  }

  /** Get a mob by ID. */
  getMob(id: string): MobEntity | undefined {
    return this.spawnManager.getMob(id);
  }

  /** Get all active mobs. */
  getAllMobs(): MobEntity[] {
    return this.spawnManager.getAllMobs();
  }

  /** Get all mobs within a given range of a position. */
  getMobsInRange(x: number, y: number, z: number, range: number): MobEntity[] {
    return this.spawnManager.getMobsInRange(x, y, z, range);
  }

  // ---------------------------------------------------------------------------
  // Damage
  // ---------------------------------------------------------------------------

  /**
   * Apply damage to a mob entity.
   *
   * @param id - Mob entity ID
   * @param amount - Raw damage amount
   * @param source - Damage source type
   * @param knockback - Knockback vector
   * @param attackerId - ID of the attacking entity/player (optional)
   * @param attackerName - Name of the attacker (for death messages)
   * @param lootingLevel - Looting enchantment level on the weapon (for drops)
   * @returns Damage result, or null if mob not found
   */
  damageMob(
    id: string,
    amount: number,
    source: DamageSource,
    knockback: Vec3 = { x: 0, y: 0, z: 0 },
    attackerId?: string,
    attackerName?: string,
    lootingLevel = 0,
  ): MobDamageResult | null {
    const mob = this.spawnManager.getMob(id);
    if (!mob || !mob.alive) return null;

    // Hurt animation
    mob.hurtTime = 10; // 10 ticks of hurt flash

    // Apply damage
    const actualDamage = Math.max(0, amount);
    mob.health = Math.max(0, mob.health - actualDamage);

    // Apply knockback
    mob.velocity.x += knockback.x;
    mob.velocity.y += knockback.y + 0.4;
    mob.velocity.z += knockback.z;

    // Set target to attacker (aggro)
    if (attackerId && mob.health > 0) {
      mob.target = attackerId;
      mob.state = 'chasing';
      mob.stateTicks = 0;

      // Enderman aggro
      if (mob.type === 'enderman') {
        mob.endermanAngry = true;
      }
    }

    // Check death
    if (mob.health <= 0) {
      return this.handleMobDeath(mob, source, attackerId, attackerName, lootingLevel, actualDamage, knockback);
    }

    return {
      damageDealt: actualDamage,
      killed: false,
      newHealth: mob.health,
      knockback,
    };
  }

  /**
   * Handle mob death: trigger death animation, calculate drops, emit event.
   */
  private handleMobDeath(
    mob: MobEntity,
    source: DamageSource,
    attackerId?: string,
    attackerName?: string,
    lootingLevel = 0,
    damageDealt = 0,
    knockback: Vec3 = { x: 0, y: 0, z: 0 },
  ): MobDamageResult {
    mob.deathTime = 1; // Start death animation (counts up to 20)
    mob.health = 0;
    mob.velocity.x = 0;
    mob.velocity.y = 0;
    mob.velocity.z = 0;

    // Calculate drops
    const drops = this.getDrops(mob, lootingLevel);

    // Get experience
    const def = getMobDef(mob.type);
    const experienceDrop = def?.stats.experienceDrop ?? 0;

    // Special: Slime splitting
    if (mob.type === 'slime' && mob.slimeSize !== 'small') {
      const nextSize: SlimeSize = mob.slimeSize === 'big' ? 'medium' : 'small';
      const sizeData = SLIME_SIZE_STATS[mob.slimeSize];
      const splitCount = sizeData.splitCount.min +
        Math.floor(Math.random() * (sizeData.splitCount.max - sizeData.splitCount.min + 1));

      for (let i = 0; i < splitCount; i++) {
        const offsetX = (Math.random() - 0.5) * 2;
        const offsetZ = (Math.random() - 0.5) * 2;
        const child = this.spawnMob(
          'slime',
          mob.position.x + offsetX,
          mob.position.y + 0.5,
          mob.position.z + offsetZ,
        );
        child.slimeSize = nextSize;
        child.maxHealth = SLIME_SIZE_STATS[nextSize].maxHealth;
        child.health = child.maxHealth;
        // Give the child slime a little velocity
        child.velocity.x = offsetX * 0.2;
        child.velocity.y = 0.3;
        child.velocity.z = offsetZ * 0.2;
      }
    }

    // Special: Creeper explosion on death (if fuse was active)
    if (mob.type === 'creeper' && mob.creeperFuseProgress >= CREEPER_CONFIG.FUSE_TICKS) {
      this.onCreeperExplode?.(mob, mob.creeperCharged);
    }

    // Emit death event
    const deathEvent: MobDeathEvent = {
      mobId: mob.id,
      mobType: mob.type,
      position: { ...mob.position },
      drops,
      experienceDrop,
      killerId: attackerId,
      killerName: attackerName,
    };
    this.onMobDeath?.(deathEvent);

    // Schedule removal after death animation (20 ticks)
    // The tick function will handle cleanup when deathTime >= 20

    return {
      damageDealt,
      killed: true,
      newHealth: 0,
      knockback,
    };
  }

  /**
   * Kill a mob instantly (for commands, etc.).
   *
   * @returns The drop results, or null if mob not found
   */
  killMob(id: string, lootingLevel = 0): MobDeathEvent | null {
    const mob = this.spawnManager.getMob(id);
    if (!mob || !mob.alive) return null;

    const drops = this.getDrops(mob, lootingLevel);
    const def = getMobDef(mob.type);

    mob.health = 0;
    mob.deathTime = 1;

    const event: MobDeathEvent = {
      mobId: mob.id,
      mobType: mob.type,
      position: { ...mob.position },
      drops,
      experienceDrop: def?.stats.experienceDrop ?? 0,
    };

    this.onMobDeath?.(event);
    return event;
  }

  // ---------------------------------------------------------------------------
  // Drop Calculation
  // ---------------------------------------------------------------------------

  /**
   * Calculate drops for a mob, applying Looting enchantment bonus.
   *
   * @param mob - The mob entity
   * @param lootingLevel - Looting enchantment level (0 = none)
   * @returns Array of item drops with quantities
   */
  getDrops(mob: MobEntity, lootingLevel = 0): DropResult[] {
    const def = getMobDef(mob.type);
    if (!def) return [];

    // Slimes only drop from small size
    if (mob.type === 'slime' && mob.slimeSize !== 'small') return [];

    const drops: DropResult[] = [];

    for (const drop of def.drops) {
      // Apply looting bonus to chance
      const adjustedChance = Math.min(1, drop.chance + drop.lootingBonus * lootingLevel);

      if (Math.random() > adjustedChance) continue;

      // Calculate count with looting bonus
      let count = drop.countMin + Math.floor(Math.random() * (drop.countMax - drop.countMin + 1));

      // Looting adds 0-1 per level to count
      if (lootingLevel > 0 && drop.lootingBonus > 0) {
        count += Math.floor(Math.random() * (lootingLevel + 1));
      }

      if (count > 0) {
        drops.push({ item: drop.item, count });
      }
    }

    // Special drops based on sheep wool
    if (mob.type === 'sheep') {
      const woolColor = (mob.metadata['woolColor'] as string) ?? 'white';
      const sheared = (mob.metadata['sheared'] as boolean) ?? false;
      if (!sheared) {
        drops.push({ item: `${woolColor}_wool`, count: 1 });
      }
    }

    return drops;
  }

  // ---------------------------------------------------------------------------
  // Tick All Mobs
  // ---------------------------------------------------------------------------

  /**
   * Tick all mob entities: AI, physics, death animation, and spawning.
   *
   * @param world - The chunked world
   * @param players - All player info objects
   * @param dayTime - Current time of day (0-24000)
   * @param biomeAt - Function to look up biome at world coordinates
   */
  tickAll(
    world: ChunkedWorld,
    players: AIPlayerInfo[],
    dayTime: number,
    biomeAt: (x: number, z: number) => BiomeType,
  ): void {
    const dt = 1 / MS_CONFIG.TICK_RATE;
    const allMobs = this.getAllMobs();

    // Tick spawn manager (handles spawn cycle and despawning)
    this.spawnManager.tick(world, players, this.difficulty, dayTime, biomeAt);

    // Tick each mob
    const toRemove: string[] = [];

    for (const mob of allMobs) {
      // Death animation
      if (mob.dying) {
        mob.deathTime++;
        if (mob.deathTime >= 20) {
          toRemove.push(mob.id);
        }
        continue;
      }

      if (!mob.alive) {
        toRemove.push(mob.id);
        continue;
      }

      // Fire damage
      if (mob.fireTicks > 0) {
        mob.fireTicks--;
        if (mob.fireTicks % MS_CONFIG.FIRE_DAMAGE_INTERVAL === 0) {
          this.damageMob(mob.id, 1, 'fire');
        }
      }

      // Sunlight burning for undead mobs
      if (getMobDef(mob.type)?.burnsInDaylight) {
        const isDay = dayTime >= MS_CONFIG.DAY_START && dayTime < MS_CONFIG.DUSK_START;
        if (isDay) {
          const highestBlock = world.getHighestBlock(
            Math.floor(mob.position.x),
            Math.floor(mob.position.z),
          );
          if (mob.position.y >= highestBlock) {
            // Set on fire
            if (mob.fireTicks <= 0) {
              mob.fireTicks = 160; // 8 seconds
            }
          }
        }
      }

      // Drowning (non-aquatic mobs in water)
      if (mob.inWater && !getMobDef(mob.type)?.canSwim) {
        // Simplified: just damage every 40 ticks
        if (mob.stateTicks % 40 === 0) {
          this.damageMob(mob.id, 1, 'drowning');
        }
      }

      // AI tick
      tickAI(mob, world, players, allMobs, dt, this.difficulty);

      // Check if mob is attacking a player
      if (mob.state === 'attacking' && mob.target && mob.ticksSinceLastAttack === 0) {
        const targetPlayer = players.find(p => p.id === mob.target);
        if (targetPlayer) {
          const targetPos = { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z };
          const dx = mob.position.x - targetPos.x;
          const dy = mob.position.y - targetPos.y;
          const dz = mob.position.z - targetPos.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (d < 3) {
            const difficultyIndex = this.difficulty === 'peaceful' ? 0 :
              this.difficulty === 'easy' ? 1 :
              this.difficulty === 'normal' ? 2 : 3;

            const damage = getMobDamage(mob.type, difficultyIndex);

            if (damage > 0) {
              // Check for ranged mobs
              const def = getMobDef(mob.type);
              if (mob.type === 'skeleton' || mob.type === 'stray') {
                // Ranged attack — shoot projectile
                this.onMobShootProjectile?.(mob, targetPos);
              } else {
                // Melee attack
                this.onMobAttackPlayer?.(mob, targetPlayer.id, damage);
              }
            }
          }
        }
      }
    }

    // Remove dead mobs
    for (const id of toRemove) {
      this.spawnManager.removeMob(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /** Serialize all mob state for persistence. */
  serialize(): SerializedMob[] {
    return this.spawnManager.serialize();
  }

  /** Deserialize and restore mob state. */
  deserialize(data: SerializedMob[]): void {
    this.spawnManager.deserialize(data);
  }
}
