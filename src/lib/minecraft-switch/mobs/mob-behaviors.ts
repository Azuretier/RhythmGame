// =============================================================================
// Minecraft: Nintendo Switch Edition — Mob Behaviors
// =============================================================================
// Shared behavior functions used by all mob AI tickers: wandering, target
// finding, chasing, fleeing, melee range checks, and movement application.
// Also includes the generic hostile, neutral, and passive AI tickers.
// =============================================================================

import { Block } from '@/types/minecraft-switch';
import type { Difficulty } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';
import { getMobDef } from './mob-registry';
import type { MobEntity } from './mob-entity';
import type { Vec3, AIPlayerInfo } from './mob-ai-types';
import {
  distSq,
  dist,
  normalizeHorizontal,
  findPath,
} from './mob-pathfinding';

// =============================================================================
// MOVEMENT APPLICATION
// =============================================================================

/**
 * Apply velocity and basic physics to a mob entity.
 */
export function applyMovement(mob: MobEntity, world: ChunkedWorld, _dt: number): void {
  const gravity = 0.08;
  const drag = 0.98;
  const waterDrag = 0.8;

  // Gravity
  if (!mob.onGround && !mob.inWater) {
    mob.velocity.y -= gravity;
  }

  // Drag
  const dragMult = mob.inWater ? waterDrag : drag;
  mob.velocity.x *= dragMult;
  mob.velocity.z *= dragMult;
  if (!mob.onGround) {
    mob.velocity.y *= drag;
  }

  // Proposed position
  const newX = mob.position.x + mob.velocity.x;
  const newY = mob.position.y + mob.velocity.y;
  const newZ = mob.position.z + mob.velocity.z;

  // Simplified collision: check the block at the new feet position
  const feetBlock = world.getBlock(Math.floor(newX), Math.floor(newY), Math.floor(newZ));
  const headBlock = world.getBlock(Math.floor(newX), Math.floor(newY + 1), Math.floor(newZ));
  const belowBlock = world.getBlock(Math.floor(newX), Math.floor(newY - 1), Math.floor(newZ));

  const passable: Set<number> = new Set([Block.Air, Block.Water, Block.Lava, Block.TallGrass, Block.Fern, Block.DeadBush]);

  // Update water/lava state
  mob.inWater = feetBlock === Block.Water || feetBlock === Block.StillWater;
  mob.inLava = feetBlock === Block.Lava || feetBlock === Block.StillLava;

  // Horizontal collision
  if (!passable.has(feetBlock as number) || !passable.has(headBlock as number)) {
    // Try step up (step height = 1 block)
    const stepFeet = world.getBlock(Math.floor(newX), Math.floor(mob.position.y + 1), Math.floor(newZ));
    const stepHead = world.getBlock(Math.floor(newX), Math.floor(mob.position.y + 2), Math.floor(newZ));

    if (passable.has(stepFeet as number) && passable.has(stepHead as number) && mob.onGround) {
      mob.position.x = newX;
      mob.position.y = mob.position.y + 1;
      mob.position.z = newZ;
    } else {
      // Blocked — stop horizontal movement
      mob.velocity.x = 0;
      mob.velocity.z = 0;
    }
  } else {
    mob.position.x = newX;
    mob.position.z = newZ;

    // Vertical movement
    if (newY < mob.position.y && !passable.has(belowBlock as number)) {
      // Landing on a block
      mob.position.y = Math.floor(mob.position.y);
      mob.velocity.y = 0;
      mob.onGround = true;
    } else if (newY > mob.position.y && !passable.has(headBlock as number)) {
      // Hit ceiling
      mob.velocity.y = 0;
    } else {
      mob.position.y = newY;
      mob.onGround = false;
    }
  }

  // Ground check (revalidate)
  const blockDirectlyBelow = world.getBlock(
    Math.floor(mob.position.x),
    Math.floor(mob.position.y) - 1,
    Math.floor(mob.position.z),
  );
  if (passable.has(blockDirectlyBelow as number)) {
    mob.onGround = false;
  } else if (mob.position.y - Math.floor(mob.position.y) < 0.01) {
    mob.onGround = true;
  }

  // Water buoyancy
  if (mob.inWater) {
    mob.velocity.y += 0.02;
    mob.onGround = false;
  }

  // Update yaw based on velocity direction
  if (Math.abs(mob.velocity.x) > 0.01 || Math.abs(mob.velocity.z) > 0.01) {
    mob.rotation.yaw = Math.atan2(mob.velocity.x, mob.velocity.z) * (180 / Math.PI);
  }
}

// =============================================================================
// WANDER BEHAVIOR — Random walking for idle mobs
// =============================================================================

