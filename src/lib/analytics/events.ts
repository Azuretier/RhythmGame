/**
 * Extended analytics events for shop and marketing tracking.
 *
 * Follows the same pattern as the root analytics.ts — silently no-ops
 * when gtag is unavailable (SSR, ad-blockers).
 */

function sendEvent(eventName: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as Record<string, unknown>).gtag as
    | ((...args: unknown[]) => void)
    | undefined;
  if (typeof gtag !== 'function') return;

  try {
    gtag('event', eventName, params);
  } catch {
    // Silently swallow — analytics should never break the app.
  }
}

// ---------------------------------------------------------------------------
// Shop events
// ---------------------------------------------------------------------------

export function trackShopView(category?: string): void {
  sendEvent('shop_view', { category: category ?? 'all' });
}

export function trackCheckoutStart(itemId: string, priceJpy: number): void {
  sendEvent('checkout_start', { item_id: itemId, price_jpy: priceJpy });
}

export function trackPurchaseComplete(
  itemId: string,
  priceJpy: number,
  category: string,
): void {
  sendEvent('purchase_complete', {
    item_id: itemId,
    price_jpy: priceJpy,
    category,
  });
}

export function trackGachaPull(
  bannerId: string,
  rarity: number,
  isPity: boolean,
): void {
  sendEvent('gacha_pull', {
    banner_id: bannerId,
    rarity,
    is_pity: isPity,
  });
}

export function trackSkinPreview(skinId: string): void {
  sendEvent('skin_preview', { skin_id: skinId });
}

export function trackBattlePassPurchase(seasonId: string): void {
  sendEvent('battle_pass_purchase', { season_id: seasonId });
}

// ---------------------------------------------------------------------------
// Marketing events
// ---------------------------------------------------------------------------

export function trackMarketingImpression(
  source: string,
  campaign?: string,
): void {
  sendEvent('marketing_impression', {
    source,
    campaign: campaign ?? 'organic',
  });
}

export function trackReferralClick(referrer: string): void {
  sendEvent('referral_click', { referrer });
}
