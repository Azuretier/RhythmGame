'use client';

import { Component, Suspense, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Sky } from '@react-three/drei';
import * as THREE from 'three';
import type {
  GameState, Tower, Enemy, Projectile, GridCell, TowerType, Vec3,
} from '@/types/tower-defense';
import { TOWER_DEFS, ENEMY_DEFS } from '@/types/tower-defense';

// ===== Error Boundary =====
interface ErrorBoundaryState { hasError: boolean; error: string | null }

class CanvasErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[TowerDefense3D] Canvas error:', error, info);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ===== Constants =====
const CELL_SIZE = 1;
const TERRAIN_COLORS: Record<string, string> = {
  grass: '#3a7d44',
  path: '#c4a35a',
  water: '#2d6a9f',
  mountain: '#6b7280',
  spawn: '#ef4444',
  base: '#3b82f6',
};

const TERRAIN_COLORS_ALT: Record<string, string> = {
  grass: '#348a3e',
  path: '#b8944d',
  water: '#2a5f8f',
  mountain: '#5f6670',
  spawn: '#dc3545',
  base: '#2563eb',
};

// ===== Terrain =====
function TerrainGrid({ grid, onCellClick, hoveredCell, canPlace }: {
  grid: GridCell[][];
  onCellClick: (x: number, z: number) => void;
  hoveredCell: { x: number; z: number } | null;
  canPlace: boolean;
}) {
  const meshesData = useMemo(() => {
    const cells: { x: number; z: number; terrain: string; elevation: number; hasTower: boolean }[] = [];
    for (let z = 0; z < grid.length; z++) {
      for (let x = 0; x < grid[z].length; x++) {
        const c = grid[z][x];
        cells.push({ x: c.x, z: c.z, terrain: c.terrain, elevation: c.elevation, hasTower: !!c.towerId });
      }
    }
    return cells;
  }, [grid]);

  return (
    <group>
      {meshesData.map((cell, i) => {
        const isHovered = hoveredCell && hoveredCell.x === cell.x && hoveredCell.z === cell.z;
        const checker = (cell.x + cell.z) % 2 === 0;
        const baseColor = checker ? TERRAIN_COLORS[cell.terrain] : TERRAIN_COLORS_ALT[cell.terrain];
        let color = baseColor;
        if (isHovered && canPlace && cell.terrain === 'grass' && !cell.hasTower) {
          color = '#22d3ee';
        } else if (isHovered && (!canPlace || cell.terrain !== 'grass' || cell.hasTower)) {
          color = '#ef4444';
        }

        const height = cell.terrain === 'water' ? 0.08 :
                       cell.terrain === 'mountain' ? 0.5 + Math.random() * 0.001 :
                       cell.terrain === 'path' ? 0.12 : 0.2;

        return (
          <mesh
            key={i}
            position={[cell.x, cell.elevation + height / 2 - 0.1, cell.z]}
            onClick={(e) => { e.stopPropagation(); onCellClick(cell.x, cell.z); }}
            onPointerEnter={(e) => e.stopPropagation()}
          >
            <boxGeometry args={[CELL_SIZE * 0.98, height, CELL_SIZE * 0.98]} />
            <meshStandardMaterial
              color={color}
              roughness={cell.terrain === 'water' ? 0.2 : 0.8}
              metalness={cell.terrain === 'water' ? 0.3 : 0.05}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ===== Path Visualization =====
function PathLine({ waypoints }: { waypoints: Vec3[] }) {
  const ref = useRef<THREE.Line>(null);

  const lineGeo = useMemo(() => {
    const points = waypoints.map(wp => new THREE.Vector3(wp.x, 0.15, wp.z));
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [waypoints]);

  const lineMat = useMemo(() => {
    return new THREE.LineBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.5 });
  }, []);

  return <primitive ref={ref} object={new THREE.Line(lineGeo, lineMat)} />;
}

// ===== Towers =====
function TowerMesh({ tower, isSelected, onClick }: {
  tower: Tower;
  isSelected: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const def = TOWER_DEFS[tower.type];

  useFrame((state) => {
    if (!groupRef.current) return;
    if (isSelected) {
      groupRef.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    } else {
      groupRef.current.position.y = 0.3;
    }
  });

  const towerShape = useMemo(() => {
    switch (tower.type) {
      case 'archer':
        return { baseH: 0.6, topH: 0.2, topScale: 0.6, baseR: 0.25 };
      case 'cannon':
        return { baseH: 0.4, topH: 0.35, topScale: 0.9, baseR: 0.3 };
      case 'frost':
        return { baseH: 0.5, topH: 0.3, topScale: 0.5, baseR: 0.22 };
      case 'lightning':
        return { baseH: 0.7, topH: 0.15, topScale: 0.4, baseR: 0.2 };
      case 'sniper':
        return { baseH: 0.8, topH: 0.1, topScale: 0.3, baseR: 0.18 };
      case 'flame':
        return { baseH: 0.4, topH: 0.3, topScale: 0.7, baseR: 0.28 };
      case 'arcane':
        return { baseH: 0.6, topH: 0.25, topScale: 0.5, baseR: 0.24 };
      default:
        return { baseH: 0.5, topH: 0.2, topScale: 0.6, baseR: 0.25 };
    }
  }, [tower.type]);

  const levelScale = 1 + (tower.level - 1) * 0.1;

  return (
    <group
      ref={groupRef}
      position={[tower.gridX, 0.3, tower.gridZ]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      scale={levelScale}
    >
      {/* Base cylinder */}
      <mesh position={[0, towerShape.baseH / 2, 0]} castShadow>
        <cylinderGeometry args={[towerShape.baseR * 0.8, towerShape.baseR, towerShape.baseH, 8]} />
        <meshStandardMaterial color={def.color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Top section */}
      <mesh position={[0, towerShape.baseH + towerShape.topH / 2, 0]} castShadow>
        <cylinderGeometry args={[towerShape.baseR * towerShape.topScale * 1.2, towerShape.baseR * towerShape.topScale, towerShape.topH, 8]} />
        <meshStandardMaterial color={def.accentColor} roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Level indicators */}
      {Array.from({ length: tower.level }).map((_, i) => (
        <mesh key={i} position={[(i - (tower.level - 1) / 2) * 0.12, towerShape.baseH + towerShape.topH + 0.08, 0]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* Range indicator when selected */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[def.rangePerLevel[tower.level - 1] - 0.05, def.rangePerLevel[tower.level - 1], 32]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function TowersGroup({ towers, selectedTowerId, onSelectTower }: {
  towers: Tower[];
  selectedTowerId: string | null;
  onSelectTower: (id: string) => void;
}) {
  return (
    <group>
      {towers.map(tower => (
        <TowerMesh
          key={tower.id}
          tower={tower}
          isSelected={tower.id === selectedTowerId}
          onClick={() => onSelectTower(tower.id)}
        />
      ))}
    </group>
  );
}

// ===== Enemies =====
function EnemyMesh({ enemy }: { enemy: Enemy }) {
  const groupRef = useRef<THREE.Group>(null);
  const def = ENEMY_DEFS[enemy.type];
  const hpPercent = enemy.hp / enemy.maxHp;

  const isSlow = enemy.effects.some(e => e.type === 'slow');
  const isBurning = enemy.effects.some(e => e.type === 'burn');
  const isAmplified = enemy.effects.some(e => e.type === 'amplify');

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Bobbing animation
    const bobHeight = enemy.flying ? 1.5 + Math.sin(t * 2) * 0.15 : Math.sin(t * 4 + parseFloat(enemy.id.slice(1)) * 0.5) * 0.03;
    groupRef.current.position.set(enemy.position.x, enemy.position.y + bobHeight + def.scale * 0.5, enemy.position.z);
  });

  const bodyColor = useMemo(() => {
    if (isBurning) return '#ff6b35';
    if (isSlow) return '#7dd3fc';
    return def.color;
  }, [def.color, isBurning, isSlow]);

  return (
    <group ref={groupRef}>
      {/* Body */}
      {enemy.type === 'boss' ? (
        <mesh castShadow>
          <dodecahedronGeometry args={[def.scale, 1]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={0.3}
            metalness={0.4}
            emissive={bodyColor}
            emissiveIntensity={0.2}
          />
        </mesh>
      ) : enemy.type === 'tank' || enemy.type === 'shield' ? (
        <mesh castShadow>
          <boxGeometry args={[def.scale * 1.2, def.scale, def.scale * 1.2]} />
          <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.3} />
        </mesh>
      ) : enemy.type === 'flying' ? (
        <mesh castShadow>
          <coneGeometry args={[def.scale * 0.6, def.scale, 4]} />
          <meshStandardMaterial color={bodyColor} roughness={0.2} metalness={0.6} />
        </mesh>
      ) : enemy.type === 'swarm' ? (
        <mesh castShadow>
          <tetrahedronGeometry args={[def.scale * 0.8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.2} />
        </mesh>
      ) : (
        <mesh castShadow>
          <sphereGeometry args={[def.scale, 8, 8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.2} />
        </mesh>
      )}

      {/* Shield aura */}
      {enemy.type === 'shield' && (
        <mesh>
          <sphereGeometry args={[def.scale * 1.8, 12, 8]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Healer aura */}
      {enemy.type === 'healer' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -def.scale * 0.4, 0]}>
          <ringGeometry args={[1.5, 2, 16]} />
          <meshBasicMaterial color="#86efac" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Amplify marker */}
      {isAmplified && (
        <mesh>
          <sphereGeometry args={[def.scale * 1.3, 8, 8]} />
          <meshStandardMaterial color="#c084fc" transparent opacity={0.2} wireframe />
        </mesh>
      )}

      {/* HP bar */}
      {hpPercent < 1 && (
        <group position={[0, def.scale + 0.2, 0]}>
          {/* Background */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[0.6, 0.08]} />
            <meshBasicMaterial color="#1f2937" side={THREE.DoubleSide} />
          </mesh>
          {/* Fill */}
          <mesh position={[(hpPercent - 1) * 0.3, 0, 0.001]}>
            <planeGeometry args={[0.6 * hpPercent, 0.06]} />
            <meshBasicMaterial
              color={hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444'}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

function EnemiesGroup({ enemies }: { enemies: Enemy[] }) {
  return (
    <group>
      {enemies.map(enemy => (
        <EnemyMesh key={enemy.id} enemy={enemy} />
      ))}
    </group>
  );
}

// ===== Projectiles =====
function ProjectileMesh({ projectile }: { projectile: Projectile }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const def = TOWER_DEFS[projectile.towerType];

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
    }
  });

  const size = projectile.towerType === 'cannon' ? 0.12 :
               projectile.towerType === 'lightning' ? 0.06 :
               projectile.towerType === 'sniper' ? 0.05 : 0.08;

  return (
    <mesh ref={meshRef} position={[projectile.position.x, projectile.position.y, projectile.position.z]}>
      <sphereGeometry args={[size, 6, 6]} />
      <meshStandardMaterial
        color={def.color}
        emissive={def.color}
        emissiveIntensity={2}
      />
    </mesh>
  );
}

function ProjectilesGroup({ projectiles }: { projectiles: Projectile[] }) {
  return (
    <group>
      {projectiles.map(proj => (
        <ProjectileMesh key={proj.id} projectile={proj} />
      ))}
    </group>
  );
}

// ===== Base & Spawn Markers =====
function BaseMarker({ position }: { position: Vec3 }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={[position.x, 0, position.z]}>
      {/* Glowing base platform */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>
      {/* Floating crystal */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#60a5fa"
          emissiveIntensity={1}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

function SpawnMarker({ position }: { position: Vec3 }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime;
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      ringRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={[position.x, 0.05, position.z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.45, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ===== Tower Placement Preview =====
function PlacementPreview({ x, z, towerType, canPlace }: {
  x: number;
  z: number;
  towerType: TowerType;
  canPlace: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const def = TOWER_DEFS[towerType];

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh ref={meshRef} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.5, 8]} />
        <meshStandardMaterial
          color={canPlace ? def.color : '#ef4444'}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Range ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[def.range - 0.05, def.range, 32]} />
        <meshBasicMaterial
          color={canPlace ? '#22d3ee' : '#ef4444'}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7.5, -0.15, 7.5]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#2d5a27" roughness={1} />
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
function GameScene({ state, onCellClick, onSelectTower, hoveredCell, setHoveredCell }: {
  state: GameState;
  onCellClick: (x: number, z: number) => void;
  onSelectTower: (id: string) => void;
  hoveredCell: { x: number; z: number } | null;
  setHoveredCell: (cell: { x: number; z: number } | null) => void;
}) {
  const planeRef = useRef<THREE.Mesh>(null);
  const { raycaster, camera, pointer } = useThree();

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
      <fog attach="fog" args={['#0f172a', 20, 45]} />
      <Lights />
      <Ground />
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
        selectedTowerId={state.selectedTowerId}
        onSelectTower={onSelectTower}
      />
      <EnemiesGroup enemies={state.enemies} />
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
}

export default function TowerDefenseRenderer3D({ state, onCellClick, onSelectTower }: TowerDefenseRenderer3DProps) {
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
            hoveredCell={hoveredCell}
            setHoveredCell={setHoveredCell}
          />
        </Suspense>
      </Canvas>
    </CanvasErrorBoundary>
  );
}
