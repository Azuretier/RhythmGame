'use client';

import * as THREE from 'three'
import { useEffect, useRef, useState, ReactNode, Suspense } from 'react'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { useCursor, MeshPortalMaterial, CameraControls, Gltf, Text, Preload } from '@react-three/drei'
import { easing } from 'maath'
import { RoundedPlaneGeometry } from 'maath/geometry'

extend({ RoundedPlaneGeometry })

declare module '@react-three/fiber' {
    interface ThreeElements {
        roundedPlaneGeometry: {
            args?: [width?: number, height?: number, radius?: number, segments?: number]
            attach?: string
        }
    }
}

interface FrameProps {
    id: string
    name: string
    author: string
    bg?: string
    width?: number
    height?: number
    children?: ReactNode
    position?: [number, number, number]
    rotation?: [number, number, number]
    activeId: string | null
    onSelect: (id: string) => void
}

function Frame({ id, name, author, bg = '#111118', width = 1, height = 1.61803398875, children, activeId, onSelect, ...props }: FrameProps) {
    const portal = useRef<any>(null)
    const [hovered, hover] = useState<boolean>(false)
    useCursor(hovered)
    useFrame((_state, dt) => {
        if (portal.current) {
            easing.damp(portal.current, 'blend', activeId === id ? 1 : 0, 0.2, dt)
        }
    })
    return (
        <group {...props}>
            <Text
                fontSize={0.3}
                anchorY="top"
                anchorX="left"
                lineHeight={0.8}
                position={[-0.375, 0.715, 0.01]}
                material-toneMapped={false}
                color="rgba(255,255,255,0.85)"
            >
                {name}
            </Text>
            <Text
                fontSize={0.1}
                anchorX="right"
                position={[0.4, -0.659, 0.01]}
                material-toneMapped={false}
                color="rgba(255,255,255,0.3)"
            >
                /{id}
            </Text>
            <Text
                fontSize={0.04}
                anchorX="right"
                position={[0.0, -0.677, 0.01]}
                material-toneMapped={false}
                color="rgba(255,255,255,0.2)"
            >
                {author}
            </Text>
            <mesh
                name={id}
                onDoubleClick={(e) => {
                    e.stopPropagation()
                    onSelect(activeId === id ? '' : id)
                }}
                onPointerOver={() => hover(true)}
                onPointerOut={() => hover(false)}
            >
                <roundedPlaneGeometry args={[width, height, 0.1]} />
                <MeshPortalMaterial ref={portal} events={activeId === id} side={THREE.DoubleSide} resolution={512} blur={0.5}>
                    <color attach="background" args={[bg]} />
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[5, 5, 5]} intensity={0.8} />
                    {children}
                </MeshPortalMaterial>
            </mesh>
        </group>
    )
}

function Rig({ activeId }: { activeId: string | null }) {
    const { controls, scene } = useThree()
    const position = useRef(new THREE.Vector3(0, 0, 2))
    const focus = useRef(new THREE.Vector3(0, 0, 0))

    useEffect(() => {
        const active = scene.getObjectByName(activeId ?? '')
        if (active && active.parent) {
            active.parent.localToWorld(position.current.set(0, 0.5, 0.25))
            active.parent.localToWorld(focus.current.set(0, 0, -2))
        } else {
            position.current.set(0, 0, 5)
            focus.current.set(0, 0, 0)
        }
        ;(controls as any)?.setLookAt(
            ...position.current.toArray(),
            ...focus.current.toArray(),
            true
        )
    }, [activeId, controls, scene])

    return <CameraControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
}

function Scene({ activeId, onSelect }: { activeId: string | null, onSelect: (id: string) => void }) {
    return (
        <>
            <color attach="background" args={['#080808']} />
            <Frame
                id="01"
                name={`pick\nles`}
                author="Omar Faruq Tawsif"
                bg="#1a1510"
                position={[-1.15, 0, 0]}
                rotation={[0, 0.5, 0]}
                activeId={activeId}
                onSelect={onSelect}
            >
                <Gltf src="/models/pickles_3d_version_of_hyuna_lees_illustration-transformed.glb" scale={8} position={[0, -0.7, -2]} />
            </Frame>
            <Frame
                id="02"
                name="tea"
                author="Omar Faruq Tawsif"
                bg="#0d1117"
                activeId={activeId}
                onSelect={onSelect}
            >
                <Gltf src="/models/fiesta_tea-transformed.glb" position={[0, -2, -3]} />
            </Frame>
            <Frame
                id="03"
                name="still"
                author="Omar Faruq Tawsif"
                bg="#12150f"
                position={[1.15, 0, 0]}
                rotation={[0, -0.5, 0]}
                activeId={activeId}
                onSelect={onSelect}
            >
                <Gltf src="/models/still_life_based_on_heathers_artwork-transformed.glb" scale={2} position={[0, -0.8, -4]} />
            </Frame>
            <Rig activeId={activeId} />
            <Preload all />
        </>
    )
}

interface ModelViewerProps {
    height?: string
    className?: string
}

export default function ModelViewer({
    height = '500px',
    className = ''
}: ModelViewerProps) {
    const [activeId, setActiveId] = useState<string | null>(null)

    return (
        <div
            className={className}
            style={{
                width: '100%',
                height,
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: '#080808',
            }}
        >
            <Canvas flat camera={{ fov: 75, position: [0, 0, 5] }}>
                <Suspense fallback={null}>
                    <Scene activeId={activeId} onSelect={setActiveId} />
                </Suspense>
            </Canvas>
        </div>
    )
}
