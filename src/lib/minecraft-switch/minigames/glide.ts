// =============================================================================
// Minecraft: Nintendo Switch Edition — Glide Mini-Game
// =============================================================================
// Elytra racing mini-game for up to 8 players. Players glide through checkpoint
// rings on pre-built tracks, using pitch/yaw/roll controls and firework boosts.
// Features realistic elytra flight physics with drag, stalling, banking turns,
// and terminal velocity. Supports two modes: Time Trial (fastest finish wins)
// and Score Attack (points for checkpoints, boost rings, and proximity flying).
// Three tracks: Canyon Run (12 checkpoints, wide open), Crystal Caverns (10
// checkpoints, tight underground), and Sky City (15 checkpoints, high altitude
// weaving). Matches Minecraft: Nintendo Switch Edition Glide mini-game pack.
// =============================================================================

import type { PlayerPosition } from '@/types/minecraft-switch';

// =============================================================================
// TYPES
// =============================================================================

export type GlidePhase = 'lobby' | 'countdown' | 'racing' | 'finished';

export type GlideMode = 'time_trial' | 'score';

export type GlideTrackId = 'canyon_run' | 'crystal_caverns' | 'sky_city';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GlideCheckpoint {
  position: Vec3;
  radius: number;
  index: number;
  /** Normal vector — the direction the player should pass through. */
  normal: Vec3;
}

export interface GlideBoostRing {
  position: Vec3;
  radius: number;
  speedMultiplier: number;
  /** Duration of the speed boost in seconds. */
  boostDuration: number;
  /** Normal vector for ring orientation. */
  normal: Vec3;
}

