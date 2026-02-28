'use client';

// =============================================================
// Minecraft Board Game - 3D Voxel Board Renderer
// Supports board (isometric-perspective) and FPS (first-person) camera modes.
// Characters have detailed limbs; textures use rich per-block color variation.
// =============================================================

import { Component, Suspense, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
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

// === Error Boundary ===

interface ErrorBoundaryState { hasError: boolean; error: string | null }

class Canvas3DErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[BoardRenderer3D] Canvas error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

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
  activeAnomaly?: boolean;
  /** 'board' = isometric-perspective overhead; 'fps' = first-person */
  cameraMode?: 'board' | 'fps';
}

const TERRAIN_SEED = 42069;

// Direction lookup tables for FPS relative movement
const TURN_RIGHT: Record<Direction, Direction> = { up: 'right', right: 'down', down: 'left', left: 'up' };
const TURN_LEFT: Record<Direction, Direction> = { up: 'left', left: 'down', down: 'right', right: 'up' };
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

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
// Entity (player/mob) as voxel figures — detailed limb geometry
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
  const posRef = useRef(new THREE.Vector3(player.x, 0, player.y));
  const baseHeight = heightMap.get(`${player.x},${player.y}`) ?? 2;
  const topY = baseHeight;

  // Smooth entity position interpolation
  useEffect(() => {
    posRef.current.set(player.x, 0, player.y);
  }, [player.x, player.y]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const bob = Math.sin(t * 2 + player.x) * 0.08;
    // Framerate-independent lerp to new tile position
    const alpha = 1 - Math.exp(-18 * delta);
    const prevX = groupRef.current.position.x;
    const prevZ = groupRef.current.position.z;
    groupRef.current.position.x = THREE.MathUtils.lerp(prevX, posRef.current.x, alpha);
    groupRef.current.position.z = THREE.MathUtils.lerp(prevZ, posRef.current.z, alpha);
    groupRef.current.position.y = topY + bob;
    // Swing limbs only when the entity is visibly moving
    const isMoving = Math.abs(groupRef.current.position.x - posRef.current.x) > 0.01 ||
                     Math.abs(groupRef.current.position.z - posRef.current.z) > 0.01;
    const swingL = isMoving ? Math.sin(t * 8) * 0.2 : 0;
    const swingR = -swingL;
    const childMeshes = groupRef.current.children;
    // children order: body(0), head(1), leftArm(2), rightArm(3), leftLeg(4), rightLeg(5)
    if (childMeshes[2]) childMeshes[2].rotation.x = swingL;
    if (childMeshes[3]) childMeshes[3].rotation.x = swingR;
    if (childMeshes[4]) childMeshes[4].rotation.x = swingR;
    if (childMeshes[5]) childMeshes[5].rotation.x = swingL;
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

  // 2-block-tall Minecraft character proportions (32px total):
  // Legs:  0.75 blocks (12px), bottom at y=0, center y=0.375
  // Body:  0.75 blocks (12px), bottom at y=0.75, center y=1.125
  // Head:  0.50 blocks (8px),  bottom at y=1.5, center y=1.75
  // Arms:  0.75 blocks (12px), alongside body, center y=1.125
  const bodyColor = new THREE.Color(player.color);
  const headColor = bodyColor.clone().lerp(new THREE.Color('#f5cba7'), 0.55);
  const legColor = bodyColor.clone().lerp(new THREE.Color('#2c3e50'), 0.5);
  const armColor = bodyColor.clone().lerp(new THREE.Color('#000'), 0.1);

  return (
    <group ref={groupRef} position={[player.x, topY, player.y]}>
      {/* Body — 0.5 wide × 0.75 tall × 0.25 deep */}
      <mesh position={[0, 1.125, 0]} castShadow>
        <boxGeometry args={[0.5, 0.75, 0.25]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={isSelf ? bodyColor : undefined}
          emissiveIntensity={isSelf ? 0.25 : 0}
          roughness={0.55}
          flatShading
        />
      </mesh>
      {/* Head — 0.5 × 0.5 × 0.5 */}
      <mesh position={[0, 1.75, 0]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={headColor} roughness={0.45} flatShading />
      </mesh>
      {/* Left arm — 0.25 wide × 0.75 tall × 0.25 deep */}
      <mesh position={[-0.375, 1.125, 0]} castShadow>
        <boxGeometry args={[0.25, 0.75, 0.25]} />
        <meshStandardMaterial color={armColor} roughness={0.6} flatShading />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.375, 1.125, 0]} castShadow>
        <boxGeometry args={[0.25, 0.75, 0.25]} />
        <meshStandardMaterial color={armColor} roughness={0.6} flatShading />
      </mesh>
      {/* Left leg — 0.25 wide × 0.75 tall × 0.25 deep */}
      <mesh position={[-0.125, 0.375, 0]} castShadow>
        <boxGeometry args={[0.25, 0.75, 0.25]} />
        <meshStandardMaterial color={legColor} roughness={0.65} flatShading />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.125, 0.375, 0]} castShadow>
        <boxGeometry args={[0.25, 0.75, 0.25]} />
        <meshStandardMaterial color={legColor} roughness={0.65} flatShading />
      </mesh>
      {isSelf && (
        <pointLight position={[0, 2.5, 0]} color={player.color} intensity={2} distance={5} />
      )}
      {!isSelf && (
        <Html position={[0, 2.3, 0]} center style={{ pointerEvents: 'none' }}>
          <div className={styles.entityHp3d}>
            <span className={styles.entityName3d}>{player.name.slice(0, 6)}</span>
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

function MobEntity({ mob, heightMap }: { mob: MCMobState; heightMap: Map<string, number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(mob.x, 0, mob.y));
  const baseHeight = heightMap.get(`${mob.x},${mob.y}`) ?? 2;
  const topY = baseHeight;
  const mobColor = new THREE.Color(MOB_COLORS[mob.type] || '#888');
  const isTall = mob.type !== 'chicken';
  const isQuadruped = mob.type === 'cow' || mob.type === 'pig' || mob.type === 'spider';

  useEffect(() => {
    posRef.current.set(mob.x, 0, mob.y);
  }, [mob.x, mob.y]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const alpha = 1 - Math.exp(-12 * delta);
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, posRef.current.x, alpha);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, posRef.current.z, alpha);
    if (mob.hostile) {
      groupRef.current.position.y = topY + Math.sin(clock.elapsedTime * 3 + mob.x * 7) * 0.06;
    } else {
      groupRef.current.position.y = topY;
    }
  });

  if (isQuadruped) {
    const bodyCol = mobColor.clone();
    const legCol = bodyCol.clone().lerp(new THREE.Color('#2c2c2c'), 0.3);
    return (
      <group ref={groupRef} position={[mob.x, topY, mob.y]}>
        {/* Quadruped body */}
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[0.6, 0.38, 0.95]} />
          <meshStandardMaterial color={bodyCol} roughness={0.65} flatShading />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.5, 0.5]} castShadow>
          <boxGeometry args={[0.38, 0.32, 0.34]} />
          <meshStandardMaterial color={bodyCol.clone().lerp(new THREE.Color('#fff'), 0.1)} roughness={0.6} flatShading />
        </mesh>
        {/* 4 legs — explicit positions: front-left, front-right, back-left, back-right */}
        {([
          [-0.2, -0.32], [0.2, -0.32],  // front legs
          [-0.2, 0.32],  [0.2, 0.32],   // back legs
        ] as [number, number][]).map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, -0.1, lz]} castShadow>
            <boxGeometry args={[0.18, 0.36, 0.18]} />
            <meshStandardMaterial color={legCol} roughness={0.7} flatShading />
          </mesh>
        ))}
        <Html position={[0, 0.9, 0]} center style={{ pointerEvents: 'none' }}>
          <div className={styles.entityHp3d}>
            <div className={styles.hpBar3d}>
              <div className={styles.hpFill3d} style={{ width: `${(mob.health / mob.maxHealth) * 100}%`, backgroundColor: mob.hostile ? '#ff4444' : '#44dd44' }} />
            </div>
          </div>
        </Html>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={[mob.x, topY, mob.y]}>
      {/* Body */}
      <mesh position={[0, isTall ? 0.3 : 0.12, 0]} castShadow>
        <boxGeometry args={isTall ? [0.46, 0.56, 0.26] : [0.38, 0.28, 0.28]} />
        <meshStandardMaterial
          color={mobColor}
          emissive={mob.hostile ? new THREE.Color('#330000') : undefined}
          emissiveIntensity={mob.hostile ? 0.25 : 0}
          roughness={0.6}
          flatShading
        />
      </mesh>
      {/* Head */}
      {isTall && (
        <mesh position={[0, 0.76, 0]} castShadow>
          <boxGeometry args={[0.38, 0.36, 0.36]} />
          <meshStandardMaterial color={mobColor.clone().lerp(new THREE.Color('#ffffff'), 0.15)} roughness={0.6} flatShading />
        </mesh>
      )}
      {/* Arms (biped) */}
      {isTall && (
        <>
          <mesh position={[-0.3, 0.28, 0]} castShadow>
            <boxGeometry args={[0.16, 0.48, 0.18]} />
            <meshStandardMaterial color={mobColor.clone().lerp(new THREE.Color('#000'), 0.15)} roughness={0.65} flatShading />
          </mesh>
          <mesh position={[0.3, 0.28, 0]} castShadow>
            <boxGeometry args={[0.16, 0.48, 0.18]} />
            <meshStandardMaterial color={mobColor.clone().lerp(new THREE.Color('#000'), 0.15)} roughness={0.65} flatShading />
          </mesh>
        </>
      )}
      {/* Legs (biped) */}
      {isTall && (
        <>
          <mesh position={[-0.12, -0.12, 0]} castShadow>
            <boxGeometry args={[0.18, 0.42, 0.2]} />
            <meshStandardMaterial color={mobColor.clone().lerp(new THREE.Color('#1a1a1a'), 0.4)} roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0.12, -0.12, 0]} castShadow>
            <boxGeometry args={[0.18, 0.42, 0.2]} />
            <meshStandardMaterial color={mobColor.clone().lerp(new THREE.Color('#1a1a1a'), 0.4)} roughness={0.7} flatShading />
          </mesh>
        </>
      )}
      <Html position={[0, isTall ? 1.3 : 0.7, 0]} center style={{ pointerEvents: 'none' }}>
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
// Mining indicator
// =============================================================

