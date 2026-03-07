/**
 * Shared types, caches, and helper functions for Minecraft-style mob geometry builders.
 */
import * as THREE from 'three';
import type { TDEnemyType } from './types';

// GLTFLoader — resolved at runtime via dynamic import (path varies by three.js version)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GLTFLoaderClass: any = null;

// ========== Types ==========

export interface MobMeshData {
  group: THREE.Group;
  type: TDEnemyType;
  // Articulated limbs for walking animation
  leftArm?: THREE.Group;
  rightArm?: THREE.Group;
  leftLeg?: THREE.Group;
  rightLeg?: THREE.Group;
  // Creeper 4-leg pairs
  frontLeftLeg?: THREE.Group;
  frontRightLeg?: THREE.Group;
  backLeftLeg?: THREE.Group;
  backRightLeg?: THREE.Group;
  // Spider leg pairs
  spiderLegs?: THREE.Group[];
  // Total height (feet at y=0) for HP bar positioning
  height: number;
  isGltf: boolean;
}

// ========== Shared Geometry / Material Cache ==========

export const geoCache = new Map<string, THREE.BoxGeometry>();
export const matCache = new Map<string, THREE.MeshStandardMaterial>();
export const physMatCache = new Map<string, THREE.MeshPhysicalMaterial>();

export function getGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  let geo = geoCache.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, geo);
  }
  return geo;
}

export interface MatOpts {
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
}

export function getMat(
  color: number,
  emissive = 0x000000,
  emissiveIntensity = 0,
  opts?: MatOpts,
): THREE.MeshStandardMaterial {
  const r = opts?.roughness ?? 0.85;
  const m = opts?.metalness ?? 0.0;
  const t = opts?.transparent ?? false;
  const o = opts?.opacity ?? 1.0;
  const key = `${color.toString(16)}-${emissive.toString(16)}-${emissiveIntensity.toFixed(2)}-r${r.toFixed(2)}-m${m.toFixed(2)}-t${t ? 1 : 0}-o${o.toFixed(2)}`;
  let mat = matCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness: r,
      metalness: m,
      flatShading: true,
      emissive,
      emissiveIntensity,
      transparent: t,
      opacity: o,
    });
    matCache.set(key, mat);
  }
  return mat;
}

export interface PhysMatOpts {
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  transparent?: boolean;
  opacity?: number;
}

export function getPhysicalMat(
  color: number,
  emissive = 0x000000,
  emissiveIntensity = 0,
  opts?: PhysMatOpts,
): THREE.MeshPhysicalMaterial {
  const r = opts?.roughness ?? 0.85;
  const m = opts?.metalness ?? 0.0;
  const cc = opts?.clearcoat ?? 0;
  const ccr = opts?.clearcoatRoughness ?? 0.1;
  const tr = opts?.transmission ?? 0;
  const th = opts?.thickness ?? 0;
  const t = opts?.transparent ?? false;
  const o = opts?.opacity ?? 1.0;
  const key = `phys-${color.toString(16)}-${emissive.toString(16)}-${emissiveIntensity.toFixed(2)}-r${r.toFixed(2)}-m${m.toFixed(2)}-cc${cc.toFixed(2)}-ccr${ccr.toFixed(2)}-tr${tr.toFixed(2)}-th${th.toFixed(2)}-t${t ? 1 : 0}-o${o.toFixed(2)}`;
  let mat = physMatCache.get(key);
  if (!mat) {
    mat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: r,
      metalness: m,
      flatShading: true,
      emissive,
      emissiveIntensity,
      clearcoat: cc,
      clearcoatRoughness: ccr,
      transmission: tr,
      thickness: th,
      transparent: t,
      opacity: o,
    });
    physMatCache.set(key, mat);
  }
  return mat;
}

/** Create a box mesh with the given dimensions and color. */
export function mbox(
  w: number, h: number, d: number,
  color: number,
  emissive = 0x000000, emissiveIntensity = 0,
  opts?: MatOpts,
): THREE.Mesh {
  return new THREE.Mesh(getGeo(w, h, d), getMat(color, emissive, emissiveIntensity, opts));
}

/** Create a box mesh with MeshPhysicalMaterial. */
export function mboxPhys(
  w: number, h: number, d: number,
  color: number,
  emissive = 0x000000, emissiveIntensity = 0,
  opts?: PhysMatOpts,
): THREE.Mesh {
  return new THREE.Mesh(getGeo(w, h, d), getPhysicalMat(color, emissive, emissiveIntensity, opts));
}

