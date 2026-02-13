'use client';

import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';

/** Common bone names for the head in GLTF character models */
const HEAD_BONE_NAMES = [
  'Head',
  'head',
  'HEAD',
  'mixamorigHead',
  'Bip01_Head',
  'J_Bip_C_Head',
  'Bone_Head',
  'head_bone',
];

export function useMouseTracking() {
  const mouseRef = useRef({ x: 0, y: 0 });
  const smoothRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position to [-1, 1]
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  /** Find the head bone in a model's skeleton */
  const findHeadBone = useCallback(
    (model: THREE.Object3D): THREE.Object3D | null => {
      let found: THREE.Object3D | null = null;
      model.traverse((child: THREE.Object3D) => {
        if (found) return;
        if (
          child instanceof THREE.Bone &&
          HEAD_BONE_NAMES.some(
            (name) =>
              child.name === name ||
              child.name.toLowerCase().includes('head')
          )
        ) {
          found = child;
        }
      });
      return found;
    },
    []
  );

  /**
   * Apply smooth mouse-following rotation to the head bone.
   * Call this AFTER the animation mixer update so it layers on top.
   */
  const updateTracking = useCallback(
    (
      headBone: THREE.Object3D | null,
      delta: number,
      maxAngle = 0.3,
      damping = 5
    ) => {
      if (!headBone) return;

      const mouse = mouseRef.current;

      // Compute target rotation from mouse position
      const targetX = -mouse.y * maxAngle * 0.5; // pitch (up/down)
      const targetY = mouse.x * maxAngle; // yaw (left/right)

      // Exponential smoothing
      const t = 1 - Math.exp(-damping * delta);
      smoothRotationRef.current.x +=
        (targetX - smoothRotationRef.current.x) * t;
      smoothRotationRef.current.y +=
        (targetY - smoothRotationRef.current.y) * t;

      // Apply as additive rotation on top of animation
      headBone.rotation.x += smoothRotationRef.current.x;
      headBone.rotation.y += smoothRotationRef.current.y;
    },
    []
  );

  const getMousePosition = useCallback(() => mouseRef.current, []);

  return { updateTracking, findHeadBone, getMousePosition };
}
