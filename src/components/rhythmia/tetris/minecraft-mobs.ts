/**
 * Minecraft-style pixelized mob geometry builders for TD phase enemies.
 *
 * Each mob type is built from articulated box groups that mimic classic
 * Minecraft proportions (head, body, limbs) with flat-shaded materials.
 *
 * Supports optional GLTF model overrides: place .glb files at
 * /public/models/mobs/{type}.glb to use custom models instead.
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

const geoCache = new Map<string, THREE.BoxGeometry>();
const matCache = new Map<string, THREE.MeshStandardMaterial>();
const physMatCache = new Map<string, THREE.MeshPhysicalMaterial>();

function getGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  let geo = geoCache.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, geo);
  }
  return geo;
}

interface MatOpts {
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
}

function getMat(
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

interface PhysMatOpts {
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  transparent?: boolean;
  opacity?: number;
}

function getPhysicalMat(
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
function mbox(
  w: number, h: number, d: number,
  color: number,
  emissive = 0x000000, emissiveIntensity = 0,
  opts?: MatOpts,
): THREE.Mesh {
  return new THREE.Mesh(getGeo(w, h, d), getMat(color, emissive, emissiveIntensity, opts));
}

/** Create a box mesh with MeshPhysicalMaterial. */
function mboxPhys(
  w: number, h: number, d: number,
  color: number,
  emissive = 0x000000, emissiveIntensity = 0,
  opts?: PhysMatOpts,
): THREE.Mesh {
  return new THREE.Mesh(getGeo(w, h, d), getPhysicalMat(color, emissive, emissiveIntensity, opts));
}

/** Create an articulated limb group with pivot at (offsetX, pivotY, offsetZ). */
function limb(
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

function getGltfModel(type: TDEnemyType): THREE.Group | null {
  const cached = gltfCache.get(type);
  return cached ? cached.clone() : null;
}

// ========== Mob Type Heights ==========

const MOB_HEIGHTS: Record<TDEnemyType, number> = {
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

// ========== Procedural Mob Builders ==========

function createZombie(): MobMeshData {
  const group = new THREE.Group();
  const skin = 0x5b8731;
  const shirt = 0x2a9d8f;
  const pants = 0x3b55a0;

  // Head — slight emissive for undead glow
  const head = mbox(0.5, 0.5, 0.5, skin, 0x2a4a15, 0.15, { roughness: 0.9, metalness: 0.05 });
  head.position.set(0, 1.65, 0);
  group.add(head);

  // Eyes — faint green emissive for eerie look
  const le = mbox(0.12, 0.06, 0.02, 0x111111, 0x1a3a0a, 0.5);
  le.position.set(-0.12, 1.68, -0.26);
  group.add(le);
  const re = mbox(0.12, 0.06, 0.02, 0x111111, 0x1a3a0a, 0.5);
  re.position.set(0.12, 1.68, -0.26);
  group.add(re);

  // Body
  const body = mbox(0.5, 0.7, 0.3, shirt, 0x000000, 0, { roughness: 0.8 });
  body.position.set(0, 1.05, 0);
  group.add(body);

  // Ember spots on body (flame tower visual — glowing hot patches)
  const ember1 = mbox(0.08, 0.08, 0.01, 0xff4400, 0xff4400, 1.5);
  ember1.position.set(-0.15, 1.2, -0.16);
  group.add(ember1);
  const ember2 = mbox(0.06, 0.06, 0.01, 0xff6600, 0xff6600, 1.2);
  ember2.position.set(0.1, 0.9, -0.16);
  group.add(ember2);

  // Arms (extended forward) — hands glow with heat
  const leftArm = limb(0.25, 0.7, 0.25, skin, 1.4, -0.375, 0, { roughness: 0.85 });
  leftArm.rotation.x = -Math.PI / 3;
  group.add(leftArm);
  const rightArm = limb(0.25, 0.7, 0.25, skin, 1.4, 0.375, 0, { roughness: 0.85 });
  rightArm.rotation.x = -Math.PI / 3;
  group.add(rightArm);

  // Hand glow (emissive tips on arms for flame tower heat)
  const lHand = mbox(0.2, 0.15, 0.2, 0xcc4400, 0xff4400, 1.0);
  lHand.position.set(-0.375, 0.75, -0.45);
  group.add(lHand);
  const rHand = mbox(0.2, 0.15, 0.2, 0xcc4400, 0xff4400, 1.0);
  rHand.position.set(0.375, 0.75, -0.45);
  group.add(rHand);

  // Legs
  const leftLeg = limb(0.24, 0.7, 0.25, pants, 0.7, -0.13);
  group.add(leftLeg);
  const rightLeg = limb(0.24, 0.7, 0.25, pants, 0.7, 0.13);
  group.add(rightLeg);

  return {
    group, type: 'zombie',
    leftArm, rightArm, leftLeg, rightLeg,
    height: 1.9, isGltf: false,
  };
}

function createSkeleton(): MobMeshData {
  const group = new THREE.Group();
  const bone = 0xd4c8a8;
  const boneLight = 0xe0d8c0;
  const dark = 0x2a2520;
  const boneOpts: MatOpts = { roughness: 0.95, metalness: 0.05 };
  const boneLimbOpts: MatOpts = { roughness: 0.9, metalness: 0.08 };

  // Head — slightly lighter skull with rough bone texture
  const head = mbox(0.5, 0.5, 0.5, boneLight, 0x000000, 0, boneOpts);
  head.position.set(0, 1.65, 0);
  group.add(head);

  // Eye sockets (dark holes with faint red emissive)
  const le = mbox(0.1, 0.08, 0.02, dark, 0x110808, 0.3);
  le.position.set(-0.12, 1.68, -0.26);
  group.add(le);
  const re = mbox(0.1, 0.08, 0.02, dark, 0x110808, 0.3);
  re.position.set(0.12, 1.68, -0.26);
  group.add(re);
  // Nose hole
  const nose = mbox(0.06, 0.06, 0.02, dark);
  nose.position.set(0, 1.62, -0.26);
  group.add(nose);

  // Body (thin ribcage) — rough bone
  const body = mbox(0.35, 0.7, 0.2, bone, 0x000000, 0, boneOpts);
  body.position.set(0, 1.05, 0);
  group.add(body);
  // Rib detail (darker stripes)
  const rib = mbox(0.36, 0.08, 0.21, dark, 0x000000, 0, { roughness: 0.8 });
  rib.position.set(0, 1.1, 0);
  group.add(rib);
  const rib2 = mbox(0.36, 0.06, 0.21, 0x3a3530, 0x000000, 0, { roughness: 0.8 });
  rib2.position.set(0, 0.95, 0);
  group.add(rib2);

  // Arms (thin) — varied roughness for bone texture
  const leftArm = limb(0.15, 0.7, 0.15, bone, 1.4, -0.25, 0, boneLimbOpts);
  group.add(leftArm);
  const rightArm = limb(0.15, 0.7, 0.15, bone, 1.4, 0.25, 0, boneLimbOpts);
  group.add(rightArm);

  // Legs (thin)
  const leftLeg = limb(0.15, 0.7, 0.15, bone, 0.7, -0.1, 0, boneLimbOpts);
  group.add(leftLeg);
  const rightLeg = limb(0.15, 0.7, 0.15, bone, 0.7, 0.1, 0, boneLimbOpts);
  group.add(rightLeg);

  // Quiver (leather-brown detail on back)
  const quiver = mbox(0.1, 0.4, 0.1, 0x6b4226, 0x000000, 0, { roughness: 0.95 });
  quiver.position.set(0.12, 1.15, 0.15);
  group.add(quiver);
  // Arrow tips poking out of quiver
  const arrowTip = mbox(0.03, 0.08, 0.03, 0x888888, 0x000000, 0, { roughness: 0.3, metalness: 0.5 });
  arrowTip.position.set(0.12, 1.4, 0.15);
  group.add(arrowTip);

  return {
    group, type: 'skeleton',
    leftArm, rightArm, leftLeg, rightLeg,
    height: 1.9, isGltf: false,
  };
}

function createCreeper(): MobMeshData {
  const group = new THREE.Group();
  const green = 0x4caf50;
  const darkGreen = 0x388e3c;
  const face = 0x1a1a1a;

  // Head
  const head = mbox(0.5, 0.5, 0.5, green, 0x1b5e20, 0.1);
  head.position.set(0, 1.35, 0);
  group.add(head);

  // Creeper face — distinctive sad/angry pixel face
  // Eyes (two vertical rectangles)
  const le = mbox(0.1, 0.12, 0.02, face);
  le.position.set(-0.1, 1.4, -0.26);
  group.add(le);
  const re = mbox(0.1, 0.12, 0.02, face);
  re.position.set(0.1, 1.4, -0.26);
  group.add(re);
  // Mouth (inverted T shape)
  const mouthTop = mbox(0.14, 0.06, 0.02, face);
  mouthTop.position.set(0, 1.3, -0.26);
  group.add(mouthTop);
  const mouthBot = mbox(0.08, 0.08, 0.02, face);
  mouthBot.position.set(0, 1.24, -0.26);
  group.add(mouthBot);

  // Body (no arms)
  const body = mbox(0.5, 0.6, 0.3, green);
  body.position.set(0, 0.85, 0);
  group.add(body);

  // 4 legs (front pair + back pair)
  const frontLeftLeg = limb(0.2, 0.55, 0.2, darkGreen, 0.55, -0.15, -0.05);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.2, 0.55, 0.2, darkGreen, 0.55, 0.15, -0.05);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.2, 0.55, 0.2, darkGreen, 0.55, -0.15, 0.05);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.2, 0.55, 0.2, darkGreen, 0.55, 0.15, 0.05);
  group.add(backRightLeg);

  return {
    group, type: 'creeper',
    frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg,
    height: 1.6, isGltf: false,
  };
}

