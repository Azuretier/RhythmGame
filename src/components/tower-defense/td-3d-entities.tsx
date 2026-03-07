'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Enemy, Projectile, Vec3, TowerType } from '@/types/tower-defense';
import { TOWER_DEFS, ENEMY_DEFS } from '@/types/tower-defense';
import { createMobMesh, animateMob, disposeMobGroup } from '@/components/rhythmia/tetris/minecraft-mobs';
import type { MobMeshData } from '@/components/rhythmia/tetris/minecraft-mobs';
import { createProjectileMesh, animateProjectile, disposeProjectileGroup } from './td-projectiles';
import type { ProjectileMeshData } from './td-projectiles';
import {
  TOWER_MOB_MAP, TOWER_MOB_SCALE, TOWER_MOB_SCALE_OVERRIDES,
  ENEMY_MOB_MAP, ENEMY_MOB_SCALE,
} from './td-3d-constants';

// ===== Pixel Font =====
const PIXEL_FONT = '/fonts/PressStart2P-Regular.ttf';

// Renders a hidden Text element at scene init so troika loads the pixel font
// during the initial Suspense phase, preventing a black-screen flash when the
// first EnemyHpDisplay mounts later.
export function FontPreloader() {
  return (
    <Text font={PIXEL_FONT} fontSize={0.01} position={[0, -100, 0]} visible={false}>
      {' '}
    </Text>
  );
}

// ===== Enemy HP Display =====
function getHpBarColor(hpPercent: number): string {
  if (hpPercent > 0.5) return '#22c55e';
  if (hpPercent > 0.25) return '#eab308';
  return '#ef4444';
}

const HP_BAR_WIDTH = 0.6;
const HP_BAR_HEIGHT = 0.08;
const HP_FILL_HEIGHT = 0.06;
const HP_LABEL_FONT_SIZE = 0.07;

function EnemyHpDisplay({ name, hp, maxHp, yOffset }: {
  name: string;
  hp: number;
  maxHp: number;
  yOffset: number;
}) {
  const hpPercent = hp / maxHp;
  const labelText = `${name} ${Math.ceil(hp)}`;

  return (
    <Billboard position={[0, yOffset, 0]} follow lockX={false} lockY={false} lockZ={false}>
      <Text
        font={PIXEL_FONT}
        position={[-0.02, 0.1, 0.001]}
        fontSize={HP_LABEL_FONT_SIZE}
        anchorX="right"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor="#000000"
      >
        {labelText}
        <meshBasicMaterial color="#ffffff" />
      </Text>
      <Text
        font={PIXEL_FONT}
        position={[0.02, 0.1, 0.001]}
        fontSize={HP_LABEL_FONT_SIZE}
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor="#7f0000"
      >
        ❤
        <meshBasicMaterial color="#ef4444" />
      </Text>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[HP_BAR_WIDTH, HP_BAR_HEIGHT]} />
        <meshBasicMaterial color="#1f2937" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[(hpPercent - 1) * (HP_BAR_WIDTH / 2), 0, 0.001]}>
        <planeGeometry args={[HP_BAR_WIDTH * hpPercent, HP_FILL_HEIGHT]} />
        <meshBasicMaterial color={getHpBarColor(hpPercent)} side={THREE.DoubleSide} />
      </mesh>
    </Billboard>
  );
}

