// ===== Galaxy TD Shared Dimension Constants =====
// Grid layout, 3D sizing, and scene defaults shared across
// GalaxyScene.tsx, CenterTerrain.tsx, and camera hooks.
//
// NOTE: Game balance constants (gold, damage, waves) stay in galaxy-constants.ts.

import {
    GALAXY_RING_DEPTH,
    GALAXY_TOP_WIDTH,
    GALAXY_SIDE_HEIGHT,
} from './galaxy-constants';

// ===== Grid dimensions (cells) =====
export const GRID_W = GALAXY_TOP_WIDTH;                            // 16
export const GRID_H = GALAXY_SIDE_HEIGHT + 2 * GALAXY_RING_DEPTH; // 26
export const DEPTH = GALAXY_RING_DEPTH;                            // 3
export const BOARD_W = GRID_W - 2 * DEPTH;                        // 10
export const BOARD_H = GALAXY_SIDE_HEIGHT;                         // 20

// ===== 3D sizing (world units) =====
export const CELL = 0.32;
export const CELL_GAP = 0.02;
export const ORIGIN_X = -(GRID_W - 1) * CELL * 0.5;
export const ORIGIN_Z = -(GRID_H - 1) * CELL * 0.5;

// ===== Scene rotation =====
export const SCENE_ROTATION_X = 0.45; // ~25.8 degrees tilt

// ===== Camera defaults =====
export const DEFAULT_CAMERA_POSITION = [0, 5, 7] as const;
export const DEFAULT_CAMERA_FOV = 50;