function createSpider(): MobMeshData {
  const group = new THREE.Group();
  const darkBrown = 0x3e2723;
  const brown = 0x5d4037;
  const legColor = 0x4e342e;
  const eyeColor = 0xff0000;

  // Body (abdomen — wide and flat)
  const abdomen = mbox(0.7, 0.35, 0.85, darkBrown);
  abdomen.position.set(0, 0.38, 0.15);
  group.add(abdomen);

  // Head (smaller)
  const head = mbox(0.45, 0.35, 0.4, brown);
  head.position.set(0, 0.42, -0.45);
  group.add(head);

  // Eyes (red glow — 2 pairs)
  const eyePositions = [
    [-0.1, 0.5, -0.66], [0.1, 0.5, -0.66],
    [-0.15, 0.46, -0.66], [0.15, 0.46, -0.66],
  ];
  const eyes: THREE.Mesh[] = [];
  for (const [ex, ey, ez] of eyePositions) {
    const eye = mbox(0.06, 0.06, 0.02, eyeColor, eyeColor, 2.0);
    eye.position.set(ex, ey, ez);
    group.add(eye);
    eyes.push(eye);
  }

  // 8 legs — 4 on each side, angled outward
  const spiderLegs: THREE.Group[] = [];
  const legZOffsets = [-0.3, -0.1, 0.1, 0.3];

  for (let side = -1; side <= 1; side += 2) {
    for (let li = 0; li < 4; li++) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.35, 0.35, legZOffsets[li]);

      // Upper leg segment
      const upper = mbox(0.08, 0.45, 0.08, legColor);
      upper.position.set(side * 0.2, 0, 0);
      upper.rotation.z = side * -0.9; // angle outward
      legGroup.add(upper);

      // Lower leg segment
      const lower = mbox(0.06, 0.35, 0.06, legColor);
      lower.position.set(side * 0.42, -0.2, 0);
      lower.rotation.z = side * 0.4; // angle downward
      legGroup.add(lower);

      group.add(legGroup);
      spiderLegs.push(legGroup);
    }
  }

  return {
    group, type: 'spider',
    spiderLegs,
    height: 0.8, isGltf: false,
  };
}

function createEnderman(): MobMeshData {
  const group = new THREE.Group();
  const black = 0x1a1a2e;
  const purple = 0xcc00ff;
  const darkPurple = 0x220044;
  const bodyOpts: MatOpts = { roughness: 0.6, metalness: 0.25 };
  const limbOpts: MatOpts = { roughness: 0.55, metalness: 0.3 };

  // Head — metallic dark surface with purple emissive tint
  const head = mbox(0.5, 0.45, 0.5, black, darkPurple, 0.25, bodyOpts);
  head.position.set(0, 2.55, 0);
  group.add(head);

  // Eyes (glowing purple — intensified)
  const le = mbox(0.14, 0.06, 0.02, purple, purple, 4.0);
  le.position.set(-0.12, 2.56, -0.26);
  group.add(le);
  const re = mbox(0.14, 0.06, 0.02, purple, purple, 4.0);
  re.position.set(0.12, 2.56, -0.26);
  group.add(re);

  // Body (thin and tall) — metallic sheen
  const body = mbox(0.4, 0.8, 0.25, black, darkPurple, 0.15, bodyOpts);
  body.position.set(0, 1.93, 0);
  group.add(body);

  // Purple energy vein on chest
  const vein = mbox(0.05, 0.5, 0.01, purple, purple, 2.5);
  vein.position.set(0, 1.93, -0.131);
  group.add(vein);

  // Arms (very long and thin) — metallic
  const leftArm = limb(0.12, 1.1, 0.12, black, 2.33, -0.26, 0, limbOpts);
  group.add(leftArm);
  const rightArm = limb(0.12, 1.1, 0.12, black, 2.33, 0.26, 0, limbOpts);
  group.add(rightArm);

  // Legs (very long and thin) — metallic
  const leftLeg = limb(0.15, 1.2, 0.15, black, 1.25, -0.1, 0, limbOpts);
  group.add(leftLeg);
  const rightLeg = limb(0.15, 1.2, 0.15, black, 1.25, 0.1, 0, limbOpts);
  group.add(rightLeg);

  // Purple particle accents at hands (small emissive cubes)
  const lParticle = mbox(0.06, 0.06, 0.06, purple, purple, 3.0);
  lParticle.position.set(-0.26, 1.2, 0);
  group.add(lParticle);
  const rParticle = mbox(0.06, 0.06, 0.06, purple, purple, 3.0);
  rParticle.position.set(0.26, 1.2, 0);
  group.add(rParticle);

  return {
    group, type: 'enderman',
    leftArm, rightArm, leftLeg, rightLeg,
    height: 2.8, isGltf: false,
  };
}

// ========== Slime ==========

