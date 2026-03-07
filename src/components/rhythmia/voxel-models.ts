// =============================================================
// Voxel World Background - 3D Models & Scene State
// Grid lines, tower model, scene state interfaces
// =============================================================

import * as THREE from 'three';

export function createGridLines(): THREE.LineSegments {
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
export function createTowerModel(): THREE.Group {
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

export const MAX_ENEMIES = 64;
export const MAX_BULLETS = 32;
export const MAX_IMPACT_PARTICLES = 80;

export interface ImpactParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  decay: number;
}

export interface SceneState {
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
  /** Enemy body (torso) instanced mesh */
  enemyBodyMesh: THREE.InstancedMesh | null;
  enemyBodyGeo: THREE.CylinderGeometry;
  enemyBodyMat: THREE.MeshStandardMaterial;
  /** Enemy head instanced mesh */
  enemyHeadMesh: THREE.InstancedMesh | null;
  enemyHeadGeo: THREE.SphereGeometry;
  enemyHeadMat: THREE.MeshStandardMaterial;
  /** Enemy glowing eye visor instanced mesh */
  enemyEyeMesh: THREE.InstancedMesh | null;
  enemyEyeGeo: THREE.BoxGeometry;
  enemyEyeMat: THREE.MeshStandardMaterial;
  bulletMesh: THREE.InstancedMesh | null;
  bulletGeo: THREE.SphereGeometry;
  bulletMat: THREE.MeshStandardMaterial;
  impactMesh: THREE.InstancedMesh | null;
  impactGeo: THREE.BoxGeometry;
  impactMat: THREE.MeshBasicMaterial;
  corruptMesh: THREE.InstancedMesh | null;
  corruptGeo: THREE.BoxGeometry;
  corruptMat: THREE.MeshStandardMaterial;
}
