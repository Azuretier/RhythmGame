'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GalaxyRingEnemy, GalaxyTower, GalaxyGate } from '../galaxy-types';
import {
    GALAXY_SIDE_BOUNDARIES,
    GALAXY_TOWERS_PER_SIDE_TB,
    GALAXY_TOWERS_PER_SIDE_LR,
} from '../galaxy-constants';

// ===== Constants =====
const RING_RADIUS = 5.5;          // Distance from center of the ring path
const RING_TILT = 0.3;            // Radians tilt (like Saturn's rings)
const TERRAIN_BLOCK_SIZE = 0.28;  // Size of each terrain voxel
const TERRAIN_SEGMENTS = 80;      // Number of terrain blocks around the ring
const TERRAIN_WIDTH = 3;          // Blocks wide (radial direction)
const ENEMY_SIZE = 0.3;
const TOWER_SIZE = 0.25;

// ===== Color palettes =====
const ENEMY_COLORS = [
    new THREE.Color('#88cc88'), // Creeper green
    new THREE.Color('#7799bb'), // Cool blue
    new THREE.Color('#bb9977'), // Warm brown
    new THREE.Color('#aa88cc'), // Soft purple
    new THREE.Color('#ccaa77'), // Sandy
];

const TERRAIN_COLORS = [
    new THREE.Color('#4a3a6a'), // Deep purple stone
    new THREE.Color('#5a4a7a'), // Medium purple
    new THREE.Color('#3a2a5a'), // Dark purple
    new THREE.Color('#6a5a8a'), // Light purple stone
    new THREE.Color('#4a4a6a'), // Blue-purple
];

const TERRAIN_GRASS_COLORS = [
    new THREE.Color('#3a6a4a'), // Dark grass
    new THREE.Color('#4a7a5a'), // Medium grass
    new THREE.Color('#3a5a4a'), // Forest
];

const TOWER_COLOR_IDLE = new THREE.Color('#6655aa');
const TOWER_COLOR_CHARGED = new THREE.Color('#aa88ff');
const TOWER_GLOW_COLOR = new THREE.Color('#00ccff');

// ===== Path position → 3D world position on the ring =====
// Returns position on a tilted circle (no extra Y-tilt computation needed
// since the entire ring group is tilted via rotation)
function pathTo3DFlat(pathPos: number): [number, number, number] {
    const angle = pathPos * Math.PI * 2;
    const x = Math.cos(angle) * RING_RADIUS;
    const z = Math.sin(angle) * RING_RADIUS;
    return [x, 0, z];
}

// ===== Get tower path position =====
function getTowerPathPos(side: string, index: number): number {
    const bounds = GALAXY_SIDE_BOUNDARIES[side as keyof typeof GALAXY_SIDE_BOUNDARIES];
    const count = (side === 'top' || side === 'bottom')
        ? GALAXY_TOWERS_PER_SIDE_TB
        : GALAXY_TOWERS_PER_SIDE_LR;
    const sideLen = bounds.end - bounds.start;
    return bounds.start + (index + 0.5) * (sideLen / count);
}