// ===== Enemies (Animal Mob Models) =====
export function EnemyMesh({ enemy, isSelected, onClick }: { enemy: Enemy; isSelected: boolean; onClick: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const mobRef = useRef<MobMeshData | null>(null);
  const def = ENEMY_DEFS[enemy.type];
  const mobType = ENEMY_MOB_MAP[enemy.type];
  const mobScale = ENEMY_MOB_SCALE[enemy.type];

  const isSlow = enemy.effects.some(e => e.type === 'slow');
  const isBurning = enemy.effects.some(e => e.type === 'burn');
  const isAmplified = enemy.effects.some(e => e.type === 'amplify');
  const isStunned = enemy.effects.some(e => e.type === 'stun');

  const prevPosRef = useRef<{ x: number; z: number }>({ x: enemy.position.x, z: enemy.position.z });
  const facingAngleRef = useRef<number>(0);

  const mobData = useMemo(() => {
    const data = createMobMesh(mobType);
    data.group.scale.setScalar(mobScale);
    return data;
  }, [mobType, mobScale]);

  useEffect(() => {
    mobRef.current = mobData;
    return () => {
      disposeMobGroup(mobData);
      mobRef.current = null;
    };
  }, [mobData]);

  const origEmissives = useRef<Map<THREE.Material, { color: number; intensity: number }>>(new Map());

  useEffect(() => {
    if (mobData.isGltf) return;
    const map = new Map<THREE.Material, { color: number; intensity: number }>();
    mobData.group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (!map.has(mat)) {
            map.set(mat, { color: mat.emissive.getHex(), intensity: mat.emissiveIntensity });
          }
        }
      }
    });
    origEmissives.current = map;
  }, [mobData]);

  useEffect(() => {
    if (mobData.isGltf) return;
    let meshIndex = 0;
    mobData.group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (isBurning) {
            if (meshIndex % 3 === 0) {
              mat.emissive.set(0xff4400);
              mat.emissiveIntensity = 0.7;
            } else if (meshIndex % 3 === 1) {
              mat.emissive.set(0xff6600);
              mat.emissiveIntensity = 0.25;
            } else {
              mat.emissive.set(0x331100);
              mat.emissiveIntensity = 0.15;
            }
          } else if (isSlow) {
            mat.emissive.set(0x38bdf8);
            mat.emissiveIntensity = 0.3;
            if (mat instanceof THREE.MeshPhysicalMaterial) {
              mat.clearcoat = Math.max(mat.clearcoat, 0.7);
              mat.clearcoatRoughness = 0.05;
            }
          } else {
            const orig = origEmissives.current.get(mat);
            if (orig) {
              mat.emissive.set(orig.color);
              mat.emissiveIntensity = orig.intensity;
            } else {
              mat.emissive.set(0x000000);
              mat.emissiveIntensity = 0;
            }
          }
        }
        meshIndex++;
      }
    });
  }, [mobData, isBurning, isSlow]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const bobHeight = enemy.flying ? 1.5 + Math.sin(t * 2) * 0.15 : Math.sin(t * 4 + parseFloat(enemy.id.slice(1)) * 0.5) * 0.03;
    groupRef.current.position.set(enemy.position.x, enemy.position.y + bobHeight, enemy.position.z);

    const dx = enemy.position.x - prevPosRef.current.x;
    const dz = enemy.position.z - prevPosRef.current.z;
    const moved = dx * dx + dz * dz;
    if (moved > 0.00001) {
      const targetAngle = Math.atan2(dx, dz) + Math.PI;
      let delta = targetAngle - facingAngleRef.current;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      facingAngleRef.current += delta * 0.25;
    }
    prevPosRef.current = { x: enemy.position.x, z: enemy.position.z };
    groupRef.current.rotation.y = facingAngleRef.current;

    if (mobRef.current) {
      const isMoving = !isStunned;
      animateMob(mobRef.current, t, isMoving);
    }
  });

  const charHeight = mobData.height * mobScale;

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <primitive object={mobData.group} />
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[mobScale * 1.1, mobScale * 1.3, 24]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      {enemy.type === 'shield' && (
        <mesh position={[0, charHeight * 0.5, 0]}>
          <sphereGeometry args={[mobScale * 2.5, 12, 8]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}
      {enemy.type === 'healer' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.5, 2, 16]} />
          <meshBasicMaterial color="#86efac" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}
      {isAmplified && (
        <group position={[0, charHeight * 0.5, 0]}>
          <mesh>
            <sphereGeometry args={[mobScale * 2, 8, 8]} />
            <meshStandardMaterial color="#c084fc" emissive="#9333ea" emissiveIntensity={0.6} transparent opacity={0.25} wireframe />
          </mesh>
          <mesh rotation={[0.5, 0.8, 0]}>
            <sphereGeometry args={[mobScale * 1.6, 6, 6]} />
            <meshStandardMaterial color="#a855f7" emissive="#7c3aed" emissiveIntensity={0.8} transparent opacity={0.2} wireframe />
          </mesh>
        </group>
      )}
      {isStunned && (
        <mesh position={[0, charHeight + 0.15, 0]}>
          <octahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
        </mesh>
      )}
      <EnemyHpDisplay name={def.name} hp={enemy.hp} maxHp={enemy.maxHp} yOffset={charHeight + 0.1} />
    </group>
  );
}

export function EnemiesGroup({ enemies, selectedEnemyId, onSelectEnemy }: {
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

export function ProjectilesGroup({ projectiles }: { projectiles: Projectile[] }) {
  return (
    <group>
      {projectiles.map(proj => (
        <ProjectileMesh key={proj.id} projectile={proj} />
      ))}
    </group>
  );
}

// ===== Base & Spawn Markers =====
export function BaseMarker({ position }: { position: Vec3 }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={1} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export function SpawnMarker({ position }: { position: Vec3 }) {
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
export function PlacementPreview({ x, z, towerType, canPlace }: {
  x: number;
  z: number;
  towerType: TowerType;
  canPlace: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const mobType = TOWER_MOB_MAP[towerType];
  const def = TOWER_DEFS[towerType];
  const previewScale = TOWER_MOB_SCALE_OVERRIDES[towerType] ?? TOWER_MOB_SCALE;
  const canPlaceRef = useRef(canPlace);
  canPlaceRef.current = canPlace;

  const { mobData, clonedMats } = useMemo(() => {
    const data = createMobMesh(mobType);
    data.group.scale.setScalar(previewScale);
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
  }, [mobType, previewScale]);

  useEffect(() => {
    for (const item of clonedMats) {
      if (!canPlace) {
        item.mat.color.set('#ef4444');
        item.mat.emissive.set('#ef4444');
        // eslint-disable-next-line react-hooks/immutability
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
    // eslint-disable-next-line react-hooks/immutability
    mobData.group.rotation.y = state.clock.elapsedTime * 2;
  });

  useEffect(() => {
    return () => {
      for (const item of clonedMats) {
        item.mat.dispose();
      }
      disposeMobGroup(mobData);
    };
  }, [mobData, clonedMats]);

  return (
    <group ref={groupRef} position={[x, 0.15, z]}>
      <group position={[0, 0.1, 0]}>
        <primitive object={mobData.group} />
      </group>
      <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[def.range - 0.05, def.range, 32]} />
        <meshBasicMaterial color={canPlace ? '#22d3ee' : '#ef4444'} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
