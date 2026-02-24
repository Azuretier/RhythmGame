'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const WebGLBackground = dynamic(() => import('@/components/home/WebGLBackground'), {
  ssr: false,
});

const AtmosphereBackground = dynamic(() => import('@/components/home/AtmosphereBackground'), {
  ssr: false,
});

type ShaderMode = 'light-scattering' | 'atmosphere';

const SHADERS: Record<ShaderMode, { label: string; features: string[]; description: string }> = {
  'light-scattering': {
    label: 'Light Scattering',
    features: ['Volumetric lighting', 'God rays', 'Atmospheric scattering', 'Dynamic particles'],
    description: 'Rayleigh & Mie physics-based light scattering with volumetric god rays and animated particles.',
  },
  atmosphere: {
    label: 'Atmosphere',
    features: ['Night city skyline', 'Layered fog', 'Window glow', 'Film grain'],
    description: 'Night-time city atmosphere with procedural building silhouettes, layered fog, and cinematic grading.',
  },
};

export default function ShaderDemoPage() {
  const [loaded, setLoaded] = useState(false);
  const [activeShader, setActiveShader] = useState<ShaderMode>('light-scattering');

  const shader = SHADERS[activeShader];

  function handleSwitch(mode: ShaderMode) {
    if (mode === activeShader) return;
    setLoaded(false);
    setActiveShader(mode);
  }

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0,
      overflow: 'hidden',
      background: '#000'
    }}>
      {activeShader === 'light-scattering' && (
        <WebGLBackground onLoaded={() => setLoaded(true)} />
      )}
      {activeShader === 'atmosphere' && (
        <AtmosphereBackground onLoaded={() => setLoaded(true)} />
      )}
      
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        textAlign: 'center',
        pointerEvents: 'none',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
        }}>
          {shader.label}
        </h1>
        <p style={{
          fontSize: '1.2rem',
          opacity: 0.85,
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
          marginBottom: '2rem',
          maxWidth: '480px',
        }}>
          {shader.description}
        </p>
        <div style={{
          display: 'flex',
          gap: '2rem',
          justifyContent: 'center',
          fontSize: '1rem',
          opacity: 0.8,
        }}>
          {shader.features.map((feat) => (
            <div key={feat}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ {feat}</div>
            </div>
          ))}
        </div>
        {!loaded && (
          <div style={{
            marginTop: '3rem',
            fontSize: '1.2rem',
            opacity: 0.6,
          }}>
            Loading shader...
          </div>
        )}
      </div>

      {/* Shader selector */}
      <div style={{
        position: 'fixed',
        top: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        gap: '0.75rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {(Object.keys(SHADERS) as ShaderMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleSwitch(mode)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '9999px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: activeShader === mode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.4)',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: activeShader === mode ? 'bold' : 'normal',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'background 0.2s',
            }}
          >
            {SHADERS[mode].label}
          </button>
        ))}
      </div>
      
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        color: 'white',
        opacity: 0.6,
        fontSize: '0.875rem',
        textAlign: 'center',
        textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
      }}>
        WebGL + Three.js + GLSL • {shader.features.join(' • ')}
      </div>
    </div>
  );
}
