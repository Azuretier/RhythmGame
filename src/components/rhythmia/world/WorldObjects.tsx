'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Vector3 } from '@/types/world';

interface PlayerCharacterProps {
  position: Vector3;
  rotation: number;
  isMoving: boolean;
  color?: string;
}

/**
 * Simple capsule-shaped player character
 */
export function PlayerCharacter({
  position,
  rotation,
  isMoving,
  color = '#007FFF',
}: PlayerCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bobPhase = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Update position and rotation
    groupRef.current.position.set(position.x, position.y, position.z);
    groupRef.current.rotation.y = rotation;

    // Bobbing animation when moving
    if (isMoving) {
      bobPhase.current += delta * 8;
      const bob = Math.sin(bobPhase.current) * 0.1;
      groupRef.current.position.y = position.y + bob + 1;
    } else {
      groupRef.current.position.y = position.y + 1;
      bobPhase.current = 0;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body (capsule) */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Head glow */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Direction indicator */}
      <mesh position={[0, 1.2, 0.4]} castShadow>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>

      {/* Shadow circle */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

interface StoryMarkerProps {
  position: Vector3;
  color: string;
  type: 'quest' | 'npc' | 'lore' | 'boss' | 'checkpoint';
  isUnlocked: boolean;
  isCompleted: boolean;
  isInRange: boolean;
}

/**
 * Visual marker for story points in the world
 */
export function StoryMarker({
  position,
  color,
  type,
  isUnlocked,
  isCompleted,
  isInRange,
}: StoryMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Floating animation
    const time = state.clock.elapsedTime;
    meshRef.current.position.y = position.y + 1.5 + Math.sin(time * 2) * 0.2;
    meshRef.current.rotation.y += 0.02;

    // Pulse ring when in range
    if (ringRef.current && isInRange) {
      const scale = 1 + Math.sin(time * 4) * 0.2;
      ringRef.current.scale.set(scale, 1, scale);
    }
  });

  if (!isUnlocked) {
    // Locked marker
    return (
      <group position={[position.x, position.y, position.z]}>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color="#555555"
            emissive="#333333"
            emissiveIntensity={0.2}
            transparent
            opacity={0.5}
          />
        </mesh>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#555555" transparent opacity={0.3} />
        </mesh>
      </group>
    );
  }

  if (isCompleted) {
    // Completed marker (checkmark)
    return (
      <group position={[position.x, position.y, position.z]}>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color="#2ecc71"
            emissive="#27ae60"
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>
    );
  }

  // Active marker
  const markerColor = color || '#f7b731';

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Main marker */}
      <mesh ref={meshRef} castShadow>
        {type === 'boss' ? (
          <octahedronGeometry args={[0.4, 0]} />
        ) : type === 'quest' ? (
          <boxGeometry args={[0.5, 0.5, 0.5]} />
        ) : (
          <sphereGeometry args={[0.3, 16, 16]} />
        )}
        <meshStandardMaterial
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={isInRange ? 1.0 : 0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Ground ring */}
      <mesh ref={ringRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial
          color={markerColor}
          transparent
          opacity={isInRange ? 0.6 : 0.3}
        />
      </mesh>

      {/* Interaction radius indicator (when in range) */}
      {isInRange && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 3, 32]} />
          <meshBasicMaterial color={markerColor} transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Ground plane for the world
 */
export function Ground({ size = 100 }: { size?: number }) {
  const gridTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 512, 512);

    // Grid lines
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 2;
    const gridSize = 64;

    for (let i = 0; i <= 512; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(size / 10, size / 10);
    return texture;
  }, [size]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={gridTexture} roughness={0.8} metalness={0.2} />
    </mesh>
  );
}
