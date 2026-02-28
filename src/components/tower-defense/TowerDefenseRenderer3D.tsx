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
import { createMobMesh, animateMob, disposeMobGroup, disposeSharedMobResources } from '@/components/rhythmia/tetris/minecraft-mobs';
import type { MobMeshData } from '@/components/rhythmia/tetris/minecraft-mobs';
import type { TDEnemyType } from '@/components/rhythmia/tetris/types';
import { createProjectileMesh, animateProjectile, disposeProjectileGroup, disposeSharedProjectileResources } from './td-projectiles';
import type { ProjectileMeshData } from './td-projectiles';

// ===== Tower-to-Minecraft-Mob mapping =====
const TOWER_MOB_MAP: Record<TowerType, TDEnemyType> = {
  archer: 'skeleton',
  cannon: 'creeper',
  frost: 'spider',
  lightning: 'enderman',
  sniper: 'skeleton',
  flame: 'zombie',
  arcane: 'enderman',
};

const TOWER_MOB_SCALE = 0.4;

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

// ===== Voxel Background Generation =====
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateBackgroundVoxels(mapW: number, mapH: number) {
  const blocks: { x: number; y: number; z: number; r: number; g: number; b: number }[] = [];
  const rand = seededRandom(42);

  const isBoard = (x: number, z: number) => x >= 0 && x < mapW && z >= 0 && z < mapH;
  const chebyDist = (x: number, z: number) => {
    const dx = x < 0 ? -x : x >= mapW ? x - mapW + 1 : 0;
    const dz = z < 0 ? -z : z >= mapH ? z - mapH + 1 : 0;
    return Math.max(dx, dz);
  };
  const getGroundY = (x: number, z: number) => {
    const d = chebyDist(x, z);
    if (d <= 1) return 0;
    if (d <= 3) return -1;
    return -2 - Math.floor((d - 3) * 0.7);
  };

  const EXT = 10;
  const minC = -EXT;
  const maxC = Math.max(mapW, mapH) - 1 + EXT;

  const add = (x: number, y: number, z: number, r: number, g: number, b: number, noise = 0.04) => {
    blocks.push({
      x, y, z,
      r: Math.max(0, Math.min(1, r + (rand() - 0.5) * noise * 2)),
      g: Math.max(0, Math.min(1, g + (rand() - 0.5) * noise * 2)),
      b: Math.max(0, Math.min(1, b + (rand() - 0.5) * noise * 2)),
    });
  };

  // 1. Cliff faces + surface around the board (dist 1-3)
  for (let x = -3; x < mapW + 3; x++) {
    for (let z = -3; z < mapH + 3; z++) {
      if (isBoard(x, z)) continue;
      const dist = chebyDist(x, z);
      if (dist > 3) continue;

      const surfY = getGroundY(x, z);
      const bottomY = surfY - Math.floor(2 + dist * 1.3 + rand());

      // Surface grass block
      add(x, surfY, z, 0.15, 0.33, 0.10, 0.06);

      // Cliff face below
      for (let y = bottomY; y < surfY; y++) {
        const df = (y - bottomY) / Math.max(surfY - bottomY, 1);
        if (y >= surfY - 1 && rand() > 0.65) {
          add(x, y, z, 0.18, 0.36, 0.13, 0.06);
        } else {
          const shade = 0.28 + df * 0.12;
          add(x, y, z, shade + 0.05, shade, shade - 0.03, 0.05);
        }
      }
    }
  }

  // 2. Extended ground (dist 4-EXT)
  for (let x = minC; x <= maxC; x++) {
    for (let z = minC; z <= maxC; z++) {
      if (isBoard(x, z)) continue;
      const dist = chebyDist(x, z);
      if (dist < 4 || dist > EXT) continue;
      const gy = getGroundY(x, z);
      if (rand() > 0.88) {
        add(x, gy, z, 0.28, 0.20, 0.10, 0.04);
      } else {
        const g = 0.10 + rand() * 0.12;
        add(x, gy, z, g * 0.55, g + 0.18, g * 0.35, 0.05);
      }
    }
  }

  // 3. Mountains
  const mountains = [
    { cx: -7, cz: -7, h: 10, r: 4 },
    { cx: -6, cz: 8, h: 12, r: 5 },
    { cx: -5, cz: 21, h: 8, r: 3 },
    { cx: 8, cz: -8, h: 11, r: 4 },
    { cx: 22, cz: -6, h: 13, r: 5 },
    { cx: 23, cz: 9, h: 9, r: 4 },
    { cx: 22, cz: 22, h: 10, r: 4 },
    { cx: 8, cz: 24, h: 8, r: 3 },
    { cx: -8, cz: 14, h: 9, r: 4 },
    { cx: 14, cz: -7, h: 7, r: 3 },
    { cx: -4, cz: -3, h: 5, r: 2 },
    { cx: 20, cz: 19, h: 6, r: 3 },
  ];

  for (const mt of mountains) {
    for (let dx = -mt.r; dx <= mt.r; dx++) {
      for (let dz = -mt.r; dz <= mt.r; dz++) {
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > mt.r + 0.5) continue;
        const x = mt.cx + dx;
        const z = mt.cz + dz;
        if (x < minC || x > maxC || z < minC || z > maxC) continue;
        if (isBoard(x, z)) continue;

        const baseY = getGroundY(x, z);
        const peak = Math.floor(mt.h * Math.max(0, 1 - d / mt.r) * (0.6 + rand() * 0.4));

        for (let y = baseY; y <= baseY + peak; y++) {
          const rh = peak > 0 ? (y - baseY) / peak : 0;
          if (rh > 0.75 && peak > 4) {
            add(x, y, z, 0.88, 0.91, 0.96, 0.04);
          } else if (rh > 0.45) {
            const s = 0.38 + rand() * 0.12;
            add(x, y, z, s, s * 0.95, s * 0.88, 0.05);
          } else {
            const s = 0.30 + rand() * 0.1;
            add(x, y, z, s * 0.8, s * 0.95, s * 0.7, 0.05);
          }
        }
      }
    }
  }

  // 4. Trees
  const treeSpots: { x: number; z: number }[] = [];
  for (let i = 0; i < 55; i++) {
    const tx = Math.floor(minC + rand() * (maxC - minC + 1));
    const tz = Math.floor(minC + rand() * (maxC - minC + 1));
    if (isBoard(tx, tz)) continue;
    if (chebyDist(tx, tz) < 3) continue;
    const nearMt = mountains.some(m => Math.sqrt((tx - m.cx) ** 2 + (tz - m.cz) ** 2) < m.r + 1);
    if (nearMt) continue;
    treeSpots.push({ x: tx, z: tz });
  }

  for (const t of treeSpots) {
    const gy = getGroundY(t.x, t.z) + 1;
    const trunkH = 2 + Math.floor(rand() * 3);
    for (let y = gy; y < gy + trunkH; y++) {
      add(t.x, y, t.z, 0.30, 0.18, 0.08, 0.04);
    }
    const canopyBase = gy + trunkH;
    const shape = rand();
    if (shape < 0.4) {
      const cr = 1 + Math.floor(rand() * 2);
      for (let dx = -cr; dx <= cr; dx++) {
        for (let dz = -cr; dz <= cr; dz++) {
          for (let dy = 0; dy <= cr; dy++) {
            if (dx * dx + dz * dz + dy * dy > (cr + 0.5) ** 2) continue;
            if (isBoard(t.x + dx, t.z + dz)) continue;
            add(t.x + dx, canopyBase + dy, t.z + dz, 0.08, 0.38 + rand() * 0.18, 0.06, 0.06);
          }
        }
      }
    } else if (shape < 0.7) {
      for (let ly = 0; ly < 4; ly++) {
        const lr = Math.max(0, 2 - ly);
        for (let dx = -lr; dx <= lr; dx++) {
          for (let dz = -lr; dz <= lr; dz++) {
            if (Math.abs(dx) + Math.abs(dz) > lr + 1) continue;
            if (isBoard(t.x + dx, t.z + dz)) continue;
            add(t.x + dx, canopyBase + ly, t.z + dz, 0.04, 0.28 + rand() * 0.12, 0.04, 0.05);
          }
        }
      }
    } else {
      const cr = 2;
      for (let dx = -cr; dx <= cr; dx++) {
        for (let dz = -cr; dz <= cr; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > cr + 1) continue;
          if (isBoard(t.x + dx, t.z + dz)) continue;
          add(t.x + dx, canopyBase, t.z + dz, 0.12, 0.42 + rand() * 0.12, 0.08, 0.05);
          if (rand() > 0.55) {
            add(t.x + dx, canopyBase + 1, t.z + dz, 0.10, 0.38 + rand() * 0.10, 0.06, 0.05);
          }
        }
      }
    }
  }

  // 5. Crystal formations
  const crystals = [
    { cx: -3, cz: 5, h: 4 },
    { cx: 18, cz: -3, h: 3 },
    { cx: -2, cz: 17, h: 3 },
    { cx: 19, cz: 18, h: 4 },
    { cx: -5, cz: -2, h: 3 },
    { cx: 20, cz: 5, h: 3 },
  ];

  for (const cr of crystals) {
    const baseY = getGroundY(cr.cx, cr.cz) + 1;
    for (let y = baseY; y < baseY + cr.h; y++) {
      add(cr.cx, y, cr.cz, 0.10, 0.70 + rand() * 0.20, 0.85 + rand() * 0.15, 0.08);
    }
    if (rand() > 0.3) add(cr.cx + 1, baseY, cr.cz, 0.08, 0.65, 0.80, 0.06);
    if (rand() > 0.3) add(cr.cx, baseY, cr.cz + 1, 0.08, 0.65, 0.80, 0.06);
    if (rand() > 0.5) add(cr.cx - 1, baseY, cr.cz, 0.12, 0.60, 0.75, 0.06);
  }

  // 6. Ruins
  const ruins = [
    { cx: -6, cz: 3 },
    { cx: 21, cz: 13 },
    { cx: 10, cz: -5 },
    { cx: -2, cz: 22 },
  ];

  for (const ruin of ruins) {
    const baseY = getGroundY(ruin.cx, ruin.cz) + 1;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        const rx = ruin.cx + dx;
        const rz = ruin.cz + dz;
        if (isBoard(rx, rz)) continue;
        const isCorner = Math.abs(dx) + Math.abs(dz) === 2;
        const h = isCorner ? 3 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 2);
        for (let y = baseY; y < baseY + h; y++) {
          const s = 0.35 + rand() * 0.12;
          add(rx, y, rz, s, s * 0.95, s * 0.88, 0.05);
        }
      }
    }
  }

  // Pack into typed arrays
  const count = blocks.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = blocks[i].x;
    positions[i * 3 + 1] = blocks[i].y;
    positions[i * 3 + 2] = blocks[i].z;
    colors[i * 3] = blocks[i].r;
    colors[i * 3 + 1] = blocks[i].g;
    colors[i * 3 + 2] = blocks[i].b;
  }
  return { positions, colors, count };
}