function createSlime(segments = 3): MobMeshData {
  const group = new THREE.Group();
  // Frost slime palette — icy blue-green instead of plain green
  const slimeIce = 0x7dd3fc;
  const slimeCore = 0x38bdf8;
  const eyeColor = 0x111111;

  // Stacked slime segments — shrink as they go up (like magma cube)
  const widths  = [0.45, 0.37, 0.29]; // bottom, middle, top
  const heights = [0.24, 0.20, 0.16];
  const gapH = 0.03; // small gap between stacked slimes
  let y = 0;

  for (let i = 0; i < segments; i++) {
    const w = widths[i], h = heights[i];

    // Outer gelatinous body — MeshPhysicalMaterial with clearcoat for ice effect
    const body = mboxPhys(w, h, w, slimeIce, slimeIce, 0.4, {
      roughness: 0.15,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.7,
    });
    body.position.set(0, y + h / 2, 0);
    group.add(body);

    // Inner core — slightly visible through transparent shell
    const coreW = w * 0.5, coreH = h * 0.5;
    const core = mbox(coreW, coreH, coreW, slimeCore, slimeCore, 0.3);
    core.position.set(0, y + h * 0.42, 0);
    group.add(core);

    y += h;
    if (i < segments - 1) y += gapH;
  }

  // Eyes on the topmost segment
  const topW = widths[segments - 1];
  const topH = heights[segments - 1];
  const eyeY = y - topH / 2 + topH * 0.15;
  const eyeZ = -(topW / 2 + 0.01);
  const le = mbox(0.07, 0.05, 0.02, eyeColor);
  le.position.set(-0.07, eyeY, eyeZ);
  group.add(le);
  const re = mbox(0.07, 0.05, 0.02, eyeColor);
  re.position.set(0.07, eyeY, eyeZ);
  group.add(re);

  // Mouth on the topmost segment
  const mouth = mbox(0.12, 0.025, 0.02, eyeColor);
  mouth.position.set(0, eyeY - topH * 0.25, eyeZ);
  group.add(mouth);

  // Height: seg1=0.24, seg2=0.24+0.03+0.20=0.47, seg3=0.47+0.03+0.16=0.66
  return {
    group, type: 'slime',
    height: y, isGltf: false,
  };
}

// ========== Magma Cube ==========

function createMagmaCube(segments = 3): MobMeshData {
  const group = new THREE.Group();
  // Minecraft magma cube palette — enhanced emissive values
  const shell = 0x2a1a0a;       // Dark charred shell
  const shellDark = 0x1a0e04;   // Darker variation for bottom segments
  const magma = 0xff6600;       // Bright orange magma in seams
  const magmaGlow = 0xff4400;   // Inner glow
  const magmaYellow = 0xffaa00; // Hottest parts of seams
  const magmaWhite = 0xffcc44;  // White-hot highlights
  const eyeColor = 0xff8800;    // Orange-yellow eyes
  const shellOpts: MatOpts = { roughness: 0.95, metalness: 0.1 };

  // Segment widths and heights — flat slabs (height ≈ 50% of width)
  const widths  = [0.55, 0.45, 0.35]; // bottom, middle, top
  const heights = [0.28, 0.24, 0.18]; // flat enough to stack next to each other
  const seamH = 0.04;
  let y = 0; // running Y position (bottom of current segment)

  // --- Segment 1 (bottom, always present) ---
  const w1 = widths[0], h1 = heights[0];
  const bottom = mbox(w1, h1, w1, shellDark, magmaGlow, 0.2, shellOpts);
  bottom.position.set(0, y + h1 / 2, 0);
  group.add(bottom);

  // Bottom face glow — intensified
  const bottomGlow = mbox(w1 * 0.6, 0.01, w1 * 0.6, magma, magma, 3.0);
  bottomGlow.position.set(0, 0.005, 0);
  group.add(bottomGlow);

  // Cracks on bottom segment — stronger glow
  const btmCrackF = mbox(0.03, h1 * 0.6, 0.005, magma, magma, 3.0);
  btmCrackF.position.set(0.08, y + h1 / 2, -(w1 / 2 + 0.001));
  group.add(btmCrackF);
  const btmCrackR = mbox(0.005, h1 * 0.5, 0.03, magmaYellow, magmaYellow, 3.0);
  btmCrackR.position.set(w1 / 2 + 0.001, y + h1 * 0.45, -0.06);
  group.add(btmCrackR);
  // Additional crack on left side
  const btmCrackL = mbox(0.005, h1 * 0.4, 0.03, magmaWhite, magmaWhite, 3.5);
  btmCrackL.position.set(-(w1 / 2 + 0.001), y + h1 * 0.55, 0.05);
  group.add(btmCrackL);

  y += h1;

  if (segments >= 2) {
    // --- Seam 1 — intensified glow ---
    const seamW1 = widths[0] * 0.9;
    const seam1 = mbox(seamW1, seamH, seamW1, magma, magma, 3.5);
    seam1.position.set(0, y + seamH / 2, 0);
    group.add(seam1);
    const seam1X = mbox(seamW1 * 1.05, seamH, 0.04, magmaYellow, magmaYellow, 4.0);
    seam1X.position.set(0, y + seamH / 2, 0);
    group.add(seam1X);
    const seam1Z = mbox(0.04, seamH, seamW1 * 1.05, magmaYellow, magmaYellow, 4.0);
    seam1Z.position.set(0, y + seamH / 2, 0);
    group.add(seam1Z);
    y += seamH;

    // --- Segment 2 (middle) ---
    const w2 = widths[1], h2 = heights[1];
    const middle = mbox(w2, h2, w2, shell, magmaGlow, 0.18, shellOpts);
    middle.position.set(0, y + h2 / 2, 0);
    group.add(middle);

    // Cracks on middle segment — enhanced
    const midCrackF = mbox(0.03, h2 * 0.7, 0.005, magma, magma, 3.0);
    midCrackF.position.set(0.06, y + h2 / 2, -(w2 / 2 + 0.001));
    group.add(midCrackF);
    const midCrackF2 = mbox(0.03, h2 * 0.5, 0.005, magmaWhite, magmaWhite, 3.5);
    midCrackF2.position.set(-0.1, y + h2 * 0.4, -(w2 / 2 + 0.001));
    group.add(midCrackF2);
    const midCrackB = mbox(0.03, h2 * 0.55, 0.005, magma, magma, 3.0);
    midCrackB.position.set(-0.05, y + h2 / 2, w2 / 2 + 0.001);
    group.add(midCrackB);
    const midCrackL = mbox(0.005, h2 * 0.6, 0.03, magma, magma, 3.0);
    midCrackL.position.set(-(w2 / 2 + 0.001), y + h2 * 0.45, 0.08);
    group.add(midCrackL);
    const midCrackR = mbox(0.005, h2 * 0.5, 0.03, magmaYellow, magmaYellow, 3.0);
    midCrackR.position.set(w2 / 2 + 0.001, y + h2 / 2, -0.06);
    group.add(midCrackR);

    y += h2;
  }

  if (segments >= 3) {
    // --- Seam 2 — intensified ---
    const seamW2 = widths[1] * 0.9;
    const seam2 = mbox(seamW2, seamH, seamW2, magma, magma, 3.5);
    seam2.position.set(0, y + seamH / 2, 0);
    group.add(seam2);
    const seam2X = mbox(seamW2 * 1.05, seamH, 0.04, magmaYellow, magmaYellow, 4.0);
    seam2X.position.set(0, y + seamH / 2, 0);
    group.add(seam2X);
    const seam2Z = mbox(0.04, seamH, seamW2 * 1.05, magmaYellow, magmaYellow, 4.0);
    seam2Z.position.set(0, y + seamH / 2, 0);
    group.add(seam2Z);
    y += seamH;

    // --- Segment 3 (top — the "head") ---
    const w3 = widths[2], h3 = heights[2];
    const top = mbox(w3, h3, w3, shell, magmaGlow, 0.15, shellOpts);
    top.position.set(0, y + h3 / 2, 0);
    group.add(top);

    // Cracks on top segment — enhanced
    const topCrackF = mbox(0.03, h3 * 0.65, 0.005, magma, magma, 2.5);
    topCrackF.position.set(-0.04, y + h3 / 2, -(w3 / 2 + 0.001));
    group.add(topCrackF);
    const topCrackR = mbox(0.005, h3 * 0.55, 0.03, magmaWhite, magmaWhite, 3.0);
    topCrackR.position.set(w3 / 2 + 0.001, y + h3 * 0.45, 0.04);
    group.add(topCrackR);

    y += h3;
  }

  // --- Eyes (always on the topmost segment) — brighter ---
  const topW = widths[segments - 1];
  const topH = heights[segments - 1];
  const eyeY = y - topH / 2 + topH * 0.15;
  const eyeZ = -(topW / 2 + 0.01);
  const le = mbox(0.08, 0.06, 0.02, eyeColor, eyeColor, 4.5);
  le.position.set(-0.08, eyeY, eyeZ);
  group.add(le);
  const re = mbox(0.08, 0.06, 0.02, eyeColor, eyeColor, 4.5);
  re.position.set(0.08, eyeY, eyeZ);
  group.add(re);

  // --- Inner core (glowing magma visible through seams and cracks) — intensified ---
  const coreH = y * 0.6;
  const core = mbox(0.2, coreH, 0.2, magmaGlow, magmaGlow, 2.0);
  core.position.set(0, y * 0.45, 0);
  group.add(core);

  // Height: seg1=0.28, seg2=0.28+0.04+0.24=0.56, seg3=0.56+0.04+0.18=0.78
  const height = y;

  return {
    group, type: 'magma_cube',
    height, isGltf: false,
  };
}