function MiningIndicator({
  mining, heightMap,
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
        <meshStandardMaterial color="#ffffff" transparent opacity={0.2 + progress * 0.3} wireframe />
      </mesh>
      <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div className={styles.miningLabel3d}>{Math.floor(progress * 100)}%</div>
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

  useFrame(() => {
    const target = targetPreset.current;
    const lerpSpeed = 0.02;
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, target.ambientIntensity, lerpSpeed);
      ambientRef.current.color.lerp(new THREE.Color(target.ambientColor), lerpSpeed);
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = THREE.MathUtils.lerp(hemiRef.current.intensity, target.hemisphereIntensity, lerpSpeed);
    }
    if (dirRef.current) {
      dirRef.current.intensity = THREE.MathUtils.lerp(dirRef.current.intensity, target.directionalIntensity, lerpSpeed);
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
      <directionalLight position={[-10, 15, -5]} intensity={Math.max(0.1, preset.directionalIntensity * 0.24)} color="#ffd8a0" />
    </>
  );
}

// =============================================================
// Board camera — smooth perspective from above (isometric feel)
// =============================================================

function BoardCameraController({ targetX, targetZ }: { targetX: number; targetZ: number }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(targetX, 3, targetZ));
  const initialized = useRef(false);

  useEffect(() => {
    targetRef.current.set(targetX, 3, targetZ);
  }, [targetX, targetZ]);

  useEffect(() => {
    if (!initialized.current) {
      const target = targetRef.current;
      camera.position.set(target.x + 20, 28, target.z + 20);
      camera.lookAt(target.x, 0, target.z);
      camera.updateProjectionMatrix();
      initialized.current = true;
    }
  }, [camera]);

  useFrame((_, delta) => {
    const target = targetRef.current;
    const desiredPos = new THREE.Vector3(target.x + 20, 28, target.z + 20);
    const alpha = 1 - Math.exp(-10 * delta);
    camera.position.lerp(desiredPos, alpha);
    camera.lookAt(target.x, 0, target.z);
    camera.updateProjectionMatrix();
  });

  return null;
}

