// ===== Galaxy Architecture Types =====
// The "Galaxy" layout wraps the Tetris board with a square TD ring.
// Enemies travel clockwise along the outer path; towers sit on the inner ring.

export type GalaxyRingSide = 'top' | 'bottom' | 'left' | 'right';

// A tower placed on the inner ring of one side
export type GalaxyTower = {
    id: number;
    side: GalaxyRingSide;
    index: number;         // position along that side's tower row (0-based)
    charge: number;        // 0–maxCharge, increases from tetris line clears
    maxCharge: number;
    lastFireTime: number;
    level: number;         // increments when charge overflows maxCharge
};

// An enemy traveling along the outer ring path
export type GalaxyRingEnemy = {
    id: number;
    pathPosition: number;  // 0.0–1.0 along the full ring loop (clockwise)
    speed: number;         // path-fraction per tick
    health: number;
    maxHealth: number;
    alive: boolean;
    spawnTime: number;
};

// A gate at the midpoint of each side — enemies loop past gates
export type GalaxyGate = {
    side: GalaxyRingSide;
    health: number;
    maxHealth: number;
};

// Full galaxy TD state snapshot
export type GalaxyTDState = {
    enemies: GalaxyRingEnemy[];
    towers: GalaxyTower[];
    gates: GalaxyGate[];
    waveNumber: number;
    beatsSinceLastSpawn: number;
};
