export type { LoyaltyTier, LoyaltyBadge, LoyaltyStats, LoyaltyState, NumericLoyaltyStatKey, Poll, PollOption, PollVote } from './types';
export {
  LOYALTY_TIERS,
  LOYALTY_BADGES,
  XP_REWARDS,
  getTierByXP,
  tierProgress,
  xpToNextTier,
} from './constants';
export {
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