// =============================================================
// FPS camera — first-person perspective, tracks movement direction
// =============================================================

function FPSCameraController({
  targetX, targetZ, facingRef, heightMap,
}: {
  targetX: number;
  targetZ: number;
  facingRef: React.MutableRefObject<Direction>;
  heightMap: Map<string, number>;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(targetX, 3, targetZ));
  const targetLookOffset = useRef(new THREE.Vector3(0, 0, -1));
  const currentLookOffset = useRef(new THREE.Vector3(0, 0, -1));
  const initialized = useRef(false);

  // Sync target position from grid coords
  useEffect(() => {
    const eyeY = (heightMap.get(`${targetX},${targetZ}`) ?? 2) + 1.62;
    targetPos.current.set(targetX, eyeY, targetZ);
  }, [targetX, targetZ, heightMap]);

  useEffect(() => {
    if (!initialized.current) {
      const p = targetPos.current;
      camera.position.copy(p);
      const fv = currentLookOffset.current;
      camera.lookAt(p.x + fv.x * 6, p.y, p.z + fv.z * 6);
      camera.updateProjectionMatrix();
      initialized.current = true;
    }
  }, [camera]);

  useFrame((_, delta) => {
    // Update target look direction from latest facing
    switch (facingRef.current) {
      case 'up':    targetLookOffset.current.set(0, 0, -1); break;
      case 'down':  targetLookOffset.current.set(0, 0, 1);  break;
      case 'left':  targetLookOffset.current.set(-1, 0, 0); break;
      case 'right': targetLookOffset.current.set(1, 0, 0);  break;
    }

    // Smoothly interpolate look direction (prevents jarring camera snaps when turning)
    const lookAlpha = 1 - Math.exp(-14 * delta);
    currentLookOffset.current.lerp(targetLookOffset.current, lookAlpha);

    // Smooth camera position with delta-time
    const posAlpha = 1 - Math.exp(-12 * delta);
    camera.position.lerp(targetPos.current, posAlpha);

    // Look at smoothly interpolated direction
    const fv = currentLookOffset.current;
    const lookTarget = new THREE.Vector3(
      camera.position.x + fv.x * 6,
      camera.position.y + fv.y * 6,
      camera.position.z + fv.z * 6,
    );
    camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
    camera.updateProjectionMatrix();
  });

  return null;
}

