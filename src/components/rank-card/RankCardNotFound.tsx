interface RankCardNotFoundProps {
  displayName: string;
}

export default function RankCardNotFound({ displayName }: RankCardNotFoundProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="relative w-full max-w-2xl">
        {/* Glass card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-12 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">Member Not Found</h2>
          <p className="text-white/70 mb-2">
            No member found with display name:
          </p>
          <p className="text-xl font-semibold text-purple-300 mb-6">
            {displayName}
          </p>
          <p className="text-sm text-white/50">
            Please check the spelling or make sure the member exists in this server.
          </p>
        </div>
      </div>
    </div>
  );
}
