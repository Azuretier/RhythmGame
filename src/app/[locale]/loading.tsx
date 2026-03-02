export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-azure-500 animate-spin"
            style={{ borderTopColor: '#007FFF' }}
          />
          <div
            className="absolute inset-1.5 rounded-full border-2 border-transparent border-t-azure-500/50 animate-spin"
            style={{ borderTopColor: 'rgba(0, 127, 255, 0.5)', animationDirection: 'reverse', animationDuration: '0.8s' }}
          />
        </div>
        <span className="text-sm text-muted-foreground tracking-widest uppercase">Loading</span>
      </div>
    </div>
  );
}
