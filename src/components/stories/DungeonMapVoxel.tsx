'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, MapControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { DungeonLocation, DungeonProgress, LocationStatus, MapTile } from '@/data/stories/dungeons';
import {
  DUNGEON_LOCATIONS, MAP_PATHS, MAP_TERRAIN,
  MAP_WIDTH, MAP_HEIGHT, getLocationStatus,
} from '@/data/stories/dungeons';
import styles from './dungeonMap.module.css';

// ============================================================
// Noise functions
// ============================================================

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function noise2D(x: number, z: number, seed: number): number {
  const rand = seededRandom(
    Math.floor(x * 73856093) ^ Math.floor(z * 19349663) ^ seed
  );
  return rand();
}

function smoothNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const n00 = noise2D(ix, iz, seed);
  const n10 = noise2D(ix + 1, iz, seed);
  const n01 = noise2D(ix, iz + 1, seed);
  const n11 = noise2D(ix + 1, iz + 1, seed);
  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);
  return nx0 + sz * (nx1 - nx0);
}

function fractalNoise(x: number, z: number, seed: number, octaves = 3): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, z * frequency, seed + i * 1000) * amplitude;
    maxAmp += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxAmp;
}

// ============================================================
// Warm Minecraft Dungeons–inspired biome palettes
// ============================================================

type BiomePalette = { top: THREE.Color; mid: THREE.Color; deep: THREE.Color };

const BIOME_PALETTES: Record<string, BiomePalette> = {
  grass:    { top: new THREE.Color('#7db044'), mid: new THREE.Color('#5e8a32'), deep: new THREE.Color('#4a6828') },
  dirt:     { top: new THREE.Color('#b89060'), mid: new THREE.Color('#956e42'), deep: new THREE.Color('#7a5530') },
  stone:    { top: new THREE.Color('#8a8890'), mid: new THREE.Color('#6a6870'), deep: new THREE.Color('#504e56') },
  water:    { top: new THREE.Color('#4a90c8'), mid: new THREE.Color('#3570a0'), deep: new THREE.Color('#2a5580') },
  sand:     { top: new THREE.Color('#d8c088'), mid: new THREE.Color('#bca068'), deep: new THREE.Color('#a08850') },
  snow:     { top: new THREE.Color('#e8eaf0'), mid: new THREE.Color('#c8ccd8'), deep: new THREE.Color('#a0a4b0') },
  path:     { top: new THREE.Color('#c8a868'), mid: new THREE.Color('#a88848'), deep: new THREE.Color('#886830') },
  bridge:   { top: new THREE.Color('#8a6030'), mid: new THREE.Color('#6a4820'), deep: new THREE.Color('#503818') },
  tree:     { top: new THREE.Color('#3a7828'), mid: new THREE.Color('#2e6020'), deep: new THREE.Color('#4a6828') },
  flower:   { top: new THREE.Color('#d06878'), mid: new THREE.Color('#5e8a32'), deep: new THREE.Color('#4a6828') },
  rock:     { top: new THREE.Color('#6a6870'), mid: new THREE.Color('#585660'), deep: new THREE.Color('#484650') },
  mushroom: { top: new THREE.Color('#c04030'), mid: new THREE.Color('#5e8a32'), deep: new THREE.Color('#4a6828') },
  lava:     { top: new THREE.Color('#e85020'), mid: new THREE.Color('#c03810'), deep: new THREE.Color('#802808') },
  void:     { top: new THREE.Color('#181418'), mid: new THREE.Color('#100e12'), deep: new THREE.Color('#080608') },
};

function getTerrainPalette(terrain: string): BiomePalette {
  return BIOME_PALETTES[terrain] || BIOME_PALETTES.grass;
}

function blockColor(y: number, maxY: number, palette: BiomePalette): THREE.Color {
  const t = maxY > 1 ? y / (maxY - 1) : 1;
  if (t > 0.7) return palette.top.clone();
  if (t > 0.3) return palette.mid.clone();
  return palette.deep.clone();
}

// ============================================================
// Shared height calculation — used by terrain, tracks & beacons
// ============================================================

interface VoxelBlock {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
}

const MAP_SEED = 42069;

