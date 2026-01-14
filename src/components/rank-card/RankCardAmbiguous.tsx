interface Candidate {
  memberId: string;
  displayName: string;
}

interface RankCardAmbiguousProps {
  displayName: string;
  candidates: Candidate[];
}

export default function RankCardAmbiguous({ displayName, candidates }: RankCardAmbiguousProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="relative w-full max-w-2xl">
        {/* Glass card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-12">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3 text-center">Multiple Members Found</h2>
          <p className="text-white/70 mb-2 text-center">
            Multiple members match the display name:
          </p>
          <p className="text-xl font-semibold text-purple-300 mb-6 text-center">
            {displayName}
          </p>
          
          <div className="bg-white/5 rounded-2xl p-6 mb-6">
            <h3 className="text-white font-medium mb-4">Matching Members:</h3>
            <div className="space-y-2">
              {candidates.map((candidate, index) => (
                <div 
                  key={candidate.memberId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <span className="text-white/50 font-mono text-sm">{index + 1}.</span>
                  <span className="text-white flex-1">{candidate.displayName}</span>
                  <span className="text-white/40 text-xs font-mono">ID: {candidate.memberId}</span>
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-sm text-white/50 text-center">
            Please contact a server administrator to resolve this ambiguity.
          </p>
        </div>
      </div>
    </div>
  );
}
