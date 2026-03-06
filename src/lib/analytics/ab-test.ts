/**
 * Hash-based A/B testing — deterministic, zero external dependencies.
 *
 * Assignment is stable for a given (playerId, testId) pair, so the same
 * player always sees the same variant.
 */

export interface ABTestConfig {
  testId: string;
  variants: string[];
  /** Optional weights — defaults to equal distribution. */
  weights?: number[];
}

/**
 * Simple but reasonably distributed string hash (djb2 variant).
 */
export function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Deterministically assign a variant to a player.
 *
 * 1. Hash `playerId + testId` to get a number.
 * 2. Normalise into [0, 1) range.
 * 3. Walk through cumulative weights to pick the variant.
 */
export function getVariant(
  playerId: string,
  testConfig: ABTestConfig,
): string {
  const { variants, weights } = testConfig;
  if (variants.length === 0) {
    throw new Error('[ABTest] At least one variant is required');
  }
  if (variants.length === 1) return variants[0];

  const hash = simpleHash(playerId + testConfig.testId);
  const normalised = (hash % 10000) / 10000; // [0, 1)

  // Build cumulative weights
  const totalWeight =
    weights && weights.length === variants.length
      ? weights.reduce((a, b) => a + b, 0)
      : variants.length;

  let cumulative = 0;
  for (let i = 0; i < variants.length; i++) {
    const w =
      weights && weights.length === variants.length ? weights[i] : 1;
    cumulative += w / totalWeight;
    if (normalised < cumulative) return variants[i];
  }

  // Floating-point safety net
  return variants[variants.length - 1];
}

// ---------------------------------------------------------------------------
// GA4 tracking helpers
// ---------------------------------------------------------------------------

function sendEvent(eventName: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as Record<string, unknown>).gtag as
    | ((...args: unknown[]) => void)
    | undefined;
  if (typeof gtag !== 'function') return;

  try {
    gtag('event', eventName, params);
  } catch {
    // Silently swallow.
  }
}

/** Track which variant a player was exposed to. */
export function trackVariantExposure(
  testId: string,
  variant: string,
): void {
  sendEvent('ab_test_exposure', { test_id: testId, variant });
}

/** Track a conversion event for a variant. */
export function trackVariantConversion(
  testId: string,
  variant: string,
  value?: number,
): void {
  sendEvent('ab_test_conversion', {
    test_id: testId,
    variant,
    value: value ?? 1,
  });
}
