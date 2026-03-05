'use client';

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { TowerType, EnemyType, RingEnemy, RingTower, RingProjectile, TowerSlot, GalaxyGate } from '../galaxy-types';
import { TOWER_DEFS, ENEMY_DEFS } from '@/types/tower-defense';
import { createMobMesh, animateMob, disposeMobGroup, disposeSharedMobResources } from '../minecraft-mobs';
import type { MobMeshData } from '../minecraft-mobs';
import type { TDEnemyType } from '../types';
import { createProjectileMesh, animateProjectile, disposeProjectileGroup, disposeSharedProjectileResources } from '@/components/tower-defense/td-projectiles';
import type { ProjectileMeshData } from '@/components/tower-defense/td-projectiles';
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

// ===== Tower-to-Minecraft-Mob mapping (same as TD page) =====
const TOWER_MOB_MAP: Record<TowerType, TDEnemyType> = {
    archer: 'skeleton',
    cannon: 'magma_cube',
    frost: 'slime',
    lightning: 'enderman',
    sniper: 'skeleton',
    flame: 'zombie',
    arcane: 'enderman',
};

// ===== Enemy-to-Animal-Mob mapping (same as TD page) =====
const ENEMY_MOB_MAP: Record<EnemyType, TDEnemyType> = {
    grunt: 'pig',
    fast: 'chicken',
    tank: 'cow',
    flying: 'bee',
    healer: 'cat',
    boss: 'horse',
    swarm: 'rabbit',
    shield: 'wolf',
};

const ENEMY_MOB_SCALE: Record<EnemyType, number> = {
    grunt: 0.28,
    fast: 0.25,
    tank: 0.32,
    flying: 0.28,
    healer: 0.28,
    boss: 0.42,
    swarm: 0.18,
    shield: 0.32,
};

const TOWER_MOB_SCALE = 0.25;

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
const LERP_SPEED = 8;
const SLOT_SIZE = 0.18;

const ORIGIN_X = -(GRID_W - 1) * CELL * 0.5;
const ORIGIN_Z = -(GRID_H - 1) * CELL * 0.5;

// ===== Tower type colors (for platforms and auras) =====
const TOWER_TYPE_COLORS: Record<TowerType, { main: string; accent: string; glow: string }> = {
    archer:    { main: '#4ade80', accent: '#22c55e', glow: '#66ff99' },
    cannon:    { main: '#f97316', accent: '#ea580c', glow: '#ff9944' },
    frost:     { main: '#38bdf8', accent: '#0ea5e9', glow: '#66ddff' },
    lightning: { main: '#a78bfa', accent: '#8b5cf6', glow: '#bb99ff' },
    sniper:    { main: '#f43f5e', accent: '#e11d48', glow: '#ff6688' },
    flame:     { main: '#ef4444', accent: '#dc2626', glow: '#ff6644' },
    arcane:    { main: '#c084fc', accent: '#a855f7', glow: '#dd99ff' },
};

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
function HPNumberSprite({ health, maxHealth, yOffset }: { health: number; maxHealth: number; yOffset: number }) {
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
        <sprite position={[0, yOffset + 0.12, 0]} scale={[0.38, 0.14, 1]}>
            <spriteMaterial map={texture} transparent depthTest={false} />
        </sprite>
    );
}

