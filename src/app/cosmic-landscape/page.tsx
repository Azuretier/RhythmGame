'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const CosmicLandscapeScene = dynamic(
  () => import('@/components/cosmic-landscape/CosmicLandscapeScene'),
  { ssr: false }
);

export default function CosmicLandscapePage() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: '#050210',
    }}>
      <CosmicLandscapeScene onLoaded={() => setLoaded(true)} />

      {/* Title overlay */}
      <div style={{
        position: 'fixed',
        top: '6%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        textAlign: 'center',
        pointerEvents: 'none',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 4vw, 3.5rem)',
          fontWeight: 200,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          textShadow: '0 0 40px rgba(120, 60, 255, 0.6), 0 0 80px rgba(120, 60, 255, 0.3)',
          marginBottom: '0.5rem',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 2s ease-in',
        }}>
          Voxel Cosmos
        </h1>
        <p style={{
          fontSize: 'clamp(0.7rem, 1.2vw, 1rem)',
          fontWeight: 300,
          letterSpacing: '0.15em',
          opacity: loaded ? 0.6 : 0,
          transition: 'opacity 2.5s ease-in 0.5s',
          textShadow: '0 0 20px rgba(100, 200, 255, 0.4)',
        }}>
          Floating Islands &middot; Cosmic Rifts &middot; Volumetric Lighting
        </p>
      </div>

      {/* Feature tags */}
      <div style={{
        position: 'fixed',
        bottom: '3%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        gap: '1.5rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity: loaded ? 0.5 : 0,
        transition: 'opacity 3s ease-in 1s',
      }}>
        {[
          'Path-Traced Atmosphere',
          'Instanced Voxels',
          'Bloom + Chromatic Aberration',
          'Procedural Islands',
          'GLSL Shaders',
          'Volumetric God Rays',
        ].map((tag) => (
          <span
            key={tag}
            style={{
              color: 'rgba(200, 180, 255, 0.7)',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              textShadow: '0 0 8px rgba(120, 60, 255, 0.3)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Loading state */}
      {!loaded && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
          color: 'rgba(200, 180, 255, 0.8)',
          fontSize: '1rem',
          fontFamily: 'monospace',
          letterSpacing: '0.2em',
          textShadow: '0 0 20px rgba(120, 60, 255, 0.5)',
        }}>
          Generating cosmos...
        </div>
      )}
    </div>
  );
}
