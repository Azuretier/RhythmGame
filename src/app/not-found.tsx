import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#fff',
        fontFamily: "'Inter', sans-serif",
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <h1
        style={{
          fontSize: '6rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: '#007FFF',
          margin: 0,
          lineHeight: 1,
        }}
      >
        404
      </h1>
      <p
        style={{
          fontSize: '1.1rem',
          color: 'rgba(255, 255, 255, 0.5)',
          marginTop: '16px',
          marginBottom: '32px',
        }}
      >
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        style={{
          padding: '10px 24px',
          fontSize: '0.85rem',
          fontWeight: 500,
          color: '#fff',
          background: 'rgba(0, 127, 255, 0.15)',
          border: '1px solid rgba(0, 127, 255, 0.3)',
          borderRadius: '8px',
          textDecoration: 'none',
          transition: 'background 0.2s',
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
