'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, MapControls } from '@react-three/drei';
import * as THREE from 'three';
import type { DungeonLocation, DungeonProgress, LocationStatus, MapTile } from '@/data/stories/dungeons';
import {
  DUNGEON_LOCATIONS, MAP_PATHS, MAP_TERRAIN,
  MAP_WIDTH, MAP_HEIGHT, getLocationStatus,
} from '@/data/stories/dungeons';
import styles from './dungeonMap.module.css';

// ============================================================
// Noise functions (reused from VoxelWorldBackground.tsx)
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

// ============================================================
// Unrailed!-style biome color palettes
// ============================================================

type BiomePalette = { top: THREE.Color; mid: THREE.Color; deep: THREE.Color };

const BIOME_PALETTES: Record<string, BiomePalette> = {
  grass:     { top: new THREE.Color(0.42, 0.72, 0.32), mid: new THREE.Color(0.35, 0.55, 0.25), deep: new THREE.Color(0.30, 0.40, 0.20) },
  dirt:      { top: new THREE.Color(0.65, 0.50, 0.28), mid: new THREE.Color(0.50, 0.38, 0.20), deep: new THREE.Color(0.40, 0.30, 0.15) },
  stone:     { top: new THREE.Color(0.55, 0.55, 0.60), mid: new THREE.Color(0.40, 0.40, 0.45), deep: new THREE.Color(0.30, 0.30, 0.35) },
  water:     { top: new THREE.Color(0.20, 0.50, 0.80), mid: new THREE.Color(0.15, 0.40, 0.70), deep: new THREE.Color(0.10, 0.30, 0.55) },
  sand:      { top: new THREE.Color(0.85, 0.78, 0.55), mid: new THREE.Color(0.75, 0.68, 0.45), deep: new THREE.Color(0.65, 0.58, 0.38) },
  snow:      { top: new THREE.Color(0.92, 0.93, 0.96), mid: new THREE.Color(0.80, 0.82, 0.88), deep: new THREE.Color(0.65, 0.68, 0.75) },
  path:      { top: new THREE.Color(0.78, 0.65, 0.35), mid: new THREE.Color(0.65, 0.52, 0.28), deep: new THREE.Color(0.50, 0.40, 0.20) },
  bridge:    { top: new THREE.Color(0.55, 0.38, 0.18), mid: new THREE.Color(0.45, 0.30, 0.14), deep: new THREE.Color(0.35, 0.22, 0.10) },
  tree:      { top: new THREE.Color(0.22, 0.55, 0.22), mid: new THREE.Color(0.18, 0.42, 0.18), deep: new THREE.Color(0.30, 0.40, 0.20) },
  flower:    { top: new THREE.Color(0.85, 0.45, 0.55), mid: new THREE.Color(0.35, 0.55, 0.25), deep: new THREE.Color(0.30, 0.40, 0.20) },
  rock:      { top: new THREE.Color(0.48, 0.48, 0.52), mid: new THREE.Color(0.38, 0.38, 0.42), deep: new THREE.Color(0.28, 0.28, 0.32) },
  mushroom:  { top: new THREE.Color(0.72, 0.28, 0.28), mid: new THREE.Color(0.35, 0.55, 0.25), deep: new THREE.Color(0.30, 0.40, 0.20) },
  lava:      { top: new THREE.Color(0.90, 0.35, 0.10), mid: new THREE.Color(0.75, 0.25, 0.05), deep: new THREE.Color(0.50, 0.15, 0.02) },
  void:      { top: new THREE.Color(0.08, 0.06, 0.12), mid: new THREE.Color(0.05, 0.04, 0.08), deep: new THREE.Color(0.03, 0.02, 0.05) },
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
// Voxel world generation from MAP_TERRAIN data
// ============================================================

interface VoxelBlock {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
}

const MAP_SEED = 42069;

function generateMapVoxels(terrain: MapTile[]): { positions: Float32Array; colors: Float32Array; count: number } {
  const blocks: VoxelBlock[] = [];
  const halfX = MAP_WIDTH / 2;
  const halfZ = MAP_HEIGHT / 2;

  for (const tile of terrain) {
    const wx = tile.x - halfX;
    const wz = tile.y - halfZ;
    const palette = getTerrainPalette(tile.terrain);

    // Base height from elevation + noise variation
    const noiseH = smoothNoise(tile.x * 0.15, tile.y * 0.15, MAP_SEED);
    let baseHeight = tile.elevation + 1; // min 1 block

    if (tile.terrain === 'water') {
      // Water at ground level
      baseHeight = 1;
    } else if (tile.terrain === 'tree') {
      // Ground + trunk + canopy
      baseHeight = tile.elevation + 2;
    } else if (tile.terrain === 'rock' || tile.terrain === 'stone') {
      baseHeight = tile.elevation + 2 + Math.floor(noiseH * 2);
    } else {
      baseHeight += Math.floor(noiseH * 1.5);
    }

    // Stack blocks vertically
    for (let y = 0; y < baseHeight; y++) {
      const col = blockColor(y, baseHeight, palette);
      // Add slight noise variation to color (Unrailed! style)
      const colorNoise = (noise2D(tile.x + y * 7, tile.y + y * 13, MAP_SEED + 500) - 0.5) * 0.08;
      col.r = Math.max(0, Math.min(1, col.r + colorNoise));
      col.g = Math.max(0, Math.min(1, col.g + colorNoise));
      col.b = Math.max(0, Math.min(1, col.b + colorNoise));
      blocks.push({ x: wx, y, z: wz, color: col });
    }

    // Trees get trunk + leaf blocks on top
    if (tile.terrain === 'tree') {
      const trunkColor = new THREE.Color(0.40, 0.28, 0.15);
      blocks.push({ x: wx, y: baseHeight, z: wz, color: trunkColor });
      blocks.push({ x: wx, y: baseHeight + 1, z: wz, color: trunkColor });
      // Leaf canopy
      const leafColor = new THREE.Color(0.25, 0.60, 0.20);
      const leafNoise = noise2D(tile.x * 3, tile.y * 3, MAP_SEED + 999);
      leafColor.g += leafNoise * 0.1;
      blocks.push({ x: wx, y: baseHeight + 2, z: wz, color: leafColor });
      // Adjacent leaves
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (noise2D(tile.x + dx, tile.y + dz, MAP_SEED + 777) > 0.3) {
          blocks.push({ x: wx + dx, y: baseHeight + 1, z: wz + dz, color: leafColor.clone() });
        }
      }
    }

    // Mushroom caps
    if (tile.terrain === 'mushroom') {
      const capColor = new THREE.Color(0.80, 0.25, 0.20);
      blocks.push({ x: wx, y: baseHeight, z: wz, color: new THREE.Color(0.85, 0.82, 0.70) }); // stem
      blocks.push({ x: wx, y: baseHeight + 1, z: wz, color: capColor });
    }

    // Flowers get a colored top block
    if (tile.terrain === 'flower') {
      const flowerColors = [
        new THREE.Color(0.90, 0.40, 0.50),
        new THREE.Color(0.90, 0.80, 0.30),
        new THREE.Color(0.60, 0.40, 0.90),
      ];
      const idx = Math.floor(noise2D(tile.x, tile.y, MAP_SEED + 333) * flowerColors.length);
      blocks.push({ x: wx, y: baseHeight, z: wz, color: flowerColors[idx] });
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
// Track/path block generation (Unrailed! railroad style)
// ============================================================

function generateTrackVoxels(locationStatuses: Record<string, LocationStatus>): { positions: Float32Array; colors: Float32Array; count: number } {
  const blocks: VoxelBlock[] = [];
  const halfX = MAP_WIDTH / 2;
  const halfZ = MAP_HEIGHT / 2;
  const trackColor = new THREE.Color(0.45, 0.30, 0.15);
  const railColor = new THREE.Color(0.60, 0.60, 0.65);
  const activeRailColor = new THREE.Color(0.95, 0.85, 0.30);

  for (const path of MAP_PATHS) {
    const fromStatus = locationStatuses[path.from];
    const toStatus = locationStatuses[path.to];
    const isActive = fromStatus === 'completed' || toStatus === 'completed';

    for (let i = 0; i < path.waypoints.length; i++) {
      const wp = path.waypoints[i];
      const wx = wp.x - halfX;
      const wz = wp.y - halfZ;

      // Determine height at this point from terrain
      const terrainTile = MAP_TERRAIN.find(t => t.x === wp.x && t.y === wp.y);
      const baseY = terrainTile ? terrainTile.elevation + 1 : 1;

      // Track sleeper (wooden tie)
      blocks.push({ x: wx, y: baseY, z: wz, color: trackColor.clone() });

      // Rail on top
      const rc = isActive ? activeRailColor.clone() : railColor.clone();
      blocks.push({ x: wx, y: baseY + 1, z: wz, color: rc });
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
  const geo = useMemo(() => new THREE.BoxGeometry(0.92, 0.92, 0.92), []);
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
  const geo = useMemo(() => new THREE.BoxGeometry(0.7, 0.4, 0.7), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.6,
    metalness: 0.2,
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
        data.positions[i * 3 + 1] + 0.2,
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

// Location marker beacon
function LocationBeacon({
  location,
  status,
  isHovered,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: {
  location: DungeonLocation;
  status: LocationStatus;
  isHovered: boolean;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const halfX = MAP_WIDTH / 2;
  const halfZ = MAP_HEIGHT / 2;

  const wx = location.mapX - halfX;
  const wz = location.mapY - halfZ;

  // Determine base height from terrain
  const terrainTile = MAP_TERRAIN.find(t => t.x === location.mapX && t.y === location.mapY);
  const baseY = terrainTile ? terrainTile.elevation + 2 : 2;

  // Animate beacon
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (status === 'available') {
      groupRef.current.position.y = baseY + Math.sin(clock.elapsedTime * 2) * 0.15;
    }
  });

  const accentColor = new THREE.Color(location.accentColor);

  // Colors based on status
  const pillarColor = status === 'locked'
    ? new THREE.Color(0.2, 0.2, 0.25)
    : status === 'completed'
      ? new THREE.Color(0.3, 0.7, 0.3)
      : accentColor;

  const emissiveColor = status === 'available' ? accentColor : status === 'completed' ? new THREE.Color(0.2, 0.6, 0.2) : new THREE.Color(0, 0, 0);
  const emissiveIntensity = status === 'locked' ? 0 : isHovered ? 1.2 : 0.6;
  const scale = isHovered && status !== 'locked' ? 1.15 : 1;

  return (
    <group
      ref={groupRef}
      position={[wx, baseY, wz]}
      scale={[scale, scale, scale]}
      onClick={(e) => { e.stopPropagation(); if (status !== 'locked') onClick(); }}
      onPointerEnter={(e) => { e.stopPropagation(); onPointerEnter(); }}
      onPointerLeave={(e) => { e.stopPropagation(); onPointerLeave(); }}
    >
      {/* Base pillar blocks */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial
          color={pillarColor}
          roughness={0.6}
          flatShading
        />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial
          color={pillarColor}
          roughness={0.6}
          flatShading
        />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial
          color={pillarColor}
          roughness={0.6}
          flatShading
        />
      </mesh>

      {/* Top beacon block (emissive) */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color={pillarColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.3}
        />
      </mesh>

      {/* Point light for available/completed */}
      {status !== 'locked' && (
        <pointLight
          position={[0, 2.8, 0]}
          color={pillarColor}
          intensity={isHovered ? 2 : 0.8}
          distance={6}
        />
      )}

      {/* Completed flag */}
      {status === 'completed' && (
        <group position={[0.5, 2.5, 0]}>
          <mesh>
            <boxGeometry args={[0.08, 1.2, 0.08]} />
            <meshStandardMaterial color="#5a3a1a" flatShading />
          </mesh>
          <mesh position={[0.25, 0.4, 0]}>
            <boxGeometry args={[0.5, 0.35, 0.05]} />
            <meshStandardMaterial color="#4CAF50" emissive="#2a7a2a" emissiveIntensity={0.3} flatShading />
          </mesh>
        </group>
      )}
    </group>
  );
}

// Camera controller - auto-frame the map on mount
function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(18, 18, 18);
    camera.lookAt(0, 0, 0);
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
        gl={{ antialias: true, alpha: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <CameraSetup />
        <OrthographicCamera
          makeDefault
          position={[18, 18, 18]}
          zoom={28}
          near={0.1}
          far={200}
        />

        {/* Lighting */}
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[15, 25, 10]}
          intensity={2.0}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={80}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <directionalLight
          position={[-10, 10, -5]}
          intensity={0.8}
          color="#aabbff"
        />

        {/* Subtle fog for depth — pushed far back so terrain stays bright */}
        <fog attach="fog" args={['#0a0812', 55, 90]} />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#2a3a2a" roughness={1} />
        </mesh>

        {/* Terrain voxels */}
        <VoxelTerrain data={terrainData} />

        {/* Track/path voxels */}
        <TrackBlocks data={trackData} />

        {/* Location beacons */}
        {DUNGEON_LOCATIONS.map((location) => (
          <LocationBeacon
            key={location.id}
            location={location}
            status={locationStatuses[location.id]}
            isHovered={hoveredLocation === location.id}
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
          minZoom={15}
          maxZoom={60}
          panSpeed={1.5}
          screenSpacePanning
        />
      </Canvas>

      {/* Scanlines overlay */}
      <div className={styles.scanlines} />

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
            const name = locale === 'en' ? loc.nameEn : loc.name;
            const desc = locale === 'en' ? loc.descriptionEn : loc.description;
            return (
              <>
                <div className={styles.infoPanelHeader}>
                  <span className={styles.infoIcon}>{loc.icon}</span>
                  <span className={styles.infoName}>{name}</span>
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
