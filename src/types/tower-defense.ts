// ===== Tower Defense Types =====

// === Map & Grid ===
export type TerrainType = 'grass' | 'path' | 'water' | 'mountain' | 'spawn' | 'base';

export interface GridCell {
  x: number;
  z: number;
  terrain: TerrainType;
  elevation: number;
  towerId: string | null;
}

export interface GameMap {
  name: string;
  width: number;
  height: number;
  grid: GridCell[][];
  waypoints: Vec3[];
  spawnPoints: Vec3[];
  basePosition: Vec3;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

// === Towers ===
export type TowerType = 'archer' | 'cannon' | 'frost' | 'lightning' | 'sniper' | 'flame' | 'arcane';

export interface TowerDef {
  type: TowerType;
  name: string;
  description: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number; // shots per second
  projectileSpeed: number;
  color: string;
  accentColor: string;
  maxLevel: number;
  upgradeCosts: number[];
  damagePerLevel: number[];
  rangePerLevel: number[];
  special?: string;
}

export interface Tower {
  id: string;
  type: TowerType;
  gridX: number;
  gridZ: number;
  level: number;
  targetId: string | null;
  cooldown: number;
  kills: number;
  totalDamage: number;
}

// === Enemies ===
export type EnemyType = 'grunt' | 'fast' | 'tank' | 'flying' | 'healer' | 'boss' | 'swarm' | 'shield';

export interface EnemyDef {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number; // cells per second
  reward: number;
  armor: number;
  color: string;
  scale: number;
  flying: boolean;
  abilities?: EnemyAbility[];
}

export type EnemyAbility = 'heal_aura' | 'shield_aura' | 'split' | 'teleport' | 'stealth';

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  position: Vec3;
  waypointIndex: number;
  progress: number; // 0-1 between current and next waypoint
  effects: StatusEffect[];
  flying: boolean;
  dead: boolean;
}

export interface StatusEffect {
  type: 'slow' | 'burn' | 'stun' | 'poison' | 'amplify';
  duration: number;
  remaining: number;
  magnitude: number;
}

// === Projectiles ===
export interface Projectile {
  id: string;
  towerId: string;
  towerType: TowerType;
  targetId: string;
  position: Vec3;
  damage: number;
  speed: number;
  aoe: number; // 0 = single target
  effects?: StatusEffect[];
}

// === Waves ===
export interface WaveGroup {
  enemyType: EnemyType;
  count: number;
  spawnDelay: number; // seconds between spawns
  startDelay: number; // seconds before first spawn
  hpMultiplier?: number;
  speedMultiplier?: number;
}

export interface Wave {
  number: number;
  groups: WaveGroup[];
  reward: number;
}

// === Game State ===
export type GamePhase = 'menu' | 'build' | 'wave' | 'paused' | 'won' | 'lost';

export interface GameState {
  phase: GamePhase;
  gold: number;
  lives: number;
  maxLives: number;
  score: number;
  currentWave: number;
  totalWaves: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  map: GameMap;
  selectedTowerType: TowerType | null;
  selectedTowerId: string | null;
  selectedEnemyId: string | null;
  waveCountdown: number;
  enemiesRemaining: number;
  autoStart: boolean;
  gameSpeed: number;
}

