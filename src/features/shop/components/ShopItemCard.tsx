'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ShopItem } from '@/lib/shop/types';
import { Diamond, Star, ShoppingCart } from 'lucide-react';

interface ShopItemCardProps {
  item: ShopItem;
  onPurchase: (item: ShopItem) => void;
  disabled?: boolean;
  owned?: boolean;
}

const RARITY_COLORS = {
  common: 'border-zinc-600 bg-zinc-900/50',
  rare: 'border-blue-500/50 bg-blue-950/30',
  epic: 'border-purple-500/50 bg-purple-950/30',
  legendary: 'border-amber-500/50 bg-amber-950/30',
} as const;

const RARITY_BADGES = {
  common: 'bg-zinc-700 text-zinc-300',
  rare: 'bg-blue-900/80 text-blue-300',
  epic: 'bg-purple-900/80 text-purple-300',
  legendary: 'bg-amber-900/80 text-amber-300',
} as const;

export default function ShopItemCard({ item, onPurchase, disabled, owned }: ShopItemCardProps) {
  const rarity = item.rarity || 'common';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative rounded-xl border p-4 transition-all',
        RARITY_COLORS[rarity],
        owned && 'opacity-60',
      )}
    >
      {item.isLimited && (
        <div className="absolute -top-2 -right-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
          LIMITED
        </div>
      )}

      {item.rarity && (
        <span className={cn('mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase', RARITY_BADGES[rarity])}>
          {rarity}
        </span>
      )}

      <div className="mb-3 flex h-20 items-center justify-center">
        {item.category === 'crystal_pack' ? (
          <Diamond className="h-12 w-12 text-cyan-400" />
        ) : item.category === 'premium_skin' ? (
          <div
            className="h-16 w-16 rounded-lg border-2"
            style={{ backgroundColor: item.tags?.[0] || '#007FFF', borderColor: item.tags?.[1] || '#3399FF' }}
          />
        ) : item.category === 'battle_pass' ? (
          <Star className="h-12 w-12 text-amber-400" />
        ) : (
          <ShoppingCart className="h-12 w-12 text-emerald-400" />
        )}
      </div>

      <h3 className="mb-1 text-sm font-semibold text-white">{item.nameJa}</h3>
      <p className="mb-3 text-xs text-white/50">{item.descriptionJa}</p>

      {item.crystalsGranted && (
        <p className="mb-2 flex items-center gap-1 text-xs text-cyan-400">
          <Diamond className="h-3 w-3" />
          {item.crystalsGranted.toLocaleString()} 結晶
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">
          {item.priceJpy > 0 ? (
            <span className="text-white">¥{item.priceJpy.toLocaleString()}</span>
          ) : (
            <span className="flex items-center gap-1 text-cyan-400">
              <Diamond className="h-3.5 w-3.5" />
              {item.priceInCrystals.toLocaleString()}
            </span>
          )}
        </div>

        <button
          onClick={() => onPurchase(item)}
          disabled={disabled || owned}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            owned
              ? 'cursor-not-allowed bg-zinc-700 text-zinc-400'
              : 'bg-azure-500 text-white hover:bg-azure-600 active:scale-95',
            (disabled && !owned) && 'cursor-wait opacity-50',
          )}
        >
          {owned ? '所持済み' : '購入'}
        </button>
      </div>
    </motion.div>
  );
}
