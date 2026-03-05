'use client';

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { TowerType, EnemyType, RingEnemy, RingTower, RingProjectile, TowerSlot, GalaxyGate, StatusEffect } from '../galaxy-types';
import { ENEMY_DEFS } from '@/types/tower-defense';
import {
    GALAXY_RING_DEPTH,
    GALAXY_TOP_WIDTH,
    GALAXY_SIDE_HEIGHT,
    GALAXY_PATH_LENGTH,
    GALAXY_SIDE_BOUNDARIES,
    GALAXY_TOWERS_PER_SIDE_TB,
    GALAXY_TOWERS_PER_SIDE_LR,
    GALAXY_GATE_POSITIONS,
} from '../galaxy-constants';

// ===== Grid dimensions =====
const GRID_W = GALAXY_TOP_WIDTH;               // 16
const GRID_H = GALAXY_SIDE_HEIGHT + 2 * GALAXY_RING_DEPTH; // 26
const BOARD_W = GRID_W - 2 * GALAXY_RING_DEPTH; // 10
const BOARD_H = GALAXY_SIDE_HEIGHT;              // 20
const DEPTH = GALAXY_RING_DEPTH;                 // 3

// ===== 3D sizing =====
const CELL = 0.32;
const CELL_GAP = 0.02;
const BLOCK_H = 0.18;
const ENEMY_SIZE = 0.28;
const TOWER_SIZE = 0.22;
const LERP_SPEED = 8;
const SLOT_SIZE = 0.18;

const ORIGIN_X = -(GRID_W - 1) * CELL * 0.5;
const ORIGIN_Z = -(GRID_H - 1) * CELL * 0.5;

// ===== Tower type colors =====
const TOWER_TYPE_COLORS: Record<TowerType, { main: THREE.Color; accent: THREE.Color; glow: THREE.Color }> = {
    archer:    { main: new THREE.Color('#4ade80'), accent: new THREE.Color('#22c55e'), glow: new THREE.Color('#66ff99') },
    cannon:    { main: new THREE.Color('#f97316'), accent: new THREE.Color('#ea580c'), glow: new THREE.Color('#ff9944') },
    frost:     { main: new THREE.Color('#38bdf8'), accent: new THREE.Color('#0ea5e9'), glow: new THREE.Color('#66ddff') },
    lightning: { main: new THREE.Color('#a78bfa'), accent: new THREE.Color('#8b5cf6'), glow: new THREE.Color('#bb99ff') },
    sniper:    { main: new THREE.Color('#f43f5e'), accent: new THREE.Color('#e11d48'), glow: new THREE.Color('#ff6688') },
    flame:     { main: new THREE.Color('#ef4444'), accent: new THREE.Color('#dc2626'), glow: new THREE.Color('#ff6644') },
    arcane:    { main: new THREE.Color('#c084fc'), accent: new THREE.Color('#a855f7'), glow: new THREE.Color('#dd99ff') },
};

// ===== Enemy type colors =====
function getEnemyColor(type: EnemyType): THREE.Color {
    const def = ENEMY_DEFS[type];
    return new THREE.Color(def.color);
}

function getEnemyScale(type: EnemyType): number {
    const def = ENEMY_DEFS[type];
    return def.scale / 0.4; // normalized to base grunt scale
}

// ===== Path/Terrain colors =====
const PATH_COLORS = [new THREE.Color('#3a6a4a'), new THREE.Color('#4a7a5a'), new THREE.Color('#3a5a4a'), new THREE.Color('#4a7a5a')];
const TOWER_LAYER_COLORS = [new THREE.Color('#4a3a6a'), new THREE.Color('#5a4a7a'), new THREE.Color('#3a2a5a')];
const BUFFER_COLORS = [new THREE.Color('#2a1a4a'), new THREE.Color('#3a2a5a')];
const CORNER_COLOR = new THREE.Color('#1a1030');
const SLOT_COLOR_EMPTY = new THREE.Color('#554488');
const SLOT_COLOR_HIGHLIGHT = new THREE.Color('#8866dd');

// ===== Pixel filter setup =====
function PixelFilterSetup() {
    const { gl } = useThree();
    // eslint-disable-next-line react-hooks/immutability
    useEffect(() => { gl.outputColorSpace = THREE.SRGBColorSpace; }, [gl]);
    return null;
}

