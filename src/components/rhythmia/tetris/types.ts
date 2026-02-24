// ===== Game Mode =====
export type GameMode = 'vanilla';

// ===== Terrain Phase (alternating within vanilla mode) =====
export type TerrainPhase = 'dig' | 'td';

// ===== Game Types =====

export type Piece = {
    type: string;
    rotation: number;
    x: number;
    y: number;
};

export type KeyState = {
    pressed: boolean;
    dasCharged: boolean;
    lastMoveTime: number;
    pressTime: number;
};

export type BoardCell = string | null;
export type Board = BoardCell[][];

export type GameState = {
    board: Board;
    currentPiece: Piece | null;
    nextPiece: string;
    holdPiece: string | null;
    canHold: boolean;
    pieceBag: string[];
    score: number;
    combo: number;
    lines: number;
    level: number;
    gameOver: boolean;
    isPaused: boolean;
    isPlaying: boolean;
};

export type RhythmState = {
    worldIdx: number;
    terrainSeed: number;
    terrainDestroyedCount: number;
    terrainTotal: number;
    stageNumber: number;
    beatPhase: number;
    judgmentText: string;
    judgmentColor: string;
    showJudgmentAnim: boolean;
    boardBeat: boolean;
    boardShake: boolean;
    scorePop: boolean;
};

// ===== Dragon Gauge (Mandarin Fever) =====
export type DragonGaugeState = {
    furyGauge: number;       // 0-10, charges from T-spins
    mightGauge: number;      // 0-10, charges from Tetrises
    isBreathing: boolean;    // true during dragon breath animation
    breathStartTime: number; // timestamp when breath started
    enabled: boolean;        // true when Mandarin Dragon card equipped
};

// ===== VFX Event Types =====

export type VFXEvent =
    | { type: 'beat'; bpm: number; intensity: number }
    | { type: 'lineClear'; rows: number[]; count: number; onBeat: boolean; combo: number }
    | { type: 'rotation'; pieceType: string; boardX: number; boardY: number; fromRotation: number; toRotation: number }
    | { type: 'hardDrop'; pieceType: string; boardX: number; boardY: number; dropDistance: number }
    | { type: 'comboChange'; combo: number; onBeat: boolean }
    | { type: 'comboBreak'; lostCombo: number }
    | { type: 'feverStart'; combo: number }
    | { type: 'feverEnd' }
    | { type: 'dragonGaugeCharge'; gauge: 'fury' | 'might'; amount: number; newValue: number }
    | { type: 'dragonBreathStart' }
    | { type: 'dragonBreathEnd' };

export type VFXEmitter = (event: VFXEvent) => void;

// ===== Game Loop Phase =====
export type GamePhase =
    | 'WORLD_CREATION'
    | 'PLAYING'
    | 'CARD_SELECT'
    | 'CARD_ABSORBING'
    | 'COLLAPSE'
    | 'TRANSITION'
    | 'CHECKPOINT';

// ===== Item System =====
// Shared types re-exported from @/lib/items for backward compatibility
export type { ItemRarity, InventoryEntry as InventoryItem } from '@/lib/items/types';
import type { ItemRarity } from '@/lib/items/types';

export type ItemType = {
    id: string;
    name: string;
    nameJa: string;
    icon: string;
    color: string;
    glowColor: string;
    rarity: ItemRarity;
    dropWeight: number;
};

// ===== Floating Item (visual) =====
export type FloatingItem = {
    id: number;
    itemId: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    startTime: number;
    duration: number;
    collected: boolean;
};

// ===== Card Attribute System =====
export type CardAttribute =
    | 'combo_guard'     // Missed beat doesn't break combo (limited uses per stage)
    | 'terrain_surge'   // +% terrain damage on perfect beats
    | 'beat_extend'     // Wider beat timing window
    | 'score_boost'     // +% score multiplier
    | 'gravity_slow'    // -% piece gravity speed
    | 'lucky_drops'     // Higher rarity material drop rates
    | 'combo_amplify'   // Combo multiplier grows faster
    | 'shield'          // First miss per stage doesn't break combo
    | 'dragon_boost';   // Enables Mandarin Fever dragon gauge system

// ===== Rogue-Like Card =====
export type RogueCard = {
    id: string;
    name: string;
    nameJa: string;
    icon: string;
    color: string;
    glowColor: string;
    description: string;
    descriptionJa: string;
    rarity: ItemRarity;
    baseCost: { itemId: string; count: number }[];
    attribute: CardAttribute;
    /** Per-attribute numeric value (uses for combo_guard, % for terrain_surge, etc.) */
    attributeValue: number;
};

// ===== Equipped Card (player's deck) =====
export type EquippedCard = {
    cardId: string;
    equippedAt: number;
    stackCount: number;
};

// ===== Active Attribute Effects (runtime tracking) =====
export type ActiveEffects = {
    comboGuardUsesRemaining: number;
    shieldActive: boolean;
    terrainSurgeBonus: number;
    beatExtendBonus: number;
    scoreBoostMultiplier: number;
    gravitySlowFactor: number;
    luckyDropsBonus: number;
    comboAmplifyFactor: number;
    dragonBoostEnabled: boolean;
    dragonBoostChargeMultiplier: number;
};

// ===== Card Selection Offer =====
export type CardOffer = {
    card: RogueCard;
    scaledCost: { itemId: string; count: number }[];
    affordable: boolean;
};

// ===== Tower Defense =====

// Grid position for block-based movement (orthogonal only, 1 tile per turn)
export type GridPos = { gx: number; gz: number };

export type Enemy = {
    id: number;
    // World-space position (derived from grid coords for rendering)
    x: number;
    y: number;
    z: number;
    // Grid coordinates — enemies move 1 tile per turn, orthogonal only
    gridX: number;
    gridZ: number;
    speed: number;
    health: number;
    maxHealth: number;
    alive: boolean;
    spawnTime: number;
};

export type Bullet = {
    id: number;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    targetEnemyId: number;
    alive: boolean;
};

// ===== Terrain Particle =====
export type TerrainParticle = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    opacity: number;
    life: number;
    maxLife: number;
};

// ===== Feature Customizer Settings =====
export type FeatureSettings = {
    ghostPiece: boolean;
    beatVfx: boolean;
    particles: boolean;
    items: boolean;
    voxelBackground: boolean;
    beatBar: boolean;
    sound: boolean;
    garbageMeter: boolean;
    mouseControls: boolean;
};

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
    ghostPiece: true,
    beatVfx: true,
    particles: true,
    items: true,
    voxelBackground: true,
    beatBar: true,
    sound: true,
    garbageMeter: true,
    mouseControls: false,
};

// ===== Corruption & Anomaly System =====

export type SideBoardSide = 'left' | 'right';

export interface CorruptionNode {
    id: number;
    gx: number;          // Terrain grid X coordinate
    gz: number;          // Terrain grid Z coordinate
    level: number;       // 0=seed → 5=mature (enemy spawn point)
    maxLevel: number;
    spawnTime: number;
    lastGrowTime: number;
}

export interface AnomalyEvent {
    id: number;
    triggerTime: number;
    active: boolean;
}
