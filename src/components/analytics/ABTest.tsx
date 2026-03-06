'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  getVariant,
  trackVariantExposure,
  type ABTestConfig,
} from '@/lib/analytics/ab-test';
import { useProfile } from '@/lib/profile/context';

const ANON_KEY = 'azuretier_anon_id';

function getAnonymousId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = `anon_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

interface ABTestProps {
  testId: string;
  variants: string[];
  weights?: number[];
  children: (variant: string) => React.ReactNode;
}

/**
 * Render-props A/B test wrapper.
 *
 * Uses the player's profile name as a stable ID, falling back to an
 * anonymous localStorage ID for visitors without a profile.
 *
 * Tracks exposure once on mount.
 *
 * @example
 * ```tsx
 * <ABTest testId="shop-layout" variants={['grid', 'list']}>
 *   {(variant) => variant === 'grid' ? <GridView /> : <ListView />}
 * </ABTest>
 * ```
 */
export function ABTest({ testId, variants, weights, children }: ABTestProps) {
  const { profile } = useProfile();
  const playerId = profile?.name ?? getAnonymousId();
  const trackedRef = useRef(false);

  const config: ABTestConfig = useMemo(
    () => ({ testId, variants, weights }),
    [testId, variants, weights],
  );

  const variant = useMemo(
    () => getVariant(playerId, config),
    [playerId, config],
  );

  useEffect(() => {
    if (!trackedRef.current) {
      trackVariantExposure(testId, variant);
      trackedRef.current = true;
    }
  }, [testId, variant]);

  return <>{children(variant)}</>;
}
