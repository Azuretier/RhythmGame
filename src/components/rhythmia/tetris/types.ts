// ===== Game Mode =====
export type GameMode = 'vanilla' | 'td';

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

// ===== VFX Event Types =====

export type VFXEvent =
    | { type: 'beat'; bpm: number; intensity: number }
    | { type: 'lineClear'; rows: number[]; count: number; onBeat: boolean; combo: number }
    | { type: 'rotation'; pieceType: string; boardX: number; boardY: number; fromRotation: number; toRotation: number }
    | { type: 'hardDrop'; pieceType: string; boardX: number; boardY: number; dropDistance: number }
    | { type: 'comboChange'; combo: number; onBeat: boolean }
    | { type: 'feverStart'; combo: number }
    | { type: 'feverEnd' };

export type VFXEmitter = (event: VFXEvent) => void;
// ===== Game Loop Phase =====
export type GamePhase =
    | 'WORLD_CREATION'
    | 'PLAYING'
    | 'CRAFTING'
    | 'COLLAPSE'
    | 'TRANSITION';

// ===== Item System =====
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

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

export type InventoryItem = {
    itemId: string;
    count: number;
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

// ===== Weapon Cards =====
export type WeaponCard = {
    id: string;
    name: string;
    nameJa: string;
    icon: string;
    color: string;
    glowColor: string;
    description: string;
    descriptionJa: string;
    damageMultiplier: number;
    specialEffect?: string;
    recipe: { itemId: string; count: number }[];
};

export type CraftedCard = {
    cardId: string;
    craftedAt: number;
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
    targetX: number;
    targetY: number;
    targetZ: number;
    speed: number;
    alive: boolean;
};

// ===== Shop System =====
export type ShopItem = {
    id: string;
    name: string;
    nameJa: string;
    category: 'material' | 'weapon';
    price: number;
    icon: string;
    color: string;
    glowColor: string;
    rarity: ItemRarity;
    description: string;
    descriptionJa: string;
    stats?: { label: string; value: string }[];
    buildsFrom?: { itemId: string; price: number }[];
};

// ===== Key Bindings =====
export type KeyBindings = {
    inventory: string;
    shop: string;
    forge: string;
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
