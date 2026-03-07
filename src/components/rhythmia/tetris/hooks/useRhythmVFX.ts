/**
 * Hook for managing rhythm-reactive VFX on a canvas overlay.
 * Orchestrates spawners (vfx-spawners.ts) and renderer (vfx-renderer.ts).
 * Types and constants live in vfx-types.ts.
 */
import { useRef, useCallback, useEffect, useMemo } from 'react';
import type { VFXEvent } from '../types';
import { BUFFER_ZONE } from '../constants';

// Re-export BoardGeometry for backward compatibility
export type { BoardGeometry } from './vfx-types';
import type { VFXState, BoardGeometry } from './vfx-types';
import { createDefaultVFXState } from './vfx-types';

import {
    spawnBeatRing,
    spawnEqualizerBars,
    spawnGlitchParticles,
    spawnRotationTrail,
    spawnHardDropParticles,
    spawnSpeedLines,
    spawnAscendingParticles,
    spawnComboBreakEffect,
    spawnElementOrbParticles,
    spawnElementOrbCollectBurst,
    spawnReactionBurst,
    fadeReactionAuras,
    spawnCorruptionBackfire,
    spawnEquipmentDropBeam,
    spawnDragonEnergyTrail,
    spawnDragonFireBurst,
} from './vfx-spawners';

import { renderVFX } from './vfx-renderer';

export function useRhythmVFX() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const stateRef = useRef<VFXState>(createDefaultVFXState());
    const boardGeoRef = useRef<BoardGeometry>({ left: 0, top: 0, cellSize: 28, width: 280, height: 560 });
    const animFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const activeRef = useRef(false);

    // ===== Main VFX Event Handler =====

    const emit = useCallback((event: VFXEvent) => {
        const state = stateRef.current;

        switch (event.type) {
            case 'beat':
                spawnBeatRing(stateRef, boardGeoRef, event.bpm, event.intensity);
                break;

            case 'lineClear': {
                // Offset rows from full board coords to visible-area coords
                const visibleRows = event.rows.map((r: number) => r - BUFFER_ZONE);
                spawnEqualizerBars(stateRef, boardGeoRef, visibleRows, event.count, event.onBeat);
                if (event.onBeat) {
                    spawnGlitchParticles(stateRef, boardGeoRef, visibleRows, event.combo);
                }
                break;
            }

            case 'rotation':
                spawnRotationTrail(stateRef, boardGeoRef, event.pieceType, event.boardX, event.boardY - BUFFER_ZONE, '#00FFFF');
                break;

            case 'hardDrop':
                spawnHardDropParticles(stateRef, boardGeoRef, event.boardX, event.boardY - BUFFER_ZONE, event.dropDistance, '#FFFFFF');
                break;

            case 'comboChange':
                state.combo = event.combo;
                if (event.combo >= 10 && !state.isFever) {
                    state.isFever = true;
                    spawnSpeedLines(stateRef, canvasRef, event.combo);
                }
                if (event.combo >= 5) {
                    spawnAscendingParticles(stateRef, boardGeoRef, Math.min(8, event.combo - 3));
                }
                if (event.combo >= 10) {
                    spawnSpeedLines(stateRef, canvasRef, event.combo);
                }
                break;

            case 'comboBreak':
                spawnComboBreakEffect(stateRef, canvasRef, boardGeoRef, event.lostCombo);
                break;

            case 'feverStart':
                state.isFever = true;
                spawnSpeedLines(stateRef, canvasRef, event.combo);
                break;

            case 'feverEnd':
                state.isFever = false;
                break;

            case 'dragonGaugeCharge':
                spawnDragonEnergyTrail(stateRef, boardGeoRef, event.gauge, event.newValue);
                break;

            case 'dragonBreathStart':
                spawnDragonFireBurst(stateRef, boardGeoRef);
                break;

            case 'dragonBreathEnd':
                state.isDragonBreathing = false;
                break;

            // --- Elemental system events ---

            case 'elementOrbSpawn':
                spawnElementOrbParticles(stateRef, boardGeoRef, event.element, event.boardX, event.boardY - BUFFER_ZONE);
                break;

            case 'elementOrbCollect':
                spawnElementOrbCollectBurst(stateRef, boardGeoRef, event.element, event.count);
                break;

            case 'reactionTrigger':
                spawnReactionBurst(stateRef, boardGeoRef, event.reaction, event.intensity);
                break;

            case 'reactionEnd':
                fadeReactionAuras(stateRef, event.reaction);
                break;

            case 'corruptionBackfire':
                spawnCorruptionBackfire(stateRef, canvasRef, boardGeoRef);
                break;

            case 'equipmentDrop':
                spawnEquipmentDropBeam(stateRef, boardGeoRef, event.rarity, event.boardX, event.boardY - BUFFER_ZONE);
                break;
        }
    }, []);

    // ===== Canvas Render Loop =====

    // Use a ref to hold the render function so the loop can self-schedule
    // without a circular useCallback dependency.
    const renderRef = useRef<(time: number) => void>((time: number) => {
        renderVFX(time, canvasRef, stateRef, boardGeoRef, lastTimeRef);
        if (activeRef.current) {
            animFrameRef.current = requestAnimationFrame(renderRef.current);
        }
    });

    // Update board geometry for coordinate mapping
    const updateBoardGeometry = useCallback((geo: BoardGeometry) => {
        boardGeoRef.current = geo;
    }, []);

    // Start/stop the render loop
    const start = useCallback(() => {
        if (activeRef.current) return;
        activeRef.current = true;
        lastTimeRef.current = 0;
        animFrameRef.current = requestAnimationFrame(renderRef.current);
    }, []);

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