// ===== Voxel Terrain Ring =====
// Uses InstancedMesh for performance — renders ~240 terrain blocks around the ring
function TerrainRing() {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const { count, matrices, colors } = useMemo(() => {
        const totalBlocks = TERRAIN_SEGMENTS * TERRAIN_WIDTH;
        const mat = new Float32Array(totalBlocks * 16);
        const col = new Float32Array(totalBlocks * 3);
        const dummy = new THREE.Matrix4();
        const rng = mulberry32(42); // Seeded RNG for consistent terrain

        let idx = 0;
        for (let seg = 0; seg < TERRAIN_SEGMENTS; seg++) {
            const t = seg / TERRAIN_SEGMENTS;
            const angle = t * Math.PI * 2;

            for (let w = 0; w < TERRAIN_WIDTH; w++) {
                const radialOffset = (w - (TERRAIN_WIDTH - 1) / 2) * TERRAIN_BLOCK_SIZE;
                const r = RING_RADIUS + radialOffset;
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;

                // Slight height variation for natural look
                const heightVar = (rng() - 0.5) * 0.06;
                const y = heightVar;

                dummy.makeTranslation(x, y, z);
                // Rotate block to face center
                const blockRotation = new THREE.Matrix4().makeRotationY(-angle + Math.PI / 2);
                dummy.multiply(blockRotation);
                dummy.toArray(mat, idx * 16);

                // Color: outer row is grass, inner rows are stone
                let color: THREE.Color;
                if (w === 0) {
                    // Outer edge — grass
                    color = TERRAIN_GRASS_COLORS[Math.floor(rng() * TERRAIN_GRASS_COLORS.length)];
                } else {
                    // Inner — stone
                    color = TERRAIN_COLORS[Math.floor(rng() * TERRAIN_COLORS.length)];
                }

                col[idx * 3] = color.r;
                col[idx * 3 + 1] = color.g;
                col[idx * 3 + 2] = color.b;

                idx++;
            }
        }

        return { count: totalBlocks, matrices: mat, colors: col };
    }, []);

    // Apply instance matrices and colors on mount
    React.useEffect(() => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;
        const dummy = new THREE.Matrix4();

        for (let i = 0; i < count; i++) {
            dummy.fromArray(matrices, i * 16);
            mesh.setMatrixAt(i, dummy);
        }

        // Apply per-instance colors
        const colorAttr = new THREE.InstancedBufferAttribute(colors, 3);
        mesh.instanceColor = colorAttr;

        mesh.instanceMatrix.needsUpdate = true;
    }, [count, matrices, colors]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, count]}
            castShadow={false}
            receiveShadow={false}
        >
            <boxGeometry args={[TERRAIN_BLOCK_SIZE * 0.95, TERRAIN_BLOCK_SIZE * 0.6, TERRAIN_BLOCK_SIZE * 0.95]} />
            <meshStandardMaterial
                vertexColors
                roughness={0.85}
                metalness={0.05}
                flatShading
            />
        </instancedMesh>
    );
}

// ===== Terrain underside — darker layer beneath the path for depth =====
function TerrainUnderside() {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const { count, matrices } = useMemo(() => {
        const totalBlocks = TERRAIN_SEGMENTS;
        const mat = new Float32Array(totalBlocks * 16);
        const dummy = new THREE.Matrix4();

        for (let seg = 0; seg < TERRAIN_SEGMENTS; seg++) {
            const t = seg / TERRAIN_SEGMENTS;
            const angle = t * Math.PI * 2;
            const x = Math.cos(angle) * RING_RADIUS;
            const z = Math.sin(angle) * RING_RADIUS;

            dummy.makeTranslation(x, -TERRAIN_BLOCK_SIZE * 0.5, z);
            const blockRotation = new THREE.Matrix4().makeRotationY(-angle + Math.PI / 2);
            dummy.multiply(blockRotation);
            dummy.toArray(mat, seg * 16);
        }

        return { count: totalBlocks, matrices: mat };
    }, []);

    React.useEffect(() => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;
        const dummy = new THREE.Matrix4();

        for (let i = 0; i < count; i++) {
            dummy.fromArray(matrices, i * 16);
            mesh.setMatrixAt(i, dummy);
        }
        mesh.instanceMatrix.needsUpdate = true;
    }, [count, matrices]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, count]}
        >
            <boxGeometry args={[
                TERRAIN_BLOCK_SIZE * TERRAIN_WIDTH * 0.95,
                TERRAIN_BLOCK_SIZE * 0.4,
                TERRAIN_BLOCK_SIZE * 0.95,
            ]} />
            <meshStandardMaterial
                color="#2a1a4a"
                roughness={0.95}
                flatShading
            />
        </instancedMesh>
    );
}

// ===== Ring track line — thin torus as the outer edge path marker =====
function RingPathLine() {
    return (
        <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[RING_RADIUS + TERRAIN_BLOCK_SIZE * 1.2, 0.02, 6, 96]} />
            <meshStandardMaterial
                color="#9977ee"
                emissive="#7755cc"
                emissiveIntensity={0.4}
                transparent
                opacity={0.6}
                roughness={0.5}
            />
        </mesh>
    );
}

