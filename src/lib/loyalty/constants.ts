// ===== Score Ranking System Constants =====
// Tiers based on cumulative game score from rhythm gameplay

import type { ScoreRankTier } from './types';

export const SCORE_RANK_TIERS: ScoreRankTier[] = [
  {
    id: 'unranked',
    name: 'Unranked',
    nameJa: 'ランクなし',
    level: 0,
    minScore: 0,
    maxScore: 9999,
    color: '#6B7280',
    icon: '—',
  },
  {
    id: 'beat_1',
    name: 'Beat I',
    nameJa: 'ビート I',
    level: 1,
    minScore: 10000,
    maxScore: 99999,
    color: '#8B8B8B',
    icon: '\u2669', // ♩
  },
  {
    id: 'beat_2',
    name: 'Beat II',
    nameJa: 'ビート II',
    level: 2,
    minScore: 100000,
    maxScore: 499999,
    color: '#4ECDC4',
    icon: '\u266A', // ♪
  },
  {
    id: 'rhythm',
    name: 'Rhythm',
    nameJa: 'リズム',
    level: 3,
    minScore: 500000,
    maxScore: 999999,
    color: '#FFD700',
    icon: '\u266B', // ♫
  },
  {
    id: 'maestro',
    name: 'Maestro',
    nameJa: 'マエストロ',
    level: 4,
    minScore: 1000000,
    maxScore: 9999999,
    color: '#FF8C00',
    icon: '\u266C', // ♬
  },
  {
    id: 'virtuoso',
    name: 'Virtuoso',
    nameJa: 'ヴィルトゥオーソ',
    level: 5,
    minScore: 10000000,
    maxScore: Infinity,
    color: '#FF4500',
    icon: '\u2605', // ★
  },
];

// Legacy alias
export const LOYALTY_TIERS = SCORE_RANK_TIERS;

export function getTierByScore(score: number): ScoreRankTier {
  for (let i = SCORE_RANK_TIERS.length - 1; i >= 0; i--) {
    if (score >= SCORE_RANK_TIERS[i].minScore) {
      return SCORE_RANK_TIERS[i];
    }
  }
  return SCORE_RANK_TIERS[0];
}

// Legacy alias
export const getTierByXP = getTierByScore;

export function scoreProgress(score: number): number {
  const tier = getTierByScore(score);
  if (tier.maxScore === Infinity) return 100;
  const range = tier.maxScore - tier.minScore + 1;
  const progress = score - tier.minScore;
  return Math.min(100, (progress / range) * 100);
}

// Legacy alias
export const tierProgress = scoreProgress;

export function scoreToNextTier(score: number): number | null {
  const currentTier = getTierByScore(score);
  const currentIndex = SCORE_RANK_TIERS.indexOf(currentTier);
  if (currentIndex >= SCORE_RANK_TIERS.length - 1) return null;
  return SCORE_RANK_TIERS[currentIndex + 1].minScore - score;
}

// Legacy alias
export const xpToNextTier = scoreToNextTier;

/** Format a large score number with commas */
export function formatScore(score: number): string {
  return score.toLocaleString();
}

/** Format score in compact form (10K, 1.2M, etc.) */
export function formatScoreCompact(score: number): string {
  if (score >= 10000000) return `${(score / 1000000).toFixed(1)}M`;
  if (score >= 1000000) return `${(score / 1000000).toFixed(2)}M`;
  if (score >= 100000) return `${(score / 1000).toFixed(0)}K`;
  if (score >= 10000) return `${(score / 1000).toFixed(1)}K`;
  return score.toLocaleString();
}