// === Constants ===
export const TOWER_DEFS: Record<TowerType, TowerDef> = {
  archer: {
    type: 'archer',
    name: 'Archer Tower',
    description: 'Fast-firing tower with decent range',
    cost: 100,
    damage: 15,
    range: 3.5,
    fireRate: 2,
    projectileSpeed: 12,
    color: '#4ade80',
    accentColor: '#22c55e',
    maxLevel: 3,
    upgradeCosts: [75, 150, 300],
    damagePerLevel: [15, 25, 40],
    rangePerLevel: [3.5, 4, 4.5],
  },
  cannon: {
    type: 'cannon',
    name: 'Cannon Tower',
    description: 'Slow but powerful area damage',
    cost: 200,
    damage: 50,
    range: 3,
    fireRate: 0.6,
    projectileSpeed: 8,
    color: '#f97316',
    accentColor: '#ea580c',
    maxLevel: 3,
    upgradeCosts: [150, 300, 600],
    damagePerLevel: [50, 90, 150],
    rangePerLevel: [3, 3.5, 4],
    special: 'AOE damage (1.5 radius)',
  },
  frost: {
    type: 'frost',
    name: 'Frost Slime',
    description: 'Slime that radiates a slow aura',
    cost: 150,
    damage: 10,
    range: 3,
    fireRate: 1.5,
    projectileSpeed: 10,
    color: '#38bdf8',
    accentColor: '#0ea5e9',
    maxLevel: 3,
    upgradeCosts: [100, 200, 400],
    damagePerLevel: [10, 18, 30],
    rangePerLevel: [3, 3.5, 4],
    special: 'Radiating slow AoE — 40% slow',
  },
  lightning: {
    type: 'lightning',
    name: 'Lightning Tower',
    description: 'Chains damage between nearby enemies',
    cost: 250,
    damage: 30,
    range: 3.5,
    fireRate: 1,
    projectileSpeed: 50,
    color: '#a78bfa',
    accentColor: '#8b5cf6',
    maxLevel: 3,
    upgradeCosts: [200, 400, 800],
    damagePerLevel: [30, 55, 90],
    rangePerLevel: [3.5, 4, 4.5],
    special: 'Chains to 2 additional targets',
  },
  sniper: {
    type: 'sniper',
    name: 'Sniper Tower',
    description: 'Extreme range, high single-target damage',
    cost: 300,
    damage: 100,
    range: 6,
    fireRate: 0.4,
    projectileSpeed: 30,
    color: '#f43f5e',
    accentColor: '#e11d48',
    maxLevel: 3,
    upgradeCosts: [250, 500, 1000],
    damagePerLevel: [100, 180, 300],
    rangePerLevel: [6, 7, 8],
    special: 'Ignores armor',
  },
  flame: {
    type: 'flame',
    name: 'Flame Tower',
    description: 'Burns enemies over time in a cone',
    cost: 175,
    damage: 8,
    range: 2.5,
    fireRate: 4,
    projectileSpeed: 15,
    color: '#ef4444',
    accentColor: '#dc2626',
    maxLevel: 3,
    upgradeCosts: [125, 250, 500],
    damagePerLevel: [8, 15, 25],
    rangePerLevel: [2.5, 3, 3.5],
    special: 'Burns for 3s (5 DPS)',
  },
  arcane: {
    type: 'arcane',
    name: 'Arcane Tower',
    description: 'Amplifies damage taken by enemies',
    cost: 350,
    damage: 20,
    range: 4,
    fireRate: 0.8,
    projectileSpeed: 15,
    color: '#c084fc',
    accentColor: '#a855f7',
    maxLevel: 3,
    upgradeCosts: [300, 600, 1200],
    damagePerLevel: [20, 35, 60],
    rangePerLevel: [4, 4.5, 5],
    special: 'Amplifies damage taken by 25%',
  },
};

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  grunt: {
    type: 'grunt',
    name: 'Pig',
    hp: 100,
    speed: 1.5,
    reward: 10,
    armor: 0,
    color: '#f0a0a0',
    scale: 0.4,
    flying: false,
  },
  fast: {
    type: 'fast',
    name: 'Chicken',
    hp: 60,
    speed: 3,
    reward: 12,
    armor: 0,
    color: '#f5f5e0',
    scale: 0.3,
    flying: false,
  },
  tank: {
    type: 'tank',
    name: 'Cow',
    hp: 400,
    speed: 0.8,
    reward: 25,
    armor: 5,
    color: '#f0f0e8',
    scale: 0.6,
    flying: false,
  },
  flying: {
    type: 'flying',
    name: 'Bee',
    hp: 80,
    speed: 2,
    reward: 15,
    armor: 0,
    color: '#f0c830',
    scale: 0.35,
    flying: true,
  },
  healer: {
    type: 'healer',
    name: 'Cat',
    hp: 120,
    speed: 1.2,
    reward: 20,
    armor: 0,
    color: '#e8a050',
    scale: 0.4,
    flying: false,
    abilities: ['heal_aura'],
  },
  boss: {
    type: 'boss',
    name: 'Horse',
    hp: 2000,
    speed: 0.6,
    reward: 100,
    armor: 10,
    color: '#8b5e3c',
    scale: 0.9,
    flying: false,
  },
  swarm: {
    type: 'swarm',
    name: 'Rabbit',
    hp: 30,
    speed: 2.5,
    reward: 5,
    armor: 0,
    color: '#c8a878',
    scale: 0.2,
    flying: false,
  },
  shield: {
    type: 'shield',
    name: 'Wolf',
    hp: 250,
    speed: 1,
    reward: 30,
    armor: 8,
    color: '#9e9e9e',
    scale: 0.5,
    flying: false,
    abilities: ['shield_aura'],
  },
};

export const INITIAL_GOLD = 500;
export const INITIAL_LIVES = 20;
export const WAVE_PREP_TIME = 15; // seconds between waves
export const TOTAL_WAVES = 30;