// ===== Cell type identification =====
type CellKind = 'path' | 'tower' | 'buffer' | 'corner' | 'empty';

function getCellKind(col: number, row: number): CellKind {
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

// ===== Path fraction → 3D world position =====
function pathToWorld(pathPos: number): { x: number; z: number; angle: number } {
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
function towerToWorld(side: string, index: number): { x: number; z: number; angle: number } {
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

// ===== Terrain Grid =====
function TerrainGrid() {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { count, matrices, colors } = useMemo(() => {
        const rng = mulberry32(42);
        const cells: { x: number; z: number; color: THREE.Color; heightVar: number }[] = [];
        for (let row = 0; row < GRID_H; row++) {
            for (let col = 0; col < GRID_W; col++) {
                const kind = getCellKind(col, row);
                if (kind === 'empty') continue;
                const wx = ORIGIN_X + col * CELL;
                const wz = ORIGIN_Z + row * CELL;
                const hv = (rng() - 0.5) * 0.04;
                let color: THREE.Color;
                switch (kind) {
                    case 'path': color = PATH_COLORS[Math.floor(rng() * PATH_COLORS.length)]; break;
                    case 'tower': color = TOWER_LAYER_COLORS[Math.floor(rng() * TOWER_LAYER_COLORS.length)]; break;
                    case 'buffer': color = BUFFER_COLORS[Math.floor(rng() * BUFFER_COLORS.length)]; break;
                    default: color = CORNER_COLOR.clone();
                }
                cells.push({ x: wx, z: wz, color, heightVar: hv });
            }
        }
        const totalBlocks = cells.length;
        const mat = new Float32Array(totalBlocks * 16);
        const col = new Float32Array(totalBlocks * 3);
        const dummy = new THREE.Matrix4();
        for (let i = 0; i < totalBlocks; i++) {
            const c = cells[i];
            dummy.makeTranslation(c.x, c.heightVar, c.z);
            dummy.toArray(mat, i * 16);
            col[i * 3] = c.color.r; col[i * 3 + 1] = c.color.g; col[i * 3 + 2] = c.color.b;
        }
        return { count: totalBlocks, matrices: mat, colors: col };
    }, []);

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

    const blockSize = CELL - CELL_GAP;
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[blockSize, BLOCK_H, blockSize]} />
            <meshStandardMaterial vertexColors roughness={0.85} metalness={0.05} flatShading />
        </instancedMesh>
    );
}

// ===== Terrain underside =====
function TerrainUnderside() {
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
            dummy.makeTranslation(cells[i].x, -BLOCK_H * 0.6, cells[i].z);
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
            <boxGeometry args={[blockSize, BLOCK_H * 0.5, blockSize]} />
            <meshStandardMaterial color="#1a0e30" roughness={0.95} flatShading />
        </instancedMesh>
    );
}

// ===== Ground plane =====
function GroundPlane() {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 16; canvas.height = 16;
        const ctx = canvas.getContext('2d')!;
        const rng = mulberry32(99);
        const cs = ['#0e0818', '#120c20', '#160e28', '#0e0a1a', '#100c1e'];
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 16; y++) {
                ctx.fillStyle = cs[Math.floor(rng() * cs.length)];
                ctx.fillRect(x, y, 1, 1);
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
        return tex;
    }, []);
    const size = Math.max(GRID_W, GRID_H) * CELL * 2;
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -BLOCK_H, 0]}>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial map={texture} roughness={0.95} transparent opacity={0.45} />
        </mesh>
    );
}

