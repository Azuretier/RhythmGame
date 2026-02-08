'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';

interface ModelProps {
    url: string;
    scale?: number;
    rotation?: [number, number, number];
}

function Model({ url, scale = 1, rotation = [0, 0, 0] }: ModelProps) {
    const { scene } = useGLTF(url);
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
        }
    });

    return (
        <group ref={groupRef} rotation={rotation}>
            <Center>
                <primitive object={scene} scale={scale} />
            </Center>
        </group>
    );
}

function LoadingFallback() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#888" wireframe />
        </mesh>
    );
}

interface ModelViewerProps {
    models?: {
        url: string;
        scale?: number;
        rotation?: [number, number, number];
    }[];
    height?: string;
    className?: string;
}

export default function ModelViewer({
    models = [
        { url: '/models/fiesta_tea-transformed.glb', scale: 2 },
        { url: '/models/pickles_3d_version_of_hyuna_lees_illustration-transformed.glb', scale: 2 },
        { url: '/models/still_life_based_on_heathers_artwork-transformed.glb', scale: 2 },
    ],
    height = '400px',
    className = ''
}: ModelViewerProps) {
    // Calculate positions for models in a row
    const spacing = 4;
    const startX = -((models.length - 1) * spacing) / 2;

    return (
        <div
            className={className}
            style={{
                width: '100%',
                height,
                borderRadius: '16px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.8) 0%, rgba(20, 20, 35, 0.9) 100%)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
        >
            <Canvas
                camera={{ position: [0, 2, 10], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <spotLight position={[-10, 10, -5]} intensity={0.5} angle={0.3} />

                <Suspense fallback={<LoadingFallback />}>
                    {models.map((model, index) => (
                        <group key={model.url} position={[startX + index * spacing, 0, 0]}>
                            <Model
                                url={model.url}
                                scale={model.scale}
                                rotation={model.rotation}
                            />
                        </group>
                    ))}
                    <Environment preset="city" />
                </Suspense>

                <OrbitControls
                    enableZoom={true}
                    enablePan={false}
                    minDistance={5}
                    maxDistance={20}
                    autoRotate={false}
                />
            </Canvas>
        </div>
    );
}

// Preload all models
[
    '/models/fiesta_tea-transformed.glb',
    '/models/pickles_3d_version_of_hyuna_lees_illustration-transformed.glb',
    '/models/still_life_based_on_heathers_artwork-transformed.glb',
].forEach(useGLTF.preload);
