import type { ScoreRankingState, ScoreRankingStats } from './types';

function getDefaultStats(): ScoreRankingStats {
  return {
    totalScore: 0,
    bestScorePerGame: 0,
    totalGamesPlayed: 0,
    advancementsUnlocked: 0,
    totalLines: 0,
  };
}

/**
 * Build a ScoreRankingState from advancement/gameplay stats.
 * The score ranking system derives entirely from gameplay data -
 * no separate XP tracking needed.
 */
export function buildScoreRankingState(
  totalScore: number,
  bestScorePerGame: number,
  totalGamesPlayed: number,
  advancementsUnlocked: number,
  totalLines: number,
): ScoreRankingState {
  return {
    stats: {
      totalScore,
      bestScorePerGame,
      totalGamesPlayed,
      advancementsUnlocked,
      totalLines,
    },
  };
}

// ===== Legacy API stubs for backward compat =====
// These no-ops allow existing callers to compile without breaking.

export function loadLoyaltyState(): ScoreRankingState {
  return { stats: getDefaultStats() };
}

export function saveLoyaltyState(_state: ScoreRankingState): void {
  // Score ranking state is derived from advancement stats,
  // no separate persistence needed.
}

export function recordDailyVisit(): ScoreRankingState {
  return { stats: getDefaultStats() };
}

export function syncFromGameplay(
  gamesPlayed: number,
  totalScore: number,
  advancementsUnlocked: number,
): ScoreRankingState {
  return buildScoreRankingState(totalScore, 0, gamesPlayed, advancementsUnlocked, 0);
}

export function recordPollVote(): ScoreRankingState {
  return { stats: getDefaultStats() };
}
