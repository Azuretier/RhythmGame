'use client';

import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  currentIndex: number;
  className?: string;
  dotClassName?: string;
  activeDotClassName?: string;
  doneDotClassName?: string;
}

export default function StepIndicator({
  steps,
  currentIndex,
  className,
  dotClassName,
  activeDotClassName,
  doneDotClassName,
}: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 justify-center', className)}>
      {steps.map((step, i) => (
        <div
          key={step}
          className={cn(
            'w-2 h-2 rounded-full bg-white/20 transition-all duration-200',
            dotClassName,
            i === currentIndex && cn('w-6 bg-white', activeDotClassName),
            i < currentIndex && cn('bg-white/60', doneDotClassName),
          )}
        />
      ))}
    </div>
  );
}
