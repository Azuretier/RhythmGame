'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import type { Enemy, Bullet, GameMode } from './tetris/types';

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

// Hilly terrain for vanilla mode
function terrainHeightVanilla(x: number, z: number, seed: number): number {
  const s1 = smoothNoise(x * 0.08, z * 0.08, seed);
  const s2 = smoothNoise(x * 0.15, z * 0.15, seed + 100);
  const s3 = smoothNoise(x * 0.3, z * 0.3, seed + 200);
  const h = s1 * 4 + s2 * 2 + s3 * 1;
  return Math.max(1, Math.floor(h + 1));
}

// Flat terrain for TD mode
function terrainHeightTD(_x: number, _z: number, _seed: number): number {
  return 1;
}

// Block color for vanilla mode — earth tones by height
function blockColorVanilla(y: number, maxY: number): THREE.Color {
  const t = maxY > 1 ? y / maxY : 0.5;
  if (t > 0.7) return new THREE.Color(0.35, 0.55, 0.25);  // grass
  if (t > 0.3) return new THREE.Color(0.45, 0.35, 0.25);  // dirt
  return new THREE.Color(0.4, 0.4, 0.4);                    // stone
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

function generateVoxelWorld(seed: number, size: number, mode: GameMode = 'td'): VoxelData {
  const blocks: { x: number; y: number; z: number; color: THREE.Color }[] = [];

  const heightFn = mode === 'vanilla' ? terrainHeightVanilla : terrainHeightTD;
  const colorFn = mode === 'vanilla' ? blockColorVanilla : blockColorTD;

  for (let x = -size; x <= size; x++) {
    for (let z = -size; z <= size; z++) {
      const dist = Math.sqrt(x * x + z * z);
      if (dist > size + 0.5) continue;

      const maxY = heightFn(x, z, seed);
      for (let y = 0; y < maxY; y++) {
        const color = mode === 'vanilla'
          ? colorFn(y, maxY)
          : colorFn(y, maxY, x, z);
        blocks.push({ x, y, z, color });
      }
    }
  }

  // For vanilla mode, sort blocks by height descending so that
  // reducing instancedMesh.count removes the top blocks first
  if (mode === 'vanilla') {
    blocks.sort((a, b) => b.y - a.y);
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

  // Conical roof
  const roofGeo = new THREE.ConeGeometry(3.2, 3.5, 8);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 12.5;
  tower.add(roof);

  // Glowing crystal orb at the very top
  const orbGeo = new THREE.SphereGeometry(0.5, 8, 6);
  const orb = new THREE.Mesh(orbGeo, glowMat);
  orb.position.y = 14.8;
  tower.add(orb);

  // Point light emanating from the orb
  const orbLight = new THREE.PointLight(0x00AAFF, 0.6, 15);
  orbLight.position.y = 14.8;
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

  return tower;
}

const MAX_ENEMIES = 64;
const MAX_BULLETS = 32;

interface SceneState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  gridLines: THREE.LineSegments;
  instancedMesh: THREE.InstancedMesh | null;
  boxGeo: THREE.BoxGeometry;
  boxMat: THREE.MeshStandardMaterial;
  towerGroup: THREE.Group | null;
  enemyMesh: THREE.InstancedMesh | null;
  enemyGeo: THREE.BoxGeometry;
  enemyMat: THREE.MeshStandardMaterial;
  bulletMesh: THREE.InstancedMesh | null;
  bulletGeo: THREE.SphereGeometry;
  bulletMat: THREE.MeshStandardMaterial;
}

interface VoxelWorldBackgroundProps {
  seed?: number;
  gameMode?: GameMode;
  terrainDestroyedCount?: number;
  enemies?: Enemy[];
  bullets?: Bullet[];
  onTerrainReady?: (totalBlocks: number) => void;
}

export default function VoxelWorldBackground({
  seed = 42,
  gameMode = 'td',
  terrainDestroyedCount = 0,
  enemies = [],
  bullets = [],
  onTerrainReady,
}: VoxelWorldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const totalBlockCountRef = useRef(0);
  const aliveIndicesRef = useRef<number[]>([]);
  const lastDestroyedCountRef = useRef(0);

  // Build terrain mesh into the scene (called once)
  const buildTerrain = useCallback((terrainSeed: number, mode: GameMode) => {
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
    const voxelData = generateVoxelWorld(terrainSeed, 20, mode);
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

      // Show enemy and bullet meshes
      if (ss.enemyMesh) ss.enemyMesh.visible = true;
      if (ss.bulletMesh) ss.bulletMesh.visible = true;
    } else {
      // Vanilla mode: hide enemy and bullet meshes
      if (ss.enemyMesh) ss.enemyMesh.visible = false;
      if (ss.bulletMesh) ss.bulletMesh.visible = false;
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
    camera.position.set(22, 20, 22);
    camera.lookAt(0, 8, 0);

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

    // Bullet instanced mesh — bright glowing projectiles
    const bulletGeo = new THREE.SphereGeometry(0.35, 6, 4);
    const bulletMat = new THREE.MeshStandardMaterial({
      color: 0x00CCFF,
      roughness: 0.1,
      metalness: 0.5,
      emissive: 0x0088FF,
      emissiveIntensity: 1.5,
    });
    const bulletMesh = new THREE.InstancedMesh(bulletGeo, bulletMat, MAX_BULLETS);
    bulletMesh.count = 0;
    scene.add(bulletMesh);

    const gridLines = createGridLines();
    scene.add(gridLines);

    sceneStateRef.current = {
      renderer, scene, camera, gridLines,
      instancedMesh: null, boxGeo, boxMat,
      towerGroup: null,
      enemyMesh, enemyGeo, enemyMat,
      bulletMesh, bulletGeo, bulletMat,
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
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Animation loop
    let lastTime = 0;
    const dummy = new THREE.Object3D();
    const enemyColor = new THREE.Color();

    const animate = (time: number) => {
      animIdRef.current = requestAnimationFrame(animate);
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (delta < 0.1) {
        const ss = sceneStateRef.current;
        if (ss?.instancedMesh) {
          ss.instancedMesh.rotation.y += delta * 0.03;

          // Vanilla mode: reduce visible block count based on destroyed count
          if (gameModeRef.current === 'vanilla') {
            const destroyed = terrainDestroyedCountRef.current;
            const visible = Math.max(0, totalBlockCountRef.current - destroyed);
            ss.instancedMesh.count = visible;
          }
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

        // Update bullet instances
        if (ss?.bulletMesh) {
          const currentBullets = bulletsRef.current.filter(b => b.alive);
          ss.bulletMesh.count = currentBullets.length;

          const terrainRotY = ss.instancedMesh?.rotation.y ?? 0;

          for (let i = 0; i < currentBullets.length; i++) {
            const b = currentBullets[i];
            // Rotate bullet position with terrain
            const cosR = Math.cos(terrainRotY);
            const sinR = Math.sin(terrainRotY);
            const rx = b.x * cosR - b.z * sinR;
            const rz = b.x * sinR + b.z * cosR;

            dummy.position.set(rx, b.y, rz);
            // Pulse scale for glow effect
            const pulse = 0.8 + Math.sin(time * 0.02 + b.id * 2) * 0.3;
            dummy.scale.set(pulse, pulse, pulse);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            ss.bulletMesh.setMatrixAt(i, dummy.matrix);
          }

          if (currentBullets.length > 0) {
            ss.bulletMesh.instanceMatrix.needsUpdate = true;
          }
        }
      }

      renderer.render(scene, camera);
    };
    animIdRef.current = requestAnimationFrame(animate);

    // Build initial terrain
    buildTerrain(seed, gameModeRef.current);

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
      bulletGeo.dispose();
      bulletMat.dispose();
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

  // Regenerate terrain when seed changes
  useEffect(() => {
    buildTerrain(seed, gameMode);
  }, [seed, gameMode, buildTerrain]);

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
    </div>
  );
}
