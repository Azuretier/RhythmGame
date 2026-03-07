// =============================================================================
// Minecraft: Nintendo Switch Edition — Boss & Complex Mob AI
// =============================================================================
// AI implementations for boss-tier and complex mobs: Ender Dragon (phase-based
// boss fight), Wither (flying skull shooter), Wolf (pack behavior, tameable),
// and Iron Golem (village patrol, hostile mob targeting).
// =============================================================================

import type { Difficulty } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';
import { getMobDef } from './mob-registry';
import type { MobEntity } from './mob-entity';
import type { AIPlayerInfo } from './mob-ai-types';
import {
  distSq,
  dist,
} from './mob-pathfinding';
import {
  wanderBehavior,
  findHostileTarget,
  chaseBehavior,
  isInMeleeRange,
  tickNeutralAI,
} from './mob-behaviors';

// =============================================================================
// WOLF AI — Pack behavior, tameable
// =============================================================================

export function tickWolfAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  allMobs: MobEntity[],
  dt: number,
  difficulty: Difficulty,
): void {
  const speed = 0.3;

  if (mob.tamed && mob.ownerId) {
    // Tamed wolf: follow owner
    const owner = players.find(p => p.id === mob.ownerId);
    if (owner) {
      const ownerPos = { x: owner.x, y: owner.y, z: owner.z };
      const d = dist(mob.position, ownerPos);

      if (d > 10) {
        // Teleport to owner if too far
        mob.position.x = owner.x + (Math.random() * 4 - 2);
        mob.position.y = owner.y;
        mob.position.z = owner.z + (Math.random() * 4 - 2);
      } else if (d > 3) {
        chaseBehavior(mob, ownerPos, world, speed);
      } else {
        mob.state = 'idle';
        mob.velocity.x = 0;
        mob.velocity.z = 0;
      }

      // Attack owner's target if they hit something
      if (mob.target) {
        const targetPlayer = players.find(p => p.id === mob.target);
        if (targetPlayer) {
          const targetPos = { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z };
          if (isInMeleeRange(mob, targetPos)) {
            mob.state = 'attacking';
            if (mob.ticksSinceLastAttack >= 20) {
              mob.ticksSinceLastAttack = 0;
            }
          } else {
            chaseBehavior(mob, targetPos, world, speed);
          }
        }
      }
    } else {
      // Owner not found, sit and wait
      mob.state = 'idle';
      mob.velocity.x = 0;
      mob.velocity.z = 0;
    }
    return;
  }

  // Wild wolf — neutral with pack behavior
  if (mob.target) {
    // Provoked — all nearby wolves also target the attacker
    const nearbyWolves = allMobs.filter(m =>
      m.type === 'wolf' && m.id !== mob.id && !m.tamed &&
      distSq(m.position, mob.position) < 400, // 20 blocks
    );
    for (const wolf of nearbyWolves) {
      if (!wolf.target) {
        wolf.target = mob.target;
        wolf.state = 'chasing';
      }
    }
  }

  tickNeutralAI(mob, world, players, dt, difficulty);
}

// =============================================================================
// IRON GOLEM AI — Patrol village, attack hostiles
// =============================================================================

