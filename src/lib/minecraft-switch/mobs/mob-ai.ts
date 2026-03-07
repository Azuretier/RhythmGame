// =============================================================================
// Minecraft: Nintendo Switch Edition — Mob AI System (Barrel)
// =============================================================================
// Re-exports all sub-modules and provides the main tickAI dispatcher that
// routes each mob to the correct AI ticker based on its type and category.
// =============================================================================

import type { Difficulty } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';
import { getMobDef } from './mob-registry';
import type { MobEntity } from './mob-entity';
import type { AIPlayerInfo } from './mob-ai-types';
import {
  tickHostileAI,
  tickNeutralAI,
  tickPassiveAI,
  applyMovement,
} from './mob-behaviors';
import {
  tickCreeperAI,
  tickEndermanAI,
  tickSkeletonAI,
  tickSpiderAI,
  tickSlimeAI,
  tickPhantomAI,
} from './mob-ai-special';
import {
  tickWolfAI,
  tickIronGolemAI,
  tickEnderDragonAI,
  tickWitherAI,
} from './mob-ai-boss';

// =============================================================================
// RE-EXPORTS — Maintain backward compatibility
// =============================================================================

// Types
export type { Vec3, Rotation, MobAIState, AIPlayerInfo, PathNode } from './mob-ai-types';

// MobEntity class
export { MobEntity } from './mob-entity';

// Pathfinding and distance utilities
export {
  distSq,
  distHorizontalSq,
  dist,
  normalizeHorizontal,
  isWalkable,
  isSolidBlock,
  findPath,
} from './mob-pathfinding';

// Shared behaviors
export {
  applyMovement,
  wanderBehavior,
  findHostileTarget,
  chaseBehavior,
  fleeBehavior,
  isInMeleeRange,
  tickHostileAI,
  tickNeutralAI,
  tickPassiveAI,
} from './mob-behaviors';

// Special mob AI tickers
export {
  tickCreeperAI,
  tickEndermanAI,
  tickSkeletonAI,
  tickSpiderAI,
  tickSlimeAI,
  tickPhantomAI,
} from './mob-ai-special';

// Boss / complex mob AI tickers
export {
  tickWolfAI,
  tickIronGolemAI,
  tickEnderDragonAI,
  tickWitherAI,
} from './mob-ai-boss';

// =============================================================================
// MAIN AI TICK DISPATCHER
// =============================================================================

/**
 * Main AI tick — dispatches to the correct behavior based on mob type and state.
 *
 * @param mob - The mob entity to update
 * @param world - The chunked world
 * @param players - All player info objects
 * @param allMobs - All active mob entities (for pack behavior, etc.)
 * @param dt - Delta time in seconds
 * @param difficulty - Game difficulty setting
 */
export function tickAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  allMobs: MobEntity[],
  dt: number,
  difficulty: Difficulty,
): void {
  if (!mob.alive) return;
  if (mob.noAITicks > 0) {
    mob.noAITicks--;
    return;
  }

  mob.stateTicks++;
  mob.ticksSinceLastAttack++;
  if (mob.hurtTime > 0) mob.hurtTime--;
  if (mob.pathRecalcCooldown > 0) mob.pathRecalcCooldown--;
  if (mob.endermanTeleportCooldown > 0) mob.endermanTeleportCooldown--;

  // Filter to living players in the same dimension
  const nearbyPlayers = players.filter(p =>
    !p.dead && p.gameMode !== 'spectator' && p.gameMode !== 'creative'
  );

  const def = getMobDef(mob.type);
  if (!def) return;

  // --- Sunlight burning ---
  if (def.burnsInDaylight && mob.fireTicks <= 0) {
    // Simplified: check if mob is above sea level and it is daytime
    // Full check would need the world time and sky exposure
    // This is handled externally in the tick system
  }

  // Dispatch to mob-type-specific AI
  switch (mob.type) {
    case 'creeper':
      tickCreeperAI(mob, world, nearbyPlayers, dt, difficulty);
      break;
    case 'enderman':
      tickEndermanAI(mob, world, nearbyPlayers, dt, difficulty);
      break;
    case 'skeleton':
    case 'stray':
      tickSkeletonAI(mob, world, nearbyPlayers, dt, difficulty);
      break;
    case 'spider':
    case 'cave_spider':
      tickSpiderAI(mob, world, nearbyPlayers, dt, difficulty);
      break;
    case 'slime':
      tickSlimeAI(mob, world, nearbyPlayers, dt, difficulty);
      break;
    case 'phantom':
      tickPhantomAI(mob, world, nearbyPlayers, dt, difficulty);
      break;
    case 'witch':
      tickHostileAI(mob, world, nearbyPlayers, dt, difficulty);
      break;
    case 'wolf':
      tickWolfAI(mob, world, nearbyPlayers, allMobs, dt, difficulty);
      break;
    case 'iron_golem':
      tickIronGolemAI(mob, world, nearbyPlayers, allMobs, dt, difficulty);
      break;
    case 'ender_dragon':
      tickEnderDragonAI(mob, world, nearbyPlayers, dt, difficulty);
      break;
    case 'wither':
      tickWitherAI(mob, world, nearbyPlayers, dt, difficulty);
      break;
    default:
      if (def.category === 'hostile') {
        tickHostileAI(mob, world, nearbyPlayers, dt, difficulty);
      } else if (def.category === 'neutral') {
        tickNeutralAI(mob, world, nearbyPlayers, dt, difficulty);
      } else {
        tickPassiveAI(mob, world, nearbyPlayers, dt);
      }
      break;
  }

  // Apply velocity to position
  applyMovement(mob, world, dt);
}