// ===== Path outline =====
function PathOutline() {
    const points = useMemo(() => {
        const y = BLOCK_H * 0.5 + 0.01;
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
            <lineBasicMaterial color="#9977ee" transparent opacity={0.5} />
        </line>
    );
}

// ===== Decorative crystals =====
function TerrainDecorations() {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { count, matrices, colors } = useMemo(() => {
        const rng = mulberry32(137);
        const decoCount = 30;
        const mat = new Float32Array(decoCount * 16);
        const col = new Float32Array(decoCount * 3);
        const dummy = new THREE.Matrix4();
        const crystalColors = [new THREE.Color('#8866cc'), new THREE.Color('#66aacc'), new THREE.Color('#aa77dd'), new THREE.Color('#5588aa')];
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
            dummy.makeTranslation(wx, BLOCK_H * 0.5 + scale * hScale * 0.5, wz);
            dummy.multiply(new THREE.Matrix4().makeScale(scale, scale * hScale, scale));
            dummy.toArray(mat, placed * 16);
            const c = crystalColors[Math.floor(rng() * crystalColors.length)];
            col[placed * 3] = c.r; col[placed * 3 + 1] = c.g; col[placed * 3 + 2] = c.b;
            placed++;
        }
        return { count: placed, matrices: mat.slice(0, placed * 16), colors: col.slice(0, placed * 3) };
    }, []);

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

// ===== HP Number Sprite =====
function HPNumberSprite({ health, maxHealth }: { health: number; maxHealth: number }) {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 24;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, 64, 24);
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 3;
        const txt = `${Math.ceil(health)}/${maxHealth}`;
        ctx.strokeText(txt, 32, 12);
        const ratio = health / maxHealth;
        ctx.fillStyle = ratio > 0.5 ? '#44dd66' : ratio > 0.25 ? '#ddaa33' : '#dd3333';
        ctx.fillText(txt, 32, 12);
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
        return tex;
    }, [health, maxHealth]);
    useEffect(() => () => { texture.dispose(); }, [texture]);
    return (
        <sprite position={[0, ENEMY_SIZE * 2.15, 0]} scale={[0.38, 0.14, 1]}>
            <spriteMaterial map={texture} transparent depthTest={false} />
        </sprite>
    );
}