// ========== Animal Mobs ==========

function createPig(): MobMeshData {
  const group = new THREE.Group();
  const pink = 0xf0a0a0;
  const darkPink = 0xd08888;
  const snout = 0xe8c0c0;

  // Head — slightly lower roughness for smooth skin
  const head = mbox(0.4, 0.35, 0.35, pink, 0x000000, 0, { roughness: 0.7 });
  head.position.set(0, 0.65, -0.3);
  group.add(head);

  // Snout — glossy wet nose
  const nose = mbox(0.2, 0.15, 0.1, snout, 0x000000, 0, { roughness: 0.35, metalness: 0.05 });
  nose.position.set(0, 0.6, -0.52);
  group.add(nose);

  // Nostrils
  const nl = mbox(0.04, 0.04, 0.02, darkPink, 0x000000, 0, { roughness: 0.3 });
  nl.position.set(-0.04, 0.6, -0.58);
  group.add(nl);
  const nr = mbox(0.04, 0.04, 0.02, darkPink, 0x000000, 0, { roughness: 0.3 });
  nr.position.set(0.04, 0.6, -0.58);
  group.add(nr);

  // Eyes — emissive glow
  const le = mbox(0.06, 0.06, 0.02, 0x111111, 0x221100, 0.4, { roughness: 0.3 });
  le.position.set(-0.1, 0.7, -0.48);
  group.add(le);
  const re = mbox(0.06, 0.06, 0.02, 0x111111, 0x221100, 0.4, { roughness: 0.3 });
  re.position.set(0.1, 0.7, -0.48);
  group.add(re);

  // Body — standard pig skin roughness
  const body = mbox(0.45, 0.4, 0.6, pink, 0x000000, 0, { roughness: 0.75 });
  body.position.set(0, 0.5, 0.05);
  group.add(body);

  // Legs — slightly rougher hooves
  const legOpts: MatOpts = { roughness: 0.8 };
  const frontLeftLeg = limb(0.15, 0.3, 0.15, darkPink, 0.3, -0.15, -0.15, legOpts);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.15, 0.3, 0.15, darkPink, 0.3, 0.15, -0.15, legOpts);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.15, 0.3, 0.15, darkPink, 0.3, -0.15, 0.25, legOpts);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.15, 0.3, 0.15, darkPink, 0.3, 0.15, 0.25, legOpts);
  group.add(backRightLeg);

  return {
    group, type: 'pig',
    frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg,
    height: 0.9, isGltf: false,
  };
}

function createChicken(): MobMeshData {
  const group = new THREE.Group();
  const white = 0xf5f5f0;
  const beak = 0xe8a020;
  const wattle = 0xcc3333;
  const legColor = 0xd0a030;
  const featherOpts: MatOpts = { roughness: 0.92 }; // soft feather-like roughness

  // Head
  const head = mbox(0.2, 0.22, 0.2, white, 0x000000, 0, featherOpts);
  head.position.set(0, 0.58, -0.15);
  group.add(head);

  // Beak — glossy keratin
  const beakMesh = mbox(0.08, 0.06, 0.1, beak, 0x553300, 0.15, { roughness: 0.3 });
  beakMesh.position.set(0, 0.54, -0.3);
  group.add(beakMesh);

  // Wattle — bright, slightly glossy red flesh
  const wattleMesh = mbox(0.06, 0.08, 0.04, wattle, 0xcc3333, 0.2, { roughness: 0.45 });
  wattleMesh.position.set(0, 0.48, -0.27);
  group.add(wattleMesh);

  // Comb — bright emissive red
  const comb = mbox(0.04, 0.08, 0.1, wattle, 0xcc3333, 0.25, { roughness: 0.45 });
  comb.position.set(0, 0.72, -0.15);
  group.add(comb);

  // Eyes — emissive glow
  const le = mbox(0.04, 0.04, 0.02, 0x111111, 0x221100, 0.4, { roughness: 0.3 });
  le.position.set(-0.08, 0.6, -0.26);
  group.add(le);
  const re = mbox(0.04, 0.04, 0.02, 0x111111, 0x221100, 0.4, { roughness: 0.3 });
  re.position.set(0.08, 0.6, -0.26);
  group.add(re);

  // Body — feathery roughness
  const body = mbox(0.3, 0.3, 0.4, white, 0x000000, 0, featherOpts);
  body.position.set(0, 0.35, 0.05);
  group.add(body);

  // Wings — slightly different tone
  const lw = mbox(0.04, 0.2, 0.25, 0xe0e0d8, 0x000000, 0, { roughness: 0.95 });
  lw.position.set(-0.18, 0.38, 0.05);
  group.add(lw);
  const rw = mbox(0.04, 0.2, 0.25, 0xe0e0d8, 0x000000, 0, { roughness: 0.95 });
  rw.position.set(0.18, 0.38, 0.05);
  group.add(rw);

  // Tail feathers
  const tail = mbox(0.1, 0.15, 0.08, white, 0x000000, 0, featherOpts);
  tail.position.set(0, 0.45, 0.28);
  tail.rotation.x = -0.3;
  group.add(tail);

  // Legs — scaly texture, slightly glossy
  const legOpts: MatOpts = { roughness: 0.5 };
  const leftLeg = limb(0.06, 0.2, 0.06, legColor, 0.2, -0.08, 0, legOpts);
  group.add(leftLeg);
  const rightLeg = limb(0.06, 0.2, 0.06, legColor, 0.2, 0.08, 0, legOpts);
  group.add(rightLeg);

  return {
    group, type: 'chicken',
    leftLeg, rightLeg,
    height: 0.7, isGltf: false,
  };
}

