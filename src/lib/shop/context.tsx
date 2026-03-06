'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useProfile } from '@/lib/profile/context';
import type { PlayerPurchaseState } from './types';

interface ShopContextValue {
  purchaseState: PlayerPurchaseState | null;
  crystalBalance: number;
  ownedSkinIds: string[];
  battlePassActive: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue>({
  purchaseState: null,
  crystalBalance: 0,
  ownedSkinIds: [],
  battlePassActive: false,
  loading: true,
  refresh: async () => {},
});

export function useShop() {
  return useContext(ShopContext);
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const [purchaseState, setPurchaseState] = useState<PlayerPurchaseState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profile?.name) {
      setPurchaseState(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/shop/purchases?uid=${encodeURIComponent(profile.name)}&state=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.purchaseState) {
          setPurchaseState(data.purchaseState);
        }
      }
    } catch {
      console.error('[Shop] Failed to load purchase state');
    } finally {
      setLoading(false);
    }
  }, [profile?.name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for post-checkout success
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('shop') === 'success') {
      // Refresh state after successful purchase
      setTimeout(() => refresh(), 1000);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('shop');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    }
  }, [refresh]);

  return (
    <ShopContext.Provider
      value={{
        purchaseState,
        crystalBalance: purchaseState?.premiumCurrency ?? 0,
        ownedSkinIds: purchaseState?.ownedSkinIds ?? [],
        battlePassActive: purchaseState?.battlePassActive ?? false,
        loading,
        refresh,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}