// ===== Pixelated Enemy Mesh =====
function PixelEnemy({ pathPosition, index }: {
    pathPosition: number;
    index: number;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const color = useMemo(() => ENEMY_COLORS[index % ENEMY_COLORS.length], [index]);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const [x, , z] = pathTo3DFlat(pathPosition);
        // Walk on outer edge of the ring terrain
        const angle = pathPosition * Math.PI * 2;
        const outerR = RING_RADIUS + TERRAIN_BLOCK_SIZE * 0.8;
        const ox = Math.cos(angle) * outerR;
        const oz = Math.sin(angle) * outerR;
        const bobY = TERRAIN_BLOCK_SIZE * 0.3 + Math.sin(clock.elapsedTime * 2 + index) * 0.06;
        groupRef.current.position.set(ox, bobY, oz);
        groupRef.current.rotation.y = -angle + Math.PI / 2;
    });

    const bodyColor = useMemo(() => color.clone(), [color]);
    const headColor = useMemo(() => color.clone().multiplyScalar(1.15), [color]);
    const feetColor = useMemo(() => color.clone().multiplyScalar(0.75), [color]);

    return (
        <group ref={groupRef}>
            {/* Body */}
            <mesh position={[0, ENEMY_SIZE * 0.5, 0]}>
                <boxGeometry args={[ENEMY_SIZE, ENEMY_SIZE, ENEMY_SIZE * 0.8]} />
                <meshStandardMaterial color={bodyColor} roughness={0.9} flatShading />
            </mesh>
            {/* Head */}
            <mesh position={[0, ENEMY_SIZE * 1.25, 0]}>
                <boxGeometry args={[ENEMY_SIZE * 1.1, ENEMY_SIZE * 0.8, ENEMY_SIZE * 0.9]} />
                <meshStandardMaterial color={headColor} roughness={0.85} flatShading />
            </mesh>
            {/* Eyes */}
            <mesh position={[-ENEMY_SIZE * 0.22, ENEMY_SIZE * 1.3, ENEMY_SIZE * 0.42]}>
                <boxGeometry args={[ENEMY_SIZE * 0.15, ENEMY_SIZE * 0.12, ENEMY_SIZE * 0.08]} />
                <meshStandardMaterial color="#111111" />
            </mesh>
            <mesh position={[ENEMY_SIZE * 0.22, ENEMY_SIZE * 1.3, ENEMY_SIZE * 0.42]}>
                <boxGeometry args={[ENEMY_SIZE * 0.15, ENEMY_SIZE * 0.12, ENEMY_SIZE * 0.08]} />
                <meshStandardMaterial color="#111111" />
            </mesh>
            {/* Feet */}
            <mesh position={[-ENEMY_SIZE * 0.2, 0, 0]}>
                <boxGeometry args={[ENEMY_SIZE * 0.35, ENEMY_SIZE * 0.3, ENEMY_SIZE * 0.4]} />
                <meshStandardMaterial color={feetColor} roughness={0.95} flatShading />
            </mesh>
            <mesh position={[ENEMY_SIZE * 0.2, 0, 0]}>
                <boxGeometry args={[ENEMY_SIZE * 0.35, ENEMY_SIZE * 0.3, ENEMY_SIZE * 0.4]} />
                <meshStandardMaterial color={feetColor} roughness={0.95} flatShading />
            </mesh>
        </group>
    );
}

