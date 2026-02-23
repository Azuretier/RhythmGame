'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { SkillTreeState, Archetype } from './types';
import {
  loadSkillTreeState,
  saveSkillTreeState,
  selectArchetype as selectArchetypeFn,
  unlockSkill as unlockSkillFn,
  resetSkills as resetSkillsFn,
  awardGamePoints as awardGamePointsFn,
  awardMultiplayerWinPoints as awardMultiplayerWinPointsFn,
  canUnlockSkill as canUnlockSkillFn,
  getSkillLevel as getSkillLevelFn,
  getTotalSpentPoints,
} from './storage';
import { syncUserDataToFirestore } from '@/lib/google-sync/firestore';
import { auth } from '@/lib/rhythmia/firebase';
import { isGoogleLinked } from '@/lib/google-sync/service';

interface SkillTreeContextType {
  state: SkillTreeState;
  /** Select (or switch) archetype — resets skills and refunds points */
  selectArchetype: (archetype: Archetype) => void;
  /** Unlock or upgrade a skill by one level */
  unlockSkill: (skillId: string) => boolean;
  /** Reset all skills, refunding spent points */
  resetAllSkills: () => void;
  /** Award points for completing a game */
  awardGamePoints: () => void;
  /** Award bonus points for a multiplayer win */
  awardMultiplayerWinPoints: () => void;
  /** Check if a skill can be unlocked/upgraded */
  canUnlock: (skillId: string) => boolean;
  /** Get current level of a skill */
  getLevel: (skillId: string) => number;
  /** Total points currently spent */
  totalSpent: number;
  /** Restore state from cloud (skips Firestore write-back) */
  restoreSkillTree: (restored: SkillTreeState) => void;
}

const SkillTreeContext = createContext<SkillTreeContextType | undefined>(undefined);

export function SkillTreeProvider({ children }: { children: ReactNode }) {
  // stateRef always holds the latest committed state, updated eagerly
  // before React re-renders. This prevents stale reads when multiple
  // mutations fire in the same tick (e.g. awardGamePoints + awardMultiplayerWinPoints).
  const stateRef = useRef<SkillTreeState>(loadSkillTreeState());
  const [state, setState] = useState<SkillTreeState>(() => stateRef.current);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadSkillTreeState();
    stateRef.current = loaded;
    setState(loaded);
  }, []);

  // Listen for skill-tree-restored events from GoogleSyncProvider
  useEffect(() => {
    const handleRestored = (event: CustomEvent<SkillTreeState>) => {
      stateRef.current = event.detail;
      setState(event.detail);
      saveSkillTreeState(event.detail);
    };

    window.addEventListener('skill-tree-restored', handleRestored as EventListener);
    return () => {
      window.removeEventListener('skill-tree-restored', handleRestored as EventListener);
    };
  }, []);

  const syncToCloud = useCallback((newState: SkillTreeState) => {
    if (auth?.currentUser && isGoogleLinked(auth.currentUser)) {
      syncUserDataToFirestore(auth.currentUser.uid, { skillTree: newState });
    }
  }, []);

  /** Eagerly commit an updated state to ref, React, localStorage, and cloud. */
  const commitUpdate = useCallback(
    (updated: SkillTreeState) => {
      stateRef.current = updated;
      setState(updated);
      saveSkillTreeState(updated);
      syncToCloud(updated);
    },
    [syncToCloud]
  );

  const selectArchetype = useCallback(
    (archetype: Archetype) => {
      commitUpdate(selectArchetypeFn(stateRef.current, archetype));
    },
    [commitUpdate]
  );

  const unlockSkill = useCallback(
    (skillId: string): boolean => {
      const current = stateRef.current;
      if (!canUnlockSkillFn(current, skillId)) return false;
      commitUpdate(unlockSkillFn(current, skillId));
      return true;
    },
    [commitUpdate]
  );

  const resetAllSkills = useCallback(() => {
    commitUpdate(resetSkillsFn(stateRef.current));
  }, [commitUpdate]);

  const awardGamePoints = useCallback(() => {
    commitUpdate(awardGamePointsFn(stateRef.current));
  }, [commitUpdate]);

  const awardMultiplayerWinPoints = useCallback(() => {
    commitUpdate(awardMultiplayerWinPointsFn(stateRef.current));
  }, [commitUpdate]);

  const canUnlock = useCallback(
    (skillId: string) => {
      return canUnlockSkillFn(state, skillId);
    },
    [state]
  );

  const getLevel = useCallback(
    (skillId: string) => {
      return getSkillLevelFn(state, skillId);
    },
    [state]
  );

  const totalSpent = getTotalSpentPoints(state);

  const restoreSkillTree = useCallback((restored: SkillTreeState) => {
    stateRef.current = restored;
    setState(restored);
    saveSkillTreeState(restored);
  }, []);

  return (
    <SkillTreeContext.Provider
      value={{
        state,
        selectArchetype,
        unlockSkill,
        resetAllSkills,
        awardGamePoints,
        awardMultiplayerWinPoints,
        canUnlock,
        getLevel,
        totalSpent,
        restoreSkillTree,
      }}
    >
      {children}
    </SkillTreeContext.Provider>
  );
}

export function useSkillTree() {
  const context = useContext(SkillTreeContext);
  if (context === undefined) {
    throw new Error('useSkillTree must be used within a SkillTreeProvider');
  }
  return context;
}
