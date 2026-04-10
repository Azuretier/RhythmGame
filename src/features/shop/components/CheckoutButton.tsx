'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ShopItem } from '@/lib/shop/types';
import { Loader2 } from 'lucide-react';

interface CheckoutButtonProps {
  item: ShopItem;
  uid: string;
  locale?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function CheckoutButton({ item, uid, locale = 'ja', className, children }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, uid, locale }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'チェックアウトに失敗しました');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else if (data.granted) {
        // Crystal purchase completed directly
        window.location.reload();
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={cn(
          'flex items-center gap-2 rounded-lg bg-azure-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-azure-600 active:scale-95 disabled:cursor-wait disabled:opacity-50',
          className,
        )}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children || '購入する'}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
