import { useRef, useCallback, useEffect, useMemo } from 'react';
import type { VFXEvent } from '../types';
import { BOARD_WIDTH, VISIBLE_HEIGHT, BUFFER_ZONE, WORLDS } from '../constants';
import { ELEMENT_CONFIGS } from '@/lib/elements/definitions';
import { REACTION_DEFINITIONS } from '@/lib/elements/definitions';
import { RARITY_CONFIG } from '@/lib/items/types';

// ===== Particle/Effect Base Types =====

interface BaseParticle {
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

interface BeatRing {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number;
    maxLife: number;
    color: string;
    lineWidth: number;
}

interface EqualizerBar {
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

interface GlitchParticle extends BaseParticle {
    width: number;
    height: number;
    glitchOffset: number;
}

interface RotationTrail {
    cells: { x: number; y: number }[];
    color: string;
    life: number;
    maxLife: number;
    alpha: number;
}

interface WhirlpoolEffect {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number;
    maxLife: number;
    rotation: number;
    color: string;
}

interface SpeedLine {
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

interface AscendingParticle extends BaseParticle {
    pulsePhase: number;
    pulseSpeed: number;
}

interface ComboBreakShard {
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

interface ComboBreakRing {
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

interface DragonFireParticle extends BaseParticle {
    scaleX: number;
    heat: number; // 0-1, affects color gradient (0=outer crimson, 1=white core)
}

interface DragonEmber {
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

interface DragonEnergyTrail {
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

interface DragonBreathWave {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number;
    maxLife: number;
}

// ===== Elemental VFX Types =====

interface ElementOrbParticle extends BaseParticle {
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

interface ReactionBurst {
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

interface ReactionAura {
    life: number;
    maxLife: number;
    color: string;
    glowColor: string;
    /** Edge vignette intensity */
    intensity: number;
    pulsePhase: number;
}

interface EquipmentBeam {
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

interface CorruptionGlitch {
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
interface VFXState {
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
const MAX_BEAT_RINGS = 30;
const MAX_EQUALIZER_BARS = 60;
const MAX_GLITCH_PARTICLES = 80;
const MAX_ROTATION_TRAILS = 20;
const MAX_WHIRLPOOLS = 10;
const MAX_SPEED_LINES = 60;
const MAX_ASCENDING_PARTICLES = 80;
const MAX_GENERIC_PARTICLES = 120;
const MAX_COMBO_BREAK_SHARDS = 50;
const MAX_COMBO_BREAK_RINGS = 20;
const MAX_DRAGON_ENERGY_TRAILS = 30;
const MAX_DRAGON_FIRE_PARTICLES = 100;
const MAX_DRAGON_EMBERS = 80;
const MAX_DRAGON_BREATH_WAVES = 20;

/**
 * O(1) removal from array during reverse iteration:
 * swap dead element with last element and pop.
 */
function swapRemove<T>(arr: T[], i: number): void {
    const last = arr.length - 1;
    if (i !== last) arr[i] = arr[last];
    arr.pop();
}

/**
 * Hook for managing rhythm-reactive VFX on a canvas overlay
 */
export function useRhythmVFX() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const stateRef = useRef<VFXState>({
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
    });
    const boardGeoRef = useRef<BoardGeometry>({ left: 0, top: 0, cellSize: 28, width: 280, height: 560 });
    const animFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const activeRef = useRef(false);

    // Convert board cell coordinates to canvas pixel coordinates
    const cellToPixel = useCallback((cellX: number, cellY: number) => {
        const geo = boardGeoRef.current;
        return {
            x: geo.left + cellX * geo.cellSize + geo.cellSize / 2,
            y: geo.top + cellY * geo.cellSize + geo.cellSize / 2,
        };
    }, []);

    // ===== Effect Spawners =====

    const spawnBeatRing = useCallback((bpm: number, intensity: number) => {
        if (stateRef.current.beatRings.length >= MAX_BEAT_RINGS) return;
        const geo = boardGeoRef.current;
        const cx = geo.left + geo.width / 2;
        const cy = geo.top + geo.height / 2;
        const maxR = Math.max(geo.width, geo.height) * 0.7;

        // Cyan pulse ring from board center
        stateRef.current.beatRings.push({
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: maxR * (0.6 + intensity * 0.4),
            life: 1,
            maxLife: 1,
            color: `hsl(${185 + Math.random() * 10}, 100%, 70%)`,
            lineWidth: 2 + intensity * 2,
        });

        // High BPM (140+) gets extra rings
        if (bpm >= 140) {
            stateRef.current.beatRings.push({
                x: cx,
                y: cy,
                radius: 0,
                maxRadius: maxR * 0.4,
                life: 1,
                maxLife: 1,
                color: `hsl(${280 + Math.random() * 20}, 80%, 65%)`,
                lineWidth: 1.5,
            });
        }
    }, []);

    const spawnEqualizerBars = useCallback((rows: number[], count: number, onBeat: boolean) => {
        if (stateRef.current.equalizerBars.length >= MAX_EQUALIZER_BARS) return;
        const geo = boardGeoRef.current;
        const barWidth = geo.cellSize * 0.8;
        const state = stateRef.current;

        for (const row of rows) {
            for (let col = 0; col < BOARD_WIDTH; col++) {
                const barX = geo.left + col * geo.cellSize + (geo.cellSize - barWidth) / 2;
                const barY = geo.top + row * geo.cellSize;
                const baseColor = onBeat
                    ? `hsl(${45 + col * 8}, 100%, ${60 + Math.random() * 20}%)`
                    : `hsl(${190 + col * 5}, 80%, ${55 + Math.random() * 15}%)`;

                state.equalizerBars.push({
                    x: barX,
                    baseY: barY + geo.cellSize,
                    width: barWidth,
                    height: 0,
                    targetHeight: geo.cellSize * (1.5 + Math.random() * 2 + count * 0.5),
                    color: baseColor,
                    life: 1,
                    maxLife: 1,
                    phase: col * 0.15 + Math.random() * 0.2,
                });
            }
        }
    }, []);

