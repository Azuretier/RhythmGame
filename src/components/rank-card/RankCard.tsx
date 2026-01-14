interface RankCardProps {
  displayName: string;
  level: number;
  xp: number;
  xpToNext: number;
  rankName?: string;
  avatarUrl?: string;
}

export default function RankCard({
  displayName,
  level,
  xp,
  xpToNext,
  rankName,
  avatarUrl,
}: RankCardProps) {
  // Calculate progress percentage
  const totalXpForLevel = xp + xpToNext;
  const progressPercentage = totalXpForLevel > 0 ? (xp / totalXpForLevel) * 100 : 0;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="relative w-full max-w-2xl">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-3xl blur-3xl" />
        
        {/* Glass card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          {/* Noise texture overlay */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
              backgroundSize: '200px 200px',
            }}
          />
          
          {/* Content */}
          <div className="relative p-8">
            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
              {/* Avatar */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-xl opacity-50" />
                <div className="relative w-24 h-24 rounded-full bg-white/10 border-2 border-white/20 overflow-hidden">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold bg-gradient-to-br from-purple-500 to-pink-500">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Name and rank */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2 truncate">
                  {displayName}
                </h1>
                {rankName && (
                  <p className="text-lg text-purple-300 font-medium">
                    {rankName}
                  </p>
                )}
              </div>
              
              {/* Level badge */}
              <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <span className="text-xs text-white/80 font-medium">LEVEL</span>
                <span className="text-2xl font-bold text-white">{level}</span>
              </div>
            </div>
            
            {/* Progress section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/80">Experience</span>
                <span className="text-white font-medium">
                  {xp.toLocaleString()} / {totalXpForLevel.toLocaleString()} XP
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              
              <div className="text-right text-sm text-white/60">
                {xpToNext.toLocaleString()} XP to next level
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