// ===== Enemy HP Bar =====
function EnemyHPBar({ health, maxHealth }: { health: number; maxHealth: number }) {
    const ratio = Math.max(0, health / maxHealth);
    const barW = ENEMY_SIZE * 1.3;
    const barH = 0.035;
    const barColor = ratio > 0.5 ? '#44dd66' : ratio > 0.25 ? '#ddaa33' : '#dd3333';
    return (
        <group position={[0, ENEMY_SIZE * 1.85, 0]}>
            <HPNumberSprite health={health} maxHealth={maxHealth} />
            <mesh>
                <planeGeometry args={[barW, barH]} />
                <meshBasicMaterial color="#111111" transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[(ratio - 1) * barW * 0.5, 0, 0.001]}>
                <planeGeometry args={[barW * ratio, barH * 0.8]} />
                <meshBasicMaterial color={barColor} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// ===== Pixelated Enemy with type-specific visuals =====
function PixelEnemy({ pathPosition, enemyType, id, health, maxHealth, effects }: {
    pathPosition: number;
    enemyType: EnemyType;
    id: string;
    health: number;
    maxHealth: number;
    effects: StatusEffect[];
}) {
    const groupRef = useRef<THREE.Group>(null);
    const smoothRef = useRef({ x: 0, z: 0, angle: 0, init: false });
    const idHash = useMemo(() => hashString(id), [id]);
    const baseColor = useMemo(() => getEnemyColor(enemyType), [enemyType]);
    const scale = useMemo(() => getEnemyScale(enemyType), [enemyType]);

    // Status effect tints
    const isSlow = effects.some(e => e.type === 'slow');
    const isBurn = effects.some(e => e.type === 'burn');
    const isStun = effects.some(e => e.type === 'stun');

    const bodyColor = useMemo(() => {
        const c = baseColor.clone();
        if (isSlow) c.lerp(new THREE.Color('#4488ff'), 0.4);
        if (isBurn) c.lerp(new THREE.Color('#ff4422'), 0.3);
        if (isStun) c.lerp(new THREE.Color('#ffff44'), 0.5);
        return c;
    }, [baseColor, isSlow, isBurn, isStun]);

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const target = pathToWorld(pathPosition);
        const bobY = BLOCK_H * 0.5 + Math.sin(clock.elapsedTime * 2 + idHash) * 0.04;
        const s = smoothRef.current;
        if (!s.init) {
            s.x = target.x; s.z = target.z; s.angle = target.angle; s.init = true;
        } else {
            const t = 1 - Math.exp(-LERP_SPEED * delta);
            s.x += (target.x - s.x) * t; s.z += (target.z - s.z) * t;
            let ad = target.angle - s.angle;
            if (ad > Math.PI) ad -= Math.PI * 2;
            if (ad < -Math.PI) ad += Math.PI * 2;
            s.angle += ad * t;
        }
        groupRef.current.position.set(s.x, bobY, s.z);
        groupRef.current.rotation.y = s.angle;
    });

    const headColor = useMemo(() => bodyColor.clone().multiplyScalar(1.15), [bodyColor]);
    const feetColor = useMemo(() => bodyColor.clone().multiplyScalar(0.75), [bodyColor]);
    const leftFootRef = useRef<THREE.Mesh>(null);
    const rightFootRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!leftFootRef.current || !rightFootRef.current) return;
        const w = Math.sin(clock.elapsedTime * 6 + idHash * 2);
        leftFootRef.current.position.z = w * 0.04;
        rightFootRef.current.position.z = -w * 0.04;
    });

    return (
        <group ref={groupRef} scale={[scale, scale, scale]}>
            <EnemyHPBar health={health} maxHealth={maxHealth} />
            <mesh position={[0, ENEMY_SIZE * 0.5, 0]}>
                <boxGeometry args={[ENEMY_SIZE, ENEMY_SIZE, ENEMY_SIZE * 0.8]} />
                <meshStandardMaterial color={bodyColor} roughness={0.9} flatShading />
            </mesh>
            <mesh position={[0, ENEMY_SIZE * 1.25, 0]}>
                <boxGeometry args={[ENEMY_SIZE * 1.1, ENEMY_SIZE * 0.8, ENEMY_SIZE * 0.9]} />
                <meshStandardMaterial color={headColor} roughness={0.85} flatShading />
            </mesh>
            <mesh position={[-ENEMY_SIZE * 0.22, ENEMY_SIZE * 1.3, ENEMY_SIZE * 0.42]}>
                <boxGeometry args={[ENEMY_SIZE * 0.15, ENEMY_SIZE * 0.12, ENEMY_SIZE * 0.08]} />
                <meshStandardMaterial color="#111111" />
            </mesh>
            <mesh position={[ENEMY_SIZE * 0.22, ENEMY_SIZE * 1.3, ENEMY_SIZE * 0.42]}>
                <boxGeometry args={[ENEMY_SIZE * 0.15, ENEMY_SIZE * 0.12, ENEMY_SIZE * 0.08]} />
                <meshStandardMaterial color="#111111" />
            </mesh>
            <mesh ref={leftFootRef} position={[-ENEMY_SIZE * 0.2, 0, 0]}>
                <boxGeometry args={[ENEMY_SIZE * 0.35, ENEMY_SIZE * 0.3, ENEMY_SIZE * 0.4]} />
                <meshStandardMaterial color={feetColor} roughness={0.95} flatShading />
            </mesh>
            <mesh ref={rightFootRef} position={[ENEMY_SIZE * 0.2, 0, 0]}>
                <boxGeometry args={[ENEMY_SIZE * 0.35, ENEMY_SIZE * 0.3, ENEMY_SIZE * 0.4]} />
                <meshStandardMaterial color={feetColor} roughness={0.95} flatShading />
            </mesh>
        </group>
    );
}

