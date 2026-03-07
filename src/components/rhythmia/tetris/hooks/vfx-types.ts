// ===== VFX Type Definitions & Utilities =====

// ===== Particle/Effect Base Types =====

export interface BaseParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    alpha: number;
    size: number;
}

export interface BeatRing {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number;
    maxLife: number;
    color: string;
    lineWidth: number;
}

export interface EqualizerBar {
    x: number;
    baseY: number;
    width: number;
    height: number;
    targetHeight: number;
    color: string;
    life: number;
    maxLife: number;
    phase: number;
}

export interface GlitchParticle extends BaseParticle {
    width: number;
    height: number;
    glitchOffset: number;
}

export interface RotationTrail {
    cells: { x: number; y: number }[];
    color: string;
    life: number;
    maxLife: number;
    alpha: number;
}

export interface WhirlpoolEffect {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number;
    maxLife: number;
    rotation: number;
    color: string;
}

export interface SpeedLine {
    x: number;
    y: number;
    length: number;
    angle: number;
    speed: number;
    life: number;
    maxLife: number;
    alpha: number;
    width: number;
}

export interface AscendingParticle extends BaseParticle {
    pulsePhase: number;
    pulseSpeed: number;
}

export interface ComboBreakShard {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    width: number;
    height: number;
    life: number;
    maxLife: number;
    color: string;
    alpha: number;
    trail: { x: number; y: number; alpha: number }[];
}

export interface ComboBreakRing {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number;
    maxLife: number;
    color: string;
    lineWidth: number;
    dashed: boolean;
}

// ===== Dragon Breath VFX Types =====

export interface DragonFireParticle extends BaseParticle {
    scaleX: number;
    heat: number; // 0-1, affects color gradient (0=outer crimson, 1=white core)
}

export interface DragonEmber {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    flicker: number;
    flickerSpeed: number;
}

export interface DragonEnergyTrail {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    progress: number; // 0-1
    speed: number;
    life: number;
    color: string;
    width: number;
    trail: { x: number; y: number }[];
}

export interface DragonBreathWave {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number;
    maxLife: number;
}

// ===== Elemental VFX Types =====

export interface ElementOrbParticle extends BaseParticle {
    /** Element type color key for glow */
    elementColor: string;
    glowColor: string;
    pulsePhase: number;
    pulseSpeed: number;
    /** Orbit wobble angle */
    orbitAngle: number;
    orbitSpeed: number;
    orbitRadius: number;
}

export interface ReactionBurst {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number;
    maxLife: number;
    color: string;
    glowColor: string;
    lineWidth: number;
    /** Inner ring offset for double-ring effect */
    innerRatio: number;
}

export interface ReactionAura {
    life: number;
    maxLife: number;
    color: string;
    glowColor: string;
    /** Edge vignette intensity */
    intensity: number;
    pulsePhase: number;
}

export interface EquipmentBeam {
    x: number;
    y: number;
    width: number;
    height: number;
    maxHeight: number;
    life: number;
    maxLife: number;
    color: string;
    glowColor: string;
    /** Rarity glow intensity multiplier */
    glowIntensity: number;
}

export interface CorruptionGlitch {
    x: number;
    y: number;
    width: number;
    height: number;
    life: number;
    maxLife: number;
    color: string;
    offsetX: number;
    offsetY: number;
}

// All active effects managed by the VFX system
export interface VFXState {
    beatRings: BeatRing[];
    equalizerBars: EqualizerBar[];
    glitchParticles: GlitchParticle[];
    rotationTrails: RotationTrail[];
    whirlpools: WhirlpoolEffect[];
    speedLines: SpeedLine[];
    ascendingParticles: AscendingParticle[];
    genericParticles: BaseParticle[];
    comboBreakShards: ComboBreakShard[];
    comboBreakRings: ComboBreakRing[];
    isFever: boolean;
    feverHue: number;
    combo: number;
    // Dragon Breath VFX
    dragonFireParticles: DragonFireParticle[];
    dragonEmbers: DragonEmber[];
    dragonEnergyTrails: DragonEnergyTrail[];
    dragonBreathWaves: DragonBreathWave[];
    isDragonBreathing: boolean;
    dragonBreathPhase: number; // 0-1 animation progress
    dragonFlashAlpha: number;  // screen flash intensity
    // Elemental VFX
    elementOrbParticles: ElementOrbParticle[];
    reactionBursts: ReactionBurst[];
    reactionAuras: ReactionAura[];
    equipmentBeams: EquipmentBeam[];
    corruptionGlitches: CorruptionGlitch[];
    corruptionShakeIntensity: number;
    corruptionFlashAlpha: number;
}

// Board geometry needed for coordinate conversion
export interface BoardGeometry {
    left: number;
    top: number;
    cellSize: number;
    width: number;
    height: number;
}

// Particle pool caps — prevent unbounded growth during intense gameplay
export const MAX_BEAT_RINGS = 30;
export const MAX_EQUALIZER_BARS = 60;
export const MAX_GLITCH_PARTICLES = 80;
// export const MAX_ROTATION_TRAILS = 20;
// export const MAX_WHIRLPOOLS = 10;
export const MAX_SPEED_LINES = 60;
export const MAX_ASCENDING_PARTICLES = 80;
export const MAX_GENERIC_PARTICLES = 120;
export const MAX_COMBO_BREAK_SHARDS = 50;
// export const MAX_COMBO_BREAK_RINGS = 20;
export const MAX_DRAGON_ENERGY_TRAILS = 30;
export const MAX_DRAGON_FIRE_PARTICLES = 100;
export const MAX_DRAGON_EMBERS = 80;
export const _MAX_DRAGON_BREATH_WAVES = 20;

/**
 * Create a fresh default VFXState with all arrays empty.
 */
export function createDefaultVFXState(): VFXState {
    return {
        beatRings: [],
        equalizerBars: [],
        glitchParticles: [],
        rotationTrails: [],
        whirlpools: [],
        speedLines: [],
        ascendingParticles: [],
        genericParticles: [],
        comboBreakShards: [],
        comboBreakRings: [],
        isFever: false,
        feverHue: 0,
        combo: 0,
        dragonFireParticles: [],
        dragonEmbers: [],
        dragonEnergyTrails: [],
        dragonBreathWaves: [],
        isDragonBreathing: false,
        dragonBreathPhase: 0,
        dragonFlashAlpha: 0,
        elementOrbParticles: [],
        reactionBursts: [],
        reactionAuras: [],
        equipmentBeams: [],
        corruptionGlitches: [],
        corruptionShakeIntensity: 0,
        corruptionFlashAlpha: 0,
    };
}

/**
 * O(1) removal from array during reverse iteration:
 * swap dead element with last element and pop.
 */
export function swapRemove<T>(arr: T[], i: number): void {
    const last = arr.length - 1;
    if (i !== last) arr[i] = arr[last];
    arr.pop();
}
