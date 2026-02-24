'use client';

import { useRef, Suspense, Component, ReactNode, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DragonModel3DProps {
    isBreathing: boolean;
    bothFull: boolean;
    furyPercent: number;
    mightPercent: number;
}

// ---- Error boundary -------------------------------------------------------

interface ErrorBoundaryState { hasError: boolean }

class DragonCanvasErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error('[DragonModel3D] WebGL/Three.js initialization error:', error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: FALLBACK_FONT_SIZE,
                    }}
                >
                    🐉
                </div>
            );
        }
        return this.props.children;
    }
}

// ---- Stable Canvas config (defined once, never recreated) ----------------

const CANVAS_WIDTH = 52;
const CANVAS_HEIGHT = 72;
const FALLBACK_FONT_SIZE = 20;
/** Clamped dpr range: minimum 1, maximum 2 — covers Retina / HiDPI screens. */
const CANVAS_DPR: [number, number] = [1, 2];
const CANVAS_CAMERA = { fov: 50, position: [0, 0, 3] as [number, number, number] };
const CANVAS_GL = { alpha: true, antialias: true };

// ---- 3-D dragon mesh ------------------------------------------------------

function DragonMesh({ isBreathing, bothFull, furyPercent, mightPercent }: DragonModel3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const fireRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (groupRef.current) {
            if (isBreathing) {
                groupRef.current.rotation.y = Math.sin(t * 3) * 0.3;
                groupRef.current.scale.setScalar(1 + Math.sin(t * 6) * 0.05);
            } else if (bothFull) {
                groupRef.current.rotation.y = Math.sin(t * 1.5) * 0.2;
                groupRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
            } else {
                groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;
                groupRef.current.scale.setScalar(1);
            }
        }
        if (fireRef.current && isBreathing) {
            fireRef.current.scale.x = 0.6 + Math.sin(t * 10) * 0.3;
            fireRef.current.scale.y = 0.6 + Math.sin(t * 8 + 1) * 0.3;
        }
    });

    const bodyColor = isBreathing
        ? '#FF8C00'
        : bothFull
            ? '#FFB300'
            : furyPercent + mightPercent > 0.5
                ? '#D4853A'
                : '#C17C3C';

    const glowIntensity = isBreathing ? 4 : bothFull ? 2 : 0.8;
    const glowColor = isBreathing ? '#FF4500' : '#FFB300';

    return (
        <group ref={groupRef}>
            <ambientLight intensity={0.5} />
            <pointLight position={[0, 2, 2]} intensity={glowIntensity} color={glowColor} />

            {/* Body */}
            <mesh position={[0, -0.1, 0]}>
                <sphereGeometry args={[0.35, 12, 8]} />
                <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.6} />
            </mesh>

            {/* Neck */}
            <mesh position={[0, 0.32, 0.08]} rotation={[0.3, 0, 0]}>
                <cylinderGeometry args={[0.14, 0.18, 0.3, 8]} />
                <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.6} />
            </mesh>

            {/* Head */}
            <mesh position={[0, 0.56, 0.15]}>
                <sphereGeometry args={[0.22, 12, 8]} />
                <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.6} />
            </mesh>

            {/* Snout */}
            <mesh position={[0, 0.43, 0.38]}>
                <sphereGeometry args={[0.12, 8, 6]} />
                <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.6} />
            </mesh>

            {/* Left horn */}
            <mesh position={[-0.11, 0.79, 0.1]} rotation={[0.1, 0, -0.3]}>
                <coneGeometry args={[0.045, 0.22, 6]} />
                <meshStandardMaterial color="#8B0000" roughness={0.5} metalness={0.3} />
            </mesh>

            {/* Right horn */}
            <mesh position={[0.11, 0.79, 0.1]} rotation={[0.1, 0, 0.3]}>
                <coneGeometry args={[0.045, 0.22, 6]} />
                <meshStandardMaterial color="#8B0000" roughness={0.5} metalness={0.3} />
            </mesh>

            {/* Left eye */}
            <mesh position={[-0.1, 0.61, 0.31]}>
                <sphereGeometry args={[0.04, 6, 6]} />
                <meshStandardMaterial
                    color="#FFD700"
                    emissive="#FF8C00"
                    emissiveIntensity={isBreathing ? 4 : bothFull ? 2 : 1}
                />
            </mesh>

            {/* Right eye */}
            <mesh position={[0.1, 0.61, 0.31]}>
                <sphereGeometry args={[0.04, 6, 6]} />
                <meshStandardMaterial
                    color="#FFD700"
                    emissive="#FF8C00"
                    emissiveIntensity={isBreathing ? 4 : bothFull ? 2 : 1}
                />
            </mesh>

            {/* Tail */}
            <mesh position={[0.08, -0.55, -0.28]} rotation={[0.5, 0.1, 0.25]}>
                <coneGeometry args={[0.12, 0.55, 8]} />
                <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.5} />
            </mesh>

            {/* Tail tip */}
            <mesh position={[0.16, -0.82, -0.46]} rotation={[0.7, 0.2, 0.4]}>
                <coneGeometry args={[0.06, 0.22, 6]} />
                <meshStandardMaterial color="#8B0000" roughness={0.4} />
            </mesh>

            {/* Left wing */}
            <mesh position={[-0.48, 0.08, -0.08]} rotation={[0.15, -0.1, -0.6]}>
                <coneGeometry args={[0.18, 0.52, 4]} />
                <meshStandardMaterial color="#8B0000" roughness={0.4} transparent opacity={0.88} />
            </mesh>

            {/* Right wing */}
            <mesh position={[0.48, 0.08, -0.08]} rotation={[0.15, 0.1, 0.6]}>
                <coneGeometry args={[0.18, 0.52, 4]} />
                <meshStandardMaterial color="#8B0000" roughness={0.4} transparent opacity={0.88} />
            </mesh>

            {/* Fire breath (only during dragon breath) */}
            {isBreathing && (
                <mesh ref={fireRef} position={[0, 0.38, 0.6]}>
                    <sphereGeometry args={[0.22, 8, 6]} />
                    <meshStandardMaterial
                        color="#FF4500"
                        emissive="#FF8C00"
                        emissiveIntensity={5}
                        transparent
                        opacity={0.88}
                    />
                </mesh>
            )}
        </group>
    );
}

// ---- Public export ---------------------------------------------------------
// Memoized so the Canvas (and its WebGL context) is only recreated when props
// actually change, preventing context leaks on unrelated parent re-renders.

export const DragonModel3D = memo(function DragonModel3D({
    isBreathing,
    bothFull,
    furyPercent,
    mightPercent,
}: DragonModel3DProps) {
    return (
        <DragonCanvasErrorBoundary>
            <Canvas
                camera={CANVAS_CAMERA}
                style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
                dpr={CANVAS_DPR}
                gl={CANVAS_GL}
            >
                <Suspense fallback={null}>
                    <DragonMesh
                        isBreathing={isBreathing}
                        bothFull={bothFull}
                        furyPercent={furyPercent}
                        mightPercent={mightPercent}
                    />
                </Suspense>
            </Canvas>
        </DragonCanvasErrorBoundary>
    );
});