// =============================================================
// Interaction plane — invisible plane for click raycasting
// =============================================================

function InteractionPlane({
  heightMap, visibleTiles, visiblePlayers, visibleMobs, playerId,
  onTileClick, onMobClick, onPlayerClick,
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

    const mob = visibleMobs.find(m => m.x === wx && m.y === wz && m.hostile);
    if (mob) { onMobClick(mob.id); return; }

    const player = visiblePlayers.find(p => p.x === wx && p.y === wz && p.id !== playerId);
    if (player) { onPlayerClick(player.id); return; }

    onTileClick(wx, wz);
  }, [visibleMobs, visiblePlayers, playerId, onTileClick, onMobClick, onPlayerClick]);

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
        <mesh key={`${t.x},${t.z}`} position={[t.x, t.y, t.z]} onClick={handleClick} visible={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}

// =============================================================
// Torch lights
// =============================================================

function TorchLights({ tiles, heightMap, dayPhase }: { tiles: MCTileUpdate[]; heightMap: Map<string, number>; dayPhase: DayPhase }) {
  const torchTiles = useMemo(() => tiles.filter(t => t.tile.block === 'torch'), [tiles]);
  const intensity = dayPhase === 'night' ? 3 : dayPhase === 'dusk' || dayPhase === 'dawn' ? 1.5 : 0.5;

  return (
    <>
      {torchTiles.slice(0, 10).map(t => {
        const h = heightMap.get(`${t.x},${t.y}`) ?? 2;
        return <pointLight key={`torch-${t.x}-${t.y}`} position={[t.x, h + 1, t.y]} color="#ffa040" intensity={intensity} distance={6} />;
      })}
    </>
  );
}

// =============================================================
// Scene content (inside Canvas)
// =============================================================

