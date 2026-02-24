import RankCardShell from './RankCardShell';

interface RankCardErrorProps {
  message: string;
}

export default function RankCardError({ message }: RankCardErrorProps) {
  return (
    <RankCardShell>
      <div className="text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">Error</h2>
        <p className="text-white/70 mb-6">
          {message}
        </p>
        <p className="text-sm text-white/50">
          Please try again later or contact support if the problem persists.
        </p>
      </div>
    </RankCardShell>
  );
}
