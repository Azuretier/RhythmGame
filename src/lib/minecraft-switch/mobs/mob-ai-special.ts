// =============================================================================
// Minecraft: Nintendo Switch Edition — Special Mob AI Tickers
// =============================================================================
// AI implementations for mobs with unique behaviors: Creeper (fuse/explode),
// Enderman (teleport/stare), Skeleton (ranged kiting), Spider (climbing/pounce),
// Slime (hopping), and Phantom (circle/swoop).
// =============================================================================

import { Block } from '@/types/minecraft-switch';
import type { Difficulty } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';
import {
  CREEPER_CONFIG,
  ENDERMAN_CONFIG,
  SKELETON_CONFIG,
  SPIDER_CONFIG,
  PHANTOM_CONFIG,
  SLIME_SIZE_STATS,
} from './mob-registry';
import type { MobEntity } from './mob-entity';
import type { AIPlayerInfo } from './mob-ai-types';
import {
  dist,
  normalizeHorizontal,
  isSolidBlock,
  isWalkable,
} from './mob-pathfinding';
import {
  wanderBehavior,
  findHostileTarget,
  chaseBehavior,
  fleeBehavior,
  isInMeleeRange,
  tickHostileAI,
  tickNeutralAI,
} from './mob-behaviors';

// =============================================================================
// CREEPER AI — Chase and explode
// =============================================================================