// ===== Tower Mesh =====
function RingTower({ side, index, charge, maxCharge, level }: {
    side: string;
    index: number;
    charge: number;
    maxCharge: number;
    level: number;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const pathPos = useMemo(() => getTowerPathPos(side, index), [side, index]);
    const isCharged = charge > 0;
    const chargeRatio = charge / maxCharge;

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        // Place tower on inner edge of the ring
        const angle = pathPos * Math.PI * 2;
        const innerR = RING_RADIUS - TERRAIN_BLOCK_SIZE * 0.5;
        const x = Math.cos(angle) * innerR;
        const z = Math.sin(angle) * innerR;
        groupRef.current.position.set(x, TERRAIN_BLOCK_SIZE * 0.3, z);
        groupRef.current.rotation.y = -angle;
        if (isCharged) {
            const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.06;
            groupRef.current.scale.setScalar(pulse);
        } else {
            groupRef.current.scale.setScalar(1);
        }
    });

    const baseColor = useMemo(() =>
        isCharged ? TOWER_COLOR_CHARGED : TOWER_COLOR_IDLE, [isCharged]);

    return (
        <group ref={groupRef}>
            {/* Tower base */}
            <mesh position={[0, TOWER_SIZE * 0.4, 0]}>
                <boxGeometry args={[TOWER_SIZE * 1.5, TOWER_SIZE * 0.8, TOWER_SIZE * 1.5]} />
                <meshStandardMaterial color={baseColor} roughness={0.75} flatShading />
            </mesh>
            {/* Tower body */}
            <mesh position={[0, TOWER_SIZE * 1.4, 0]}>
                <boxGeometry args={[TOWER_SIZE, TOWER_SIZE * 1.4, TOWER_SIZE]} />
                <meshStandardMaterial color={baseColor} roughness={0.65} flatShading />
            </mesh>
            {/* Tower top */}
            <mesh position={[0, TOWER_SIZE * 2.4, 0]}>
                <boxGeometry args={[TOWER_SIZE * 1.3, TOWER_SIZE * 0.3, TOWER_SIZE * 1.3]} />
                <meshStandardMaterial
                    color={isCharged ? '#bb99ff' : '#776699'}
                    roughness={0.7}
                    flatShading
                />
            </mesh>
            {/* Charge crystal */}
            {isCharged && (
                <>
                    <mesh position={[0, TOWER_SIZE * 3, 0]}>
                        <boxGeometry args={[TOWER_SIZE * 0.4, TOWER_SIZE * 0.6, TOWER_SIZE * 0.4]} />
                        <meshStandardMaterial
                            color={TOWER_GLOW_COLOR}
                            emissive={TOWER_GLOW_COLOR}
                            emissiveIntensity={chargeRatio * 2.5}
                            roughness={0.2}
                            flatShading
                        />
                    </mesh>
                    <pointLight
                        position={[0, TOWER_SIZE * 3.2, 0]}
                        color={TOWER_GLOW_COLOR}
                        intensity={chargeRatio * 0.8}
                        distance={2}
                    />
                </>
            )}
            {/* Level indicator */}
            {level > 1 && (
                <mesh position={[0, TOWER_SIZE * 2.7, 0]}>
                    <boxGeometry args={[TOWER_SIZE * 1.1, TOWER_SIZE * 0.15, TOWER_SIZE * 1.1]} />
                    <meshStandardMaterial color="#ffcc44" emissive="#ffcc44" emissiveIntensity={0.3} roughness={0.5} flatShading />
                </mesh>
            )}
        </group>
    );
}

// ===== Gate markers — larger glowing structures at cardinal points =====
function GateMarkers({ gates }: { gates: GalaxyGate[] }) {
    const gatePositions = useMemo(() => {
        const sides = ['top', 'right', 'bottom', 'left'] as const;
        return sides.map((side, i) => {
            const gate = gates.find(g => g.side === side);
            const pathPos = (i + 0.5) / 4;
            const angle = pathPos * Math.PI * 2;
            const x = Math.cos(angle) * RING_RADIUS;
            const z = Math.sin(angle) * RING_RADIUS;
            const ratio = gate ? gate.health / gate.maxHealth : 1;
            return { x, z, ratio, side };
        });
    }, [gates]);

    return (
        <>
            {gatePositions.map(({ x, z, ratio, side }) => {
                const gateColor = ratio > 0.5 ? '#44ff88' : ratio > 0.25 ? '#ffaa44' : '#ff4444';
                return (
                    <group key={side} position={[x, 0, z]}>
                        {/* Gate pillar left */}
                        <mesh position={[-0.15, 0.25, 0]}>
                            <boxGeometry args={[0.12, 0.5, 0.12]} />
                            <meshStandardMaterial
                                color={gateColor}
                                emissive={gateColor}
                                emissiveIntensity={0.6}
                                roughness={0.4}
                                flatShading
                            />
                        </mesh>
                        {/* Gate pillar right */}
                        <mesh position={[0.15, 0.25, 0]}>
                            <boxGeometry args={[0.12, 0.5, 0.12]} />
                            <meshStandardMaterial
                                color={gateColor}
                                emissive={gateColor}
                                emissiveIntensity={0.6}
                                roughness={0.4}
                                flatShading
                            />
                        </mesh>
                        {/* Gate arch */}
                        <mesh position={[0, 0.55, 0]}>
                            <boxGeometry args={[0.42, 0.1, 0.12]} />
                            <meshStandardMaterial
                                color={gateColor}
                                emissive={gateColor}
                                emissiveIntensity={0.8}
                                roughness={0.3}
                                flatShading
                            />
                        </mesh>
                        <pointLight color={gateColor} intensity={0.5} distance={2} position={[0, 0.6, 0]} />
                    </group>
                );
            })}
        </>
    );
}

