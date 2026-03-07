'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import type { Enemy, Bullet, TerrainPhase, CorruptionNode } from './tetris/types';
import { BULLET_GRAVITY, BULLET_GROUND_Y, CORRUPTION_MAX_TERRAIN_NODES } from './tetris/constants';

// Extracted sub-modules
import { generateVoxelWorld } from './voxel-terrain';
import { createBlockDetailTexture, createBlockBumpMap, createBlockRoughnessMap, createEnemyArmorTexture } from './voxel-textures';
import { createGridLines, createTowerModel, MAX_ENEMIES, MAX_BULLETS, MAX_IMPACT_PARTICLES } from './voxel-models';
import type { ImpactParticle, SceneState } from './voxel-models';

interface VoxelWorldBackgroundProps {
  seed?: number;
  terrainPhase?: TerrainPhase;
  terrainDestroyedCount?: number;
  enemies?: Enemy[];
  bullets?: Bullet[];
  corruptedCells?: Map<string, CorruptionNode>;
  onTerrainReady?: (totalBlocks: number) => void;
  worldIdx?: number;
}

export default function VoxelWorldBackground({
  seed = 42,
  terrainPhase = 'dig',
  terrainDestroyedCount = 0,
  enemies = [],
  bullets = [],
  corruptedCells,
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
  const corruptedCellsRef = useRef(corruptedCells);
  corruptedCellsRef.current = corruptedCells;
  const terrainPhaseLocalRef = useRef<TerrainPhase>(terrainPhase);
  terrainPhaseLocalRef.current = terrainPhase;
  const terrainDestroyedCountRef = useRef(terrainDestroyedCount);
  terrainDestroyedCountRef.current = terrainDestroyedCount;
  const worldIdxRef = useRef(worldIdx);
  worldIdxRef.current = worldIdx;
  const totalBlockCountRef = useRef(0);
  const aliveIndicesRef = useRef<number[]>([]);
  const lastDestroyedCountRef = useRef(0);
  /** TD mode: map "gx,gz" → instance index for corruption color updates */
  const terrainGridMapRef = useRef<Map<string, number> | null>(null);
  /** Original terrain colors (RGB float triplets) for restoring after corruption clears */
  const originalColorsRef = useRef<Float32Array | null>(null);
  /** Track which indices are currently tinted so we can restore them */
  const corruptedIndicesRef = useRef<Set<number>>(new Set());
  /** Enemy position interpolation state: id → {fromX, fromZ, toX, toZ, t} */
  const enemyLerpRef = useRef<Map<number, { fromX: number; fromZ: number; toX: number; toZ: number; t: number }>>(new Map());

  // Build terrain mesh into the scene (called once)
  const buildTerrain = useCallback((terrainSeed: number, mode: TerrainPhase, wIdx: number = 0) => {
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

    // Store grid map and original colors for corruption color tinting
    terrainGridMapRef.current = voxelData.gridIndexMap ?? null;
    originalColorsRef.current = new Float32Array(voxelData.colors);
    corruptedIndicesRef.current.clear();

    // Reset enemy interpolation state on terrain rebuild
    enemyLerpRef.current.clear();

    // TD phase: place tower at terrain center
    if (mode === 'td') {
      const towerGroup = createTowerModel();
      towerGroup.position.set(0, 0.5, 0);
      ss.scene.add(towerGroup);
      ss.towerGroup = towerGroup;

      // Cache turret and muzzle references for animation
      ss.turret = towerGroup.getObjectByName('turret') as THREE.Group || null;
      ss.muzzleFlash = ss.turret?.getObjectByName('muzzle') as THREE.Mesh || null;

      // Show enemy, bullet, and impact meshes
      if (ss.enemyBodyMesh) ss.enemyBodyMesh.visible = true;
      if (ss.enemyHeadMesh) ss.enemyHeadMesh.visible = true;
      if (ss.enemyEyeMesh) ss.enemyEyeMesh.visible = true;
      if (ss.bulletMesh) ss.bulletMesh.visible = true;
      if (ss.impactMesh) ss.impactMesh.visible = true;
    } else {
      // Dig phase: hide enemy, bullet, and impact meshes
      if (ss.enemyBodyMesh) ss.enemyBodyMesh.visible = false;
      if (ss.enemyHeadMesh) ss.enemyHeadMesh.visible = false;
      if (ss.enemyEyeMesh) ss.enemyEyeMesh.visible = false;
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

    // Enemy instanced meshes — 3-part detailed creature model:
    // Body (armored torso), Head (rounded), Eye visor (glowing)

    // Procedural armor texture for the body
    const enemyArmorMap = createEnemyArmorTexture();

    // Body: tapered hexagonal cylinder — armored torso
    const enemyBodyGeo = new THREE.CylinderGeometry(0.52, 0.64, 1.3, 6, 1, false);
    const enemyBodyMat = new THREE.MeshStandardMaterial({
      color: 0x330055,
      roughness: 0.55,
      metalness: 0.35,
      flatShading: true,
      map: enemyArmorMap,
      emissive: 0x220033,
      emissiveIntensity: 0.4,
    });
    const enemyBodyMesh = new THREE.InstancedMesh(enemyBodyGeo, enemyBodyMat, MAX_ENEMIES);
    enemyBodyMesh.count = 0;
    scene.add(enemyBodyMesh);

    // Head: slightly flattened sphere sitting above the body
    const enemyHeadGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const enemyHeadMat = new THREE.MeshStandardMaterial({
      color: 0x4a1a7a,
      roughness: 0.5,
      metalness: 0.2,
      flatShading: true,
      emissive: 0x2a0050,
      emissiveIntensity: 0.3,
    });
    const enemyHeadMesh = new THREE.InstancedMesh(enemyHeadGeo, enemyHeadMat, MAX_ENEMIES);
    enemyHeadMesh.count = 0;
    scene.add(enemyHeadMesh);

    // Eye visor: a wide flat box on the face of the head — glows bright orange/red
    const enemyEyeGeo = new THREE.BoxGeometry(0.52, 0.14, 0.10);
    const enemyEyeMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      roughness: 0.1,
      metalness: 0.5,
      emissive: 0xff4400,
      emissiveIntensity: 3.0,
    });
    const enemyEyeMesh = new THREE.InstancedMesh(enemyEyeGeo, enemyEyeMat, MAX_ENEMIES);
    enemyEyeMesh.count = 0;
    scene.add(enemyEyeMesh);

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

    // Corruption overlay instanced mesh — purple glowing flat cubes on corrupted terrain cells
    const corruptGeo = new THREE.BoxGeometry(1.05, 0.3, 1.05);
    const corruptMat = new THREE.MeshStandardMaterial({
      color: 0x8800ff,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0xaa00ff,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.6,
    });
    const corruptMesh = new THREE.InstancedMesh(corruptGeo, corruptMat, CORRUPTION_MAX_TERRAIN_NODES);
    corruptMesh.count = 0;
    scene.add(corruptMesh);

    const gridLines = createGridLines();
    scene.add(gridLines);

    sceneStateRef.current = {
      renderer, scene, camera, gridLines,
      instancedMesh: null, boxGeo, boxMat,
      towerGroup: null,
      turret: null,
      muzzleFlash: null,
      enemyBodyMesh, enemyBodyGeo, enemyBodyMat,
      enemyHeadMesh, enemyHeadGeo, enemyHeadMat,
      enemyEyeMesh, enemyEyeGeo, enemyEyeMat,
      bulletMesh, bulletGeo, bulletMat,
      impactMesh, impactGeo, impactMat,
      corruptMesh, corruptGeo, corruptMat,
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
    const dummyHead = new THREE.Object3D();
    const dummyEye = new THREE.Object3D();
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
        // Only rotate terrain during dig (terrain destruction) phase, not during TD phase
        const currentPhase = terrainPhaseLocalRef.current;
        if (ss?.instancedMesh && currentPhase === 'dig') {
          ss.instancedMesh.rotation.y += delta * 0.03;
        }
        if (currentPhase === 'dig') {
          gridLines.rotation.y += delta * 0.02;
        }

        // Rotate tower with terrain
        if (ss?.towerGroup && ss.instancedMesh) {
          ss.towerGroup.rotation.y = ss.instancedMesh.rotation.y;
        }

        // Update enemy instances — 3-part model (body, head, eye visor)
        if (ss?.enemyBodyMesh && ss.enemyHeadMesh && ss.enemyEyeMesh) {
          const currentEnemies = enemiesRef.current.filter(e => e.alive);
          ss.enemyBodyMesh.count = currentEnemies.length;
          ss.enemyHeadMesh.count = currentEnemies.length;
          ss.enemyEyeMesh.count = currentEnemies.length;

          const terrainRotY = ss.instancedMesh?.rotation.y ?? 0;
          const cosR = Math.cos(terrainRotY);
          const sinR = Math.sin(terrainRotY);

          // Body center Y: terrain surface (0.475) + half body height (0.65) = 1.125
          // Head center Y: body top (1.125 + 0.65 = 1.775) + head radius (0.5) = 2.275
          // Eye center Y: head center + 0.12 forward
          const bodyY = 1.125;
          const headOffsetY = 1.15; // above bodyY
          const eyeOffsetY = 1.27; // above bodyY (on face surface)

          const lerpMap = enemyLerpRef.current;
          const currentIds = new Set<number>();
          const LERP_SPEED = 6.0;

          for (let i = 0; i < currentEnemies.length; i++) {
            const e = currentEnemies[i];
            currentIds.add(e.id);

            // Smooth interpolation between grid positions
            let lerp = lerpMap.get(e.id);
            if (!lerp) {
              lerp = { fromX: e.x, fromZ: e.z, toX: e.x, toZ: e.z, t: 1 };
              lerpMap.set(e.id, lerp);
            }

            if (lerp.toX !== e.x || lerp.toZ !== e.z) {
              lerp.fromX = lerp.fromX + (lerp.toX - lerp.fromX) * lerp.t;
              lerp.fromZ = lerp.fromZ + (lerp.toZ - lerp.fromZ) * lerp.t;
              lerp.toX = e.x;
              lerp.toZ = e.z;
              lerp.t = 0;
            }

            if (lerp.t < 1) {
              lerp.t = Math.min(1, lerp.t + delta * LERP_SPEED);
            }

            const st = lerp.t * lerp.t * (3 - 2 * lerp.t);
            const lerpX = lerp.fromX + (lerp.toX - lerp.fromX) * st;
            const lerpZ = lerp.fromZ + (lerp.toZ - lerp.fromZ) * st;

            // Apply terrain rotation
            const rx = lerpX * cosR - lerpZ * sinR;
            const rz = lerpX * sinR + lerpZ * cosR;

            // Subtle bob animation so enemies feel alive
            const bobY = Math.sin(time * 0.003 + e.id * 1.3) * 0.06;

            // Forward direction (normalized, from enemy toward tower origin)
            const dist = Math.sqrt(rx * rx + rz * rz) || 1;
            const fwdX = -rx / dist;
            const fwdZ = -rz / dist;

            // --- Body ---
            dummy.position.set(rx, bodyY + bobY, rz);
            dummy.scale.set(1, 1, 1);
            dummy.rotation.set(0, 0, 0);
            dummy.lookAt(new THREE.Vector3(0, bodyY + bobY, 0));
            dummy.updateMatrix();
            ss.enemyBodyMesh.setMatrixAt(i, dummy.matrix);

            // --- Head (above body, slight independent bob) ---
            const headBobY = bobY + Math.sin(time * 0.004 + e.id * 2.1) * 0.03;
            dummyHead.position.set(rx, bodyY + headOffsetY + headBobY, rz);
            dummyHead.scale.set(1, 1, 1);
            dummyHead.rotation.set(0, 0, 0);
            dummyHead.lookAt(new THREE.Vector3(0, bodyY + headOffsetY + headBobY, 0));
            dummyHead.updateMatrix();
            ss.enemyHeadMesh.setMatrixAt(i, dummyHead.matrix);

            // --- Eye visor (on the front face of the head, offset in forward direction) ---
            const eyeForwardOffset = 0.46;
            dummyEye.position.set(
              rx + fwdX * eyeForwardOffset,
              bodyY + eyeOffsetY + headBobY,
              rz + fwdZ * eyeForwardOffset,
            );
            dummyEye.scale.set(1, 1, 1);
            dummyEye.rotation.set(0, 0, 0);
            dummyEye.lookAt(new THREE.Vector3(
              rx + fwdX * (eyeForwardOffset + 1),
              bodyY + eyeOffsetY + headBobY,
              rz + fwdZ * (eyeForwardOffset + 1),
            ));
            dummyEye.updateMatrix();
            ss.enemyEyeMesh.setMatrixAt(i, dummyEye.matrix);

            // Per-instance tint: subtle hue variation on body/head (purple-red spectrum)
            const hue = (e.id * 0.07) % 1;
            enemyColor.setHSL(hue * 0.12 + 0.78, 0.85, 0.45);
            ss.enemyBodyMesh.setColorAt(i, enemyColor);
            // Head slightly lighter
            enemyColor.setHSL(hue * 0.12 + 0.78, 0.75, 0.55);
            ss.enemyHeadMesh.setColorAt(i, enemyColor);
            // Eyes always orange-hot — no per-instance tint variation needed
            enemyColor.set(0xffffff);
            ss.enemyEyeMesh.setColorAt(i, enemyColor);
          }

          // Clean up stale lerp entries for dead enemies
          for (const id of lerpMap.keys()) {
            if (!currentIds.has(id)) lerpMap.delete(id);
          }

          if (currentEnemies.length > 0) {
            ss.enemyBodyMesh.instanceMatrix.needsUpdate = true;
            ss.enemyHeadMesh.instanceMatrix.needsUpdate = true;
            ss.enemyEyeMesh.instanceMatrix.needsUpdate = true;
            if (ss.enemyBodyMesh.instanceColor) ss.enemyBodyMesh.instanceColor.needsUpdate = true;
            if (ss.enemyHeadMesh.instanceColor) ss.enemyHeadMesh.instanceColor.needsUpdate = true;
            if (ss.enemyEyeMesh.instanceColor) ss.enemyEyeMesh.instanceColor.needsUpdate = true;
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

      // === Corruption — tint terrain block colors instead of floating overlay ===
      {
        const scState = sceneStateRef.current;
        const gridMap = terrainGridMapRef.current;
        const origColors = originalColorsRef.current;
        const prevCorrupted = corruptedIndicesRef.current;

        // Hide the legacy corruptMesh (no longer used)
        if (scState?.corruptMesh) {
          scState.corruptMesh.count = 0;
        }

        if (scState?.instancedMesh && gridMap && origColors) {
          const cells = corruptedCellsRef.current;
          const tintColor = new THREE.Color();
          const newCorrupted = new Set<number>();
          let needsUpdate = false;

          if (cells && cells.size > 0) {
            // Purple corruption color
            const corruptPurple = new THREE.Color(0.55, 0.0, 1.0);

            for (const [, node] of cells) {
              const key = `${node.gx},${node.gz}`;
              const idx = gridMap.get(key);
              if (idx === undefined) continue;

              newCorrupted.add(idx);

              // Blend original color toward purple based on corruption level (0-5)
              const blend = Math.min(1, (node.level + 1) / 6);
              const pulse = 0.85 + 0.15 * Math.sin(time * 0.004 + node.gx * 0.5 + node.gz * 0.7);
              tintColor.setRGB(
                origColors[idx * 3],
                origColors[idx * 3 + 1],
                origColors[idx * 3 + 2],
              );
              tintColor.lerp(corruptPurple, blend * pulse);
              scState.instancedMesh.setColorAt(idx, tintColor);
              needsUpdate = true;
            }
          }

          // Restore original colors for cells that are no longer corrupted
          for (const idx of prevCorrupted) {
            if (!newCorrupted.has(idx)) {
              tintColor.setRGB(
                origColors[idx * 3],
                origColors[idx * 3 + 1],
                origColors[idx * 3 + 2],
              );
              scState.instancedMesh.setColorAt(idx, tintColor);
              needsUpdate = true;
            }
          }

          corruptedIndicesRef.current = newCorrupted;

          if (needsUpdate && scState.instancedMesh.instanceColor) {
            scState.instancedMesh.instanceColor.needsUpdate = true;
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

          // Use interpolated position for smooth HP bar tracking
          const lerpState = enemyLerpRef.current.get(e.id);
          const dispX = lerpState ? lerpState.fromX + (lerpState.toX - lerpState.fromX) * (lerpState.t * lerpState.t * (3 - 2 * lerpState.t)) : e.x;
          const dispZ = lerpState ? lerpState.fromZ + (lerpState.toZ - lerpState.fromZ) * (lerpState.t * lerpState.t * (3 - 2 * lerpState.t)) : e.z;

          // Project enemy position to screen (with terrain rotation)
          const rx = dispX * cosR - dispZ * sinR;
          const rz = dispX * sinR + dispZ * cosR;
          // New model top: bodyY (1.125) + headOffset (1.15) + headRadius (0.5) = 2.775 + margin
          projVec.set(rx, 3.05, rz);
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
    buildTerrain(seed, terrainPhaseLocalRef.current, worldIdxRef.current);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', updateSize);
      renderer.dispose();
      boxGeo.dispose();
      detailMap.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
      boxMat.dispose();
      enemyArmorMap.dispose();
      enemyBodyGeo.dispose();
      enemyBodyMat.dispose();
      enemyHeadGeo.dispose();
      enemyHeadMat.dispose();
      enemyEyeGeo.dispose();
      enemyEyeMat.dispose();
      if (sceneStateRef.current?.instancedMesh) {
        sceneStateRef.current.instancedMesh.dispose();
      }
      if (sceneStateRef.current?.enemyBodyMesh) {
        sceneStateRef.current.enemyBodyMesh.dispose();
      }
      if (sceneStateRef.current?.enemyHeadMesh) {
        sceneStateRef.current.enemyHeadMesh.dispose();
      }
      if (sceneStateRef.current?.enemyEyeMesh) {
        sceneStateRef.current.enemyEyeMesh.dispose();
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

  // Regenerate terrain when seed, terrainPhase, or worldIdx changes
  useEffect(() => {
    buildTerrain(seed, terrainPhase, worldIdx);
  }, [seed, terrainPhase, worldIdx, buildTerrain]);

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
