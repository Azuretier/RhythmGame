'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Simple seeded random for deterministic terrain
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// 2D noise for terrain generation
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

function terrainHeight(x: number, z: number, seed: number): number {
  let height = 0;
  height += smoothNoise(x * 0.05, z * 0.05, seed) * 8;
  height += smoothNoise(x * 0.1, z * 0.1, seed + 1000) * 4;
  height += smoothNoise(x * 0.2, z * 0.2, seed + 2000) * 2;
  return Math.floor(height);
}

// Block color based on height
function blockColor(y: number, maxY: number): THREE.Color {
  const ratio = y / Math.max(maxY, 1);
  if (ratio > 0.8) return new THREE.Color(0.95, 0.95, 0.95);
  if (ratio > 0.6) return new THREE.Color(0.45, 0.45, 0.45);
  if (ratio > 0.3) return new THREE.Color(0.25, 0.55, 0.2);
  if (ratio > 0.1) return new THREE.Color(0.4, 0.28, 0.15);
  return new THREE.Color(0.3, 0.3, 0.35);
}

interface VoxelData {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}

function generateVoxelWorld(seed: number, size: number): VoxelData {
  const blocks: { x: number; y: number; z: number; color: THREE.Color }[] = [];
  let maxY = 0;

  const heights: number[][] = [];
  for (let x = -size; x <= size; x++) {
    heights[x + size] = [];
    for (let z = -size; z <= size; z++) {
      const h = terrainHeight(x, z, seed);
      heights[x + size][z + size] = h;
      if (h > maxY) maxY = h;
    }
  }

  for (let x = -size; x <= size; x++) {
    for (let z = -size; z <= size; z++) {
      const h = heights[x + size][z + size];
      for (let y = Math.max(0, h - 2); y <= h; y++) {
        const color = blockColor(y, maxY);
        blocks.push({ x, y, z, color });
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

function createGridLines(): THREE.LineSegments {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const gridSize = 30;
  for (let i = -gridSize; i <= gridSize; i += 2) {
    positions.push(-gridSize, -2, i, gridSize, -2, i);
    positions.push(i, -2, -gridSize, i, -2, gridSize);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.04, transparent: true });
  return new THREE.LineSegments(geo, mat);
}

export default function VoxelWorldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scene setup
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 30, 80);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(35, 25, 35);
    camera.lookAt(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 10);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.3);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    // Voxel terrain
    const voxelData = generateVoxelWorld(42, 20);
    const boxGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const boxMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, flatShading: true });
    const instancedMesh = new THREE.InstancedMesh(boxGeo, boxMat, voxelData.count);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < voxelData.count; i++) {
      dummy.position.set(
        voxelData.positions[i * 3],
        voxelData.positions[i * 3 + 1],
        voxelData.positions[i * 3 + 2]
      );
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
      color.setRGB(
        voxelData.colors[i * 3],
        voxelData.colors[i * 3 + 1],
        voxelData.colors[i * 3 + 2]
      );
      instancedMesh.setColorAt(i, color);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    scene.add(instancedMesh);

    // Grid lines
    const gridLines = createGridLines();
    scene.add(gridLines);

    // Handle resize
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Animation loop
    let animId: number;
    let lastTime = 0;
    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (delta < 0.1) {
        instancedMesh.rotation.y += delta * 0.03;
        gridLines.rotation.y += delta * 0.02;
      }

      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    // Cleanup
    cleanupRef.current = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSize);
      renderer.dispose();
      boxGeo.dispose();
      boxMat.dispose();
      instancedMesh.dispose();
      gridLines.geometry.dispose();
      (gridLines.material as THREE.Material).dispose();
    };

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.35,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
