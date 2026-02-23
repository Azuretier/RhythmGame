'use client';

// =============================================================
// Minecraft Board Game - 3D Isometric Voxel Board Renderer
// Minecraft Dungeons-style terrain with stacked blocks, trees,
// biome-specific colors, fog of war, and interactive raycasting
// =============================================================

import { Suspense, useMemo, useCallback, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import type {
  WorldTile, MCTileUpdate, MCVisiblePlayer, MCMobState,
  MCPlayerState, DayPhase, Direction,
} from '@/types/minecraft-board';
import { MOB_COLORS } from '@/types/minecraft-board';
import {
  buildTerrainBlocks, buildSurfaceFeatures, packBlocks,
  DAY_NIGHT_PRESETS,
} from './terrain-utils';
import type { LightingPreset, VoxelBlock } from './terrain-utils';
import styles from './MinecraftBoard.module.css';

// === Shared types ===

interface BoardRendererProps {
  visibleTiles: MCTileUpdate[];
  exploredTilesRef: React.MutableRefObject<Map<string, WorldTile>>;
  visiblePlayers: MCVisiblePlayer[];
  visibleMobs: MCMobState[];
  selfState: MCPlayerState;
  dayPhase: DayPhase;
  playerId: string;
  onTileClick: (x: number, y: number) => void;
  onMobClick: (mobId: string) => void;
  onPlayerClick: (targetPlayerId: string) => void;
  onMove: (direction: Direction) => void;
}

const TERRAIN_SEED = 42069;

// =============================================================
// VoxelTerrain — InstancedMesh for terrain + feature blocks
// =============================================================

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

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, data.count]} castShadow receiveShadow />
  );
}

// =============================================================
// Feature blocks — smaller geometry for flowers, torch, etc.
// =============================================================

function FeatureBlocks({ data }: { data: { positions: Float32Array; colors: Float32Array; count: number } }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.5, 0.5, 0.5), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.6,
    metalness: 0.05,
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

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, data.count]} castShadow />
  );
}

// =============================================================
// Entity (player/mob) as voxel figures
// =============================================================

