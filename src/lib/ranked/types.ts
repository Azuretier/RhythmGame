// ===== Ranked Match Types =====

export interface RankTier {
  id: string;
  name: string;
  nameJa: string;
  division: number;
  minPoints: number;
  maxPoints: number;  // Infinity for top tier
  busFare: number;    // Entry cost (points deducted at match start)
  winReward: number;  // Points gained on win
  color: string;
}

export interface RankedState {
  points: number;
  tier: RankTier;
  wins: number;
  losses: number;
  winStreak: number;
}

export interface RankChange {
  previousPoints: number;
  newPoints: number;
  previousTier: RankTier;
  newTier: RankTier;
  pointsDelta: number;
  isPromotion: boolean;
  isDemotion: boolean;
}
