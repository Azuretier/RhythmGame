import type { ScoreState, ScoreStats } from './types';
import { calculateMoneyReward } from './constants';

const STORAGE_KEY = 'rhythmia_score';

function getDefaultStats(): ScoreStats {
  const today = new Date().toISOString().split('T')[0];
  return {
    totalScore: 0,
    bestScore: 0,
    totalGamesPlayed: 0,
    totalLinesCleared: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
    joinDate: today,
  };
}

export function loadScoreState(): ScoreState {
  if (typeof window === 'undefined') {
    return { stats: getDefaultStats(), money: 0, lifetimeMoneyEarned: 0 };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        stats: { ...getDefaultStats(), ...parsed.stats },
        money: parsed.money || 0,
        lifetimeMoneyEarned: parsed.lifetimeMoneyEarned || 0,
      };
    }
  } catch {}

  return { stats: getDefaultStats(), money: 0, lifetimeMoneyEarned: 0 };
}

export function saveScoreState(state: ScoreState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Sync score stats from advancements/gameplay data.
 * Called to keep score state in sync with actual gameplay.
 */
export function syncFromGameplay(
  gamesPlayed: number,
  totalScore: number,
  totalLines: number,
): ScoreState {
  const state = loadScoreState();

  state.stats.totalGamesPlayed = gamesPlayed;
  state.stats.totalScore = totalScore;
  state.stats.totalLinesCleared = totalLines;

  saveScoreState(state);
  return state;
}

/**
 * Record a completed game. Updates score, money, and streak.
 */
export function recordGameResult(
  gameScore: number,
  linesCleared: number,
  won: boolean,
): ScoreState {
  const state = loadScoreState();

  state.stats.totalScore += gameScore;
  state.stats.totalGamesPlayed += 1;
  state.stats.totalLinesCleared += linesCleared;

  if (gameScore > state.stats.bestScore) {
    state.stats.bestScore = gameScore;
  }

  if (won) {
    state.stats.wins += 1;
    state.stats.currentStreak += 1;
    if (state.stats.currentStreak > state.stats.bestStreak) {
      state.stats.bestStreak = state.stats.currentStreak;
    }
  } else {
    state.stats.losses += 1;
    state.stats.currentStreak = 0;
  }

  // Award money
  const moneyEarned = calculateMoneyReward(gameScore, won, state.stats.currentStreak);
  state.money += moneyEarned;
  state.lifetimeMoneyEarned += moneyEarned;

  saveScoreState(state);
  return state;
}