// ===== Tower Aura =====
function TowerAura({ active, color }: { active: boolean; color: THREE.Color }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const scaleRef = useRef(0);
    useFrame((_, delta) => {
        if (!meshRef.current || !matRef.current) return;
        if (active && scaleRef.current < 1) scaleRef.current = Math.min(1, scaleRef.current + delta * 4);
        else if (!active && scaleRef.current > 0) scaleRef.current = Math.max(0, scaleRef.current - delta * 2);
        const s = scaleRef.current;
        meshRef.current.scale.set(1 + s * 0.8, 1, 1 + s * 0.8);
        matRef.current.opacity = (1 - s) * 0.6;
        meshRef.current.visible = s > 0.01;
    });
    return (
        <mesh ref={meshRef} position={[0, TOWER_SIZE * 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[TOWER_SIZE * 0.8, TOWER_SIZE * 2.2, 8]} />
            <meshBasicMaterial ref={matRef} color={color} transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
    );
}

// ===== Type-specific tower geometry =====
function TowerBody({ type, level }: { type: TowerType; level: number }) {
    const colors = TOWER_TYPE_COLORS[type];

    // Common base
    const base = (
        <mesh position={[0, TOWER_SIZE * 0.35, 0]}>
            <boxGeometry args={[TOWER_SIZE * 1.4, TOWER_SIZE * 0.7, TOWER_SIZE * 1.4]} />
            <meshStandardMaterial color={colors.main} roughness={0.75} flatShading />
        </mesh>
    );

    // Type-specific top
    let top: React.ReactNode;
    switch (type) {
        case 'archer': // Tall narrow
            top = (
                <mesh position={[0, TOWER_SIZE * 1.5, 0]}>
                    <boxGeometry args={[TOWER_SIZE * 0.6, TOWER_SIZE * 1.6, TOWER_SIZE * 0.6]} />
                    <meshStandardMaterial color={colors.accent} roughness={0.65} flatShading />
                </mesh>
            );
            break;
        case 'cannon': // Squat wide
            top = (
                <mesh position={[0, TOWER_SIZE * 1.0, 0]}>
                    <boxGeometry args={[TOWER_SIZE * 1.2, TOWER_SIZE * 0.8, TOWER_SIZE * 1.2]} />
                    <meshStandardMaterial color={colors.accent} roughness={0.6} flatShading />
                </mesh>
            );
            break;
        case 'frost': // Crystal shape
            top = (
                <mesh position={[0, TOWER_SIZE * 1.3, 0]} rotation={[0, Math.PI / 4, 0]}>
                    <boxGeometry args={[TOWER_SIZE * 0.8, TOWER_SIZE * 1.2, TOWER_SIZE * 0.8]} />
                    <meshStandardMaterial color={colors.accent} roughness={0.3} metalness={0.3} flatShading />
                </mesh>
            );
            break;
        case 'lightning': // Tall spire
            top = (
                <mesh position={[0, TOWER_SIZE * 1.7, 0]}>
                    <boxGeometry args={[TOWER_SIZE * 0.5, TOWER_SIZE * 2.0, TOWER_SIZE * 0.5]} />
                    <meshStandardMaterial color={colors.accent} roughness={0.5} metalness={0.2} flatShading />
                </mesh>
            );
            break;
        case 'sniper': // Narrow tall
            top = (
                <mesh position={[0, TOWER_SIZE * 1.6, 0]}>
                    <boxGeometry args={[TOWER_SIZE * 0.4, TOWER_SIZE * 1.8, TOWER_SIZE * 0.4]} />
                    <meshStandardMaterial color={colors.accent} roughness={0.7} flatShading />
                </mesh>
            );
            break;
        case 'flame': // Flickering top
            top = (
                <>
                    <mesh position={[0, TOWER_SIZE * 1.1, 0]}>
                        <boxGeometry args={[TOWER_SIZE * 1.0, TOWER_SIZE * 1.0, TOWER_SIZE * 1.0]} />
                        <meshStandardMaterial color={colors.accent} roughness={0.6} flatShading />
                    </mesh>
                    <mesh position={[0, TOWER_SIZE * 1.8, 0]}>
                        <boxGeometry args={[TOWER_SIZE * 0.5, TOWER_SIZE * 0.5, TOWER_SIZE * 0.5]} />
                        <meshStandardMaterial color="#ff8844" emissive="#ff4422" emissiveIntensity={1.5} roughness={0.2} flatShading />
                    </mesh>
                </>
            );
            break;
        case 'arcane': // Floating orb
            top = (
                <>
                    <mesh position={[0, TOWER_SIZE * 1.2, 0]}>
                        <boxGeometry args={[TOWER_SIZE * 0.8, TOWER_SIZE * 1.0, TOWER_SIZE * 0.8]} />
                        <meshStandardMaterial color={colors.accent} roughness={0.5} flatShading />
                    </mesh>
                    <mesh position={[0, TOWER_SIZE * 2.2, 0]}>
                        <boxGeometry args={[TOWER_SIZE * 0.45, TOWER_SIZE * 0.45, TOWER_SIZE * 0.45]} />
                        <meshStandardMaterial color={colors.glow} emissive={colors.glow} emissiveIntensity={2} roughness={0.2} flatShading />
                    </mesh>
                </>
            );
            break;
    }

    return (
        <>
            {base}
            {top}
            {/* Crown for leveled towers */}
            <mesh position={[0, TOWER_SIZE * 2.8, 0]}>
                <boxGeometry args={[TOWER_SIZE * 1.2, TOWER_SIZE * 0.25, TOWER_SIZE * 1.2]} />
                <meshStandardMaterial color={colors.accent} roughness={0.7} flatShading />
            </mesh>
            {/* Glow tip */}
            <mesh position={[0, TOWER_SIZE * 3.2, 0]}>
                <boxGeometry args={[TOWER_SIZE * 0.35, TOWER_SIZE * 0.4, TOWER_SIZE * 0.35]} />
                <meshStandardMaterial color={colors.glow} emissive={colors.glow} emissiveIntensity={1.5} roughness={0.2} flatShading />
            </mesh>
            <pointLight position={[0, TOWER_SIZE * 3.4, 0]} color={colors.glow} intensity={0.5} distance={1.5} />
            {level > 1 && (
                <mesh position={[0, TOWER_SIZE * 3.0, 0]}>
                    <boxGeometry args={[TOWER_SIZE * 1.0, TOWER_SIZE * 0.12, TOWER_SIZE * 1.0]} />
                    <meshStandardMaterial color="#ffcc44" emissive="#ffcc44" emissiveIntensity={0.3} roughness={0.5} flatShading />
                </mesh>
            )}
            {level > 2 && (
                <mesh position={[0, TOWER_SIZE * 3.15, 0]}>
                    <boxGeometry args={[TOWER_SIZE * 0.8, TOWER_SIZE * 0.08, TOWER_SIZE * 0.8]} />
                    <meshStandardMaterial color="#ff8844" emissive="#ff8844" emissiveIntensity={0.5} roughness={0.5} flatShading />
                </mesh>
            )}
        </>
    );
}

// ===== Tower Mesh =====
function GridTower({ tower, isSelected, lineClearPulse, onClick }: {
    tower: RingTower;
    isSelected: boolean;
    lineClearPulse: boolean;
    onClick: (id: string) => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const colors = TOWER_TYPE_COLORS[tower.type];

    // The slot stores the per-side index; use tower.side + slot local index for positioning
    const localIndex = useMemo(() => {
        // Slots ordered: top(10), bottom(10), left(20), right(20)
        let idx = tower.slotIndex;
        const tb = GALAXY_TOWERS_PER_SIDE_TB;
        const lr = GALAXY_TOWERS_PER_SIDE_LR;
        if (tower.side === 'top') return idx;
        idx -= tb;
        if (tower.side === 'bottom') return idx;
        idx -= tb;
        if (tower.side === 'left') return idx;
        idx -= lr;
        return idx;
    }, [tower.slotIndex, tower.side]);

    const towerPos = useMemo(() => towerToWorld(tower.side, localIndex), [tower.side, localIndex]);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        groupRef.current.position.set(towerPos.x, BLOCK_H * 0.5, towerPos.z);
        groupRef.current.rotation.y = towerPos.angle;
        if (isSelected) {
            groupRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.08);
        } else {
            groupRef.current.scale.setScalar(1);
        }
    });

    const handleClick = useCallback((e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        onClick(tower.id);
    }, [tower.id, onClick]);

    return (
        <group ref={groupRef} onPointerDown={handleClick}>
            <TowerAura active={lineClearPulse} color={colors.glow} />
            <TowerBody type={tower.type} level={tower.level} />
            {isSelected && (
                <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[TOWER_SIZE * 1.5, TOWER_SIZE * 2.0, 16]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
                </mesh>
            )}
        </group>
    );
}

