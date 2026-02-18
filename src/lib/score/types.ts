// ===== Score Ranking System Types =====

export interface ScoreRankTier {
  id: string;
  name: string;
  nameJa: string;
  level: number;
  minScore: number;
  maxScore: number; // Infinity for top tier
  color: string;
  icon: string;
}

export interface ScoreStats {
  totalScore: number;
  bestScore: number;
  totalGamesPlayed: number;
  totalLinesCleared: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  joinDate: string; // ISO date string
}

export interface ScoreState {
  stats: ScoreStats;
  money: number;
  lifetimeMoneyEarned: number;
}
