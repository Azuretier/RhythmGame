'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Tower, Enemy, GridCell, Vec3 } from '@/types/tower-defense';
import { TOWER_DEFS } from '@/types/tower-defense';
import { createMobMesh, animateMob, disposeMobGroup } from '@/components/rhythmia/tetris/minecraft-mobs';
import type { MobMeshData } from '@/components/rhythmia/tetris/minecraft-mobs';
import {
  TOWER_MOB_MAP, TOWER_MOB_SCALE, TOWER_MOB_SCALE_OVERRIDES,
  CELL_SIZE, TERRAIN_COLORS, TERRAIN_COLORS_ALT,
} from './td-3d-constants';

// ===== Terrain Grid =====
export function TerrainGrid({ grid, onCellClick, hoveredCell, canPlace }: {
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
                       // eslint-disable-next-line react-hooks/purity -- tiny visual jitter for mountain tiles
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
export function PathLine({ waypoints }: { waypoints: Vec3[] }) {
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

// Disable raycasting on all child meshes so AoE rings don't block terrain clicks
const noRaycast = (node: THREE.Group | null) => {
  if (node) node.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).raycast = () => {};
  });
};

// ===== Magma Tower Aura Ring =====
function MagmaAuraRing({ range }: { range: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pulseRef.current) {
      const pulse = 0.85 + Math.sin(t * 3) * 0.15;
      pulseRef.current.scale.set(pulse, pulse, 1);
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.1 + Math.sin(t * 3) * 0.05;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.5;
    }
  });

  return (
    <group ref={noRaycast} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={pulseRef}>
        <circleGeometry args={[range, 32]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[range * 0.5, range * 0.55, 32]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <ringGeometry args={[range - 0.06, range, 32]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ===== Frost Tower Radiating Slow AoE Ring =====
function FrostAoERing({ range }: { range: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pulseRef.current) {
      const pulse = 0.9 + Math.sin(t * 2) * 0.1;
      pulseRef.current.scale.set(pulse, pulse, 1);
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(t * 2) * 0.04;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.3;
    }
  });

  return (
    <group ref={noRaycast} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={pulseRef}>
        <circleGeometry args={[range, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[range * 0.5, range * 0.55, 32]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <ringGeometry args={[range - 0.06, range, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ===== Arcane Tower Aura Glow =====
function ArcaneAuraGlow({ height }: { height: number }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.8;
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2.5) * 0.08;
    }
  });

  return (
    <group ref={noRaycast} position={[0, height * 0.5 + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.2, 0.28, 6]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.15, 6]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function TowerMesh({ tower, isSelected, enemies, onClick }: {
  tower: Tower;
  isSelected: boolean;
  enemies: Enemy[];
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const mobWrapperRef = useRef<THREE.Group>(null);
  const mobRef = useRef<MobMeshData | null>(null);
  const facingAngleRef = useRef<number>(0);
  const def = TOWER_DEFS[tower.type];
  const mobType = TOWER_MOB_MAP[tower.type];
  const isStackable = tower.type === 'cannon' || tower.type === 'frost';
  const mobScale = TOWER_MOB_SCALE_OVERRIDES[tower.type] ?? TOWER_MOB_SCALE;

  const mobData = useMemo(() => {
    const data = isStackable
      ? createMobMesh(mobType, { segments: tower.level })
      : createMobMesh(mobType);
    data.group.scale.setScalar(mobScale);
    return data;
  }, [mobType, isStackable, tower.level, mobScale]);

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

    if (mobWrapperRef.current && tower.targetId) {
      const target = enemies.find(e => e.id === tower.targetId);
      if (target) {
        const dx = target.position.x - tower.gridX;
        const dz = target.position.z - tower.gridZ;
        const targetAngle = Math.atan2(dx, dz) + Math.PI;
        let delta = targetAngle - facingAngleRef.current;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        facingAngleRef.current += delta * 0.2;
        mobWrapperRef.current.rotation.y = facingAngleRef.current;
      }
    }

    if (mobRef.current) {
      const slimeTower = tower.type === 'cannon' || tower.type === 'frost';
      animateMob(mobRef.current, t, !slimeTower);
    }
  });

  const levelScale = 1 + (tower.level - 1) * 0.05;
  const charHeight = mobData.height * mobScale;
  const towerRange = def.rangePerLevel[tower.level - 1] ?? def.range;

  return (
    <group
      ref={groupRef}
      position={[tower.gridX, 0.15, tower.gridZ]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      scale={levelScale}
    >
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.1, 8]} />
        <meshStandardMaterial color={def.color} roughness={0.35} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.31, 0.33, 0.03, 8]} />
        <meshStandardMaterial color={def.accentColor} roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.36, 16]} />
        <meshStandardMaterial
          color={def.accentColor}
          emissive={def.accentColor}
          emissiveIntensity={0.6}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.29, 8]} />
        <meshStandardMaterial
          color={def.accentColor}
          emissive={def.accentColor}
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={mobWrapperRef} position={[0, 0.1, 0]}>
        <primitive object={mobData.group} />
      </group>
      {tower.type === 'cannon' && <MagmaAuraRing range={towerRange} />}
      {tower.type === 'frost' && <FrostAoERing range={towerRange} />}
      {tower.type === 'lightning' && (
        <pointLight position={[0, charHeight * 0.5 + 0.1, 0]} color="#a78bfa" intensity={1.5} distance={2} decay={2} />
      )}
      {tower.type === 'arcane' && <ArcaneAuraGlow height={charHeight} />}
      {tower.type === 'flame' && (
        <pointLight position={[0, charHeight * 0.3 + 0.1, 0]} color="#ef4444" intensity={1.0} distance={1.5} decay={2} />
      )}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[towerRange - 0.05, towerRange, 32]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export function TowersGroup({ towers, enemies, selectedTowerId, onSelectTower }: {
  towers: Tower[];
  enemies: Enemy[];
  selectedTowerId: string | null;
  onSelectTower: (id: string) => void;
}) {
  return (
    <group>
      {towers.map(tower => (
        <TowerMesh
          key={tower.id}
          tower={tower}
          enemies={enemies}
          isSelected={tower.id === selectedTowerId}
          onClick={() => onSelectTower(tower.id)}
        />
      ))}
    </group>
  );
}
