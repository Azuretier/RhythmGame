'use client';

import { cn } from '@/lib/utils';

interface LoadingStateProps {
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  emptyIcon?: React.ReactNode;
  loadingClassName?: string;
  emptyClassName?: string;
  spinnerClassName?: string;
  children: React.ReactNode;
}

export default function LoadingState({
  isLoading,
  isEmpty,
  emptyMessage,
  emptyIcon,
  loadingClassName,
  emptyClassName,
  spinnerClassName,
  children,
}: LoadingStateProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', loadingClassName)}>
        <div className={cn('w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin', spinnerClassName)} />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 gap-2 text-white/40', emptyClassName)}>
        {emptyIcon && <div className="opacity-30">{emptyIcon}</div>}
        <span className="text-sm">{emptyMessage}</span>
      </div>
    );
  }

  return <>{children}</>;
}
