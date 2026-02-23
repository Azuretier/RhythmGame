'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { SkillTreeState } from './types';
import {
  loadSkillTreeState,
  saveSkillTreeState,
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
  const [state, setState] = useState<SkillTreeState>(() => loadSkillTreeState());

  // Load from localStorage on mount
  useEffect(() => {
    setState(loadSkillTreeState());
  }, []);

  // Listen for skill-tree-restored events from GoogleSyncProvider
  useEffect(() => {
    const handleRestored = (event: CustomEvent<SkillTreeState>) => {
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

  const unlockSkill = useCallback((skillId: string): boolean => {
    const current = loadSkillTreeState();
    if (!canUnlockSkillFn(current, skillId)) return false;

    const updated = unlockSkillFn(current, skillId);
    setState(updated);
    saveSkillTreeState(updated);
    syncToCloud(updated);
    return true;
  }, [syncToCloud]);

  const resetAllSkills = useCallback(() => {
    const current = loadSkillTreeState();
    const updated = resetSkillsFn(current);
    setState(updated);
    saveSkillTreeState(updated);
    syncToCloud(updated);
  }, [syncToCloud]);

  const awardGamePoints = useCallback(() => {
    const current = loadSkillTreeState();
    const updated = awardGamePointsFn(current);
    setState(updated);
    saveSkillTreeState(updated);
    syncToCloud(updated);
  }, [syncToCloud]);

  const awardMultiplayerWinPoints = useCallback(() => {
    const current = loadSkillTreeState();
    const updated = awardMultiplayerWinPointsFn(current);
    setState(updated);
    saveSkillTreeState(updated);
    syncToCloud(updated);
  }, [syncToCloud]);

  const canUnlock = useCallback((skillId: string) => {
    return canUnlockSkillFn(state, skillId);
  }, [state]);

  const getLevel = useCallback((skillId: string) => {
    return getSkillLevelFn(state, skillId);
  }, [state]);

  const totalSpent = getTotalSpentPoints(state);

  const restoreSkillTree = useCallback((restored: SkillTreeState) => {
    setState(restored);
    saveSkillTreeState(restored);
  }, []);

  return (
    <SkillTreeContext.Provider
      value={{
        state,
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
