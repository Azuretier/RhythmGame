// ================================================================
// Tower Defense Mode — Type Definitions
// ================================================================

// ── Tower types ─────────────────────────────────────────────────

export type TDTowerType =
  | 'main_tower'   // The central tower the player must defend
  | 'mini_tower'   // Basic helper that auto-shoots nearby enemies
  | 'archer'       // Long-range single-target shots
  | 'cannon'       // Short-range area-of-effect damage
  | 'freeze'       // Slows all enemies in range
  | 'aura'         // Boosts attack speed of adjacent towers
  | 'wall';        // Impassable block that reroutes enemies

export interface TDTowerDef {
  type: TDTowerType;
  label: string;
  icon: string;
  color: string;
  cost: number;        // build cost (gold)
  hp: number;
  damage: number;      // per shot (0 for utility towers)
  range: number;       // cells radius
  attackSpeed: number; // shots per second
  description: string;
}

export const TD_TOWERS: Record<TDTowerType, TDTowerDef> = {
  main_tower: {
    type: 'main_tower', label: 'Main Tower', icon: '🏰', color: '#c0a030',
    cost: 0, hp: 5000, damage: 10, range: 6, attackSpeed: 1,
    description: 'The tower you must protect. Enemies head straight for it.',
  },
  mini_tower: {
    type: 'mini_tower', label: 'Mini Tower', icon: '🗼', color: '#4488cc',
    cost: 50, hp: 200, damage: 80, range: 3, attackSpeed: 1.5,
    description: 'Compact helper tower. Cheap and fast to build.',
  },
  archer: {
    type: 'archer', label: 'Archer Tower', icon: '🏹', color: '#22aa44',
    cost: 120, hp: 150, damage: 200, range: 6, attackSpeed: 0.8,
    description: 'Long-range precision shots. Great for open lanes.',
  },
  cannon: {
    type: 'cannon', label: 'Cannon Tower', icon: '💣', color: '#cc4422',
    cost: 200, hp: 300, damage: 800, range: 4, attackSpeed: 0.4,
    description: 'Slow but massive AoE damage. Shreds groups of enemies.',
  },
  freeze: {
    type: 'freeze', label: 'Freeze Tower', icon: '❄️', color: '#44aacc',
    cost: 150, hp: 120, damage: 0, range: 4, attackSpeed: 0.5,
    description: 'Slows all enemies in range by 60%. No direct damage.',
  },
  aura: {
    type: 'aura', label: 'Aura Tower', icon: '✨', color: '#aa44cc',
    cost: 180, hp: 100, damage: 0, range: 2, attackSpeed: 0,
    description: 'Boosts adjacent towers: +50% attack speed & +25% damage.',
  },
  wall: {
    type: 'wall', label: 'Wall', icon: '🧱', color: '#888888',
    cost: 30, hp: 800, damage: 0, range: 0, attackSpeed: 0,
    description: 'Impassable block. Forces enemies to find another route.',
  },
};

// ── Grid cell types ──────────────────────────────────────────────

export type TDCellType =
  | 'empty'       // Open ground — towers can be placed here
  | 'path'        // Enemy path — no towers allowed
  | 'spawn'       // Enemy spawn point
  | 'goal'        // Where enemies are trying to reach (main tower base)
  | 'tower';      // Cell occupied by a tower

export interface TDCell {
  type: TDCellType;
  towerId?: string;     // references TDTower.id if type === 'tower'
  towerType?: TDTowerType;
}

// ── Live tower state (during gameplay) ──────────────────────────

export interface TDTower {
  id: string;
  type: TDTowerType;
  gridX: number;
  gridY: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  attackSpeed: number;     // shots per second
  lastShotAt: number;      // timestamp (ms)
  auraBoost: number;       // multiplier from adjacent aura towers (1.0 = no boost)
  frozen: boolean;
}

// ── Enemy types ──────────────────────────────────────────────────

export type TDEnemyType =
  | 'walker'           // Basic ground unit
  | 'runner'           // Fast but low HP
  | 'tank'             // Slow but very high HP
  | 'garbage_thrower'  // Throws garbage blocks at the player's Tetris board
  | 'boss';            // End-of-wave boss with massive HP

export interface TDEnemyDef {
  type: TDEnemyType;
  label: string;
  icon: string;
  color: string;
  baseHp: number;
  speed: number;           // cells per second
  reward: number;          // gold on kill
  size: number;            // visual radius (0.3–0.8)
  throwsGarbage: boolean;
  garbageInterval: number; // ms between garbage throws (0 = never)
  description: string;
}