function PlayerEntity({
  player,
  heightMap,
  isSelf,
}: {
  player: MCVisiblePlayer;
  heightMap: Map<string, number>;
  isSelf: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const baseHeight = heightMap.get(`${player.x},${player.y}`) ?? 2;
  const topY = baseHeight;

  // Gentle bob animation
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = topY + Math.sin(clock.elapsedTime * 2 + player.x) * 0.08;
  });

  if (player.dead) {
    return (
      <group position={[player.x, topY, player.y]}>
        <mesh>
          <boxGeometry args={[0.8, 0.15, 0.8]} />
          <meshStandardMaterial color="#555" roughness={0.9} flatShading />
        </mesh>
      </group>
    );
  }

  const bodyColor = new THREE.Color(player.color);
  const headColor = bodyColor.clone().lerp(new THREE.Color('#ffffff'), 0.3);

  return (
    <group ref={groupRef} position={[player.x, topY, player.y]}>
      {/* Body */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.55, 0.6, 0.55]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={isSelf ? bodyColor : undefined}
          emissiveIntensity={isSelf ? 0.3 : 0}
          roughness={0.5}
          flatShading
        />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshStandardMaterial color={headColor} roughness={0.5} flatShading />
      </mesh>
      {/* Glow for self */}
      {isSelf && (
        <pointLight
          position={[0, 1.5, 0]}
          color={player.color}
          intensity={2}
          distance={4}
        />
      )}
      {/* Health bar */}
      {!isSelf && (
        <Html position={[0, 1.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div className={styles.entityHp3d}>
            <span className={styles.entityName3d}>
              {player.name.slice(0, 6)}
            </span>
            <div className={styles.hpBar3d}>
              <div
                className={styles.hpFill3d}
                style={{
                  width: `${(player.health / player.maxHealth) * 100}%`,
                  backgroundColor: player.color,
                }}
              />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function MobEntity({
  mob,
  heightMap,
}: {
  mob: MCMobState;
  heightMap: Map<string, number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const baseHeight = heightMap.get(`${mob.x},${mob.y}`) ?? 2;
  const topY = baseHeight;
  const mobColor = new THREE.Color(MOB_COLORS[mob.type] || '#888');
  const isTall = mob.type !== 'chicken';

  // Gentle bob for hostile mobs
  useFrame(({ clock }) => {
    if (!groupRef.current || !mob.hostile) return;
    groupRef.current.position.y = topY + Math.sin(clock.elapsedTime * 3 + mob.x * 7) * 0.06;
  });

  return (
    <group ref={groupRef} position={[mob.x, topY, mob.y]}>
      {/* Body */}
      <mesh position={[0, isTall ? 0.3 : 0.15, 0]} castShadow>
        <boxGeometry args={isTall ? [0.5, 0.6, 0.5] : [0.4, 0.3, 0.4]} />
        <meshStandardMaterial
          color={mobColor}
          emissive={mob.hostile ? new THREE.Color('#330000') : undefined}
          emissiveIntensity={mob.hostile ? 0.3 : 0}
          roughness={0.6}
          flatShading
        />
      </mesh>
      {/* Head for tall mobs */}
      {isTall && (
        <mesh position={[0, 0.75, 0]} castShadow>
          <boxGeometry args={[0.4, 0.35, 0.4]} />
          <meshStandardMaterial color={mobColor.clone().lerp(new THREE.Color('#ffffff'), 0.15)} roughness={0.6} flatShading />
        </mesh>
      )}
      {/* Health bar */}
      <Html position={[0, isTall ? 1.3 : 0.8, 0]} center style={{ pointerEvents: 'none' }}>
        <div className={styles.entityHp3d}>
          <div className={styles.hpBar3d}>
            <div
              className={styles.hpFill3d}
              style={{
                width: `${(mob.health / mob.maxHealth) * 100}%`,
                backgroundColor: mob.hostile ? '#ff4444' : '#44dd44',
              }}
            />
          </div>
        </div>
      </Html>
    </group>
  );
}

// =============================================================
// Mining indicator — pulsing scale animation on target block
// =============================================================

function MiningIndicator({
  mining,
  heightMap,
}: {
  mining: { x: number; y: number; progress: number; total: number };
  heightMap: Map<string, number>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseHeight = heightMap.get(`${mining.x},${mining.y}`) ?? 2;
  const topY = baseHeight - 0.5;
  const progress = mining.progress / mining.total;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 8) * 0.05;
    meshRef.current.scale.setScalar(pulse * (1 - progress * 0.3));
  });

  return (
    <group position={[mining.x, topY, mining.y]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.0, 1.0, 1.0]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.2 + progress * 0.3}
          wireframe
        />
      </mesh>
      <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div className={styles.miningLabel3d}>
          {Math.floor(progress * 100)}%
        </div>
      </Html>
    </group>
  );
}

// =============================================================
// Day/night lighting system
// =============================================================

function DayNightLighting({ dayPhase }: { dayPhase: DayPhase }) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);

  const preset = DAY_NIGHT_PRESETS[dayPhase] || DAY_NIGHT_PRESETS.day;
  const targetPreset = useRef<LightingPreset>(preset);

  useEffect(() => {
    targetPreset.current = preset;
  }, [preset]);

  // Smooth lighting transitions
  useFrame(() => {
    const target = targetPreset.current;
    const lerpSpeed = 0.02;

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity, target.ambientIntensity, lerpSpeed
      );
      ambientRef.current.color.lerp(new THREE.Color(target.ambientColor), lerpSpeed);
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = THREE.MathUtils.lerp(
        hemiRef.current.intensity, target.hemisphereIntensity, lerpSpeed
      );
    }
    if (dirRef.current) {
      dirRef.current.intensity = THREE.MathUtils.lerp(
        dirRef.current.intensity, target.directionalIntensity, lerpSpeed
      );
      dirRef.current.color.lerp(new THREE.Color(target.directionalColor), lerpSpeed);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={preset.ambientIntensity} color={preset.ambientColor} />
      <hemisphereLight ref={hemiRef} args={[preset.hemisphereTop, preset.hemisphereBottom, preset.hemisphereIntensity]} />
      <directionalLight
        ref={dirRef}
        position={[15, 30, 10]}
        intensity={preset.directionalIntensity}
        color={preset.directionalColor}
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
        intensity={Math.max(0.1, preset.directionalIntensity * 0.24)}
        color="#ffd8a0"
      />
    </>
  );
}

// =============================================================
// Camera controller — smoothly tracks player position
// =============================================================

function CameraController({ targetX, targetZ }: { targetX: number; targetZ: number }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(targetX, 3, targetZ));

  useEffect(() => {
    targetRef.current.set(targetX, 3, targetZ);
  }, [targetX, targetZ]);

  useFrame(() => {
    const target = targetRef.current;
    const offset = new THREE.Vector3(20, 22, 20);
    const desiredPos = new THREE.Vector3(
      target.x + offset.x,
      offset.y,
      target.z + offset.z,
    );

    // Smooth lerp camera position
    camera.position.lerp(desiredPos, 0.08);
    camera.lookAt(target.x, target.y, target.z);
    camera.updateProjectionMatrix();
  });

  return null;
}

// =============================================================
// Interaction plane — invisible plane for click raycasting
// =============================================================