/**
 * Pick a random nearby position and move toward it, then pause.
 */
export function wanderBehavior(mob: MobEntity, world: ChunkedWorld, speed: number): void {
  if (mob.state !== 'wandering') {
    mob.state = 'wandering';
    mob.stateTicks = 0;

    // Pick random target within 10 blocks
    const angle = Math.random() * Math.PI * 2;
    const distance = 3 + Math.random() * 7;
    const targetX = mob.position.x + Math.cos(angle) * distance;
    const targetZ = mob.position.z + Math.sin(angle) * distance;
    const targetY = mob.position.y;

    mob.pathNodes = [{ x: targetX, y: targetY, z: targetZ }];
    mob.pathIndex = 0;
  }

  // Move toward current path node
  if (mob.pathIndex < mob.pathNodes.length) {
    const target = mob.pathNodes[mob.pathIndex];
    const dx = target.x - mob.position.x;
    const dz = target.z - mob.position.z;
    const dSq = dx * dx + dz * dz;

    if (dSq < 1) {
      mob.pathIndex++;
    } else {
      const { nx, nz } = normalizeHorizontal(dx, dz);
      mob.velocity.x = nx * speed * 0.05;
      mob.velocity.z = nz * speed * 0.05;
    }
  }

  // Pause after reaching target or after 200 ticks
  if (mob.pathIndex >= mob.pathNodes.length || mob.stateTicks > 200) {
    mob.state = 'idle';
    mob.stateTicks = 0;
    mob.pathNodes = [];
    mob.pathIndex = 0;
    mob.velocity.x = 0;
    mob.velocity.z = 0;
  }
}

// =============================================================================
// HOSTILE TARGET BEHAVIOR — Find nearest player to attack
// =============================================================================

/**
 * Find and set the nearest valid player as the mob's target.
 * Returns the target player info, or null.
 */
export function findHostileTarget(
  mob: MobEntity,
  players: AIPlayerInfo[],
  followRange: number,
): AIPlayerInfo | null {
  let bestDist = followRange * followRange;
  let bestPlayer: AIPlayerInfo | null = null;

  for (const p of players) {
    const d = distSq(mob.position, { x: p.x, y: p.y, z: p.z });
    if (d < bestDist) {
      bestDist = d;
      bestPlayer = p;
    }
  }

  if (bestPlayer) {
    mob.target = bestPlayer.id;
  }
  return bestPlayer;
}

// =============================================================================
// CHASE BEHAVIOR — Move toward target
// =============================================================================

export function chaseBehavior(
  mob: MobEntity,
  target: Vec3,
  world: ChunkedWorld,
  speed: number,
): void {
  mob.state = 'chasing';

  // Recalculate path periodically
  if (mob.pathRecalcCooldown <= 0 || mob.pathNodes.length === 0) {
    mob.pathNodes = findPath(mob.position, target, world, 200);
    mob.pathIndex = 0;
    mob.pathRecalcCooldown = 20; // Recalc every second
  }

  // Follow path
  if (mob.pathIndex < mob.pathNodes.length) {
    const node = mob.pathNodes[mob.pathIndex];
    const dx = node.x - mob.position.x;
    const dz = node.z - mob.position.z;
    const dSq = dx * dx + dz * dz;

    if (dSq < 1) {
      mob.pathIndex++;
    } else {
      const { nx, nz } = normalizeHorizontal(dx, dz);
      mob.velocity.x = nx * speed * 0.05;
      mob.velocity.z = nz * speed * 0.05;
    }
  } else {
    // Direct approach when close or no path
    const dx = target.x - mob.position.x;
    const dz = target.z - mob.position.z;
    const { nx, nz } = normalizeHorizontal(dx, dz);
    mob.velocity.x = nx * speed * 0.05;
    mob.velocity.z = nz * speed * 0.05;
  }

  // Jump over obstacles
  if (mob.onGround && (Math.abs(mob.velocity.x) < 0.001 && Math.abs(mob.velocity.z) < 0.001)) {
    mob.velocity.y = 0.42;
  }
}

// =============================================================================
// FLEE BEHAVIOR — Move away from threat
// =============================================================================

export function fleeBehavior(mob: MobEntity, threat: Vec3, speed: number): void {
  mob.state = 'fleeing';

  const dx = mob.position.x - threat.x;
  const dz = mob.position.z - threat.z;
  const { nx, nz } = normalizeHorizontal(dx, dz);

  mob.velocity.x = nx * speed * 1.5 * 0.05;
  mob.velocity.z = nz * speed * 1.5 * 0.05;
}

// =============================================================================
// MELEE ATTACK CHECK
// =============================================================================

