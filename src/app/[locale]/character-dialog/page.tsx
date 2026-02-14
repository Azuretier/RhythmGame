'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { sampleStory } from '@/components/rhythmia/character/storyData';

// Dynamically import to avoid SSR issues with Three.js
const CharacterDialog = dynamic(
  () => import('@/components/rhythmia/character/CharacterDialog'),
  { ssr: false }
);

export default function CharacterDialogPage() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [key, setKey] = useState(0); // Force remount on scene change

  const currentScene = sampleStory.scenes[sceneIndex];
  const totalScenes = sampleStory.scenes.length;

  const handleSceneComplete = () => {
    // Auto-advance to next scene if available
    if (sceneIndex < totalScenes - 1) {
      setSceneIndex(sceneIndex + 1);
      setKey((k) => k + 1);
    }
  };

  const handlePrevScene = () => {
    if (sceneIndex > 0) {
      setSceneIndex(sceneIndex - 1);
      setKey((k) => k + 1);
    }
  };

  const handleNextScene = () => {
    if (sceneIndex < totalScenes - 1) {
      setSceneIndex(sceneIndex + 1);
      setKey((k) => k + 1);
    }
  };

  const handleReset = () => {
    setSceneIndex(0);
    setKey((k) => k + 1);
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '1.5rem 2rem',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1
            style={{
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              margin: 0,
            }}
          >
            {sampleStory.title}
          </h1>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.875rem',
              margin: '0.25rem 0 0 0',
            }}
          >
            3D Character Dialog System Preview
          </p>
        </div>

        {/* Scene counter */}
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.875rem',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
          }}
        >
          Scene {sceneIndex + 1} / {totalScenes}
        </div>
      </div>

      {/* Main content area */}
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          height: 'calc(100vh - 200px)',
          margin: '100px auto 0',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {currentScene && (
          <CharacterDialog
            key={key}
            scene={currentScene}
            onSceneComplete={handleSceneComplete}
            height="600px"
            className="character-dialog-preview"
          />
        )}
      </div>

      {/* Navigation controls */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1.5rem 2rem',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 100,
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={handlePrevScene}
          disabled={sceneIndex === 0}
          style={{
            padding: '0.75rem 1.5rem',
            background: sceneIndex === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 127, 255, 0.8)',
            color: sceneIndex === 0 ? 'rgba(255, 255, 255, 0.3)' : 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: sceneIndex === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ← Previous Scene
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          ↻ Reset to Start
        </button>

        <button
          onClick={handleNextScene}
          disabled={sceneIndex === totalScenes - 1}
          style={{
            padding: '0.75rem 1.5rem',
            background:
              sceneIndex === totalScenes - 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 127, 255, 0.8)',
            color: sceneIndex === totalScenes - 1 ? 'rgba(255, 255, 255, 0.3)' : 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: sceneIndex === totalScenes - 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Next Scene →
        </button>
      </div>

      {/* Instructions overlay */}
      <div
        style={{
          position: 'fixed',
          bottom: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '0.75rem',
          textAlign: 'center',
          zIndex: 99,
        }}
      >
        Click dialog box or press Space/Enter to advance • Mouse moves character head
      </div>

      {/* Feature badges */}
      <div
        style={{
          position: 'fixed',
          top: '120px',
          left: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 99,
        }}
      >
        {[
          '✓ Toon Shader',
          '✓ Cel Shading',
          '✓ Rim Lighting',
          '✓ Typewriter Effect',
          '✓ Mouse Tracking',
          '✓ Animation Sync',
        ].map((feature, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem',
              fontWeight: '500',
              border: '1px solid rgba(0, 127, 255, 0.3)',
            }}
          >
            {feature}
          </div>
        ))}
      </div>
    </div>
  );
}
