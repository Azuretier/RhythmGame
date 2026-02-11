'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import type { Enemy, Bullet, GameMode } from './tetris/types';
import { BULLET_GRAVITY, BULLET_GROUND_Y } from './tetris/constants';

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

// Hilly terrain for vanilla mode — generates height up to 20 blocks for 16x20x16 terrain
function terrainHeightVanilla(x: number, z: number, seed: number): number {
  const s1 = smoothNoise(x * 0.08, z * 0.08, seed);
  const s2 = smoothNoise(x * 0.15, z * 0.15, seed + 100);
  const s3 = smoothNoise(x * 0.3, z * 0.3, seed + 200);
  const h = s1 * 12 + s2 * 5 + s3 * 2;
  return Math.max(1, Math.min(20, Math.floor(h + 2)));
}

// Flat terrain for TD mode
function terrainHeightTD(_x: number, _z: number, _seed: number): number {
  return 1;
}

// World-specific block color palettes for vanilla mode
// Each world has layers: top (surface), mid (subsurface), deep (bedrock)
// Colors are derived from the world theme colors in WORLDS constant
type WorldBlockPalette = {
  top: THREE.Color;
  mid: THREE.Color;
  deep: THREE.Color;
  accent: THREE.Color;
};

function getWorldPalette(worldIdx: number): WorldBlockPalette {
  switch (worldIdx) {
    case 0: // Melodia (pink/rose)
      return {
        top: new THREE.Color(0.85, 0.42, 0.55),    // rose surface
        mid: new THREE.Color(0.65, 0.30, 0.42),     // dark rose
        deep: new THREE.Color(0.45, 0.22, 0.32),    // deep mauve
        accent: new THREE.Color(1.0, 0.71, 0.76),   // light pink
      };
    case 1: // Harmonia (teal/ocean)
      return {
        top: new THREE.Color(0.20, 0.65, 0.55),     // sea green
        mid: new THREE.Color(0.15, 0.50, 0.48),     // deep teal
        deep: new THREE.Color(0.10, 0.33, 0.36),    // ocean floor
        accent: new THREE.Color(0.30, 0.80, 0.77),  // aqua
      };
    case 2: // Crescenda (gold/sun)
      return {
        top: new THREE.Color(0.85, 0.75, 0.28),     // golden surface
        mid: new THREE.Color(0.70, 0.58, 0.18),     // amber
        deep: new THREE.Color(0.50, 0.40, 0.12),    // dark gold
        accent: new THREE.Color(1.0, 0.90, 0.43),   // bright gold
      };
    case 3: // Fortissimo (red/fire)
      return {
        top: new THREE.Color(0.80, 0.30, 0.25),     // lava surface
        mid: new THREE.Color(0.60, 0.18, 0.15),     // deep red
        deep: new THREE.Color(0.35, 0.10, 0.08),    // obsidian
        accent: new THREE.Color(1.0, 0.50, 0.30),   // fire orange
      };
    case 4: // Seijaku (purple/ethereal)
      return {
        top: new THREE.Color(0.55, 0.50, 0.85),     // amethyst surface
        mid: new THREE.Color(0.40, 0.35, 0.70),     // deep purple
        deep: new THREE.Color(0.25, 0.20, 0.50),    // dark violet
        accent: new THREE.Color(0.75, 0.70, 0.95),  // light lavender
      };
    default: // Fallback earth tones
      return {
        top: new THREE.Color(0.35, 0.55, 0.25),
        mid: new THREE.Color(0.45, 0.35, 0.25),
        deep: new THREE.Color(0.4, 0.4, 0.4),
        accent: new THREE.Color(0.50, 0.65, 0.35),
      };
  }
}

// Block color for vanilla mode — world-themed layers by height
function blockColorVanilla(y: number, maxY: number, worldIdx: number = 0): THREE.Color {
  const palette = getWorldPalette(worldIdx);
  const t = maxY > 1 ? y / maxY : 0.5;
  if (y === maxY - 1) {
    // Topmost block gets accent highlight
    return palette.accent.clone().lerp(palette.top, 0.4);
  }
  if (t > 0.6) return palette.top;
  if (t > 0.25) return palette.mid;
  return palette.deep;
}

// Block color for TD mode — checkerboard board-game pattern
function blockColorTD(_y: number, _maxY: number, x?: number, z?: number): THREE.Color {
  if (x !== undefined && z !== undefined) {
    const isLight = ((Math.abs(x) + Math.abs(z)) % 2) === 0;
    if (isLight) {
      return new THREE.Color(0.30, 0.50, 0.25);
    } else {
      return new THREE.Color(0.38, 0.60, 0.32);
    }
  }
  return new THREE.Color(0.34, 0.55, 0.28);
}

