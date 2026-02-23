'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GalaxyRingEnemy, GalaxyTower, GalaxyGate } from '../galaxy-types';
import {
    GALAXY_PATH_LENGTH,
    GALAXY_TOWER_MAX_CHARGE,
    GALAXY_SIDE_BOUNDARIES,
    GALAXY_TOWERS_PER_SIDE_TB,
    GALAXY_TOWERS_PER_SIDE_LR,
} from '../galaxy-constants';

// ===== Constants =====
const RING_RADIUS = 6;           // Distance from center of the ring path
const RING_TILT = 0.35;          // Radians tilt (like Saturn's rings)
const ENEMY_SIZE = 0.25;
const TOWER_SIZE = 0.18;

// ===== Pixelated Minecraft-style enemy colors (chill palette) =====
const ENEMY_COLORS = [
    new THREE.Color('#88cc88'), // Creeper green
    new THREE.Color('#7799bb'), // Cool blue
    new THREE.Color('#bb9977'), // Warm brown
    new THREE.Color('#aa88cc'), // Soft purple
    new THREE.Color('#ccaa77'), // Sandy
];

const TOWER_COLOR_IDLE = new THREE.Color('#443366');
const TOWER_COLOR_CHARGED = new THREE.Color('#8866cc');
const TOWER_GLOW_COLOR = new THREE.Color('#00ccff');

// ===== Path position → 3D world position on the ring =====
function pathTo3D(pathPos: number): [number, number, number] {
    // Map path position (0–1) to angle around the ring (0–2π)
    const angle = pathPos * Math.PI * 2;
    const x = Math.cos(angle) * RING_RADIUS;
    const z = Math.sin(angle) * RING_RADIUS;
    // Apply tilt to the ring
    const y = Math.sin(angle) * RING_RADIUS * Math.sin(RING_TILT) * 0.3;
    return [x, y, z];
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

// ===== Pixelated Enemy Mesh =====
// Each enemy is a small voxel cluster — 3 stacked cubes for a chill mob look
function PixelEnemy({ pathPosition, speed, index }: {
    pathPosition: number;
    speed: number;
    index: number;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const color = useMemo(() => ENEMY_COLORS[index % ENEMY_COLORS.length], [index]);

    // Gentle bobbing animation
    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const [x, y, z] = pathTo3D(pathPosition);
        groupRef.current.position.set(x, y + Math.sin(clock.elapsedTime * 1.5 + index) * 0.08, z);
        // Face direction of movement (tangent to ring)
        const angle = pathPosition * Math.PI * 2;
        groupRef.current.rotation.y = -angle + Math.PI / 2;
    });

    const bodyColor = useMemo(() => color.clone(), [color]);
    const headColor = useMemo(() => color.clone().multiplyScalar(1.15), [color]);
    const feetColor = useMemo(() => color.clone().multiplyScalar(0.75), [color]);

    return (
        <group ref={groupRef}>
            {/* Body — main cube */}
            <mesh position={[0, ENEMY_SIZE * 0.5, 0]}>
                <boxGeometry args={[ENEMY_SIZE, ENEMY_SIZE, ENEMY_SIZE * 0.8]} />
                <meshStandardMaterial
                    color={bodyColor}
                    roughness={0.9}
                    metalness={0}
                    flatShading
                />
            </mesh>
            {/* Head — slightly wider */}
            <mesh position={[0, ENEMY_SIZE * 1.25, 0]}>
                <boxGeometry args={[ENEMY_SIZE * 1.1, ENEMY_SIZE * 0.8, ENEMY_SIZE * 0.9]} />
                <meshStandardMaterial
                    color={headColor}
                    roughness={0.85}
                    metalness={0}
                    flatShading
                />
            </mesh>
            {/* Eyes — two tiny dark cubes */}
            <mesh position={[-ENEMY_SIZE * 0.2, ENEMY_SIZE * 1.3, ENEMY_SIZE * 0.4]}>
                <boxGeometry args={[ENEMY_SIZE * 0.15, ENEMY_SIZE * 0.12, ENEMY_SIZE * 0.08]} />
                <meshStandardMaterial color="#222222" />
            </mesh>
            <mesh position={[ENEMY_SIZE * 0.2, ENEMY_SIZE * 1.3, ENEMY_SIZE * 0.4]}>
                <boxGeometry args={[ENEMY_SIZE * 0.15, ENEMY_SIZE * 0.12, ENEMY_SIZE * 0.08]} />
                <meshStandardMaterial color="#222222" />
            </mesh>
            {/* Feet — two small cubes */}
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
        const [x, y, z] = pathTo3D(pathPos);
        groupRef.current.position.set(x, y, z);
        const angle = pathPos * Math.PI * 2;
        groupRef.current.rotation.y = -angle;
        // Subtle pulse when charged
        if (isCharged) {
            const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.05;
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
            <mesh position={[0, TOWER_SIZE * 0.5, 0]}>
                <boxGeometry args={[TOWER_SIZE * 1.4, TOWER_SIZE, TOWER_SIZE * 1.4]} />
                <meshStandardMaterial
                    color={baseColor}
                    roughness={0.8}
                    flatShading
                />
            </mesh>
            {/* Tower body */}
            <mesh position={[0, TOWER_SIZE * 1.5, 0]}>
                <boxGeometry args={[TOWER_SIZE, TOWER_SIZE * 1.5, TOWER_SIZE]} />
                <meshStandardMaterial
                    color={baseColor}
                    roughness={0.7}
                    flatShading
                />
            </mesh>
            {/* Charge crystal on top */}
            {isCharged && (
                <>
                    <mesh position={[0, TOWER_SIZE * 2.7, 0]}>
                        <boxGeometry args={[TOWER_SIZE * 0.5, TOWER_SIZE * 0.5, TOWER_SIZE * 0.5]} />
                        <meshStandardMaterial
                            color={TOWER_GLOW_COLOR}
                            emissive={TOWER_GLOW_COLOR}
                            emissiveIntensity={chargeRatio * 2}
                            roughness={0.3}
                            flatShading
                        />
                    </mesh>
                    <pointLight
                        position={[0, TOWER_SIZE * 3, 0]}
                        color={TOWER_GLOW_COLOR}
                        intensity={chargeRatio * 0.5}
                        distance={1.5}
                    />
                </>
            )}
            {/* Level indicator — small cubes on corners for level > 1 */}
            {level > 1 && (
                <mesh position={[0, TOWER_SIZE * 2.3, 0]}>
                    <boxGeometry args={[TOWER_SIZE * 1.2, TOWER_SIZE * 0.15, TOWER_SIZE * 1.2]} />
                    <meshStandardMaterial color="#ffcc44" roughness={0.6} flatShading />
                </mesh>
            )}
        </group>
    );
}

// ===== Ring Track (torus) =====
function RingTrack() {
    const meshRef = useRef<THREE.Mesh>(null);

    return (
        <mesh ref={meshRef} rotation={[RING_TILT, 0, 0]}>
            <torusGeometry args={[RING_RADIUS, 0.04, 8, 72]} />
            <meshStandardMaterial
                color="#332255"
                transparent
                opacity={0.35}
                roughness={0.9}
            />
        </mesh>
    );
}

// ===== Outer ring (subtle glow path) =====
function RingGlow() {
    return (
        <mesh rotation={[RING_TILT, 0, 0]}>
            <torusGeometry args={[RING_RADIUS, 0.12, 6, 72]} />
            <meshStandardMaterial
                color="#221133"
                transparent
                opacity={0.12}
                roughness={1}
            />
        </mesh>
    );
}

// ===== Gate markers (4 glowing spots on the ring) =====
function GateMarkers({ gates }: { gates: GalaxyGate[] }) {
    const gatePositions = useMemo(() => {
        const sides = ['top', 'right', 'bottom', 'left'] as const;
        return sides.map((side, i) => {
            const gate = gates.find(g => g.side === side);
            const pathPos = (i + 0.5) / 4; // Evenly spaced around the ring
            const [x, y, z] = pathTo3D(pathPos);
            const ratio = gate ? gate.health / gate.maxHealth : 1;
            return { x, y, z, ratio, side };
        });
    }, [gates]);

    return (
        <>
            {gatePositions.map(({ x, y, z, ratio, side }) => {
                const gateColor = ratio > 0.5 ? '#44ff88' : ratio > 0.25 ? '#ffaa44' : '#ff4444';
                return (
                    <group key={side} position={[x, y, z]}>
                        <mesh>
                            <boxGeometry args={[0.15, 0.15, 0.15]} />
                            <meshStandardMaterial
                                color={gateColor}
                                emissive={gateColor}
                                emissiveIntensity={0.8}
                                transparent
                                opacity={0.7}
                                roughness={0.4}
                            />
                        </mesh>
                        <pointLight color={gateColor} intensity={0.3} distance={1.2} />
                    </group>
                );
            })}
        </>
    );
}

// ===== Slow ring rotation =====
function RingRotation({ children }: { children: React.ReactNode }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        // Very slow rotation for ambient feel
        groupRef.current.rotation.y = clock.elapsedTime * 0.02;
    });

    return (
        <group ref={groupRef} rotation={[RING_TILT, 0, 0]}>
            {children}
        </group>
    );
}