function createCow(): MobMeshData {
  const group = new THREE.Group();
  const white = 0xf0f0e8;
  const brown = 0x4a3728;
  const skin = 0xc0a888;
  const horn = 0xe8dcc0;
  const hideOpts: MatOpts = { roughness: 0.9 }; // leathery hide
  const patchOpts: MatOpts = { roughness: 0.75 }; // slightly smoother brown patches

  // Head — leathery
  const head = mbox(0.4, 0.35, 0.35, white, 0x000000, 0, hideOpts);
  head.position.set(0, 0.95, -0.45);
  group.add(head);

  // Snout — wet muzzle, lower roughness
  const snoutMesh = mbox(0.25, 0.15, 0.1, skin, 0x000000, 0, { roughness: 0.4, metalness: 0.05 });
  snoutMesh.position.set(0, 0.88, -0.66);
  group.add(snoutMesh);

  // Horns — smooth keratin
  const hornOpts: MatOpts = { roughness: 0.4, metalness: 0.08 };
  const lh = mbox(0.06, 0.15, 0.06, horn, 0x000000, 0, hornOpts);
  lh.position.set(-0.18, 1.18, -0.42);
  lh.rotation.z = 0.3;
  group.add(lh);
  const rh = mbox(0.06, 0.15, 0.06, horn, 0x000000, 0, hornOpts);
  rh.position.set(0.18, 1.18, -0.42);
  rh.rotation.z = -0.3;
  group.add(rh);

  // Eyes — emissive glow
  const le = mbox(0.06, 0.06, 0.02, 0x111111, 0x221100, 0.35, { roughness: 0.3 });
  le.position.set(-0.1, 1.0, -0.63);
  group.add(le);
  const re = mbox(0.06, 0.06, 0.02, 0x111111, 0x221100, 0.35, { roughness: 0.3 });
  re.position.set(0.1, 1.0, -0.63);
  group.add(re);

  // Body — leathery hide
  const body = mbox(0.55, 0.5, 0.8, white, 0x000000, 0, hideOpts);
  body.position.set(0, 0.7, 0.0);
  group.add(body);

  // Brown patches — distinct roughness for visible pattern
  const patch1 = mbox(0.3, 0.25, 0.35, brown, 0x000000, 0, patchOpts);
  patch1.position.set(-0.14, 0.78, -0.1);
  group.add(patch1);
  const patch2 = mbox(0.25, 0.2, 0.3, brown, 0x000000, 0, patchOpts);
  patch2.position.set(0.12, 0.65, 0.15);
  group.add(patch2);

  // Legs — leathery hide
  const frontLeftLeg = limb(0.15, 0.45, 0.15, white, 0.45, -0.2, -0.25, hideOpts);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.15, 0.45, 0.15, white, 0.45, 0.2, -0.25, hideOpts);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.15, 0.45, 0.15, white, 0.45, -0.2, 0.25, hideOpts);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.15, 0.45, 0.15, white, 0.45, 0.2, 0.25, hideOpts);
  group.add(backRightLeg);

  return {
    group, type: 'cow',
    frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg,
    height: 1.2, isGltf: false,
  };
}

function createBee(): MobMeshData {
  const group = new THREE.Group();
  const yellow = 0xf0c830;
  const black = 0x222222;
  const wing = 0xc0e0ff;
  // Glossy chitin exoskeleton
  const chitinOpts: MatOpts = { roughness: 0.3, metalness: 0.1 };

  // Body (striped) — glossy chitin
  const bodyFront = mbox(0.2, 0.2, 0.15, yellow, 0x443300, 0.08, chitinOpts);
  bodyFront.position.set(0, 0.3, -0.08);
  group.add(bodyFront);
  const bodyStripe = mbox(0.21, 0.21, 0.08, black, 0x000000, 0, chitinOpts);
  bodyStripe.position.set(0, 0.3, 0.02);
  group.add(bodyStripe);
  const bodyBack = mbox(0.2, 0.2, 0.15, yellow, 0x443300, 0.08, chitinOpts);
  bodyBack.position.set(0, 0.3, 0.12);
  group.add(bodyBack);

  // Stinger — dark glossy
  const stinger = mbox(0.04, 0.04, 0.08, 0x333333, 0x000000, 0, { roughness: 0.25 });
  stinger.position.set(0, 0.28, 0.24);
  group.add(stinger);

  // Head — chitin
  const head = mbox(0.18, 0.18, 0.12, yellow, 0x443300, 0.05, chitinOpts);
  head.position.set(0, 0.32, -0.2);
  group.add(head);

  // Eyes — emissive glow
  const le = mbox(0.06, 0.06, 0.02, 0x111111, 0x221100, 0.5, { roughness: 0.2 });
  le.position.set(-0.06, 0.34, -0.27);
  group.add(le);
  const re = mbox(0.06, 0.06, 0.02, 0x111111, 0x221100, 0.5, { roughness: 0.2 });
  re.position.set(0.06, 0.34, -0.27);
  group.add(re);

  // Antennae
  const la = mbox(0.02, 0.1, 0.02, black, 0x000000, 0, chitinOpts);
  la.position.set(-0.05, 0.46, -0.22);
  la.rotation.z = 0.3;
  group.add(la);
  const ra = mbox(0.02, 0.1, 0.02, black, 0x000000, 0, chitinOpts);
  ra.position.set(0.05, 0.46, -0.22);
  ra.rotation.z = -0.3;
  group.add(ra);

  // Wings — MeshPhysicalMaterial with transmission for translucency
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.12, 0.42, 0.0);
  const lwMesh = new THREE.Mesh(
    getGeo(0.18, 0.02, 0.12),
    getPhysicalMat(wing, wing, 0.5, {
      roughness: 0.1,
      transmission: 0.6,
      thickness: 0.05,
      transparent: true,
      opacity: 0.55,
    }),
  );
  lwMesh.position.set(-0.09, 0, 0);
  leftArm.add(lwMesh);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.12, 0.42, 0.0);
  const rwMesh = new THREE.Mesh(
    getGeo(0.18, 0.02, 0.12),
    getPhysicalMat(wing, wing, 0.5, {
      roughness: 0.1,
      transmission: 0.6,
      thickness: 0.05,
      transparent: true,
      opacity: 0.55,
    }),
  );
  rwMesh.position.set(0.09, 0, 0);
  rightArm.add(rwMesh);
  group.add(rightArm);

  return {
    group, type: 'bee',
    leftArm, rightArm,
    height: 0.5, isGltf: false,
  };
}

