'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { GalaxyGate } from '../galaxy-types';
import {
    GALAXY_TOP_WIDTH,
    GALAXY_SIDE_HEIGHT,
    GALAXY_PATH_LENGTH,
    GALAXY_SIDE_BOUNDARIES,
    GALAXY_TOWERS_PER_SIDE_TB,
    GALAXY_TOWERS_PER_SIDE_LR,
    GALAXY_GATE_POSITIONS,
} from '../galaxy-constants';
import {
    GRID_W, GRID_H, DEPTH, BOARD_W, BOARD_H,
    CELL, CELL_GAP, ORIGIN_X, ORIGIN_Z,
} from '../galaxy-shared-constants';
import { getBiomeColors, mulberry32 } from '../terrain-utils';
import type { Biome } from '../terrain-utils';

// ===== Cell heights by type (matching TD page style) =====
export const HEIGHT_PATH = 0.12;
export const HEIGHT_GRASS = 0.2;
export const HEIGHT_BUFFER = 0.2;
export const HEIGHT_CORNER = 0.35;

// ===== Cell type identification =====
export type CellKind = 'path' | 'tower' | 'buffer' | 'corner' | 'empty';

export function getCellKind(col: number, row: number): CellKind {
    const inTopStrip = row < DEPTH;
    const inBottomStrip = row >= DEPTH + BOARD_H;
    const inLeftStrip = col < DEPTH;
    const inRightStrip = col >= DEPTH + BOARD_W;
    const inCenter = col >= DEPTH && col < DEPTH + BOARD_W && row >= DEPTH && row < DEPTH + BOARD_H;

    if (inCenter) return 'empty';
    if ((inTopStrip || inBottomStrip) && (inLeftStrip || inRightStrip)) return 'corner';

    let layer: number;
    if (inTopStrip) layer = row;
    else if (inBottomStrip) layer = GRID_H - 1 - row;
    else if (inLeftStrip) layer = col;
    else if (inRightStrip) layer = GRID_W - 1 - col;
    else return 'empty';

    if (layer === 0) return 'path';
    if (layer === 1) return 'tower';
    return 'buffer';
}

// ===== Path fraction -> 3D world position =====
export function pathToWorld(pathPos: number): { x: number; z: number; angle: number } {
    const p = ((pathPos % 1.0) + 1.0) % 1.0;
    const cellIdx = p * GALAXY_PATH_LENGTH;
    const topLen = GALAXY_TOP_WIDTH;
    const rightLen = GALAXY_SIDE_HEIGHT;
    const bottomLen = GALAXY_TOP_WIDTH;

    let col: number, row: number, angle: number;

    if (cellIdx < topLen) {
        const t = cellIdx / topLen;
        col = t * (GRID_W - 1); row = 0; angle = 0;
    } else if (cellIdx < topLen + rightLen) {
        const t = (cellIdx - topLen) / rightLen;
        col = GRID_W - 1; row = DEPTH + t * (BOARD_H - 1); angle = -Math.PI / 2;
    } else if (cellIdx < topLen + rightLen + bottomLen) {
        const t = (cellIdx - topLen - rightLen) / bottomLen;
        col = (GRID_W - 1) * (1 - t); row = GRID_H - 1; angle = Math.PI;
    } else {
        const leftStart = topLen + rightLen + bottomLen;
        const t = (cellIdx - leftStart) / GALAXY_SIDE_HEIGHT;
        col = 0; row = DEPTH + (BOARD_H - 1) * (1 - t); angle = Math.PI / 2;
    }

    return { x: ORIGIN_X + col * CELL, z: ORIGIN_Z + row * CELL, angle };
}

// ===== Tower position (1 cell inward from path) =====
export function towerToWorld(side: string, index: number): { x: number; z: number; angle: number } {
    const bounds = GALAXY_SIDE_BOUNDARIES[side as keyof typeof GALAXY_SIDE_BOUNDARIES];
    const count = (side === 'top' || side === 'bottom') ? GALAXY_TOWERS_PER_SIDE_TB : GALAXY_TOWERS_PER_SIDE_LR;
    const sideLen = bounds.end - bounds.start;
    const padding = (side === 'top' || side === 'bottom') ? sideLen * (DEPTH / GALAXY_TOP_WIDTH) : 0;
    const usable = sideLen - 2 * padding;
    const pathFrac = bounds.start + padding + (index + 0.5) * (usable / count);
    const pathWorld = pathToWorld(pathFrac);
    let dx = 0, dz = 0;
    if (side === 'top') dz = CELL;
    else if (side === 'bottom') dz = -CELL;
    else if (side === 'left') dx = CELL;
    else dx = -CELL;
    return { x: pathWorld.x + dx, z: pathWorld.z + dz, angle: pathWorld.angle };
}

