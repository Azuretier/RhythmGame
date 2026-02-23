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
export const VISIBLE_HEIGHT = 20;
export const BUFFER_ZONE = 4;    // Hidden rows above the visible area (standard Tetris buffer)
export const BOARD_HEIGHT = VISIBLE_HEIGHT + BUFFER_ZONE; // Total board height (24)
export const CELL_SIZE = 28;

// ===== DAS/ARR/SDF Settings (in milliseconds) =====
// These are configurable - typical competitive values shown
export const DEFAULT_DAS = 167;  // Delayed Auto Shift - initial delay before auto-repeat (~10 frames at 60fps)
export const DEFAULT_ARR = 33;   // Auto Repeat Rate - delay between each auto-repeat move (~2 frames at 60fps)
// Set to 0 for instant movement (common in competitive play)
export const DEFAULT_SDF = 50;   // Soft Drop Factor - soft drop speed in ms

// ===== Lock Delay Settings =====
export const LOCK_DELAY = 500;     // Grace period (ms) after piece lands before locking
export const MAX_LOCK_MOVES = 15;  // Max moves/rotations on ground before forced lock

// ===== Terrain Settings =====
// Number of terrains (stages) to clear before advancing to the next world
export const TERRAINS_PER_WORLD = 4;
// Voxel blocks destroyed per cleared line (multiplied by beat multiplier)
export const TERRAIN_DAMAGE_PER_LINE = 4;

// ===== Item Definitions =====
import type { ItemType, RogueCard, ActiveEffects, DragonGaugeState } from './types';

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