// ===== Enemy HP Bar =====
function EnemyHPBar({ health, maxHealth, yOffset }: { health: number; maxHealth: number; yOffset: number }) {
    const ratio = Math.max(0, health / maxHealth);
    const barW = 0.32;
    const barH = 0.035;
    const barColor = ratio > 0.5 ? '#44dd66' : ratio > 0.25 ? '#ddaa33' : '#dd3333';
    return (
        <group position={[0, yOffset, 0]}>
            <HPNumberSprite health={health} maxHealth={maxHealth} yOffset={0} />
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

// ===== Mob Enemy (Minecraft animal models) =====
function MobEnemy({ pathPosition, enemyType, id, health, maxHealth, effects, flying }: {
    pathPosition: number;
    enemyType: EnemyType;
    id: string;
    health: number;
    maxHealth: number;
    effects: { type: string }[];
    flying: boolean;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const mobRef = useRef<MobMeshData | null>(null);
    const smoothRef = useRef({ x: 0, z: 0, angle: 0, init: false });
    const prevPosRef = useRef({ x: 0, z: 0 });
    const facingAngleRef = useRef(0);
    const idHash = useMemo(() => hashString(id), [id]);
    const mobType = ENEMY_MOB_MAP[enemyType];
    const mobScale = ENEMY_MOB_SCALE[enemyType];

    const isSlow = effects.some(e => e.type === 'slow');
    const isBurning = effects.some(e => e.type === 'burn');
    const isAmplified = effects.some(e => e.type === 'amplify');
    const isStunned = effects.some(e => e.type === 'stun');

    const mobData = useMemo(() => {
        const data = createMobMesh(mobType);
        data.group.scale.setScalar(mobScale);
        return data;
    }, [mobType, mobScale]);

    useEffect(() => {
        mobRef.current = mobData;
        return () => {
            disposeMobGroup(mobData);
            mobRef.current = null;
        };
    }, [mobData]);

    // Store original material emissive values
    const origEmissives = useRef<Map<THREE.Material, { color: number; intensity: number }>>(new Map());

    useEffect(() => {
        if (mobData.isGltf) return;
        const map = new Map<THREE.Material, { color: number; intensity: number }>();
        mobData.group.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
                const mat = child.material;
                if (mat instanceof THREE.MeshStandardMaterial) {
                    if (!map.has(mat)) {
                        map.set(mat, { color: mat.emissive.getHex(), intensity: mat.emissiveIntensity });
                    }
                }
            }
        });
        origEmissives.current = map;
    }, [mobData]);

    // Apply status effect visuals
    useEffect(() => {
        if (mobData.isGltf) return;
        let meshIndex = 0;
        mobData.group.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
                const mat = child.material;
                if (mat instanceof THREE.MeshStandardMaterial) {
                    if (isBurning) {
                        if (meshIndex % 3 === 0) {
                            mat.emissive.set(0xff4400);
                            mat.emissiveIntensity = 0.7;
                        } else if (meshIndex % 3 === 1) {
                            mat.emissive.set(0xff6600);
                            mat.emissiveIntensity = 0.25;
                        } else {
                            mat.emissive.set(0x331100);
                            mat.emissiveIntensity = 0.15;
                        }
                    } else if (isSlow) {
                        mat.emissive.set(0x38bdf8);
                        mat.emissiveIntensity = 0.3;
                    } else {
                        const orig = origEmissives.current.get(mat);
                        if (orig) {
                            mat.emissive.set(orig.color);
                            mat.emissiveIntensity = orig.intensity;
                        } else {
                            mat.emissive.set(0x000000);
                            mat.emissiveIntensity = 0;
                        }
                    }
                }
                meshIndex++;
            }
        });
    }, [mobData, isBurning, isSlow]);

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const target = pathToWorld(pathPosition);
        const bobY = flying
            ? BLOCK_H * 0.5 + 0.3 + Math.sin(clock.elapsedTime * 2 + idHash) * 0.08
            : BLOCK_H * 0.5 + Math.sin(clock.elapsedTime * 4 + idHash) * 0.02;
        const s = smoothRef.current;
        if (!s.init) {
            s.x = target.x; s.z = target.z; s.angle = target.angle; s.init = true;
            prevPosRef.current = { x: target.x, z: target.z };
        } else {
            const t = 1 - Math.exp(-LERP_SPEED * delta);
            s.x += (target.x - s.x) * t; s.z += (target.z - s.z) * t;
            let ad = target.angle - s.angle;
            if (ad > Math.PI) ad -= Math.PI * 2;
            if (ad < -Math.PI) ad += Math.PI * 2;
            s.angle += ad * t;
        }
        groupRef.current.position.set(s.x, bobY, s.z);

        // Face direction of movement
        const dx = s.x - prevPosRef.current.x;
        const dz = s.z - prevPosRef.current.z;
        if (dx * dx + dz * dz > 0.000001) {
            const targetAngle = Math.atan2(dx, dz) + Math.PI;
            let angleDelta = targetAngle - facingAngleRef.current;
            while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
            while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
            facingAngleRef.current += angleDelta * 0.25;
        }
        prevPosRef.current = { x: s.x, z: s.z };
        groupRef.current.rotation.y = facingAngleRef.current;

        // Animate mob limbs
        if (mobRef.current) {
            animateMob(mobRef.current, clock.elapsedTime, !isStunned);
        }
    });

    const charHeight = mobData.height * mobScale;

    return (
        <group ref={groupRef}>
            <primitive object={mobData.group} />
            <EnemyHPBar health={health} maxHealth={maxHealth} yOffset={charHeight + 0.05} />

            {/* Shield aura (wolf) */}
            {enemyType === 'shield' && (
                <mesh position={[0, charHeight * 0.5, 0]}>
                    <sphereGeometry args={[mobScale * 2.5, 12, 8]} />
                    <meshStandardMaterial color="#60a5fa" transparent opacity={0.15} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Healer aura (cat) */}
            {enemyType === 'healer' && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <ringGeometry args={[0.15, 0.22, 16]} />
                    <meshBasicMaterial color="#86efac" transparent opacity={0.15} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Amplify marker */}
            {isAmplified && (
                <group position={[0, charHeight * 0.5, 0]}>
                    <mesh>
                        <sphereGeometry args={[mobScale * 2, 8, 8]} />
                        <meshStandardMaterial color="#c084fc" emissive="#9333ea" emissiveIntensity={0.6} transparent opacity={0.25} wireframe />
                    </mesh>
                </group>
            )}

            {/* Stun marker */}
            {isStunned && (
                <mesh position={[0, charHeight + 0.1, 0]}>
                    <octahedronGeometry args={[0.06, 0]} />
                    <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
                </mesh>
            )}
        </group>
    );
}