export function tickIronGolemAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  allMobs: MobEntity[],
  _dt: number,
  _difficulty: Difficulty,
): void {
  const speed = 0.25;

  // Find nearby hostile mobs to attack
  if (!mob.target) {
    let nearestHostile: MobEntity | null = null;
    let nearestDist = Infinity;

    for (const other of allMobs) {
      if (other.id === mob.id) continue;
      const otherDef = getMobDef(other.type);
      if (!otherDef || otherDef.category !== 'hostile') continue;
      if (!other.alive) continue;

      const d = dist(mob.position, other.position);
      if (d < 20 && d < nearestDist) {
        nearestDist = d;
        nearestHostile = other;
      }
    }

    if (nearestHostile) {
      mob.target = nearestHostile.id;
      mob.state = 'chasing';
    }
  }

  if (mob.target) {
    // Target could be a mob or a player
    const targetMob = allMobs.find(m => m.id === mob.target);
    if (targetMob && targetMob.alive) {
      const d = dist(mob.position, targetMob.position);
      if (d > 30) {
        mob.target = null;
        mob.state = 'idle';
        return;
      }
      if (isInMeleeRange(mob, targetMob.position, 2.5)) {
        mob.state = 'attacking';
        mob.velocity.x = 0;
        mob.velocity.z = 0;
        if (mob.ticksSinceLastAttack >= 20) {
          mob.ticksSinceLastAttack = 0;
        }
      } else {
        chaseBehavior(mob, targetMob.position, world, speed);
      }
    } else {
      mob.target = null;
    }
  } else {
    // Patrol — slow wander
    if (mob.state === 'idle' && mob.stateTicks > 100 + Math.random() * 200) {
      wanderBehavior(mob, world, speed * 0.5);
    } else if (mob.state !== 'wandering') {
      mob.state = 'idle';
      mob.velocity.x = 0;
      mob.velocity.z = 0;
    } else {
      wanderBehavior(mob, world, speed * 0.5);
    }
  }
}

// =============================================================================
// ENDER DRAGON AI — Phase-based boss fight
// =============================================================================

type DragonPhase = 'circling' | 'strafing' | 'perching' | 'charging' | 'breath';

export function tickEnderDragonAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  _dt: number,
  _difficulty: Difficulty,
): void {
  const speed = 0.7;
  mob.onGround = false; // Always flying

  const phase = (mob.metadata['dragonPhase'] as DragonPhase) ?? 'circling';
  const phaseTicks = (mob.metadata['phaseTicks'] as number) ?? 0;

  mob.metadata['phaseTicks'] = phaseTicks + 1;

  switch (phase) {
    case 'circling': {
      // Circle the End fountain (0, 64, 0)
      const centerX = 0;
      const centerZ = 0;
      const circleAngle = (phaseTicks * 0.02) % (Math.PI * 2);
      const radius = 50;
      const targetX = centerX + Math.cos(circleAngle) * radius;
      const targetZ = centerZ + Math.sin(circleAngle) * radius;
      const targetY = 80 + Math.sin(phaseTicks * 0.01) * 10;

      const dx = targetX - mob.position.x;
      const dy = targetY - mob.position.y;
      const dz = targetZ - mob.position.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 0.1) {
        mob.velocity.x = (dx / len) * speed * 0.05;
        mob.velocity.y = (dy / len) * speed * 0.05;
        mob.velocity.z = (dz / len) * speed * 0.05;
      }

      // Transition to strafing after ~400 ticks
      if (phaseTicks > 400 && players.length > 0) {
        mob.metadata['dragonPhase'] = 'strafing';
        mob.metadata['phaseTicks'] = 0;
      }
      break;
    }

    case 'strafing': {
      // Strafe toward a player and deal charge damage
      const nearestPlayer = players[0];
      if (nearestPlayer) {
        const targetPos = { x: nearestPlayer.x, y: nearestPlayer.y + 2, z: nearestPlayer.z };
        const dx = targetPos.x - mob.position.x;
        const dy = targetPos.y - mob.position.y;
        const dz = targetPos.z - mob.position.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 0.1) {
          mob.velocity.x = (dx / len) * speed * 0.08;
          mob.velocity.y = (dy / len) * speed * 0.08;
          mob.velocity.z = (dz / len) * speed * 0.08;
        }

        if (len < 5 && mob.ticksSinceLastAttack >= 20) {
          mob.state = 'attacking';
          mob.ticksSinceLastAttack = 0;
        }
      }

      if (phaseTicks > 200) {
        mob.metadata['dragonPhase'] = 'perching';
        mob.metadata['phaseTicks'] = 0;
      }
      break;
    }

    case 'perching': {
      // Land on the fountain
      const perchX = 0;
      const perchY = 64;
      const perchZ = 0;
      const dx = perchX - mob.position.x;
      const dy = perchY - mob.position.y;
      const dz = perchZ - mob.position.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (len > 2) {
        mob.velocity.x = (dx / len) * speed * 0.04;
        mob.velocity.y = (dy / len) * speed * 0.04;
        mob.velocity.z = (dz / len) * speed * 0.04;
      } else {
        mob.velocity.x = 0;
        mob.velocity.y = 0;
        mob.velocity.z = 0;
        mob.state = 'special'; // Perched, vulnerable

        // After perching for a while, transition to breath or circling
        if (phaseTicks > 300) {
          mob.metadata['dragonPhase'] = 'breath';
          mob.metadata['phaseTicks'] = 0;
        }
      }
      break;
    }

    case 'breath': {
      // Dragon breath attack while perched
      mob.state = 'special';
      // Breath particles and area damage handled by MobStateManager

      if (phaseTicks > 100) {
        mob.metadata['dragonPhase'] = 'circling';
        mob.metadata['phaseTicks'] = 0;
      }
      break;
    }

    case 'charging': {
      // Direct charge attack
      const nearestPlayer = players[0];
      if (nearestPlayer) {
        const targetPos = { x: nearestPlayer.x, y: nearestPlayer.y, z: nearestPlayer.z };
        const dx = targetPos.x - mob.position.x;
        const dy = targetPos.y - mob.position.y;
        const dz = targetPos.z - mob.position.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 0.1) {
          mob.velocity.x = (dx / len) * speed * 0.12;
          mob.velocity.y = (dy / len) * speed * 0.12;
          mob.velocity.z = (dz / len) * speed * 0.12;
        }
      }

      if (phaseTicks > 100) {
        mob.metadata['dragonPhase'] = 'circling';
        mob.metadata['phaseTicks'] = 0;
      }
      break;
    }
  }
}

