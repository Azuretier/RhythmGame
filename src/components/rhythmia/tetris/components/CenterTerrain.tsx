'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Board, Piece } from '../types';
import { getShape } from '../utils/boardUtils';
import { VISIBLE_HEIGHT, BOARD_WIDTH, BUFFER_ZONE } from '../constants';
import {
    DEPTH, BOARD_W, BOARD_H,
    CELL, CELL_GAP, ORIGIN_X, ORIGIN_Z,
} from '../galaxy-shared-constants';
const BLOCK_SIZE = CELL - CELL_GAP;

// Max instances: 10x20 board + up to 4 cells for current piece
const MAX_INSTANCES = BOARD_W * BOARD_H + 4;

// ===== Piece type → Color =====
const PIECE_COLORS: Record<string, THREE.Color> = {
    I: new THREE.Color('#06b6d4'),
    O: new THREE.Color('#eab308'),
    T: new THREE.Color('#a855f7'),
    S: new THREE.Color('#22c55e'),
    Z: new THREE.Color('#ef4444'),
    J: new THREE.Color('#3b82f6'),
    L: new THREE.Color('#f97316'),
    garbage: new THREE.Color('#666666'),
};
const DEFAULT_COLOR = new THREE.Color('#888888');

// Height per piece type (subtle depth variation)
const PIECE_HEIGHTS: Record<string, number> = {
    I: 0.25,
    O: 0.20,
    T: 0.22,
    S: 0.18,
    Z: 0.18,
    J: 0.20,
    L: 0.20,
    garbage: 0.15,
};
const DEFAULT_HEIGHT = 0.17;

// Row depth offset: higher row index → slightly lower Y
const ROW_DEPTH_FACTOR = -0.002;

export interface CenterTerrainProps {
    board: Board;
    currentPiece: Piece | null;
    clearedRows?: number[];
}