function createCat(): MobMeshData {
  const group = new THREE.Group();
  const orange = 0xe8a050;
  const darkOrange = 0xc08040;
  const belly = 0xf0d8b0;
  const furOpts: MatOpts = { roughness: 0.95 }; // soft fur

  // Head — fuzzy
  const head = mbox(0.25, 0.2, 0.2, orange, 0x000000, 0, furOpts);
  head.position.set(0, 0.5, -0.2);
  group.add(head);

  // Ears
  const learBox = mbox(0.06, 0.1, 0.04, darkOrange, 0x000000, 0, furOpts);
  learBox.position.set(-0.1, 0.65, -0.2);
  learBox.rotation.z = 0.2;
  group.add(learBox);
  const rearBox = mbox(0.06, 0.1, 0.04, darkOrange, 0x000000, 0, furOpts);
  rearBox.position.set(0.1, 0.65, -0.2);
  rearBox.rotation.z = -0.2;
  group.add(rearBox);

  // Eyes — bright green emissive glow (cat-like)
  const le = mbox(0.05, 0.04, 0.02, 0x22cc44, 0x22cc44, 0.8, { roughness: 0.2 });
  le.position.set(-0.06, 0.52, -0.31);
  group.add(le);
  const re = mbox(0.05, 0.04, 0.02, 0x22cc44, 0x22cc44, 0.8, { roughness: 0.2 });
  re.position.set(0.06, 0.52, -0.31);
  group.add(re);

  // Nose — glossy pink
  const nose = mbox(0.04, 0.03, 0.02, 0xdd7788, 0x000000, 0, { roughness: 0.35 });
  nose.position.set(0, 0.47, -0.31);
  group.add(nose);

  // Body — fuzzy fur
  const body = mbox(0.22, 0.2, 0.45, orange, 0x000000, 0, furOpts);
  body.position.set(0, 0.35, 0.1);
  group.add(body);

  // Healing aura collar — glowing green band around neck
  const collar = mbox(0.24, 0.04, 0.22, 0x44dd66, 0x44dd66, 1.5, { roughness: 0.3 });
  collar.position.set(0, 0.46, -0.05);
  group.add(collar);

  // Belly stripe — soft
  const bellyMesh = mbox(0.16, 0.12, 0.35, belly, 0x000000, 0, furOpts);
  bellyMesh.position.set(0, 0.28, 0.1);
  group.add(bellyMesh);

  // Tail
  const tailBase = mbox(0.06, 0.06, 0.15, orange, 0x000000, 0, furOpts);
  tailBase.position.set(0, 0.4, 0.4);
  tailBase.rotation.x = -0.5;
  group.add(tailBase);
  const tailTip = mbox(0.05, 0.05, 0.12, darkOrange, 0x000000, 0, furOpts);
  tailTip.position.set(0, 0.5, 0.5);
  tailTip.rotation.x = -1.0;
  group.add(tailTip);

  // Legs — fuzzy fur
  const frontLeftLeg = limb(0.08, 0.2, 0.08, orange, 0.25, -0.08, -0.1, furOpts);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.08, 0.2, 0.08, orange, 0.25, 0.08, -0.1, furOpts);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.08, 0.2, 0.08, orange, 0.25, -0.08, 0.25, furOpts);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.08, 0.2, 0.08, orange, 0.25, 0.08, 0.25, furOpts);
  group.add(backRightLeg);

  return {
    group, type: 'cat',
    frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg,
    height: 0.6, isGltf: false,
  };
}

function createHorse(): MobMeshData {
  const group = new THREE.Group();
  const brown = 0x8b5e3c;
  const darkBrown = 0x5c3a24;
  const mane = 0x2a1a10;
  const armor = 0x7a7a8a; // iron armor plate color

  // Head — armored clearcoat (MeshPhysicalMaterial)
  const head = mboxPhys(0.25, 0.35, 0.55, brown, 0x000000, 0, {
    roughness: 0.5, metalness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.15,
  });
  head.position.set(0, 1.15, -0.5);
  head.rotation.x = 0.3;
  group.add(head);

  // Head armor plate (chamfron)
  const chamfron = mboxPhys(0.2, 0.2, 0.15, armor, 0x000000, 0, {
    roughness: 0.3, metalness: 0.5, clearcoat: 0.8, clearcoatRoughness: 0.1,
  });
  chamfron.position.set(0, 1.24, -0.62);
  chamfron.rotation.x = 0.3;
  group.add(chamfron);

  // Ears
  const lear = mbox(0.06, 0.12, 0.06, brown);
  lear.position.set(-0.08, 1.42, -0.4);
  group.add(lear);
  const rear = mbox(0.06, 0.12, 0.06, brown);
  rear.position.set(0.08, 1.42, -0.4);
  group.add(rear);

  // Eyes — fiery boss glow
  const le = mbox(0.06, 0.06, 0.02, 0xcc4400, 0xff6600, 1.2, { roughness: 0.2 });
  le.position.set(-0.12, 1.18, -0.72);
  group.add(le);
  const re = mbox(0.06, 0.06, 0.02, 0xcc4400, 0xff6600, 1.2, { roughness: 0.2 });
  re.position.set(0.12, 1.18, -0.72);
  group.add(re);

  // Mane
  const maneMesh = mbox(0.06, 0.3, 0.3, mane, 0x000000, 0, { roughness: 0.95 });
  maneMesh.position.set(0, 1.32, -0.3);
  group.add(maneMesh);

  // Body — armored clearcoat
  const body = mboxPhys(0.5, 0.5, 0.75, brown, 0x000000, 0, {
    roughness: 0.5, metalness: 0.12, clearcoat: 0.5, clearcoatRoughness: 0.2,
  });
  body.position.set(0, 0.85, 0.1);
  group.add(body);

  // Body armor plate (peytral)
  const peytral = mboxPhys(0.44, 0.3, 0.35, armor, 0x000000, 0, {
    roughness: 0.3, metalness: 0.5, clearcoat: 0.8, clearcoatRoughness: 0.1,
  });
  peytral.position.set(0, 0.92, -0.08);
  group.add(peytral);

  // Tail
  const tail = mbox(0.06, 0.35, 0.06, mane, 0x000000, 0, { roughness: 0.95 });
  tail.position.set(0, 0.85, 0.5);
  tail.rotation.x = 0.4;
  group.add(tail);

  // Legs — slightly metallic hooves
  const legOpts: MatOpts = { roughness: 0.65, metalness: 0.08 };
  const frontLeftLeg = limb(0.14, 0.6, 0.14, darkBrown, 0.6, -0.18, -0.2, legOpts);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.14, 0.6, 0.14, darkBrown, 0.6, 0.18, -0.2, legOpts);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.14, 0.6, 0.14, darkBrown, 0.6, -0.18, 0.35, legOpts);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.14, 0.6, 0.14, darkBrown, 0.6, 0.18, 0.35, legOpts);
  group.add(backRightLeg);

  return {
    group, type: 'horse',
    frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg,
    height: 1.4, isGltf: false,
  };
}