export const TD_ENEMIES: Record<TDEnemyType, TDEnemyDef> = {
  walker: {
    type: 'walker', label: 'Walker', icon: '👾', color: '#cc4444',
    baseHp: 300, speed: 1.5, reward: 10, size: 0.4,
    throwsGarbage: false, garbageInterval: 0,
    description: 'Standard grunt. Steady pace, moderate HP.',
  },
  runner: {
    type: 'runner', label: 'Runner', icon: '💨', color: '#44cc88',
    baseHp: 100, speed: 4, reward: 15, size: 0.3,
    throwsGarbage: false, garbageInterval: 0,
    description: 'Sprints through lanes quickly. Hard to hit.',
  },
  tank: {
    type: 'tank', label: 'Tank', icon: '🛡️', color: '#886622',
    baseHp: 5000, speed: 0.5, reward: 80, size: 0.7,
    throwsGarbage: false, garbageInterval: 0,
    description: 'Slow-moving heavy unit. Takes a lot of firepower.',
  },
  garbage_thrower: {
    type: 'garbage_thrower', label: 'Garbage Thrower', icon: '🪣', color: '#cc8844',
    baseHp: 1000, speed: 1.0, reward: 50, size: 0.5,
    throwsGarbage: true, garbageInterval: 5000,
    description: 'Hurls garbage lines at your Tetris board with a gravitational arc.',
  },
  boss: {
    type: 'boss', label: 'BOSS', icon: '💀', color: '#cc0000',
    baseHp: 100000, speed: 0.3, reward: 500, size: 0.9,
    throwsGarbage: true, garbageInterval: 3000,
    description: '100,000 HP behemoth. Every hit counts.',
  },
};

// ── Live enemy state ─────────────────────────────────────────────

export interface TDEnemy {
  id: string;
  type: TDEnemyType;
  hp: number;
  maxHp: number;
  /** Position along the path (0 = spawn, 1 = goal) */
  pathProgress: number;
  /** Actual pixel/grid coordinates (interpolated from path) */
  x: number;
  y: number;
  frozen: boolean;
  frozenUntil: number; // timestamp (ms), 0 if not frozen
  lastGarbageAt: number; // timestamp (ms)
}

// ── Garbage projectile (from garbage_thrower / boss) ────────────

export interface TDGarbageProjectile {
  id: string;
  enemyId: string;
  /** Start position in grid coords */
  startX: number;
  startY: number;
  /** Apex height offset for the parabolic arc */
  arcHeight: number;
  /** 0 → 1, drive the parabolic animation */
  progress: number;
  /** How many garbage rows will be added (1–4) */
  garbageLines: number;
  /** Timestamp when the throw started */
  startTime: number;
  /** Total flight duration in ms */
  duration: number;
}

// ── Tower bullet ─────────────────────────────────────────────────

export interface TDBullet {
  id: string;
  fromTowerId: string;
  toEnemyId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;  // 0→1
  damage: number;
  startTime: number;
  duration: number;  // ms
}

// ── Line-clear aura burst ────────────────────────────────────────

export interface TDLineClearAura {
  id: string;
  /** Grid cell around which the aura radiates */
  centerX: number;
  centerY: number;
  /** Maximum radius the aura reaches (in grid cells) */
  maxRadius: number;
  /** Current animated radius (grows over time) */
  currentRadius: number;
  damage: number;
  startTime: number;
  duration: number; // ms total animation
}

// ── Wave definition ──────────────────────────────────────────────

export interface TDWaveEnemy {
  type: TDEnemyType;
  count: number;
  spawnInterval: number; // ms between each spawn
  hpMultiplier: number;
}

export interface TDWaveDef {
  waveNumber: number;
  enemies: TDWaveEnemy[];
  reward: number;
  /** Delay before this wave starts (ms) after previous wave clear */
  interludeMs: number;
}

// ── Game phases ──────────────────────────────────────────────────

export type TDPhase = 'setup' | 'wave' | 'interlude' | 'game_over' | 'victory';

// ── Full game state ──────────────────────────────────────────────

export interface TDGameState {
  phase: TDPhase;
  grid: TDCell[][];         // [row][col], rows = TD_GRID_ROWS, cols = TD_GRID_COLS
  towers: TDTower[];
  enemies: TDEnemy[];
  bullets: TDBullet[];
  garbageProjectiles: TDGarbageProjectile[];
  lineClearAuras: TDLineClearAura[];
  /** Path of {gridX, gridY} cells enemies follow */
  path: { x: number; y: number }[];
  gold: number;
  wave: number;
  mainTowerHp: number;
  mainTowerMaxHp: number;
  totalEnemiesKilled: number;
}

// ── Grid layout (saved/loaded via localStorage) ──────────────────

export type TDLayoutCell = TDTowerType | 'empty' | 'path' | 'spawn' | 'goal';

export interface TDSavedLayout {
  version: 1;
  rows: number;
  cols: number;
  cells: TDLayoutCell[][];
}

// ── Grid constants ───────────────────────────────────────────────

export const TD_GRID_ROWS = 20;
export const TD_GRID_COLS = 14;
export const TD_CELL_PX = 40;  // pixel size per cell in the editor

// ── Game balance constants ────────────────────────────────────────

