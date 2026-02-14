'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Skill, SkillState, SkillCastEvent } from '@/types/skills';

/**
 * Hook for managing skill states, cooldowns, and casting.
 */
export function useSkills(skills: Skill[], currentMana: number) {
  const [skillStates, setSkillStates] = useState<Map<string, SkillState>>(() => {
    const initialStates = new Map<string, SkillState>();
    skills.forEach((skill) => {
      initialStates.set(skill.id, {
        skill,
        cooldownRemaining: 0,
        isOnCooldown: false,
        isCasting: false,
        level: 1,
      });
    });
    return initialStates;
  });

  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  // Update cooldowns every frame
  useEffect(() => {
    const updateCooldowns = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000; // Convert to seconds
      lastUpdateRef.current = now;

      setSkillStates((prevStates) => {
        const newStates = new Map(prevStates);
        let hasChanges = false;

        newStates.forEach((state, id) => {
          if (state.cooldownRemaining > 0) {
            const newCooldown = Math.max(0, state.cooldownRemaining - deltaTime);
            newStates.set(id, {
              ...state,
              cooldownRemaining: newCooldown,
              isOnCooldown: newCooldown > 0,
            });
            hasChanges = true;
          }
        });

        return hasChanges ? newStates : prevStates;
      });

      animationFrameRef.current = requestAnimationFrame(updateCooldowns);
    };

    animationFrameRef.current = requestAnimationFrame(updateCooldowns);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const canCastSkill = useCallback(
    (skillId: string): { canCast: boolean; reason?: string } => {
      const state = skillStates.get(skillId);
      if (!state) {
        return { canCast: false, reason: 'Skill not found' };
      }

      if (state.isOnCooldown) {
        return { canCast: false, reason: `On cooldown (${state.cooldownRemaining.toFixed(1)}s)` };
      }

      if (state.isCasting) {
        return { canCast: false, reason: 'Already casting' };
      }

      if (currentMana < state.skill.manaCost) {
        return { canCast: false, reason: 'Not enough mana' };
      }

      return { canCast: true };
    },
    [skillStates, currentMana]
  );

  const castSkill = useCallback(
    (
      skillId: string,
      position: { x: number; y: number; z: number },
      target?: { x: number; y: number; z: number }
    ): SkillCastEvent | null => {
      const { canCast, reason } = canCastSkill(skillId);
      
      if (!canCast) {
        console.warn(`Cannot cast skill ${skillId}: ${reason}`);
        return null;
      }

      const state = skillStates.get(skillId);
      if (!state) return null;

      // Start cooldown
      setSkillStates((prevStates) => {
        const newStates = new Map(prevStates);
        newStates.set(skillId, {
          ...state,
          cooldownRemaining: state.skill.cooldown,
          isOnCooldown: true,
          isCasting: true,
        });
        return newStates;
      });

      // End casting after a short delay
      setTimeout(() => {
        setSkillStates((prevStates) => {
          const newStates = new Map(prevStates);
          const currentState = newStates.get(skillId);
          if (currentState) {
            newStates.set(skillId, {
              ...currentState,
              isCasting: false,
            });
          }
          return newStates;
        });
      }, 300); // 300ms cast animation

      // Return cast event
      return {
        skill: state.skill,
        position,
        target,
        timestamp: Date.now(),
      };
    },
    [canCastSkill, skillStates]
  );

  const getSkillState = useCallback(
    (skillId: string): SkillState | undefined => {
      return skillStates.get(skillId);
    },
    [skillStates]
  );

  const getAllSkillStates = useCallback((): SkillState[] => {
    return Array.from(skillStates.values());
  }, [skillStates]);

  const resetCooldowns = useCallback(() => {
    setSkillStates((prevStates) => {
      const newStates = new Map(prevStates);
      newStates.forEach((state, id) => {
        newStates.set(id, {
          ...state,
          cooldownRemaining: 0,
          isOnCooldown: false,
          isCasting: false,
        });
      });
      return newStates;
    });
  }, []);

  return {
    skillStates: getAllSkillStates(),
    canCastSkill,
    castSkill,
    getSkillState,
    resetCooldowns,
  };
}