function createRabbit(): MobMeshData {
  const group = new THREE.Group();
  const fur = 0xc8a878;
  const belly = 0xf0e0c8;
  const earInner = 0xe8b0b0;
  const furOpts: MatOpts = { roughness: 0.95 }; // soft fluffy fur

  // Head — fluffy
  const head = mbox(0.2, 0.18, 0.18, fur, 0x000000, 0, furOpts);
  head.position.set(0, 0.38, -0.12);
  group.add(head);

  // Ears — outer fur, inner pink skin
  const learOuter = mbox(0.06, 0.2, 0.04, fur, 0x000000, 0, furOpts);
  learOuter.position.set(-0.06, 0.58, -0.1);
  learOuter.rotation.z = 0.15;
  group.add(learOuter);
  const learInner = mbox(0.04, 0.16, 0.02, earInner, 0x000000, 0, { roughness: 0.6 });
  learInner.position.set(-0.06, 0.58, -0.11);
  learInner.rotation.z = 0.15;
  group.add(learInner);
  const rearOuter = mbox(0.06, 0.2, 0.04, fur, 0x000000, 0, furOpts);
  rearOuter.position.set(0.06, 0.58, -0.1);
  rearOuter.rotation.z = -0.15;
  group.add(rearOuter);
  const rearInner = mbox(0.04, 0.16, 0.02, earInner, 0x000000, 0, { roughness: 0.6 });
  rearInner.position.set(0.06, 0.58, -0.11);
  rearInner.rotation.z = -0.15;
  group.add(rearInner);

  // Eyes — red emissive glow
  const le = mbox(0.04, 0.04, 0.02, 0xcc2222, 0xcc2222, 0.6, { roughness: 0.2 });
  le.position.set(-0.06, 0.4, -0.22);
  group.add(le);
  const re = mbox(0.04, 0.04, 0.02, 0xcc2222, 0xcc2222, 0.6, { roughness: 0.2 });
  re.position.set(0.06, 0.4, -0.22);
  group.add(re);

  // Nose — pink glossy
  const nose = mbox(0.04, 0.03, 0.02, 0xdd8888, 0x000000, 0, { roughness: 0.35 });
  nose.position.set(0, 0.36, -0.22);
  group.add(nose);

  // Body — fluffy
  const body = mbox(0.2, 0.2, 0.3, fur, 0x000000, 0, furOpts);
  body.position.set(0, 0.25, 0.08);
  group.add(body);

  // Belly — soft
  const bellyMesh = mbox(0.14, 0.1, 0.2, belly, 0x000000, 0, furOpts);
  bellyMesh.position.set(0, 0.18, 0.08);
  group.add(bellyMesh);

  // Tail (fluffy puff) — extra soft
  const tail = mbox(0.1, 0.1, 0.08, belly, 0x000000, 0, { roughness: 1.0 });
  tail.position.set(0, 0.28, 0.28);
  group.add(tail);

  // Legs — fluffy fur
  const frontLeftLeg = limb(0.06, 0.12, 0.06, fur, 0.15, -0.06, -0.05, furOpts);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.06, 0.12, 0.06, fur, 0.15, 0.06, -0.05, furOpts);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.08, 0.15, 0.1, fur, 0.15, -0.08, 0.18, furOpts);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.08, 0.15, 0.1, fur, 0.15, 0.08, 0.18, furOpts);
  group.add(backRightLeg);

  return {
    group, type: 'rabbit',
    frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg,
    height: 0.5, isGltf: false,
  };
}

function createWolf(): MobMeshData {
  const group = new THREE.Group();
  const gray = 0x9e9e9e;
  const darkGray = 0x606060;
  const belly = 0xd0d0d0;
  // Bristled fur — high roughness
  const furOpts: MatOpts = { roughness: 0.92 };

  // Head — bristled fur
  const head = mbox(0.28, 0.22, 0.28, gray, 0x000000, 0, furOpts);
  head.position.set(0, 0.62, -0.28);
  group.add(head);

  // Snout
  const snout = mbox(0.14, 0.1, 0.15, belly, 0x000000, 0, { roughness: 0.7 });
  snout.position.set(0, 0.56, -0.48);
  group.add(snout);

  // Nose — glossy wet
  const nose = mbox(0.05, 0.04, 0.02, 0x222222, 0x000000, 0, { roughness: 0.2 });
  nose.position.set(0, 0.58, -0.56);
  group.add(nose);

  // Ears — darker bristled fur
  const lear = mbox(0.08, 0.12, 0.06, darkGray, 0x000000, 0, furOpts);
  lear.position.set(-0.1, 0.78, -0.25);
  group.add(lear);
  const rear = mbox(0.08, 0.12, 0.06, darkGray, 0x000000, 0, furOpts);
  rear.position.set(0.1, 0.78, -0.25);
  group.add(rear);

  // Eyes — amber emissive glow
  const le = mbox(0.05, 0.04, 0.02, 0x884400, 0xcc8800, 0.7, { roughness: 0.2 });
  le.position.set(-0.08, 0.65, -0.42);
  group.add(le);
  const re = mbox(0.05, 0.04, 0.02, 0x884400, 0xcc8800, 0.7, { roughness: 0.2 });
  re.position.set(0.08, 0.65, -0.42);
  group.add(re);

  // Body — bristled fur with shield glow accent stripe along spine
  const body = mbox(0.3, 0.28, 0.5, gray, 0x000000, 0, furOpts);
  body.position.set(0, 0.45, 0.05);
  group.add(body);

  // Shield glow stripe along back
  const shieldStripe = mbox(0.1, 0.04, 0.4, 0x60a5fa, 0x60a5fa, 0.8, { roughness: 0.3 });
  shieldStripe.position.set(0, 0.61, 0.05);
  group.add(shieldStripe);

  // Belly — softer
  const bellyMesh = mbox(0.2, 0.14, 0.35, belly, 0x000000, 0, { roughness: 0.88 });
  bellyMesh.position.set(0, 0.35, 0.05);
  group.add(bellyMesh);

  // Tail (bushy, angled up) — very fluffy
  const tail = mbox(0.08, 0.08, 0.25, gray, 0x000000, 0, { roughness: 0.98 });
  tail.position.set(0, 0.55, 0.4);
  tail.rotation.x = -0.6;
  group.add(tail);
  const tailTip = mbox(0.06, 0.06, 0.1, belly, 0x000000, 0, { roughness: 0.98 });
  tailTip.position.set(0, 0.65, 0.5);
  tailTip.rotation.x = -0.8;
  group.add(tailTip);

  // Legs — bristled dark fur
  const frontLeftLeg = limb(0.1, 0.3, 0.1, darkGray, 0.31, -0.1, -0.15, furOpts);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.1, 0.3, 0.1, darkGray, 0.31, 0.1, -0.15, furOpts);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.1, 0.3, 0.1, darkGray, 0.31, -0.1, 0.22, furOpts);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.1, 0.3, 0.1, darkGray, 0.31, 0.1, 0.22, furOpts);
  group.add(backRightLeg);

  return {
    group, type: 'wolf',
    frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg,
    height: 0.8, isGltf: false,
  };
}

// ========== Public API ==========

/**
 * Create a mob mesh for the given enemy type.
 * Uses GLTF model if available, otherwise builds procedural geometry.
 */
export function createMobMesh(type: TDEnemyType, options?: { segments?: number }): MobMeshData {
  // Try GLTF model first
  const gltfModel = getGltfModel(type);
  if (gltfModel) {
    return {
      group: gltfModel,
      type,
      height: MOB_HEIGHTS[type],
      isGltf: true,
    };
  }

  // Fall back to procedural Minecraft-style geometry
  switch (type) {
    case 'zombie': return createZombie();
    case 'skeleton': return createSkeleton();
    case 'creeper': return createCreeper();
    case 'spider': return createSpider();
    case 'enderman': return createEnderman();
    case 'slime': return createSlime(options?.segments);
    case 'magma_cube': return createMagmaCube(options?.segments);
    case 'pig': return createPig();
    case 'chicken': return createChicken();
    case 'cow': return createCow();
    case 'bee': return createBee();
    case 'cat': return createCat();
    case 'horse': return createHorse();
    case 'rabbit': return createRabbit();
    case 'wolf': return createWolf();
    default: return createZombie();
  }
}

