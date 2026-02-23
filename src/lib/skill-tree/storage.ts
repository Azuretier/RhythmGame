import type { SkillTreeState } from './types';
import { SKILL_NODES, POINTS_PER_GAME, POINTS_PER_MP_WIN } from './definitions';

const STORAGE_KEY = 'rhythmia_skill_tree';

function getDefaultState(): SkillTreeState {
  return {
    skillPoints: 0,
    totalPointsEarned: 0,
    unlockedSkills: {},
  };
}

export function loadSkillTreeState(): SkillTreeState {
  if (typeof window === 'undefined') return getDefaultState();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...getDefaultState(),
        ...parsed,
      };
    }
  } catch {
    // corrupted data — return defaults
  }

  return getDefaultState();
}

export function saveSkillTreeState(state: SkillTreeState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or disabled
  }
}

/**
 * Check if a skill node can be unlocked (or upgraded) given the current state.
 */
export function canUnlockSkill(state: SkillTreeState, skillId: string): boolean {
  const node = SKILL_NODES.find((n) => n.id === skillId);
  if (!node) return false;

  const currentLevel = state.unlockedSkills[skillId] || 0;

  // Already maxed out
  if (currentLevel >= node.maxLevel) return false;

  // Not enough skill points
  if (state.skillPoints < node.cost) return false;

  // Check prerequisites — each must be at max level
  for (const reqId of node.requires) {
    const reqNode = SKILL_NODES.find((n) => n.id === reqId);
    if (!reqNode) return false;
    const reqLevel = state.unlockedSkills[reqId] || 0;
    if (reqLevel < reqNode.maxLevel) return false;
  }

  return true;
}

/**
 * Unlock (or upgrade by 1 level) a skill node. Returns updated state.
 */
export function unlockSkill(state: SkillTreeState, skillId: string): SkillTreeState {
  if (!canUnlockSkill(state, skillId)) return state;

  const node = SKILL_NODES.find((n) => n.id === skillId)!;
  const currentLevel = state.unlockedSkills[skillId] || 0;

  return {
    ...state,
    skillPoints: state.skillPoints - node.cost,
    unlockedSkills: {
      ...state.unlockedSkills,
      [skillId]: currentLevel + 1,
    },
  };
}

/**
 * Reset all skill points — refunds all spent points back to the pool.
 */
export function resetSkills(state: SkillTreeState): SkillTreeState {
  // Calculate spent points
  let spent = 0;
  for (const node of SKILL_NODES) {
    const level = state.unlockedSkills[node.id] || 0;
    spent += level * node.cost;
  }

  return {
    ...state,
    skillPoints: state.skillPoints + spent,
    unlockedSkills: {},
  };
}

/**
 * Award skill points for completing a game.
 */
export function awardGamePoints(state: SkillTreeState): SkillTreeState {
  return {
    ...state,
    skillPoints: state.skillPoints + POINTS_PER_GAME,
    totalPointsEarned: state.totalPointsEarned + POINTS_PER_GAME,
  };
}

/**
 * Award bonus skill points for a multiplayer win.
 */
export function awardMultiplayerWinPoints(state: SkillTreeState): SkillTreeState {
  return {
    ...state,
    skillPoints: state.skillPoints + POINTS_PER_MP_WIN,
    totalPointsEarned: state.totalPointsEarned + POINTS_PER_MP_WIN,
  };
}

/**
 * Get the current level of a skill.
 */
export function getSkillLevel(state: SkillTreeState, skillId: string): number {
  return state.unlockedSkills[skillId] || 0;
}

/**
 * Count total spent skill points.
 */
export function getTotalSpentPoints(state: SkillTreeState): number {
  let spent = 0;
  for (const node of SKILL_NODES) {
    const level = state.unlockedSkills[node.id] || 0;
    spent += level * node.cost;
  }
  return spent;
}