// Procedural detail texture
function createBlockDetailTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const rng = seededRandom(54321);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let val = 0.78;
      val += (smoothNoise(x * 0.06, y * 0.06, 7000) - 0.5) * 0.18;
      val += (smoothNoise(x * 0.14, y * 0.14, 7100) - 0.5) * 0.10;
      val += (smoothNoise(x * 0.3, y * 0.3, 7200) - 0.5) * 0.06;
      val += (rng() - 0.5) * 0.08;

      const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y);
      const edgeWidth = 5;
      if (edgeDist < edgeWidth) {
        const t = edgeDist / edgeWidth;
        val *= 0.45 + 0.55 * (t * t);
      }
      if (y < 3) val += 0.12 * (1 - y / 3);
      if (x < 2) val += 0.06 * (1 - x / 2);
      if (y > size - 3) val -= 0.08 * (1 - (size - 1 - y) / 2);
      if (x > size - 3) val -= 0.05 * (1 - (size - 1 - x) / 2);

      val = Math.max(0, Math.min(1, val));
      const byte = Math.round(val * 255);
      imgData.data[idx] = byte;
      imgData.data[idx + 1] = byte;
      imgData.data[idx + 2] = byte;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.globalCompositeOperation = 'multiply';
  const cRng = seededRandom(99999);
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(${160 + Math.floor(cRng() * 40)}, ${160 + Math.floor(cRng() * 40)}, ${160 + Math.floor(cRng() * 40)}, 1)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    let cx = cRng() * size;
    let cy = cRng() * size;
    ctx.moveTo(cx, cy);
    const segments = 2 + Math.floor(cRng() * 3);
    for (let j = 0; j < segments; j++) {
      cx += (cRng() - 0.5) * 28;
      cy += (cRng() - 0.5) * 28;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural bump map
function createBlockBumpMap(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const rng = seededRandom(11111);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let h = 0.5;
      h += (smoothNoise(x * 0.08, y * 0.08, 8000) - 0.5) * 0.3;
      h += (smoothNoise(x * 0.2, y * 0.2, 8100) - 0.5) * 0.18;
      h += (smoothNoise(x * 0.5, y * 0.5, 8200) - 0.5) * 0.08;
      h += (rng() - 0.5) * 0.06;
      const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (edgeDist < 4) h *= edgeDist / 4;
      h = Math.max(0, Math.min(1, h));
      const byte = Math.round(h * 255);
      imgData.data[idx] = byte;
      imgData.data[idx + 1] = byte;
      imgData.data[idx + 2] = byte;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// Procedural roughness map
function createBlockRoughnessMap(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const rng = seededRandom(22222);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let r = 0.7;
      r += (smoothNoise(x * 0.1, y * 0.1, 9000) - 0.5) * 0.2;
      r += (rng() - 0.5) * 0.1;
      const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (edgeDist < 3) r -= 0.15 * (1 - edgeDist / 3);
      r = Math.max(0, Math.min(1, r));
      const byte = Math.round(r * 255);
      imgData.data[idx] = byte;
      imgData.data[idx + 1] = byte;
      imgData.data[idx + 2] = byte;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

interface VoxelData {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}

// Vanilla terrain dimensions
const VANILLA_SIZE_X = 16;
const VANILLA_SIZE_Y = 20; // max height (noise-driven)
const VANILLA_SIZE_Z = 16;

function generateVoxelWorld(seed: number, size: number, mode: GameMode = 'td', worldIdx: number = 0): VoxelData {
  const blocks: { x: number; y: number; z: number; color: THREE.Color }[] = [];

  const heightFn = mode === 'vanilla' ? terrainHeightVanilla : terrainHeightTD;

  if (mode === 'vanilla') {
    // Rectangular 16x20x16 terrain
    const halfX = Math.floor(VANILLA_SIZE_X / 2);
    const halfZ = Math.floor(VANILLA_SIZE_Z / 2);
    for (let x = -halfX; x < halfX; x++) {
      for (let z = -halfZ; z < halfZ; z++) {
        const maxY = heightFn(x, z, seed);
        for (let y = 0; y < maxY; y++) {
          const color = blockColorVanilla(y, maxY, worldIdx);
          blocks.push({ x, y, z, color });
        }
      }
    }
    // Sort blocks by height descending so reducing instancedMesh.count
    // removes the top blocks first
    blocks.sort((a, b) => b.y - a.y);
  } else {
    // TD mode: circular terrain
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist > size + 0.5) continue;

        const maxY = heightFn(x, z, seed);
        for (let y = 0; y < maxY; y++) {
          const color = blockColorTD(y, maxY, x, z);
          blocks.push({ x, y, z, color });
        }
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

/**
 * Build a tower model in the style of a typical Blender default scene export.
 * Stacked geometry: wide stone base, tapered body, top platform with battlements.
 */
function createTowerModel(): THREE.Group {
  const tower = new THREE.Group();

  // Materials — flat-shaded with subtle color variation like a Blender low-poly model
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x8B7355,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xA08060,
    roughness: 0.8,
    metalness: 0.05,
    flatShading: true,
  });
  const topMat = new THREE.MeshStandardMaterial({
    color: 0x9B8B75,
    roughness: 0.75,
    metalness: 0.1,
    flatShading: true,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x4A6741,
    roughness: 0.7,
    metalness: 0.05,
    flatShading: true,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x00AAFF,
    emissive: 0x0066CC,
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.5,
  });

  // Base — wide octagonal foundation
  const baseGeo = new THREE.CylinderGeometry(3.5, 4, 2, 8);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 1;
  tower.add(base);

  // Body — tapered octagonal column
  const bodyGeo = new THREE.CylinderGeometry(2.5, 3, 6, 8);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 5;
  tower.add(body);

  // Upper section — slightly wider ring
  const upperGeo = new THREE.CylinderGeometry(3, 2.5, 1.5, 8);
  const upper = new THREE.Mesh(upperGeo, topMat);
  upper.position.y = 8.75;
  tower.add(upper);

  // Battlements — 8 merlon blocks around the top
  const merlonGeo = new THREE.BoxGeometry(1.2, 1.5, 0.8);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const merlon = new THREE.Mesh(merlonGeo, topMat);
    merlon.position.set(
      Math.cos(angle) * 2.8,
      10.25,
      Math.sin(angle) * 2.8
    );
    merlon.rotation.y = -angle;
    tower.add(merlon);
  }

  // Open-top platform — flat disc so cannon is fully visible
  const platformGeo = new THREE.CylinderGeometry(2.8, 2.8, 0.3, 8);
  const platform = new THREE.Mesh(platformGeo, topMat);
  platform.position.y = 9.65;
  tower.add(platform);

  // Thin spire rising from center to hold the orb (doesn't block cannon)
  const spireGeo = new THREE.CylinderGeometry(0.12, 0.2, 3, 6);
  const spire = new THREE.Mesh(spireGeo, bodyMat);
  spire.position.y = 12.5;
  tower.add(spire);

  // Glowing crystal orb at the spire tip
  const orbGeo = new THREE.SphereGeometry(0.45, 8, 6);
  const orb = new THREE.Mesh(orbGeo, glowMat);
  orb.position.y = 14.2;
  tower.add(orb);

  // Point light emanating from the orb
  const orbLight = new THREE.PointLight(0x00AAFF, 0.6, 15);
  orbLight.position.y = 14.2;
  tower.add(orbLight);

  // Window slits (dark indents) on the body
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    emissive: 0x112244,
    emissiveIntensity: 0.3,
    roughness: 0.9,
  });
  const windowGeo = new THREE.BoxGeometry(0.4, 1.2, 0.3);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const win = new THREE.Mesh(windowGeo, windowMat);
    win.position.set(
      Math.cos(angle) * 2.6,
      5.5,
      Math.sin(angle) * 2.6
    );
    win.rotation.y = -angle;
    tower.add(win);
  }

  // Turret — rotating barrel that aims at enemies (sits above open battlements)
  const turretGroup = new THREE.Group();
  turretGroup.position.set(0, 10.8, 0);
  turretGroup.name = 'turret';

  // Turret base mount — visible rotating platform
  const turretBaseMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a4a, roughness: 0.8, metalness: 0.1, flatShading: true,
  });
  const turretBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.8, 0.5, 8), turretBaseMat,
  );
  turretGroup.add(turretBase);

  // Barrel — thicker and longer for visibility
  const barrelGeo = new THREE.CylinderGeometry(0.15, 0.25, 3.5, 8);
  const barrelMat2 = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a, roughness: 0.7, metalness: 0.4, flatShading: true,
  });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat2);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.15, 1.75);
  turretGroup.add(barrel);

  // Muzzle flash sphere at barrel tip
  const muzzleGeo = new THREE.SphereGeometry(0.28, 8, 6);
  const muzzleMat = new THREE.MeshBasicMaterial({
    color: 0x64ffb4, transparent: true, opacity: 0,
  });
  const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzle.position.set(0, 0.15, 3.6);
  muzzle.name = 'muzzle';
  turretGroup.add(muzzle);

  tower.add(turretGroup);

  return tower;
}

