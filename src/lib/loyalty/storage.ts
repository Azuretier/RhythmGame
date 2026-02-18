import type { ScoreRankingState, ScoreRankingStats } from './types';
import { XP_REWARDS } from './constants';

const STORAGE_KEY = 'rhythmia_loyalty';

function getDefaultStats(): ScoreRankingStats {
  const today = new Date().toISOString().split('T')[0];
  return {
    totalScore: 0,
    bestScorePerGame: 0,
    totalGamesPlayed: 0,
    advancementsUnlocked: 0,
    totalLines: 0,
    totalVisits: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastVisitDate: '',
    dailyBonusXP: 0,
  };
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function isYesterday(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
}

/**
 * Build a ScoreRankingState from advancement/gameplay stats + daily bonus data.
 * The score ranking system combines gameplay score with daily bonus XP.
 */
export function buildScoreRankingState(
  totalScore: number,
  bestScorePerGame: number,
  totalGamesPlayed: number,
  advancementsUnlocked: number,
  totalLines: number,
  totalVisits?: number,
  currentStreak?: number,
  bestStreak?: number,
  lastVisitDate?: string,
  dailyBonusXP?: number,
): ScoreRankingState {
  const stats: ScoreRankingStats = {
    totalScore,
    bestScorePerGame,
    totalGamesPlayed,
    advancementsUnlocked,
    totalLines,
    totalVisits: totalVisits ?? 0,
    currentStreak: currentStreak ?? 0,
    bestStreak: bestStreak ?? 0,
    lastVisitDate: lastVisitDate ?? '',
    dailyBonusXP: dailyBonusXP ?? 0,
  };
  return {
    stats,
    combinedScore: totalScore + (dailyBonusXP ?? 0),
  };
}

// ===== Persistence and Daily Visit Tracking =====

/**
 * Load daily bonus state from localStorage.
 */
export function loadDailyBonusState(): ScoreRankingState {
  if (typeof window === 'undefined') {
    return { stats: getDefaultStats(), combinedScore: 0 };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const stats = { ...getDefaultStats(), ...parsed.stats };
      return {
        stats,
        combinedScore: stats.totalScore + stats.dailyBonusXP,
      };
    }
  } catch {}

  return { stats: getDefaultStats(), combinedScore: 0 };
}

/**
 * Save daily bonus state to localStorage.
 */
export function saveDailyBonusState(state: ScoreRankingState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Record a daily visit. Updates streak, visit count, and awards XP.
 * Returns the updated state with new daily bonus XP.
 */
export function recordDailyVisit(): ScoreRankingState {
  const state = loadDailyBonusState();
  const today = getToday();

  // Already visited today
  if (state.stats.lastVisitDate === today) {
    return state;
  }

  state.stats.totalVisits += 1;

  // Update streak
  if (isYesterday(state.stats.lastVisitDate)) {
    state.stats.currentStreak += 1;
  } else if (state.stats.lastVisitDate !== today) {
    state.stats.currentStreak = 1;
  }

  if (state.stats.currentStreak > state.stats.bestStreak) {
    state.stats.bestStreak = state.stats.currentStreak;
  }

  state.stats.lastVisitDate = today;

  // Award XP
  state.stats.dailyBonusXP += XP_REWARDS.dailyVisit;
  state.stats.dailyBonusXP += XP_REWARDS.streakDay * Math.min(state.stats.currentStreak, 30);

  // Update combined score
  state.combinedScore = state.stats.totalScore + state.stats.dailyBonusXP;

  saveDailyBonusState(state);
  return state;
}

/**
 * Sync gameplay stats into the daily bonus state.
 * This merges advancement/gameplay data with daily visit tracking.
 */
export function syncGameplayStats(
  totalScore: number,
  bestScorePerGame: number,
  totalGamesPlayed: number,
  advancementsUnlocked: number,
  totalLines: number,
): ScoreRankingState {
  const state = loadDailyBonusState();

  state.stats.totalScore = totalScore;
  state.stats.bestScorePerGame = bestScorePerGame;
  state.stats.totalGamesPlayed = totalGamesPlayed;
  state.stats.advancementsUnlocked = advancementsUnlocked;
  state.stats.totalLines = totalLines;

  // Update combined score
  state.combinedScore = state.stats.totalScore + state.stats.dailyBonusXP;

  saveDailyBonusState(state);
  return state;
}

// ===== Legacy API stubs for backward compat =====

export function loadLoyaltyState(): ScoreRankingState {
  return loadDailyBonusState();
}

export function saveLoyaltyState(state: ScoreRankingState): void {
  saveDailyBonusState(state);
}

export function syncFromGameplay(
  gamesPlayed: number,
  totalScore: number,
  advancementsUnlocked: number,
): ScoreRankingState {
  return syncGameplayStats(totalScore, 0, gamesPlayed, advancementsUnlocked, 0);
}

export function recordPollVote(): ScoreRankingState {
  return loadDailyBonusState();
}
