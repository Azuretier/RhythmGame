'use client';

import * as THREE from 'three'
import { useEffect, useRef, useState, ReactNode, Suspense, useCallback } from 'react'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { useCursor, MeshPortalMaterial, Gltf, Text, Preload } from '@react-three/drei'
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

const FRAME_SPACING = 2.2
const FRAME_COUNT = 3
const SCROLL_THRESHOLD = 50
const NAV_COOLDOWN = 600

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

function Rig({ activeId, currentIndex }: { activeId: string | null, currentIndex: number }) {
    const { camera, scene } = useThree()
    const targetPos = useRef(new THREE.Vector3(0, 0, 5))
    const targetFocus = useRef(new THREE.Vector3(0, 0, 0))
    const currentFocus = useRef(new THREE.Vector3(0, 0, 0))

    useEffect(() => {
        const active = scene.getObjectByName(activeId ?? '')
        if (active && active.parent) {
            active.parent.localToWorld(targetPos.current.set(0, 0.5, 0.25))
            active.parent.localToWorld(targetFocus.current.set(0, 0, -2))
        } else {
            const y = (1 - currentIndex) * FRAME_SPACING
            targetPos.current.set(0, y, 5)
            targetFocus.current.set(0, y, 0)
        }
    }, [activeId, currentIndex, scene])

    useFrame((_state, dt) => {
        const speed = activeId ? 0.2 : 0.35
        easing.damp3(camera.position, targetPos.current, speed, dt)
        easing.damp3(currentFocus.current, targetFocus.current, speed, dt)
        camera.lookAt(currentFocus.current)
    })

    return null
}

function Scene({ activeId, onSelect, currentIndex }: { activeId: string | null, onSelect: (id: string) => void, currentIndex: number }) {
    return (
        <>
            <color attach="background" args={['#080808']} />
            <Frame
                id="01"
                name={`pick\nles`}
                author="Omar Faruq Tawsif"
                bg="#1a1510"
                position={[0, FRAME_SPACING, 0]}
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
                position={[0, 0, 0]}
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
                position={[0, -FRAME_SPACING, 0]}
                activeId={activeId}
                onSelect={onSelect}
            >
                <Gltf src="/models/still_life_based_on_heathers_artwork-transformed.glb" scale={2} position={[0, -0.8, -4]} />
            </Frame>
            <Rig activeId={activeId} currentIndex={currentIndex} />
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
    const [currentIndex, setCurrentIndex] = useState(1)
    const containerRef = useRef<HTMLDivElement>(null)
    const scrollAccum = useRef(0)
    const isNavigating = useRef(false)
    const currentIndexRef = useRef(1)
    const activeIdRef = useRef<string | null>(null)
    const touchStartY = useRef(0)

    activeIdRef.current = activeId
    currentIndexRef.current = currentIndex

    const navigate = useCallback((direction: 1 | -1) => {
        if (isNavigating.current || activeIdRef.current) return
        const nextIndex = currentIndexRef.current + direction
        if (nextIndex < 0 || nextIndex >= FRAME_COUNT) return

        isNavigating.current = true
        currentIndexRef.current = nextIndex
        setCurrentIndex(nextIndex)
        scrollAccum.current = 0

        setTimeout(() => {
            isNavigating.current = false
        }, NAV_COOLDOWN)
    }, [])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (activeIdRef.current || isNavigating.current) return

            scrollAccum.current += e.deltaY
            if (Math.abs(scrollAccum.current) >= SCROLL_THRESHOLD) {
                navigate(scrollAccum.current > 0 ? 1 : -1)
            }
        }

        const handleTouchStart = (e: TouchEvent) => {
            touchStartY.current = e.touches[0].clientY
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (activeIdRef.current || isNavigating.current) return
            const deltaY = touchStartY.current - e.touches[0].clientY
            if (Math.abs(deltaY) >= 40) {
                e.preventDefault()
                navigate(deltaY > 0 ? 1 : -1)
                touchStartY.current = e.touches[0].clientY
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && activeIdRef.current) {
                setActiveId('')
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                navigate(1)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                navigate(-1)
            }
        }

        el.addEventListener('wheel', handleWheel, { passive: false })
        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchmove', handleTouchMove, { passive: false })
        el.addEventListener('keydown', handleKeyDown)

        return () => {
            el.removeEventListener('wheel', handleWheel)
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('keydown', handleKeyDown)
        }
    }, [navigate])

    return (
        <div
            ref={containerRef}
            className={className}
            tabIndex={0}
            style={{
                position: 'relative',
                width: '100%',
                height,
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: '#080808',
                outline: 'none',
            }}
        >
            <Canvas flat camera={{ fov: 75, position: [0, 0, 5] }}>
                <Suspense fallback={null}>
                    <Scene activeId={activeId} onSelect={setActiveId} currentIndex={currentIndex} />
                </Suspense>
            </Canvas>
            {!activeId && (
                <div style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 10,
                }}>
                    {Array.from({ length: FRAME_COUNT }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                if (!isNavigating.current && !activeIdRef.current) {
                                    isNavigating.current = true
                                    currentIndexRef.current = i
                                    setCurrentIndex(i)
                                    scrollAccum.current = 0
                                    setTimeout(() => { isNavigating.current = false }, NAV_COOLDOWN)
                                }
                            }}
                            aria-label={`View frame ${i + 1}`}
                            style={{
                                width: '6px',
                                height: currentIndex === i ? '20px' : '6px',
                                borderRadius: '3px',
                                background: currentIndex === i
                                    ? 'rgba(255, 255, 255, 0.7)'
                                    : 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