// ===== Tower Aura Effects =====

// Magma tower (cannon) — pulsing orange aura ring
function MagmaAuraRing({ radius }: { radius: number }) {
    const pulseRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (pulseRef.current) {
            const pulse = 0.85 + Math.sin(t * 3) * 0.15;
            pulseRef.current.scale.set(pulse, pulse, 1);
            const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.1 + Math.sin(t * 3) * 0.05;
        }
        if (ringRef.current) {
            ringRef.current.rotation.z = t * 0.5;
        }
    });

    return (
        <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh ref={pulseRef}>
                <circleGeometry args={[radius, 24]} />
                <meshBasicMaterial color="#ff6600" transparent opacity={0.1} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={ringRef}>
                <ringGeometry args={[radius * 0.5, radius * 0.55, 24]} />
                <meshBasicMaterial color="#ff8800" transparent opacity={0.15} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
                <ringGeometry args={[radius - 0.03, radius, 24]} />
                <meshBasicMaterial color="#f97316" transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// Frost tower — radiating slow AoE ring
function FrostAoERing({ radius }: { radius: number }) {
    const pulseRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (pulseRef.current) {
            const pulse = 0.9 + Math.sin(t * 2) * 0.1;
            pulseRef.current.scale.set(pulse, pulse, 1);
            const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.08 + Math.sin(t * 2) * 0.04;
        }
        if (ringRef.current) {
            ringRef.current.rotation.z = t * 0.3;
        }
    });

    return (
        <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh ref={pulseRef}>
                <circleGeometry args={[radius, 24]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={ringRef}>
                <ringGeometry args={[radius * 0.5, radius * 0.55, 24]} />
                <meshBasicMaterial color="#7dd3fc" transparent opacity={0.12} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
                <ringGeometry args={[radius - 0.03, radius, 24]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// Arcane tower — magical aura glow
function ArcaneAuraGlow({ height }: { height: number }) {
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (ringRef.current) {
            ringRef.current.rotation.z = state.clock.elapsedTime * 0.8;
            const mat = ringRef.current.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2.5) * 0.08;
        }
    });

    return (
        <group position={[0, height * 0.5 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh ref={ringRef}>
                <ringGeometry args={[0.12, 0.18, 6]} />
                <meshBasicMaterial color="#c084fc" transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
                <circleGeometry args={[0.1, 6]} />
                <meshBasicMaterial color="#a855f7" transparent opacity={0.1} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// ===== Line-clear pulse aura =====
function TowerAura({ active, color }: { active: boolean; color: string }) {
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
        <mesh ref={meshRef} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[0.12, 0.3, 8]} />
            <meshBasicMaterial ref={matRef} color={color} transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
    );
}

// ===== Tower Mesh with Minecraft mob model =====
function MobTower({ tower, isSelected, lineClearPulse, onClick }: {
    tower: RingTower;
    isSelected: boolean;
    lineClearPulse: boolean;
    onClick: (id: string) => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const mobWrapperRef = useRef<THREE.Group>(null);
    const mobRef = useRef<MobMeshData | null>(null);
    const facingAngleRef = useRef(0);
    const colors = TOWER_TYPE_COLORS[tower.type];
    const def = TOWER_DEFS[tower.type];
    const mobType = TOWER_MOB_MAP[tower.type];
    const isStackable = tower.type === 'cannon' || tower.type === 'frost';

    const localIndex = useMemo(() => {
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

    // Create mob mesh (stackable mobs grow with level)
    const mobData = useMemo(() => {
        const data = isStackable
            ? createMobMesh(mobType, { segments: tower.level })
            : createMobMesh(mobType);
        data.group.scale.setScalar(TOWER_MOB_SCALE);
        return data;
    }, [mobType, isStackable, tower.level]);

    useEffect(() => {
        mobRef.current = mobData;
        return () => {
            disposeMobGroup(mobData);
            mobRef.current = null;
        };
    }, [mobData]);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        groupRef.current.position.set(towerPos.x, BLOCK_H * 0.5, towerPos.z);

        if (isSelected) {
            groupRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.08);
        } else {
            groupRef.current.scale.setScalar(1);
        }

        // Face toward target (use path angle as base, target override when attacking)
        if (mobWrapperRef.current && tower.targetId) {
            // When targeting, rotate mob to face the path direction
            const targetAngle = towerPos.angle + Math.PI;
            let delta = targetAngle - facingAngleRef.current;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            facingAngleRef.current += delta * 0.15;
            mobWrapperRef.current.rotation.y = facingAngleRef.current;
        }

        // Idle animation (slime types don't bounce on the tower stage)
        if (mobRef.current) {
            const slimeTower = tower.type === 'cannon' || tower.type === 'frost';
            animateMob(mobRef.current, clock.elapsedTime, !slimeTower);
        }
    });

    const handleClick = useCallback((e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        onClick(tower.id);
    }, [tower.id, onClick]);

    const charHeight = mobData.height * TOWER_MOB_SCALE;
    // Convert ring-engine range (path-fraction) to approximate 3D radius
    const towerRange = (def.range / 72) * GALAXY_PATH_LENGTH * CELL * 0.15;

    return (
        <group ref={groupRef} onPointerDown={handleClick}>
            <TowerAura active={lineClearPulse} color={colors.glow} />

            {/* Platform base */}
            <mesh position={[0, 0.03, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.19, 0.06, 8]} />
                <meshStandardMaterial color={colors.main} roughness={0.35} metalness={0.35} />
            </mesh>
            {/* Platform accent ring */}
            <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.16, 0.21, 12]} />
                <meshStandardMaterial
                    color={colors.accent}
                    emissive={colors.accent}
                    emissiveIntensity={0.6}
                    transparent opacity={0.5}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Minecraft mob model */}
            <group ref={mobWrapperRef} position={[0, 0.06, 0]}>
                <primitive object={mobData.group} />
            </group>

            {/* Level indicators */}
            {tower.level > 1 && (
                <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.14, 0.17, 8]} />
                    <meshStandardMaterial color="#ffcc44" emissive="#ffcc44" emissiveIntensity={0.3} transparent opacity={0.7} side={THREE.DoubleSide} />
                </mesh>
            )}
            {tower.level > 2 && (
                <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.11, 0.14, 8]} />
                    <meshStandardMaterial color="#ff8844" emissive="#ff8844" emissiveIntensity={0.5} transparent opacity={0.7} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Type-specific auras */}
            {tower.type === 'cannon' && <MagmaAuraRing radius={towerRange} />}
            {tower.type === 'frost' && <FrostAoERing radius={towerRange} />}
            {tower.type === 'arcane' && <ArcaneAuraGlow height={charHeight} />}
            {tower.type === 'lightning' && (
                <pointLight position={[0, charHeight * 0.5 + 0.06, 0]} color="#a78bfa" intensity={1.5} distance={1} decay={2} />
            )}
            {tower.type === 'flame' && (
                <pointLight position={[0, charHeight * 0.3 + 0.06, 0]} color="#ef4444" intensity={1.0} distance={0.8} decay={2} />
            )}

            {/* Selection ring */}
            {isSelected && (
                <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.2, 0.25, 16]} />
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

