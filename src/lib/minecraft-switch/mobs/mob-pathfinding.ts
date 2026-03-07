// =============================================================================
// Minecraft: Nintendo Switch Edition — Mob Pathfinding
// =============================================================================
// Math utilities (distance, normalization) and simplified A* pathfinding on
// the block grid. Used by behavior functions to navigate mobs through the world.
// =============================================================================

import { Block } from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';
import type { Vec3, PathNode } from './mob-ai-types';

// =============================================================================
// DISTANCE UTILITIES
// =============================================================================

export function distSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

export function distHorizontalSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

export function dist(a: Vec3, b: Vec3): number {
  return Math.sqrt(distSq(a, b));
}

export function normalizeHorizontal(dx: number, dz: number): { nx: number; nz: number } {
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) return { nx: 0, nz: 0 };
  return { nx: dx / len, nz: dz / len };
}

// =============================================================================
// BLOCK CHECKS
// =============================================================================

/**
 * Check if a block is walkable (air or passable at feet and head, solid below).
 */
export function isWalkable(world: ChunkedWorld, x: number, y: number, z: number): boolean {
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
export function isSolidBlock(world: ChunkedWorld, x: number, y: number, z: number): boolean {
  const blockId = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  return blockId !== Block.Air && blockId !== Block.Water && blockId !== Block.Lava &&
         blockId !== Block.TallGrass && blockId !== Block.Fern && blockId !== Block.DeadBush;
}

// =============================================================================
// PATHFINDING — Simplified A*
// =============================================================================

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
