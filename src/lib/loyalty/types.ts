// ===== Score Ranking System Types =====

export interface ScoreRankTier {
  id: string;
  level: number;
  minScore: number;
  maxScore: number; // Infinity for top tier
  color: string;
  icon: string;
}

export interface ScoreRankingStats {
  totalScore: number;
  bestScorePerGame: number;
  totalGamesPlayed: number;
  advancementsUnlocked: number;
  totalLines: number;
  // Daily bonus system fields
  totalVisits: number;
  currentStreak: number;
  bestStreak: number;
  lastVisitDate: string; // ISO date string (YYYY-MM-DD)
  dailyBonusXP: number; // XP earned from daily visits and streaks
}

export interface ScoreRankingState {
  stats: ScoreRankingStats;
  // Combined score includes gameplay score + daily bonus XP
  combinedScore: number;
}

// ===== Legacy type aliases for backward compatibility =====
export type LoyaltyTier = ScoreRankTier;
export type LoyaltyState = ScoreRankingState;
export type LoyaltyStats = ScoreRankingStats;

// Numeric stat keys for badge checking
export type NumericScoreStatKey = keyof ScoreRankingStats;
export type NumericLoyaltyStatKey = NumericScoreStatKey;

export interface LoyaltyBadge {
  id: string;
  category: 'streak' | 'engagement' | 'milestone' | 'community';
  requiredValue: number;
  statKey: NumericScoreStatKey;
}

// ===== Poll Types (kept for community features) =====

export interface PollOption {
  ja: string;
  en: string;
}

export interface Poll {
  id: string;
  question: { ja: string; en: string };
  options: PollOption[];
  votes: number[];     // vote count per option index
  totalVotes: number;
  active: boolean;
}

export interface PollVote {
  pollId: string;
  optionIndex: number;
}
