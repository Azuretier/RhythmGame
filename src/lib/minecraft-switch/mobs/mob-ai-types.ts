// =============================================================================
// Minecraft: Nintendo Switch Edition — Mob AI Types
// =============================================================================
// Shared type definitions used across the mob AI system: Vec3, Rotation,
// MobAIState, AIPlayerInfo, and PathNode.
// =============================================================================

import type { BlockId } from '@/types/minecraft-switch';

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
export interface PathNode {
  x: number;
  y: number;
  z: number;
  g: number; // cost from start
  h: number; // heuristic to goal
  f: number; // g + h
  parent: PathNode | null;
}

// Re-export BlockId for convenience in modules that need it alongside these types
export type { BlockId };
