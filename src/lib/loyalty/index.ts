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
  XP_REWARDS,
  getTierByScore,
  getTierByXP,
  scoreProgress,
  tierProgress,
  scoreToNextTier,
  xpToNextTier,
  formatScore,
  formatScoreCompact,
  getRankGroups,
  getCurrentRankGroup,
} from './constants';
export type { RankGroup } from './constants';
export {
  buildScoreRankingState,
  loadDailyBonusState,
  saveDailyBonusState,
  syncGameplayStats,
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
