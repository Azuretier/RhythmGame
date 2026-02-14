'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { sampleWorld } from '@/components/rhythmia/world/worldData';

// Dynamically import to avoid SSR issues with Three.js
const World3D = dynamic(
  () => import('@/components/rhythmia/world/World3D'),
  { 
    ssr: false,
    loading: () => (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: 'white',
        fontSize: '1.25rem',
      }}>
        Loading World...
      </div>
    ),
  }
);

export default function WorldExplorerPage() {
  const [completedStories, setCompletedStories] = useState<string[]>([]);

  const handleStoryComplete = (storyId: string) => {
    setCompletedStories((prev) => [...prev, storyId]);
    console.log(`Story completed: ${storyId}`);
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
      }}
    >
      {/* Info Overlay */}
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '50%',
          transform: 'translateX(50%)',
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(0, 127, 255, 0.4)',
          borderRadius: '1rem',
          padding: '1rem 2rem',
          zIndex: 60,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            margin: 0,
            marginBottom: '0.5rem',
          }}
        >
          {sampleWorld.title}
        </h1>
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.875rem',
            margin: 0,
          }}
        >
          Explore the world, interact with story points, and use your skills
        </p>
        <div
          style={{
            marginTop: '0.75rem',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          Stories Completed: {completedStories.length} / {sampleWorld.zones[0].storyPoints.length}
        </div>
      </div>

      {/* World Component */}
      <World3D worldData={sampleWorld} onStoryComplete={handleStoryComplete} />

      {/* Feature Badges */}
      <div
        style={{
          position: 'fixed',
          top: '8rem',
          left: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 45,
        }}
      >
        {[
          '✓ WASD Movement',
          '✓ QWER Skills',
          '✓ Story Interaction',
          '✓ 3D World',
          '✓ LoL-inspired',
        ].map((feature) => (
          <div
            key={feature}
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