// ===== Voxel Background Stage Component =====
function VoxelBackgroundStage({ mapWidth, mapHeight }: { mapWidth: number; mapHeight: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const voxelData = useMemo(() => generateBackgroundVoxels(mapWidth, mapHeight), [mapWidth, mapHeight]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < voxelData.count; i++) {
      dummy.position.set(
        voxelData.positions[i * 3],
        voxelData.positions[i * 3 + 1],
        voxelData.positions[i * 3 + 2]
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color.setRGB(
        voxelData.colors[i * 3],
        voxelData.colors[i * 3 + 1],
        voxelData.colors[i * 3 + 2]
      );
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [voxelData]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, voxelData.count]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.75} metalness={0.05} flatShading />
    </instancedMesh>
  );
}

// ===== Floating Ambient Voxel Particles =====
function FloatingVoxels({ mapWidth, mapHeight }: { mapWidth: number; mapHeight: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 30;

  const particles = useMemo(() => {
    const rand = seededRandom(99);
    return Array.from({ length: COUNT }, () => ({
      x: (rand() - 0.5) * 36 + mapWidth / 2,
      y: 2 + rand() * 8,
      z: (rand() - 0.5) * 36 + mapHeight / 2,
      speed: 0.15 + rand() * 0.25,
      phase: rand() * Math.PI * 2,
      amp: 0.5 + rand() * 1.5,
      scale: 0.06 + rand() * 0.10,
    }));
  }, [mapWidth, mapHeight]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * p.amp,
        p.y + Math.sin(t * p.speed * 0.7 + p.phase * 2) * p.amp * 0.5,
        p.z + Math.cos(t * p.speed + p.phase) * p.amp
      );
      const s = p.scale * (0.85 + Math.sin(t * 2 + p.phase) * 0.15);
      dummy.scale.setScalar(s);
      dummy.rotation.set(t * p.speed, t * p.speed * 0.5, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#4aeadc"
        emissive="#4aeadc"
        emissiveIntensity={2}
        transparent
        opacity={0.6}
      />
    </instancedMesh>
  );
}

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
            <boxGeometry args={[CELL_SIZE, height, CELL_SIZE]} />
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

// ===== Towers (Minecraft Character Models) =====
function TowerMesh({ tower, isSelected, onClick }: {
  tower: Tower;
  isSelected: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const mobRef = useRef<MobMeshData | null>(null);
  const def = TOWER_DEFS[tower.type];
  const mobType = TOWER_MOB_MAP[tower.type];

  const mobData = useMemo(() => {
    const data = createMobMesh(mobType);
    data.group.scale.setScalar(TOWER_MOB_SCALE);
    return data;
  }, [mobType]);

  useEffect(() => {
    mobRef.current = mobData;
    return () => {
      disposeMobGroup(mobData);
      mobRef.current = null;
    };
  }, [mobData]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    if (isSelected) {
      groupRef.current.position.y = 0.15 + Math.sin(t * 3) * 0.05;
    } else {
      groupRef.current.position.y = 0.15;
    }
    // Idle animation
    if (mobRef.current) {
      animateMob(mobRef.current, t, true);
    }
  });

  const levelScale = 1 + (tower.level - 1) * 0.1;
  const charHeight = mobData.height * TOWER_MOB_SCALE;

  return (
    <group
      ref={groupRef}
      position={[tower.gridX, 0.15, tower.gridZ]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      scale={levelScale}
    >
      {/* Colored platform base */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.1, 8]} />
        <meshStandardMaterial color={def.color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Accent ring on platform */}
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.35, 8]} />
        <meshStandardMaterial color={def.accentColor} emissive={def.accentColor} emissiveIntensity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Minecraft character model */}
      <group position={[0, 0.1, 0]}>
        <primitive object={mobData.group} />
      </group>
      {/* Level indicators */}
      {Array.from({ length: tower.level }).map((_, i) => (
        <mesh key={i} position={[(i - (tower.level - 1) / 2) * 0.12, charHeight + 0.2, 0]}>
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
function EnemyMesh({ enemy, isSelected, onClick }: { enemy: Enemy; isSelected: boolean; onClick: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const def = ENEMY_DEFS[enemy.type];
  const hpPercent = enemy.hp / enemy.maxHp;

  const isSlow = enemy.effects.some(e => e.type === 'slow');
  const isBurning = enemy.effects.some(e => e.type === 'burn');
  const isAmplified = enemy.effects.some(e => e.type === 'amplify');
  const isStunned = enemy.effects.some(e => e.type === 'stun');

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
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Body */}
      {enemy.type === 'boss' ? (
        <mesh castShadow>
          <dodecahedronGeometry args={[def.scale, 1]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={0.3}
            metalness={0.4}
            emissive={bodyColor}
            emissiveIntensity={isSelected ? 0.6 : 0.2}
          />
        </mesh>
      ) : enemy.type === 'tank' || enemy.type === 'shield' ? (
        <mesh castShadow>
          <boxGeometry args={[def.scale * 1.2, def.scale, def.scale * 1.2]} />
          <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.3} emissive={isSelected ? bodyColor : '#000000'} emissiveIntensity={isSelected ? 0.4 : 0} />
        </mesh>
      ) : enemy.type === 'flying' ? (
        <mesh castShadow>
          <coneGeometry args={[def.scale * 0.6, def.scale, 4]} />
          <meshStandardMaterial color={bodyColor} roughness={0.2} metalness={0.6} emissive={isSelected ? bodyColor : '#000000'} emissiveIntensity={isSelected ? 0.4 : 0} />
        </mesh>
      ) : enemy.type === 'swarm' ? (
        <mesh castShadow>
          <tetrahedronGeometry args={[def.scale * 0.8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.2} emissive={isSelected ? bodyColor : '#000000'} emissiveIntensity={isSelected ? 0.4 : 0} />
        </mesh>
      ) : (
        <mesh castShadow>
          <sphereGeometry args={[def.scale, 8, 8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.2} emissive={isSelected ? bodyColor : '#000000'} emissiveIntensity={isSelected ? 0.4 : 0} />
        </mesh>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -def.scale * 0.4, 0]}>
          <ringGeometry args={[def.scale * 1.1, def.scale * 1.3, 24]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} />
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

      {/* Stun marker — spinning stars */}
      {isStunned && (
        <mesh position={[0, def.scale + 0.35, 0]}>
          <octahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
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

function EnemiesGroup({ enemies, selectedEnemyId, onSelectEnemy }: {
  enemies: Enemy[];
  selectedEnemyId: string | null;
  onSelectEnemy: (id: string) => void;
}) {
  return (
    <group>
      {enemies.map(enemy => (
        <EnemyMesh
          key={enemy.id}
          enemy={enemy}
          isSelected={enemy.id === selectedEnemyId}
          onClick={() => onSelectEnemy(enemy.id)}
        />
      ))}
    </group>
  );
}

// ===== Projectiles (Minecraft-themed) =====
function ProjectileMesh({ projectile }: { projectile: Projectile }) {
  const groupRef = useRef<THREE.Group>(null);
  const projRef = useRef<ProjectileMeshData | null>(null);
  const prevPos = useRef(new THREE.Vector3(projectile.position.x, projectile.position.y, projectile.position.z));
  const velocity = useRef(new THREE.Vector3());

  const projData = useMemo(() => {
    const data = createProjectileMesh(projectile.towerType);
    return data;
  }, [projectile.towerType]);

  useEffect(() => {
    projRef.current = projData;
    return () => {
      disposeProjectileGroup(projData);
      projRef.current = null;
    };
  }, [projData]);

  useFrame((state) => {
    if (!groupRef.current || !projRef.current) return;
    const { x, y, z } = projectile.position;
    groupRef.current.position.set(x, y, z);

    // Compute velocity direction for arrow orientation
    velocity.current.set(x - prevPos.current.x, y - prevPos.current.y, z - prevPos.current.z);
    if (velocity.current.lengthSq() > 0.0001) {
      velocity.current.normalize();
    }
    prevPos.current.set(x, y, z);

    animateProjectile(projRef.current, state.clock.elapsedTime, velocity.current);
  });

  return (
    <group ref={groupRef} position={[projectile.position.x, projectile.position.y, projectile.position.z]}>
      <primitive object={projData.group} />
    </group>
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

// ===== Tower Placement Preview (Minecraft Character Ghost) =====
function PlacementPreview({ x, z, towerType, canPlace }: {
  x: number;
  z: number;
  towerType: TowerType;
  canPlace: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const mobType = TOWER_MOB_MAP[towerType];
  const def = TOWER_DEFS[towerType];
  const canPlaceRef = useRef(canPlace);
  canPlaceRef.current = canPlace;

  const { mobData, clonedMats } = useMemo(() => {
    const data = createMobMesh(mobType);
    data.group.scale.setScalar(TOWER_MOB_SCALE);
    // Clone materials with transparency for ghost preview
    const mats: { mat: THREE.MeshStandardMaterial; origColor: THREE.Color; origEmissive: THREE.Color; origEmissiveI: number }[] = [];
    data.group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.material) {
        const orig = child.material as THREE.MeshStandardMaterial;
        const cloned = orig.clone();
        cloned.transparent = true;
        cloned.opacity = 0.5;
        child.material = cloned;
        mats.push({
          mat: cloned,
          origColor: cloned.color.clone(),
          origEmissive: cloned.emissive.clone(),
          origEmissiveI: cloned.emissiveIntensity,
        });
      }
    });
    return { mobData: data, clonedMats: mats };
  }, [mobType]);

  // Update tint based on canPlace
  useEffect(() => {
    for (const item of clonedMats) {
      if (!canPlace) {
        item.mat.color.set('#ef4444');
        item.mat.emissive.set('#ef4444');
        item.mat.emissiveIntensity = 0.5;
      } else {
        item.mat.color.copy(item.origColor);
        item.mat.emissive.copy(item.origEmissive);
        item.mat.emissiveIntensity = item.origEmissiveI;
      }
    }
  }, [canPlace, clonedMats]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = 0.15 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
    }
    // Slowly rotate the preview character
    mobData.group.rotation.y = state.clock.elapsedTime * 2;
  });

  useEffect(() => {
    return () => {
      // Dispose cloned materials
      for (const item of clonedMats) {
        item.mat.dispose();
      }
      disposeMobGroup(mobData);
    };
  }, [mobData, clonedMats]);

  return (
    <group ref={groupRef} position={[x, 0.15, z]}>
      {/* Ghost character */}
      <group position={[0, 0.1, 0]}>
        <primitive object={mobData.group} />
      </group>
      {/* Range ring */}
      <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