// ===== Empty Tower Slot =====
function TowerSlotMarker({ slot, highlighted, onSlotClick }: {
    slot: TowerSlot;
    highlighted: boolean;
    onSlotClick: (index: number) => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const matRef = useRef<THREE.MeshStandardMaterial>(null);

    // slot.index is the per-side local index
    const slotPos = useMemo(() => towerToWorld(slot.side, slot.index), [slot.side, slot.index]);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        groupRef.current.position.set(slotPos.x, BLOCK_H * 0.5, slotPos.z);
        if (matRef.current) {
            if (highlighted) {
                const pulse = 0.4 + Math.sin(clock.elapsedTime * 4) * 0.2;
                matRef.current.opacity = pulse;
                matRef.current.color = SLOT_COLOR_HIGHLIGHT;
            } else {
                matRef.current.opacity = 0.15;
                matRef.current.color = SLOT_COLOR_EMPTY;
            }
        }
    });

    const globalIndex = useMemo(() => {
        const tb = GALAXY_TOWERS_PER_SIDE_TB;
        const lr = GALAXY_TOWERS_PER_SIDE_LR;
        switch (slot.side) {
            case 'top': return slot.index;
            case 'bottom': return tb + slot.index;
            case 'left': return 2 * tb + slot.index;
            case 'right': return 2 * tb + lr + slot.index;
        }
    }, [slot.side, slot.index]);

    const handleClick = useCallback((e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        onSlotClick(globalIndex);
    }, [globalIndex, onSlotClick]);

    return (
        <group ref={groupRef} onPointerDown={handleClick}>
            <mesh position={[0, SLOT_SIZE * 0.5, 0]}>
                <boxGeometry args={[SLOT_SIZE, SLOT_SIZE * 0.3, SLOT_SIZE]} />
                <meshStandardMaterial ref={matRef} color={SLOT_COLOR_EMPTY} transparent opacity={0.15} roughness={0.8} flatShading />
            </mesh>
        </group>
    );
}

