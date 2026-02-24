'use client';

import { cn } from '@/lib/utils';

type GlassVariant = 'default' | 'subtle' | 'gradient';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  from?: string;
  to?: string;
  borderColor?: string;
  className?: string;
}

const variantClasses: Record<GlassVariant, string> = {
  default: 'bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl',
  subtle: 'bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10',
  gradient: 'backdrop-blur-lg rounded-2xl p-8 shadow-2xl',
};

export default function GlassCard({
  children,
  variant = 'default',
  from,
  to,
  borderColor,
  className,
}: GlassCardProps) {
  const gradientStyle =
    variant === 'gradient' && from && to
      ? `bg-gradient-to-br ${from} ${to} border ${borderColor ?? 'border-white/20'}`
      : '';

  return (
    <div className={cn(variantClasses[variant], gradientStyle, className)}>
      {children}
    </div>
  );
}
