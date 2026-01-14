export default function RankCardLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="relative w-full max-w-2xl mx-4">
        {/* Glass card with shimmer effect */}
        <div className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          
          {/* Content */}
          <div className="relative p-8">
            {/* Header skeleton */}
            <div className="flex items-center gap-6 mb-6">
              {/* Avatar skeleton */}
              <div className="w-24 h-24 rounded-full bg-white/10 animate-pulse" />
              
              {/* Name and rank skeleton */}
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-white/10 rounded-lg w-3/4 animate-pulse" />
                <div className="h-6 bg-white/10 rounded-lg w-1/2 animate-pulse" />
              </div>
            </div>
            
            {/* Stats skeleton */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-32 animate-pulse" />
              </div>
              
              {/* Progress bar skeleton */}
              <div className="h-4 bg-white/10 rounded-full w-full animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="mt-6 text-center">
          <p className="text-white/80 text-lg font-medium animate-pulse">
            Loading rank card...
          </p>
        </div>
      </div>
    </div>
  );
}
