'use client';

import { Diamond } from 'lucide-react';
import { useShop } from '@/lib/shop/context';
import { cn } from '@/lib/utils';

interface CrystalBalanceProps {
  className?: string;
  onClick?: () => void;
}

export default function CrystalBalance({ className, onClick }: CrystalBalanceProps) {
  const { crystalBalance, loading } = useShop();

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-950/30 px-3 py-1 text-xs font-medium text-cyan-400 transition-all hover:border-cyan-500/40 hover:bg-cyan-950/50',
        className,
      )}
    >
      <Diamond className="h-3.5 w-3.5" />
      {loading ? '...' : crystalBalance.toLocaleString()}
    </button>
  );
}
