'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SkillCastEvent } from '@/types/skills';

interface SkillEffectProps {
  castEvent: SkillCastEvent;
  onComplete?: () => void;
}

/**
 * Visual effect for a fireball projectile
 */
export function FireballEffect({ castEvent, onComplete }: SkillEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const [completed, setCompleted] = useState(false);
  const startTime = useRef(Date.now());
  
  const startPos = castEvent.position;
  const targetPos = castEvent.target || {
    x: startPos.x,
    y: startPos.y,
    z: startPos.z - 15,
  };

  useFrame(() => {
    if (!meshRef.current || completed) return;

    const elapsed = (Date.now() - startTime.current) / 1000;
    const duration = 1.5; // seconds
    const progress = Math.min(elapsed / duration, 1);

    // Lerp position for main fireball
    meshRef.current.position.x = THREE.MathUtils.lerp(startPos.x, targetPos.x, progress);
    meshRef.current.position.y = THREE.MathUtils.lerp(startPos.y + 1, targetPos.y + 1, progress);
    meshRef.current.position.z = THREE.MathUtils.lerp(startPos.z, targetPos.z, progress);

    // Trail follows slightly behind
    if (trailRef.current) {
      const trailProgress = Math.max(0, progress - 0.1);
      trailRef.current.position.x = THREE.MathUtils.lerp(startPos.x, targetPos.x, trailProgress);
      trailRef.current.position.y = THREE.MathUtils.lerp(startPos.y + 1, targetPos.y + 1, trailProgress);
      trailRef.current.position.z = THREE.MathUtils.lerp(startPos.z, targetPos.z, trailProgress);
    }

    // Rotate
    meshRef.current.rotation.x += 0.1;
    meshRef.current.rotation.y += 0.15;

    if (progress >= 1 && !completed) {
      setCompleted(true);
      onComplete?.();
    }
  });

  if (completed) return null;

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color="#ff6b35"
          emissive="#ff6b35"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      {/* Trail particles */}
      <mesh ref={trailRef}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial
          color="#ff6b35"
          emissive="#ff6b35"
          emissiveIntensity={1.5}
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Visual effect for ice shield
 */
export function IceShieldEffect({ castEvent, onComplete }: SkillEffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [completed, setCompleted] = useState(false);
  const startTime = useRef(Date.now());

  useFrame(() => {
    if (!groupRef.current || completed) return;

    const elapsed = (Date.now() - startTime.current) / 1000;
    const duration = 3; // shield lasts 3 seconds

    // Pulse animation
    const pulse = 1 + Math.sin(elapsed * 5) * 0.1;
    groupRef.current.scale.setScalar(pulse);

    // Rotate
    groupRef.current.rotation.y += 0.02;

    if (elapsed >= duration && !completed) {
      setCompleted(true);
      onComplete?.();
    }
  });

  if (completed) return null;

  const pos = castEvent.position;

  return (
    <group
      ref={groupRef}
      position={[pos.x, pos.y + 1, pos.z]}
    >
      {/* Shield hexagons */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 1.2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              0,
              Math.sin(angle) * radius,
            ]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[0.6, 0.7, 0.1]} />
            <meshStandardMaterial
              color="#4ecdc4"
              emissive="#4ecdc4"
              emissiveIntensity={0.8}
              transparent
              opacity={0.6}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Visual effect for lightning dash
 */
export function LightningDashEffect({ castEvent, onComplete }: SkillEffectProps) {
  const [completed, setCompleted] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      setCompleted(true);
      onComplete?.();
    }, 300);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (completed) return null;

  const pos = castEvent.position;

  return (
    <group position={[pos.x, pos.y + 1, pos.z]}>
      {/* Lightning bolt effect */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={i}
          position={[0, i * 0.3, -i * 0.5]}
          rotation={[0, Math.random() * Math.PI * 2, 0]}
        >
          <boxGeometry args={[0.1, 0.5, 0.1]} />
          <meshStandardMaterial
            color="#f7b731"
            emissive="#f7b731"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Visual effect for meteor strike
 */
export function MeteorStrikeEffect({ castEvent, onComplete }: SkillEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [completed, setCompleted] = useState(false);
  const startTime = useRef(Date.now());

  const targetPos = castEvent.target || castEvent.position;

  useFrame(() => {
    if (!meshRef.current || completed) return;

    const elapsed = (Date.now() - startTime.current) / 1000;
    const duration = 2; // seconds
    const progress = Math.min(elapsed / duration, 1);

    // Fall from sky
    const startY = 20;
    const endY = 0.5;
    meshRef.current.position.x = targetPos.x;
    meshRef.current.position.y = THREE.MathUtils.lerp(startY, endY, progress);
    meshRef.current.position.z = targetPos.z;

    // Rotate
    meshRef.current.rotation.x += 0.05;
    meshRef.current.rotation.z += 0.03;

    // Scale up as it falls
    const scale = THREE.MathUtils.lerp(0.5, 2, progress);
    meshRef.current.scale.setScalar(scale);

    if (progress >= 1 && !completed) {
      setCompleted(true);
      onComplete?.();
    }
  });

  if (completed) return null;

  return (
    <group>
      {/* Meteor */}
      <mesh ref={meshRef} castShadow>
        <icosahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial
          color="#ee5a6f"
          emissive="#ee5a6f"
          emissiveIntensity={2}
          roughness={0.5}
          toneMapped={false}
        />
      </mesh>
      
      {/* Impact area indicator */}
      <mesh
        position={[targetPos.x, 0.02, targetPos.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[4, 5, 32]} />
        <meshBasicMaterial
          color="#ee5a6f"
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

/**
 * Manager component for all active skill effects
 */
interface SkillEffectsManagerProps {
  activeEffects: SkillCastEvent[];
  onEffectComplete: (effectId: number) => void;
}

export function SkillEffectsManager({
  activeEffects,
  onEffectComplete,
}: SkillEffectsManagerProps) {
  return (
    <group>
      {activeEffects.map((effect, index) => {
        const handleComplete = () => onEffectComplete(index);

        switch (effect.skill.id) {
          case 'fireball':
            return (
              <FireballEffect
                key={`${effect.skill.id}-${effect.timestamp}`}
                castEvent={effect}
                onComplete={handleComplete}
              />
            );
          case 'ice_shield':
            return (
              <IceShieldEffect
                key={`${effect.skill.id}-${effect.timestamp}`}
                castEvent={effect}
                onComplete={handleComplete}
              />
            );
          case 'lightning_dash':
            return (
              <LightningDashEffect
                key={`${effect.skill.id}-${effect.timestamp}`}
                castEvent={effect}
                onComplete={handleComplete}
              />
            );
          case 'meteor_strike':
            return (
              <MeteorStrikeEffect
                key={`${effect.skill.id}-${effect.timestamp}`}
                castEvent={effect}
                onComplete={handleComplete}
              />
            );
          default:
            return null;
        }
      })}
    </group>
  );
}