// ===== Projectile =====
function RingProjectile3D({ projectile }: { projectile: RingProjectile }) {
    const groupRef = useRef<THREE.Group>(null);
    const smoothRef = useRef({ x: 0, z: 0, init: false });
    const colors = TOWER_TYPE_COLORS[projectile.towerType];

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const target = pathToWorld(projectile.pathFraction);
        const y = BLOCK_H * 0.5 + TOWER_SIZE * 2;
        const s = smoothRef.current;
        if (!s.init) {
            s.x = target.x; s.z = target.z; s.init = true;
        } else {
            const t = 1 - Math.exp(-LERP_SPEED * 2 * delta);
            s.x += (target.x - s.x) * t;
            s.z += (target.z - s.z) * t;
        }
        groupRef.current.position.set(s.x, y, s.z);
    });

    return (
        <group ref={groupRef}>
            <mesh>
                <boxGeometry args={[0.06, 0.06, 0.06]} />
                <meshStandardMaterial
                    color={colors.glow}
                    emissive={colors.glow}
                    emissiveIntensity={3}
                    roughness={0.2}
                    flatShading
                />
            </mesh>
            <pointLight color={colors.glow} intensity={0.3} distance={0.8} />
        </group>
    );
}

// ===== Gate markers =====
function GateMarkers({ gates }: { gates: GalaxyGate[] }) {
    const positions = useMemo(() => {
        const sides = ['top', 'right', 'bottom', 'left'] as const;
        return sides.map(side => {
            const gate = gates.find(g => g.side === side);
            const ratio = gate ? gate.health / gate.maxHealth : 1;
            const pos = GALAXY_GATE_POSITIONS[side];
            const world = pathToWorld(pos);
            return { ...world, ratio, side };
        });
    }, [gates]);

    return (
        <>
            {positions.map(({ x, z, angle, ratio, side }) => {
                const gateColor = ratio > 0.5 ? '#44ff88' : ratio > 0.25 ? '#ffaa44' : '#ff4444';
                return (
                    <group key={side} position={[x, BLOCK_H * 0.5, z]} rotation={[0, angle, 0]}>
                        <mesh position={[-0.12, 0.2, 0]}>
                            <boxGeometry args={[0.08, 0.4, 0.08]} />
                            <meshStandardMaterial color={gateColor} emissive={gateColor} emissiveIntensity={0.6} roughness={0.4} flatShading />
                        </mesh>
                        <mesh position={[0.12, 0.2, 0]}>
                            <boxGeometry args={[0.08, 0.4, 0.08]} />
                            <meshStandardMaterial color={gateColor} emissive={gateColor} emissiveIntensity={0.6} roughness={0.4} flatShading />
                        </mesh>
                        <mesh position={[0, 0.44, 0]}>
                            <boxGeometry args={[0.32, 0.08, 0.08]} />
                            <meshStandardMaterial color={gateColor} emissive={gateColor} emissiveIntensity={0.8} roughness={0.3} flatShading />
                        </mesh>
                        <pointLight color={gateColor} intensity={0.4} distance={1.5} position={[0, 0.5, 0]} />
                    </group>
                );
            })}
        </>
    );
}