function computeTerrainHeight(tile: MapTile): number {
  const noiseH = fractalNoise(tile.x * 0.15, tile.y * 0.15, MAP_SEED, 3);

  switch (tile.terrain) {
    case 'water':
      return 2;
    case 'stone':
    case 'rock':
      return Math.max(1, 5 + tile.elevation * 2 + Math.floor(noiseH * 5));
    case 'tree':
      return Math.max(1, 3 + tile.elevation + Math.floor(noiseH * 2));
    case 'sand':
      return Math.max(1, 2 + Math.floor(noiseH * 1.5));
    case 'path':
    case 'bridge':
      return Math.max(1, 3 + tile.elevation + Math.floor(noiseH * 1.5));
    case 'dirt':
      return Math.max(1, 3 + tile.elevation + Math.floor(noiseH * 2));
    default:
      return Math.max(1, 3 + tile.elevation + Math.floor(noiseH * 3));
  }
}

function getHeightAt(x: number, y: number): number {
  const tile = MAP_TERRAIN.find(t => t.x === x && t.y === y);
  if (!tile) return 3;
  return computeTerrainHeight(tile);
}

// ============================================================
// Terrain voxel generation — dramatic height + warm palette
// ============================================================

function generateMapVoxels(terrain: MapTile[]): { positions: Float32Array; colors: Float32Array; count: number } {
  const blocks: VoxelBlock[] = [];
  const halfX = MAP_WIDTH / 2;
  const halfZ = MAP_HEIGHT / 2;

  for (const tile of terrain) {
    const wx = tile.x - halfX;
    const wz = tile.y - halfZ;
    const palette = getTerrainPalette(tile.terrain);
    const baseHeight = computeTerrainHeight(tile);

    // Stack blocks vertically
    for (let y = 0; y < baseHeight; y++) {
      const col = blockColor(y, baseHeight, palette);
      const colorNoise = (noise2D(tile.x + y * 7, tile.y + y * 13, MAP_SEED + 500) - 0.5) * 0.06;
      col.r = Math.max(0, Math.min(1, col.r + colorNoise));
      col.g = Math.max(0, Math.min(1, col.g + colorNoise));
      col.b = Math.max(0, Math.min(1, col.b + colorNoise));
      blocks.push({ x: wx, y, z: wz, color: col });
    }

    // Trees: tall trunk + layered canopy
    if (tile.terrain === 'tree') {
      const detailNoise = smoothNoise(tile.x * 0.4, tile.y * 0.4, MAP_SEED + 300);
      const trunkColor = new THREE.Color('#6a4820');
      const trunkHeight = 2 + Math.floor(detailNoise * 2);

      for (let ty = 0; ty < trunkHeight; ty++) {
        blocks.push({ x: wx, y: baseHeight + ty, z: wz, color: trunkColor.clone() });
      }

      const canopyBase = baseHeight + trunkHeight;
      const leafBase = new THREE.Color('#2e7a20');
      const leafVar = noise2D(tile.x * 3, tile.y * 3, MAP_SEED + 999) * 0.08;

      // Lower canopy: cross shape
      for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
        const lc = leafBase.clone();
        lc.g += leafVar + (noise2D(tile.x + dx, tile.y + dz, MAP_SEED + 888) - 0.5) * 0.05;
        blocks.push({ x: wx + dx, y: canopyBase, z: wz + dz, color: lc });
      }

      // Upper canopy: center + some sides
      blocks.push({ x: wx, y: canopyBase + 1, z: wz, color: leafBase.clone() });
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
        if (noise2D(tile.x + dx * 2, tile.y + dz * 2, MAP_SEED + 777) > 0.4) {
          const lc = leafBase.clone();
          lc.g += (noise2D(tile.x + dx, tile.y + dz, MAP_SEED + 666) - 0.5) * 0.06;
          blocks.push({ x: wx + dx, y: canopyBase + 1, z: wz + dz, color: lc });
        }
      }
    }

    // Mushroom caps
    if (tile.terrain === 'mushroom') {
      blocks.push({ x: wx, y: baseHeight, z: wz, color: new THREE.Color('#e8dcc0') });
      blocks.push({ x: wx, y: baseHeight + 1, z: wz, color: new THREE.Color('#c04030') });
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
        if (noise2D(tile.x + dx, tile.y + dz, MAP_SEED + 444) > 0.5) {
          blocks.push({ x: wx + dx, y: baseHeight + 1, z: wz + dz, color: new THREE.Color('#b83828') });
        }
      }
    }

    // Flowers
    if (tile.terrain === 'flower') {
      const flowerColors = [
        new THREE.Color('#e06878'),
        new THREE.Color('#e0c040'),
        new THREE.Color('#8060d0'),
        new THREE.Color('#e08840'),
      ];
      const idx = Math.floor(noise2D(tile.x, tile.y, MAP_SEED + 333) * flowerColors.length);
      blocks.push({ x: wx, y: baseHeight, z: wz, color: flowerColors[idx] });
    }
  }

  // Tapered border terrain for natural cliff edges
  const BORDER = 4;
  for (let bx = -BORDER; bx < MAP_WIDTH + BORDER; bx++) {
    for (let bz = -BORDER; bz < MAP_HEIGHT + BORDER; bz++) {
      if (bx >= 0 && bx < MAP_WIDTH && bz >= 0 && bz < MAP_HEIGHT) continue;

      const dx = bx < 0 ? -bx : bx >= MAP_WIDTH ? bx - MAP_WIDTH + 1 : 0;
      const dz = bz < 0 ? -bz : bz >= MAP_HEIGHT ? bz - MAP_HEIGHT + 1 : 0;
      const dist = Math.max(dx, dz);
      if (dist > BORDER) continue;

      // Get nearest edge tile height and taper from it
      const edgeX = Math.max(0, Math.min(MAP_WIDTH - 1, bx));
      const edgeZ = Math.max(0, Math.min(MAP_HEIGHT - 1, bz));
      const edgeHeight = getHeightAt(edgeX, edgeZ);
      const height = Math.max(1, Math.floor(edgeHeight * (1 - dist / (BORDER + 1))));

      const palette = BIOME_PALETTES.grass;
      const wx = bx - halfX;
      const wz = bz - halfZ;

      for (let y = 0; y < height; y++) {
        const col = blockColor(y, height, palette);
        const cn = (noise2D(bx + y * 7, bz + y * 13, MAP_SEED + 600) - 0.5) * 0.04;
        col.r = Math.max(0, Math.min(1, col.r + cn));
        col.g = Math.max(0, Math.min(1, col.g + cn));
        col.b = Math.max(0, Math.min(1, col.b + cn));
        blocks.push({ x: wx, y, z: wz, color: col });
      }
    }
  }

  const count = blocks.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  blocks.forEach((block, i) => {
    positions[i * 3] = block.x;
    positions[i * 3 + 1] = block.y;
    positions[i * 3 + 2] = block.z;
    colors[i * 3] = block.color.r;
    colors[i * 3 + 1] = block.color.g;
    colors[i * 3 + 2] = block.color.b;
  });

  return { positions, colors, count };
}

