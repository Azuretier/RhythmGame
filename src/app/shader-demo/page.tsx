'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const WebGLBackground = dynamic(() => import('@/components/home/WebGLBackground'), {
  ssr: false,
});

export default function ShaderDemoPage() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0,
      overflow: 'hidden',
      background: '#000'
    }}>
      <WebGLBackground onLoaded={() => setLoaded(true)} />
      
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
          Full-Screen Fragment Shader
        </h1>
        <p style={{
          fontSize: '1.5rem',
          opacity: 0.9,
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
          marginBottom: '2rem',
        }}>
          WebGL + Three.js + GLSL
        </p>
        <div style={{
          display: 'flex',
          gap: '2rem',
          justifyContent: 'center',
          fontSize: '1rem',
          opacity: 0.8,
        }}>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ Time Uniform</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>Animated effects</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ Resolution</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>Responsive sizing</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ Noise</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>Perlin & FBM</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ Light Scattering</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>Rayleigh & Mie</div>
          </div>
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
        Features: Volumetric lighting • God rays • Atmospheric scattering • Dynamic particles
      </div>
    </div>
  );
}
