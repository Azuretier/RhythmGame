import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-8xl font-bold text-azure-500 font-pixel">404</div>
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-gray-400 text-sm">
          This area hasn&apos;t been unlocked yet. Head back to the lobby.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-medium transition-colors"
        >
          Back to Lobby
        </Link>
      </div>
    </div>
  );
}