export function CenterTerrain({ board, currentPiece, clearedRows }: CenterTerrainProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const clearAnimRef = useRef<{ rows: number[]; startTime: number } | null>(null);

    // Pre-allocate reusable objects (avoid allocations in useFrame)
    const tmpMatrix = useMemo(() => new THREE.Matrix4(), []);
    const tmpScale = useMemo(() => new THREE.Matrix4(), []);
    const tmpColor = useMemo(() => new THREE.Color(), []);
    const whiteColor = useMemo(() => new THREE.Color('#ffffff'), []);

    // Track cleared rows for animation
    const prevClearedRef = useRef<number[]>([]);
    if (clearedRows && clearedRows.length > 0 && clearedRows !== prevClearedRef.current) {
        prevClearedRef.current = clearedRows;
        clearAnimRef.current = { rows: [...clearedRows], startTime: -1 };
    } else if ((!clearedRows || clearedRows.length === 0) && prevClearedRef.current.length > 0) {
        prevClearedRef.current = [];
        clearAnimRef.current = null;
    }

    // Pre-allocate color buffer
    const colorBuffer = useMemo(() => new Float32Array(MAX_INSTANCES * 3), []);

    useFrame(({ clock }) => {
        const mesh = meshRef.current;
        if (!mesh) return;

        const now = clock.getElapsedTime();
        let instanceIdx = 0;

        // Animation state for cleared rows
        const clearAnim = clearAnimRef.current;
        if (clearAnim && clearAnim.startTime < 0) {
            clearAnim.startTime = now;
        }
        const clearProgress = clearAnim ? Math.min((now - clearAnim.startTime) / 0.3, 1.0) : -1;
        const clearSet = clearAnim ? new Set(clearAnim.rows) : null;

        // End animation when complete
        if (clearProgress >= 1.0) {
            clearAnimRef.current = null;
        }

        // Render board cells (visible rows only: skip buffer zone)
        for (let visRow = 0; visRow < VISIBLE_HEIGHT; visRow++) {
            const boardRow = visRow + BUFFER_ZONE; // actual board row index
            for (let col = 0; col < BOARD_WIDTH; col++) {
                const cell = board[boardRow]?.[col];
                if (!cell) continue;

                // Check if this row is being cleared
                const isClearing = clearSet?.has(boardRow);
                if (isClearing && clearProgress >= 1.0) continue;

                const pieceType = cell;
                const baseHeight = PIECE_HEIGHTS[pieceType] ?? DEFAULT_HEIGHT;
                const depthOffset = visRow * ROW_DEPTH_FACTOR;

                // World position: map board col/row → grid col/row
                const gridCol = DEPTH + col;
                const gridRow = DEPTH + visRow;
                const wx = ORIGIN_X + gridCol * CELL;
                const wz = ORIGIN_Z + gridRow * CELL;
                const wy = (baseHeight * 0.5) + depthOffset;

                let scale = 1.0;
                let color: THREE.Color;

                if (isClearing && clearProgress >= 0) {
                    // Flash white then shrink
                    const flashPhase = Math.min(clearProgress * 3, 1.0); // flash in first third
                    const shrinkPhase = Math.max((clearProgress - 0.33) / 0.67, 0); // shrink in last two thirds
                    scale = 1.0 - shrinkPhase;
                    const baseColor = PIECE_COLORS[pieceType] ?? DEFAULT_COLOR;
                    tmpColor.copy(baseColor).lerp(whiteColor, 1.0 - flashPhase);
                    color = tmpColor;
                } else {
                    color = PIECE_COLORS[pieceType] ?? DEFAULT_COLOR;
                }

                if (instanceIdx < MAX_INSTANCES) {
                    tmpMatrix.makeTranslation(wx, wy, wz);
                    tmpScale.makeScale(BLOCK_SIZE * scale, baseHeight * scale, BLOCK_SIZE * scale);
                    tmpMatrix.multiply(tmpScale);
                    mesh.setMatrixAt(instanceIdx, tmpMatrix);
                    // eslint-disable-next-line react-hooks/immutability
                    colorBuffer[instanceIdx * 3] = color.r;
                    colorBuffer[instanceIdx * 3 + 1] = color.g;
                    colorBuffer[instanceIdx * 3 + 2] = color.b;
                    instanceIdx++;
                }
            }
        }

        // Render current piece (slightly transparent via reduced color brightness)
        if (currentPiece) {
            const shape = getShape(currentPiece.type, currentPiece.rotation);
            const pieceColor = PIECE_COLORS[currentPiece.type] ?? DEFAULT_COLOR;
            const baseHeight = PIECE_HEIGHTS[currentPiece.type] ?? DEFAULT_HEIGHT;

            for (let sy = 0; sy < shape.length; sy++) {
                for (let sx = 0; sx < shape[sy].length; sx++) {
                    if (!shape[sy][sx]) continue;

                    const boardCol = currentPiece.x + sx;
                    const boardRow = currentPiece.y + sy;
                    const visRow = boardRow - BUFFER_ZONE;

                    // Only render visible rows
                    if (visRow < 0 || visRow >= VISIBLE_HEIGHT) continue;
                    if (boardCol < 0 || boardCol >= BOARD_WIDTH) continue;

                    const gridCol = DEPTH + boardCol;
                    const gridRow = DEPTH + visRow;
                    const wx = ORIGIN_X + gridCol * CELL;
                    const wz = ORIGIN_Z + gridRow * CELL;
                    const depthOffset = visRow * ROW_DEPTH_FACTOR;
                    const wy = (baseHeight * 0.5) + depthOffset;

                    if (instanceIdx < MAX_INSTANCES) {
                        tmpMatrix.makeTranslation(wx, wy, wz);
                        tmpScale.makeScale(BLOCK_SIZE, baseHeight, BLOCK_SIZE);
                        tmpMatrix.multiply(tmpScale);
                        mesh.setMatrixAt(instanceIdx, tmpMatrix);
                        // Dimmed color for current piece (0.7 brightness = slightly transparent look)
                        colorBuffer[instanceIdx * 3] = pieceColor.r * 0.7;
                        colorBuffer[instanceIdx * 3 + 1] = pieceColor.g * 0.7;
                        colorBuffer[instanceIdx * 3 + 2] = pieceColor.b * 0.7;
                        instanceIdx++;
                    }
                }
            }
        }

        // Hide unused instances by scaling to 0
        for (let i = instanceIdx; i < MAX_INSTANCES; i++) {
            tmpMatrix.makeScale(0, 0, 0);
            mesh.setMatrixAt(i, tmpMatrix);
        }

        // Apply color buffer as instance colors
        if (!mesh.instanceColor) {
            mesh.instanceColor = new THREE.InstancedBufferAttribute(
                new Float32Array(MAX_INSTANCES * 3), 3
            );
        }
        const attr = mesh.instanceColor as THREE.InstancedBufferAttribute;
        attr.array.set(colorBuffer);
        attr.needsUpdate = true;
        mesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, MAX_INSTANCES]}
            castShadow={false}
            receiveShadow={false}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial vertexColors roughness={0.7} metalness={0.1} flatShading />
        </instancedMesh>
    );
}
