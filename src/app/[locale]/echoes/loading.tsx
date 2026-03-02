export default function EchoesLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