// ===== Decorative elements — small rocks/crystals scattered on the ring =====
function TerrainDecorations() {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const { count, matrices, colors } = useMemo(() => {
        const rng = mulberry32(137);
        const decoCount = 40;
        const mat = new Float32Array(decoCount * 16);
        const col = new Float32Array(decoCount * 3);
        const dummy = new THREE.Matrix4();

        for (let i = 0; i < decoCount; i++) {
            const t = rng();
            const angle = t * Math.PI * 2;
            const radialVar = (rng() - 0.5) * TERRAIN_BLOCK_SIZE * TERRAIN_WIDTH * 0.7;
            const r = RING_RADIUS + radialVar;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const scale = 0.04 + rng() * 0.08;
            const heightScale = 0.5 + rng() * 1.5;

            dummy.identity();
            dummy.makeTranslation(x, TERRAIN_BLOCK_SIZE * 0.3 + scale * heightScale * 0.5, z);
            const scaleM = new THREE.Matrix4().makeScale(scale, scale * heightScale, scale);
            dummy.multiply(scaleM);
            dummy.toArray(mat, i * 16);

            // Crystal colors
            const crystalColors = [
                new THREE.Color('#8866cc'),
                new THREE.Color('#66aacc'),
                new THREE.Color('#aa77dd'),
                new THREE.Color('#5588aa'),
            ];
            const c = crystalColors[Math.floor(rng() * crystalColors.length)];
            col[i * 3] = c.r;
            col[i * 3 + 1] = c.g;
            col[i * 3 + 2] = c.b;
        }

        return { count: decoCount, matrices: mat, colors: col };
    }, []);

    React.useEffect(() => {
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
            <meshStandardMaterial
                vertexColors
                roughness={0.4}
                metalness={0.2}
                flatShading
            />
        </instancedMesh>
    );
}

// ===== Slow ring rotation =====
function RingRotation({ children }: { children: React.ReactNode }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        groupRef.current.rotation.y = clock.elapsedTime * 0.015;
    });

    return (
        <group ref={groupRef}>
            {children}
        </group>
    );
}

// ===== Main 3D Scene =====
function GalaxyRingScene({
    enemies,
    towers,
    gates,
}: {
    enemies: GalaxyRingEnemy[];
    towers: GalaxyTower[];
    gates: GalaxyGate[];
    waveNumber: number;
}) {
    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.7} color="#ccccff" />
            <directionalLight position={[5, 10, 5]} intensity={0.9} color="#ffffff" />
            <directionalLight position={[-4, 6, -6]} intensity={0.25} color="#8888cc" />

            {/* Everything tilted together as one ring plane */}
            <group rotation={[RING_TILT, 0, 0]}>
                {/* Static terrain ring */}
                <TerrainRing />
                <TerrainUnderside />
                <RingPathLine />
                <TerrainDecorations />
                <GateMarkers gates={gates} />

                {/* Slowly rotating enemies + towers */}
                <RingRotation>
                    {enemies.filter(e => e.alive).map((enemy) => (
                        <PixelEnemy
                            key={enemy.id}
                            pathPosition={enemy.pathPosition}
                            index={enemy.id}
                        />
                    ))}

                    {towers.map(tower => (
                        <RingTower
                            key={tower.id}
                            side={tower.side}
                            index={tower.index}
                            charge={tower.charge}
                            maxCharge={tower.maxCharge}
                            level={tower.level}
                        />
                    ))}
                </RingRotation>
            </group>
        </>
    );
}

// ===== Exported Canvas wrapper =====
export interface GalaxyRing3DProps {
    enemies: GalaxyRingEnemy[];
    towers: GalaxyTower[];
    gates: GalaxyGate[];
    waveNumber: number;
}

export function GalaxyRing3D({ enemies, towers, gates, waveNumber }: GalaxyRing3DProps) {
    // Render with position: fixed to fill viewport.
    // No portal needed — this renders inside .game (z-index: 1 stacking context),
    // so z-index: 2 puts the ring above VoxelWorldBackground (z-index: 0)
    // but below the board (.boardCenter z-index: 10) and game UI overlays.
    return (
        <Canvas
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 5, 8], fov: 50, near: 0.1, far: 100 }}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 2,
            }}
        >
            <GalaxyRingScene
                enemies={enemies}
                towers={towers}
                gates={gates}
                waveNumber={waveNumber}
            />
        </Canvas>
    );
}

// ===== Seeded PRNG (Mulberry32) for deterministic terrain =====
function mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
