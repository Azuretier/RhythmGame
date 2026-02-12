// ===== Loyalty System Constants =====
// Rhythm-themed tier names inspired by musical progression

import type { LoyaltyTier, LoyaltyBadge } from './types';

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: 'new_beat',
    name: 'New Beat',
    nameJa: 'ニュービート',
    level: 1,
    minXP: 0,
    maxXP: 499,
    color: '#8B8B8B',
    icon: '♩',
  },
  {
    id: 'syncopated',
    name: 'Syncopated',
    nameJa: 'シンコペーション',
    level: 2,
    minXP: 500,
    maxXP: 1999,
    color: '#4ECDC4',
    icon: '♪',
  },
  {
    id: 'in_rhythm',
    name: 'In Rhythm',
    nameJa: 'インリズム',
    level: 3,
    minXP: 2000,
    maxXP: 4999,
    color: '#FFD700',
    icon: '♫',
  },
  {
    id: 'maestro',
    name: 'Maestro',
    nameJa: 'マエストロ',
    level: 4,
    minXP: 5000,
    maxXP: Infinity,
    color: '#FF4500',
    icon: '♬',
  },
];

// XP rewards for various actions
export const XP_REWARDS = {
  dailyVisit: 10,
  gameCompleted: 25,
  advancementUnlocked: 50,
  streakDay: 5, // bonus per consecutive day
  pollVote: 15,
} as const;

export const LOYALTY_BADGES: LoyaltyBadge[] = [
  // Streak badges
  { id: 'streak_3', category: 'streak', requiredValue: 3, statKey: 'bestStreak' },
  { id: 'streak_7', category: 'streak', requiredValue: 7, statKey: 'bestStreak' },
  { id: 'streak_14', category: 'streak', requiredValue: 14, statKey: 'bestStreak' },
  { id: 'streak_30', category: 'streak', requiredValue: 30, statKey: 'bestStreak' },

  // Engagement badges (visits)
  { id: 'visits_5', category: 'engagement', requiredValue: 5, statKey: 'totalVisits' },
  { id: 'visits_25', category: 'engagement', requiredValue: 25, statKey: 'totalVisits' },
  { id: 'visits_100', category: 'engagement', requiredValue: 100, statKey: 'totalVisits' },

  // Milestone badges (games played)
  { id: 'games_10', category: 'milestone', requiredValue: 10, statKey: 'totalGamesPlayed' },
  { id: 'games_50', category: 'milestone', requiredValue: 50, statKey: 'totalGamesPlayed' },
  { id: 'games_200', category: 'milestone', requiredValue: 200, statKey: 'totalGamesPlayed' },

  // Community badges (polls voted)
  { id: 'polls_1', category: 'community', requiredValue: 1, statKey: 'pollsVoted' },
  { id: 'polls_5', category: 'community', requiredValue: 5, statKey: 'pollsVoted' },
  { id: 'polls_10', category: 'community', requiredValue: 10, statKey: 'pollsVoted' },
];

export function getTierByXP(xp: number): LoyaltyTier {
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (xp >= LOYALTY_TIERS[i].minXP) {
      return LOYALTY_TIERS[i];
    }
  }
  return LOYALTY_TIERS[0];
}

export function tierProgress(xp: number): number {
  const tier = getTierByXP(xp);
  if (tier.maxXP === Infinity) return 100;
  const range = tier.maxXP - tier.minXP + 1;
  const progress = xp - tier.minXP;
  return Math.min(100, (progress / range) * 100);
}

export function xpToNextTier(xp: number): number | null {
  const currentTier = getTierByXP(xp);
  const currentIndex = LOYALTY_TIERS.indexOf(currentTier);
  if (currentIndex >= LOYALTY_TIERS.length - 1) return null;
  return LOYALTY_TIERS[currentIndex + 1].minXP - xp;
}
