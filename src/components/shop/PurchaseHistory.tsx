'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Diamond, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import type { Transaction } from '@/lib/shop/types';

interface PurchaseHistoryProps {
  uid: string;
}

const STATUS_ICONS = {
  completed: <CheckCircle className="h-4 w-4 text-emerald-400" />,
  pending: <Clock className="h-4 w-4 text-amber-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  refunded: <RefreshCw className="h-4 w-4 text-zinc-400" />,
} as const;

const STATUS_LABELS: Record<Transaction['status'], string> = {
  completed: '完了',
  pending: '処理中',
  failed: '失敗',
  refunded: '返金済み',
};

export default function PurchaseHistory({ uid }: PurchaseHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/shop/purchases?uid=${encodeURIComponent(uid)}`);
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions || []);
        }
      } catch {
        console.error('[Shop] Failed to load purchase history');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-azure-500 border-t-transparent" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-white/40">
        まだ購入履歴はありません
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {transactions.map((tx, i) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3',
            )}
          >
            <div className="flex items-center gap-3">
              {STATUS_ICONS[tx.status]}
              <div>
                <p className="text-sm font-medium text-white">{tx.itemName}</p>
                <p className="text-xs text-white/40">
                  {new Date(tx.createdAt).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>

            <div className="text-right">
              {tx.amountJpy > 0 ? (
                <p className="text-sm font-medium text-white">¥{tx.amountJpy.toLocaleString()}</p>
              ) : (
                <p className="flex items-center gap-1 text-sm font-medium text-cyan-400">
                  <Diamond className="h-3 w-3" />
                  {tx.crystalsSpent.toLocaleString()}
                </p>
              )}
              <p className={cn('text-xs', tx.status === 'completed' ? 'text-emerald-400' : 'text-white/40')}>
                {STATUS_LABELS[tx.status]}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
