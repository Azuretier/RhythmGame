import { BOARD_WIDTH, VISIBLE_HEIGHT } from './constants';

// ===== Galaxy Ring Layout =====
export const GALAXY_RING_DEPTH = 3;           // Cells: outer path, tower slots, buffer
export const GALAXY_PATH_LAYER = 0;           // Outermost ring row (enemy path)
export const GALAXY_TOWER_LAYER = 1;          // Middle ring row (tower placement)
export const GALAXY_BUFFER_LAYER = 2;         // Innermost ring row (visual buffer)

// Strip dimensions (cells)
export const GALAXY_TOP_WIDTH = BOARD_WIDTH + 2 * GALAXY_RING_DEPTH;   // 16
export const GALAXY_TOP_HEIGHT = GALAXY_RING_DEPTH;                     // 3
export const GALAXY_SIDE_WIDTH = GALAXY_RING_DEPTH;                     // 3
export const GALAXY_SIDE_HEIGHT = VISIBLE_HEIGHT;                       // 20

// Total path length (cells around the outer perimeter)
// Top: 16 + Right: 20 + Bottom: 16 + Left: 20 = 72 cells total
export const GALAXY_PATH_LENGTH =
    GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT + GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT;

// ===== Tower Settings =====
export const GALAXY_TOWER_MAX_CHARGE = 5;
export const GALAXY_TOWER_DAMAGE = 1;
export const GALAXY_TOWER_FIRE_INTERVAL = 2000;  // ms between auto-fires
export const GALAXY_TOWER_RANGE = 0.15;           // Path-fraction range for targeting

// Number of tower slots per side
export const GALAXY_TOWERS_PER_SIDE_TB = BOARD_WIDTH;   // 10 towers on top/bottom
export const GALAXY_TOWERS_PER_SIDE_LR = VISIBLE_HEIGHT; // 20 towers on left/right

// ===== Enemy Settings =====
export const GALAXY_ENEMY_BASE_SPEED = 0.02;   // Path-fraction per beat
export const GALAXY_ENEMY_BASE_HP = 3;
export const GALAXY_ENEMIES_PER_WAVE = 4;
export const GALAXY_WAVE_SPAWN_INTERVAL = 2;    // Beats between enemy spawns within a wave
export const GALAXY_WAVE_COOLDOWN = 6;          // Beats between waves

// ===== Gate Settings =====
export const GALAXY_GATE_HP = 50;

// Gate positions on the ring (path-fraction) — midpoint of each side
// Top midpoint: 0.5 * (GALAXY_TOP_WIDTH / GALAXY_PATH_LENGTH)
// Right midpoint: (GALAXY_TOP_WIDTH + 0.5 * GALAXY_SIDE_HEIGHT) / GALAXY_PATH_LENGTH
// etc.
export const GALAXY_GATE_POSITIONS = {
    top:    (GALAXY_TOP_WIDTH * 0.5) / GALAXY_PATH_LENGTH,
    right:  (GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT * 0.5) / GALAXY_PATH_LENGTH,
    bottom: (GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT + GALAXY_TOP_WIDTH * 0.5) / GALAXY_PATH_LENGTH,
    left:   (GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT + GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT * 0.5) / GALAXY_PATH_LENGTH,
} as const;

// ===== Line Clear → Tower Effects =====
export const GALAXY_CHARGE_PER_SINGLE = 1;
export const GALAXY_CHARGE_PER_DOUBLE = 2;
export const GALAXY_CHARGE_PER_TRIPLE = 3;     // Also triggers burst fire on all charged towers
export const GALAXY_TETRIS_AOE_DAMAGE = 2;     // Damages all alive enemies on the ring

// ===== Path Segment Boundaries =====
// Maps path-fraction ranges to ring sides (clockwise starting from top-left)
export const GALAXY_SIDE_BOUNDARIES = {
    top:    { start: 0, end: GALAXY_TOP_WIDTH / GALAXY_PATH_LENGTH },
    right:  {
        start: GALAXY_TOP_WIDTH / GALAXY_PATH_LENGTH,
        end: (GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT) / GALAXY_PATH_LENGTH,
    },
    bottom: {
        start: (GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT) / GALAXY_PATH_LENGTH,
        end: (GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT + GALAXY_TOP_WIDTH) / GALAXY_PATH_LENGTH,
    },
    left:   {
        start: (GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT + GALAXY_TOP_WIDTH) / GALAXY_PATH_LENGTH,
        end: 1.0,
    },
} as const;
