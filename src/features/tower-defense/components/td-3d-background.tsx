'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ===== Voxel Background Generation =====
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function generateBackgroundVoxels(mapW: number, mapH: number) {
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
export function VoxelBackgroundStage({ mapWidth, mapHeight }: { mapWidth: number; mapHeight: number }) {
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

    // Compute correct bounding sphere so frustum culling uses actual
    // spatial extent instead of the unit-box geometry's default sphere.
    mesh.computeBoundingSphere();
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
export function FloatingVoxels({ mapWidth, mapHeight }: { mapWidth: number; mapHeight: number }) {
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
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
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