// ===== Rogue-Like Card Definitions =====
export const ROGUE_CARDS: RogueCard[] = [
    // --- COMMON ---
    {
        id: 'stone_shield', name: 'Stone Shield', nameJa: '石の盾', icon: '🛡️',
        color: '#9E9E9E', glowColor: '#BDBDBD',
        description: 'First miss per stage doesn\'t break combo',
        descriptionJa: 'ステージ毎の最初のミスでコンボが途切れない',
        rarity: 'common', baseCost: [{ itemId: 'stone', count: 3 }],
        attribute: 'shield', attributeValue: 1,
    },
    {
        id: 'rhythm_cushion', name: 'Rhythm Cushion', nameJa: 'リズムクッション', icon: '🎵',
        color: '#8BC34A', glowColor: '#AED581',
        description: '+3% wider beat timing window',
        descriptionJa: 'ビート判定範囲+3%',
        rarity: 'common', baseCost: [{ itemId: 'stone', count: 2 }, { itemId: 'iron', count: 1 }],
        attribute: 'beat_extend', attributeValue: 0.03,
    },
    {
        id: 'iron_pickaxe', name: 'Iron Pickaxe', nameJa: '鉄のピッケル', icon: '⛏️',
        color: '#B87333', glowColor: '#D4956B',
        description: '+15% terrain damage on perfect beats',
        descriptionJa: 'パーフェクトビート時の地形ダメージ+15%',
        rarity: 'common', baseCost: [{ itemId: 'iron', count: 3 }],
        attribute: 'terrain_surge', attributeValue: 0.15,
    },
    {
        id: 'score_coin', name: 'Score Coin', nameJa: 'スコアコイン', icon: '🪙',
        color: '#FFC107', glowColor: '#FFE082',
        description: '+10% score multiplier',
        descriptionJa: 'スコア倍率+10%',
        rarity: 'common', baseCost: [{ itemId: 'stone', count: 2 }],
        attribute: 'score_boost', attributeValue: 0.10,
    },
    {
        id: 'slow_feather', name: 'Slow Feather', nameJa: '減速の羽根', icon: '🪶',
        color: '#90CAF9', glowColor: '#BBDEFB',
        description: '-10% piece gravity speed',
        descriptionJa: '落下速度-10%',
        rarity: 'common', baseCost: [{ itemId: 'stone', count: 1 }, { itemId: 'iron', count: 2 }],
        attribute: 'gravity_slow', attributeValue: 0.10,
    },
    // --- UNCOMMON ---
    {
        id: 'combo_guard', name: 'Combo Guard', nameJa: 'コンボガード', icon: '🔰',
        color: '#4FC3F7', glowColor: '#81D4FA',
        description: 'Missed beat continues combo (1 use per stage)',
        descriptionJa: 'ミス時もコンボ継続（ステージ毎1回）',
        rarity: 'uncommon', baseCost: [{ itemId: 'crystal', count: 2 }, { itemId: 'stone', count: 2 }],
        attribute: 'combo_guard', attributeValue: 1,
    },
    {
        id: 'crystal_lens', name: 'Crystal Lens', nameJa: '水晶レンズ', icon: '🔮',
        color: '#4FC3F7', glowColor: '#81D4FA',
        description: '+5% wider beat timing window',
        descriptionJa: 'ビート判定範囲+5%',
        rarity: 'uncommon', baseCost: [{ itemId: 'crystal', count: 2 }],
        attribute: 'beat_extend', attributeValue: 0.05,
    },
    {
        id: 'combo_ring', name: 'Combo Ring', nameJa: 'コンボリング', icon: '💍',
        color: '#AB47BC', glowColor: '#CE93D8',
        description: 'Combo multiplier grows 50% faster',
        descriptionJa: 'コンボ倍率の成長+50%',
        rarity: 'uncommon', baseCost: [{ itemId: 'crystal', count: 1 }, { itemId: 'iron', count: 2 }],
        attribute: 'combo_amplify', attributeValue: 1.5,
    },
    {
        id: 'lucky_charm', name: 'Lucky Charm', nameJa: '幸運のお守り', icon: '🍀',
        color: '#66BB6A', glowColor: '#A5D6A7',
        description: '+15% higher rarity material drops',
        descriptionJa: 'レアアイテムドロップ率+15%',
        rarity: 'uncommon', baseCost: [{ itemId: 'iron', count: 2 }, { itemId: 'crystal', count: 1 }],
        attribute: 'lucky_drops', attributeValue: 0.15,
    },
    // --- RARE ---
    {
        id: 'gold_surge', name: 'Gold Surge', nameJa: '黄金の波動', icon: '✨',
        color: '#FFD700', glowColor: '#FFECB3',
        description: '+30% terrain damage on perfect beats',
        descriptionJa: 'パーフェクトビート時の地形ダメージ+30%',
        rarity: 'rare', baseCost: [{ itemId: 'gold', count: 2 }, { itemId: 'iron', count: 2 }],
        attribute: 'terrain_surge', attributeValue: 0.30,
    },
    {
        id: 'gold_crown', name: 'Gold Crown', nameJa: '黄金の冠', icon: '👑',
        color: '#FFD700', glowColor: '#FFECB3',
        description: '+25% score multiplier',
        descriptionJa: 'スコア倍率+25%',
        rarity: 'rare', baseCost: [{ itemId: 'gold', count: 2 }, { itemId: 'crystal', count: 1 }],
        attribute: 'score_boost', attributeValue: 0.25,
    },
    {
        id: 'double_guard', name: 'Double Guard', nameJa: 'ダブルガード', icon: '🔰',
        color: '#FFD700', glowColor: '#FFECB3',
        description: 'Missed beat continues combo (2 uses per stage)',
        descriptionJa: 'ミス時もコンボ継続（ステージ毎2回）',
        rarity: 'rare', baseCost: [{ itemId: 'gold', count: 2 }, { itemId: 'crystal', count: 2 }],
        attribute: 'combo_guard', attributeValue: 2,
    },
    // --- EPIC ---
    {
        id: 'obsidian_heart', name: 'Obsidian Heart', nameJa: '黒曜の心臓', icon: '🖤',
        color: '#9C27B0', glowColor: '#CE93D8',
        description: '-25% piece gravity speed',
        descriptionJa: '落下速度-25%',
        rarity: 'epic', baseCost: [{ itemId: 'obsidian', count: 1 }, { itemId: 'gold', count: 1 }],
        attribute: 'gravity_slow', attributeValue: 0.25,
    },
    {
        id: 'void_lens', name: 'Void Lens', nameJa: '虚空のレンズ', icon: '🌑',
        color: '#9C27B0', glowColor: '#CE93D8',
        description: '+8% wider beat timing window',
        descriptionJa: 'ビート判定範囲+8%',
        rarity: 'epic', baseCost: [{ itemId: 'obsidian', count: 1 }, { itemId: 'crystal', count: 2 }],
        attribute: 'beat_extend', attributeValue: 0.08,
    },
    // --- LEGENDARY ---
    {
        id: 'star_heart', name: 'Star Heart', nameJa: '星の心臓', icon: '⭐',
        color: '#E0E0E0', glowColor: '#FFFFFF',
        description: 'Missed beat continues combo (3 uses per stage)',
        descriptionJa: 'ミス時もコンボ継続（ステージ毎3回）',
        rarity: 'legendary', baseCost: [{ itemId: 'star', count: 1 }, { itemId: 'obsidian', count: 1 }],
        attribute: 'combo_guard', attributeValue: 3,
    },
    {
        id: 'mandarin_dragon', name: 'Mandarin Dragon', nameJa: '蜜柑龍', icon: '🐉',
        color: '#FF8C00', glowColor: '#FFB300',
        description: 'Enables Dragon Gauge — T-spins charge Fury, Tetrises charge Might. When both full, Dragon Breath destroys all terrain!',
        descriptionJa: '龍ゲージ解放 — Tスピンで怒り、テトリスで力をチャージ。両方満タンで龍のブレスが全地形を破壊！',
        rarity: 'legendary', baseCost: [{ itemId: 'star', count: 1 }, { itemId: 'gold', count: 2 }],
        attribute: 'dragon_boost', attributeValue: 1.0,
    },
];

