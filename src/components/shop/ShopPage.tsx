'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { Diamond, Star, Paintbrush, Package, History } from 'lucide-react';
import type { ShopItem } from '@/lib/shop/types';
import ShopItemCard from './ShopItemCard';
import PurchaseHistory from './PurchaseHistory';
import { useProfile } from '@/lib/profile/context';
import { useShop } from '@/lib/shop/context';
import { trackShopView, trackCheckoutStart, trackPurchaseComplete } from '@/lib/analytics/events';

type TabValue = 'crystals' | 'battle_pass' | 'skins' | 'items' | 'history';

const TABS: { value: TabValue; label: string; icon: React.ReactNode }[] = [
  { value: 'crystals', label: '結晶', icon: <Diamond className="h-4 w-4" /> },
  { value: 'battle_pass', label: 'バトルパス', icon: <Star className="h-4 w-4" /> },
  { value: 'skins', label: 'スキン', icon: <Paintbrush className="h-4 w-4" /> },
  { value: 'items', label: 'アイテム', icon: <Package className="h-4 w-4" /> },
  { value: 'history', label: '履歴', icon: <History className="h-4 w-4" /> },
];

export default function ShopPage() {
  const { profile } = useProfile();
  const { crystalBalance, ownedSkinIds, battlePassActive, refresh } = useShop();
  const [catalog, setCatalog] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('crystals');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/shop/catalog');
        if (res.ok) {
          const data = await res.json();
          setCatalog(data.items || []);
        }
      } catch {
        console.error('[Shop] Failed to load catalog');
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
    trackShopView();
  }, []);

  const isOwned = useCallback((item: ShopItem): boolean => {
    if (item.category === 'premium_skin' && item.skinId) {
      return ownedSkinIds.includes(item.skinId);
    }
    if (item.category === 'battle_pass') {
      return battlePassActive;
    }
    return false;
  }, [ownedSkinIds, battlePassActive]);

  const canAfford = useCallback((item: ShopItem): boolean => {
    if (item.priceJpy > 0) return true; // Stripe handles it
    return crystalBalance >= item.priceInCrystals;
  }, [crystalBalance]);

  const handlePurchase = useCallback(async (item: ShopItem) => {
    if (!profile?.name) return;
    setError(null);
    setPurchasing(item.id);
    trackCheckoutStart(item.id, item.priceJpy);

    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, uid: profile.name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Purchase failed');
        return;
      }

      if (data.url) {
        // Stripe checkout redirect
        window.location.href = data.url;
      } else if (data.success) {
        // Crystal purchase completed directly
        trackPurchaseComplete(item.id, item.priceJpy, item.category);
        await refresh();
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setPurchasing(null);
    }
  }, [profile?.name, refresh]);

  const categoryMap: Record<TabValue, string | null> = {
    crystals: 'crystal_pack',
    battle_pass: 'battle_pass',
    skins: 'premium_skin',
    items: 'inventory_expansion',
    history: null,
  };

  const filteredItems = activeTab !== 'history'
    ? catalog.filter(item => item.category === categoryMap[activeTab])
    : [];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-azure-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="mb-2 text-3xl font-bold text-white">ショップ</h1>
        <p className="text-sm text-white/50">コスメアイテムであなたのスタイルをカスタマイズ</p>

        {/* Crystal Balance */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/30 px-4 py-2">
          <Diamond className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-bold text-cyan-400">{crystalBalance.toLocaleString()}</span>
          <span className="text-xs text-cyan-400/60">永遠の結晶</span>
        </div>
      </motion.div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-950/30 px-4 py-2 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      <Tabs.Root value={activeTab} onValueChange={(v) => {
        setActiveTab(v as TabValue);
        if (v !== 'history') trackShopView(v);
      }}>
        <Tabs.List className="mb-6 flex gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1">
          {TABS.map(tab => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all',
                'text-white/50 hover:text-white/70',
                'data-[state=active]:bg-azure-500/20 data-[state=active]:text-azure-400',
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {TABS.filter(t => t.value !== 'history').map(tab => (
          <Tabs.Content key={tab.value} value={tab.value}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  onPurchase={handlePurchase}
                  disabled={purchasing === item.id || (!canAfford(item) && item.priceJpy === 0)}
                  owned={isOwned(item)}
                />
              ))}
            </div>
            {filteredItems.length === 0 && (
              <div className="py-12 text-center text-sm text-white/40">
                このカテゴリにはアイテムがありません
              </div>
            )}

            {/* Insufficient crystals warning for crystal-priced tabs */}
            {activeTab === 'skins' && filteredItems.some(i => !canAfford(i) && !isOwned(i)) && (
              <div className="mt-4 text-center text-xs text-white/30">
                結晶が足りない場合は「結晶」タブから購入できます
              </div>
            )}
          </Tabs.Content>
        ))}

        <Tabs.Content value="history">
          {profile?.name ? (
            <PurchaseHistory uid={profile.name} />
          ) : (
            <div className="py-12 text-center text-sm text-white/40">
              プロフィールを設定すると購入履歴が表示されます
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