// ===== Projectile (Minecraft-themed) =====
function RingProjectile3D({ projectile }: { projectile: RingProjectile }) {
    const groupRef = useRef<THREE.Group>(null);
    const projRef = useRef<ProjectileMeshData | null>(null);
    const smoothRef = useRef({ x: 0, z: 0, init: false });
    const prevPos = useRef(new THREE.Vector3());
    const velocity = useRef(new THREE.Vector3());

    const projData = useMemo(() => {
        return createProjectileMesh(projectile.towerType);
    }, [projectile.towerType]);

    useEffect(() => {
        projRef.current = projData;
        return () => {
            disposeProjectileGroup(projData);
            projRef.current = null;
        };
    }, [projData]);

    useFrame((state, delta) => {
        if (!groupRef.current || !projRef.current) return;
        const target = pathToWorld(projectile.pathFraction);
        const y = BLOCK_H * 0.5 + 0.25;
        const s = smoothRef.current;
        if (!s.init) {
            s.x = target.x; s.z = target.z; s.init = true;
            prevPos.current.set(target.x, y, target.z);
        } else {
            const t = 1 - Math.exp(-LERP_SPEED * 2 * delta);
            s.x += (target.x - s.x) * t;
            s.z += (target.z - s.z) * t;
        }
        groupRef.current.position.set(s.x, y, s.z);

        // Compute velocity for arrow orientation
        velocity.current.set(s.x - prevPos.current.x, 0, s.z - prevPos.current.z);
        if (velocity.current.lengthSq() > 0.0001) {
            velocity.current.normalize();
        }
        prevPos.current.set(s.x, y, s.z);

        animateProjectile(projRef.current, state.clock.elapsedTime, velocity.current);
    });

    return (
        <group ref={groupRef}>
            <primitive object={projData.group} />
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

// ===== Cleanup shared resources on unmount =====
function SharedResourceCleanup() {
    useEffect(() => {
        return () => {
            disposeSharedMobResources();
            disposeSharedProjectileResources();
        };
    }, []);
    return null;
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
            <SharedResourceCleanup />
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

                {/* Placed towers (Minecraft mob models) */}
                {towers.map(tower => (
                    <MobTower
                        key={tower.id}
                        tower={tower}
                        isSelected={tower.id === selectedTowerId}
                        lineClearPulse={lineClearPulse}
                        onClick={onTowerClick}
                    />
                ))}

                {/* Enemies (Minecraft animal mob models) */}
                {enemies.filter(e => !e.dead).map(enemy => (
                    <MobEnemy
                        key={enemy.id}
                        pathPosition={enemy.pathFraction}
                        enemyType={enemy.type}
                        id={enemy.id}
                        health={enemy.hp}
                        maxHealth={enemy.maxHp}
                        effects={enemy.effects}
                        flying={enemy.flying}
                    />
                ))}

                {/* Projectiles (Minecraft-themed: arrows, cobwebs, TNT, etc.) */}
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
