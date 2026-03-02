/**
 * Type-safe Google Analytics 4 event tracking wrapper.
 *
 * Gracefully handles SSR and ad-blockers by checking for window.gtag
 * before every call.
 */

type GameMode = 'vanilla' | 'multiplayer' | 'ranked' | 'mob_battle' | 'arena';

interface GameStartParams {
  game_mode: GameMode;
  world_name?: string;
}

interface GameEndParams {
  game_mode: GameMode;
  score: number;
  lines: number;
  duration_seconds?: number;
  result?: 'win' | 'loss' | 'completed';
}

interface AchievementUnlockedParams {
  achievement_id: string;
  achievement_count: number;
}

interface MultiplayerMatchJoinedParams {
  game_mode: GameMode;
  room_code?: string;
  player_count?: number;
}

interface RankedMatchResultParams {
  result: 'win' | 'loss';
  rank_points: number;
  rank_points_delta: number;
  tier_name: string;
  is_promotion: boolean;
  is_demotion: boolean;
}

interface ProfileCreatedParams {
  player_name: string;
}

interface SkinCustomizedParams {
  skin_type: string;
}

interface LoyaltyPointsEarnedParams {
  points: number;
  source: string;
}

// Union of all custom event maps for type-safe dispatch
interface AnalyticsEventMap {
  game_start: GameStartParams;
  game_end: GameEndParams;
  achievement_unlocked: AchievementUnlockedParams;
  multiplayer_match_joined: MultiplayerMatchJoinedParams;
  ranked_match_result: RankedMatchResultParams;
  profile_created: ProfileCreatedParams;
  skin_customized: SkinCustomizedParams;
  loyalty_points_earned: LoyaltyPointsEarnedParams;
}

/**
 * Send a typed GA4 custom event.
 *
 * No-ops silently when `gtag` is unavailable (SSR, ad-blockers, missing GA ID).
 */
export function trackEvent<K extends keyof AnalyticsEventMap>(
  eventName: K,
  params: AnalyticsEventMap[K],
): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as Record<string, unknown>).gtag as
    | ((...args: unknown[]) => void)
    | undefined;
  if (typeof gtag !== 'function') return;

  try {
    gtag('event', eventName, params);
  } catch {
    // Silently swallow – analytics should never break the app.
  }
}