// ===== Terrain Grid (TD-style with checkerboard + varying heights) =====
export function TerrainGrid({ biome }: { biome: Biome }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { count, matrices, colors } = useMemo(() => {
        const rng = mulberry32(42);
        const bc = getBiomeColors(biome);
        const cells: { x: number; z: number; color: THREE.Color; height: number }[] = [];
        for (let row = 0; row < GRID_H; row++) {
            for (let col = 0; col < GRID_W; col++) {
                const kind = getCellKind(col, row);
                if (kind === 'empty') continue;
                const wx = ORIGIN_X + col * CELL;
                const wz = ORIGIN_Z + row * CELL;
                const checker = (col + row) % 2 === 0;
                let color: THREE.Color;
                let height: number;
                switch (kind) {
                    case 'path':
                        color = checker ? bc.pathA : bc.pathB;
                        height = HEIGHT_PATH;
                        break;
                    case 'tower':
                        color = checker ? bc.grassA : bc.grassB;
                        height = HEIGHT_GRASS + (rng() - 0.5) * 0.02;
                        break;
                    case 'buffer':
                        color = checker ? bc.bufferA : bc.bufferB;
                        height = HEIGHT_BUFFER + (rng() - 0.5) * 0.02;
                        break;
                    default:
                        color = checker ? bc.cornerA : bc.cornerB;
                        height = 0.2 + rng() * 0.3;
                        break;
                }
                cells.push({ x: wx, z: wz, color, height });
            }
        }
        const totalBlocks = cells.length;
        const mat = new Float32Array(totalBlocks * 16);
        const col = new Float32Array(totalBlocks * 3);
        const dummy = new THREE.Matrix4();
        const scale = new THREE.Matrix4();
        const blockSize = CELL - CELL_GAP;
        for (let i = 0; i < totalBlocks; i++) {
            const c = cells[i];
            dummy.makeTranslation(c.x, c.height * 0.5, c.z);
            scale.makeScale(blockSize, c.height, blockSize);
            dummy.multiply(scale);
            dummy.toArray(mat, i * 16);
            col[i * 3] = c.color.r; col[i * 3 + 1] = c.color.g; col[i * 3 + 2] = c.color.b;
        }
        return { count: totalBlocks, matrices: mat, colors: col };
    }, [biome]);

    useEffect(() => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;
        const dummy = new THREE.Matrix4();
        for (let i = 0; i < count; i++) {
            dummy.fromArray(matrices, i * 16);
            mesh.setMatrixAt(i, dummy);
        }
        mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        mesh.instanceMatrix.needsUpdate = true;
    }, [count, matrices, colors]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial vertexColors roughness={0.8} metalness={0.05} flatShading />
        </instancedMesh>
    );
}

// ===== Terrain underside =====
export function TerrainUnderside() {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { count, matrices } = useMemo(() => {
        const cells: { x: number; z: number }[] = [];
        for (let row = 0; row < GRID_H; row++) {
            for (let col = 0; col < GRID_W; col++) {
                if (getCellKind(col, row) === 'empty') continue;
                cells.push({ x: ORIGIN_X + col * CELL, z: ORIGIN_Z + row * CELL });
            }
        }
        const mat = new Float32Array(cells.length * 16);
        const dummy = new THREE.Matrix4();
        for (let i = 0; i < cells.length; i++) {
            dummy.makeTranslation(cells[i].x, -0.06, cells[i].z);
            dummy.toArray(mat, i * 16);
        }
        return { count: cells.length, matrices: mat };
    }, []);

    useEffect(() => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;
        const dummy = new THREE.Matrix4();
        for (let i = 0; i < count; i++) {
            dummy.fromArray(matrices, i * 16);
            mesh.setMatrixAt(i, dummy);
        }
        mesh.instanceMatrix.needsUpdate = true;
    }, [count, matrices]);

    const blockSize = CELL - CELL_GAP;
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[blockSize, 0.08, blockSize]} />
            <meshStandardMaterial color="#3d2b1a" roughness={0.95} flatShading />
        </instancedMesh>
    );
}

// ===== Ground plane =====
export function GroundPlane({ biome }: { biome: Biome }) {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 16; canvas.height = 16;
        const ctx = canvas.getContext('2d')!;
        const rng = mulberry32(99);
        const cs = getBiomeColors(biome).groundTones;
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 16; y++) {
                ctx.fillStyle = cs[Math.floor(rng() * cs.length)];
                ctx.fillRect(x, y, 1, 1);
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
        return tex;
    }, [biome]);
    const size = Math.max(GRID_W, GRID_H) * CELL * 2;
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial map={texture} roughness={0.95} transparent opacity={0.6} />
        </mesh>
    );
}

// ===== Path outline =====
export function PathOutline() {
    const points = useMemo(() => {
        const y = HEIGHT_PATH + 0.01;
        const halfW = (GRID_W - 1) * CELL * 0.5 + CELL * 0.5;
        const topZ = ORIGIN_Z - CELL * 0.5;
        const botZ = ORIGIN_Z + (GRID_H - 1) * CELL + CELL * 0.5;
        return [
            new THREE.Vector3(-halfW, y, topZ), new THREE.Vector3(halfW, y, topZ),
            new THREE.Vector3(halfW, y, botZ), new THREE.Vector3(-halfW, y, botZ),
            new THREE.Vector3(-halfW, y, topZ),
        ];
    }, []);
    const lineGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
    return (
        <line>
            <bufferGeometry attach="geometry" {...lineGeo} />
            <lineBasicMaterial color="#fbbf24" transparent opacity={0.5} />
        </line>
    );
}

