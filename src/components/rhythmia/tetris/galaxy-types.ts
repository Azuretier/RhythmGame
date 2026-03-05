// ===== Galaxy Architecture Types =====
// The "Galaxy" layout wraps the Tetris board with a square TD ring.
// Rich tower defense mechanics: 7 tower types, 8 enemy types, status effects.

import type { TowerType, EnemyType, StatusEffect, SpawnTracker } from '@/types/tower-defense';

// Re-export for convenience
export type { TowerType, EnemyType, StatusEffect };

export type GalaxyRingSide = 'top' | 'bottom' | 'left' | 'right';

// A tower placed on the ring
export interface RingTower {
    id: string;
    type: TowerType;
    side: GalaxyRingSide;
    slotIndex: number;
    pathFraction: number;
    level: number;
    cooldown: number;
    kills: number;
    totalDamage: number;
    targetId: string | null;
}

// An enemy traveling along the outer ring path
export interface RingEnemy {
    id: string;
    type: EnemyType;
    pathFraction: number;   // 0.0–1.0 along the full ring loop (clockwise)
    hp: number;
    maxHp: number;
    speed: number;           // path-fraction per second
    armor: number;
    effects: StatusEffect[];
    flying: boolean;
    dead: boolean;
}

// A projectile traveling from tower to enemy
export interface RingProjectile {
    id: string;
    towerId: string;
    towerType: TowerType;
    targetId: string;
    pathFraction: number;
    damage: number;
    speed: number;           // path-fraction per second
    effects?: StatusEffect[];
}

// A slot on the ring where a tower can be placed
export interface TowerSlot {
    side: GalaxyRingSide;
    index: number;
    pathFraction: number;
    occupied: boolean;
    towerId: string | null;
}

// A gate at the midpoint of each side — enemies loop past gates
export interface GalaxyGate {
    side: GalaxyRingSide;
    health: number;
    maxHealth: number;
}

// Ring TD game phase
export type RingTDPhase = 'build' | 'wave' | 'won' | 'lost';

// Full galaxy TD state snapshot
export interface GalaxyTDState {
    phase: RingTDPhase;
    gold: number;
    lives: number;
    score: number;
    currentWave: number;
    totalWaves: number;
    towers: RingTower[];
    enemies: RingEnemy[];
    projectiles: RingProjectile[];
    gates: GalaxyGate[];
    towerSlots: TowerSlot[];
    selectedTowerType: TowerType | null;
    selectedTowerId: string | null;
    spawnTracker: SpawnTracker | null;
}
