'use client';

import { cn } from '@/lib/utils';

interface StatusDotProps {
  connected: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
};

export default function StatusDot({ connected, size = 'md', className }: StatusDotProps) {
  return (
    <div
      className={cn(
        'rounded-full',
        sizeClasses[size],
        connected ? 'bg-green-400' : 'bg-red-400',
        className,
      )}
    />
  );
}