// ===== Main 3D Scene =====
function GalaxyRingScene({
    enemies,
    towers,
    gates,
    waveNumber,
}: {
    enemies: GalaxyRingEnemy[];
    towers: GalaxyTower[];
    gates: GalaxyGate[];
    waveNumber: number;
}) {
    // Only show a subset of towers (every Nth) to avoid clutter
    const visibleTowers = useMemo(() => {
        // Show every 4th tower to keep it clean
        return towers.filter((_, i) => i % 4 === 0);
    }, [towers]);

    return (
        <>
            {/* Ambient + directional for soft lighting */}
            <ambientLight intensity={0.6} color="#ccccff" />
            <directionalLight position={[5, 8, 5]} intensity={0.8} color="#ffffff" />
            <directionalLight position={[-3, 4, -5]} intensity={0.2} color="#8888cc" />

            {/* Ring structure */}
            <RingGlow />
            <RingTrack />
            <GateMarkers gates={gates} />

            {/* Enemies and towers rotate with the ring */}
            <RingRotation>
                {/* Enemies — pixel mobs walking the ring */}
                {enemies.filter(e => e.alive).map((enemy, idx) => (
                    <PixelEnemy
                        key={enemy.id}
                        pathPosition={enemy.pathPosition}
                        speed={enemy.speed}
                        index={enemy.id}
                    />
                ))}

                {/* Towers — spaced out along the ring */}
                {visibleTowers.map(tower => (
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
    return (
        <Canvas
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 5, 10], fov: 40, near: 0.1, far: 100 }}
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1,
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
