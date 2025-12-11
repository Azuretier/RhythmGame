// pages/index.tsx

import dynamic from 'next/dynamic';
import Head from 'next/head';
// Import the CSS module
import '@/styles/VoxelWorld.module.css';

// Dynamically import the VoxelWorld component with SSR disabled.
// This is CRITICAL for Three.js/browser-specific code.
const DynamicVoxelWorld = dynamic(() => import('@/components/VoxelWorld'), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <Head>
        <title>Voxel World (Next.js/TS)</title>
      </Head>
      <div style={{ height: '100vh', width: '100vw', margin: 0, overflow: 'hidden', backgroundColor: '#87CEEB', userSelect: 'none' }}>
        <DynamicVoxelWorld />
      </div>
    </>
  );
}
