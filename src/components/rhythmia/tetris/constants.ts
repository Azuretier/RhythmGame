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

// ===== Terrain Settings =====
// Voxel blocks destroyed per cleared line (multiplied by beat multiplier)
export const TERRAIN_DAMAGE_PER_LINE = 4;

// ===== Item Definitions =====
import type { ItemType, WeaponCard } from './types';

export const ITEMS: ItemType[] = [
    { id: 'stone',    name: 'Stone Fragment',  nameJa: '石片',     icon: '🪨', color: '#8B8B8B', glowColor: '#A0A0A0', rarity: 'common',    dropWeight: 40 },
    { id: 'iron',     name: 'Iron Ore',        nameJa: '鉄鉱石',   icon: '⛏️', color: '#B87333', glowColor: '#D4956B', rarity: 'common',    dropWeight: 30 },
    { id: 'crystal',  name: 'Crystal Shard',   nameJa: '水晶片',   icon: '💎', color: '#4FC3F7', glowColor: '#81D4FA', rarity: 'uncommon',  dropWeight: 15 },
    { id: 'gold',     name: 'Gold Nugget',     nameJa: '金塊',     icon: '✨', color: '#FFD700', glowColor: '#FFECB3', rarity: 'rare',      dropWeight: 8 },
    { id: 'obsidian', name: 'Obsidian Core',   nameJa: '黒曜核',   icon: '🔮', color: '#9C27B0', glowColor: '#CE93D8', rarity: 'epic',      dropWeight: 5 },
    { id: 'star',     name: 'Star Fragment',   nameJa: '星の欠片', icon: '⭐', color: '#E0E0E0', glowColor: '#FFFFFF', rarity: 'legendary', dropWeight: 2 },
];

export const ITEM_MAP: Record<string, ItemType> = Object.fromEntries(ITEMS.map(i => [i.id, i]));

// Total drop weight for probability calculation
export const TOTAL_DROP_WEIGHT = ITEMS.reduce((sum, item) => sum + item.dropWeight, 0);

// ===== Weapon Card Definitions =====
export const WEAPON_CARDS: WeaponCard[] = [
    {
        id: 'stone_blade',
        name: 'Stone Blade',
        nameJa: '石の刃',
        icon: '🗡️',
        color: '#9E9E9E',
        glowColor: '#BDBDBD',
        description: '+10% terrain damage',
        descriptionJa: '地形ダメージ+10%',
        damageMultiplier: 1.1,
        recipe: [{ itemId: 'stone', count: 3 }],
    },
    {
        id: 'iron_pickaxe',
        name: 'Iron Pickaxe',
        nameJa: '鉄のピッケル',
        icon: '⛏️',
        color: '#B87333',
        glowColor: '#D4956B',
        description: '+20% terrain damage',
        descriptionJa: '地形ダメージ+20%',
        damageMultiplier: 1.2,
        recipe: [{ itemId: 'iron', count: 3 }],
    },
    {
        id: 'crystal_wand',
        name: 'Crystal Wand',
        nameJa: '水晶の杖',
        icon: '🪄',
        color: '#4FC3F7',
        glowColor: '#81D4FA',
        description: '+30% damage, wider beat window',
        descriptionJa: 'ダメージ+30%、ビート判定拡大',
        damageMultiplier: 1.3,
        specialEffect: 'wide_beat',
        recipe: [{ itemId: 'crystal', count: 2 }, { itemId: 'stone', count: 2 }],
    },
    {
        id: 'gold_hammer',
        name: 'Gold Hammer',
        nameJa: '黄金のハンマー',
        icon: '🔨',
        color: '#FFD700',
        glowColor: '#FFECB3',
        description: '+40% terrain damage',
        descriptionJa: '地形ダメージ+40%',
        damageMultiplier: 1.4,
        recipe: [{ itemId: 'gold', count: 2 }, { itemId: 'iron', count: 2 }],
    },
    {
        id: 'obsidian_edge',
        name: 'Obsidian Edge',
        nameJa: '黒曜の刃',
        icon: '🌑',
        color: '#9C27B0',
        glowColor: '#CE93D8',
        description: '+60% damage, shatter effect',
        descriptionJa: 'ダメージ+60%、粉砕効果',
        damageMultiplier: 1.6,
        specialEffect: 'shatter',
        recipe: [{ itemId: 'obsidian', count: 1 }, { itemId: 'iron', count: 2 }],
    },
    {
        id: 'star_cannon',
        name: 'Star Cannon',
        nameJa: '星砲',
        icon: '💫',
        color: '#E0E0E0',
        glowColor: '#FFFFFF',
        description: '+80% damage, burst particles',
        descriptionJa: 'ダメージ+80%、爆発効果',
        damageMultiplier: 1.8,
        specialEffect: 'burst',
        recipe: [{ itemId: 'star', count: 1 }, { itemId: 'crystal', count: 2 }],
    },
];

export const WEAPON_CARD_MAP: Record<string, WeaponCard> = Object.fromEntries(WEAPON_CARDS.map(c => [c.id, c]));

// Items dropped per terrain damage unit
export const ITEMS_PER_TERRAIN_DAMAGE = 0.3;

// Max floating items on screen at once
export const MAX_FLOATING_ITEMS = 12;

// Floating item animation duration (ms)
export const FLOAT_DURATION = 800;

// Terrain particle settings
export const TERRAIN_PARTICLES_PER_LINE = 15;
export const TERRAIN_PARTICLE_LIFETIME = 600;

// ===== Tower Defense Settings =====
export const ENEMY_SPAWN_DISTANCE = 18;  // Distance from center where enemies spawn (world units)
export const ENEMY_BASE_SPEED = 0.5;     // Legacy — grid system uses 1 tile/turn
export const ENEMY_TOWER_RADIUS = 3;     // Distance at which enemy "reaches" tower (world units)
export const ENEMIES_PER_BEAT = 1;       // Enemies spawned per beat
export const ENEMIES_KILLED_PER_LINE = 2; // Enemies killed per line clear

// ===== Block Grid System =====
// Enemies move on a discrete grid, 1 tile per turn, orthogonal only (no diagonals).
// The tower sits at grid origin (0, 0). Grid extends from -GRID_HALF to +GRID_HALF.
export const GRID_TILE_SIZE = 1;         // World units per grid tile
export const GRID_HALF = 18;             // Grid extends ±18 tiles from center
export const GRID_SPAWN_RING = 18;       // Manhattan distance from center for spawn perimeter
export const GRID_TOWER_RADIUS = 1;      // Grid tiles — enemy reaches tower at Manhattan dist ≤ this

// ===== Tower Defense HUD =====
export const MAX_HEALTH = 100;
export const ENEMY_REACH_DAMAGE = 15;    // Damage when an enemy reaches the tower
export const ENEMY_HP = 3;              // Default HP for each enemy
export const BULLET_SPEED = 4.5;        // Bullet travel speed per frame
export const BULLET_KILL_RADIUS = 1.5;  // Distance at which bullet hits enemy
export const BULLET_DAMAGE = 1;         // Damage per bullet hit
export const BULLET_FIRE_INTERVAL = 1000; // Auto-fire interval in ms

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
