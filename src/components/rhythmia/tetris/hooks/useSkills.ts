import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SkillSlot,
  SkillDefinition,
  SkillState,
  SkillCastEvent,
  ActiveSkillEffect,
  SkillLoadout,
} from '@/lib/character-interaction/types';
import { SKILL_MAP } from '@/lib/character-interaction/skills';
import { CHARACTER_MAP } from '@/lib/character-interaction/characters';
import { GLOBAL_COOLDOWN, MAX_ACTIVE_EFFECTS } from '@/lib/character-interaction/constants';

let nextEffectId = 0;

export interface SkillSystemState {
  /** Current skill loadout */
  loadout: SkillLoadout | null;
  /** State for each skill slot */
  skillStates: Record<SkillSlot, SkillState | null>;
  /** Active timed effects */
  activeEffects: ActiveSkillEffect[];
  /** Last skill cast event (for VFX) */
  lastCastEvent: SkillCastEvent | null;
  /** Available mana (derived from score) */
  mana: number;
  /** Whether the global cooldown is active */
  isGlobalCooldown: boolean;
}

const EMPTY_SKILL_STATES: Record<SkillSlot, SkillState | null> = {
  Q: null, W: null, E: null, R: null,
};

export function useSkills() {
  const [loadout, setLoadout] = useState<SkillLoadout | null>(null);
  const [skillStates, setSkillStates] = useState<Record<SkillSlot, SkillState | null>>(EMPTY_SKILL_STATES);
  const [activeEffects, setActiveEffects] = useState<ActiveSkillEffect[]>([]);
  const [lastCastEvent, setLastCastEvent] = useState<SkillCastEvent | null>(null);
  const [mana, setMana] = useState(0);
  const [isGlobalCooldown, setIsGlobalCooldown] = useState(false);

  const globalCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Load skill loadout from a character */
  const loadCharacterSkills = useCallback((characterId: string) => {
    const character = CHARACTER_MAP[characterId];
    if (!character) return;

    const skills: Record<SkillSlot, SkillDefinition | null> = { Q: null, W: null, E: null, R: null };

    for (const skillId of character.skillLoadout) {
      const skill = SKILL_MAP[skillId];
      if (skill) {
        skills[skill.slot] = skill;
      }
    }

    const newLoadout: SkillLoadout = { characterId, skills };
    setLoadout(newLoadout);

    // Initialize skill states
    const states: Record<SkillSlot, SkillState | null> = { Q: null, W: null, E: null, R: null };
    for (const slot of ['Q', 'W', 'E', 'R'] as SkillSlot[]) {
      const skill = skills[slot];
      if (skill) {
        states[slot] = {
          skillId: skill.id,
          slot,
          lastCastTime: 0,
          isOnCooldown: false,
          cooldownRemaining: 0,
          isActive: false,
          activeUntil: 0,
        };
      }
    }
    setSkillStates(states);
  }, []);

  /** Update mana from score */
  const updateMana = useCallback((score: number) => {
    setMana(score);
  }, []);

  /** Check if a skill can be cast */
  const canCastSkill = useCallback((slot: SkillSlot): boolean => {
    if (isGlobalCooldown) return false;

    const state = skillStates[slot];
    if (!state) return false;

    const skill = loadout?.skills[slot];
    if (!skill) return false;

    if (state.isOnCooldown) return false;
    if (mana < skill.manaCost) return false;

    return true;
  }, [isGlobalCooldown, skillStates, loadout, mana]);

  /** Cast a skill — returns the cast event or null if failed */
  const castSkill = useCallback((slot: SkillSlot): SkillCastEvent | null => {
    if (!canCastSkill(slot)) return null;

    const skill = loadout?.skills[slot];
    if (!skill) return null;

    const now = Date.now();

    // Deduct mana
    setMana(prev => prev - skill.manaCost);

    // Create cast event
    const castEvent: SkillCastEvent = {
      skillId: skill.id,
      slot,
      timestamp: now,
      effects: skill.effects,
      targetType: skill.targetType,
    };
    setLastCastEvent(castEvent);

    // Set skill on cooldown
    setSkillStates(prev => ({
      ...prev,
      [slot]: {
        ...prev[slot]!,
        lastCastTime: now,
        isOnCooldown: true,
        cooldownRemaining: skill.cooldown,
      },
    }));

    // Start global cooldown
    setIsGlobalCooldown(true);
    if (globalCooldownTimerRef.current) {
      clearTimeout(globalCooldownTimerRef.current);
    }
    globalCooldownTimerRef.current = setTimeout(() => {
      setIsGlobalCooldown(false);
    }, GLOBAL_COOLDOWN);

    // Resolve cooldown after duration
    setTimeout(() => {
      setSkillStates(prev => {
        const state = prev[slot];
        if (state && state.lastCastTime === now) {
          return {
            ...prev,
            [slot]: { ...state, isOnCooldown: false, cooldownRemaining: 0 },
          };
        }
        return prev;
      });
    }, skill.cooldown);

    // Create active effects for duration-based effects
    const newEffects: ActiveSkillEffect[] = [];
    for (const effect of skill.effects) {
      if (effect.duration && effect.duration > 0) {
        newEffects.push({
          id: nextEffectId++,
          skillId: skill.id,
          effectType: effect.type,
          value: effect.value,
          startTime: now,
          endTime: now + effect.duration,
          radius: effect.radius,
        });

        // Mark skill as active
        setSkillStates(prev => ({
          ...prev,
          [slot]: {
            ...prev[slot]!,
            isActive: true,
            activeUntil: now + effect.duration,
          },
        }));

        // Clear active state after duration
        setTimeout(() => {
          setSkillStates(prev => {
            const state = prev[slot];
            if (state && state.activeUntil === now + effect.duration!) {
              return {
                ...prev,
                [slot]: { ...state, isActive: false, activeUntil: 0 },
              };
            }
            return prev;
          });
        }, effect.duration);
      }
    }

    if (newEffects.length > 0) {
      setActiveEffects(prev => [...prev, ...newEffects].slice(-MAX_ACTIVE_EFFECTS));

      // Schedule cleanup of expired effects
      const maxDuration = Math.max(...newEffects.map(e => e.endTime - e.startTime));
      setTimeout(() => {
        setActiveEffects(prev => prev.filter(e => e.endTime > Date.now()));
      }, maxDuration + 100);
    }

    return castEvent;
  }, [canCastSkill, loadout]);

  /** Get current damage multiplier from active buff effects */
  const getSkillDamageMultiplier = useCallback((): number => {
    const now = Date.now();
    let multiplier = 1;
    for (const effect of activeEffects) {
      if (effect.effectType === 'buff_damage' && effect.endTime > now) {
        multiplier *= effect.value;
      }
    }
    return multiplier;
  }, [activeEffects]);

  /** Get current shield reduction from active shield effects */
  const getShieldReduction = useCallback((): number => {
    const now = Date.now();
    for (const effect of activeEffects) {
      if (effect.effectType === 'shield' && effect.endTime > now) {
        return effect.value;  // Return reduction multiplier (e.g., 0.5 = 50% reduction)
      }
    }
    return 0;  // No shield active
  }, [activeEffects]);

  /** Update cooldown timers (call from game loop) */
  const updateCooldowns = useCallback(() => {
    const now = Date.now();
    setSkillStates(prev => {
      let changed = false;
      const next = { ...prev };
      for (const slot of ['Q', 'W', 'E', 'R'] as SkillSlot[]) {
        const state = next[slot];
        if (state && state.isOnCooldown) {
          const remaining = Math.max(0, (state.lastCastTime + (loadout?.skills[slot]?.cooldown || 0)) - now);
          if (remaining !== state.cooldownRemaining) {
            next[slot] = { ...state, cooldownRemaining: remaining };
            changed = true;
          }
          if (remaining <= 0 && state.isOnCooldown) {
            next[slot] = { ...state, isOnCooldown: false, cooldownRemaining: 0 };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [loadout]);

  /** Reset all skills */
  const resetSkills = useCallback(() => {
    setSkillStates(EMPTY_SKILL_STATES);
    setActiveEffects([]);
    setLastCastEvent(null);
    setMana(0);
    setIsGlobalCooldown(false);
    setLoadout(null);
    nextEffectId = 0;
  }, []);

  // Update cooldowns periodically
  useEffect(() => {
    cooldownIntervalRef.current = setInterval(updateCooldowns, 100);
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [updateCooldowns]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (globalCooldownTimerRef.current) {
        clearTimeout(globalCooldownTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    loadout,
    skillStates,
    activeEffects,
    lastCastEvent,
    mana,
    isGlobalCooldown,

    // Actions
    loadCharacterSkills,
    updateMana,
    canCastSkill,
    castSkill,
    getSkillDamageMultiplier,
    getShieldReduction,
    updateCooldowns,
    resetSkills,
  };
}
