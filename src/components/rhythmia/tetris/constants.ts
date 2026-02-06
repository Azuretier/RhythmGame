// ===== Tetromino Definitions =====
// Using SRS (Super Rotation System) - the standard Tetris rotation system
// All 4 rotation states (0, R, 2, L) for each piece

export const TETROMINOES: Record<string, number[][][]> = {
    I: [
        [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // 0
        [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]], // R
        [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]], // 2
        [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]], // L
    ],
    O: [
        [[1, 1], [1, 1]], // 0
        [[1, 1], [1, 1]], // R
        [[1, 1], [1, 1]], // 2
        [[1, 1], [1, 1]], // L
    ],
    T: [
        [[0, 1, 0], [1, 1, 1], [0, 0, 0]], // 0
        [[0, 1, 0], [0, 1, 1], [0, 1, 0]], // R
        [[0, 0, 0], [1, 1, 1], [0, 1, 0]], // 2
        [[0, 1, 0], [1, 1, 0], [0, 1, 0]], // L
    ],
    S: [
        [[0, 1, 1], [1, 1, 0], [0, 0, 0]], // 0
        [[0, 1, 0], [0, 1, 1], [0, 0, 1]], // R
        [[0, 0, 0], [0, 1, 1], [1, 1, 0]], // 2
        [[1, 0, 0], [1, 1, 0], [0, 1, 0]], // L
    ],
    Z: [
        [[1, 1, 0], [0, 1, 1], [0, 0, 0]], // 0
        [[0, 0, 1], [0, 1, 1], [0, 1, 0]], // R
        [[0, 0, 0], [1, 1, 0], [0, 1, 1]], // 2
        [[0, 1, 0], [1, 1, 0], [1, 0, 0]], // L
    ],
    J: [
        [[1, 0, 0], [1, 1, 1], [0, 0, 0]], // 0
        [[0, 1, 1], [0, 1, 0], [0, 1, 0]], // R
        [[0, 0, 0], [1, 1, 1], [0, 0, 1]], // 2
        [[0, 1, 0], [0, 1, 0], [1, 1, 0]], // L
    ],
    L: [
        [[0, 0, 1], [1, 1, 1], [0, 0, 0]], // 0
        [[0, 1, 0], [0, 1, 0], [0, 1, 1]], // R
        [[0, 0, 0], [1, 1, 1], [1, 0, 0]], // 2
        [[1, 1, 0], [0, 1, 0], [0, 1, 0]], // L
    ],
};

// ===== SRS Wall Kick Data =====
// Format: [dx, dy] offsets to try when rotation fails
// Tests are tried in order until one succeeds

export const WALL_KICKS_JLSTZ: Record<string, [number, number][]> = {
    '0->R': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    'R->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2->L': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    'L->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    'R->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2->R': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    'L->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0->L': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

export const WALL_KICKS_I: Record<string, [number, number][]> = {
    '0->R': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    'R->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2->L': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    'L->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    'R->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '2->R': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    'L->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '0->L': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

// ===== Color Theme Types =====
export type ColorTheme = 'standard' | 'stage' | 'monochrome';

// ===== Piece Colors (Standard Default) =====
export const COLORS: Record<string, string> = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000',
};

// Standard Tetris colors for each piece type
export const STANDARD_COLORS: Record<string, string> = {
    I: '#00F0F0', // Cyan
    O: '#F0F000', // Yellow
    T: '#A000F0', // Purple
    S: '#00F000', // Green
    Z: '#F00000', // Red
    L: '#F0A000', // Orange
    J: '#0000F0', // Blue
};

// Monochrome colors (shades of white/gray)
export const MONOCHROME_COLORS: Record<string, string> = {
    I: '#FFFFFF',
    O: '#E0E0E0',
    T: '#C0C0C0',
    S: '#D0D0D0',
    Z: '#B0B0B0',
    L: '#F0F0F0',
    J: '#A0A0A0',
};

// ===== Rhythm Game Worlds =====
export interface World {
    name: string;
    bpm: number;
    colors: string[];
}

export const WORLDS: World[] = [
    { name: '🎀 メロディア', bpm: 100, colors: ['#FF6B9D', '#FF8FAB', '#FFB6C1', '#C44569', '#E8668B', '#D4587D', '#B84A6F'] },
    { name: '🌊 ハーモニア', bpm: 110, colors: ['#4ECDC4', '#45B7AA', '#3DA69B', '#35958C', '#2D847D', '#26736E', '#1A535C'] },
    { name: '☀️ クレシェンダ', bpm: 120, colors: ['#FFE66D', '#FFD93D', '#F7B731', '#ECA700', '#D19600', '#B68600', '#9B7600'] },
    { name: '🔥 フォルティッシモ', bpm: 140, colors: ['#FF6B6B', '#FF5252', '#FF3838', '#FF1F1F', '#E61717', '#CC0F0F', '#B30707'] },
    { name: '✨ 静寂の間', bpm: 160, colors: ['#A29BFE', '#9B8EFD', '#9381FC', '#8B74FB', '#8367FA', '#7B5AF9', '#6C5CE7'] },
];

// ===== Board Dimensions =====
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const CELL_SIZE = 28;

// ===== DAS/ARR/SDF Settings (in milliseconds) =====
// These are configurable - typical competitive values shown
export const DEFAULT_DAS = 167;  // Delayed Auto Shift - initial delay before auto-repeat (~10 frames at 60fps)
export const DEFAULT_ARR = 33;   // Auto Repeat Rate - delay between each auto-repeat move (~2 frames at 60fps)
// Set to 0 for instant movement (common in competitive play)
export const DEFAULT_SDF = 50;   // Soft Drop Factor - soft drop speed in ms

// ===== Helper Constants =====
export const ROTATION_NAMES = ['0', 'R', '2', 'L'];

// ===== Piece Type Array =====
export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// ===== Color Theme Helper =====
// Get color for a piece type based on theme and world
export const getThemedColor = (
    pieceType: string,
    theme: ColorTheme,
    worldIdx: number
): string => {
    switch (theme) {
        case 'standard':
            return STANDARD_COLORS[pieceType] || COLORS[pieceType];
        case 'monochrome':
            return MONOCHROME_COLORS[pieceType] || '#FFFFFF';
        case 'stage':
        default:
            // Use world colors based on piece index
            const pieceIndex = PIECE_TYPES.indexOf(pieceType);
            if (pieceIndex >= 0 && WORLDS[worldIdx]) {
                return WORLDS[worldIdx].colors[pieceIndex] || COLORS[pieceType];
            }
            return COLORS[pieceType];
    }
};
