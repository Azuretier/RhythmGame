'use client';

// =============================================================
// Minecraft Dungeons-style isometric terrain preview
// Shown as an animated background in the Minecraft Board Game menu
// =============================================================

import { useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WorldGenerator } from '@/lib/minecraft-board/world';
import type { MCTileUpdate } from '@/types/minecraft-board';
import {
  buildTerrainBlocks,
  buildSurfaceFeatures,
  packBlocks,
} from './terrain-utils';

// Fixed seed that produces a varied, scenic preview world
const MENU_PREVIEW_SEED = 31415;
const WORLD_SIZE = 48;
const CENTER = WORLD_SIZE / 2;

// Build all tile updates from a freshly generated world
function buildPreviewTiles(): MCTileUpdate[] {
  const gen = new WorldGenerator(MENU_PREVIEW_SEED);
  const world = gen.generate();
  const tiles: MCTileUpdate[] = [];
  for (let y = 0; y < world.length; y++) {
    for (let x = 0; x < world[y].length; x++) {
      tiles.push({ x, y, tile: world[y][x] });
    }
  }
  return tiles;
}

// === InstancedMesh terrain renderer ===

interface PackedData {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}

function TerrainBlocks({ data }: { data: PackedData }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.94, 0.94, 0.94), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.78,
    metalness: 0.04,
    flatShading: true,
  }), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || data.count === 0) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < data.count; i++) {
      dummy.position.set(
        data.positions[i * 3],
        data.positions[i * 3 + 1],
        data.positions[i * 3 + 2],
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setRGB(data.colors[i * 3], data.colors[i * 3 + 1], data.colors[i * 3 + 2]);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data]);

  if (data.count === 0) return null;
  return <instancedMesh ref={meshRef} args={[geo, mat, data.count]} />;
}

// === Slowly orbiting camera for a cinematic feel ===

function OrbitingCamera() {
  const { camera } = useThree();
  const angleRef = useRef(Math.PI * 0.25);

  useEffect(() => {
    const a = angleRef.current;
    const radius = 34;
    camera.position.set(CENTER + Math.cos(a) * radius, 28, CENTER + Math.sin(a) * radius);
    camera.lookAt(CENTER, 2, CENTER);
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((_, delta) => {
    // Slow orbit — roughly one full revolution every 3 minutes
    angleRef.current += delta * 0.035;
    const radius = 34;
    const a = angleRef.current;
    camera.position.set(CENTER + Math.cos(a) * radius, 28, CENTER + Math.sin(a) * radius);
    camera.lookAt(CENTER, 2, CENTER);
    camera.updateProjectionMatrix();
  });

  return null;
}

// === Scene: terrain + Minecraft Dungeons golden-hour lighting ===

function PreviewScene({ tiles }: { tiles: MCTileUpdate[] }) {
  const { terrainData, featureData } = useMemo(() => {
    const { blocks, heightMap } = buildTerrainBlocks(tiles, false, MENU_PREVIEW_SEED);
    const features = buildSurfaceFeatures(tiles, heightMap, false, MENU_PREVIEW_SEED);
    return {
      terrainData: packBlocks(blocks),
      featureData: packBlocks(features),
    };
  }, [tiles]);

  return (
    <>
      <OrbitingCamera />
      {/* Warm golden-hour lighting inspired by Minecraft Dungeons */}
      <ambientLight intensity={1.1} color="#fff0e8" />
      <hemisphereLight args={['#ffe4b0', '#2a3c1a', 0.8]} />
      <directionalLight position={[30, 40, 20]} intensity={2.6} color="#ffe8c0" />
      <directionalLight position={[-20, 18, -15]} intensity={0.45} color="#b0c8ff" />
      <TerrainBlocks data={terrainData} />
      <TerrainBlocks data={featureData} />
    </>
  );
}

// === Main exported component ===

export default function MenuMapPreview() {
  // Generate tiles only once per mount
  const tiles = useMemo(() => buildPreviewTiles(), []);

  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      gl={{ antialias: false, alpha: false }}
      orthographic
      camera={{ zoom: 14, near: 0.1, far: 400 } as never}
      onCreated={({ camera, gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        camera.position.set(CENTER + 24, 28, CENTER + 24);
        camera.lookAt(new THREE.Vector3(CENTER, 2, CENTER));
        camera.updateProjectionMatrix();
      }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={['#1a1208']} />
        <PreviewScene tiles={tiles} />
      </Suspense>
    </Canvas>
  );
}
