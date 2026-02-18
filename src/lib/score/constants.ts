// ===== Score Ranking System Constants =====
// Tier system based on cumulative game score

import type { ScoreRankTier } from './types';

export const SCORE_TIERS: ScoreRankTier[] = [
  {
    id: 'rookie',
    name: 'Rookie',
    nameJa: 'ルーキー',
    level: 1,
    minScore: 0,
    maxScore: 999,
    color: '#8B8B8B',
    icon: '◇',
  },
  {
    id: 'bronze',
    name: 'Bronze',
    nameJa: 'ブロンズ',
    level: 2,
    minScore: 1000,
    maxScore: 4999,
    color: '#CD7F32',
    icon: '◈',
  },
  {
    id: 'silver',
    name: 'Silver',
    nameJa: 'シルバー',
    level: 3,
    minScore: 5000,
    maxScore: 14999,
    color: '#C0C0C0',
    icon: '◆',
  },
  {
    id: 'gold',
    name: 'Gold',
    nameJa: 'ゴールド',
    level: 4,
    minScore: 15000,
    maxScore: 49999,
    color: '#FFD700',
    icon: '❖',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    nameJa: 'ダイヤモンド',
    level: 5,
    minScore: 50000,
    maxScore: 149999,
    color: '#4ECDC4',
    icon: '✦',
  },
  {
    id: 'master',
    name: 'Master',
    nameJa: 'マスター',
    level: 6,
    minScore: 150000,
    maxScore: Infinity,
    color: '#FF4500',
    icon: '★',
  },
];

// Money rewards
export const MONEY_REWARDS = {
  gameCompleted: 10,       // Base coins per game
  scoreMultiplier: 0.01,   // Coins per score point
  winBonus: 25,            // Extra coins for winning
  streakBonus: 5,          // Extra coins per win streak
} as const;

export function getTierByScore(score: number): ScoreRankTier {
  for (let i = SCORE_TIERS.length - 1; i >= 0; i--) {
    if (score >= SCORE_TIERS[i].minScore) {
      return SCORE_TIERS[i];
    }
  }
  return SCORE_TIERS[0];
}

export function scoreTierProgress(score: number): number {
  const tier = getTierByScore(score);
  if (tier.maxScore === Infinity) return 100;
  const range = tier.maxScore - tier.minScore + 1;
  const progress = score - tier.minScore;
  return Math.min(100, (progress / range) * 100);
}

export function scoreToNextTier(score: number): number | null {
  const currentTier = getTierByScore(score);
  const currentIndex = SCORE_TIERS.indexOf(currentTier);
  if (currentIndex >= SCORE_TIERS.length - 1) return null;
  return SCORE_TIERS[currentIndex + 1].minScore - score;
}

export function calculateMoneyReward(score: number, won: boolean, streak: number): number {
  let reward = MONEY_REWARDS.gameCompleted;
  reward += Math.floor(score * MONEY_REWARDS.scoreMultiplier);
  if (won) {
    reward += MONEY_REWARDS.winBonus;
    reward += MONEY_REWARDS.streakBonus * Math.min(streak, 10);
  }
  return reward;
}
