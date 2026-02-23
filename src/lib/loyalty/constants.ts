// ===== Score Ranking System Constants =====
// Tiers based on cumulative game score from rhythm gameplay
// 20 tiers with sub-divisions (I, II, III) — progressively harder to climb

import type { ScoreRankTier } from './types';

export const SCORE_RANK_TIERS: ScoreRankTier[] = [
  // --- Unranked ---
  {
    id: 'unranked',
    level: 0,
    minScore: 0,
    maxScore: 4999,
    color: '#6B7280',
    icon: '—',
  },

  // --- Beat (Silver) ---
  {
    id: 'beat_1',
    level: 1,
    minScore: 5000,
    maxScore: 14999,
    color: '#8B8B8B',
    icon: '\u2669', // ♩
  },
  {
    id: 'beat_2',
    level: 2,
    minScore: 15000,
    maxScore: 29999,
    color: '#9E9E9E',
    icon: '\u2669',
  },
  {
    id: 'beat_3',
    level: 3,
    minScore: 30000,
    maxScore: 59999,
    color: '#B0B0B0',
    icon: '\u2669',
  },

  // --- Rhythm (Teal) ---
  {
    id: 'rhythm_1',
    level: 4,
    minScore: 60000,
    maxScore: 119999,
    color: '#4ECDC4',
    icon: '\u266A', // ♪
  },
  {
    id: 'rhythm_2',
    level: 5,
    minScore: 120000,
    maxScore: 249999,
    color: '#3AB8B0',
    icon: '\u266A',
  },
  {
    id: 'rhythm_3',
    level: 6,
    minScore: 250000,
    maxScore: 499999,
    color: '#28A39C',
    icon: '\u266A',
  },

  // --- Melody (Gold) ---
  {
    id: 'melody_1',
    level: 7,
    minScore: 500000,
    maxScore: 999999,
    color: '#FFD700',
    icon: '\u266B', // ♫
  },
  {
    id: 'melody_2',
    level: 8,
    minScore: 1000000,
    maxScore: 1999999,
    color: '#FFC200',
    icon: '\u266B',
  },
  {
    id: 'melody_3',
    level: 9,
    minScore: 2000000,
    maxScore: 3999999,
    color: '#FFAD00',
    icon: '\u266B',
  },

  // --- Harmony (Orange) ---
  {
    id: 'harmony_1',
    level: 10,
    minScore: 4000000,
    maxScore: 6999999,
    color: '#FF8C00',
    icon: '\u266C', // ♬
  },
  {
    id: 'harmony_2',
    level: 11,
    minScore: 7000000,
    maxScore: 11999999,
    color: '#FF7400',
    icon: '\u266C',
  },
  {
    id: 'harmony_3',
    level: 12,
    minScore: 12000000,
    maxScore: 19999999,
    color: '#FF5C00',
    icon: '\u266C',
  },

  // --- Maestro (Purple) ---
  {
    id: 'maestro_1',
    level: 13,
    minScore: 20000000,
    maxScore: 34999999,
    color: '#E040FB',
    icon: '\uD83C\uDFB5', // 🎵
  },
  {
    id: 'maestro_2',
    level: 14,
    minScore: 35000000,
    maxScore: 59999999,
    color: '#D500F9',
    icon: '\uD83C\uDFB5',
  },
  {
    id: 'maestro_3',
    level: 15,
    minScore: 60000000,
    maxScore: 99999999,
    color: '#AA00FF',
    icon: '\uD83C\uDFB5',
  },

  // --- Gravity (Crimson) ---
  {
    id: 'gravity_1',
    level: 16,
    minScore: 100000000,
    maxScore: 174999999,
    color: '#FF4500',
    icon: '\u2605', // ★
  },
  {
    id: 'gravity_2',
    level: 17,
    minScore: 175000000,
    maxScore: 299999999,
    color: '#FF2D00',
    icon: '\u2605',
  },
  {
    id: 'gravity_3',
    level: 18,
    minScore: 300000000,
    maxScore: 499999999,
    color: '#E50000',
    icon: '\u2605',
  },

  // --- Flow (The Pinnacle) ---
  {
    id: 'flow',
    level: 19,
    minScore: 500000000,
    maxScore: Infinity,
    color: '#00E5FF',
    icon: '\u2726', // ✦
  },
];

// Legacy alias
export const LOYALTY_TIERS = SCORE_RANK_TIERS;

// ===== Rank Groups (collapsed view) =====
export interface RankGroup {
  groupId: string;         // e.g. 'beat', 'rhythm', 'flow'
  tiers: ScoreRankTier[];  // sub-tiers within this group
  color: string;           // representative color (highest sub-tier)
  icon: string;            // representative icon
  minScore: number;        // first sub-tier minScore
  maxScore: number;        // last sub-tier maxScore
}

/** Collapse SCORE_RANK_TIERS into rank groups for display */
export function getRankGroups(): RankGroup[] {
  const groupMap = new Map<string, ScoreRankTier[]>();
  const groupOrder: string[] = [];

  for (const tier of SCORE_RANK_TIERS) {
    // Extract group name: 'beat_1' → 'beat', 'unranked' → 'unranked', 'flow' → 'flow'
    const groupId = tier.id.replace(/_\d+$/, '');
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, []);
      groupOrder.push(groupId);
    }
    groupMap.get(groupId)!.push(tier);
  }

  return groupOrder.map((groupId) => {
    const tiers = groupMap.get(groupId)!;
    const last = tiers[tiers.length - 1];
    return {
      groupId,
      tiers,
      color: last.color,
      icon: last.icon,
      minScore: tiers[0].minScore,
      maxScore: last.maxScore,
    };
  });
}

/** Get the rank group that contains the current tier */
export function getCurrentRankGroup(score: number): RankGroup {
  const groups = getRankGroups();
  for (let i = groups.length - 1; i >= 0; i--) {
    if (score >= groups[i].minScore) return groups[i];
  }
  return groups[0];
}

// XP rewards for daily engagement
export const XP_REWARDS = {
  dailyVisit: 10,
  streakDay: 5, // bonus per consecutive day (capped at 30 days)
} as const;

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
  if (score >= 1000000000) return `${(score / 1000000000).toFixed(1)}B`;
  if (score >= 10000000) return `${(score / 1000000).toFixed(1)}M`;
  if (score >= 1000000) return `${(score / 1000000).toFixed(2)}M`;
  if (score >= 100000) return `${(score / 1000).toFixed(0)}K`;
  if (score >= 10000) return `${(score / 1000).toFixed(1)}K`;
  return score.toLocaleString();
}
