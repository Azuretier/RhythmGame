'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#0a0a0a', color: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{ maxWidth: '448px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#ef4444', marginBottom: '16px' }}>
              Critical Error
            </div>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px' }}>
              Something went seriously wrong. Please try refreshing the page.
            </p>
            {error.digest && (
              <p style={{ color: '#4b5563', fontSize: '12px', fontFamily: 'monospace', marginBottom: '16px' }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007FFF',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
