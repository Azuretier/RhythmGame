import { cn } from '@/lib/utils';

interface RankCardSkeletonProps {
  className?: string;
}

export function RankCardSkeleton({ className }: RankCardSkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-slate-900/90 via-purple-900/50 to-slate-900/90',
        'backdrop-blur-xl border border-white/10',
        'shadow-2xl shadow-purple-500/20',
        'animate-pulse',
        className
      )}
    >
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Animated gradient mesh */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse-slow" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/30 to-cyan-500/30 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2 animate-pulse-slow" />

      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="relative z-10 p-8">
        <div className="flex items-center gap-6 mb-6">
          {/* Avatar skeleton */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-slate-700/50 border-4 border-white/10" />
            {/* Level badge skeleton */}
            <div className="absolute -bottom-2 -right-2 w-12 h-8 bg-slate-700/50 rounded-full border-2 border-slate-900" />
          </div>

          {/* Name and rank skeleton */}
          <div className="flex-1 space-y-3">
            <div className="h-8 w-48 bg-slate-700/50 rounded-lg" />
            <div className="h-6 w-32 bg-slate-700/30 rounded-full" />
          </div>
        </div>

        {/* XP Progress skeleton */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="h-4 w-20 bg-slate-700/50 rounded" />
            <div className="h-4 w-32 bg-slate-700/50 rounded" />
          </div>
          
          {/* Progress bar skeleton */}
          <div className="relative h-3 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full" />
          </div>

          {/* Total XP skeleton */}
          <div className="flex justify-end">
            <div className="h-3 w-24 bg-slate-700/30 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