const MAX_ENEMIES = 64;
const MAX_BULLETS = 32;
const MAX_IMPACT_PARTICLES = 80;

interface ImpactParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  decay: number;
}

interface SceneState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  gridLines: THREE.LineSegments;
  instancedMesh: THREE.InstancedMesh | null;
  boxGeo: THREE.BoxGeometry;
  boxMat: THREE.MeshStandardMaterial;
  towerGroup: THREE.Group | null;
  turret: THREE.Group | null;
  muzzleFlash: THREE.Mesh | null;
  enemyMesh: THREE.InstancedMesh | null;
  enemyGeo: THREE.BoxGeometry;
  enemyMat: THREE.MeshStandardMaterial;
  bulletMesh: THREE.InstancedMesh | null;
  bulletGeo: THREE.SphereGeometry;
  bulletMat: THREE.MeshStandardMaterial;
  impactMesh: THREE.InstancedMesh | null;
  impactGeo: THREE.BoxGeometry;
  impactMat: THREE.MeshBasicMaterial;
}

interface VoxelWorldBackgroundProps {
  seed?: number;
  gameMode?: GameMode;
  terrainDestroyedCount?: number;
  enemies?: Enemy[];
  bullets?: Bullet[];
  onTerrainReady?: (totalBlocks: number) => void;
  worldIdx?: number;
}

