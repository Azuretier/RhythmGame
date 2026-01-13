import { cn } from '@/lib/utils';

interface RankCardProps {
  displayName: string;
  level: number;
  xp: number;
  rankName?: string | null;
  avatarUrl?: string | null;
  className?: string;
}

export function RankCard({
  displayName,
  level,
  xp,
  rankName,
  avatarUrl,
  className,
}: RankCardProps) {
  // Calculate XP progress (assuming 1000 XP per level for demonstration)
  const xpForCurrentLevel = level * 1000;
  const xpForNextLevel = (level + 1) * 1000;
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = Math.min((xpInCurrentLevel / xpNeededForLevel) * 100, 100);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-slate-900/90 via-purple-900/50 to-slate-900/90',
        'backdrop-blur-xl border border-white/10',
        'shadow-2xl shadow-purple-500/20',
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

      {/* Gradient mesh accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 p-8">
        <div className="flex items-center gap-6 mb-6">
          {/* Avatar */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-lg opacity-50" />
            <div className="relative w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden bg-slate-800">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/50">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Level badge */}
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-purple-600 to-pink-600 text-white text-sm font-bold px-3 py-1 rounded-full border-2 border-slate-900 shadow-lg">
              {level}
            </div>
          </div>

          {/* Name and rank */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-1 drop-shadow-lg">
              {displayName}
            </h2>
            {rankName && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm font-semibold text-amber-200">
                  {rankName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* XP Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-300 font-medium">Level {level}</span>
            <span className="text-slate-400">
              {xpInCurrentLevel.toLocaleString()} / {xpNeededForLevel.toLocaleString()} XP
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="relative h-3 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>

          {/* Total XP */}
          <div className="flex justify-end">
            <span className="text-xs text-slate-500">
              Total: {xp.toLocaleString()} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