    const spawnGlitchParticles = useCallback((rows: number[], combo: number) => {
        if (stateRef.current.glitchParticles.length >= MAX_GLITCH_PARTICLES) return;
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const particleCount = 15 + combo * 3;

        for (let i = 0; i < particleCount; i++) {
            const row = rows[Math.floor(Math.random() * rows.length)];
            const col = Math.random() * BOARD_WIDTH;
            const px = geo.left + col * geo.cellSize;
            const py = geo.top + row * geo.cellSize;

            state.glitchParticles.push({
                x: px,
                y: py,
                vx: (Math.random() - 0.5) * 8,
                vy: -2 - Math.random() * 6,
                life: 1,
                maxLife: 1,
                color: `hsl(${Math.random() * 60 + 30}, 100%, 70%)`,
                alpha: 1,
                size: 3 + Math.random() * 4,
                width: 4 + Math.random() * 12,
                height: 2 + Math.random() * 4,
                glitchOffset: 0,
            });
        }
    }, []);

    const spawnRotationTrail = useCallback((pieceType: string, boardX: number, boardY: number, color: string) => {
        const geo = boardGeoRef.current;
        const cells: { x: number; y: number }[] = [];

        // Create trail cells at the piece position
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const cx = boardX + dx;
                const cy = boardY + dy;
                if (cx >= 0 && cx < BOARD_WIDTH && cy >= 0 && cy < VISIBLE_HEIGHT) {
                    cells.push({
                        x: geo.left + cx * geo.cellSize,
                        y: geo.top + cy * geo.cellSize,
                    });
                }
            }
        }

        stateRef.current.rotationTrails.push({
            cells,
            color,
            life: 1,
            maxLife: 1,
            alpha: 0.6,
        });
    }, []);

    const spawnWhirlpool = useCallback((boardX: number, boardY: number, color: string) => {
        const pos = cellToPixel(boardX + 1.5, boardY + 1.5);
        const geo = boardGeoRef.current;

        stateRef.current.whirlpools.push({
            x: pos.x,
            y: pos.y,
            radius: 0,
            maxRadius: geo.cellSize * 4,
            life: 1,
            maxLife: 1,
            rotation: 0,
            color,
        });
    }, [cellToPixel]);

    const spawnSpeedLines = useCallback((combo: number) => {
        if (stateRef.current.speedLines.length >= MAX_SPEED_LINES) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const state = stateRef.current;
        const count = Math.min(20, 5 + combo);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 100;

            state.speedLines.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                length: 40 + Math.random() * 80 + combo * 3,
                angle,
                speed: 300 + Math.random() * 400,
                life: 1,
                maxLife: 1,
                alpha: 0.4 + Math.random() * 0.4,
                width: 1 + Math.random() * 2,
            });
        }
    }, []);

    const spawnAscendingParticles = useCallback((count: number) => {
        if (stateRef.current.ascendingParticles.length >= MAX_ASCENDING_PARTICLES) return;
        const geo = boardGeoRef.current;
        const state = stateRef.current;

        for (let i = 0; i < count; i++) {
            const x = geo.left + Math.random() * geo.width;
            const y = geo.top + geo.height + Math.random() * 20;

            state.ascendingParticles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.5 - Math.random() * 1.5,
                life: 1,
                maxLife: 1,
                color: `hsl(${Math.random() * 360}, 80%, 65%)`,
                alpha: 0.6 + Math.random() * 0.4,
                size: 1.5 + Math.random() * 3,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: 2 + Math.random() * 3,
            });
        }
    }, []);

    const spawnHardDropParticles = useCallback((boardX: number, boardY: number, dropDistance: number, color: string) => {
        if (stateRef.current.genericParticles.length >= MAX_GENERIC_PARTICLES) return;
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const count = Math.min(30, 8 + dropDistance * 2);

        for (let i = 0; i < count; i++) {
            const px = geo.left + (boardX + Math.random() * 4) * geo.cellSize;
            const py = geo.top + boardY * geo.cellSize;

            state.genericParticles.push({
                x: px,
                y: py,
                vx: (Math.random() - 0.5) * 4,
                vy: -1 - Math.random() * 4,
                life: 1,
                maxLife: 1,
                color,
                alpha: 0.8,
                size: 2 + Math.random() * 3,
            });
        }
    }, []);

    const spawnComboBreakEffect = useCallback((lostCombo: number) => {
        if (stateRef.current.comboBreakShards.length >= MAX_COMBO_BREAK_SHARDS) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const cx = geo.left + geo.width / 2;
        const cy = geo.top + geo.height / 2;

        // Scale intensity based on combo lost — bigger combo = more dramatic
        const intensity = Math.min(1, lostCombo / 20);
        const shardCount = Math.min(40, 10 + lostCombo * 2);

        // Glass-shard particles exploding outward from center
        for (let i = 0; i < shardCount; i++) {
            const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.4;
            const speed = 3 + Math.random() * 8 + intensity * 5;
            const hue = Math.random() > 0.5
                ? 0 + Math.random() * 30      // Red-orange
                : 280 + Math.random() * 40;    // Purple-magenta

            state.comboBreakShards.push({
                x: cx + (Math.random() - 0.5) * 40,
                y: cy + (Math.random() - 0.5) * 40,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 15,
                width: 3 + Math.random() * 8 + intensity * 4,
                height: 1 + Math.random() * 3,
                life: 1,
                maxLife: 1,
                color: `hsl(${hue}, 100%, ${50 + Math.random() * 30}%)`,
                alpha: 0.8 + Math.random() * 0.2,
                trail: [],
            });
        }

        // Expanding shockwave rings
        const ringCount = 1 + Math.floor(intensity * 2);
        for (let i = 0; i < ringCount; i++) {
            state.comboBreakRings.push({
                x: cx,
                y: cy,
                radius: 0,
                maxRadius: Math.max(geo.width, geo.height) * (0.5 + intensity * 0.4) + i * 30,
                life: 1,
                maxLife: 1,
                color: i === 0 ? '#FF4444' : `hsl(${320 + i * 20}, 80%, 60%)`,
                lineWidth: 3 - i * 0.5,
                dashed: i > 0,
            });
        }

        // Additional scattered ember particles for high combos
        if (lostCombo >= 5) {
            const emberCount = Math.min(25, lostCombo);
            for (let i = 0; i < emberCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 20 + Math.random() * 60;
                state.genericParticles.push({
                    x: cx + Math.cos(angle) * dist,
                    y: cy + Math.sin(angle) * dist,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -1 - Math.random() * 3,
                    life: 1,
                    maxLife: 1,
                    color: `hsl(${Math.random() * 40}, 100%, ${60 + Math.random() * 30}%)`,
                    alpha: 0.7,
                    size: 1.5 + Math.random() * 2.5,
                });
            }
        }
    }, []);