function SceneContent({
  visibleTiles, exploredTilesRef, visiblePlayers, visibleMobs,
  selfState, dayPhase, playerId, onTileClick, onMobClick, onPlayerClick,
  cameraMode, facingRef,
}: Omit<BoardRendererProps, 'onMove' | 'activeAnomaly'> & {
  cameraMode: 'board' | 'fps';
  facingRef: React.MutableRefObject<Direction>;
}) {
  const visibleKeys = useMemo(() => {
    const set = new Set<string>();
    for (const tu of visibleTiles) set.add(`${tu.x},${tu.y}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKeys]);

  const { visibleTerrainData, exploredTerrainData, heightMap } = useMemo(() => {
    const { blocks: vBlocks, heightMap: hMap } = buildTerrainBlocks(visibleTiles, false, TERRAIN_SEED);
    const { blocks: eBlocks, heightMap: eMap } = buildTerrainBlocks(exploredOnlyTiles, true, TERRAIN_SEED);
    eMap.forEach((v, k) => { if (!hMap.has(k)) hMap.set(k, v); });
    return { visibleTerrainData: packBlocks(vBlocks), exploredTerrainData: packBlocks(eBlocks), heightMap: hMap };
  }, [visibleTiles, exploredOnlyTiles]);

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
    return { features: packBlocks(featureBlocks), smallFeatures: packBlocks(smallBlocks) };
  }, [visibleTiles, heightMap]);

  const exploredFeaturesData = useMemo(() => {
    return packBlocks(buildSurfaceFeatures(exploredOnlyTiles, heightMap, true, TERRAIN_SEED));
  }, [exploredOnlyTiles, heightMap]);

  return (
    <>
      <DayNightLighting dayPhase={dayPhase} />
      {cameraMode === 'fps' ? (
        <FPSCameraController
          targetX={selfState.x}
          targetZ={selfState.y}
          facingRef={facingRef}
          heightMap={heightMap}
        />
      ) : (
        <BoardCameraController targetX={selfState.x} targetZ={selfState.y} />
      )}

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

      <TorchLights tiles={visibleTiles} heightMap={heightMap} dayPhase={dayPhase} />

      {visiblePlayers.map(p => (
        // In FPS mode, hide self (camera is the self perspective)
        (cameraMode === 'fps' && p.id === playerId) ? null : (
          <PlayerEntity key={p.id} player={p} heightMap={heightMap} isSelf={p.id === playerId} />
        )
      ))}

      {visibleMobs.map(m => (
        <MobEntity key={m.id} mob={m} heightMap={heightMap} />
      ))}

      {selfState.mining && <MiningIndicator mining={selfState.mining} heightMap={heightMap} />}

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
  visibleTiles, exploredTilesRef, visiblePlayers, visibleMobs,
  selfState, dayPhase, playerId,
  onTileClick, onMobClick, onPlayerClick, onMove,
  cameraMode = 'board',
}: BoardRendererProps) {
  // Track last movement direction for FPS camera
  const facingRef = useRef<Direction>('up');

  // Continuous key polling — eliminates browser keyboard repeat delay
  const pressedInputs = useRef(new Set<'forward' | 'backward' | 'left' | 'right'>());
  const lastMoveInputRef = useRef<'forward' | 'backward' | 'left' | 'right' | null>(null);
  const lastMoveTimeRef = useRef(0);
  const MOVE_POLL_MS = 100;

  useEffect(() => {
    const fireMove = (rawInput: 'forward' | 'backward' | 'left' | 'right') => {
      if (cameraMode === 'fps') {
        const facing = facingRef.current;
        let worldDir: Direction;
        switch (rawInput) {
          case 'forward':  worldDir = facing; break;
          case 'backward': worldDir = OPPOSITE[facing]; break;
          case 'left':     worldDir = TURN_LEFT[facing]; break;
          case 'right':    worldDir = TURN_RIGHT[facing]; break;
        }
        if (rawInput !== 'backward') {
          facingRef.current = worldDir;
        }
        onMove(worldDir);
      } else {
        const dirMap: Record<string, Direction> = { forward: 'up', backward: 'down', left: 'left', right: 'right' };
        const dir = dirMap[rawInput];
        facingRef.current = dir;
        onMove(dir);
      }
      lastMoveInputRef.current = rawInput;
      lastMoveTimeRef.current = performance.now();
    };

    const keyToInput = (key: string): 'forward' | 'backward' | 'left' | 'right' | null => {
      switch (key) {
        case 'ArrowUp': case 'w': case 'W': return 'forward';
        case 'ArrowDown': case 's': case 'S': return 'backward';
        case 'ArrowLeft': case 'a': case 'A': return 'left';
        case 'ArrowRight': case 'd': case 'D': return 'right';
        default: return null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const rawInput = keyToInput(e.key);
      if (!rawInput) return;
      e.preventDefault();
      const wasEmpty = pressedInputs.current.size === 0;
      pressedInputs.current.add(rawInput);
      // Fire immediately on fresh press or direction change (no waiting for poll interval)
      if (wasEmpty || rawInput !== lastMoveInputRef.current) {
        const now = performance.now();
        if (now - lastMoveTimeRef.current >= MOVE_POLL_MS) {
          fireMove(rawInput);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const rawInput = keyToInput(e.key);
      if (rawInput) pressedInputs.current.delete(rawInput);
    };

    const handleBlur = () => {
      pressedInputs.current.clear();
    };

    const pollInterval = setInterval(() => {
      if (pressedInputs.current.size === 0) return;
      const now = performance.now();
      if (now - lastMoveTimeRef.current < MOVE_POLL_MS) return;
      let input: 'forward' | 'backward' | 'left' | 'right' | null = null;
      for (const i of pressedInputs.current) input = i;
      if (input) fireMove(input);
    }, 16);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onMove, cameraMode]);

  const handleTouchMove = useCallback((rawDir: Direction) => {
    if (cameraMode === 'fps') {
      // FPS mode: translate D-pad input relative to current facing
      // D-pad "up" = forward, "down" = backward, "left" = turn left, "right" = turn right
      const facing = facingRef.current;
      const inputMap: Record<Direction, 'forward' | 'backward' | 'left' | 'right'> = {
        up: 'forward', down: 'backward', left: 'left', right: 'right',
      };
      const rawInput = inputMap[rawDir];
      let worldDir: Direction;
      switch (rawInput) {
        case 'forward':  worldDir = facing; break;
        case 'backward': worldDir = OPPOSITE[facing]; break;
        case 'left':     worldDir = TURN_LEFT[facing]; break;
        case 'right':    worldDir = TURN_RIGHT[facing]; break;
      }
      if (rawInput !== 'backward') {
        facingRef.current = worldDir;
      }
      onMove(worldDir);
    } else {
      facingRef.current = rawDir;
      onMove(rawDir);
    }
  }, [onMove, cameraMode]);

  const dpadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearDpadInterval = useCallback(() => {
    if (dpadIntervalRef.current) { clearInterval(dpadIntervalRef.current); dpadIntervalRef.current = null; }
  }, []);
  const startDpadHold = useCallback((dir: Direction) => {
    handleTouchMove(dir);
    clearDpadInterval();
    dpadIntervalRef.current = setInterval(() => handleTouchMove(dir), MOVE_POLL_MS);
  }, [handleTouchMove, clearDpadInterval]);
  useEffect(() => {
    return () => { clearDpadInterval(); };
  }, [clearDpadInterval]);

  const bgColor = DAY_NIGHT_PRESETS[dayPhase]?.bgColor || '#1e1812';

  // FPS mode: wider FOV, eye-level initial camera
  // Board mode: narrow FOV, elevated isometric-style camera
  const initialCamera = cameraMode === 'fps'
    ? { fov: 75, position: [selfState.x, 4, selfState.y] as [number, number, number], near: 0.05, far: 200 }
    : { fov: 22, position: [selfState.x + 20, 28, selfState.y + 20] as [number, number, number], near: 0.1, far: 300 };

  const canvasFallback = (
    <div className={styles.boardWrapper3d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
      <p style={{ color: '#888', fontFamily: 'var(--font-pixel, monospace)', fontSize: '0.8rem' }}>
        3D renderer failed to load. Try refreshing.
      </p>
    </div>
  );

  return (
    <div className={styles.boardWrapper3d}>
      <Canvas3DErrorBoundary fallback={canvasFallback}>
        <Canvas
          key={cameraMode}
          shadows
          gl={{ antialias: true, alpha: false }}
          style={{ position: 'absolute', inset: 0 }}
          camera={initialCamera}
          onCreated={({ gl, camera }) => {
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            if (cameraMode === 'fps') {
              // Default facing 'up' matches FPSCameraController default (z: -1 direction)
              camera.lookAt(selfState.x, 4, selfState.y - 1);
            } else {
              camera.lookAt(selfState.x, 0, selfState.y);
            }
            camera.updateProjectionMatrix();
          }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={[bgColor]} />

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
              cameraMode={cameraMode}
              facingRef={facingRef}
            />
          </Suspense>
        </Canvas>
      </Canvas3DErrorBoundary>

      {/* Coordinates + mode display */}
      <div className={styles.coordsDisplay3d}>
        X: {selfState.x} Y: {selfState.y} | {dayPhase.toUpperCase()} | {cameraMode === 'fps' ? 'FPS' : 'BOARD'}
      </div>

      {/* Mobile D-pad with hold-to-move */}
      <div className={styles.dpad3d}>
        {(['up', 'left', 'down', 'right'] as const).map(dir => (
          <button
            key={dir}
            className={`${styles.dpadBtn3d} ${styles[`dpad${dir.charAt(0).toUpperCase() + dir.slice(1)}3d` as keyof typeof styles]}`}
            onPointerDown={e => { e.preventDefault(); startDpadHold(dir); }}
            onPointerUp={clearDpadInterval}
            onPointerCancel={clearDpadInterval}
            onPointerLeave={clearDpadInterval}
            onContextMenu={e => e.preventDefault()}
          >
            {{ up: 'W', left: 'A', down: 'S', right: 'D' }[dir]}
          </button>
        ))}
      </div>
    </div>
  );
}
