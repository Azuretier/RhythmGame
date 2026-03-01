// =============================================================================
// Minecraft: Nintendo Switch Edition — Mob AI System
// =============================================================================
// Behavior-tree-based AI system for all mob entities. Includes the MobEntity
// class representing runtime mob state, pathfinding (simplified A*), and
// behavior implementations for hostile, neutral, passive, and boss mobs.
// Mob-specific behaviors: creeper fuse, enderman teleport, skeleton kiting,
// spider climbing, slime hopping, and phantom swooping.
// =============================================================================

import { Block, type BlockId, type MobType, type Difficulty } from '@/types/minecraft-switch';
import { MS_CONFIG } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';
import {
  getMobDef,
  getMobDamage,
  CREEPER_CONFIG,
  ENDERMAN_CONFIG,
  SKELETON_CONFIG,
  SPIDER_CONFIG,
  PHANTOM_CONFIG,
  SLIME_SIZE_STATS,
  type SlimeSize,
} from './mob-registry';

// =============================================================================
// TYPES
// =============================================================================

/** 3D position vector. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Rotation angles for entity facing. */
export interface Rotation {
  yaw: number;
  pitch: number;
}

/** AI state machine states. */
export type MobAIState =
  | 'idle'
  | 'wandering'
  | 'chasing'
  | 'attacking'
  | 'fleeing'
  | 'special';

/** Simplified player data the AI needs to see. */
export interface AIPlayerInfo {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  dead: boolean;
  gameMode: string;
  dimension: string;
  /** Ticks since last sleep (for phantom spawning logic). */
  ticksSinceRest?: number;
  /** Whether the player is holding a bone (wolf taming). */
  heldItem?: string;
}

/** Path node for A* pathfinding. */
interface PathNode {
  x: number;
  y: number;
  z: number;
  g: number; // cost from start
  h: number; // heuristic to goal
  f: number; // g + h
  parent: PathNode | null;
}

// =============================================================================
// MOB ENTITY CLASS
// =============================================================================

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

// =============================================================================
// DISTANCE UTILITIES
// =============================================================================

function distSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function distHorizontalSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function dist(a: Vec3, b: Vec3): number {
  return Math.sqrt(distSq(a, b));
}

function normalizeHorizontal(dx: number, dz: number): { nx: number; nz: number } {
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) return { nx: 0, nz: 0 };
  return { nx: dx / len, nz: dz / len };
}

// =============================================================================
// PATHFINDING — Simplified A*
// =============================================================================

/**
 * Check if a block is walkable (air or passable at feet and head, solid below).
 */
function isWalkable(world: ChunkedWorld, x: number, y: number, z: number): boolean {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bz = Math.floor(z);

  // Block below must be solid
  const below = world.getBlock(bx, by - 1, bz);
  if (below === Block.Air || below === Block.Water || below === Block.Lava) return false;

  // Feet and head level must be passable (air, water, etc.)
  const atFeet = world.getBlock(bx, by, bz);
  const atHead = world.getBlock(bx, by + 1, bz);
  const passableBlocks: Set<number> = new Set([Block.Air, Block.Water, Block.TallGrass, Block.Fern, Block.DeadBush]);

  return passableBlocks.has(atFeet as number) && passableBlocks.has(atHead as number);
}

/**
 * Check if a block is solid (for collision).
 */
function isSolidBlock(world: ChunkedWorld, x: number, y: number, z: number): boolean {
  const blockId = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  return blockId !== Block.Air && blockId !== Block.Water && blockId !== Block.Lava &&
         blockId !== Block.TallGrass && blockId !== Block.Fern && blockId !== Block.DeadBush;
}

/** Heuristic — Manhattan distance in XZ, plus vertical. */
function heuristic(a: Vec3, b: Vec3): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}

/**
 * Simplified A* pathfinding on the block grid.
 *
 * @param from - Start position
 * @param to - Target position
 * @param world - The chunked world for block queries
 * @param maxNodes - Maximum nodes to explore (performance cap)
 * @returns Array of Vec3 waypoints, or empty if no path found
 */
