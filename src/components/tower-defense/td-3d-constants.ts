// =============================================================
// Tower Defense 3D Renderer - Constants & Error Boundary
// Mob/enemy mappings, terrain colors, cell size, CanvasErrorBoundary
// =============================================================

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import type { TowerType, EnemyType } from '@/types/tower-defense';
import type { TDEnemyType } from '@/components/rhythmia/tetris/types';

// ===== Tower-to-Minecraft-Mob mapping =====
export const TOWER_MOB_MAP: Record<TowerType, TDEnemyType> = {
  archer: 'skeleton',
  cannon: 'magma_cube',
  frost: 'slime',
  lightning: 'enderman',
  sniper: 'skeleton',
  flame: 'zombie',
  arcane: 'enderman',
};

// ===== Enemy-to-Animal-Mob mapping =====
export const ENEMY_MOB_MAP: Record<EnemyType, TDEnemyType> = {
  grunt: 'pig',
  fast: 'chicken',
  tank: 'cow',
  flying: 'bee',
  healer: 'cat',
  boss: 'horse',
  swarm: 'rabbit',
  shield: 'wolf',
};

export const ENEMY_MOB_SCALE: Record<EnemyType, number> = {
  grunt: 0.45,
  fast: 0.4,
  tank: 0.5,
  flying: 0.45,
  healer: 0.45,
  boss: 0.7,
  swarm: 0.3,
  shield: 0.5,
};

export const TOWER_MOB_SCALE = 0.4;
// Slime model now matches magma cube dimensions — no overrides needed
export const TOWER_MOB_SCALE_OVERRIDES: Partial<Record<TowerType, number>> = {};

// ===== Error Boundary =====
interface ErrorBoundaryState { hasError: boolean; error: string | null }

export class CanvasErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[TowerDefense3D] Canvas error:', error, info);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ===== Constants =====
export const CELL_SIZE = 1;

export const TERRAIN_COLORS: Record<string, string> = {
  grass: '#3a7d44',
  path: '#c4a35a',
  water: '#2d6a9f',
  mountain: '#6b7280',
  spawn: '#ef4444',
  base: '#3b82f6',
};

export const TERRAIN_COLORS_ALT: Record<string, string> = {
  grass: '#348a3e',
  path: '#b8944d',
  water: '#2a5f8f',
  mountain: '#5f6670',
  spawn: '#dc3545',
  base: '#2563eb',
};
