import type { SkillTreeState, Archetype } from './types';
import { SKILL_NODES, POINTS_PER_GAME, POINTS_PER_MP_WIN } from './definitions';

const STORAGE_KEY = 'rhythmia_skill_tree';

function getDefaultState(): SkillTreeState {
  return {
    archetype: null,
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
 * Select an archetype. Resets all skills and refunds points.
 */
export function selectArchetype(
  state: SkillTreeState,
  archetype: Archetype
): SkillTreeState {
  // Refund any spent points from previous archetype
  let refunded = 0;
  for (const node of SKILL_NODES) {
    const level = state.unlockedSkills[node.id] || 0;
    refunded += level * node.cost;
  }

  return {
    ...state,
    archetype,
    skillPoints: state.skillPoints + refunded,
    unlockedSkills: {},
  };
}

/**
 * Check if a skill node can be unlocked (or upgraded) given the current state.
 */
export function canUnlockSkill(state: SkillTreeState, skillId: string): boolean {
  const node = SKILL_NODES.find((n) => n.id === skillId);
  if (!node) return false;

  // Must match active archetype
  if (node.archetype !== state.archetype) return false;

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

/**
 * Merge two skill tree states from different devices.
 *
 * When archetypes match (or one is null), merges unlockedSkills by taking
 * the higher level for each skill. When archetypes differ, keeps the state
 * with more totalPointsEarned (different archetype trees can't be merged).
 * Recalculates skillPoints to stay consistent.
 */
export function mergeSkillTreeStates(
  local: SkillTreeState,
  remote: SkillTreeState
): SkillTreeState {
  const sameArchetype =
    local.archetype === remote.archetype ||
    local.archetype === null ||
    remote.archetype === null;

  if (!sameArchetype) {
    // Different archetypes — can't merge skill trees, take the more-progressed one
    return local.totalPointsEarned >= remote.totalPointsEarned ? local : remote;
  }

  // Resolve archetype (pick the non-null one, or the shared value)
  const archetype = local.archetype ?? remote.archetype;

  // Merge unlocked skills — take the higher level for each
  const allSkillIds = new Set([
    ...Object.keys(local.unlockedSkills),
    ...Object.keys(remote.unlockedSkills),
  ]);
  const mergedSkills: Record<string, number> = {};
  for (const id of allSkillIds) {
    const max = Math.max(
      local.unlockedSkills[id] || 0,
      remote.unlockedSkills[id] || 0
    );
    if (max > 0) mergedSkills[id] = max;
  }

  const totalPointsEarned = Math.max(
    local.totalPointsEarned,
    remote.totalPointsEarned
  );

  // Recalculate available points: total earned minus what's spent on merged skills
  let spent = 0;
  for (const node of SKILL_NODES) {
    spent += (mergedSkills[node.id] || 0) * node.cost;
  }
  const skillPoints = Math.max(0, totalPointsEarned - spent);

  return { archetype, skillPoints, totalPointsEarned, unlockedSkills: mergedSkills };
}