export function findPath(
  from: Vec3,
  to: Vec3,
  world: ChunkedWorld,
  maxNodes = 200,
): Vec3[] {
  const startX = Math.floor(from.x);
  const startY = Math.floor(from.y);
  const startZ = Math.floor(from.z);
  const endX = Math.floor(to.x);
  const endY = Math.floor(to.y);
  const endZ = Math.floor(to.z);

  // If start equals end, no path needed
  if (startX === endX && startY === endY && startZ === endZ) return [];

  const open: PathNode[] = [];
  const closed = new Set<string>();

  const start: PathNode = {
    x: startX, y: startY, z: startZ,
    g: 0,
    h: heuristic({ x: startX, y: startY, z: startZ }, { x: endX, y: endY, z: endZ }),
    f: 0,
    parent: null,
  };
  start.f = start.g + start.h;
  open.push(start);

  let nodesExplored = 0;

  // Neighbor offsets: 4 cardinal directions + up/down steps
  const neighbors = [
    { dx: 1, dz: 0 }, { dx: -1, dz: 0 },
    { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
  ];

  while (open.length > 0 && nodesExplored < maxNodes) {
    nodesExplored++;

    // Find node with lowest f score
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open[bestIdx];
    open.splice(bestIdx, 1);

    const key = `${current.x},${current.y},${current.z}`;
    if (closed.has(key)) continue;
    closed.add(key);

    // Check if we reached the goal
    if (current.x === endX && current.z === endZ && Math.abs(current.y - endY) <= 1) {
      // Reconstruct path
      const path: Vec3[] = [];
      let node: PathNode | null = current;
      while (node !== null) {
        path.push({ x: node.x + 0.5, y: node.y, z: node.z + 0.5 });
        node = node.parent;
      }
      path.reverse();
      // Remove start node
      if (path.length > 0) path.shift();
      return path;
    }

    // Explore neighbors
    for (const { dx, dz } of neighbors) {
      const nx = current.x + dx;
      const nz = current.z + dz;

      // Try same level, one up, and one down
      for (const dy of [0, 1, -1]) {
        const ny = current.y + dy;
        if (ny < 0 || ny >= 256) continue;

        const nKey = `${nx},${ny},${nz}`;
        if (closed.has(nKey)) continue;

        if (!isWalkable(world, nx, ny, nz)) continue;

        // Climbing up requires head room above current position
        if (dy === 1) {
          if (isSolidBlock(world, current.x, current.y + 2, current.z)) continue;
        }

        const moveCost = dy === 0 ? 1 : 2; // Climbing costs more
        const g = current.g + moveCost;
        const h = heuristic({ x: nx, y: ny, z: nz }, { x: endX, y: endY, z: endZ });
        const f = g + h;

        // Check if there's a better path in open list
        const existing = open.find(n => n.x === nx && n.y === ny && n.z === nz);
        if (existing && existing.g <= g) continue;

        open.push({ x: nx, y: ny, z: nz, g, h, f, parent: current });
      }
    }
  }

  // No path found
  return [];
}

// =============================================================================
// AI BEHAVIOR FUNCTIONS
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

// =============================================================================
// MOVEMENT APPLICATION
// =============================================================================

/**
 * Apply velocity and basic physics to a mob entity.
 */
function applyMovement(mob: MobEntity, world: ChunkedWorld, dt: number): void {
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
function wanderBehavior(mob: MobEntity, world: ChunkedWorld, speed: number): void {
  if (mob.state !== 'wandering') {
    mob.state = 'wandering';
    mob.stateTicks = 0;

    // Pick random target within 10 blocks
    const angle = Math.random() * Math.PI * 2;
    const dist = 3 + Math.random() * 7;
    const targetX = mob.position.x + Math.cos(angle) * dist;
    const targetZ = mob.position.z + Math.sin(angle) * dist;
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
function findHostileTarget(
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

function chaseBehavior(
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

function fleeBehavior(mob: MobEntity, threat: Vec3, speed: number): void {
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
function isInMeleeRange(mob: MobEntity, target: Vec3, range = 2.0): boolean {
  return distSq(mob.position, target) < range * range;
}

// =============================================================================
// GENERIC HOSTILE AI
// =============================================================================

function tickHostileAI(
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

function tickNeutralAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
  difficulty: Difficulty,
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

function tickPassiveAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
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

// =============================================================================
// CREEPER AI — Chase and explode
// =============================================================================

function tickCreeperAI(
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

function tickEndermanAI(
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
        let angleDiff = Math.abs(((p.yaw - angleToMob + 540) % 360) - 180);

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

function tickSkeletonAI(
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

function tickSpiderAI(
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
      const targetPlayer = players.find(p => p.id === mob.target);
      if (targetPlayer) {
        const d = dist(mob.position, { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z });
        if (d < SPIDER_CONFIG.POUNCE_RANGE && d > 2 && mob.onGround) {
          const dx = targetPlayer.x - mob.position.x;
          const dz = targetPlayer.z - mob.position.z;
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

function tickSlimeAI(
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

function tickPhantomAI(
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

// =============================================================================
// WOLF AI — Pack behavior, tameable
// =============================================================================

function tickWolfAI(
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

function tickIronGolemAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  allMobs: MobEntity[],
  dt: number,
  difficulty: Difficulty,
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

function tickEnderDragonAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
  difficulty: Difficulty,
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

function tickWitherAI(
  mob: MobEntity,
  world: ChunkedWorld,
  players: AIPlayerInfo[],
  dt: number,
  difficulty: Difficulty,
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