export default function VoxelWorldBackground({
  seed = 42,
  gameMode = 'td',
  terrainDestroyedCount = 0,
  enemies = [],
  bullets = [],
  onTerrainReady,
  worldIdx = 0,
}: VoxelWorldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hpOverlayRef = useRef<HTMLCanvasElement>(null);
  const sceneStateRef = useRef<SceneState | null>(null);
  const animIdRef = useRef<number>(0);
  const onTerrainReadyRef = useRef(onTerrainReady);
  onTerrainReadyRef.current = onTerrainReady;
  const enemiesRef = useRef<Enemy[]>(enemies);
  enemiesRef.current = enemies;
  const bulletsRef = useRef<Bullet[]>(bullets);
  bulletsRef.current = bullets;
  const gameModeRef = useRef<GameMode>(gameMode);
  gameModeRef.current = gameMode;
  const terrainDestroyedCountRef = useRef(terrainDestroyedCount);
  terrainDestroyedCountRef.current = terrainDestroyedCount;
  const worldIdxRef = useRef(worldIdx);
  worldIdxRef.current = worldIdx;
  const totalBlockCountRef = useRef(0);
  const aliveIndicesRef = useRef<number[]>([]);
  const lastDestroyedCountRef = useRef(0);

  // Build terrain mesh into the scene (called once)
  const buildTerrain = useCallback((terrainSeed: number, mode: GameMode, wIdx: number = 0) => {
    const ss = sceneStateRef.current;
    if (!ss) return;

    // Remove old instanced mesh
    if (ss.instancedMesh) {
      ss.scene.remove(ss.instancedMesh);
      ss.instancedMesh.dispose();
    }

    // Remove old tower
    if (ss.towerGroup) {
      ss.scene.remove(ss.towerGroup);
      ss.towerGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      ss.towerGroup = null;
    }

    // Generate terrain based on mode
    const voxelData = generateVoxelWorld(terrainSeed, 20, mode, wIdx);
    const mesh = new THREE.InstancedMesh(ss.boxGeo, ss.boxMat, voxelData.count);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < voxelData.count; i++) {
      dummy.position.set(
        voxelData.positions[i * 3],
        voxelData.positions[i * 3 + 1],
        voxelData.positions[i * 3 + 2]
      );
      dummy.scale.set(1, 1, 1);
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

    ss.scene.add(mesh);
    ss.instancedMesh = mesh;
    totalBlockCountRef.current = voxelData.count;

    // TD mode: place tower at terrain center
    if (mode === 'td') {
      const towerGroup = createTowerModel();
      towerGroup.position.set(0, 0.5, 0);
      ss.scene.add(towerGroup);
      ss.towerGroup = towerGroup;

      // Cache turret and muzzle references for animation
      ss.turret = towerGroup.getObjectByName('turret') as THREE.Group || null;
      ss.muzzleFlash = ss.turret?.getObjectByName('muzzle') as THREE.Mesh || null;

      // Show enemy, bullet, and impact meshes
      if (ss.enemyMesh) ss.enemyMesh.visible = true;
      if (ss.bulletMesh) ss.bulletMesh.visible = true;
      if (ss.impactMesh) ss.impactMesh.visible = true;
    } else {
      // Vanilla mode: hide enemy, bullet, and impact meshes
      if (ss.enemyMesh) ss.enemyMesh.visible = false;
      if (ss.bulletMesh) ss.bulletMesh.visible = false;
      if (ss.impactMesh) ss.impactMesh.visible = false;
      ss.turret = null;
      ss.muzzleFlash = null;
    }

    // Reset alive tracking for vanilla mode terrain destruction
    aliveIndicesRef.current = Array.from({ length: voxelData.count }, (_, i) => i);
    lastDestroyedCountRef.current = 0;

    onTerrainReadyRef.current?.(voxelData.count);
  }, []);

  // Setup scene once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 40, 100);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(22, 18, 22);
    camera.lookAt(0, 9, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(20, 30, 10);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x8899bb, 0.3);
    fillLight.position.set(-15, 10, -10);
    scene.add(fillLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.3);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    // Procedural textures
    const detailMap = createBlockDetailTexture();
    const bumpMap = createBlockBumpMap();
    const roughnessMap = createBlockRoughnessMap();

    const boxGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const boxMat = new THREE.MeshStandardMaterial({
      roughness: 0.75,
      metalness: 0.02,
      flatShading: false,
      map: detailMap,
      bumpMap: bumpMap,
      bumpScale: 0.15,
      roughnessMap: roughnessMap,
    });

    // Enemy instanced mesh — bright and visible
    const enemyGeo = new THREE.BoxGeometry(1.5, 2.2, 1.5);
    const enemyMat = new THREE.MeshStandardMaterial({
      color: 0xFF3333,
      roughness: 0.4,
      metalness: 0.3,
      flatShading: true,
      emissive: 0xFF0000,
      emissiveIntensity: 0.6,
    });
    const enemyMesh = new THREE.InstancedMesh(enemyGeo, enemyMat, MAX_ENEMIES);
    enemyMesh.count = 0;
    scene.add(enemyMesh);

    // Bullet instanced mesh — green glowing projectiles (tower defense style)
    const bulletGeo = new THREE.SphereGeometry(0.2, 12, 8);
    const bulletMat = new THREE.MeshStandardMaterial({
      color: 0x64ffb4,
      roughness: 0.02,
      metalness: 0.5,
      emissive: 0x64ffb4,
      emissiveIntensity: 3.5,
    });
    const bulletMesh = new THREE.InstancedMesh(bulletGeo, bulletMat, MAX_BULLETS);
    bulletMesh.count = 0;
    scene.add(bulletMesh);

    // Impact particle instanced mesh — small cubes that scatter on bullet hit
    const impactGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const impactMat = new THREE.MeshBasicMaterial({ color: 0x64ffb4 });
    const impactMesh = new THREE.InstancedMesh(impactGeo, impactMat, MAX_IMPACT_PARTICLES);
    impactMesh.count = 0;
    scene.add(impactMesh);

    const gridLines = createGridLines();
    scene.add(gridLines);

    sceneStateRef.current = {
      renderer, scene, camera, gridLines,
      instancedMesh: null, boxGeo, boxMat,
      towerGroup: null,
      turret: null,
      muzzleFlash: null,
      enemyMesh, enemyGeo, enemyMat,
      bulletMesh, bulletGeo, bulletMat,
      impactMesh, impactGeo, impactMat,
    };

    // Handle resize
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Sync HP overlay canvas size
      if (hpOverlayRef.current) {
        hpOverlayRef.current.width = w;
        hpOverlayRef.current.height = h;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Animation loop
    let lastTime = 0;
    const dummy = new THREE.Object3D();
    const enemyColor = new THREE.Color();
    const projVec = new THREE.Vector3();

    // Bullet tracking for muzzle flash and impact detection
    const prevBulletIds = new Set<number>();
    const prevBulletPositions = new Map<number, { x: number; y: number; z: number }>();
    // Interpolated bullet state — updated every frame for smooth 60fps gravity arcs
    const interpBulletState = new Map<number, { x: number; y: number; z: number; vx: number; vy: number; vz: number }>();
    let muzzleFlashTimer = 0;
    const impactParticles: ImpactParticle[] = [];

    function spawnImpactBurst(
      px: number, py: number, pz: number,
      particles: ImpactParticle[], count: number,
    ) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: px + (Math.random() - 0.5) * 0.4,
          y: py + Math.random() * 0.3,
          z: pz + (Math.random() - 0.5) * 0.4,
          vx: (Math.random() - 0.5) * 0.06,
          vy: Math.random() * 0.04 + 0.02,
          vz: (Math.random() - 0.5) * 0.06,
          life: 1,
          decay: 0.008 + Math.random() * 0.012,
        });
      }
      // Cap particles
      while (particles.length > MAX_IMPACT_PARTICLES) particles.shift();
    }

    const animate = (time: number) => {
      animIdRef.current = requestAnimationFrame(animate);
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (delta < 0.1) {
        const ss = sceneStateRef.current;
        if (ss?.instancedMesh) {
          ss.instancedMesh.rotation.y += delta * 0.03;
        }
        gridLines.rotation.y += delta * 0.02;

        // Rotate tower with terrain
        if (ss?.towerGroup && ss.instancedMesh) {
          ss.towerGroup.rotation.y = ss.instancedMesh.rotation.y;
        }

        // Update enemy instances
        if (ss?.enemyMesh) {
          const currentEnemies = enemiesRef.current.filter(e => e.alive);
          ss.enemyMesh.count = currentEnemies.length;

          const terrainRotY = ss.instancedMesh?.rotation.y ?? 0;

          for (let i = 0; i < currentEnemies.length; i++) {
            const e = currentEnemies[i];
            // Rotate enemy position with terrain
            const cosR = Math.cos(terrainRotY);
            const sinR = Math.sin(terrainRotY);
            const rx = e.x * cosR - e.z * sinR;
            const rz = e.x * sinR + e.z * cosR;

            // Place on flat terrain surface with bobbing
            const bobY = 1.5 + Math.sin(time * 0.005 + e.id) * 0.3;
            dummy.position.set(rx, bobY, rz);
            dummy.scale.set(1, 1, 1);
            // Reset rotation then face center
            dummy.rotation.set(0, 0, 0);
            dummy.lookAt(new THREE.Vector3(0, bobY, 0));
            dummy.updateMatrix();
            ss.enemyMesh.setMatrixAt(i, dummy.matrix);

            // Color: red-orange spectrum by enemy id
            const hue = (e.id * 0.07) % 1;
            enemyColor.setHSL(hue * 0.08 + 0.0, 0.95, 0.5);
            ss.enemyMesh.setColorAt(i, enemyColor);
          }

          if (currentEnemies.length > 0) {
            ss.enemyMesh.instanceMatrix.needsUpdate = true;
            if (ss.enemyMesh.instanceColor) ss.enemyMesh.instanceColor.needsUpdate = true;
          }
        }

        // === Turret aiming — uses same Manhattan targeting as fireBullet ===
        if (ss?.turret && ss.towerGroup) {
          const aliveEnemies = enemiesRef.current.filter(e => e.alive);
          if (aliveEnemies.length > 0) {
            // Find closest enemy by Manhattan distance (same as fireBullet)
            let closest = aliveEnemies[0];
            let closestDist = Math.abs(closest.gridX) + Math.abs(closest.gridZ);
            for (let i = 1; i < aliveEnemies.length; i++) {
              const d = Math.abs(aliveEnemies[i].gridX) + Math.abs(aliveEnemies[i].gridZ);
              if (d < closestDist) { closest = aliveEnemies[i]; closestDist = d; }
            }
            // Smooth turret rotation toward target world position
            const targetAngle = Math.atan2(closest.x, closest.z);
            const tRot = ss.turret.rotation.y;
            ss.turret.rotation.y += (targetAngle - tRot) * 0.12;
          }
        }

        // === Muzzle flash ===
        if (ss?.muzzleFlash) {
          muzzleFlashTimer = Math.max(0, muzzleFlashTimer - delta * 1000);
          (ss.muzzleFlash.material as THREE.MeshBasicMaterial).opacity =
            muzzleFlashTimer > 0 ? muzzleFlashTimer / 80 * 0.9 : 0;
        }

        // === Bullet instances — detect new/removed for effects ===
        if (ss?.bulletMesh) {
          const currentBullets = bulletsRef.current.filter(b => b.alive);
          const currentIds = new Set(currentBullets.map(b => b.id));
          const terrainRotY = ss.instancedMesh?.rotation.y ?? 0;
          const cosR = Math.cos(terrainRotY);
          const sinR = Math.sin(terrainRotY);

          // Detect new bullets → trigger muzzle flash + init interpolated state
          for (const b of currentBullets) {
            if (!prevBulletIds.has(b.id)) {
              muzzleFlashTimer = 80;
              interpBulletState.set(b.id, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz });
            }
          }

          // Detect removed bullets → spawn impact particles + cleanup
          for (const [id, pos] of prevBulletPositions) {
            if (!currentIds.has(id)) {
              const istate = interpBulletState.get(id);
              const ipos = istate ?? pos;
              // Only spawn impact if bullet hit something (not just fell to ground)
              if (ipos.y > BULLET_GROUND_Y + 0.15) {
                const ipx = ipos.x * cosR - ipos.z * sinR;
                const ipz = ipos.x * sinR + ipos.z * cosR;
                spawnImpactBurst(ipx, ipos.y, ipz, impactParticles, 12);
              }
              interpBulletState.delete(id);
            }
          }

          // Update tracking
          prevBulletIds.clear();
          prevBulletPositions.clear();
          for (const b of currentBullets) {
            prevBulletIds.add(b.id);
            prevBulletPositions.set(b.id, { x: b.x, y: b.y, z: b.z });
          }

          // Simulate gravity-driven arc per frame for smooth 60fps bullet flight
          let visibleCount = 0;
          for (const b of currentBullets) {
            let st = interpBulletState.get(b.id);
            if (!st) {
              st = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz };
              interpBulletState.set(b.id, st);
            }

            // Apply gravity and move (match game logic for consistency)
            const prevVy = st.vy;
            st.vy -= BULLET_GRAVITY * delta;
            st.x += st.vx * delta;
            st.y += prevVy * delta - 0.5 * BULLET_GRAVITY * delta * delta;
            st.z += st.vz * delta;

            // Don't render if below ground
            if (st.y <= BULLET_GROUND_Y) continue;

            // Render at interpolated position
            const rx = st.x * cosR - st.z * sinR;
            const rz = st.x * sinR + st.z * cosR;

            dummy.position.set(rx, st.y, rz);
            const pulse = 0.95 + Math.sin(time * 0.008 + b.id * 1.7) * 0.12;
            dummy.scale.set(pulse, pulse, pulse);
            dummy.rotation.set(time * 0.012 + b.id, time * 0.015 + b.id * 0.5, 0);
            dummy.updateMatrix();
            ss.bulletMesh.setMatrixAt(visibleCount, dummy.matrix);
            visibleCount++;
          }

          ss.bulletMesh.count = visibleCount;
          if (visibleCount > 0) {
            ss.bulletMesh.instanceMatrix.needsUpdate = true;
          }
        }

        // === Impact particles ===
        if (ss?.impactMesh) {
          // Update particle physics
          for (let i = impactParticles.length - 1; i >= 0; i--) {
            const p = impactParticles[i];
            p.vy -= 0.0002 * delta * 1000; // gravity
            p.x += p.vx * delta * 60;
            p.y += p.vy * delta * 60;
            p.z += p.vz * delta * 60;
            p.life -= p.decay;
            if (p.life <= 0) impactParticles.splice(i, 1);
          }

          // Render particles — scale shrinks with life
          ss.impactMesh.count = impactParticles.length;
          for (let i = 0; i < impactParticles.length; i++) {
            const p = impactParticles[i];
            dummy.position.set(p.x, p.y, p.z);
            const s = Math.max(0, p.life);
            dummy.scale.set(s, s, s);
            dummy.rotation.set(p.life * 3, p.life * 5, 0);
            dummy.updateMatrix();
            ss.impactMesh.setMatrixAt(i, dummy.matrix);
          }

          if (impactParticles.length > 0) {
            ss.impactMesh.instanceMatrix.needsUpdate = true;
          }
        }
      }

      renderer.render(scene, camera);

      // === Draw enemy HP bars on 2D overlay canvas ===
      const hpCanvas = hpOverlayRef.current;
      const hpCtx = hpCanvas?.getContext('2d');
      if (hpCtx && hpCanvas) {
        hpCtx.clearRect(0, 0, hpCanvas.width, hpCanvas.height);
        const currentEnemies = enemiesRef.current.filter(e => e.alive);
        const terrainRotY = sceneStateRef.current?.instancedMesh?.rotation.y ?? 0;
        const cosR = Math.cos(terrainRotY);
        const sinR = Math.sin(terrainRotY);

        for (const e of currentEnemies) {
          // Only show HP bar if enemy has taken damage
          if (e.health >= e.maxHealth) continue;

          // Project enemy position to screen (with terrain rotation)
          const rx = e.x * cosR - e.z * sinR;
          const rz = e.x * sinR + e.z * cosR;
          const bobY = 1.5 + Math.sin(time * 0.005 + e.id) * 0.3;
          projVec.set(rx, bobY + 2.0, rz);
          projVec.project(camera);

          // Convert NDC to canvas pixels
          const sx = (projVec.x * 0.5 + 0.5) * hpCanvas.width;
          const sy = (-projVec.y * 0.5 + 0.5) * hpCanvas.height;

          // Skip if behind camera
          if (projVec.z > 1) continue;

          const barW = 28;
          const barH = 4;
          const hpPct = Math.max(0, e.health / e.maxHealth);

          // Background (dark)
          hpCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          hpCtx.fillRect(sx - barW / 2, sy - barH / 2, barW, barH);

          // HP fill (green → yellow → red based on %)
          const r = hpPct < 0.5 ? 255 : Math.round(255 * (1 - hpPct) * 2);
          const g = hpPct > 0.5 ? 255 : Math.round(255 * hpPct * 2);
          hpCtx.fillStyle = `rgb(${r}, ${g}, 40)`;
          hpCtx.fillRect(sx - barW / 2, sy - barH / 2, barW * hpPct, barH);

          // Border
          hpCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          hpCtx.lineWidth = 0.5;
          hpCtx.strokeRect(sx - barW / 2, sy - barH / 2, barW, barH);
        }
      }
    };
    animIdRef.current = requestAnimationFrame(animate);

    // Build initial terrain
    buildTerrain(seed, gameModeRef.current, worldIdxRef.current);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', updateSize);
      renderer.dispose();
      boxGeo.dispose();
      detailMap.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
      boxMat.dispose();
      enemyGeo.dispose();
      enemyMat.dispose();
      if (sceneStateRef.current?.instancedMesh) {
        sceneStateRef.current.instancedMesh.dispose();
      }
      if (sceneStateRef.current?.enemyMesh) {
        sceneStateRef.current.enemyMesh.dispose();
      }
      if (sceneStateRef.current?.bulletMesh) {
        sceneStateRef.current.bulletMesh.dispose();
      }
      if (sceneStateRef.current?.impactMesh) {
        sceneStateRef.current.impactMesh.dispose();
      }
      bulletGeo.dispose();
      bulletMat.dispose();
      impactGeo.dispose();
      impactMat.dispose();
      if (sceneStateRef.current?.towerGroup) {
        sceneStateRef.current.towerGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
      gridLines.geometry.dispose();
      (gridLines.material as THREE.Material).dispose();
      sceneStateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regenerate terrain when seed or worldIdx changes
  useEffect(() => {
    buildTerrain(seed, gameMode, worldIdx);
  }, [seed, gameMode, worldIdx, buildTerrain]);

  // Destroy blocks when destroyedCount increases — top-to-bottom order
  // Blocks are sorted Y-descending in generateVoxelWorld, so destroying
  // sequentially from the front of the alive list removes top layers first.
  useEffect(() => {
    const ss = sceneStateRef.current;
    if (!ss?.instancedMesh) return;

    const toDestroy = terrainDestroyedCount - lastDestroyedCountRef.current;
    if (toDestroy <= 0) return;

    const alive = aliveIndicesRef.current;
    const actualDestroy = Math.min(toDestroy, alive.length);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < actualDestroy; i++) {
      // Destroy from the front — highest Y blocks first
      const idx = alive[i];
      dummy.position.set(0, -1000, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      ss.instancedMesh.setMatrixAt(idx, dummy.matrix);
    }

    // Remove destroyed entries from the front of the alive list
    aliveIndicesRef.current = alive.slice(actualDestroy);
    ss.instancedMesh.instanceMatrix.needsUpdate = true;

    lastDestroyedCountRef.current = terrainDestroyedCount;
  }, [terrainDestroyedCount]);

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
        opacity: 0.6,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <canvas
        ref={hpOverlayRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