/**
 * Returns true if the mob is close enough to melee attack the target.
 */
export function isInMeleeRange(mob: MobEntity, target: Vec3, range = 2.0): boolean {
  return distSq(mob.position, target) < range * range;
}

// =============================================================================
// GENERIC HOSTILE AI
// =============================================================================

export function tickHostileAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
  difficulty: Difficulty,
): void {
  const def = getMobDef(mob.type);
  if (!def) return;
  const speed = def.stats.movementSpeed;
  const followRange = def.stats.followRange;

  // Peaceful = no hostile AI
  if (difficulty === 'peaceful') {
    wanderBehavior(mob, world, speed);
    return;
  }

  // Find target
  const targetPlayer = mob.target
    ? players.find(p => p.id === mob.target)
    : null;

  if (targetPlayer) {
    const targetPos = { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z };
    const d = dist(mob.position, targetPos);

    // Give up if too far
    if (d > 40) {
      mob.target = null;
      mob.state = 'idle';
      mob.stateTicks = 0;
      return;
    }

    // Melee attack
    if (isInMeleeRange(mob, targetPos)) {
      mob.state = 'attacking';
      mob.velocity.x = 0;
      mob.velocity.z = 0;
      // Attack cooldown: 20 ticks
      if (mob.ticksSinceLastAttack >= 20) {
        mob.ticksSinceLastAttack = 0;
        // Actual damage is applied by MobStateManager
      }
    } else {
      chaseBehavior(mob, targetPos, world, speed);
    }
  } else {
    // Try to find a new target
    findHostileTarget(mob, players, followRange);

    if (!mob.target) {
      // No target, wander
      if (mob.state === 'idle' && mob.stateTicks > 40 + Math.random() * 100) {
        wanderBehavior(mob, world, speed);
      } else if (mob.state !== 'wandering') {
        mob.state = 'idle';
      } else {
        wanderBehavior(mob, world, speed);
      }
    }
  }
}

// =============================================================================
// GENERIC NEUTRAL AI — Only attacks if provoked
// =============================================================================

export function tickNeutralAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  _dt: number,
  _difficulty: Difficulty,
): void {
  const def = getMobDef(mob.type);
  if (!def) return;
  const speed = def.stats.movementSpeed;

  if (mob.target) {
    // Has been provoked — act hostile
    const targetPlayer = players.find(p => p.id === mob.target);
    if (targetPlayer) {
      const targetPos = { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z };
      const d = dist(mob.position, targetPos);

      if (d > 40) {
        mob.target = null;
        mob.state = 'idle';
        return;
      }

      if (isInMeleeRange(mob, targetPos)) {
        mob.state = 'attacking';
        mob.velocity.x = 0;
        mob.velocity.z = 0;
        if (mob.ticksSinceLastAttack >= 20) {
          mob.ticksSinceLastAttack = 0;
        }
      } else {
        chaseBehavior(mob, targetPos, world, speed);
      }
    } else {
      mob.target = null;
    }
  } else {
    // Peaceful wander
    if (mob.state === 'idle' && mob.stateTicks > 60 + Math.random() * 120) {
      wanderBehavior(mob, world, speed * 0.5);
    } else if (mob.state !== 'wandering') {
      mob.state = 'idle';
    } else {
      wanderBehavior(mob, world, speed * 0.5);
    }
  }
}

// =============================================================================
// GENERIC PASSIVE AI — Wander slowly, follow players with breeding items
// =============================================================================

export function tickPassiveAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  _dt: number,
): void {
  const def = getMobDef(mob.type);
  if (!def) return;
  const speed = def.stats.movementSpeed;

  // Follow player holding breeding items
  if (def.breedable && def.breedingItems.length > 0) {
    for (const p of players) {
      if (p.heldItem && def.breedingItems.includes(p.heldItem)) {
        const pPos = { x: p.x, y: p.y, z: p.z };
        const d = dist(mob.position, pPos);
        if (d < 10 && d > 2) {
          const dx = pPos.x - mob.position.x;
          const dz = pPos.z - mob.position.z;
          const { nx, nz } = normalizeHorizontal(dx, dz);
          mob.velocity.x = nx * speed * 0.05;
          mob.velocity.z = nz * speed * 0.05;
          mob.state = 'chasing';
          return;
        }
      }
    }
  }

  // Normal wander
  if (mob.state === 'idle' && mob.stateTicks > 80 + Math.random() * 160) {
    wanderBehavior(mob, world, speed * 0.5);
  } else if (mob.state !== 'wandering') {
    mob.state = 'idle';
    mob.velocity.x = 0;
    mob.velocity.z = 0;
  } else {
    wanderBehavior(mob, world, speed * 0.5);
  }
}
