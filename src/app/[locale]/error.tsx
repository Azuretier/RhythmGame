'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl font-bold text-red-500 font-pixel">ERROR</div>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-gray-400 text-sm">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-gray-600 text-xs font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="px-6 py-3 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
