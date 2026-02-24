'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GalaxyRingEnemy, GalaxyTower, GalaxyGate } from '../galaxy-types';
import {
    GALAXY_SIDE_BOUNDARIES,
    GALAXY_TOWERS_PER_SIDE_TB,
    GALAXY_TOWERS_PER_SIDE_LR,
} from '../galaxy-constants';

// ===== Constants =====
const RING_RADIUS = 5.5;
const RING_TILT = 0.3;
const TERRAIN_BLOCK_SIZE = 0.28;
const TERRAIN_SEGMENTS = 80;
const TERRAIN_WIDTH = 3;
const ENEMY_SIZE = 0.3;
const TOWER_SIZE = 0.25;
const LERP_SPEED = 8; // Smooth movement interpolation speed

// ===== Color palettes =====
const ENEMY_COLORS = [
    new THREE.Color('#88cc88'),
    new THREE.Color('#7799bb'),
    new THREE.Color('#bb9977'),
    new THREE.Color('#aa88cc'),
    new THREE.Color('#ccaa77'),
];

const TERRAIN_COLORS = [
    new THREE.Color('#4a3a6a'),
    new THREE.Color('#5a4a7a'),
    new THREE.Color('#3a2a5a'),
    new THREE.Color('#6a5a8a'),
    new THREE.Color('#4a4a6a'),
];

const TERRAIN_GRASS_COLORS = [
    new THREE.Color('#3a6a4a'),
    new THREE.Color('#4a7a5a'),
    new THREE.Color('#3a5a4a'),
];

const TOWER_COLOR_IDLE = new THREE.Color('#6655aa');
const TOWER_COLOR_CHARGED = new THREE.Color('#aa88ff');
const TOWER_GLOW_COLOR = new THREE.Color('#00ccff');

// ===== Pixelized texture helper =====
// Creates a small canvas texture with NearestFilter for pixel-art look
function createPixelTexture(width: number, height: number, fillFn: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    fillFn(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
}

// ===== Set NearestFilter on all scene textures for pixelized look =====
function PixelFilterSetup() {
    const { gl } = useThree();
    useEffect(() => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
    }, [gl]);
    return null;
}

