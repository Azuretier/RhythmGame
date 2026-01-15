'use client';

export default function RhythmiaPage() {
  return (
    <iframe
      src="/rhythmia-nexus.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0
      }}
      title="RHYTHMIA NEXUS"
    />
  );
}