function InteractionPlane({
  heightMap,
  visibleTiles,
  visiblePlayers,
  visibleMobs,
  playerId,
  onTileClick,
  onMobClick,
  onPlayerClick,
}: {
  heightMap: Map<string, number>;
  visibleTiles: MCTileUpdate[];
  visiblePlayers: MCVisiblePlayer[];
  visibleMobs: MCMobState[];
  playerId: string;
  onTileClick: (x: number, y: number) => void;
  onMobClick: (mobId: string) => void;
  onPlayerClick: (targetPlayerId: string) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    const point = e.point as THREE.Vector3;
    const wx = Math.round(point.x);
    const wz = Math.round(point.z);

    // Check for mob at this position
    const mob = visibleMobs.find(m => m.x === wx && m.y === wz && m.hostile);
    if (mob) {
      onMobClick(mob.id);
      return;
    }

    // Check for player at this position
    const player = visiblePlayers.find(p => p.x === wx && p.y === wz && p.id !== playerId);
    if (player) {
      onPlayerClick(player.id);
      return;
    }

    // Otherwise tile click (mine/interact)
    onTileClick(wx, wz);
  }, [visibleMobs, visiblePlayers, playerId, onTileClick, onMobClick, onPlayerClick]);

  // Create individual clickable tiles at their correct heights
  const tilePositions = useMemo(() => {
    const tiles: { x: number; z: number; y: number }[] = [];
    for (const tu of visibleTiles) {
      const height = heightMap.get(`${tu.x},${tu.y}`) ?? 2;
      tiles.push({ x: tu.x, z: tu.y, y: height - 0.5 });
    }
    return tiles;
  }, [visibleTiles, heightMap]);

  return (
    <group>
      {tilePositions.map(t => (
        <mesh
          key={`${t.x},${t.z}`}
          position={[t.x, t.y, t.z]}
          onClick={handleClick}
          visible={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}

// =============================================================
// Torch lights — point lights at torch positions
// =============================================================

function TorchLights({
  tiles,
  heightMap,
  dayPhase,
}: {
  tiles: MCTileUpdate[];
  heightMap: Map<string, number>;
  dayPhase: DayPhase;
}) {
  const torchTiles = useMemo(
    () => tiles.filter(t => t.tile.block === 'torch'),
    [tiles]
  );

  const intensity = dayPhase === 'night' ? 3 : dayPhase === 'dusk' || dayPhase === 'dawn' ? 1.5 : 0.5;

  return (
    <>
      {torchTiles.slice(0, 10).map(t => {
        const h = heightMap.get(`${t.x},${t.y}`) ?? 2;
        return (
          <pointLight
            key={`torch-${t.x}-${t.y}`}
            position={[t.x, h + 1, t.y]}
            color="#ffa040"
            intensity={intensity}
            distance={6}
          />
        );
      })}
    </>
  );
}

// =============================================================
// Scene content (inside Canvas)
// =============================================================

function SceneContent({
  visibleTiles,
  exploredTilesRef,
  visiblePlayers,
  visibleMobs,
  selfState,
  dayPhase,
  playerId,
  onTileClick,
  onMobClick,
  onPlayerClick,
}: Omit<BoardRendererProps, 'onMove'>) {
  // Separate visible vs explored-only tiles
  const visibleKeys = useMemo(() => {
    const set = new Set<string>();
    for (const tu of visibleTiles) {
      set.add(`${tu.x},${tu.y}`);
    }
    return set;
  }, [visibleTiles]);

  const exploredOnlyTiles = useMemo(() => {
    const tiles: MCTileUpdate[] = [];
    exploredTilesRef.current.forEach((tile, key) => {
      if (!visibleKeys.has(key)) {
        const [x, y] = key.split(',').map(Number);
        tiles.push({ x, y, tile });
      }
    });
    return tiles;
    // Re-compute when visibleTiles changes (which means visibleKeys changed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKeys]);

  // Build terrain data
  const { visibleTerrainData, exploredTerrainData, heightMap } = useMemo(() => {
    const { blocks: vBlocks, heightMap: hMap } = buildTerrainBlocks(visibleTiles, false, TERRAIN_SEED);
    const { blocks: eBlocks, heightMap: eMap } = buildTerrainBlocks(exploredOnlyTiles, true, TERRAIN_SEED);

    // Merge height maps
    eMap.forEach((v, k) => { if (!hMap.has(k)) hMap.set(k, v); });

    return {
      visibleTerrainData: packBlocks(vBlocks),
      exploredTerrainData: packBlocks(eBlocks),
      heightMap: hMap,
    };
  }, [visibleTiles, exploredOnlyTiles]);

  // Build surface features
  const visibleFeaturesData = useMemo(() => {
    const featureBlocks: VoxelBlock[] = [];
    const smallBlocks: VoxelBlock[] = [];

    const features = buildSurfaceFeatures(visibleTiles, heightMap, false, TERRAIN_SEED);
    for (const b of features) {
      const tu = visibleTiles.find(t => t.x === b.x && t.y === b.z);
      if (tu && (tu.tile.block === 'flower_red' || tu.tile.block === 'flower_yellow' || tu.tile.block === 'torch')) {
        smallBlocks.push(b);
      } else {
        featureBlocks.push(b);
      }
    }

    return {
      features: packBlocks(featureBlocks),
      smallFeatures: packBlocks(smallBlocks),
    };
  }, [visibleTiles, heightMap]);

  const exploredFeaturesData = useMemo(() => {
    const features = buildSurfaceFeatures(exploredOnlyTiles, heightMap, true, TERRAIN_SEED);
    return packBlocks(features);
  }, [exploredOnlyTiles, heightMap]);

  return (
    <>
      {/* Dynamic lighting */}
      <DayNightLighting dayPhase={dayPhase} />

      {/* Camera follow player */}
      <CameraController targetX={selfState.x} targetZ={selfState.y} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[selfState.x, -0.5, selfState.y]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#1a1410" roughness={1} />
      </mesh>

      {/* Explored (dimmed) terrain */}
      <VoxelTerrain data={exploredTerrainData} />
      <VoxelTerrain data={exploredFeaturesData} />

      {/* Visible (bright) terrain */}
      <VoxelTerrain data={visibleTerrainData} />
      <VoxelTerrain data={visibleFeaturesData.features} />
      <FeatureBlocks data={visibleFeaturesData.smallFeatures} />

      {/* Torch lights */}
      <TorchLights tiles={visibleTiles} heightMap={heightMap} dayPhase={dayPhase} />

      {/* Entities — players */}
      {visiblePlayers.map(p => (
        <PlayerEntity
          key={p.id}
          player={p}
          heightMap={heightMap}
          isSelf={p.id === playerId}
        />
      ))}

      {/* Entities — mobs */}
      {visibleMobs.map(m => (
        <MobEntity key={m.id} mob={m} heightMap={heightMap} />
      ))}

      {/* Mining indicator */}
      {selfState.mining && (
        <MiningIndicator mining={selfState.mining} heightMap={heightMap} />
      )}

      {/* Interaction plane for raycasting clicks */}
      <InteractionPlane
        heightMap={heightMap}
        visibleTiles={visibleTiles}
        visiblePlayers={visiblePlayers}
        visibleMobs={visibleMobs}
        playerId={playerId}
        onTileClick={onTileClick}
        onMobClick={onMobClick}
        onPlayerClick={onPlayerClick}
      />
    </>
  );
}

// =============================================================
// Main BoardRenderer3D component
// =============================================================

export default function BoardRenderer3D({
  visibleTiles,
  exploredTilesRef,
  visiblePlayers,
  visibleMobs,
  selfState,
  dayPhase,
  playerId,
  onTileClick,
  onMobClick,
  onPlayerClick,
  onMove,
}: BoardRendererProps) {
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); onMove('up'); break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); onMove('down'); break;
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); onMove('left'); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); onMove('right'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMove]);

  // Mobile touch controls handler
  const handleTouchMove = useCallback((dir: Direction) => {
    onMove(dir);
  }, [onMove]);

  const bgColor = DAY_NIGHT_PRESETS[dayPhase]?.bgColor || '#1e1812';

  return (
    <div className={styles.boardWrapper3d}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ position: 'absolute', inset: 0 }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={[bgColor]} />
          <OrthographicCamera
            makeDefault
            position={[selfState.x + 20, 22, selfState.y + 20]}
            zoom={22}
            near={0.1}
            far={200}
          />

          <SceneContent
            visibleTiles={visibleTiles}
            exploredTilesRef={exploredTilesRef}
            visiblePlayers={visiblePlayers}
            visibleMobs={visibleMobs}
            selfState={selfState}
            dayPhase={dayPhase}
            playerId={playerId}
            onTileClick={onTileClick}
            onMobClick={onMobClick}
            onPlayerClick={onPlayerClick}
          />
        </Suspense>
      </Canvas>

      {/* Coordinates display */}
      <div className={styles.coordsDisplay3d}>
        X: {selfState.x} Y: {selfState.y} | {dayPhase.toUpperCase()}
      </div>

      {/* Mobile D-pad */}
      <div className={styles.dpad3d}>
        <button className={`${styles.dpadBtn3d} ${styles.dpadUp3d}`} onClick={() => handleTouchMove('up')}>W</button>
        <button className={`${styles.dpadBtn3d} ${styles.dpadLeft3d}`} onClick={() => handleTouchMove('left')}>A</button>
        <button className={`${styles.dpadBtn3d} ${styles.dpadDown3d}`} onClick={() => handleTouchMove('down')}>S</button>
        <button className={`${styles.dpadBtn3d} ${styles.dpadRight3d}`} onClick={() => handleTouchMove('right')}>D</button>
      </div>
    </div>
  );
}
