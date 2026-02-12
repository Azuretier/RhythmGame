import type { LoyaltyState, LoyaltyStats } from './types';
import { LOYALTY_BADGES, XP_REWARDS } from './constants';

const STORAGE_KEY = 'rhythmia_loyalty';

function getDefaultStats(): LoyaltyStats {
  const today = new Date().toISOString().split('T')[0];
  return {
    totalVisits: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastVisitDate: '',
    totalGamesPlayed: 0,
    totalScore: 0,
    advancementsUnlocked: 0,
    pollsVoted: 0,
    joinDate: today,
  };
}

export function loadLoyaltyState(): LoyaltyState {
  if (typeof window === 'undefined') {
    return { stats: getDefaultStats(), xp: 0, unlockedBadgeIds: [] };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        stats: { ...getDefaultStats(), ...parsed.stats },
        xp: parsed.xp || 0,
        unlockedBadgeIds: parsed.unlockedBadgeIds || [],
      };
    }
  } catch {}

  return { stats: getDefaultStats(), xp: 0, unlockedBadgeIds: [] };
}

export function saveLoyaltyState(state: LoyaltyState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function checkNewBadges(state: LoyaltyState): LoyaltyState {
  const newlyUnlocked: string[] = [];

  for (const badge of LOYALTY_BADGES) {
    if (state.unlockedBadgeIds.includes(badge.id)) continue;
    if (state.stats[badge.statKey] >= badge.requiredValue) {
      newlyUnlocked.push(badge.id);
    }
  }

  if (newlyUnlocked.length === 0) return state;

  return {
    ...state,
    unlockedBadgeIds: [...state.unlockedBadgeIds, ...newlyUnlocked],
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
 * Record a daily visit. Updates streak, visit count, and awards XP.
 * Should be called once when the loyalty page is visited.
 */
export function recordDailyVisit(): LoyaltyState {
  const state = loadLoyaltyState();
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
  state.xp += XP_REWARDS.dailyVisit;
  state.xp += XP_REWARDS.streakDay * Math.min(state.stats.currentStreak, 30);

  const updated = checkNewBadges(state);
  saveLoyaltyState(updated);
  return updated;
}

/**
 * Sync stats from advancements system. Called to keep loyalty stats
 * in sync with actual gameplay data.
 */
export function syncFromGameplay(gamesPlayed: number, totalScore: number, advancementsUnlocked: number): LoyaltyState {
  const state = loadLoyaltyState();

  // Calculate XP delta from new games
  const newGames = gamesPlayed - state.stats.totalGamesPlayed;
  if (newGames > 0) {
    state.xp += newGames * XP_REWARDS.gameCompleted;
  }

  const newAdvancements = advancementsUnlocked - state.stats.advancementsUnlocked;
  if (newAdvancements > 0) {
    state.xp += newAdvancements * XP_REWARDS.advancementUnlocked;
  }

  state.stats.totalGamesPlayed = gamesPlayed;
  state.stats.totalScore = totalScore;
  state.stats.advancementsUnlocked = advancementsUnlocked;

  const updated = checkNewBadges(state);
  saveLoyaltyState(updated);
  return updated;
}

/**
 * Record a poll vote. Awards XP and updates stats.
 */
export function recordPollVote(): LoyaltyState {
  const state = loadLoyaltyState();

  state.stats.pollsVoted += 1;
  state.xp += XP_REWARDS.pollVote;

  const updated = checkNewBadges(state);
  saveLoyaltyState(updated);
  return updated;
}
