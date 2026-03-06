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

// ===== Tower Slot Layout =====
// Number of tower slots per side
export const GALAXY_TOWERS_PER_SIDE_TB = BOARD_WIDTH;   // 10 towers on top/bottom
export const GALAXY_TOWERS_PER_SIDE_LR = VISIBLE_HEIGHT; // 20 towers on left/right

// ===== Gold Economy (replaces old charge system) =====
export const GALAXY_INITIAL_GOLD = 200;
export const GALAXY_INITIAL_LIVES = 10;

export const GALAXY_GOLD_PER_SINGLE = 25;
export const GALAXY_GOLD_PER_DOUBLE = 60;
export const GALAXY_GOLD_PER_TRIPLE = 100;
export const GALAXY_GOLD_PER_TETRIS = 175;

export const GALAXY_TETRIS_AOE_DAMAGE = 50;  // Scaled for real HP pools

// ===== Wave Timing =====
export const GALAXY_WAVE_PREP_BEATS = 8;     // Build phase between waves
export const GALAXY_RING_TOTAL_WAVES = 30;

// ===== Speed Conversion =====
// Enemy speeds from ENEMY_DEFS are in cells/second on a 2D grid.
// Ring path is 72 cells. Divisor converts to path-fraction/second.
// Using 24 instead of 72 for faster ring traversal (~16s for grunts).
export const GALAXY_SPEED_DIVISOR = 24;

// ===== Range Conversion =====
// Tower ranges from TOWER_DEFS are in grid cells.
// Convert to path-fraction: range / GALAXY_PATH_LENGTH
export const GALAXY_RANGE_DIVISOR = GALAXY_PATH_LENGTH; // 72

// ===== Sell Refund =====
export const GALAXY_SELL_REFUND_RATE = 0.7;  // 70% of total invested

// ===== Gate Settings =====
export const GALAXY_GATE_HP = 50;

// Gate positions on the ring (path-fraction) — midpoint of each side
export const GALAXY_GATE_POSITIONS = {
    top:    (GALAXY_TOP_WIDTH * 0.5) / GALAXY_PATH_LENGTH,
    right:  (GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT * 0.5) / GALAXY_PATH_LENGTH,
    bottom: (GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT + GALAXY_TOP_WIDTH * 0.5) / GALAXY_PATH_LENGTH,
    left:   (GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT + GALAXY_TOP_WIDTH + GALAXY_SIDE_HEIGHT * 0.5) / GALAXY_PATH_LENGTH,
} as const;

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
