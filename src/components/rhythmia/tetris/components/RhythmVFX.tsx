'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { BoardGeometry } from '../hooks/useRhythmVFX';

interface RhythmVFXProps {
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
    boardRef: React.RefObject<HTMLDivElement | null>;
    onBoardGeometry: (geo: BoardGeometry) => void;
    isPlaying: boolean;
    onStart: () => void;
    onStop: () => void;
}

/**
 * Canvas overlay for rhythm-reactive VFX.
 * Positioned absolutely over the game area to render particles,
 * beat rings, equalizer bars, glitch effects, etc.
 */
export function RhythmVFX({
    canvasRef,
    boardRef,
    onBoardGeometry,
    isPlaying,
    onStart,
    onStop,
}: RhythmVFXProps) {
    const observerRef = useRef<ResizeObserver | null>(null);
    const localCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Sync local ref to parent ref
    const setCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
        localCanvasRef.current = el;
        canvasRef.current = el;
    }, [canvasRef]);

    // Measure board position and update geometry
    const measureBoard = useCallback(() => {
        const boardEl = boardRef.current;
        const canvas = localCanvasRef.current;
        if (!boardEl || !canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const boardRect = boardEl.getBoundingClientRect();

        const cellSize = boardRect.width / 10; // BOARD_WIDTH = 10

        onBoardGeometry({
            left: boardRect.left - canvasRect.left,
            top: boardRect.top - canvasRect.top,
            cellSize,
            width: boardRect.width,
            height: boardRect.height,
        });
    }, [boardRef, onBoardGeometry]);

    // Observe board resize
    useEffect(() => {
        const boardEl = boardRef.current;
        if (!boardEl) return;

        observerRef.current = new ResizeObserver(() => {
            measureBoard();
        });
        observerRef.current.observe(boardEl);

        // Initial measurement
        measureBoard();

        return () => {
            observerRef.current?.disconnect();
        };
    }, [boardRef, measureBoard]);

    // Start/stop render loop based on game state
    useEffect(() => {
        if (isPlaying) {
            measureBoard();
            onStart();
        } else {
            onStop();
        }
    }, [isPlaying, onStart, onStop, measureBoard]);

    return (
        <canvas
            ref={setCanvasRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 50,
            }}
        />
    );
}