// ===== Decorative crystals =====
export function TerrainDecorations({ biome }: { biome: Biome }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { count, matrices, colors } = useMemo(() => {
        const rng = mulberry32(137);
        const decoCount = 30;
        const mat = new Float32Array(decoCount * 16);
        const col = new Float32Array(decoCount * 3);
        const dummy = new THREE.Matrix4();
        const crystalColors = getBiomeColors(biome).decorationColors;
        let placed = 0;
        for (let attempt = 0; attempt < decoCount * 3 && placed < decoCount; attempt++) {
            const gCol = Math.floor(rng() * GRID_W);
            const gRow = Math.floor(rng() * GRID_H);
            if (getCellKind(gCol, gRow) === 'empty') continue;
            const scale = 0.03 + rng() * 0.06;
            const hScale = 0.5 + rng() * 2;
            const wx = ORIGIN_X + gCol * CELL + (rng() - 0.5) * CELL * 0.4;
            const wz = ORIGIN_Z + gRow * CELL + (rng() - 0.5) * CELL * 0.4;
            dummy.identity();
            dummy.makeTranslation(wx, HEIGHT_GRASS + scale * hScale * 0.5, wz);
            dummy.multiply(new THREE.Matrix4().makeScale(scale, scale * hScale, scale));
            dummy.toArray(mat, placed * 16);
            const c = crystalColors[Math.floor(rng() * crystalColors.length)];
            col[placed * 3] = c.r; col[placed * 3 + 1] = c.g; col[placed * 3 + 2] = c.b;
            placed++;
        }
        return { count: placed, matrices: mat.slice(0, placed * 16), colors: col.slice(0, placed * 3) };
    }, [biome]);

    useEffect(() => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;
        const dummy = new THREE.Matrix4();
        for (let i = 0; i < count; i++) {
            dummy.fromArray(matrices, i * 16);
            mesh.setMatrixAt(i, dummy);
        }
        mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        mesh.instanceMatrix.needsUpdate = true;
    }, [count, matrices, colors]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial vertexColors roughness={0.4} metalness={0.2} flatShading />
        </instancedMesh>
    );
}

// ===== Directional path arrows (InstancedMesh) =====
export function PathArrows() {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { count, matrices } = useMemo(() => {
        // Place an arrow every 6th path cell
        const arrowCount = Math.floor(GALAXY_PATH_LENGTH / 6);
        const mat = new Float32Array(arrowCount * 16);
        const dummy = new THREE.Matrix4();
        const rot = new THREE.Matrix4();
        const scale = new THREE.Matrix4();
        for (let i = 0; i < arrowCount; i++) {
            const pathFrac = (i * 6 + 3) / GALAXY_PATH_LENGTH;
            const pos = pathToWorld(pathFrac);
            dummy.makeTranslation(pos.x, HEIGHT_PATH + 0.01, pos.z);
            rot.makeRotationY(pos.angle);
            scale.makeScale(0.06, 0.01, 0.08);
            dummy.multiply(rot).multiply(scale);
            dummy.toArray(mat, i * 16);
        }
        return { count: arrowCount, matrices: mat };
    }, []);

    useEffect(() => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;
        const dummy = new THREE.Matrix4();
        for (let i = 0; i < count; i++) {
            dummy.fromArray(matrices, i * 16);
            mesh.setMatrixAt(i, dummy);
        }
        mesh.instanceMatrix.needsUpdate = true;
    }, [count, matrices]);

    const triGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        // Simple triangle pointing in +Z
        const verts = new Float32Array([
            -1, 0, -1,
             1, 0, -1,
             0, 0,  1,
        ]);
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        return geo;
    }, []);

    return (
        <instancedMesh ref={meshRef} args={[triGeo, undefined, count]}>
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} transparent opacity={0.5} side={THREE.DoubleSide} flatShading />
        </instancedMesh>
    );
}

// ===== Colored gate entry/exit markers =====
export function GateEntryMarkers({ gates }: { gates: GalaxyGate[] }) {
    const markers = useMemo(() => {
        const sides = ['top', 'right', 'bottom', 'left'] as const;
        return sides.map(side => {
            const gate = gates.find(g => g.side === side);
            const ratio = gate ? gate.health / gate.maxHealth : 1;
            const pos = GALAXY_GATE_POSITIONS[side];
            const world = pathToWorld(pos);
            const color = ratio > 0.5 ? '#44ff88' : ratio > 0.25 ? '#ffaa44' : '#ff4444';
            return { ...world, color, side };
        });
    }, [gates]);

    return (
        <>
            {markers.map(({ x, z, color, side }) => (
                <group key={`entry-${side}`} position={[x, HEIGHT_PATH + 0.005, z]}>
                    {/* Colored circle on the path at gate position */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[0.08, 0.14, 12]} />
                        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.7} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            ))}
        </>
    );
}
