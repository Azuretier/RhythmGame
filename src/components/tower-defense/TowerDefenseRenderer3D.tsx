'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import type { GameState } from '@/types/tower-defense';
import { disposeSharedMobResources } from '@/components/rhythmia/tetris/minecraft-mobs';
import { disposeSharedProjectileResources } from './td-projectiles';
import { CanvasErrorBoundary } from './td-3d-constants';
import { VoxelBackgroundStage, FloatingVoxels } from './td-3d-background';
import { TerrainGrid, PathLine, TowersGroup } from './td-3d-towers';
import {
  FontPreloader, EnemiesGroup, ProjectilesGroup,
  BaseMarker, SpawnMarker, PlacementPreview,
} from './td-3d-entities';

// ===== Environment =====
function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} color="#b4c6e0" />
      <directionalLight
        position={[12, 20, 8]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        color="#fff5e6"
      />
      <directionalLight position={[-8, 10, -8]} intensity={0.3} color="#6b8cff" />
      <hemisphereLight args={['#87ceeb', '#3a7d44', 0.3]} />
    </>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7.5, -8, 7.5]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#0a1628" roughness={1} />
    </mesh>
  );
}

// ===== Camera Controller =====
function CameraSetup({ mapWidth, mapHeight }: { mapWidth: number; mapHeight: number }) {
  const { camera } = useThree();

  useEffect(() => {
    const centerX = mapWidth / 2 - 0.5;
    const centerZ = mapHeight / 2 - 0.5;
    camera.position.set(centerX + 10, 14, centerZ + 10);
    camera.lookAt(centerX, 0, centerZ);
  }, [camera, mapWidth, mapHeight]);

  return (
    <OrbitControls
      target={[mapWidth / 2 - 0.5, 0, mapHeight / 2 - 0.5]}
      minDistance={5}
      maxDistance={30}
      minPolarAngle={Math.PI * 0.1}
      maxPolarAngle={Math.PI * 0.45}
      enablePan
      panSpeed={0.8}
      rotateSpeed={0.5}
      zoomSpeed={1}
    />
  );
}

// ===== Main Scene =====
function GameScene({ state, onCellClick, onSelectTower, onSelectEnemy, hoveredCell, setHoveredCell }: {
  state: GameState;
  onCellClick: (x: number, z: number) => void;
  onSelectTower: (id: string) => void;
  onSelectEnemy: (id: string) => void;
  hoveredCell: { x: number; z: number } | null;
  setHoveredCell: (cell: { x: number; z: number } | null) => void;
}) {
  const planeRef = useRef<THREE.Mesh>(null);
  const { raycaster, camera, pointer } = useThree();

  // Cleanup shared mob + projectile resources on unmount
  useEffect(() => {
    return () => {
      disposeSharedMobResources();
      disposeSharedProjectileResources();
    };
  }, []);

  // Raycast for cell hover
  useFrame(() => {
    if (!planeRef.current) return;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(planeRef.current);
    if (intersects.length > 0) {
      const pt = intersects[0].point;
      const gx = Math.round(pt.x);
      const gz = Math.round(pt.z);
      if (gx >= 0 && gx < state.map.width && gz >= 0 && gz < state.map.height) {
        setHoveredCell({ x: gx, z: gz });
      } else {
        setHoveredCell(null);
      }
    } else {
      setHoveredCell(null);
    }
  });

  const canPlace = !!state.selectedTowerType && !!hoveredCell &&
    state.map.grid[hoveredCell.z]?.[hoveredCell.x]?.terrain === 'grass' &&
    !state.map.grid[hoveredCell.z]?.[hoveredCell.x]?.towerId;

  return (
    <>
      <color attach="background" args={['#0f172a']} />
      <fog attach="fog" args={['#0f172a', 25, 55]} />
      <FontPreloader />
      <Lights />
      <Ground />
      <VoxelBackgroundStage mapWidth={state.map.width} mapHeight={state.map.height} />
      <FloatingVoxels mapWidth={state.map.width} mapHeight={state.map.height} />
      <CameraSetup mapWidth={state.map.width} mapHeight={state.map.height} />

      {/* Invisible plane for raycasting */}
      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[state.map.width / 2 - 0.5, 0, state.map.height / 2 - 0.5]}
        visible={false}
      >
        <planeGeometry args={[state.map.width + 2, state.map.height + 2]} />
        <meshBasicMaterial />
      </mesh>

      <TerrainGrid
        grid={state.map.grid}
        onCellClick={onCellClick}
        hoveredCell={hoveredCell}
        canPlace={!!state.selectedTowerType}
      />
      <PathLine waypoints={state.map.waypoints} />

      <TowersGroup
        towers={state.towers}
        enemies={state.enemies}
        selectedTowerId={state.selectedTowerId}
        onSelectTower={onSelectTower}
      />
      <EnemiesGroup
        enemies={state.enemies}
        selectedEnemyId={state.selectedEnemyId}
        onSelectEnemy={onSelectEnemy}
      />
      <ProjectilesGroup projectiles={state.projectiles} />

      <BaseMarker position={state.map.basePosition} />
      {state.map.spawnPoints.map((sp, i) => (
        <SpawnMarker key={i} position={{ x: Math.max(0, sp.x), y: sp.y, z: sp.z }} />
      ))}

      {/* Placement preview */}
      {state.selectedTowerType && hoveredCell && (
        <PlacementPreview
          x={hoveredCell.x}
          z={hoveredCell.z}
          towerType={state.selectedTowerType}
          canPlace={canPlace}
        />
      )}

      <Sky sunPosition={[100, 40, 100]} turbidity={8} rayleigh={0.5} />
    </>
  );
}

// ===== Exported Component =====
export interface TowerDefenseRenderer3DProps {
  state: GameState;
  onCellClick: (x: number, z: number) => void;
  onSelectTower: (id: string) => void;
  onSelectEnemy: (id: string) => void;
}

export default function TowerDefenseRenderer3D({ state, onCellClick, onSelectTower, onSelectEnemy }: TowerDefenseRenderer3DProps) {
  const [hoveredCell, setHoveredCell] = useState<{ x: number; z: number } | null>(null);

  const fallback = (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', color: '#94a3b8', fontSize: '18px',
    }}>
      WebGL not supported. Please use a modern browser.
    </div>
  );

  return (
    <CanvasErrorBoundary fallback={fallback}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: 55, near: 0.1, far: 100 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <GameScene
            state={state}
            onCellClick={onCellClick}
            onSelectTower={onSelectTower}
            onSelectEnemy={onSelectEnemy}
            hoveredCell={hoveredCell}
            setHoveredCell={setHoveredCell}
          />
        </Suspense>
      </Canvas>
    </CanvasErrorBoundary>
  );
}
