// ===== Loyalty System Types =====

export interface LoyaltyTier {
  id: string;
  name: string;
  nameJa: string;
  level: number;
  minXP: number;
  maxXP: number; // Infinity for top tier
  color: string;
  icon: string;
}

export type NumericLoyaltyStatKey = {
  [K in keyof LoyaltyStats]: LoyaltyStats[K] extends number ? K : never;
}[keyof LoyaltyStats];

export interface LoyaltyBadge {
  id: string;
  category: 'streak' | 'engagement' | 'milestone' | 'community';
  requiredValue: number;
  statKey: NumericLoyaltyStatKey;
}

export interface LoyaltyStats {
  totalVisits: number;
  currentStreak: number;
  bestStreak: number;
  lastVisitDate: string; // ISO date string (YYYY-MM-DD)
  totalGamesPlayed: number;
  totalScore: number;
  advancementsUnlocked: number;
  pollsVoted: number;
  joinDate: string; // ISO date string
}

export interface LoyaltyState {
  stats: LoyaltyStats;
  xp: number;
  unlockedBadgeIds: string[];
}

// ===== Poll Types =====

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
