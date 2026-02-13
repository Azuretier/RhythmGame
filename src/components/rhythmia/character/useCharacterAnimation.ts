'use client';

import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { AnimationState } from '@/types/dialog';

/** Maps AnimationState to potential clip names found in GLTF models */
const ANIMATION_CLIP_NAMES: Record<AnimationState, string[]> = {
  idle: ['Idle', 'idle', 'IDLE', 'Stand', 'Breathing', 'idle_loop'],
  talking: ['Talk', 'talk', 'Talking', 'Speak', 'speaking'],
  thinking: ['Think', 'think', 'Thinking', 'Ponder'],
  surprised: ['Surprise', 'surprise', 'Surprised', 'Jump', 'Shock'],
  wave: ['Wave', 'wave', 'Greet', 'Hello', 'greeting'],
  happy: ['Happy', 'happy', 'Joy', 'Dance', 'Laugh', 'laugh'],
  sad: ['Sad', 'sad', 'Cry', 'Sigh', 'disappointed'],
};

interface AnimationSetupConfig {
  mixer: THREE.AnimationMixer;
  clips: THREE.AnimationClip[];
}

export function useCharacterAnimation() {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const currentStateRef = useRef<AnimationState>('idle');
  const proceduralTimeRef = useRef(0);
  const basePositionYRef = useRef<number | null>(null);

  const setup = useCallback(({ mixer, clips }: AnimationSetupConfig) => {
    mixerRef.current = mixer;
    actionsRef.current.clear();

    clips.forEach((clip) => {
      const action = mixer.clipAction(clip);
      actionsRef.current.set(clip.name, action);
    });
  }, []);

  const findAction = useCallback(
    (state: AnimationState): THREE.AnimationAction | null => {
      const candidates = ANIMATION_CLIP_NAMES[state] || [];
      for (const name of candidates) {
        const action = actionsRef.current.get(name);
        if (action) return action;
      }
      // Fallback: for idle, use the first available clip
      if (state === 'idle' && actionsRef.current.size > 0) {
        return actionsRef.current.values().next().value ?? null;
      }
      return null;
    },
    []
  );

  const transition = useCallback(
    (state: AnimationState, crossfadeDuration = 0.3) => {
      currentStateRef.current = state;

      const nextAction = findAction(state);
      if (!nextAction) return;
      if (currentActionRef.current === nextAction) return;

      if (currentActionRef.current) {
        currentActionRef.current.fadeOut(crossfadeDuration);
      }

      nextAction.reset().fadeIn(crossfadeDuration).play();
      currentActionRef.current = nextAction;
    },
    [findAction]
  );

  /** Call every frame to update the animation mixer and apply procedural idle */
  const update = useCallback(
    (delta: number, modelRoot: THREE.Object3D | null) => {
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      // Procedural idle when no animation clips are playing
      if (!currentActionRef.current && modelRoot) {
        if (basePositionYRef.current === null) {
          basePositionYRef.current = modelRoot.position.y;
        }

        proceduralTimeRef.current += delta;
        const t = proceduralTimeRef.current;

        // Gentle breathing bob
        const breathe = Math.sin(t * 1.5) * 0.015;
        modelRoot.position.y = basePositionYRef.current + breathe;

        // Slight body sway
        modelRoot.rotation.z = Math.sin(t * 0.8) * 0.008;
      }
    },
    []
  );

  const getCurrentState = useCallback(() => currentStateRef.current, []);

  return { setup, transition, update, getCurrentState };
}
