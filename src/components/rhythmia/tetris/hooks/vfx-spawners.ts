// ===== VFX Spawner Functions =====
// All spawn functions take stateRef and boardGeoRef as params for standalone usage.

import type { MutableRefObject } from 'react';
import type { VFXState, BoardGeometry } from './vfx-types';
import {
    MAX_BEAT_RINGS, MAX_EQUALIZER_BARS, MAX_GLITCH_PARTICLES,
    MAX_SPEED_LINES, MAX_ASCENDING_PARTICLES, MAX_GENERIC_PARTICLES,
    MAX_COMBO_BREAK_SHARDS, MAX_DRAGON_ENERGY_TRAILS,
    MAX_DRAGON_FIRE_PARTICLES, MAX_DRAGON_EMBERS,
} from './vfx-types';
import { BOARD_WIDTH, VISIBLE_HEIGHT } from '../constants';
import { ELEMENT_CONFIGS } from '@/lib/elements/definitions';
import { REACTION_DEFINITIONS } from '@/lib/elements/definitions';
import { RARITY_CONFIG } from '@/lib/items/types';

/** Convert board cell coordinates to canvas pixel coordinates */
export function cellToPixel(
    cellX: number,
    cellY: number,
    boardGeoRef: MutableRefObject<BoardGeometry>,
) {
    const geo = boardGeoRef.current;
    return {
        x: geo.left + cellX * geo.cellSize + geo.cellSize / 2,
        y: geo.top + cellY * geo.cellSize + geo.cellSize / 2,
    };
}

export function spawnBeatRing(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    bpm: number,
    intensity: number,
) {
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
}

export function spawnEqualizerBars(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    rows: number[],
    count: number,
    onBeat: boolean,
) {
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
}

export function spawnGlitchParticles(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    rows: number[],
    combo: number,
) {
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
}

export function spawnRotationTrail(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    _pieceType: string,
    boardX: number,
    boardY: number,
    color: string,
) {
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
}

export function spawnSpeedLines(
    stateRef: MutableRefObject<VFXState>,
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    combo: number,
) {
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
}

export function spawnAscendingParticles(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    count: number,
) {
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
}

export function spawnHardDropParticles(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    boardX: number,
    boardY: number,
    dropDistance: number,
    color: string,
) {
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
}

export function spawnComboBreakEffect(
    stateRef: MutableRefObject<VFXState>,
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    lostCombo: number,
) {
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
}

// ===== Elemental VFX Spawners =====

export function spawnElementOrbParticles(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    element: string,
    boardX: number,
    boardY: number,
) {
    const state = stateRef.current;
    const config = ELEMENT_CONFIGS[element];
    if (!config) return;

    const pos = cellToPixel(boardX, boardY, boardGeoRef);
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
}

export function spawnElementOrbCollectBurst(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    element: string,
    count: number,
) {
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
}

export function spawnReactionBurst(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    reaction: string,
    intensity: number,
) {
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
}

export function fadeReactionAuras(
    stateRef: MutableRefObject<VFXState>,
    _reaction: string,
) {
    const state = stateRef.current;
    // Mark all auras to fade quickly
    for (const aura of state.reactionAuras) {
         
        aura.life = Math.min(aura.life, 0.3);
    }
}

export function spawnCorruptionBackfire(
    stateRef: MutableRefObject<VFXState>,
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
) {
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
}

export function spawnEquipmentDropBeam(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    rarity: string,
    boardX: number,
    boardY: number,
) {
    const geo = boardGeoRef.current;
    const state = stateRef.current;
    const rarityConf = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG];
    if (!rarityConf) return;

    const pos = cellToPixel(boardX, boardY, boardGeoRef);

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
}

// ===== Dragon Breath VFX Spawners =====

export function spawnDragonEnergyTrail(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    gauge: 'fury' | 'might',
    newValue: number,
) {
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
}

export function spawnDragonFireBurst(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
) {
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
}

export function spawnDragonEmbers(
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    count: number,
) {
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
}
