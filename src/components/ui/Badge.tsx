'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'host' | 'you' | 'danger' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  host: 'bg-yellow-500/30 border-yellow-500/50',
  you: 'bg-blue-500/30 border-blue-500/50',
  danger: 'bg-red-500/30 border-red-500/50',
  info: 'bg-white/20 border-white/30',
};

export default function Badge({ variant = 'info', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'px-3 py-1 border rounded-full text-sm font-semibold',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
