// =============================================================================
// Minecraft: Nintendo Switch Edition — MobEntity Class
// =============================================================================
// Runtime representation of a single mob in the world. Holds position,
// velocity, health, AI state, pathfinding data, and mob-specific metadata.
// =============================================================================

import type { BlockId, MobType } from '@/types/minecraft-switch';
import type { SlimeSize } from './mob-registry';
import { getMobDef } from './mob-registry';
import type { Vec3, Rotation, MobAIState } from './mob-ai-types';

/**
 * MobEntity represents the runtime state of a single mob in the world.
 * It holds position, velocity, health, AI state, pathfinding data,
 * and mob-specific metadata.
 */
export class MobEntity {
  /** Unique entity ID. */
  readonly id: string;
  /** Mob type from the registry. */
  readonly type: MobType;

  // --- Spatial ---
  position: Vec3;
  velocity: Vec3;
  rotation: Rotation;

  // --- Health ---
  health: number;
  maxHealth: number;

  // --- AI ---
  target: string | null;
  state: MobAIState;
  stateTicks: number; // ticks since entering current state
  ticksSinceLastAttack: number;
  hurtTime: number;
  deathTime: number;
  noAITicks: number; // ticks of stunned/frozen state

  // --- Pathfinding ---
  pathNodes: Vec3[];
  pathIndex: number;
  pathRecalcCooldown: number;

  // --- Physics ---
  onGround: boolean;
  inWater: boolean;
  inLava: boolean;

  // --- Mob-specific metadata ---
  metadata: Record<string, unknown>;

  // --- Persistence ---
  /** Custom name (from name tag). Named mobs never despawn. */
  customName: string | null;
  /** Whether the mob has been tamed. */
  tamed: boolean;
  /** Owner player ID (if tamed). */
  ownerId: string | null;
  /** If true, this mob will never despawn. */
  persistent: boolean;
  /** Ticks since this mob was last near a player. */
  ticksSincePlayerNearby: number;

  // --- Slime-specific ---
  slimeSize: SlimeSize;

  // --- Creeper-specific ---
  creeperFuseProgress: number;
  creeperCharged: boolean;

  // --- Enderman-specific ---
  endermanTeleportCooldown: number;
  endermanAngry: boolean;
  endermanCarriedBlock: BlockId | null;

  // --- Fire ---
  fireTicks: number;

  constructor(id: string, type: MobType, x: number, y: number, z: number) {
    this.id = id;
    this.type = type;

    const def = getMobDef(type);
    const maxHp = def?.stats.maxHealth ?? 20;

    this.position = { x, y, z };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotation = { yaw: Math.random() * 360, pitch: 0 };

    this.health = maxHp;
    this.maxHealth = maxHp;

    this.target = null;
    this.state = 'idle';
    this.stateTicks = 0;
    this.ticksSinceLastAttack = 0;
    this.hurtTime = 0;
    this.deathTime = 0;
    this.noAITicks = 0;

    this.pathNodes = [];
    this.pathIndex = 0;
    this.pathRecalcCooldown = 0;

    this.onGround = false;
    this.inWater = false;
    this.inLava = false;

    this.metadata = {};
    this.customName = null;
    this.tamed = false;
    this.ownerId = null;
    this.persistent = false;
    this.ticksSincePlayerNearby = 0;

    this.slimeSize = 'big';
    this.creeperFuseProgress = 0;
    this.creeperCharged = false;
    this.endermanTeleportCooldown = 0;
    this.endermanAngry = false;
    this.endermanCarriedBlock = null;
    this.fireTicks = 0;
  }

  /** Whether this mob is alive. */
  get alive(): boolean {
    return this.health > 0 && this.deathTime === 0;
  }

  /** Whether this mob is dead and playing death animation. */
  get dying(): boolean {
    return this.deathTime > 0;
  }

  /** Whether this entity should never despawn. */
  get neverDespawn(): boolean {
    return this.persistent || this.tamed || this.customName !== null;
  }
}