// ============================================================
// Path blocks connecting locations (warm dirt-trail style)
// ============================================================

function generateTrackVoxels(locationStatuses: Record<string, LocationStatus>): { positions: Float32Array; colors: Float32Array; count: number } {
  const blocks: VoxelBlock[] = [];
  const halfX = MAP_WIDTH / 2;
  const halfZ = MAP_HEIGHT / 2;
  const pathColor = new THREE.Color('#c8a060');
  const activePathColor = new THREE.Color('#e8c878');

  for (const path of MAP_PATHS) {
    const fromStatus = locationStatuses[path.from];
    const toStatus = locationStatuses[path.to];
    const isActive = fromStatus === 'completed' || toStatus === 'completed';

    for (const wp of path.waypoints) {
      const wx = wp.x - halfX;
      const wz = wp.y - halfZ;
      const baseY = getHeightAt(wp.x, wp.y);

      const col = isActive ? activePathColor.clone() : pathColor.clone();
      const cn = (noise2D(wp.x * 3, wp.y * 3, MAP_SEED + 700) - 0.5) * 0.05;
      col.r = Math.max(0, Math.min(1, col.r + cn));
      col.g = Math.max(0, Math.min(1, col.g + cn));
      col.b = Math.max(0, Math.min(1, col.b + cn));

      blocks.push({ x: wx, y: baseY, z: wz, color: col });
    }
  }

  const count = blocks.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  blocks.forEach((block, i) => {
    positions[i * 3] = block.x;
    positions[i * 3 + 1] = block.y;
    positions[i * 3 + 2] = block.z;
    colors[i * 3] = block.color.r;
    colors[i * 3 + 1] = block.color.g;
    colors[i * 3 + 2] = block.color.b;
  });

  return { positions, colors, count };
}