// ===== Main 3D Scene =====
function GalaxyRingScene({
    enemies,
    towers,
    gates,
    projectiles,
    towerSlots,
    selectedTowerType,
    selectedTowerId,
    lineClearPulse,
    onSlotClick,
    onTowerClick,
}: {
    enemies: RingEnemy[];
    towers: RingTower[];
    gates: GalaxyGate[];
    projectiles: RingProjectile[];
    towerSlots: TowerSlot[];
    selectedTowerType: TowerType | null;
    selectedTowerId: string | null;
    lineClearPulse: boolean;
    onSlotClick: (slotIndex: number) => void;
    onTowerClick: (towerId: string) => void;
}) {
    return (
        <>
            <PixelFilterSetup />
            <ambientLight intensity={0.7} color="#ccccff" />
            <directionalLight position={[5, 10, 5]} intensity={0.9} color="#ffffff" />
            <directionalLight position={[-4, 6, -6]} intensity={0.25} color="#8888cc" />

            <group rotation={[0.45, 0, 0]}>
                <GroundPlane />
                <TerrainGrid />
                <TerrainUnderside />
                <PathOutline />
                <TerrainDecorations />
                <GateMarkers gates={gates} />

                {/* Empty tower slots */}
                {towerSlots.filter(s => !s.occupied).map((slot) => (
                    <TowerSlotMarker
                        key={`slot-${slot.side}-${slot.index}`}
                        slot={slot}
                        highlighted={selectedTowerType !== null}
                        onSlotClick={onSlotClick}
                    />
                ))}

                {/* Placed towers */}
                {towers.map(tower => (
                    <GridTower
                        key={tower.id}
                        tower={tower}
                        isSelected={tower.id === selectedTowerId}
                        lineClearPulse={lineClearPulse}
                        onClick={onTowerClick}
                    />
                ))}

                {/* Enemies */}
                {enemies.filter(e => !e.dead).map(enemy => (
                    <PixelEnemy
                        key={enemy.id}
                        pathPosition={enemy.pathFraction}
                        enemyType={enemy.type}
                        id={enemy.id}
                        health={enemy.hp}
                        maxHealth={enemy.maxHp}
                        effects={enemy.effects}
                    />
                ))}

                {/* Projectiles */}
                {projectiles.map(proj => (
                    <RingProjectile3D key={proj.id} projectile={proj} />
                ))}
            </group>
        </>
    );
}

// ===== Exported Canvas wrapper =====
export interface GalaxyRing3DProps {
    enemies: RingEnemy[];
    towers: RingTower[];
    gates: GalaxyGate[];
    projectiles: RingProjectile[];
    towerSlots: TowerSlot[];
    waveNumber: number;
    selectedTowerType: TowerType | null;
    selectedTowerId: string | null;
    lineClearPulse?: boolean;
    onSlotClick: (slotIndex: number) => void;
    onTowerClick: (towerId: string) => void;
}

export function GalaxyRing3D({
    enemies, towers, gates, projectiles, towerSlots,
    selectedTowerType, selectedTowerId,
    lineClearPulse = false, onSlotClick, onTowerClick,
}: GalaxyRing3DProps) {
    const hasInteraction = selectedTowerType !== null || selectedTowerId !== null;
    return (
        <Canvas
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 5, 7], fov: 50, near: 0.1, far: 100 }}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: hasInteraction ? 'auto' : 'none',
                zIndex: 2,
            }}
        >
            <GalaxyRingScene
                enemies={enemies}
                towers={towers}
                gates={gates}
                projectiles={projectiles}
                towerSlots={towerSlots}
                selectedTowerType={selectedTowerType}
                selectedTowerId={selectedTowerId}
                lineClearPulse={lineClearPulse}
                onSlotClick={onSlotClick}
                onTowerClick={onTowerClick}
            />
        </Canvas>
    );
}

// ===== Seeded PRNG (Mulberry32) =====
function mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ===== Simple string hash for stable random =====
function hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}