// =============================================================================
// WITHER AI — Flying boss, skull projectiles
// =============================================================================

export function tickWitherAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  _dt: number,
  _difficulty: Difficulty,
): void {
  const speed = 0.6;
  mob.onGround = false; // Always flying

  // Wither shield phase (half health)
  const isShielded = mob.health <= mob.maxHealth / 2;
  if (isShielded) {
    mob.metadata['witherArmor'] = true;
  }

  // Find target
  if (!mob.target) {
    findHostileTarget(mob, players, 70);
  }

  const targetPlayer = mob.target
    ? players.find(p => p.id === mob.target)
    : null;

  if (targetPlayer) {
    const targetPos = { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z };
    const d = dist(mob.position, targetPos);

    // Maintain distance — hover above target
    const hoverY = targetPos.y + 10;
    const dx = targetPos.x - mob.position.x;
    const dy = hoverY - mob.position.y;
    const dz = targetPos.z - mob.position.z;

    if (d > 10) {
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 0.1) {
        mob.velocity.x = (dx / len) * speed * 0.05;
        mob.velocity.y = (dy / len) * speed * 0.05;
        mob.velocity.z = (dz / len) * speed * 0.05;
      }
    } else {
      // Strafe
      const circleAngle = (mob.stateTicks * 0.03) % (Math.PI * 2);
      mob.velocity.x = Math.cos(circleAngle) * speed * 0.03;
      mob.velocity.y = (hoverY - mob.position.y) * 0.05;
      mob.velocity.z = Math.sin(circleAngle) * speed * 0.03;
    }

    // Shoot wither skulls
    if (mob.ticksSinceLastAttack >= 20) {
      mob.ticksSinceLastAttack = 0;
      mob.state = 'attacking';
      // Skull projectile creation handled by MobStateManager
    }
  } else {
    // Random flight
    if (mob.stateTicks % 60 === 0) {
      mob.velocity.x = (Math.random() - 0.5) * speed * 0.04;
      mob.velocity.y = (Math.random() - 0.5) * speed * 0.02;
      mob.velocity.z = (Math.random() - 0.5) * speed * 0.04;
    }

    // Wither destroys blocks it touches (simplified)
    mob.metadata['destroyBlocks'] = true;
  }
}