export interface GlideTrackBoundary {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface GlideWallSegment {
  start: Vec3;
  end: Vec3;
  /** Normal pointing away from the wall surface. */
  normal: Vec3;
  /** Half-thickness for collision detection (blocks). */
  thickness: number;
}

export interface GlideTrackDefinition {
  id: GlideTrackId;
  name: string;
  nameJa: string;
  description: string;
  checkpoints: GlideCheckpoint[];
  boostRings: GlideBoostRing[];
  boundaries: GlideTrackBoundary;
  startPositions: PlayerPosition[];
  /** Default laps for this track. */
  defaultLaps: number;
  /** Ambient wind affecting all players. */
  wind: Vec3;
  /** Obstacle wall segments for collision. */
  walls: GlideWallSegment[];
}

export interface GlidePlayer {
  id: string;
  name: string;
  position: Vec3;
  velocity: Vec3;
  rotation: { pitch: number; yaw: number; roll: number };
  speed: number;
  checkpointsPassed: number;
  currentCheckpoint: number;
  lapsCompleted: number;
  totalLaps: number;
  score: number;
  finished: boolean;
  finishTime: number;
  connected: boolean;
  ready: boolean;
  /** Firework boosts remaining. */
  fireworksRemaining: number;
  /** Whether a firework boost is currently active. */
  fireworkActive: boolean;
  /** Seconds remaining on firework boost. */
  fireworkTimer: number;
  /** Active boost ring speed multiplier. */
  boostMultiplier: number;
  /** Seconds remaining on boost ring effect. */
  boostTimer: number;
  /** Ticks of collision immunity after a wall hit. */
  collisionImmunity: number;
  /** Whether the player has stalled (too slow). */
  stalled: boolean;
  /** Total distance flown in blocks. */
  distanceFlown: number;
  /** Number of wall collisions. */
  wallHits: number;
  /** Current race rank (1 = first). */
  rank: number;
}

export interface GlideConfig {
  track: GlideTrackId;
  mode: GlideMode;
  laps: number;
  countdownDuration: number;
  /** Maximum firework boosts per player per race. */
  maxFireworks: number;
  /** Speed (m/s) during firework boost. */
  fireworkBoostSpeed: number;
  /** Duration of firework boost in seconds. */
  fireworkBoostDuration: number;
  /** Points per checkpoint (score mode). */
  checkpointPoints: number;
  /** Points per boost ring (score mode). */
  boostRingPoints: number;
  /** Points per 100 blocks flown (score mode). */
  distancePoints: number;
  /** Finish bonus for 1st place (score mode). */
  finishBonus1st: number;
  /** Finish bonus for 2nd place (score mode). */
  finishBonus2nd: number;
  /** Finish bonus for 3rd place (score mode). */
  finishBonus3rd: number;
  /** Time limit in seconds (0 = no limit). */
  timeLimit: number;
}

export interface GlideGameState {
  phase: GlidePhase;
  mode: GlideMode;
  track: GlideTrackId;
  players: GlidePlayer[];
  raceTime: number;
  countdownTimer: number;
  totalLaps: number;
  timeLimit: number;
  finishOrder: string[];
}

export interface GlideResults {
  rankings: GlidePlayerResult[];
  track: GlideTrackId;
  mode: GlideMode;
  totalLaps: number;
  raceTime: number;
}

export interface GlidePlayerResult {
  id: string;
  name: string;
  rank: number;
  lapsCompleted: number;
  checkpointsPassed: number;
  finishTime: number;
  finished: boolean;
  score: number;
  distanceFlown: number;
  wallHits: number;
}

// =============================================================================
// ELYTRA PHYSICS CONSTANTS
// =============================================================================

const ELYTRA = {
  /** Base gliding speed when level (m/s). */
  BASE_SPEED: 20,
  /** Minimum speed before stalling (m/s). */
  MIN_SPEED: 5,
  /** Terminal velocity cap (m/s). */
  MAX_SPEED: 70,
  /** Gravity acceleration (m/s^2). */
  GRAVITY: 9.8,
  /** Base aerodynamic drag coefficient. */
  BASE_DRAG: 0.02,
  /** Additional drag when climbing (nose up). */
  CLIMB_DRAG: 0.06,
  /** Speed gained per second when diving (pitch < 0). */
  DIVE_ACCEL: 15,
  /** Speed lost per second when climbing (pitch > 0). */
  CLIMB_DECEL: 12,
  /** Pitch rotation rate (degrees/second per unit input). */
  PITCH_RATE: 90,
  /** Yaw rotation rate from banking (degrees/second at 45 deg roll). */
  YAW_RATE: 60,
  /** Roll rotation rate (degrees/second per unit input). */
  ROLL_RATE: 120,
  /** Roll auto-center rate (degrees/second when no input). */
  ROLL_RETURN: 30,
  /** Maximum pitch angle (degrees). */
  MAX_PITCH: 80,
  /** Maximum roll angle (degrees). */
  MAX_ROLL: 70,
  /** Fraction of speed lost on wall collision. */
  COLLISION_SPEED_LOSS: 0.4,
  /** Velocity reflection factor on wall bounce. */
  COLLISION_BOUNCE: 0.3,
  /** Immunity ticks after a wall collision. */
  COLLISION_IMMUNITY: 20,
  /** Speed recovery rate during stall when diving (m/s^2). */
  STALL_RECOVERY: 8,
  /** How close to a checkpoint center to register as passed (blocks). */
  CHECKPOINT_TOLERANCE: 3,
} as const;

// =============================================================================
// MATH UTILITIES
// =============================================================================

function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function vec3Len(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Len(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec3Dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

/**
 * Forward direction vector from pitch and yaw (degrees).
 * Pitch negative = nose down, positive = nose up.
 */
function forwardFromRotation(pitch: number, yaw: number): Vec3 {
  const pr = degToRad(pitch);
  const yr = degToRad(yaw);
  return {
    x: -Math.sin(yr) * Math.cos(pr),
    y: Math.sin(pr),
    z: Math.cos(yr) * Math.cos(pr),
  };
}

/**
 * Distance from a point to the nearest point on a line segment.
 */
function pointSegmentDist(point: Vec3, segA: Vec3, segB: Vec3): number {
  const ab = vec3Sub(segB, segA);
  const ap = vec3Sub(point, segA);
  const abLenSq = vec3Dot(ab, ab);
  if (abLenSq === 0) return vec3Dist(point, segA);
  const t = clamp(vec3Dot(ap, ab) / abLenSq, 0, 1);
  const closest = vec3Add(segA, vec3Scale(ab, t));
  return vec3Dist(point, closest);
}

// =============================================================================
// TRACK HELPER FACTORIES
// =============================================================================

function cp(x: number, y: number, z: number, r: number, idx: number, nx: number, ny: number, nz: number): GlideCheckpoint {
  return { position: { x, y, z }, radius: r, index: idx, normal: { x: nx, y: ny, z: nz } };
}

function br(x: number, y: number, z: number, r: number, mult: number, dur: number, nx: number, ny: number, nz: number): GlideBoostRing {
  return { position: { x, y, z }, radius: r, speedMultiplier: mult, boostDuration: dur, normal: { x: nx, y: ny, z: nz } };
}

function wall(sx: number, sy: number, sz: number, ex: number, ey: number, ez: number, nx: number, ny: number, nz: number, t: number): GlideWallSegment {
  return { start: { x: sx, y: sy, z: sz }, end: { x: ex, y: ey, z: ez }, normal: { x: nx, y: ny, z: nz }, thickness: t };
}

// =============================================================================
// TRACK DEFINITIONS
// =============================================================================

export const GLIDE_TRACKS: Record<GlideTrackId, GlideTrackDefinition> = {
  // ---------------------------------------------------------------------------
  // Canyon Run — 12 checkpoints, open sky, wide turns, beginner friendly
  // ---------------------------------------------------------------------------
  canyon_run: {
    id: 'canyon_run',
    name: 'Canyon Run',
    nameJa: 'キャニオンラン',
    description: 'An open-sky canyon with wide sweeping turns, long straightaways, and gentle elevation changes. Perfect for learning elytra flight.',
    checkpoints: [
      cp(0, 100, 50, 8, 0, 0, 0, 1),
      cp(40, 95, 130, 8, 1, 0.45, 0, 0.89),
      cp(90, 85, 210, 8, 2, 0.71, 0, 0.71),
      cp(150, 78, 260, 8, 3, 0.95, 0, 0.31),
      cp(210, 72, 240, 8, 4, 0.81, 0, -0.59),
      cp(250, 66, 170, 8, 5, 0.31, 0, -0.95),
      cp(255, 62, 100, 8, 6, -0.16, 0, -0.99),
      cp(220, 67, 30, 8, 7, -0.81, 0, -0.59),
      cp(160, 75, -15, 8, 8, -0.99, 0, 0.16),
      cp(100, 82, 0, 8, 9, -0.81, 0, 0.59),
      cp(50, 90, 10, 8, 10, -0.45, 0.05, 0.89),
      cp(10, 96, 25, 8, 11, 0, 0.05, 1),
    ],
    boostRings: [
      br(60, 91, 165, 6, 1.5, 2, 0.58, 0, 0.81),
      br(175, 75, 255, 6, 1.5, 2, 0.93, 0, -0.37),
      br(253, 64, 135, 6, 1.5, 2, 0.05, 0, -1),
      br(195, 71, 5, 6, 1.5, 2, -0.87, 0, -0.5),
      br(75, 86, 5, 6, 1.5, 2, -0.63, 0.03, 0.77),
    ],
    boundaries: { minX: -50, maxX: 310, minY: 20, maxY: 160, minZ: -80, maxZ: 320 },
    startPositions: [
      { x: -6, y: 105, z: 10, yaw: 0, pitch: -5 },
      { x: 6, y: 105, z: 10, yaw: 0, pitch: -5 },
      { x: -6, y: 109, z: 5, yaw: 0, pitch: -5 },
      { x: 6, y: 109, z: 5, yaw: 0, pitch: -5 },
      { x: -12, y: 105, z: 10, yaw: 0, pitch: -5 },
      { x: 12, y: 105, z: 10, yaw: 0, pitch: -5 },
      { x: -12, y: 109, z: 5, yaw: 0, pitch: -5 },
      { x: 12, y: 109, z: 5, yaw: 0, pitch: -5 },
    ],
    defaultLaps: 3,
    wind: { x: 0, y: 0, z: 0 },
    walls: [
      // Left canyon wall
      wall(-40, 20, -70, -40, 150, 310, 1, 0, 0, 10),
      // Right canyon wall
      wall(300, 20, -70, 300, 150, 310, -1, 0, 0, 10),
      // Canyon floor
      wall(-40, 25, -70, 300, 25, 310, 0, 1, 0, 5),
      // Arch obstacle mid-canyon
      wall(130, 60, 140, 130, 100, 140, 1, 0, 0, 8),
    ],
  },

  // ---------------------------------------------------------------------------
  // Crystal Caverns — 10 checkpoints, tight underground, expert
  // ---------------------------------------------------------------------------
  crystal_caverns: {
    id: 'crystal_caverns',
    name: 'Crystal Caverns',
    nameJa: 'クリスタル洞窟',
    description: 'An underground cave racing course with tight corridors, stalactite obstacles, and glowing crystal formations. For experienced pilots.',
    checkpoints: [
      cp(0, 60, 30, 6, 0, 0, 0, 1),
      cp(25, 54, 85, 6, 1, 0.38, -0.09, 0.92),
      cp(55, 44, 140, 6, 2, 0.63, -0.17, 0.76),
      cp(95, 38, 165, 6, 3, 0.92, 0, 0.39),
      cp(145, 34, 148, 6, 4, 0.77, 0.05, -0.64),
      cp(155, 42, 95, 6, 5, 0.22, 0.15, -0.96),
      cp(135, 50, 50, 6, 6, -0.54, 0.1, -0.84),
      cp(95, 55, 20, 6, 7, -0.92, 0, -0.39),
      cp(55, 58, 5, 6, 8, -0.63, 0.05, 0.77),
      cp(15, 60, 15, 6, 9, -0.22, 0.03, 0.98),
    ],
    boostRings: [
      br(40, 49, 112, 5, 1.6, 1.5, 0.5, -0.13, 0.86),
      br(120, 36, 157, 5, 1.6, 1.5, 0.86, 0.03, -0.51),
      br(148, 46, 72, 5, 1.6, 1.5, 0.09, 0.12, -0.99),
      br(75, 57, 12, 5, 1.6, 1.5, -0.77, 0.03, 0.64),
    ],
    boundaries: { minX: -30, maxX: 200, minY: 10, maxY: 90, minZ: -40, maxZ: 210 },
    startPositions: [
      { x: -5, y: 63, z: 5, yaw: 0, pitch: -3 },
      { x: 5, y: 63, z: 5, yaw: 0, pitch: -3 },
      { x: -5, y: 66, z: 0, yaw: 0, pitch: -3 },
      { x: 5, y: 66, z: 0, yaw: 0, pitch: -3 },
      { x: -9, y: 63, z: 5, yaw: 0, pitch: -3 },
      { x: 9, y: 63, z: 5, yaw: 0, pitch: -3 },
      { x: -9, y: 66, z: 0, yaw: 0, pitch: -3 },
      { x: 9, y: 66, z: 0, yaw: 0, pitch: -3 },
    ],
    defaultLaps: 2,
    wind: { x: 0, y: 0, z: 0 },
    walls: [
      // Ceiling
      wall(-30, 85, -40, 200, 85, 210, 0, -1, 0, 5),
      // Floor
      wall(-30, 15, -40, 200, 15, 210, 0, 1, 0, 5),
      // Left wall
      wall(-25, 10, -40, -25, 90, 210, 1, 0, 0, 5),
      // Right wall
      wall(195, 10, -40, 195, 90, 210, -1, 0, 0, 5),
      // Back wall
      wall(-30, 10, -35, 200, 90, -35, 0, 0, 1, 5),
      // Stalactite 1
      wall(72, 38, 92, 72, 85, 92, 1, 0, 0, 8),
      // Stalactite 2
      wall(118, 33, 122, 118, 85, 122, -1, 0, 0, 8),
      // Crystal pillar center
      wall(80, 10, 75, 80, 70, 75, 0, 0, 1, 6),
    ],
  },

  // ---------------------------------------------------------------------------
  // Sky City — 15 checkpoints, buildings, altitude changes, intermediate
  // ---------------------------------------------------------------------------
  sky_city: {
    id: 'sky_city',
    name: 'Sky City',
    nameJa: 'スカイシティ',
    description: 'A high-altitude course weaving through floating buildings, bridges, and towers high above the clouds. Features dramatic altitude changes and tight weaves between structures.',
    checkpoints: [
      cp(0, 200, 40, 7, 0, 0, 0, 1),
      cp(35, 194, 95, 7, 1, 0.34, -0.06, 0.94),
      cp(75, 183, 150, 7, 2, 0.63, -0.15, 0.76),
      cp(125, 174, 190, 7, 3, 0.86, -0.07, 0.51),
      cp(185, 168, 195, 7, 4, 0.99, 0, 0.14),
      cp(235, 163, 168, 7, 5, 0.63, 0.03, -0.77),
      cp(260, 158, 115, 7, 6, 0.24, 0.02, -0.97),
      cp(250, 153, 55, 7, 7, -0.34, -0.05, -0.94),
      cp(215, 160, 5, 7, 8, -0.82, 0.09, -0.57),
      cp(165, 170, -20, 7, 9, -0.99, 0.07, 0.14),
      cp(115, 178, -5, 7, 10, -0.71, 0.09, 0.7),
      cp(72, 184, 15, 7, 11, -0.47, 0.06, 0.88),
      cp(35, 190, 5, 7, 12, -0.26, 0.06, 0.96),
      cp(10, 195, 18, 7, 13, 0, 0.04, 1),
      cp(2, 198, 32, 7, 14, 0, 0.02, 1),
    ],
    boostRings: [
      br(55, 189, 122, 6, 1.4, 2, 0.49, -0.11, 0.86),
      br(155, 171, 193, 6, 1.4, 2, 0.93, -0.04, 0.37),
      br(248, 160, 142, 6, 1.4, 2, 0.44, 0.02, -0.9),
      br(232, 156, 30, 6, 1.4, 2, -0.58, 0.07, -0.81),
      br(140, 174, -12, 6, 1.4, 2, -0.9, 0.09, 0.43),
    ],
    boundaries: { minX: -60, maxX: 320, minY: 100, maxY: 260, minZ: -80, maxZ: 260 },
    startPositions: [
      { x: -6, y: 205, z: 5, yaw: 0, pitch: -5 },
      { x: 6, y: 205, z: 5, yaw: 0, pitch: -5 },
      { x: -6, y: 209, z: 0, yaw: 0, pitch: -5 },
      { x: 6, y: 209, z: 0, yaw: 0, pitch: -5 },
      { x: -12, y: 205, z: 5, yaw: 0, pitch: -5 },
      { x: 12, y: 205, z: 5, yaw: 0, pitch: -5 },
      { x: -12, y: 209, z: 0, yaw: 0, pitch: -5 },
      { x: 12, y: 209, z: 0, yaw: 0, pitch: -5 },
    ],
    defaultLaps: 2,
    wind: { x: 0.5, y: 0, z: 0 },
    walls: [
      // Building 1 (cube at x:100, z:80)
      wall(88, 150, 68, 112, 220, 68, 0, 0, -1, 12),
      wall(88, 150, 92, 112, 220, 92, 0, 0, 1, 12),
      wall(88, 150, 68, 88, 220, 92, -1, 0, 0, 12),
      wall(112, 150, 68, 112, 220, 92, 1, 0, 0, 12),
      // Building 2 (cube at x:200, z:130)
      wall(190, 145, 120, 210, 210, 120, 0, 0, -1, 10),
      wall(190, 145, 140, 210, 210, 140, 0, 0, 1, 10),
      wall(190, 145, 120, 190, 210, 140, -1, 0, 0, 10),
      wall(210, 145, 120, 210, 210, 140, 1, 0, 0, 10),
      // Bridge between buildings (horizontal slab)
      wall(112, 178, 95, 190, 182, 125, 0, -1, 0, 4),
      // Floating tower (thin pillar at x:50, z:50)
      wall(44, 170, 44, 56, 240, 56, 1, 0, 0, 6),
      wall(44, 170, 44, 56, 240, 56, 0, 0, 1, 6),
    ],
  },
};

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_GLIDE_CONFIG: GlideConfig = {
  track: 'canyon_run',
  mode: 'time_trial',
  laps: 0, // 0 = use track default
  countdownDuration: 3,
  maxFireworks: 5,
  fireworkBoostSpeed: 50,
  fireworkBoostDuration: 2,
  checkpointPoints: 100,
  boostRingPoints: 50,
  distancePoints: 10,
  finishBonus1st: 500,
  finishBonus2nd: 300,
  finishBonus3rd: 150,
  timeLimit: 0,
};

// =============================================================================
// GLIDE MANAGER
// =============================================================================

export class GlideManager {
  phase: GlidePhase = 'lobby';
  mode: GlideMode;
  track: GlideTrackId;
  players: Map<string, GlidePlayer> = new Map();
  raceTime: number = 0;
  countdownTimer: number = 0;
  totalLaps: number;
  finishOrder: string[] = [];
  config: GlideConfig;

  private trackDef: GlideTrackDefinition;
  /** Per-player set of boost ring indices already triggered this lap. */
  private boostRingsUsed: Map<string, Set<number>> = new Map();
  /** Distance accumulator for score-mode distance scoring. */
  private distScoreAccum: Map<string, number> = new Map();

  constructor(config?: Partial<GlideConfig>) {
    this.config = { ...DEFAULT_GLIDE_CONFIG, ...config };
    this.mode = this.config.mode;
    this.track = this.config.track;
    this.trackDef = GLIDE_TRACKS[this.track];
    this.totalLaps = this.config.laps > 0 ? this.config.laps : this.trackDef.defaultLaps;
  }

  // ---------------------------------------------------------------------------
  // Player Management
  // ---------------------------------------------------------------------------

  addPlayer(id: string, name: string): boolean {
    if (this.players.size >= 8) return false;
    if (this.phase !== 'lobby') return false;
    if (this.players.has(id)) return false;

    const spawnIdx = this.players.size;
    const sp = this.trackDef.startPositions[spawnIdx] ?? this.trackDef.startPositions[0];

    this.players.set(id, {
      id,
      name,
      position: { x: sp.x, y: sp.y, z: sp.z },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { pitch: sp.pitch, yaw: sp.yaw, roll: 0 },
      speed: 0,
      checkpointsPassed: 0,
      currentCheckpoint: 0,
      lapsCompleted: 0,
      totalLaps: this.totalLaps,
      score: 0,
      finished: false,
      finishTime: 0,
      connected: true,
      ready: false,
      fireworksRemaining: this.config.maxFireworks,
      fireworkActive: false,
      fireworkTimer: 0,
      boostMultiplier: 1,
      boostTimer: 0,
      collisionImmunity: 0,
      stalled: false,
      distanceFlown: 0,
      wallHits: 0,
      rank: spawnIdx + 1,
    });

    this.boostRingsUsed.set(id, new Set());
    this.distScoreAccum.set(id, 0);
    return true;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    this.boostRingsUsed.delete(id);
    this.distScoreAccum.delete(id);
    this.updateRankings();
  }

  setReady(id: string, ready: boolean): void {
    const player = this.players.get(id);
    if (player) player.ready = ready;
  }

  setTrack(trackId: GlideTrackId): void {
    if (this.phase !== 'lobby') return;
    this.track = trackId;
    this.config.track = trackId;
    this.trackDef = GLIDE_TRACKS[trackId];
    this.totalLaps = this.config.laps > 0 ? this.config.laps : this.trackDef.defaultLaps;
  }

  setMode(mode: GlideMode): void {
    if (this.phase !== 'lobby') return;
    this.mode = mode;
    this.config.mode = mode;
  }

  setLaps(laps: number): void {
    if (this.phase !== 'lobby') return;
    this.totalLaps = Math.max(1, Math.min(10, laps));
    this.config.laps = this.totalLaps;
  }

  // ---------------------------------------------------------------------------
  // Game Flow
  // ---------------------------------------------------------------------------

  startGame(): boolean {
    if (this.phase !== 'lobby') return false;
    if (this.players.size < 1) return false;

    this.phase = 'countdown';
    this.countdownTimer = this.config.countdownDuration;
    this.raceTime = 0;
    this.finishOrder = [];

    // Reset all players
    let idx = 0;
    for (const player of this.players.values()) {
      const sp = this.trackDef.startPositions[idx % this.trackDef.startPositions.length];
      player.position = { x: sp.x, y: sp.y, z: sp.z };
      player.velocity = { x: 0, y: 0, z: 0 };
      player.rotation = { pitch: sp.pitch, yaw: sp.yaw, roll: 0 };
      player.speed = 0;
      player.checkpointsPassed = 0;
      player.currentCheckpoint = 0;
      player.lapsCompleted = 0;
      player.totalLaps = this.totalLaps;
      player.score = 0;
      player.finished = false;
      player.finishTime = 0;
      player.fireworksRemaining = this.config.maxFireworks;
      player.fireworkActive = false;
      player.fireworkTimer = 0;
      player.boostMultiplier = 1;
      player.boostTimer = 0;
      player.collisionImmunity = 0;
      player.stalled = false;
      player.distanceFlown = 0;
      player.wallHits = 0;
      player.rank = idx + 1;
      idx++;
    }

    // Reset tracking maps
    for (const [pid] of this.boostRingsUsed) {
      this.boostRingsUsed.set(pid, new Set());
    }
    for (const [pid] of this.distScoreAccum) {
      this.distScoreAccum.set(pid, 0);
    }

    return true;
  }

  tick(dt: number): void {
    if (this.phase === 'lobby' || this.phase === 'finished') return;

    // --- Countdown ---
    if (this.phase === 'countdown') {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.phase = 'racing';
        this.countdownTimer = 0;
        // Give initial forward speed to all players
        for (const player of this.players.values()) {
          player.speed = ELYTRA.BASE_SPEED;
          const fwd = forwardFromRotation(player.rotation.pitch, player.rotation.yaw);
          player.velocity = vec3Scale(fwd, player.speed);
        }
      }
      return;
    }

    // --- Racing ---
    this.raceTime += dt;

    // Time limit check
    if (this.config.timeLimit > 0 && this.raceTime >= this.config.timeLimit) {
      this.phase = 'finished';
      return;
    }

    // Tick each active player
    for (const player of this.players.values()) {
      if (!player.connected || player.finished) continue;
      this.tickPlayerPhysics(player, dt);
      this.tickCheckpoints(player);
      this.tickBoostRings(player);
      this.tickWallCollisions(player);
      this.tickBoundaries(player);
      this.tickFinish(player);
    }

    this.updateRankings();

    // All connected players finished?
    const stillRacing = Array.from(this.players.values()).filter((p) => p.connected && !p.finished);
    if (stillRacing.length === 0) {
      this.phase = 'finished';
    }
  }

  // ---------------------------------------------------------------------------
  // Player Input
  // ---------------------------------------------------------------------------

  /**
   * Apply player input for pitch, yaw, and roll.
   *
   * pitchInput: -1 (nose down) to +1 (nose up)
   * yawInput:   -1 (turn left) to +1 (turn right), minor direct yaw nudge
   * rollInput:  -1 (roll left) to +1 (roll right)
   */
  updatePlayerInput(playerId: string, pitchInput: number, yawInput: number, rollInput: number): void {
    const player = this.players.get(playerId);
    if (!player || player.finished || this.phase !== 'racing') return;

    const pi = clamp(pitchInput, -1, 1);
    const yi = clamp(yawInput, -1, 1);
    const ri = clamp(rollInput, -1, 1);

    const tick = 1 / 20; // Input granularity

    // --- Pitch ---
    player.rotation.pitch += pi * ELYTRA.PITCH_RATE * tick;
    player.rotation.pitch = clamp(player.rotation.pitch, -ELYTRA.MAX_PITCH, ELYTRA.MAX_PITCH);

    // --- Roll ---
    if (Math.abs(ri) > 0.1) {
      player.rotation.roll += ri * ELYTRA.ROLL_RATE * tick;
    } else {
      // Auto-center toward 0 when no input
      if (player.rotation.roll > 0) {
        player.rotation.roll = Math.max(0, player.rotation.roll - ELYTRA.ROLL_RETURN * tick);
      } else if (player.rotation.roll < 0) {
        player.rotation.roll = Math.min(0, player.rotation.roll + ELYTRA.ROLL_RETURN * tick);
      }
    }
    player.rotation.roll = clamp(player.rotation.roll, -ELYTRA.MAX_ROLL, ELYTRA.MAX_ROLL);

    // --- Yaw from banking ---
    const bankFactor = Math.sin(degToRad(player.rotation.roll));
    player.rotation.yaw += bankFactor * ELYTRA.YAW_RATE * tick;
    // Small direct yaw nudge
    player.rotation.yaw += yi * ELYTRA.YAW_RATE * 0.3 * tick;
    // Normalize
    player.rotation.yaw = ((player.rotation.yaw % 360) + 360) % 360;
  }

  // ---------------------------------------------------------------------------
  // Physics
  // ---------------------------------------------------------------------------

  private tickPlayerPhysics(player: GlidePlayer, dt: number): void {
    const prevPos = { ...player.position };

    // Pitch factor: negative pitch = nose down = positive factor (gaining speed)
    const pitchFactor = -Math.sin(degToRad(player.rotation.pitch));

    // Speed change from pitch
    if (pitchFactor > 0) {
      player.speed += pitchFactor * ELYTRA.DIVE_ACCEL * dt;
    } else {
      player.speed += pitchFactor * ELYTRA.CLIMB_DECEL * dt;
    }

    // --- Firework boost ---
    if (player.fireworkActive) {
      player.fireworkTimer -= dt;
      if (player.fireworkTimer <= 0) {
        player.fireworkActive = false;
        player.fireworkTimer = 0;
      } else {
        player.speed = Math.max(player.speed, this.config.fireworkBoostSpeed);
      }
    }

    // --- Boost ring multiplier decay ---
    if (player.boostTimer > 0) {
      player.boostTimer -= dt;
      if (player.boostTimer <= 0) {
        player.boostMultiplier = 1;
        player.boostTimer = 0;
      }
    }

    // --- Drag ---
    const drag = pitchFactor < 0
      ? ELYTRA.BASE_DRAG + ELYTRA.CLIMB_DRAG * Math.abs(pitchFactor)
      : ELYTRA.BASE_DRAG;
    player.speed -= player.speed * drag;

    // Effective speed with boost
    const effectiveSpeed = player.speed * player.boostMultiplier;

    // --- Gravity ---
    const grav = ELYTRA.GRAVITY * dt;

    // --- Stall ---
    if (player.speed < ELYTRA.MIN_SPEED) {
      player.stalled = true;
      player.speed = Math.max(0, player.speed);
      // Auto nose-down recovery
      if (player.rotation.pitch > -30) {
        player.rotation.pitch -= ELYTRA.STALL_RECOVERY * dt;
      }
      // Extra gravity during stall
      player.velocity.y -= grav * 2;
    } else {
      player.stalled = false;
    }

    // --- Terminal velocity ---
    player.speed = clamp(player.speed, 0, ELYTRA.MAX_SPEED);

    // --- Build velocity from forward and speed ---
    const fwd = forwardFromRotation(player.rotation.pitch, player.rotation.yaw);
    player.velocity = vec3Scale(fwd, effectiveSpeed);

    // --- Gravity (reduced when flying fast) ---
    const gravReduction = clamp(effectiveSpeed / ELYTRA.BASE_SPEED, 0, 1);
    player.velocity.y -= grav * (1 - gravReduction * 0.8);

    // --- Wind ---
    player.velocity = vec3Add(player.velocity, vec3Scale(this.trackDef.wind, dt));

    // --- Position update ---
    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;
    player.position.z += player.velocity.z * dt;

    // --- Collision immunity tick ---
    if (player.collisionImmunity > 0) player.collisionImmunity--;

    // --- Distance tracking ---
    const segDist = vec3Dist(prevPos, player.position);
    player.distanceFlown += segDist;

    // --- Score-mode distance points ---
    if (this.mode === 'score') {
      const accum = (this.distScoreAccum.get(player.id) ?? 0) + segDist;
      if (accum >= 100) {
        const chunks = Math.floor(accum / 100);
        player.score += chunks * this.config.distancePoints;
        this.distScoreAccum.set(player.id, accum - chunks * 100);
      } else {
        this.distScoreAccum.set(player.id, accum);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Firework Boost
  // ---------------------------------------------------------------------------

  useFirework(playerId: string): boolean {
    if (this.phase !== 'racing') return false;

    const player = this.players.get(playerId);
    if (!player || player.finished) return false;
    if (player.fireworksRemaining <= 0) return false;
    if (player.fireworkActive) return false;

    player.fireworksRemaining--;
    player.fireworkActive = true;
    player.fireworkTimer = this.config.fireworkBoostDuration;
    player.speed = Math.max(player.speed, this.config.fireworkBoostSpeed);

    return true;
  }

  // ---------------------------------------------------------------------------
  // Checkpoint Detection
  // ---------------------------------------------------------------------------

  private tickCheckpoints(player: GlidePlayer): void {
    const cps = this.trackDef.checkpoints;
    const nextIdx = player.currentCheckpoint;
    if (nextIdx >= cps.length) return;

    const target = cps[nextIdx];
    const dist = vec3Dist(player.position, target.position);
    const tolerance = target.radius + ELYTRA.CHECKPOINT_TOLERANCE;

    if (dist < tolerance) {
      // Directional check — generous to avoid frustrating near-misses
      const dir = vec3Normalize(player.velocity);
      const dot = vec3Dot(dir, target.normal);
      if (dot >= -0.2) {
        player.checkpointsPassed++;
        player.currentCheckpoint = nextIdx + 1;

        if (this.mode === 'score') {
          player.score += this.config.checkpointPoints;
        }

        // Lap completion
        if (player.currentCheckpoint >= cps.length) {
          player.currentCheckpoint = 0;
          player.lapsCompleted++;
          // Reset boost ring tracking for new lap
          this.boostRingsUsed.set(player.id, new Set());
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Boost Ring Detection
  // ---------------------------------------------------------------------------

  private tickBoostRings(player: GlidePlayer): void {
    const rings = this.trackDef.boostRings;
    const used = this.boostRingsUsed.get(player.id);
    if (!used) return;

    for (let i = 0; i < rings.length; i++) {
      if (used.has(i)) continue;

      const ring = rings[i];
      const dist = vec3Dist(player.position, ring.position);

      if (dist < ring.radius + 2) {
        const dir = vec3Normalize(player.velocity);
        const dot = vec3Dot(dir, ring.normal);

        if (dot >= -0.3) {
          used.add(i);
          player.boostMultiplier = ring.speedMultiplier;
          player.boostTimer = ring.boostDuration;

          if (this.mode === 'score') {
            player.score += this.config.boostRingPoints;
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Wall Collision
  // ---------------------------------------------------------------------------

  private tickWallCollisions(player: GlidePlayer): void {
    if (player.collisionImmunity > 0) return;

    for (const w of this.trackDef.walls) {
      const dist = pointSegmentDist(player.position, w.start, w.end);

      if (dist < w.thickness) {
        player.wallHits++;
        player.collisionImmunity = ELYTRA.COLLISION_IMMUNITY;

        // Speed penalty
        player.speed *= (1 - ELYTRA.COLLISION_SPEED_LOSS);

        // Bounce off wall
        const dotVN = vec3Dot(player.velocity, w.normal);
        if (dotVN < 0) {
          player.velocity = vec3Add(
            player.velocity,
            vec3Scale(w.normal, -2 * dotVN * ELYTRA.COLLISION_BOUNCE),
          );
        }

        // Push out of wall
        const pushDist = w.thickness - dist + 0.5;
        player.position = vec3Add(player.position, vec3Scale(w.normal, pushDist));

        // Only one collision per tick
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Boundary Enforcement
  // ---------------------------------------------------------------------------

  private tickBoundaries(player: GlidePlayer): void {
    const b = this.trackDef.boundaries;
    const margin = 5;

    if (player.position.x < b.minX + margin) {
      player.velocity.x = Math.abs(player.velocity.x) * 0.5;
      player.position.x = b.minX + margin;
    } else if (player.position.x > b.maxX - margin) {
      player.velocity.x = -Math.abs(player.velocity.x) * 0.5;
      player.position.x = b.maxX - margin;
    }

    if (player.position.y < b.minY + margin) {
      player.velocity.y = Math.abs(player.velocity.y) * 0.5;
      player.position.y = b.minY + margin;
      player.speed *= (1 - ELYTRA.COLLISION_SPEED_LOSS * 0.5);
      player.wallHits++;
    } else if (player.position.y > b.maxY - margin) {
      player.velocity.y = -Math.abs(player.velocity.y) * 0.5;
      player.position.y = b.maxY - margin;
    }

    if (player.position.z < b.minZ + margin) {
      player.velocity.z = Math.abs(player.velocity.z) * 0.5;
      player.position.z = b.minZ + margin;
    } else if (player.position.z > b.maxZ - margin) {
      player.velocity.z = -Math.abs(player.velocity.z) * 0.5;
      player.position.z = b.maxZ - margin;
    }
  }

  // ---------------------------------------------------------------------------
  // Finish Detection
  // ---------------------------------------------------------------------------

  private tickFinish(player: GlidePlayer): void {
    if (player.finished) return;

    if (player.lapsCompleted >= this.totalLaps) {
      player.finished = true;
      player.finishTime = this.raceTime;
      this.finishOrder.push(player.id);

      // Score mode finish bonus
      if (this.mode === 'score') {
        const pos = this.finishOrder.length;
        if (pos === 1) player.score += this.config.finishBonus1st;
        else if (pos === 2) player.score += this.config.finishBonus2nd;
        else if (pos === 3) player.score += this.config.finishBonus3rd;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rankings
  // ---------------------------------------------------------------------------

  private updateRankings(): void {
    const sorted = this.getLeaderboard();
    sorted.forEach((p, i) => { p.rank = i + 1; });
  }

  getLeaderboard(): GlidePlayer[] {
    return Array.from(this.players.values()).sort((a, b) => {
      // Finished players first
      if (a.finished && b.finished) {
        return this.mode === 'score'
          ? b.score - a.score
          : a.finishTime - b.finishTime;
      }
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;

      // By laps
      if (a.lapsCompleted !== b.lapsCompleted) return b.lapsCompleted - a.lapsCompleted;
      // By checkpoints
      if (a.checkpointsPassed !== b.checkpointsPassed) return b.checkpointsPassed - a.checkpointsPassed;

      // Score tiebreak
      if (this.mode === 'score') return b.score - a.score;

      // Proximity to next checkpoint
      const cps = this.trackDef.checkpoints;
      const nextA = a.currentCheckpoint < cps.length ? cps[a.currentCheckpoint] : null;
      const nextB = b.currentCheckpoint < cps.length ? cps[b.currentCheckpoint] : null;
      if (nextA && nextB) {
        return vec3Dist(a.position, nextA.position) - vec3Dist(b.position, nextB.position);
      }

      return 0;
    });
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  getPlayerProgress(playerId: string): number {
    const player = this.players.get(playerId);
    if (!player) return 0;
    const totalCps = this.trackDef.checkpoints.length * this.totalLaps;
    const passed = (player.lapsCompleted * this.trackDef.checkpoints.length) + player.checkpointsPassed;
    return totalCps > 0 ? passed / totalCps : 0;
  }

  getDistanceToNextCheckpoint(playerId: string): number {
    const player = this.players.get(playerId);
    if (!player) return Infinity;
    const cps = this.trackDef.checkpoints;
    if (player.currentCheckpoint >= cps.length) return 0;
    return vec3Dist(player.position, cps[player.currentCheckpoint].position);
  }

  getTrackLength(): number {
    const cps = this.trackDef.checkpoints;
    let total = 0;
    for (let i = 1; i < cps.length; i++) {
      total += vec3Dist(cps[i - 1].position, cps[i].position);
    }
    if (cps.length > 1) {
      total += vec3Dist(cps[cps.length - 1].position, cps[0].position);
    }
    return total;
  }

  getFinishedCount(): number {
    return Array.from(this.players.values()).filter((p) => p.finished).length;
  }

  getActiveCount(): number {
    return Array.from(this.players.values()).filter((p) => p.connected && !p.finished).length;
  }

  getResults(): GlideResults {
    const sorted = this.getLeaderboard();
    return {
      rankings: sorted.map((p, i) => ({
        id: p.id,
        name: p.name,
        rank: i + 1,
        lapsCompleted: p.lapsCompleted,
        checkpointsPassed: p.checkpointsPassed,
        finishTime: p.finishTime,
        finished: p.finished,
        score: p.score,
        distanceFlown: p.distanceFlown,
        wallHits: p.wallHits,
      })),
      track: this.track,
      mode: this.mode,
      totalLaps: this.totalLaps,
      raceTime: this.raceTime,
    };
  }

  getGameState(): GlideGameState {
    return {
      phase: this.phase,
      mode: this.mode,
      track: this.track,
      players: Array.from(this.players.values()).map((p) => ({
        ...p,
        position: { ...p.position },
        velocity: { ...p.velocity },
        rotation: { ...p.rotation },
      })),
      raceTime: this.raceTime,
      countdownTimer: this.countdownTimer,
      totalLaps: this.totalLaps,
      timeLimit: this.config.timeLimit,
      finishOrder: [...this.finishOrder],
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createGlideGame(config?: Partial<GlideConfig>): GlideManager {
  return new GlideManager(config);
}