    // ===== Elemental VFX Spawners =====

    const spawnElementOrbParticles = useCallback((element: string, boardX: number, boardY: number) => {
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const config = ELEMENT_CONFIGS[element];
        if (!config) return;

        const pos = cellToPixel(boardX, boardY);
        const count = 6 + Math.floor(Math.random() * 4);

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 1 + Math.random() * 2;

            state.elementOrbParticles.push({
                x: pos.x + (Math.random() - 0.5) * 10,
                y: pos.y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 1,
                maxLife: 1,
                color: config.color,
                alpha: 0.8 + Math.random() * 0.2,
                size: 3 + Math.random() * 4,
                elementColor: config.color,
                glowColor: config.glowColor,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: 3 + Math.random() * 4,
                orbitAngle: Math.random() * Math.PI * 2,
                orbitSpeed: 2 + Math.random() * 3,
                orbitRadius: 4 + Math.random() * 8,
            });
        }
    }, [cellToPixel]);

    const spawnElementOrbCollectBurst = useCallback((element: string, count: number) => {
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const config = ELEMENT_CONFIGS[element];
        if (!config) return;

        // Burst from the right side of the board (where HUD would be)
        const cx = geo.left + geo.width + 30;
        const cy = geo.top + geo.height * 0.3;
        const burstCount = 8 + count * 2;

        for (let i = 0; i < burstCount; i++) {
            const angle = (Math.PI * 2 * i) / burstCount;
            const speed = 2 + Math.random() * 4;

            state.elementOrbParticles.push({
                x: cx + (Math.random() - 0.5) * 12,
                y: cy + (Math.random() - 0.5) * 12,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                maxLife: 1,
                color: config.color,
                alpha: 0.9,
                size: 2 + Math.random() * 3,
                elementColor: config.color,
                glowColor: config.glowColor,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: 5 + Math.random() * 3,
                orbitAngle: 0,
                orbitSpeed: 0,
                orbitRadius: 0,
            });
        }
    }, []);

    const spawnReactionBurst = useCallback((reaction: string, intensity: number) => {
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const def = REACTION_DEFINITIONS[reaction];
        if (!def) return;

        const cx = geo.left + geo.width / 2;
        const cy = geo.top + geo.height / 2;
        const maxR = Math.max(geo.width, geo.height) * 0.8;

        // Large expanding ring burst
        state.reactionBursts.push({
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: maxR * (0.7 + intensity * 0.3),
            life: 1,
            maxLife: 1,
            color: def.color,
            glowColor: def.glowColor,
            lineWidth: 3 + intensity * 2,
            innerRatio: 0.6,
        });

        // Second smaller ring
        state.reactionBursts.push({
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: maxR * 0.4,
            life: 1,
            maxLife: 1,
            color: def.glowColor,
            glowColor: def.color,
            lineWidth: 2,
            innerRatio: 0.5,
        });

        // If the reaction has duration, add an aura
        if (def.duration > 0) {
            state.reactionAuras.push({
                life: 1,
                maxLife: 1,
                color: def.color,
                glowColor: def.glowColor,
                intensity: 0.3 + intensity * 0.2,
                pulsePhase: 0,
            });
        }

        // Scatter elemental particles in the reaction colors
        const particleCount = 20 + Math.floor(intensity * 15);
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.6;
            const speed = 3 + Math.random() * 6;

            state.genericParticles.push({
                x: cx + (Math.random() - 0.5) * 30,
                y: cy + (Math.random() - 0.5) * 30,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1,
                maxLife: 1,
                color: Math.random() > 0.5 ? def.color : def.glowColor,
                alpha: 0.8,
                size: 2 + Math.random() * 4,
            });
        }
    }, []);

    const fadeReactionAuras = useCallback((reaction: string) => {
        const state = stateRef.current;
        // Mark all auras to fade quickly
        for (const aura of state.reactionAuras) {
            aura.life = Math.min(aura.life, 0.3);
        }
    }, []);

    const spawnCorruptionBackfire = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const cx = geo.left + geo.width / 2;
        const cy = geo.top + geo.height / 2;

        // Screen shake
        state.corruptionShakeIntensity = 1.0;

        // Red/purple screen flash
        state.corruptionFlashAlpha = 0.6;

        // Dark glitch rectangles scattered across the board
        const glitchCount = 20 + Math.floor(Math.random() * 15);
        for (let i = 0; i < glitchCount; i++) {
            state.corruptionGlitches.push({
                x: geo.left + Math.random() * geo.width,
                y: geo.top + Math.random() * geo.height,
                width: 8 + Math.random() * 40,
                height: 2 + Math.random() * 8,
                life: 1,
                maxLife: 1,
                color: Math.random() > 0.5 ? '#9944CC' : '#FF2244',
                offsetX: (Math.random() - 0.5) * 20,
                offsetY: (Math.random() - 0.5) * 10,
            });
        }

        // Shockwave ring
        state.reactionBursts.push({
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: Math.max(geo.width, geo.height) * 0.9,
            life: 1,
            maxLife: 1,
            color: '#9944CC',
            glowColor: '#FF2244',
            lineWidth: 4,
            innerRatio: 0.5,
        });

