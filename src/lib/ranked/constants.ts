// ===== Ranked Match Constants =====
// Fortnite Arena-style point system

import type { RankTier, RankedState, RankChange } from './types';

export const RANK_TIERS: RankTier[] = [
  {
    id: 'open_1',
    name: 'Open I',
    nameJa: 'オープン I',
    division: 1,
    minPoints: 0,
    maxPoints: 499,
    busFare: 0,
    winReward: 40,
    color: '#8B8B8B',
  },
  {
    id: 'open_2',
    name: 'Open II',
    nameJa: 'オープン II',
    division: 2,
    minPoints: 500,
    maxPoints: 999,
    busFare: 10,
    winReward: 45,
    color: '#A0A0A0',
  },
  {
    id: 'open_3',
    name: 'Open III',
    nameJa: 'オープン III',
    division: 3,
    minPoints: 1000,
    maxPoints: 1499,
    busFare: 15,
    winReward: 50,
    color: '#C0C0C0',
  },
  {
    id: 'contender_1',
    name: 'Contender I',
    nameJa: 'コンテンダー I',
    division: 1,
    minPoints: 1500,
    maxPoints: 2499,
    busFare: 20,
    winReward: 55,
    color: '#4ECDC4',
  },
  {
    id: 'contender_2',
    name: 'Contender II',
    nameJa: 'コンテンダー II',
    division: 2,
    minPoints: 2500,
    maxPoints: 3499,
    busFare: 25,
    winReward: 60,
    color: '#3DA69B',
  },
  {
    id: 'contender_3',
    name: 'Contender III',
    nameJa: 'コンテンダー III',
    division: 3,
    minPoints: 3500,
    maxPoints: 4999,
    busFare: 30,
    winReward: 65,
    color: '#2D847D',
  },
  {
    id: 'champion_1',
    name: 'Champion I',
    nameJa: 'チャンピオン I',
    division: 1,
    minPoints: 5000,
    maxPoints: 7499,
    busFare: 40,
    winReward: 75,
    color: '#FFD700',
  },
  {
    id: 'champion_2',
    name: 'Champion II',
    nameJa: 'チャンピオン II',
    division: 2,
    minPoints: 7500,
    maxPoints: 9999,
    busFare: 50,
    winReward: 85,
    color: '#FFA500',
  },
  {
    id: 'champion_3',
    name: 'Champion III',
    nameJa: 'チャンピオン III',
    division: 3,
    minPoints: 10000,
    maxPoints: Infinity,
    busFare: 60,
    winReward: 100,
    color: '#FF4500',
  },
];

export const MATCHMAKING_TIMEOUT_MS = 8000;
export const AI_PLAYER_NAME = 'AI Rival';
export const AI_PLAYER_ID_PREFIX = 'ai_';

// Win streak bonus: extra points for consecutive wins
export const WIN_STREAK_BONUS = [0, 0, 5, 10, 15, 20, 25]; // index = streak count

export function getTierByPoints(points: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (points >= RANK_TIERS[i].minPoints) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

export function getDefaultRankedState(): RankedState {
  return {
    points: 0,
    tier: RANK_TIERS[0],
    wins: 0,
    losses: 0,
    winStreak: 0,
  };
}

export function calculateRankChange(
  state: RankedState,
  won: boolean,
): RankChange {
  const previousPoints = state.points;
  const previousTier = state.tier;

  let pointsDelta: number;

  if (won) {
    const streakIndex = Math.min(state.winStreak + 1, WIN_STREAK_BONUS.length - 1);
    const streakBonus = WIN_STREAK_BONUS[streakIndex];
    pointsDelta = state.tier.winReward + streakBonus - state.tier.busFare;
  } else {
    pointsDelta = -state.tier.busFare;
  }

  // Points can't go below 0
  const newPoints = Math.max(0, previousPoints + pointsDelta);
  const newTier = getTierByPoints(newPoints);

  return {
    previousPoints,
    newPoints,
    previousTier,
    newTier,
    pointsDelta,
    isPromotion: newTier.minPoints > previousTier.minPoints,
    isDemotion: newTier.minPoints < previousTier.minPoints,
  };
}

// How many points to next tier
export function pointsToNextTier(points: number): number | null {
  const currentTier = getTierByPoints(points);
  const currentIndex = RANK_TIERS.indexOf(currentTier);
  if (currentIndex >= RANK_TIERS.length - 1) return null; // Already max
  return RANK_TIERS[currentIndex + 1].minPoints - points;
}

// Progress percentage within current tier
export function tierProgress(points: number): number {
  const tier = getTierByPoints(points);
  if (tier.maxPoints === Infinity) return 100;
  const range = tier.maxPoints - tier.minPoints + 1;
  const progress = points - tier.minPoints;
  return Math.min(100, (progress / range) * 100);
}
