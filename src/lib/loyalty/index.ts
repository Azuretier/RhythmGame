export type {
  ScoreRankTier,
  ScoreRankingStats,
  ScoreRankingState,
  NumericScoreStatKey,
  // Legacy aliases
  LoyaltyTier,
  LoyaltyBadge,
  LoyaltyStats,
  LoyaltyState,
  NumericLoyaltyStatKey,
  Poll,
  PollOption,
  PollVote,
} from './types';
export {
  SCORE_RANK_TIERS,
  LOYALTY_TIERS,
  getTierByScore,
  getTierByXP,
  scoreProgress,
  tierProgress,
  scoreToNextTier,
  xpToNextTier,
  formatScore,
  formatScoreCompact,
} from './constants';
export {
  buildScoreRankingState,
  loadLoyaltyState,
  saveLoyaltyState,
  recordDailyVisit,
  syncFromGameplay,
  recordPollVote,
} from './storage';
export {
  initAuth,
  fetchActivePoll,
  getUserVote,
  submitVote,
  ensureActivePoll,
  syncLoyaltyToFirestore,
} from './firestore';