        // Scattered dark particles
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 6;
            state.genericParticles.push({
                x: cx + (Math.random() - 0.5) * 40,
                y: cy + (Math.random() - 0.5) * 40,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                maxLife: 1,
                color: Math.random() > 0.4 ? '#9944CC' : '#FF2244',
                alpha: 0.9,
                size: 2 + Math.random() * 5,
            });
        }
    }, []);

    const spawnEquipmentDropBeam = useCallback((rarity: string, boardX: number, boardY: number) => {
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const rarityConf = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG];
        if (!rarityConf) return;

        const pos = cellToPixel(boardX, boardY);

        // Beam of light from above
        state.equipmentBeams.push({
            x: pos.x,
            y: geo.top,
            width: geo.cellSize * (1.5 + rarityConf.glowIntensity),
            height: 0,
            maxHeight: pos.y - geo.top + geo.cellSize,
            life: 1,
            maxLife: 1,
            color: rarityConf.color,
            glowColor: rarityConf.color,
            glowIntensity: rarityConf.glowIntensity,
        });

        // Glow particles at drop position
        const particleCount = 6 + Math.floor(rarityConf.glowIntensity * 10);
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 1 + Math.random() * 3;
            state.genericParticles.push({
                x: pos.x + (Math.random() - 0.5) * 8,
                y: pos.y + (Math.random() - 0.5) * 8,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 1,
                maxLife: 1,
                color: rarityConf.color,
                alpha: 0.6 + rarityConf.glowIntensity * 0.3,
                size: 2 + Math.random() * 3,
            });
        }
    }, [cellToPixel]);

    // ===== Dragon Breath VFX Spawners =====

    const spawnDragonEnergyTrail = useCallback((gauge: 'fury' | 'might', newValue: number) => {
        if (stateRef.current.dragonEnergyTrails.length >= MAX_DRAGON_ENERGY_TRAILS) return;
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const cx = geo.left + geo.width / 2;
        const cy = geo.top + geo.height / 2;

        // Trails converge toward left side of board (where gauge UI lives)
        const targetX = geo.left - 30;
        const targetY = gauge === 'fury'
            ? geo.top + geo.height * 0.25
            : geo.top + geo.height * 0.75;

        const count = 3 + Math.floor(newValue * 0.5);
        const colors = gauge === 'fury'
            ? ['#FFB300', '#FF8C00', '#FFF8E1']  // Gold/orange
            : ['#DC143C', '#C41E3A', '#FF6B6B'];  // Crimson/red

        for (let i = 0; i < count; i++) {
            state.dragonEnergyTrails.push({
                x: cx + (Math.random() - 0.5) * geo.width * 0.6,
                y: cy + (Math.random() - 0.5) * geo.height * 0.4,
                targetX: targetX + (Math.random() - 0.5) * 20,
                targetY: targetY + (Math.random() - 0.5) * 30,
                progress: 0,
                speed: 1.5 + Math.random() * 1.5,
                life: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                width: 1.5 + Math.random() * 2,
                trail: [],
            });
        }
    }, []);

    const spawnDragonFireBurst = useCallback(() => {
        if (stateRef.current.dragonFireParticles.length >= MAX_DRAGON_FIRE_PARTICLES) return;
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const cx = geo.left + geo.width / 2;
        const cy = geo.top + geo.height * 0.4;

        // Large fire particle burst from board center
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            const heat = Math.random();

            state.dragonFireParticles.push({
                x: cx + (Math.random() - 0.5) * 40,
                y: cy + (Math.random() - 0.5) * 30,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3 - Math.random() * 4,
                life: 1,
                maxLife: 1,
                color: heat > 0.7 ? '#FFF8E1' : heat > 0.4 ? '#FF8C00' : '#DC143C',
                alpha: 0.8 + Math.random() * 0.2,
                size: 4 + Math.random() * 8 + heat * 6,
                scaleX: 0.8 + Math.random() * 0.4,
                heat,
            });
        }

        // Dragon breath shockwave
        state.dragonBreathWaves.push({
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: Math.max(geo.width, geo.height) * 1.2,
            life: 1,
            maxLife: 1,
        });

        // Screen flash
        state.dragonFlashAlpha = 0.8;

        // Mark breathing state
        state.isDragonBreathing = true;
        state.dragonBreathPhase = 0;
    }, []);

    const spawnDragonEmbers = useCallback((count: number) => {
        if (stateRef.current.dragonEmbers.length >= MAX_DRAGON_EMBERS) return;
        const geo = boardGeoRef.current;
        const state = stateRef.current;
        const colors = ['#FFB300', '#FF8C00', '#DC143C', '#FFF8E1', '#C41E3A'];

        for (let i = 0; i < count; i++) {
            state.dragonEmbers.push({
                x: geo.left + Math.random() * geo.width,
                y: geo.top + geo.height + Math.random() * 10,
                vx: (Math.random() - 0.5) * 2,
                vy: -1 - Math.random() * 3,
                life: 1,
                maxLife: 1,
                size: 1 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                flicker: Math.random() * Math.PI * 2,
                flickerSpeed: 5 + Math.random() * 10,
            });
        }
    }, []);

    // ===== Main VFX Event Handler =====

    const emit = useCallback((event: VFXEvent) => {
        const state = stateRef.current;

        switch (event.type) {
            case 'beat':
                spawnBeatRing(event.bpm, event.intensity);
                break;

            case 'lineClear': {
                // Offset rows from full board coords to visible-area coords
                const visibleRows = event.rows.map((r: number) => r - BUFFER_ZONE);
                spawnEqualizerBars(visibleRows, event.count, event.onBeat);
                if (event.onBeat) {
                    spawnGlitchParticles(visibleRows, event.combo);
                }
                break;
            }

            case 'rotation':
                spawnRotationTrail(event.pieceType, event.boardX, event.boardY - BUFFER_ZONE, '#00FFFF');
                break;

            case 'hardDrop':
                spawnHardDropParticles(event.boardX, event.boardY - BUFFER_ZONE, event.dropDistance, '#FFFFFF');
                break;

            case 'comboChange':
                state.combo = event.combo;
                if (event.combo >= 10 && !state.isFever) {
                    state.isFever = true;
                    spawnSpeedLines(event.combo);
                }
                if (event.combo >= 5) {
                    spawnAscendingParticles(Math.min(8, event.combo - 3));
                }
                if (event.combo >= 10) {
                    spawnSpeedLines(event.combo);
                }
                break;

            case 'comboBreak':
                spawnComboBreakEffect(event.lostCombo);
                break;

            case 'feverStart':
                state.isFever = true;
                spawnSpeedLines(event.combo);
                break;

            case 'feverEnd':
                state.isFever = false;
                break;

            case 'dragonGaugeCharge':
                spawnDragonEnergyTrail(event.gauge, event.newValue);
                break;

            case 'dragonBreathStart':
                spawnDragonFireBurst();
                break;

            case 'dragonBreathEnd':
                state.isDragonBreathing = false;
                break;

            // --- Elemental system events ---

            case 'elementOrbSpawn':
                spawnElementOrbParticles(event.element, event.boardX, event.boardY - BUFFER_ZONE);
                break;

            case 'elementOrbCollect':
                spawnElementOrbCollectBurst(event.element, event.count);
                break;

            case 'reactionTrigger':
                spawnReactionBurst(event.reaction, event.intensity);
                break;

            case 'reactionEnd':
                fadeReactionAuras(event.reaction);
                break;

            case 'corruptionBackfire':
                spawnCorruptionBackfire();
                break;

            case 'equipmentDrop':
                spawnEquipmentDropBeam(event.rarity, event.boardX, event.boardY - BUFFER_ZONE);
                break;
        }
    }, [spawnBeatRing, spawnEqualizerBars, spawnGlitchParticles, spawnRotationTrail, spawnHardDropParticles, spawnSpeedLines, spawnAscendingParticles, spawnComboBreakEffect, spawnDragonEnergyTrail, spawnDragonFireBurst, spawnElementOrbParticles, spawnElementOrbCollectBurst, spawnReactionBurst, fadeReactionAuras, spawnCorruptionBackfire, spawnEquipmentDropBeam]);

    // ===== Canvas Render Loop =====

    const render = useCallback((time: number) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            animFrameRef.current = requestAnimationFrame(render);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            animFrameRef.current = requestAnimationFrame(render);
            return;
        }

        // Compute dt
        const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 1000, 0.05) : 0.016;
        lastTimeRef.current = time;

        const state = stateRef.current;
        const geo = boardGeoRef.current;

        // Resize canvas to match parent
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- Fever hue rotation ---
        if (state.isFever) {
            state.feverHue = (state.feverHue + dt * 120) % 360;
        }

        // --- Beat Rings ---
        for (let i = state.beatRings.length - 1; i >= 0; i--) {
            const ring = state.beatRings[i];
            ring.life -= dt * 2.5;
            ring.radius += (ring.maxRadius - ring.radius) * dt * 6;

            if (ring.life <= 0) {
                swapRemove(state.beatRings, i);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = ring.life * 0.5;
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = ring.lineWidth * ring.life;
            ctx.beginPath();
            ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // --- Equalizer Bars ---
        for (let i = state.equalizerBars.length - 1; i >= 0; i--) {
            const bar = state.equalizerBars[i];
            bar.life -= dt * 1.8;

            if (bar.life <= 0) {
                swapRemove(state.equalizerBars, i);
                continue;
            }

            // Bounce animation
            const bounce = Math.sin((1 - bar.life) * Math.PI * 3 + bar.phase * Math.PI * 2);
            const currentHeight = bar.targetHeight * Math.abs(bounce) * bar.life;

            ctx.save();
            ctx.globalAlpha = bar.life * 0.7;
            ctx.fillStyle = bar.color;
            ctx.shadowColor = bar.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(bar.x, bar.baseY - currentHeight, bar.width, currentHeight);
            ctx.restore();
        }

        // --- Glitch Particles ---
        for (let i = state.glitchParticles.length - 1; i >= 0; i--) {
            const p = state.glitchParticles[i];
            p.life -= dt * 2;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 10 * dt; // gravity
            p.glitchOffset = (Math.random() - 0.5) * 6 * p.life;

            if (p.life <= 0) {
                swapRemove(state.glitchParticles, i);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.life * 0.9;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 4;
            // Glitchy rectangular particles
            ctx.fillRect(p.x + p.glitchOffset, p.y, p.width * p.life, p.height);
            // Occasional scanline
            if (Math.random() > 0.7) {
                ctx.globalAlpha = p.life * 0.3;
                ctx.fillRect(p.x - 10, p.y, p.width + 20, 1);
            }
            ctx.restore();
        }

        // --- Rotation Trails ---
        for (let i = state.rotationTrails.length - 1; i >= 0; i--) {
            const trail = state.rotationTrails[i];
            trail.life -= dt * 4;

            if (trail.life <= 0) {
                swapRemove(state.rotationTrails, i);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = trail.life * trail.alpha;
            ctx.strokeStyle = trail.color;
            ctx.shadowColor = trail.color;
            ctx.shadowBlur = 12 * trail.life;
            ctx.lineWidth = 2 * trail.life;

            for (const cell of trail.cells) {
                ctx.strokeRect(cell.x + 2, cell.y + 2, geo.cellSize - 4, geo.cellSize - 4);
            }
            ctx.restore();
        }

        // --- Whirlpool Effects ---
        for (let i = state.whirlpools.length - 1; i >= 0; i--) {
            const wp = state.whirlpools[i];
            wp.life -= dt * 1.5;
            wp.radius += (wp.maxRadius - wp.radius) * dt * 4;
            wp.rotation += dt * 8;

            if (wp.life <= 0) {
                swapRemove(state.whirlpools, i);
                continue;
            }

            ctx.save();
            ctx.translate(wp.x, wp.y);
            ctx.rotate(wp.rotation);
            ctx.globalAlpha = wp.life * 0.4;

            // Spiral arms
            for (let arm = 0; arm < 4; arm++) {
                const armAngle = (arm / 4) * Math.PI * 2;
                ctx.strokeStyle = wp.color;
                ctx.lineWidth = 2 * wp.life;
                ctx.shadowColor = wp.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                for (let t = 0; t < 1; t += 0.02) {
                    const r = wp.radius * t;
                    const angle = armAngle + t * Math.PI * 3;
                    const px = Math.cos(angle) * r;
                    const py = Math.sin(angle) * r;
                    if (t === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            }

            ctx.restore();
        }

        // --- Speed Lines ---
        for (let i = state.speedLines.length - 1; i >= 0; i--) {
            const line = state.speedLines[i];
            line.life -= dt * 2;
            line.x += Math.cos(line.angle) * line.speed * dt;
            line.y += Math.sin(line.angle) * line.speed * dt;

            if (line.life <= 0) {
                swapRemove(state.speedLines, i);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = line.life * line.alpha;

            const feverColor = state.isFever
                ? `hsl(${(state.feverHue + i * 30) % 360}, 100%, 75%)`
                : 'rgba(255, 255, 255, 0.8)';
            ctx.strokeStyle = feverColor;
            ctx.lineWidth = line.width;
            ctx.shadowColor = feverColor;
            ctx.shadowBlur = 4;

            ctx.beginPath();
            ctx.moveTo(line.x, line.y);
            ctx.lineTo(
                line.x - Math.cos(line.angle) * line.length * line.life,
                line.y - Math.sin(line.angle) * line.length * line.life
            );
            ctx.stroke();
            ctx.restore();
        }

        // --- Ascending Particles (Fever particle rain going UP) ---
        for (let i = state.ascendingParticles.length - 1; i >= 0; i--) {
            const p = state.ascendingParticles[i];
            p.life -= dt * 0.4;
            p.x += p.vx;
            p.y += p.vy;
            p.pulsePhase += p.pulseSpeed * dt;

            if (p.life <= 0 || p.y < geo.top - 20) {
                swapRemove(state.ascendingParticles, i);
                continue;
            }

            const pulse = 0.5 + 0.5 * Math.sin(p.pulsePhase);
            const size = p.size * (0.8 + pulse * 0.4);

            ctx.save();
            const particleColor = state.isFever
                ? `hsl(${(state.feverHue + i * 20) % 360}, 90%, 70%)`
                : p.color;
            ctx.globalAlpha = p.life * p.alpha * (0.5 + pulse * 0.5);
            ctx.fillStyle = particleColor;
            ctx.shadowColor = particleColor;
            ctx.shadowBlur = size * 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // --- Generic Particles (hard drop impact, etc.) ---
        for (let i = state.genericParticles.length - 1; i >= 0; i--) {
            const p = state.genericParticles[i];
            p.life -= dt * 2.5;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 12 * dt;

            if (p.life <= 0) {
                swapRemove(state.genericParticles, i);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.life * p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // --- Combo Break Shards ---
        for (let i = state.comboBreakShards.length - 1; i >= 0; i--) {
            const shard = state.comboBreakShards[i];
            shard.life -= dt * 1.8;
            shard.x += shard.vx;
            shard.y += shard.vy;
            shard.vy += 8 * dt; // gravity
            shard.vx *= 0.98; // air resistance
            shard.rotation += shard.rotationSpeed * dt;

            // Update trail
            shard.trail.push({ x: shard.x, y: shard.y, alpha: shard.life * 0.3 });
            if (shard.trail.length > 6) shard.trail.shift();

            if (shard.life <= 0) {
                swapRemove(state.comboBreakShards, i);
                continue;
            }

            // Draw trail
            for (let t = 0; t < shard.trail.length; t++) {
                const tp = shard.trail[t];
                ctx.save();
                ctx.globalAlpha = tp.alpha * (t / shard.trail.length) * 0.5;
                ctx.fillStyle = shard.color;
                ctx.beginPath();
                ctx.arc(tp.x, tp.y, shard.width * 0.3 * shard.life, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Draw shard
            ctx.save();
            ctx.translate(shard.x, shard.y);
            ctx.rotate(shard.rotation);
            ctx.globalAlpha = shard.life * shard.alpha;
            ctx.fillStyle = shard.color;
            ctx.shadowColor = shard.color;
            ctx.shadowBlur = 8 * shard.life;

            // Diamond/shard shape
            ctx.beginPath();
            const w = shard.width * shard.life;
            const h = shard.height * shard.life;
            ctx.moveTo(0, -h);
            ctx.lineTo(w * 0.5, 0);
            ctx.lineTo(0, h);
            ctx.lineTo(-w * 0.5, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        // --- Combo Break Rings ---
        for (let i = state.comboBreakRings.length - 1; i >= 0; i--) {
            const ring = state.comboBreakRings[i];
            ring.life -= dt * 2.0;
            ring.radius += (ring.maxRadius - ring.radius) * dt * 5;

            if (ring.life <= 0) {
                swapRemove(state.comboBreakRings, i);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = ring.life * 0.6;
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = ring.lineWidth * ring.life;
            ctx.shadowColor = ring.color;
            ctx.shadowBlur = 12 * ring.life;

            if (ring.dashed) {
                ctx.setLineDash([8, 6]);
            }

            ctx.beginPath();
            ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // --- Dragon Energy Trails ---
        for (let i = state.dragonEnergyTrails.length - 1; i >= 0; i--) {
            const trail = state.dragonEnergyTrails[i];
            trail.progress += trail.speed * dt;
            trail.life -= dt * 1.2;

            if (trail.life <= 0 || trail.progress >= 1) {
                swapRemove(state.dragonEnergyTrails, i);
                continue;
            }

            // Ease-in-out interpolation
            const t = trail.progress;
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            const cx = trail.x + (trail.targetX - trail.x) * ease;
            const cy = trail.y + (trail.targetY - trail.y) * ease;

            // Record trail points
            trail.trail.push({ x: cx, y: cy });
            if (trail.trail.length > 8) trail.trail.shift();

            // Draw energy trail with glow
            ctx.save();
            ctx.globalAlpha = trail.life * 0.8;
            ctx.strokeStyle = trail.color;
            ctx.shadowColor = trail.color;
            ctx.shadowBlur = 12;
            ctx.lineWidth = trail.width;
            ctx.lineCap = 'round';

            if (trail.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(trail.trail[0].x, trail.trail[0].y);
                for (let j = 1; j < trail.trail.length; j++) {
                    ctx.lineTo(trail.trail[j].x, trail.trail[j].y);
                }
                ctx.stroke();
            }

            // Bright head particle
            ctx.fillStyle = '#FFF8E1';
            ctx.shadowColor = '#FFB300';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(cx, cy, trail.width * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // --- Dragon Fire Particles ---
        for (let i = state.dragonFireParticles.length - 1; i >= 0; i--) {
            const p = state.dragonFireParticles[i];
            p.life -= dt * 1.2;
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 2 * dt; // Fire rises (anti-gravity)
            p.vx *= 0.98;

            if (p.life <= 0) {
                swapRemove(state.dragonFireParticles, i);
                continue;
            }

            ctx.save();
            const radius = p.size * p.life;

            // Radial gradient: white core → orange → crimson
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
            if (p.heat > 0.7) {
                grad.addColorStop(0, 'rgba(255, 248, 225, 0.9)');
                grad.addColorStop(0.4, 'rgba(255, 179, 0, 0.6)');
                grad.addColorStop(1, 'rgba(220, 20, 60, 0)');
            } else if (p.heat > 0.4) {
                grad.addColorStop(0, 'rgba(255, 179, 0, 0.8)');
                grad.addColorStop(0.5, 'rgba(255, 140, 0, 0.4)');
                grad.addColorStop(1, 'rgba(196, 30, 58, 0)');
            } else {
                grad.addColorStop(0, 'rgba(220, 20, 60, 0.7)');
                grad.addColorStop(0.6, 'rgba(196, 30, 58, 0.3)');
                grad.addColorStop(1, 'rgba(139, 0, 0, 0)');
            }

            ctx.globalAlpha = p.life * p.alpha;
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, radius * p.scaleX, radius, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // --- Dragon Embers ---
        for (let i = state.dragonEmbers.length - 1; i >= 0; i--) {
            const ember = state.dragonEmbers[i];
            ember.life -= dt * 0.5;
            ember.x += ember.vx;
            ember.y += ember.vy;
            ember.vx += (Math.random() - 0.5) * 0.3; // Wind wobble
            ember.flicker += ember.flickerSpeed * dt;

            if (ember.life <= 0 || ember.y < geo.top - 30) {
                swapRemove(state.dragonEmbers, i);
                continue;
            }

            const flickerAlpha = 0.5 + 0.5 * Math.sin(ember.flicker);

            ctx.save();
            ctx.globalAlpha = ember.life * flickerAlpha;
            ctx.fillStyle = ember.color;
            ctx.shadowColor = ember.color;
            ctx.shadowBlur = ember.size * 4;

            // Small glowing square
            const s = ember.size * ember.life;
            ctx.fillRect(ember.x - s / 2, ember.y - s / 2, s, s);
            ctx.restore();
        }

        // --- Dragon Breath Waves ---
        for (let i = state.dragonBreathWaves.length - 1; i >= 0; i--) {
            const wave = state.dragonBreathWaves[i];
            wave.life -= dt * 1.5;
            wave.radius += (wave.maxRadius - wave.radius) * dt * 4;

            if (wave.life <= 0) {
                swapRemove(state.dragonBreathWaves, i);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = wave.life * 0.4;
            // Gold-orange gradient ring
            ctx.strokeStyle = `rgba(255, 179, 0, ${wave.life})`;
            ctx.lineWidth = 4 * wave.life;
            ctx.shadowColor = '#FFB300';
            ctx.shadowBlur = 20 * wave.life;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner crimson ring
            ctx.strokeStyle = `rgba(220, 20, 60, ${wave.life * 0.5})`;
            ctx.lineWidth = 2 * wave.life;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // --- Dragon Breath Screen Flash ---
        if (state.dragonFlashAlpha > 0) {
            state.dragonFlashAlpha = Math.max(0, state.dragonFlashAlpha - dt * 2);
            ctx.save();
            ctx.globalAlpha = state.dragonFlashAlpha;
            ctx.fillStyle = '#FFB300';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // --- Dragon Breath Board Glow (during breathing) ---
        if (state.isDragonBreathing) {
            state.dragonBreathPhase = Math.min(1, state.dragonBreathPhase + dt * 0.33);

            // Gold border glow around board
            ctx.save();
            const pulseGlow = 0.3 + 0.3 * Math.sin(time * 0.006);
            ctx.globalAlpha = pulseGlow;
            ctx.strokeStyle = '#FFB300';
            ctx.shadowColor = '#FF8C00';
            ctx.shadowBlur = 25;
            ctx.lineWidth = 3;
            ctx.strokeRect(geo.left - 4, geo.top - 4, geo.width + 8, geo.height + 8);
            ctx.restore();

            // Continuous embers during breath
            if (Math.random() > 0.4) {
                spawnDragonEmbers(2);
            }
        }

        // --- Element Orb Particles ---
        for (let i = state.elementOrbParticles.length - 1; i >= 0; i--) {
            const p = state.elementOrbParticles[i];
            p.life -= dt * 1.5;
            p.pulsePhase += p.pulseSpeed * dt;
            p.orbitAngle += p.orbitSpeed * dt;

            // Orbital wobble motion
            p.x += p.vx * 0.95 + Math.cos(p.orbitAngle) * p.orbitRadius * dt;
            p.y += p.vy * 0.95 + Math.sin(p.orbitAngle) * p.orbitRadius * dt * 0.5;
            p.vy -= 0.5 * dt; // Slight upward drift
            p.vx *= 0.97;
            p.vy *= 0.97;

            if (p.life <= 0) {
                state.elementOrbParticles.splice(i, 1);
                continue;
            }

            const pulse = 0.6 + 0.4 * Math.sin(p.pulsePhase);
            const radius = p.size * p.life * pulse;

            ctx.save();
            ctx.globalAlpha = p.life * p.alpha;

            // Outer glow
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.5);
            grad.addColorStop(0, p.glowColor);
            grad.addColorStop(0.4, p.elementColor);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Bright core
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = p.elementColor;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // --- Reaction Bursts (expanding rings) ---
        for (let i = state.reactionBursts.length - 1; i >= 0; i--) {
            const burst = state.reactionBursts[i];
            burst.life -= dt * 2.0;
            burst.radius += (burst.maxRadius - burst.radius) * dt * 5;

            if (burst.life <= 0) {
                state.reactionBursts.splice(i, 1);
                continue;
            }

            ctx.save();
            // Outer ring
            ctx.globalAlpha = burst.life * 0.7;
            ctx.strokeStyle = burst.color;
            ctx.lineWidth = burst.lineWidth * burst.life;
            ctx.shadowColor = burst.glowColor;
            ctx.shadowBlur = 20 * burst.life;
            ctx.beginPath();
            ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner ring
            ctx.globalAlpha = burst.life * 0.4;
            ctx.strokeStyle = burst.glowColor;
            ctx.lineWidth = (burst.lineWidth * 0.6) * burst.life;
            ctx.beginPath();
            ctx.arc(burst.x, burst.y, burst.radius * burst.innerRatio, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }

        // --- Reaction Auras (edge vignette) ---
        for (let i = state.reactionAuras.length - 1; i >= 0; i--) {
            const aura = state.reactionAuras[i];
            aura.life -= dt * 0.2; // Slow fade
            aura.pulsePhase += dt * 3;

            if (aura.life <= 0) {
                state.reactionAuras.splice(i, 1);
                continue;
            }

            const pulse = 0.6 + 0.4 * Math.sin(aura.pulsePhase);
            const edgeAlpha = aura.life * aura.intensity * pulse;

            ctx.save();
            ctx.globalAlpha = edgeAlpha;

            // Top edge glow
            const topGrad = ctx.createLinearGradient(0, geo.top, 0, geo.top + 40);
            topGrad.addColorStop(0, aura.color);
            topGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = topGrad;
            ctx.fillRect(geo.left - 4, geo.top - 4, geo.width + 8, 44);

            // Bottom edge glow
            const bottomGrad = ctx.createLinearGradient(0, geo.top + geo.height - 40, 0, geo.top + geo.height);
            bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
            bottomGrad.addColorStop(1, aura.color);
            ctx.fillStyle = bottomGrad;
            ctx.fillRect(geo.left - 4, geo.top + geo.height - 44, geo.width + 8, 48);

            // Left edge glow
            const leftGrad = ctx.createLinearGradient(geo.left, 0, geo.left + 30, 0);
            leftGrad.addColorStop(0, aura.color);
            leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = leftGrad;
            ctx.fillRect(geo.left - 4, geo.top - 4, 34, geo.height + 8);

            // Right edge glow
            const rightGrad = ctx.createLinearGradient(geo.left + geo.width - 30, 0, geo.left + geo.width, 0);
            rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
            rightGrad.addColorStop(1, aura.color);
            ctx.fillStyle = rightGrad;
            ctx.fillRect(geo.left + geo.width - 30, geo.top - 4, 34, geo.height + 8);

            // Pulsing border
            ctx.globalAlpha = edgeAlpha * 0.5;
            ctx.strokeStyle = aura.glowColor;
            ctx.shadowColor = aura.color;
            ctx.shadowBlur = 15 * pulse;
            ctx.lineWidth = 2;
            ctx.strokeRect(geo.left - 2, geo.top - 2, geo.width + 4, geo.height + 4);

            ctx.restore();
        }

        // --- Equipment Drop Beams ---
        for (let i = state.equipmentBeams.length - 1; i >= 0; i--) {
            const beam = state.equipmentBeams[i];
            beam.life -= dt * 1.2;
            beam.height += (beam.maxHeight - beam.height) * dt * 8;

            if (beam.life <= 0) {
                state.equipmentBeams.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = beam.life * 0.6;

            // Beam gradient (bright at top, fading down)
            const beamGrad = ctx.createLinearGradient(beam.x, beam.y, beam.x, beam.y + beam.height);
            beamGrad.addColorStop(0, beam.color);
            beamGrad.addColorStop(0.5, beam.glowColor);
            beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = beamGrad;
            ctx.shadowColor = beam.color;
            ctx.shadowBlur = 20 * beam.glowIntensity;

            // Draw beam rectangle centered on x
            const halfW = beam.width / 2;
            ctx.fillRect(beam.x - halfW, beam.y, beam.width, beam.height);

            // Bright core line
            ctx.globalAlpha = beam.life * 0.9;
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowBlur = 10;
            ctx.fillRect(beam.x - 1, beam.y, 2, beam.height * 0.8);

            ctx.restore();
        }

        // --- Corruption Glitches ---
        for (let i = state.corruptionGlitches.length - 1; i >= 0; i--) {
            const g = state.corruptionGlitches[i];
            g.life -= dt * 3.0;
            g.offsetX += (Math.random() - 0.5) * 15 * g.life;
            g.offsetY += (Math.random() - 0.5) * 5 * g.life;

            if (g.life <= 0) {
                state.corruptionGlitches.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = g.life * 0.7;
            ctx.fillStyle = g.color;
            ctx.shadowColor = g.color;
            ctx.shadowBlur = 6;
            ctx.fillRect(g.x + g.offsetX, g.y + g.offsetY, g.width * g.life, g.height);

            // Scanline effect
            if (Math.random() > 0.5) {
                ctx.globalAlpha = g.life * 0.2;
                ctx.fillRect(g.x + g.offsetX - 20, g.y + g.offsetY, g.width + 40, 1);
            }
            ctx.restore();
        }

        // --- Corruption Screen Flash ---
        if (state.corruptionFlashAlpha > 0) {
            state.corruptionFlashAlpha = Math.max(0, state.corruptionFlashAlpha - dt * 2.5);
            ctx.save();
            ctx.globalAlpha = state.corruptionFlashAlpha;
            // Red-purple gradient flash
            const flashGrad = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.6
            );
            flashGrad.addColorStop(0, 'rgba(153, 68, 204, 0.8)');
            flashGrad.addColorStop(0.5, 'rgba(255, 34, 68, 0.5)');
            flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = flashGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // --- Corruption Screen Shake ---
        if (state.corruptionShakeIntensity > 0) {
            state.corruptionShakeIntensity = Math.max(0, state.corruptionShakeIntensity - dt * 3);
            // The shake is applied via a canvas transform at the top level
            // Here we just decay the value — actual shake offset would be applied by the parent component
        }

        // --- Fever continuous effects ---
        if (state.isFever && state.combo >= 10) {
            // Continuous ascending particles
            if (Math.random() > 0.6) {
                spawnAscendingParticles(1);
            }
        }

        if (activeRef.current) {
            animFrameRef.current = requestAnimationFrame(render);
        }
    }, [spawnAscendingParticles, spawnDragonEmbers]);

    // Update board geometry for coordinate mapping
    const updateBoardGeometry = useCallback((geo: BoardGeometry) => {
        boardGeoRef.current = geo;
    }, []);

    // Start/stop the render loop
    const start = useCallback(() => {
        if (activeRef.current) return;
        activeRef.current = true;
        lastTimeRef.current = 0;
        animFrameRef.current = requestAnimationFrame(render);
    }, [render]);

    const stop = useCallback(() => {
        activeRef.current = false;
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            activeRef.current = false;
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, []);

    return useMemo(() => ({
        canvasRef,
        emit,
        updateBoardGeometry,
        start,
        stop,
        stateRef,
    }), [canvasRef, emit, updateBoardGeometry, start, stop, stateRef]);
}