// ============================================================
// Three.js sub-components
// ============================================================

function VoxelTerrain({ data }: { data: { positions: Float32Array; colors: Float32Array; count: number } }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.95, 0.95, 0.95), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.75,
    metalness: 0.05,
    flatShading: true,
  }), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

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

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, data.count]} castShadow receiveShadow />
  );
}

function TrackBlocks({ data }: { data: { positions: Float32Array; colors: Float32Array; count: number } }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.85, 0.35, 0.85), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.7,
    metalness: 0.05,
    flatShading: true,
  }), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < data.count; i++) {
      dummy.position.set(
        data.positions[i * 3],
        data.positions[i * 3 + 1] + 0.15,
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

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, data.count]} />
  );
}

// ============================================================
// Location beacon + floating HTML label
// ============================================================

function LocationBeacon({
  location,
  status,
  isHovered,
  locale,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: {
  location: DungeonLocation;
  status: LocationStatus;
  isHovered: boolean;
  locale: string;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const markerRef = useRef<THREE.Group>(null);
  const halfX = MAP_WIDTH / 2;
  const halfZ = MAP_HEIGHT / 2;

  const wx = location.mapX - halfX;
  const wz = location.mapY - halfZ;
  const terrainHeight = getHeightAt(location.mapX, location.mapY);
  const baseY = terrainHeight + 1;

  const name = locale === 'en' ? location.nameEn : location.name;
  const accentColor = new THREE.Color(location.accentColor);

  const markerColor = status === 'locked'
    ? new THREE.Color(0.35, 0.35, 0.38)
    : status === 'completed'
      ? new THREE.Color(0.35, 0.72, 0.35)
      : accentColor;

  const emissiveColor = status === 'available'
    ? accentColor
    : status === 'completed'
      ? new THREE.Color(0.2, 0.6, 0.2)
      : new THREE.Color(0, 0, 0);
  const emissiveIntensity = status === 'locked' ? 0 : isHovered ? 1.5 : 0.7;
  const scale = isHovered && status !== 'locked' ? 1.12 : 1;

  // Gentle float animation for available locations
  useFrame(({ clock }) => {
    if (!markerRef.current) return;
    if (status === 'available') {
      markerRef.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.15;
    }
  });

  return (
    <group
      position={[wx, baseY, wz]}
      onClick={(e) => { e.stopPropagation(); if (status !== 'locked') onClick(); }}
      onPointerEnter={(e) => { e.stopPropagation(); onPointerEnter(); }}
      onPointerLeave={(e) => { e.stopPropagation(); onPointerLeave(); }}
    >
      {/* Glowing marker block */}
      <group ref={markerRef} scale={[scale, scale, scale]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshStandardMaterial
            color={markerColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.3}
            metalness={0.2}
            flatShading
          />
        </mesh>

        {/* Point light for glow */}
        {status !== 'locked' && (
          <pointLight
            position={[0, 1.2, 0]}
            color={markerColor}
            intensity={isHovered ? 3 : 1.2}
            distance={8}
          />
        )}
      </group>

      {/* Floating HTML label */}
      <Html
        position={[0, 2.8, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className={`${styles.locationLabel} ${status === 'locked' ? styles.locationLocked : ''} ${isHovered ? styles.locationHovered : ''}`}>
          <div
            className={styles.locationIconBadge}
            style={{ borderColor: status === 'locked' ? '#555' : location.accentColor }}
          >
            {location.icon}
          </div>
          <div className={styles.locationLabelName}>{name}</div>
          {status === 'completed' && (
            <div className={styles.locationCleared}>✓</div>
          )}
        </div>
      </Html>
    </group>
  );
}

// Camera controller
function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(20, 22, 20);
    camera.lookAt(0, 3, 0);
  }, [camera]);
  return null;
}

// ============================================================
// Main DungeonMapVoxel component
// ============================================================

interface DungeonMapProps {
  progress: DungeonProgress;
  onSelectLocation: (location: DungeonLocation) => void;
  onBack: () => void;
}

export default function DungeonMapVoxel({ progress, onSelectLocation, onBack }: DungeonMapProps) {
  const locale = useLocale();
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  // Compute location statuses
  const locationStatuses = useMemo(() => {
    const statuses: Record<string, LocationStatus> = {};
    for (const loc of DUNGEON_LOCATIONS) {
      statuses[loc.id] = getLocationStatus(loc.id, progress);
    }
    return statuses;
  }, [progress]);

  // Generate voxel data (memoized)
  const terrainData = useMemo(() => generateMapVoxels(MAP_TERRAIN), []);
  const trackData = useMemo(() => generateTrackVoxels(locationStatuses), [locationStatuses]);

  return (
    <div className={styles.mapContainer}>
      {/* Background */}
      <div className={styles.mapBg} />

      {/* Three.js Canvas */}
      <Canvas
        className={styles.mapCanvas}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#1e1812']} />
        <CameraSetup />
        <OrthographicCamera
          makeDefault
          position={[20, 22, 20]}
          zoom={22}
          near={0.1}
          far={200}
        />

        {/* Warm, bright lighting — like sunlit diorama */}
        <ambientLight intensity={1.6} color="#fff8f0" />
        <hemisphereLight args={['#ffeedd', '#556644', 0.6]} />
        <directionalLight
          position={[15, 30, 10]}
          intensity={2.5}
          color="#fff0d8"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={100}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
        />
        <directionalLight
          position={[-10, 15, -5]}
          intensity={0.6}
          color="#ffd8a0"
        />

        {/* Ground plane — warm dark below terrain */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#1a1410" roughness={1} />
        </mesh>

        {/* Terrain voxels */}
        <VoxelTerrain data={terrainData} />

        {/* Path blocks */}
        <TrackBlocks data={trackData} />

        {/* Location beacons */}
        {DUNGEON_LOCATIONS.map((location) => (
          <LocationBeacon
            key={location.id}
            location={location}
            status={locationStatuses[location.id]}
            isHovered={hoveredLocation === location.id}
            locale={locale}
            onClick={() => {
              if (locationStatuses[location.id] !== 'locked') {
                onSelectLocation(location);
              }
            }}
            onPointerEnter={() => setHoveredLocation(location.id)}
            onPointerLeave={() => setHoveredLocation(null)}
          />
        ))}

        {/* Camera controls */}
        <MapControls
          enableRotate={false}
          enableZoom={true}
          minZoom={12}
          maxZoom={50}
          panSpeed={1.5}
          screenSpacePanning
        />
      </Canvas>

      {/* Header */}
      <div className={styles.mapHeader}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back
        </button>
        <h1 className={styles.mapTitle}>MISSION SELECT</h1>
        <div className={styles.mapStats}>
          <span className={styles.statBadge}>
            💎 {progress.totalEmeralds}
          </span>
          <span className={styles.statBadge}>
            ⚔️ {progress.totalDefeated}
          </span>
        </div>
      </div>

      {/* Bottom info panel */}
      {hoveredLocation && (
        <div className={styles.infoPanel}>
          {(() => {
            const loc = DUNGEON_LOCATIONS.find(l => l.id === hoveredLocation);
            if (!loc) return null;
            const status = locationStatuses[loc.id];
            const locName = locale === 'en' ? loc.nameEn : loc.name;
            const desc = locale === 'en' ? loc.descriptionEn : loc.description;
            return (
              <>
                <div className={styles.infoPanelHeader}>
                  <span className={styles.infoIcon}>{loc.icon}</span>
                  <span className={styles.infoName}>{locName}</span>
                  {status === 'completed' && <span className={styles.infoComplete}>CLEARED</span>}
                </div>
                <div className={styles.infoDesc}>{desc}</div>
                {loc.difficulty > 0 && (
                  <div className={styles.infoMeta}>
                    <span>{'★'.repeat(loc.difficulty)}{'☆'.repeat(5 - loc.difficulty)}</span>
                    <span>~{loc.estimatedMinutes}min</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
