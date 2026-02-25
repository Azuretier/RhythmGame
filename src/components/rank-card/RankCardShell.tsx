interface RankCardShellProps {
  children: React.ReactNode;
  padding?: string;
}

export default function RankCardShell({ children, padding = 'p-12' }: RankCardShellProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="relative w-full max-w-2xl">
        {/* Glass card */}
        <div className={`relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl ${padding}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
