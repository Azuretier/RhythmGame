import { useRef, useCallback, useEffect, useMemo } from 'react';
import type { VFXEvent } from '../types';
import { BOARD_WIDTH, VISIBLE_HEIGHT, BUFFER_ZONE, WORLDS } from '../constants';

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
}

// Board geometry needed for coordinate conversion
export interface BoardGeometry {
    left: number;
    top: number;
    cellSize: number;
    width: number;
    height: number;
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

    // ===== Dragon Breath VFX Spawners =====

    const spawnDragonEnergyTrail = useCallback((gauge: 'fury' | 'might', newValue: number) => {
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
        }
    }, [spawnBeatRing, spawnEqualizerBars, spawnGlitchParticles, spawnRotationTrail, spawnHardDropParticles, spawnSpeedLines, spawnAscendingParticles, spawnComboBreakEffect, spawnDragonEnergyTrail, spawnDragonFireBurst]);

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
                state.beatRings.splice(i, 1);
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
                state.equalizerBars.splice(i, 1);
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
                state.glitchParticles.splice(i, 1);
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
                state.rotationTrails.splice(i, 1);
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
                state.whirlpools.splice(i, 1);
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
                state.speedLines.splice(i, 1);
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
                state.ascendingParticles.splice(i, 1);
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
                state.genericParticles.splice(i, 1);
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
                state.comboBreakShards.splice(i, 1);
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
                state.comboBreakRings.splice(i, 1);
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
                state.dragonEnergyTrails.splice(i, 1);
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
                state.dragonFireParticles.splice(i, 1);
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
                state.dragonEmbers.splice(i, 1);
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
                state.dragonBreathWaves.splice(i, 1);
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
