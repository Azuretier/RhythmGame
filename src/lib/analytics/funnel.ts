/**
 * Funnel analysis utilities.
 *
 * Client-side: track funnel steps via GA4.
 * Server-side: aggregate funnel data from Firestore.
 */

export type FunnelStep =
  | 'landing'
  | 'profile_created'
  | 'first_game'
  | 'shop_viewed'
  | 'checkout_started'
  | 'purchase_completed';

export const FUNNEL_STEPS: FunnelStep[] = [
  'landing',
  'profile_created',
  'first_game',
  'shop_viewed',
  'checkout_started',
  'purchase_completed',
];

export interface FunnelData {
  step: FunnelStep;
  count: number;
  /** Percentage conversion rate from the previous step (100 for the first step). */
  conversionRate: number;
}

// ---------------------------------------------------------------------------
// Client-side tracking
// ---------------------------------------------------------------------------

export function trackFunnelStep(
  step: FunnelStep,
  metadata?: Record<string, string>,
): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as Record<string, unknown>).gtag as
    | ((...args: unknown[]) => void)
    | undefined;
  if (typeof gtag !== 'function') return;

  try {
    gtag('event', 'funnel_step', { step, ...metadata });
  } catch {
    // Silently swallow.
  }
}

export function getFunnelStepIndex(step: FunnelStep): number {
  return FUNNEL_STEPS.indexOf(step);
}

// ---------------------------------------------------------------------------
// Server-side aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate funnel data from Firestore `funnel_events` collection.
 *
 * Each document is expected to have: `{ step: string, timestamp: Timestamp }`.
 *
 * @param days - Number of days to look back (default 30).
 */
export async function aggregateFunnelData(days = 30): Promise<FunnelData[]> {
  // Dynamic import so this module can be imported on the client without
  // pulling in firebase-admin or server-only Firestore.
  const { Timestamp } = await import('firebase/firestore');
  const { collection, query, where, getDocs } = await import(
    'firebase/firestore'
  );
  const { db } = await import('@/lib/rhythmia/firebase');

  if (!db) {
    return FUNNEL_STEPS.map((step) => ({
      step,
      count: 0,
      conversionRate: 0,
    }));
  }

  const cutoff = Timestamp.fromDate(
    new Date(Date.now() - days * 24 * 60 * 60 * 1000),
  );

  const snap = await getDocs(
    query(collection(db, 'funnel_events'), where('timestamp', '>=', cutoff)),
  );

  const counts = new Map<FunnelStep, number>();
  for (const step of FUNNEL_STEPS) counts.set(step, 0);

  snap.forEach((doc) => {
    const step = doc.data().step as FunnelStep;
    if (counts.has(step)) {
      counts.set(step, (counts.get(step) ?? 0) + 1);
    }
  });

  return FUNNEL_STEPS.map((step, i) => {
    const count = counts.get(step) ?? 0;
    const prev = i === 0 ? count : (counts.get(FUNNEL_STEPS[i - 1]) ?? 0);
    return {
      step,
      count,
      conversionRate: prev > 0 ? Math.round((count / prev) * 100) : 0,
    };
  });
}