export const ROGUE_CARD_MAP: Record<string, RogueCard> = Object.fromEntries(
    ROGUE_CARDS.map(c => [c.id, c])
);

// Rarity weights for card offer selection
export const RARITY_OFFER_WEIGHTS: Record<string, number> = {
    common: 40,
    uncommon: 30,
    rare: 18,
    epic: 9,
    legendary: 3,
};

// Default (zero) active effects
export const DEFAULT_ACTIVE_EFFECTS: ActiveEffects = {
    comboGuardUsesRemaining: 0,
    shieldActive: false,
    terrainSurgeBonus: 0,
    beatExtendBonus: 0,
    scoreBoostMultiplier: 1,
    gravitySlowFactor: 1,
    luckyDropsBonus: 0,
    comboAmplifyFactor: 1,
    dragonBoostEnabled: false,
    dragonBoostChargeMultiplier: 1,
};

// Max cards to offer per selection
export const CARDS_OFFERED = 3;

// Items dropped per terrain damage unit
export const ITEMS_PER_TERRAIN_DAMAGE = 0.3;

// Max floating items on screen at once
export const MAX_FLOATING_ITEMS = 12;

// Floating item animation duration (ms)
export const FLOAT_DURATION = 800;

// Terrain particle settings
export const TERRAIN_PARTICLES_PER_LINE = 15;
export const TERRAIN_PARTICLE_LIFETIME = 600;

// ===== Mandarin Fever Dragon Boost =====
export const DRAGON_FURY_MAX = 10;
export const DRAGON_MIGHT_MAX = 10;
export const DRAGON_BREATH_DURATION = 3000; // ms
export const DRAGON_BREATH_SCORE_BONUS = 10000;

// Fury gauge charge amounts by T-spin type and line count
export const DRAGON_FURY_CHARGE: Record<string, Record<number, number>> = {
    mini:  { 0: 1, 1: 1, 2: 2 },
    full:  { 0: 2, 1: 2, 2: 3, 3: 5 },
};

// Might gauge charge amounts by line count
export const DRAGON_MIGHT_CHARGE: Record<number, number> = {
    3: 1,  // Triple
    4: 4,  // Tetris
};

export const DEFAULT_DRAGON_GAUGE: DragonGaugeState = {
    furyGauge: 0,
    mightGauge: 0,
    isBreathing: false,
    breathStartTime: 0,
    enabled: false,
};

// ===== Tower Defense Settings =====
export const ENEMY_SPAWN_DISTANCE = 18;  // Distance from center where enemies spawn (world units)
export const ENEMY_BASE_SPEED = 0.5;     // Legacy — grid system uses 1 tile/turn
export const ENEMY_TOWER_RADIUS = 3;     // Distance at which enemy "reaches" tower (world units)
export const ENEMIES_PER_BEAT = 1;       // Enemies spawned per beat
export const ENEMIES_KILLED_PER_LINE = 2; // Enemies killed per line clear

// ===== TD Wave Settings (within vanilla mode alternation) =====
export const TD_WAVE_BEATS = 12;       // Beats of enemy spawning per TD phase

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
export const BULLET_SPEED = 18;         // Horizontal launch speed (units/sec)
export const BULLET_GRAVITY = 40;       // Gravity acceleration (units/sec²)
export const BULLET_KILL_RADIUS = 1.5;  // Distance at which bullet hits enemy
export const BULLET_DAMAGE = 1;         // Damage per bullet hit
export const BULLET_FIRE_INTERVAL = 1000; // Auto-fire interval in ms
export const BULLET_GROUND_Y = 0.3;     // Y level at which bullet is considered landed

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