/** Create an articulated limb group with pivot at (offsetX, pivotY, offsetZ). */
export function limb(
  w: number, h: number, d: number,
  color: number,
  pivotY: number, offsetX: number, offsetZ = 0,
  matOpts?: MatOpts,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(offsetX, pivotY, offsetZ);
  const mesh = mbox(w, h, d, color, 0x000000, 0, matOpts);
  mesh.position.y = -h / 2;
  group.add(mesh);
  return group;
}

// ========== GLTF Model Cache ==========

const gltfCache = new Map<TDEnemyType, THREE.Group>();
const gltfAttempted = new Set<TDEnemyType>();

/**
 * Attempt to load GLTF mob models from /models/mobs/{type}.glb.
 * Models are cached and cloned for each enemy instance.
 * Falls back to procedural geometry if model is unavailable.
 */
export async function loadMobGltfModels(): Promise<void> {
  // Dynamically import GLTFLoader (path varies by three.js version)
  if (!GLTFLoaderClass) {
    try {
      const mod = await import('three/examples/jsm/loaders/GLTFLoader.js');
      GLTFLoaderClass = mod.GLTFLoader;
    } catch {
      // GLTFLoader not available at this path — models won't load
      return;
    }
  }

  const loader = new GLTFLoaderClass();
  const types: TDEnemyType[] = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'slime', 'pig', 'chicken', 'cow', 'bee', 'cat', 'horse', 'rabbit', 'wolf'];

  for (const type of types) {
    if (gltfAttempted.has(type)) continue;
    gltfAttempted.add(type);

    loader.load(
      `/models/mobs/${type}.glb`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gltf: any) => {
        // Scale and center the model
        const model = gltf.scene as THREE.Group;
        const bbox = new THREE.Box3().setFromObject(model);
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetHeight = type === 'spider' ? 0.8 : type === 'enderman' ? 2.8 : 1.9;
        const scale = targetHeight / maxDim;
        model.scale.setScalar(scale);

        // Re-center so feet are at y=0
        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y = -scaledBox.min.y;

        // Apply flat shading to all meshes for pixelized look
        model.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && child.material) {
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            for (const mat of materials) {
              if (mat instanceof THREE.MeshStandardMaterial ||
                  mat instanceof THREE.MeshPhongMaterial ||
                  mat instanceof THREE.MeshLambertMaterial) {
                mat.flatShading = true;
                mat.needsUpdate = true;
              }
            }
          }
        });

        gltfCache.set(type, model);
      },
      undefined,
      () => {
        // Model not available — procedural geometry will be used
      },
    );
  }
}

export function getGltfModel(type: TDEnemyType): THREE.Group | null {
  const cached = gltfCache.get(type);
  return cached ? cached.clone() : null;
}

// ========== Mob Type Heights ==========

export const MOB_HEIGHTS: Record<TDEnemyType, number> = {
  zombie: 1.9,
  skeleton: 1.9,
  creeper: 1.6,
  spider: 0.8,
  enderman: 2.8,
  slime: 0.24,
  magma_cube: 0.78,
  pig: 0.9,
  chicken: 0.7,
  cow: 1.2,
  bee: 0.5,
  cat: 0.6,
  horse: 1.4,
  rabbit: 0.5,
  wolf: 0.8,
};

/**
 * Dispose all shared resources (call on component unmount).
 */
export function disposeSharedMobResources(): void {
  for (const geo of geoCache.values()) geo.dispose();
  for (const mat of matCache.values()) mat.dispose();
  for (const mat of physMatCache.values()) mat.dispose();
  geoCache.clear();
  matCache.clear();
  physMatCache.clear();
  gltfCache.clear();
  gltfAttempted.clear();
}

/**
 * Dispose a mob group — removes all children and disposes non-shared geometries.
 * Shared geometries/materials from the cache are NOT disposed (they persist).
 */
export function disposeMobGroup(mob: MobMeshData): void {
  mob.group.traverse((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh) {
      // Only dispose geometry/materials for GLTF models (they own their resources).
      // Procedural mobs share cached geometry/materials — disposed via disposeSharedMobResources.
      if (mob.isGltf) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m: THREE.Material) => m.dispose());
        } else if (child.material) {
          (child.material as THREE.Material).dispose();
        }
      }
    }
  });
}