export function tickCreeperAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
  difficulty: Difficulty,
): void {
  const speed = 0.25;

  if (difficulty === 'peaceful') {
    wanderBehavior(mob, world, speed);
    return;
  }

  // Flee from cats (simplified — no cats implemented yet, but structure is here)
  // TODO: Check for nearby cat entities

  const targetPlayer = mob.target
    ? players.find(p => p.id === mob.target)
    : null;

  if (targetPlayer) {
    const targetPos = { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z };
    const d = dist(mob.position, targetPos);

    if (d > 40) {
      mob.target = null;
      mob.creeperFuseProgress = 0;
      mob.state = 'idle';
      return;
    }

    if (d <= CREEPER_CONFIG.IGNITE_RANGE) {
      // Start fuse
      mob.state = 'special';
      mob.velocity.x = 0;
      mob.velocity.z = 0;
      mob.creeperFuseProgress++;

      // Explode when fuse completes
      if (mob.creeperFuseProgress >= CREEPER_CONFIG.FUSE_TICKS) {
        // Explosion is handled by MobStateManager
        mob.health = 0; // Creeper dies in explosion
      }
    } else {
      // Reset fuse if player moves away
      if (mob.creeperFuseProgress > 0) {
        mob.creeperFuseProgress = Math.max(0, mob.creeperFuseProgress - 1);
      }
      chaseBehavior(mob, targetPos, world, speed);
    }
  } else {
    mob.creeperFuseProgress = 0;
    findHostileTarget(mob, players, 16);

    if (!mob.target) {
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
// ENDERMAN AI — Teleport, neutral until provoked
// =============================================================================

export function tickEndermanAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
  difficulty: Difficulty,
): void {
  const speed = 0.3;

  if (difficulty === 'peaceful') {
    wanderBehavior(mob, world, speed);
    return;
  }

  // Water damage
  if (mob.inWater) {
    mob.health -= ENDERMAN_CONFIG.WATER_DAMAGE;
    // Teleport away from water
    attemptEndermanTeleport(mob, world);
  }

  // Random teleport when idle
  if (mob.state === 'idle' && mob.endermanTeleportCooldown <= 0 && Math.random() < 0.01) {
    attemptEndermanTeleport(mob, world);
    mob.endermanTeleportCooldown = ENDERMAN_CONFIG.TELEPORT_COOLDOWN;
  }

  // Check if player is looking at this enderman (simplified stare detection)
  if (!mob.endermanAngry && !mob.target) {
    for (const p of players) {
      const d = dist(mob.position, { x: p.x, y: p.y, z: p.z });
      if (d < ENDERMAN_CONFIG.STARE_PROVOKE_RANGE) {
        // Simplified look detection: check if player yaw roughly points at enderman
        const dx = mob.position.x - p.x;
        const dz = mob.position.z - p.z;
        const angleToMob = Math.atan2(dx, dz) * (180 / Math.PI);
        const angleDiff = Math.abs(((p.yaw - angleToMob + 540) % 360) - 180);

        // Also check pitch (must be looking roughly at mob height)
        const dy = (mob.position.y + 1.5) - (p.y + 1.62);
        const hDist = Math.sqrt(dx * dx + dz * dz);
        const pitchToMob = -Math.atan2(dy, hDist) * (180 / Math.PI);
        const pitchDiff = Math.abs(p.pitch - pitchToMob);

        if (angleDiff < 5 && pitchDiff < 10 && d < 32) {
          mob.endermanAngry = true;
          mob.target = p.id;
          mob.state = 'chasing';
        }
      }
    }
  }

  if (mob.target) {
    const targetPlayer = players.find(p => p.id === mob.target);
    if (targetPlayer) {
      const targetPos = { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z };
      const d = dist(mob.position, targetPos);

      if (d > 40) {
        mob.target = null;
        mob.endermanAngry = false;
        mob.state = 'idle';
        return;
      }

      if (isInMeleeRange(mob, targetPos, 2.5)) {
        mob.state = 'attacking';
        mob.velocity.x = 0;
        mob.velocity.z = 0;
        if (mob.ticksSinceLastAttack >= 20) {
          mob.ticksSinceLastAttack = 0;
        }
      } else {
        // Occasionally teleport closer
        if (mob.endermanTeleportCooldown <= 0 && d > 10 && Math.random() < 0.1) {
          const angle = Math.atan2(targetPos.z - mob.position.z, targetPos.x - mob.position.x);
          const teleportDist = 3 + Math.random() * 5;
          const tx = targetPos.x - Math.cos(angle) * teleportDist;
          const tz = targetPos.z - Math.sin(angle) * teleportDist;
          const ty = findSafeY(world, Math.floor(tx), Math.floor(mob.position.y), Math.floor(tz));
          if (ty >= 0) {
            mob.position.x = tx;
            mob.position.y = ty;
            mob.position.z = tz;
            mob.endermanTeleportCooldown = 20;
          }
        }
        chaseBehavior(mob, targetPos, world, speed);
      }
    } else {
      mob.target = null;
      mob.endermanAngry = false;
    }
  } else {
    if (mob.state === 'idle' && mob.stateTicks > 60 + Math.random() * 120) {
      wanderBehavior(mob, world, speed * 0.5);
    } else if (mob.state !== 'wandering') {
      mob.state = 'idle';
    } else {
      wanderBehavior(mob, world, speed * 0.5);
    }
  }
}

/** Attempt to teleport an enderman to a random nearby safe location. */
function attemptEndermanTeleport(mob: MobEntity, world: ChunkedWorld): boolean {
  for (let attempt = 0; attempt < 10; attempt++) {
    const range = ENDERMAN_CONFIG.TELEPORT_RANGE;
    const tx = mob.position.x + (Math.random() * 2 - 1) * range;
    const tz = mob.position.z + (Math.random() * 2 - 1) * range;
    const ty = findSafeY(world, Math.floor(tx), Math.floor(mob.position.y), Math.floor(tz));

    if (ty >= 0) {
      // Don't teleport into water
      const block = world.getBlock(Math.floor(tx), ty, Math.floor(tz));
      if (block === Block.Water || block === Block.StillWater) continue;

      mob.position.x = tx;
      mob.position.y = ty;
      mob.position.z = tz;
      mob.endermanTeleportCooldown = ENDERMAN_CONFIG.TELEPORT_COOLDOWN;
      return true;
    }
  }
  return false;
}

/** Find a safe Y level to stand at for a given X,Z position. */
function findSafeY(world: ChunkedWorld, x: number, startY: number, z: number): number {
  // Scan up and down from startY
  for (let dy = 0; dy < 16; dy++) {
    for (const sign of [1, -1]) {
      const y = startY + dy * sign;
      if (y < 1 || y > 250) continue;
      if (isWalkable(world, x, y, z)) return y;
    }
  }
  return -1;
}

// =============================================================================
// SKELETON / STRAY AI — Ranged kiting
// =============================================================================

export function tickSkeletonAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
  difficulty: Difficulty,
): void {
  const speed = 0.25;

  if (difficulty === 'peaceful') {
    wanderBehavior(mob, world, speed);
    return;
  }

  const targetPlayer = mob.target
    ? players.find(p => p.id === mob.target)
    : null;

  if (targetPlayer) {
    const targetPos = { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z };
    const d = dist(mob.position, targetPos);

    if (d > 40) {
      mob.target = null;
      mob.state = 'idle';
      return;
    }

    const preferredDist = SKELETON_CONFIG.PREFERRED_DISTANCE;

    if (d < preferredDist - 2) {
      // Too close, back away
      fleeBehavior(mob, targetPos, speed * SKELETON_CONFIG.STRAFE_SPEED);
    } else if (d > preferredDist + 4) {
      // Too far, move closer
      chaseBehavior(mob, targetPos, world, speed);
    } else {
      // At preferred distance — strafe and shoot
      mob.state = 'attacking';

      // Strafe sideways
      const dx = targetPos.x - mob.position.x;
      const dz = targetPos.z - mob.position.z;
      const { nx, nz } = normalizeHorizontal(dx, dz);
      // Perpendicular direction for strafing
      const strafeDir = (mob.stateTicks % 80 < 40) ? 1 : -1;
      mob.velocity.x = -nz * SKELETON_CONFIG.STRAFE_SPEED * 0.05 * strafeDir;
      mob.velocity.z = nx * SKELETON_CONFIG.STRAFE_SPEED * 0.05 * strafeDir;

      // Face target
      mob.rotation.yaw = Math.atan2(dx, dz) * (180 / Math.PI);

      // Shoot arrow at fire rate
      if (mob.ticksSinceLastAttack >= SKELETON_CONFIG.FIRE_RATE_TICKS) {
        mob.ticksSinceLastAttack = 0;
        // Arrow creation handled by MobStateManager
      }
    }
  } else {
    findHostileTarget(mob, players, 16);

    if (!mob.target) {
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
// SPIDER AI — Climb walls, neutral in day, hostile at night
// =============================================================================

export function tickSpiderAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
  difficulty: Difficulty,
): void {
  const speed = 0.3;

  if (difficulty === 'peaceful') {
    wanderBehavior(mob, world, speed);
    return;
  }

  // Light-level-based aggression (simplified: use metadata for light)
  const lightLevel = (mob.metadata['lightLevel'] as number) ?? 0;
  const isHostile = lightLevel < SPIDER_CONFIG.NEUTRAL_LIGHT_LEVEL;

  if (isHostile || mob.target) {
    // Act as hostile
    tickHostileAI(mob, world, players, dt, difficulty);

    // Spider wall climbing: if blocked horizontally, climb
    if (mob.state === 'chasing' && !mob.onGround) {
      // Check if there is a wall in front
      const faceX = mob.position.x + Math.sin(mob.rotation.yaw * Math.PI / 180) * 0.6;
      const faceZ = mob.position.z + Math.cos(mob.rotation.yaw * Math.PI / 180) * 0.6;
      if (isSolidBlock(world, faceX, mob.position.y, faceZ)) {
        mob.velocity.y = SPIDER_CONFIG.CLIMB_SPEED;
      }
    }

    // Pounce attack
    if (mob.target) {
      const pounceTarget = players.find(p => p.id === mob.target);
      if (pounceTarget) {
        const d = dist(mob.position, { x: pounceTarget.x, y: pounceTarget.y, z: pounceTarget.z });
        if (d < SPIDER_CONFIG.POUNCE_RANGE && d > 2 && mob.onGround) {
          const dx = pounceTarget.x - mob.position.x;
          const dz = pounceTarget.z - mob.position.z;
          const { nx, nz } = normalizeHorizontal(dx, dz);
          mob.velocity.x = nx * SPIDER_CONFIG.POUNCE_VELOCITY;
          mob.velocity.y = 0.3;
          mob.velocity.z = nz * SPIDER_CONFIG.POUNCE_VELOCITY;
        }
      }
    }
  } else {
    // Neutral during day — wander
    tickNeutralAI(mob, world, players, dt, difficulty);
  }
}

// =============================================================================
// SLIME AI — Hop movement
// =============================================================================

export function tickSlimeAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
  difficulty: Difficulty,
): void {
  const sizeStats = SLIME_SIZE_STATS[mob.slimeSize];
  const speed = sizeStats.movementSpeed;

  if (difficulty === 'peaceful') {
    // Small slimes are passive even in peaceful
    return;
  }

  // Slimes hop
  if (mob.onGround && mob.stateTicks % 40 === 0) {
    // Find target
    const targetPlayer = mob.target
      ? players.find(p => p.id === mob.target)
      : null;

    if (targetPlayer) {
      const targetPos = { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z };
      const dx = targetPos.x - mob.position.x;
      const dz = targetPos.z - mob.position.z;
      const { nx, nz } = normalizeHorizontal(dx, dz);
      mob.velocity.x = nx * speed * 0.15;
      mob.velocity.y = 0.42;
      mob.velocity.z = nz * speed * 0.15;
    } else {
      // Random hop
      const angle = Math.random() * Math.PI * 2;
      mob.velocity.x = Math.cos(angle) * speed * 0.1;
      mob.velocity.y = 0.42;
      mob.velocity.z = Math.sin(angle) * speed * 0.1;
    }
  }

  // Small slimes don't attack
  if (mob.slimeSize === 'small') return;

  // Find target
  if (!mob.target) {
    findHostileTarget(mob, players, 16);
  } else {
    const targetPlayer = players.find(p => p.id === mob.target);
    if (!targetPlayer || dist(mob.position, { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z }) > 40) {
      mob.target = null;
    }
  }

  // Melee attack check
  if (mob.target) {
    const tp = players.find(p => p.id === mob.target);
    if (tp && isInMeleeRange(mob, { x: tp.x, y: tp.y, z: tp.z })) {
      mob.state = 'attacking';
      if (mob.ticksSinceLastAttack >= 20) {
        mob.ticksSinceLastAttack = 0;
      }
    }
  }
}

// =============================================================================
// PHANTOM AI — Circle above, swoop attack
// =============================================================================

export function tickPhantomAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
  difficulty: Difficulty,
): void {
  const speed = 0.5;

  if (difficulty === 'peaceful') return;

  // Phantoms fly — keep airborne
  mob.onGround = false;

  const targetPlayer = mob.target
    ? players.find(p => p.id === mob.target)
    : null;

  if (targetPlayer) {
    const targetPos = { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z };
    const d = dist(mob.position, targetPos);

    if (d > 64) {
      mob.target = null;
      mob.state = 'idle';
      return;
    }

    const swoopPhase = mob.stateTicks % PHANTOM_CONFIG.SWOOP_INTERVAL;

    if (swoopPhase < 20) {
      // Swoop attack phase — dive toward player
      mob.state = 'attacking';
      const dx = targetPos.x - mob.position.x;
      const dy = targetPos.y - mob.position.y;
      const dz = targetPos.z - mob.position.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 0.1) {
        mob.velocity.x = (dx / len) * PHANTOM_CONFIG.SWOOP_SPEED * 0.1;
        mob.velocity.y = (dy / len) * PHANTOM_CONFIG.SWOOP_SPEED * 0.1;
        mob.velocity.z = (dz / len) * PHANTOM_CONFIG.SWOOP_SPEED * 0.1;
      }

      // Attack check
      if (isInMeleeRange(mob, targetPos, 2.5) && mob.ticksSinceLastAttack >= 20) {
        mob.ticksSinceLastAttack = 0;
      }
    } else {
      // Circle phase — orbit above player
      mob.state = 'special';
      const circleAngle = (mob.stateTicks * 0.05) % (Math.PI * 2);
      const targetCircleX = targetPos.x + Math.cos(circleAngle) * PHANTOM_CONFIG.CIRCLE_RADIUS;
      const targetCircleZ = targetPos.z + Math.sin(circleAngle) * PHANTOM_CONFIG.CIRCLE_RADIUS;
      const targetCircleY = targetPos.y + PHANTOM_CONFIG.CIRCLE_HEIGHT;

      const dx = targetCircleX - mob.position.x;
      const dy = targetCircleY - mob.position.y;
      const dz = targetCircleZ - mob.position.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 0.1) {
        mob.velocity.x = (dx / len) * speed * 0.05;
        mob.velocity.y = (dy / len) * speed * 0.05;
        mob.velocity.z = (dz / len) * speed * 0.05;
      }
    }
  } else {
    // Find target
    findHostileTarget(mob, players, 64);

    if (!mob.target) {
      // Wander in air
      mob.state = 'wandering';
      if (mob.stateTicks % 60 === 0) {
        const angle = Math.random() * Math.PI * 2;
        mob.velocity.x = Math.cos(angle) * speed * 0.03;
        mob.velocity.z = Math.sin(angle) * speed * 0.03;
      }
      // Maintain altitude
      if (mob.position.y < 70) mob.velocity.y = 0.02;
    }
  }
}