/** Fraction of enemy maxHp dealt to the main tower when an enemy reaches the goal */
export const GOAL_DAMAGE_HP_PERCENTAGE = 0.05;
/** Flat bonus damage added when an enemy reaches the goal */
export const GOAL_DAMAGE_BASE = 50;
/** Minimum arc height (grid cells) for garbage projectile animation */
export const GARBAGE_ARC_MIN = 8;
/** Random variance added to arc height */
export const GARBAGE_ARC_VARIANCE = 4;
/** Minimum garbage lines per throw */
export const MIN_GARBAGE_LINES = 1;
/** Maximum garbage lines per throw (inclusive) */
export const MAX_GARBAGE_LINES = 4;
/** Duration enemies remain frozen after a Freeze tower shot (ms) */
export const FREEZE_DURATION_MS = 2000;
/** Aura damage tick multiplier (damage per second ≈ burst.damage * AURA_DAMAGE_MULTIPLIER) */
export const AURA_DAMAGE_MULTIPLIER = 5;
/** Base damage dealt to every enemy for each Tetris line cleared */
export const LINE_CLEAR_AURA_BASE_DAMAGE = 500;

// ── HP display helper ────────────────────────────────────────────

export function formatHP(hp: number): string {
  const v = Math.max(0, hp);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${Math.round(v)}`;
}

// ── Waves (10 escalating waves) ──────────────────────────────────

export const TD_WAVES: TDWaveDef[] = [
  {
    waveNumber: 1,
    enemies: [{ type: 'walker', count: 5, spawnInterval: 1500, hpMultiplier: 1 }],
    reward: 80, interludeMs: 5000,
  },
  {
    waveNumber: 2,
    enemies: [
      { type: 'walker', count: 6, spawnInterval: 1200, hpMultiplier: 1 },
      { type: 'runner', count: 3, spawnInterval: 800, hpMultiplier: 1 },
    ],
    reward: 100, interludeMs: 5000,
  },
  {
    waveNumber: 3,
    enemies: [
      { type: 'walker', count: 8, spawnInterval: 1000, hpMultiplier: 1.2 },
      { type: 'runner', count: 5, spawnInterval: 600, hpMultiplier: 1 },
    ],
    reward: 130, interludeMs: 5000,
  },
  {
    waveNumber: 4,
    enemies: [
      { type: 'tank', count: 2, spawnInterval: 3000, hpMultiplier: 1 },
      { type: 'walker', count: 6, spawnInterval: 800, hpMultiplier: 1.3 },
    ],
    reward: 180, interludeMs: 6000,
  },
  {
    waveNumber: 5,
    enemies: [
      { type: 'garbage_thrower', count: 3, spawnInterval: 2000, hpMultiplier: 1 },
      { type: 'runner', count: 8, spawnInterval: 500, hpMultiplier: 1.2 },
    ],
    reward: 220, interludeMs: 6000,
  },
  {
    waveNumber: 6,
    enemies: [
      { type: 'tank', count: 3, spawnInterval: 2500, hpMultiplier: 1.3 },
      { type: 'garbage_thrower', count: 2, spawnInterval: 2000, hpMultiplier: 1.2 },
      { type: 'walker', count: 10, spawnInterval: 700, hpMultiplier: 1.5 },
    ],
    reward: 280, interludeMs: 6000,
  },
  {
    waveNumber: 7,
    enemies: [
      { type: 'runner', count: 12, spawnInterval: 400, hpMultiplier: 1.5 },
      { type: 'garbage_thrower', count: 4, spawnInterval: 1500, hpMultiplier: 1.3 },
    ],
    reward: 350, interludeMs: 7000,
  },
  {
    waveNumber: 8,
    enemies: [
      { type: 'tank', count: 5, spawnInterval: 2000, hpMultiplier: 1.6 },
      { type: 'garbage_thrower', count: 5, spawnInterval: 1200, hpMultiplier: 1.5 },
      { type: 'runner', count: 10, spawnInterval: 300, hpMultiplier: 2 },
    ],
    reward: 450, interludeMs: 7000,
  },
  {
    waveNumber: 9,
    enemies: [
      { type: 'walker', count: 20, spawnInterval: 500, hpMultiplier: 2 },
      { type: 'tank', count: 6, spawnInterval: 1800, hpMultiplier: 2 },
      { type: 'garbage_thrower', count: 6, spawnInterval: 1000, hpMultiplier: 1.8 },
    ],
    reward: 600, interludeMs: 8000,
  },
  {
    waveNumber: 10,
    enemies: [
      { type: 'boss', count: 1, spawnInterval: 0, hpMultiplier: 1 },
      { type: 'garbage_thrower', count: 8, spawnInterval: 800, hpMultiplier: 2 },
      { type: 'tank', count: 4, spawnInterval: 2000, hpMultiplier: 2.5 },
    ],
    reward: 1000, interludeMs: 0,
  },
];
