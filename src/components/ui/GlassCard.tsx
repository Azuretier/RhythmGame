'use client';

import { cn } from '@/lib/utils';

type GlassVariant = 'default' | 'subtle' | 'gradient';

type GradientPreset = 'yellow-pink' | 'blue-purple';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  gradient?: GradientPreset;
  className?: string;
}

const variantClasses: Record<GlassVariant, string> = {
  default: 'bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl',
  subtle: 'bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10',
  gradient: 'backdrop-blur-lg rounded-2xl p-8 shadow-2xl',
};

const gradientPresets: Record<GradientPreset, string> = {
  'yellow-pink': 'bg-gradient-to-br from-yellow-500/20 to-pink-500/20 border border-yellow-500/30',
  'blue-purple': 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30',
};

export default function GlassCard({
  children,
  variant = 'default',
  gradient,
  className,
}: GlassCardProps) {
  const gradientStyle = variant === 'gradient' && gradient ? gradientPresets[gradient] : '';

  return (
    <div className={cn(variantClasses[variant], gradientStyle, className)}>
      {children}
    </div>
  );
}