/**
 * Animate mob walking. Call each frame for active mobs.
 * @param mob - The mob mesh data
 * @param time - Current time in seconds (for oscillation)
 * @param isMoving - Whether the mob is currently transitioning between tiles
 */
export function animateMob(mob: MobMeshData, time: number, isMoving: boolean): void {
  if (mob.isGltf) return; // GLTF models may have their own animation

  const speed = 8;
  const swing = isMoving ? Math.sin(time * speed) * 0.6 : 0;
  const smallSwing = isMoving ? Math.sin(time * speed) * 0.2 : 0;

  switch (mob.type) {
    case 'zombie':
      // Legs swing, arms stay extended forward with subtle bob
      if (mob.leftLeg) mob.leftLeg.rotation.x = swing;
      if (mob.rightLeg) mob.rightLeg.rotation.x = -swing;
      if (mob.leftArm) mob.leftArm.rotation.x = -Math.PI / 3 + smallSwing;
      if (mob.rightArm) mob.rightArm.rotation.x = -Math.PI / 3 - smallSwing;
      break;

    case 'skeleton':
      // Full arm and leg swing
      if (mob.leftArm) mob.leftArm.rotation.x = swing;
      if (mob.rightArm) mob.rightArm.rotation.x = -swing;
      if (mob.leftLeg) mob.leftLeg.rotation.x = -swing;
      if (mob.rightLeg) mob.rightLeg.rotation.x = swing;
      break;

    case 'creeper':
      // Diagonal leg pairs swing together (like a horse trot)
      if (mob.frontLeftLeg) mob.frontLeftLeg.rotation.x = swing;
      if (mob.backRightLeg) mob.backRightLeg.rotation.x = swing;
      if (mob.frontRightLeg) mob.frontRightLeg.rotation.x = -swing;
      if (mob.backLeftLeg) mob.backLeftLeg.rotation.x = -swing;
      break;

    case 'spider': {
      // Spider legs animate in alternating pairs
      const legs = mob.spiderLegs;
      if (legs) {
        for (let i = 0; i < legs.length; i++) {
          const phase = (i % 2 === 0) ? 1 : -1;
          const legSwing = isMoving ? Math.sin(time * 10 + i * 0.8) * 0.3 : 0;
          legs[i].rotation.x = phase * legSwing;
        }
      }
      break;
    }

    case 'enderman':
      // Long limbs swing with slower, eerie motion
      if (mob.leftArm) mob.leftArm.rotation.x = swing * 0.5;
      if (mob.rightArm) mob.rightArm.rotation.x = -swing * 0.5;
      if (mob.leftLeg) mob.leftLeg.rotation.x = -swing * 0.7;
      if (mob.rightLeg) mob.rightLeg.rotation.x = swing * 0.7;
      break;

    case 'slime': {
      // Slime bounces up and down with a squish effect
      const bounce = isMoving ? Math.abs(Math.sin(time * 6)) * 0.15 : Math.sin(time * 2) * 0.05;
      mob.group.position.y = bounce;
      const squish = isMoving ? 1 + Math.sin(time * 6) * 0.1 : 1;
      mob.group.scale.y = squish;
      break;
    }

    case 'magma_cube': {
      // Magma cube bounces like slime but with a pulsing squish
      const mgBounce = isMoving ? Math.abs(Math.sin(time * 5)) * 0.15 : Math.sin(time * 2) * 0.05;
      mob.group.position.y = mgBounce;
      const mgSquish = isMoving ? 1 + Math.sin(time * 5) * 0.12 : 1;
      mob.group.scale.y = mgSquish;
      break;
    }

    case 'pig':
    case 'cow':
    case 'horse':
    case 'cat':
    case 'wolf':
    case 'rabbit':
      // Quadruped diagonal leg swing
      if (mob.frontLeftLeg) mob.frontLeftLeg.rotation.x = swing;
      if (mob.backRightLeg) mob.backRightLeg.rotation.x = swing;
      if (mob.frontRightLeg) mob.frontRightLeg.rotation.x = -swing;
      if (mob.backLeftLeg) mob.backLeftLeg.rotation.x = -swing;
      break;

    case 'chicken':
      // Bipedal waddle walk
      if (mob.leftLeg) mob.leftLeg.rotation.x = swing;
      if (mob.rightLeg) mob.rightLeg.rotation.x = -swing;
      break;

    case 'bee': {
      // Buzzing wing flap
      const wingFlap = Math.sin(time * 30) * 0.8;
      if (mob.leftArm) mob.leftArm.rotation.z = -0.3 + wingFlap;
      if (mob.rightArm) mob.rightArm.rotation.z = 0.3 - wingFlap;
      // Gentle bob
      mob.group.position.y = (mob.group.position.y || 0) + Math.sin(time * 4) * 0.03;
      break;
    }
  }
}

/** Get the height of a mob type. */
export function getMobHeight(type: TDEnemyType): number {
  return MOB_HEIGHTS[type];
}

/**
 * Reset all limb rotations to their neutral pose.
 * Must be called when reusing a pooled mob to avoid carrying over
 * the previous enemy's mid-animation limb positions.
 */
export function resetMobPose(mob: MobMeshData): void {
  if (mob.isGltf) return;

  switch (mob.type) {
    case 'zombie':
      if (mob.leftArm) mob.leftArm.rotation.x = -Math.PI / 3;
      if (mob.rightArm) mob.rightArm.rotation.x = -Math.PI / 3;
      if (mob.leftLeg) mob.leftLeg.rotation.x = 0;
      if (mob.rightLeg) mob.rightLeg.rotation.x = 0;
      break;
    case 'skeleton':
    case 'enderman':
      if (mob.leftArm) mob.leftArm.rotation.x = 0;
      if (mob.rightArm) mob.rightArm.rotation.x = 0;
      if (mob.leftLeg) mob.leftLeg.rotation.x = 0;
      if (mob.rightLeg) mob.rightLeg.rotation.x = 0;
      break;
    case 'creeper':
      if (mob.frontLeftLeg) mob.frontLeftLeg.rotation.x = 0;
      if (mob.frontRightLeg) mob.frontRightLeg.rotation.x = 0;
      if (mob.backLeftLeg) mob.backLeftLeg.rotation.x = 0;
      if (mob.backRightLeg) mob.backRightLeg.rotation.x = 0;
      break;
    case 'spider':
      if (mob.spiderLegs) {
        for (const leg of mob.spiderLegs) leg.rotation.x = 0;
      }
      break;
    case 'slime':
    case 'magma_cube':
      mob.group.position.y = 0;
      mob.group.scale.y = 1;
      break;
    case 'pig':
    case 'cow':
    case 'horse':
    case 'cat':
    case 'wolf':
    case 'rabbit':
      if (mob.frontLeftLeg) mob.frontLeftLeg.rotation.x = 0;
      if (mob.frontRightLeg) mob.frontRightLeg.rotation.x = 0;
      if (mob.backLeftLeg) mob.backLeftLeg.rotation.x = 0;
      if (mob.backRightLeg) mob.backRightLeg.rotation.x = 0;
      break;
    case 'chicken':
      if (mob.leftLeg) mob.leftLeg.rotation.x = 0;
      if (mob.rightLeg) mob.rightLeg.rotation.x = 0;
      break;
    case 'bee':
      if (mob.leftArm) mob.leftArm.rotation.z = 0;
      if (mob.rightArm) mob.rightArm.rotation.z = 0;
      break;
  }
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