// ===== Path position → 3D flat ring position =====
function pathTo3DFlat(pathPos: number): [number, number, number] {
    const angle = pathPos * Math.PI * 2;
    return [Math.cos(angle) * RING_RADIUS, 0, Math.sin(angle) * RING_RADIUS];
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

// ===== Voxel Terrain Ring (static, no rotation) =====
function TerrainRing() {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const { count, matrices, colors } = useMemo(() => {
        const totalBlocks = TERRAIN_SEGMENTS * TERRAIN_WIDTH;
        const mat = new Float32Array(totalBlocks * 16);
        const col = new Float32Array(totalBlocks * 3);
        const dummy = new THREE.Matrix4();
        const rng = mulberry32(42);

        let idx = 0;
        for (let seg = 0; seg < TERRAIN_SEGMENTS; seg++) {
            const t = seg / TERRAIN_SEGMENTS;
            const angle = t * Math.PI * 2;

            for (let w = 0; w < TERRAIN_WIDTH; w++) {
                const radialOffset = (w - (TERRAIN_WIDTH - 1) / 2) * TERRAIN_BLOCK_SIZE;
                const r = RING_RADIUS + radialOffset;
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                const heightVar = (rng() - 0.5) * 0.06;

                dummy.makeTranslation(x, heightVar, z);
                const blockRotation = new THREE.Matrix4().makeRotationY(-angle + Math.PI / 2);
                dummy.multiply(blockRotation);
                dummy.toArray(mat, idx * 16);

                const color = w === 0
                    ? TERRAIN_GRASS_COLORS[Math.floor(rng() * TERRAIN_GRASS_COLORS.length)]
                    : TERRAIN_COLORS[Math.floor(rng() * TERRAIN_COLORS.length)];

                col[idx * 3] = color.r;
                col[idx * 3 + 1] = color.g;
                col[idx * 3 + 2] = color.b;
                idx++;
            }
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

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[TERRAIN_BLOCK_SIZE * 0.95, TERRAIN_BLOCK_SIZE * 0.6, TERRAIN_BLOCK_SIZE * 0.95]} />
            <meshStandardMaterial vertexColors roughness={0.85} metalness={0.05} flatShading />
        </instancedMesh>
    );
}

// ===== Terrain underside =====
function TerrainUnderside() {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const { count, matrices } = useMemo(() => {
        const totalBlocks = TERRAIN_SEGMENTS;
        const mat = new Float32Array(totalBlocks * 16);
        const dummy = new THREE.Matrix4();
        for (let seg = 0; seg < TERRAIN_SEGMENTS; seg++) {
            const t = seg / TERRAIN_SEGMENTS;
            const angle = t * Math.PI * 2;
            dummy.makeTranslation(
                Math.cos(angle) * RING_RADIUS,
                -TERRAIN_BLOCK_SIZE * 0.5,
                Math.sin(angle) * RING_RADIUS,
            );
            const blockRotation = new THREE.Matrix4().makeRotationY(-angle + Math.PI / 2);
            dummy.multiply(blockRotation);
            dummy.toArray(mat, seg * 16);
        }
        return { count: totalBlocks, matrices: mat };
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

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[TERRAIN_BLOCK_SIZE * TERRAIN_WIDTH * 0.95, TERRAIN_BLOCK_SIZE * 0.4, TERRAIN_BLOCK_SIZE * 0.95]} />
            <meshStandardMaterial color="#2a1a4a" roughness={0.95} flatShading />
        </instancedMesh>
    );
}

// ===== Ground plane beneath the ring — pixelized flat terrain =====
function GroundPlane() {
    const texture = useMemo(() => {
        return createPixelTexture(16, 16, (ctx) => {
            // Pixelated ground pattern
            const colors = ['#1a1028', '#1e1430', '#221838', '#1a1030', '#161028'];
            for (let x = 0; x < 16; x++) {
                for (let y = 0; y < 16; y++) {
                    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });
    }, []);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -TERRAIN_BLOCK_SIZE * 0.8, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial
                map={texture}
                roughness={0.95}
                metalness={0}
                transparent
                opacity={0.5}
            />
        </mesh>
    );
}

// ===== Ring track line =====
function RingPathLine() {
    return (
        <mesh>
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

// ===== Decorative terrain elements =====
function TerrainDecorations() {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const { count, matrices, colors } = useMemo(() => {
        const rng = mulberry32(137);
        const decoCount = 40;
        const mat = new Float32Array(decoCount * 16);
        const col = new Float32Array(decoCount * 3);
        const dummy = new THREE.Matrix4();
        const crystalColors = [
            new THREE.Color('#8866cc'),
            new THREE.Color('#66aacc'),
            new THREE.Color('#aa77dd'),
            new THREE.Color('#5588aa'),
        ];

        for (let i = 0; i < decoCount; i++) {
            const angle = rng() * Math.PI * 2;
            const radialVar = (rng() - 0.5) * TERRAIN_BLOCK_SIZE * TERRAIN_WIDTH * 0.7;
            const r = RING_RADIUS + radialVar;
            const scale = 0.04 + rng() * 0.08;
            const heightScale = 0.5 + rng() * 1.5;

            dummy.identity();
            dummy.makeTranslation(
                Math.cos(angle) * r,
                TERRAIN_BLOCK_SIZE * 0.3 + scale * heightScale * 0.5,
                Math.sin(angle) * r,
            );
            dummy.multiply(new THREE.Matrix4().makeScale(scale, scale * heightScale, scale));
            dummy.toArray(mat, i * 16);

            const c = crystalColors[Math.floor(rng() * crystalColors.length)];
            col[i * 3] = c.r;
            col[i * 3 + 1] = c.g;
            col[i * 3 + 2] = c.b;
        }
        return { count: decoCount, matrices: mat, colors: col };
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

// ===== Enemy HP Bar =====
function EnemyHPBar({ health, maxHealth }: { health: number; maxHealth: number }) {
    const ratio = Math.max(0, health / maxHealth);
    const barWidth = ENEMY_SIZE * 1.4;
    const barHeight = 0.04;
    const barColor = ratio > 0.5 ? '#44dd66' : ratio > 0.25 ? '#ddaa33' : '#dd3333';

    return (
        <group position={[0, ENEMY_SIZE * 1.85, 0]}>
            {/* Background */}
            <mesh position={[0, 0, 0]}>
                <planeGeometry args={[barWidth, barHeight]} />
                <meshBasicMaterial color="#111111" transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
            {/* Fill */}
            <mesh position={[(ratio - 1) * barWidth * 0.5, 0, 0.001]}>
                <planeGeometry args={[barWidth * ratio, barHeight * 0.8]} />
                <meshBasicMaterial color={barColor} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// ===== Pixelated Enemy with smooth movement and HP bar =====
function PixelEnemy({ pathPosition, index, health, maxHealth }: {
    pathPosition: number;
    index: number;
    health: number;
    maxHealth: number;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const smoothPosRef = useRef({ x: 0, y: 0, z: 0, angle: 0, initialized: false });
    const color = useMemo(() => ENEMY_COLORS[index % ENEMY_COLORS.length], [index]);

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;

        const angle = pathPosition * Math.PI * 2;
        const outerR = RING_RADIUS + TERRAIN_BLOCK_SIZE * 0.8;
        const targetX = Math.cos(angle) * outerR;
        const targetZ = Math.sin(angle) * outerR;
        const bobY = TERRAIN_BLOCK_SIZE * 0.3 + Math.sin(clock.elapsedTime * 2 + index) * 0.06;

        const sp = smoothPosRef.current;
        if (!sp.initialized) {
            sp.x = targetX;
            sp.y = bobY;
            sp.z = targetZ;
            sp.angle = angle;
            sp.initialized = true;
        } else {
            // Smooth lerp interpolation
            const t = 1 - Math.exp(-LERP_SPEED * delta);
            sp.x += (targetX - sp.x) * t;
            sp.z += (targetZ - sp.z) * t;
            sp.y = bobY; // Keep bob instant for liveliness
            // Lerp angle with wrapping
            let angleDiff = angle - sp.angle;
            if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            sp.angle += angleDiff * t;
        }

        groupRef.current.position.set(sp.x, sp.y, sp.z);
        groupRef.current.rotation.y = -sp.angle + Math.PI / 2;
    });

    const bodyColor = useMemo(() => color.clone(), [color]);
    const headColor = useMemo(() => color.clone().multiplyScalar(1.15), [color]);
    const feetColor = useMemo(() => color.clone().multiplyScalar(0.75), [color]);

    // Walking animation for feet
    const leftFootRef = useRef<THREE.Mesh>(null);
    const rightFootRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!leftFootRef.current || !rightFootRef.current) return;
        const walkCycle = Math.sin(clock.elapsedTime * 6 + index * 2);
        leftFootRef.current.position.z = walkCycle * 0.05;
        rightFootRef.current.position.z = -walkCycle * 0.05;
    });

    return (
        <group ref={groupRef}>
            {/* HP Bar */}
            <EnemyHPBar health={health} maxHealth={maxHealth} />
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
            {/* Feet with walk animation */}
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

// ===== Tower Aura Ring — radiating pulse on line clear =====
function TowerAura({ active }: { active: boolean }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const scaleRef = useRef(0);

    useFrame((_, delta) => {
        if (!meshRef.current || !matRef.current) return;
        if (active && scaleRef.current < 1) {
            scaleRef.current = Math.min(1, scaleRef.current + delta * 4);
        } else if (!active && scaleRef.current > 0) {
            scaleRef.current = Math.max(0, scaleRef.current - delta * 2);
        }
        const s = scaleRef.current;
        meshRef.current.scale.set(1 + s * 0.8, 1, 1 + s * 0.8);
        matRef.current.opacity = (1 - s) * 0.6;
        meshRef.current.visible = s > 0.01;
    });

    return (
        <mesh ref={meshRef} position={[0, TOWER_SIZE * 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[TOWER_SIZE * 0.8, TOWER_SIZE * 2.5, 8]} />
            <meshBasicMaterial
                ref={matRef}
                color={TOWER_GLOW_COLOR}
                transparent
                opacity={0}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// ===== Tower Mesh with aura =====
function RingTower({ side, index, charge, maxCharge, level, lineClearPulse }: {
    side: string;
    index: number;
    charge: number;
    maxCharge: number;
    level: number;
    lineClearPulse: boolean;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const pathPos = useMemo(() => getTowerPathPos(side, index), [side, index]);
    const isCharged = charge > 0;
    const chargeRatio = charge / maxCharge;

    // Static placement — computed once, updated in useFrame for pulse only
    const position = useMemo(() => {
        const angle = pathPos * Math.PI * 2;
        const innerR = RING_RADIUS - TERRAIN_BLOCK_SIZE * 0.5;
        return {
            x: Math.cos(angle) * innerR,
            z: Math.sin(angle) * innerR,
            rotY: -angle,
        };
    }, [pathPos]);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        groupRef.current.position.set(position.x, TERRAIN_BLOCK_SIZE * 0.3, position.z);
        groupRef.current.rotation.y = position.rotY;
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
            {/* Aura ring — radiates on line clear */}
            <TowerAura active={lineClearPulse && isCharged} />
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

// ===== Gate markers =====
function GateMarkers({ gates }: { gates: GalaxyGate[] }) {
    const gatePositions = useMemo(() => {
        const sides = ['top', 'right', 'bottom', 'left'] as const;
        return sides.map((side, i) => {
            const gate = gates.find(g => g.side === side);
            const angle = ((i + 0.5) / 4) * Math.PI * 2;
            const ratio = gate ? gate.health / gate.maxHealth : 1;
            return {
                x: Math.cos(angle) * RING_RADIUS,
                z: Math.sin(angle) * RING_RADIUS,
                ratio,
                side,
            };
        });
    }, [gates]);

    return (
        <>
            {gatePositions.map(({ x, z, ratio, side }) => {
                const gateColor = ratio > 0.5 ? '#44ff88' : ratio > 0.25 ? '#ffaa44' : '#ff4444';
                return (
                    <group key={side} position={[x, 0, z]}>
                        <mesh position={[-0.15, 0.25, 0]}>
                            <boxGeometry args={[0.12, 0.5, 0.12]} />
                            <meshStandardMaterial color={gateColor} emissive={gateColor} emissiveIntensity={0.6} roughness={0.4} flatShading />
                        </mesh>
                        <mesh position={[0.15, 0.25, 0]}>
                            <boxGeometry args={[0.12, 0.5, 0.12]} />
                            <meshStandardMaterial color={gateColor} emissive={gateColor} emissiveIntensity={0.6} roughness={0.4} flatShading />
                        </mesh>
                        <mesh position={[0, 0.55, 0]}>
                            <boxGeometry args={[0.42, 0.1, 0.12]} />
                            <meshStandardMaterial color={gateColor} emissive={gateColor} emissiveIntensity={0.8} roughness={0.3} flatShading />
                        </mesh>
                        <pointLight color={gateColor} intensity={0.5} distance={2} position={[0, 0.6, 0]} />
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
    lineClearPulse,
}: {
    enemies: GalaxyRingEnemy[];
    towers: GalaxyTower[];
    gates: GalaxyGate[];
    waveNumber: number;
    lineClearPulse: boolean;
}) {
    return (
        <>
            <PixelFilterSetup />

            {/* Lighting */}
            <ambientLight intensity={0.7} color="#ccccff" />
            <directionalLight position={[5, 10, 5]} intensity={0.9} color="#ffffff" />
            <directionalLight position={[-4, 6, -6]} intensity={0.25} color="#8888cc" />

            {/* Everything tilted together — terrain is STATIC (no rotation) */}
            <group rotation={[RING_TILT, 0, 0]}>
                {/* Static terrain */}
                <GroundPlane />
                <TerrainRing />
                <TerrainUnderside />
                <RingPathLine />
                <TerrainDecorations />
                <GateMarkers gates={gates} />

                {/* Enemies — directly placed, no rotating wrapper */}
                {enemies.filter(e => e.alive).map((enemy) => (
                    <PixelEnemy
                        key={enemy.id}
                        pathPosition={enemy.pathPosition}
                        index={enemy.id}
                        health={enemy.health}
                        maxHealth={enemy.maxHealth}
                    />
                ))}

                {/* Towers — static positions, no rotating wrapper */}
                {towers.map(tower => (
                    <RingTower
                        key={tower.id}
                        side={tower.side}
                        index={tower.index}
                        charge={tower.charge}
                        maxCharge={tower.maxCharge}
                        level={tower.level}
                        lineClearPulse={lineClearPulse}
                    />
                ))}
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
    lineClearPulse?: boolean;
}

export function GalaxyRing3D({ enemies, towers, gates, waveNumber, lineClearPulse = false }: GalaxyRing3DProps) {
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
                lineClearPulse={lineClearPulse}
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
