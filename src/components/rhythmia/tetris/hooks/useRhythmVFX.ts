import { useRef, useCallback, useEffect } from 'react';
import type { VFXEvent } from '../types';
import { BOARD_WIDTH, BOARD_HEIGHT, WORLDS } from '../constants';

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
    isFever: boolean;
    feverHue: number;
    combo: number;
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
        isFever: false,
        feverHue: 0,
        combo: 0,
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
                if (cx >= 0 && cx < BOARD_WIDTH && cy >= 0 && cy < BOARD_HEIGHT) {
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

    // ===== Main VFX Event Handler =====

    const emit = useCallback((event: VFXEvent) => {
        const state = stateRef.current;

        switch (event.type) {
            case 'beat':
                spawnBeatRing(event.bpm, event.intensity);
                break;

            case 'lineClear':
                spawnEqualizerBars(event.rows, event.count, event.onBeat);
                if (event.onBeat) {
                    spawnGlitchParticles(event.rows, event.combo);
                }
                break;

            case 'rotation':
                spawnRotationTrail(event.pieceType, event.boardX, event.boardY, '#00FFFF');
                break;

            case 'hardDrop':
                spawnHardDropParticles(event.boardX, event.boardY, event.dropDistance, '#FFFFFF');
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

            case 'feverStart':
                state.isFever = true;
                spawnSpeedLines(event.combo);
                break;

            case 'feverEnd':
                state.isFever = false;
                break;
        }
    }, [spawnBeatRing, spawnEqualizerBars, spawnGlitchParticles, spawnRotationTrail, spawnHardDropParticles, spawnSpeedLines, spawnAscendingParticles]);

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
    }, [spawnAscendingParticles]);

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

    return {
        canvasRef,
        emit,
        updateBoardGeometry,
        start,
        stop,
        stateRef,
    };
}
