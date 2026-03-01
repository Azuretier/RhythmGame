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

function getGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  let geo = geoCache.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, geo);
  }
  return geo;
}

function getMat(
  color: number,
  emissive = 0x000000,
  emissiveIntensity = 0,
): THREE.MeshStandardMaterial {
  const key = `${color.toString(16)}-${emissive.toString(16)}-${emissiveIntensity.toFixed(2)}`;
  let mat = matCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: true,
      emissive,
      emissiveIntensity,
    });
    matCache.set(key, mat);
  }
  return mat;
}

/** Create a box mesh with the given dimensions and color. */
function mbox(
  w: number, h: number, d: number,
  color: number,
  emissive = 0x000000, emissiveIntensity = 0,
): THREE.Mesh {
  return new THREE.Mesh(getGeo(w, h, d), getMat(color, emissive, emissiveIntensity));
}

/** Create an articulated limb group with pivot at (offsetX, pivotY, offsetZ). */
function limb(
  w: number, h: number, d: number,
  color: number,
  pivotY: number, offsetX: number, offsetZ = 0,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(offsetX, pivotY, offsetZ);
  const mesh = mbox(w, h, d, color);
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

  // Head
  const head = mbox(0.5, 0.5, 0.5, skin, 0x2a4a15, 0.15);
  head.position.set(0, 1.65, 0);
  group.add(head);

  // Eyes
  const le = mbox(0.12, 0.06, 0.02, 0x111111);
  le.position.set(-0.12, 1.68, -0.26);
  group.add(le);
  const re = mbox(0.12, 0.06, 0.02, 0x111111);
  re.position.set(0.12, 1.68, -0.26);
  group.add(re);

  // Body
  const body = mbox(0.5, 0.7, 0.3, shirt);
  body.position.set(0, 1.05, 0);
  group.add(body);

  // Arms (extended forward — classic Minecraft zombie pose)
  const leftArm = limb(0.25, 0.7, 0.25, skin, 1.4, -0.375);
  leftArm.rotation.x = -Math.PI / 3;
  group.add(leftArm);
  const rightArm = limb(0.25, 0.7, 0.25, skin, 1.4, 0.375);
  rightArm.rotation.x = -Math.PI / 3;
  group.add(rightArm);

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
  const dark = 0x2a2520;

  // Head
  const head = mbox(0.5, 0.5, 0.5, bone);
  head.position.set(0, 1.65, 0);
  group.add(head);

  // Eye sockets (dark holes)
  const le = mbox(0.1, 0.08, 0.02, dark);
  le.position.set(-0.12, 1.68, -0.26);
  group.add(le);
  const re = mbox(0.1, 0.08, 0.02, dark);
  re.position.set(0.12, 1.68, -0.26);
  group.add(re);
  // Nose hole
  const nose = mbox(0.06, 0.06, 0.02, dark);
  nose.position.set(0, 1.62, -0.26);
  group.add(nose);

  // Body (thin ribcage)
  const body = mbox(0.35, 0.7, 0.2, bone);
  body.position.set(0, 1.05, 0);
  group.add(body);
  // Rib detail (darker stripe)
  const rib = mbox(0.36, 0.08, 0.21, dark);
  rib.position.set(0, 1.1, 0);
  group.add(rib);

  // Arms (thin)
  const leftArm = limb(0.15, 0.7, 0.15, bone, 1.4, -0.25);
  group.add(leftArm);
  const rightArm = limb(0.15, 0.7, 0.15, bone, 1.4, 0.25);
  group.add(rightArm);

  // Legs (thin)
  const leftLeg = limb(0.15, 0.7, 0.15, bone, 0.7, -0.1);
  group.add(leftLeg);
  const rightLeg = limb(0.15, 0.7, 0.15, bone, 0.7, 0.1);
  group.add(rightLeg);

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

  // Head
  const head = mbox(0.5, 0.45, 0.5, black, 0x220044, 0.2);
  head.position.set(0, 2.55, 0);
  group.add(head);

  // Eyes (glowing purple)
  const le = mbox(0.14, 0.06, 0.02, purple, purple, 3.0);
  le.position.set(-0.12, 2.56, -0.26);
  group.add(le);
  const re = mbox(0.14, 0.06, 0.02, purple, purple, 3.0);
  re.position.set(0.12, 2.56, -0.26);
  group.add(re);

  // Body (thin and tall)
  const body = mbox(0.4, 0.8, 0.25, black, 0x220044, 0.1);
  body.position.set(0, 1.93, 0);
  group.add(body);

  // Arms (very long and thin)
  const leftArm = limb(0.12, 1.1, 0.12, black, 2.33, -0.26);
  group.add(leftArm);
  const rightArm = limb(0.12, 1.1, 0.12, black, 2.33, 0.26);
  group.add(rightArm);

  // Legs (very long and thin)
  const leftLeg = limb(0.15, 1.2, 0.15, black, 1.25, -0.1);
  group.add(leftLeg);
  const rightLeg = limb(0.15, 1.2, 0.15, black, 1.25, 0.1);
  group.add(rightLeg);

  return {
    group, type: 'enderman',
    leftArm, rightArm, leftLeg, rightLeg,
    height: 2.8, isGltf: false,
  };
}

// ========== Slime ==========

function createSlime(): MobMeshData {
  const group = new THREE.Group();
  const slimeGreen = 0x5cb85c;
  const slimeDark = 0x3d8b3d;
  const slimeCore = 0x2e6b2e;
  const eyeColor = 0x111111;

  // Outer body — narrower than magma cube base, closer to mid-segment (0.45 × 0.24 × 0.45)
  const body = mbox(0.45, 0.24, 0.45, slimeGreen, slimeGreen, 0.3);
  body.position.set(0, 0.12, 0);
  // Make it semi-transparent looking with emissive glow
  const bodyMat = body.material as THREE.MeshStandardMaterial;
  bodyMat.transparent = true;
  bodyMat.opacity = 0.75;
  group.add(body);

  // Inner core (darker, smaller cube visible inside)
  const core = mbox(0.22, 0.12, 0.22, slimeCore, slimeCore, 0.2);
  core.position.set(0, 0.10, 0);
  group.add(core);

  // Eyes (on the front face)
  const le = mbox(0.07, 0.05, 0.02, eyeColor);
  le.position.set(-0.08, 0.16, -0.23);
  group.add(le);
  const re = mbox(0.07, 0.05, 0.02, eyeColor);
  re.position.set(0.08, 0.16, -0.23);
  group.add(re);

  // Mouth (wide line)
  const mouth = mbox(0.13, 0.025, 0.02, eyeColor);
  mouth.position.set(0, 0.10, -0.23);
  group.add(mouth);

  return {
    group, type: 'slime',
    height: 0.24, isGltf: false,
  };
}

// ========== Magma Cube ==========

function createMagmaCube(segments = 3): MobMeshData {
  const group = new THREE.Group();
  // Minecraft magma cube palette
  const shell = 0x2a1a0a;       // Dark charred shell
  const shellDark = 0x1a0e04;   // Darker variation for bottom segments
  const magma = 0xff6600;       // Bright orange magma in seams
  const magmaGlow = 0xff4400;   // Inner glow
  const magmaYellow = 0xffaa00; // Hottest parts of seams
  const eyeColor = 0xff8800;    // Orange-yellow eyes

  // Segment widths and heights — flat slabs (height ≈ 50% of width)
  const widths  = [0.55, 0.45, 0.35]; // bottom, middle, top
  const heights = [0.28, 0.24, 0.18]; // flat enough to stack next to each other
  const seamH = 0.04;
  let y = 0; // running Y position (bottom of current segment)

  // --- Segment 1 (bottom, always present) ---
  const w1 = widths[0], h1 = heights[0];
  const bottom = mbox(w1, h1, w1, shellDark, magmaGlow, 0.15);
  bottom.position.set(0, y + h1 / 2, 0);
  group.add(bottom);

  // Bottom face glow
  const bottomGlow = mbox(w1 * 0.6, 0.01, w1 * 0.6, magma, magma, 2.0);
  bottomGlow.position.set(0, 0.005, 0);
  group.add(bottomGlow);

  // Cracks on bottom segment
  const btmCrackF = mbox(0.03, h1 * 0.6, 0.005, magma, magma, 2.0);
  btmCrackF.position.set(0.08, y + h1 / 2, -(w1 / 2 + 0.001));
  group.add(btmCrackF);
  const btmCrackR = mbox(0.005, h1 * 0.5, 0.03, magmaYellow, magmaYellow, 2.0);
  btmCrackR.position.set(w1 / 2 + 0.001, y + h1 * 0.45, -0.06);
  group.add(btmCrackR);

  y += h1;

  if (segments >= 2) {
    // --- Seam 1 ---
    const seamW1 = widths[0] * 0.9;
    const seam1 = mbox(seamW1, seamH, seamW1, magma, magma, 2.5);
    seam1.position.set(0, y + seamH / 2, 0);
    group.add(seam1);
    const seam1X = mbox(seamW1 * 1.05, seamH, 0.04, magmaYellow, magmaYellow, 3.0);
    seam1X.position.set(0, y + seamH / 2, 0);
    group.add(seam1X);
    const seam1Z = mbox(0.04, seamH, seamW1 * 1.05, magmaYellow, magmaYellow, 3.0);
    seam1Z.position.set(0, y + seamH / 2, 0);
    group.add(seam1Z);
    y += seamH;

    // --- Segment 2 (middle) ---
    const w2 = widths[1], h2 = heights[1];
    const middle = mbox(w2, h2, w2, shell, magmaGlow, 0.12);
    middle.position.set(0, y + h2 / 2, 0);
    group.add(middle);

    // Cracks on middle segment
    const midCrackF = mbox(0.03, h2 * 0.7, 0.005, magma, magma, 2.0);
    midCrackF.position.set(0.06, y + h2 / 2, -(w2 / 2 + 0.001));
    group.add(midCrackF);
    const midCrackF2 = mbox(0.03, h2 * 0.5, 0.005, magmaYellow, magmaYellow, 2.5);
    midCrackF2.position.set(-0.1, y + h2 * 0.4, -(w2 / 2 + 0.001));
    group.add(midCrackF2);
    const midCrackB = mbox(0.03, h2 * 0.55, 0.005, magma, magma, 2.0);
    midCrackB.position.set(-0.05, y + h2 / 2, w2 / 2 + 0.001);
    group.add(midCrackB);
    const midCrackL = mbox(0.005, h2 * 0.6, 0.03, magma, magma, 2.0);
    midCrackL.position.set(-(w2 / 2 + 0.001), y + h2 * 0.45, 0.08);
    group.add(midCrackL);
    const midCrackR = mbox(0.005, h2 * 0.5, 0.03, magmaYellow, magmaYellow, 2.0);
    midCrackR.position.set(w2 / 2 + 0.001, y + h2 / 2, -0.06);
    group.add(midCrackR);

    y += h2;
  }

  if (segments >= 3) {
    // --- Seam 2 ---
    const seamW2 = widths[1] * 0.9;
    const seam2 = mbox(seamW2, seamH, seamW2, magma, magma, 2.5);
    seam2.position.set(0, y + seamH / 2, 0);
    group.add(seam2);
    const seam2X = mbox(seamW2 * 1.05, seamH, 0.04, magmaYellow, magmaYellow, 3.0);
    seam2X.position.set(0, y + seamH / 2, 0);
    group.add(seam2X);
    const seam2Z = mbox(0.04, seamH, seamW2 * 1.05, magmaYellow, magmaYellow, 3.0);
    seam2Z.position.set(0, y + seamH / 2, 0);
    group.add(seam2Z);
    y += seamH;

    // --- Segment 3 (top — the "head") ---
    const w3 = widths[2], h3 = heights[2];
    const top = mbox(w3, h3, w3, shell, magmaGlow, 0.1);
    top.position.set(0, y + h3 / 2, 0);
    group.add(top);

    // Cracks on top segment
    const topCrackF = mbox(0.03, h3 * 0.65, 0.005, magma, magma, 1.8);
    topCrackF.position.set(-0.04, y + h3 / 2, -(w3 / 2 + 0.001));
    group.add(topCrackF);
    const topCrackR = mbox(0.005, h3 * 0.55, 0.03, magma, magma, 1.8);
    topCrackR.position.set(w3 / 2 + 0.001, y + h3 * 0.45, 0.04);
    group.add(topCrackR);

    y += h3;
  }

  // --- Eyes (always on the topmost segment) ---
  const topW = widths[segments - 1];
  const topH = heights[segments - 1];
  const eyeY = y - topH / 2 + topH * 0.15;
  const eyeZ = -(topW / 2 + 0.01);
  const le = mbox(0.08, 0.06, 0.02, eyeColor, eyeColor, 3.5);
  le.position.set(-0.08, eyeY, eyeZ);
  group.add(le);
  const re = mbox(0.08, 0.06, 0.02, eyeColor, eyeColor, 3.5);
  re.position.set(0.08, eyeY, eyeZ);
  group.add(re);

  // --- Inner core (glowing magma visible through seams and cracks) ---
  const coreH = y * 0.6;
  const core = mbox(0.2, coreH, 0.2, magmaGlow, magmaGlow, 1.2);
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

  // Head
  const head = mbox(0.4, 0.35, 0.35, pink);
  head.position.set(0, 0.65, -0.3);
  group.add(head);

  // Snout
  const nose = mbox(0.2, 0.15, 0.1, snout);
  nose.position.set(0, 0.6, -0.52);
  group.add(nose);

  // Nostrils
  const nl = mbox(0.04, 0.04, 0.02, darkPink);
  nl.position.set(-0.04, 0.6, -0.58);
  group.add(nl);
  const nr = mbox(0.04, 0.04, 0.02, darkPink);
  nr.position.set(0.04, 0.6, -0.58);
  group.add(nr);

  // Eyes
  const le = mbox(0.06, 0.06, 0.02, 0x111111);
  le.position.set(-0.1, 0.7, -0.48);
  group.add(le);
  const re = mbox(0.06, 0.06, 0.02, 0x111111);
  re.position.set(0.1, 0.7, -0.48);
  group.add(re);

  // Body
  const body = mbox(0.45, 0.4, 0.6, pink);
  body.position.set(0, 0.5, 0.05);
  group.add(body);

  // Legs
  const frontLeftLeg = limb(0.15, 0.3, 0.15, darkPink, 0.3, -0.15, -0.15);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.15, 0.3, 0.15, darkPink, 0.3, 0.15, -0.15);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.15, 0.3, 0.15, darkPink, 0.3, -0.15, 0.25);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.15, 0.3, 0.15, darkPink, 0.3, 0.15, 0.25);
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

  // Head
  const head = mbox(0.2, 0.22, 0.2, white);
  head.position.set(0, 0.58, -0.15);
  group.add(head);

  // Beak
  const beakMesh = mbox(0.08, 0.06, 0.1, beak);
  beakMesh.position.set(0, 0.54, -0.3);
  group.add(beakMesh);

  // Wattle (red bit under beak)
  const wattleMesh = mbox(0.06, 0.08, 0.04, wattle);
  wattleMesh.position.set(0, 0.48, -0.27);
  group.add(wattleMesh);

  // Comb (red on top)
  const comb = mbox(0.04, 0.08, 0.1, wattle);
  comb.position.set(0, 0.72, -0.15);
  group.add(comb);

  // Eyes
  const le = mbox(0.04, 0.04, 0.02, 0x111111);
  le.position.set(-0.08, 0.6, -0.26);
  group.add(le);
  const re = mbox(0.04, 0.04, 0.02, 0x111111);
  re.position.set(0.08, 0.6, -0.26);
  group.add(re);

  // Body (round and plump)
  const body = mbox(0.3, 0.3, 0.4, white);
  body.position.set(0, 0.35, 0.05);
  group.add(body);

  // Wings
  const lw = mbox(0.04, 0.2, 0.25, 0xe0e0d8);
  lw.position.set(-0.18, 0.38, 0.05);
  group.add(lw);
  const rw = mbox(0.04, 0.2, 0.25, 0xe0e0d8);
  rw.position.set(0.18, 0.38, 0.05);
  group.add(rw);

  // Tail feathers
  const tail = mbox(0.1, 0.15, 0.08, white);
  tail.position.set(0, 0.45, 0.28);
  tail.rotation.x = -0.3;
  group.add(tail);

  // Legs (thin)
  const leftLeg = limb(0.06, 0.2, 0.06, legColor, 0.2, -0.08);
  group.add(leftLeg);
  const rightLeg = limb(0.06, 0.2, 0.06, legColor, 0.2, 0.08);
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

  // Head
  const head = mbox(0.4, 0.35, 0.35, white);
  head.position.set(0, 0.95, -0.45);
  group.add(head);

  // Snout
  const snoutMesh = mbox(0.25, 0.15, 0.1, skin);
  snoutMesh.position.set(0, 0.88, -0.66);
  group.add(snoutMesh);

  // Horns
  const lh = mbox(0.06, 0.15, 0.06, horn);
  lh.position.set(-0.18, 1.18, -0.42);
  lh.rotation.z = 0.3;
  group.add(lh);
  const rh = mbox(0.06, 0.15, 0.06, horn);
  rh.position.set(0.18, 1.18, -0.42);
  rh.rotation.z = -0.3;
  group.add(rh);

  // Eyes
  const le = mbox(0.06, 0.06, 0.02, 0x111111);
  le.position.set(-0.1, 1.0, -0.63);
  group.add(le);
  const re = mbox(0.06, 0.06, 0.02, 0x111111);
  re.position.set(0.1, 1.0, -0.63);
  group.add(re);

  // Body (large)
  const body = mbox(0.55, 0.5, 0.8, white);
  body.position.set(0, 0.7, 0.0);
  group.add(body);

  // Brown patches on body
  const patch1 = mbox(0.3, 0.25, 0.35, brown);
  patch1.position.set(-0.14, 0.78, -0.1);
  group.add(patch1);
  const patch2 = mbox(0.25, 0.2, 0.3, brown);
  patch2.position.set(0.12, 0.65, 0.15);
  group.add(patch2);

  // Legs
  const frontLeftLeg = limb(0.15, 0.45, 0.15, white, 0.45, -0.2, -0.25);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.15, 0.45, 0.15, white, 0.45, 0.2, -0.25);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.15, 0.45, 0.15, white, 0.45, -0.2, 0.25);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.15, 0.45, 0.15, white, 0.45, 0.2, 0.25);
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

  // Body (striped)
  const bodyFront = mbox(0.2, 0.2, 0.15, yellow);
  bodyFront.position.set(0, 0.3, -0.08);
  group.add(bodyFront);
  const bodyStripe = mbox(0.21, 0.21, 0.08, black);
  bodyStripe.position.set(0, 0.3, 0.02);
  group.add(bodyStripe);
  const bodyBack = mbox(0.2, 0.2, 0.15, yellow);
  bodyBack.position.set(0, 0.3, 0.12);
  group.add(bodyBack);

  // Stinger
  const stinger = mbox(0.04, 0.04, 0.08, 0x333333);
  stinger.position.set(0, 0.28, 0.24);
  group.add(stinger);

  // Head
  const head = mbox(0.18, 0.18, 0.12, yellow);
  head.position.set(0, 0.32, -0.2);
  group.add(head);

  // Eyes
  const le = mbox(0.06, 0.06, 0.02, 0x111111);
  le.position.set(-0.06, 0.34, -0.27);
  group.add(le);
  const re = mbox(0.06, 0.06, 0.02, 0x111111);
  re.position.set(0.06, 0.34, -0.27);
  group.add(re);

  // Antennae
  const la = mbox(0.02, 0.1, 0.02, black);
  la.position.set(-0.05, 0.46, -0.22);
  la.rotation.z = 0.3;
  group.add(la);
  const ra = mbox(0.02, 0.1, 0.02, black);
  ra.position.set(0.05, 0.46, -0.22);
  ra.rotation.z = -0.3;
  group.add(ra);

  // Wings (semi-transparent look via emissive)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.12, 0.42, 0.0);
  const lwMesh = mbox(0.18, 0.02, 0.12, wing, wing, 0.5);
  const lwMat = lwMesh.material as THREE.MeshStandardMaterial;
  lwMat.transparent = true;
  lwMat.opacity = 0.5;
  lwMesh.position.set(-0.09, 0, 0);
  leftArm.add(lwMesh);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.12, 0.42, 0.0);
  const rwMesh = mbox(0.18, 0.02, 0.12, wing, wing, 0.5);
  const rwMat = rwMesh.material as THREE.MeshStandardMaterial;
  rwMat.transparent = true;
  rwMat.opacity = 0.5;
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

  // Head
  const head = mbox(0.25, 0.2, 0.2, orange);
  head.position.set(0, 0.5, -0.2);
  group.add(head);

  // Ears (triangular via small boxes rotated)
  const learBox = mbox(0.06, 0.1, 0.04, darkOrange);
  learBox.position.set(-0.1, 0.65, -0.2);
  learBox.rotation.z = 0.2;
  group.add(learBox);
  const rearBox = mbox(0.06, 0.1, 0.04, darkOrange);
  rearBox.position.set(0.1, 0.65, -0.2);
  rearBox.rotation.z = -0.2;
  group.add(rearBox);

  // Eyes
  const le = mbox(0.05, 0.04, 0.02, 0x22cc44);
  le.position.set(-0.06, 0.52, -0.31);
  group.add(le);
  const re = mbox(0.05, 0.04, 0.02, 0x22cc44);
  re.position.set(0.06, 0.52, -0.31);
  group.add(re);

  // Nose
  const nose = mbox(0.04, 0.03, 0.02, 0xdd7788);
  nose.position.set(0, 0.47, -0.31);
  group.add(nose);

  // Body
  const body = mbox(0.22, 0.2, 0.45, orange);
  body.position.set(0, 0.35, 0.1);
  group.add(body);

  // Belly stripe
  const bellyMesh = mbox(0.16, 0.12, 0.35, belly);
  bellyMesh.position.set(0, 0.28, 0.1);
  group.add(bellyMesh);

  // Tail (series of small boxes)
  const tailBase = mbox(0.06, 0.06, 0.15, orange);
  tailBase.position.set(0, 0.4, 0.4);
  tailBase.rotation.x = -0.5;
  group.add(tailBase);
  const tailTip = mbox(0.05, 0.05, 0.12, darkOrange);
  tailTip.position.set(0, 0.5, 0.5);
  tailTip.rotation.x = -1.0;
  group.add(tailTip);

  // Legs
  const frontLeftLeg = limb(0.08, 0.2, 0.08, orange, 0.25, -0.08, -0.1);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.08, 0.2, 0.08, orange, 0.25, 0.08, -0.1);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.08, 0.2, 0.08, orange, 0.25, -0.08, 0.25);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.08, 0.2, 0.08, orange, 0.25, 0.08, 0.25);
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

  // Head
  const head = mbox(0.25, 0.35, 0.55, brown);
  head.position.set(0, 1.15, -0.5);
  head.rotation.x = 0.3;
  group.add(head);

  // Ears
  const lear = mbox(0.06, 0.12, 0.06, brown);
  lear.position.set(-0.08, 1.42, -0.4);
  group.add(lear);
  const rear = mbox(0.06, 0.12, 0.06, brown);
  rear.position.set(0.08, 1.42, -0.4);
  group.add(rear);

  // Eyes
  const le = mbox(0.06, 0.06, 0.02, 0x111111);
  le.position.set(-0.12, 1.18, -0.72);
  group.add(le);
  const re = mbox(0.06, 0.06, 0.02, 0x111111);
  re.position.set(0.12, 1.18, -0.72);
  group.add(re);

  // Mane (along neck/back)
  const maneMesh = mbox(0.06, 0.3, 0.3, mane);
  maneMesh.position.set(0, 1.32, -0.3);
  group.add(maneMesh);

  // Body (large barrel)
  const body = mbox(0.5, 0.5, 0.75, brown);
  body.position.set(0, 0.85, 0.1);
  group.add(body);

  // Tail
  const tail = mbox(0.06, 0.35, 0.06, mane);
  tail.position.set(0, 0.85, 0.5);
  tail.rotation.x = 0.4;
  group.add(tail);

  // Legs (long)
  const frontLeftLeg = limb(0.14, 0.6, 0.14, darkBrown, 0.6, -0.18, -0.2);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.14, 0.6, 0.14, darkBrown, 0.6, 0.18, -0.2);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.14, 0.6, 0.14, darkBrown, 0.6, -0.18, 0.35);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.14, 0.6, 0.14, darkBrown, 0.6, 0.18, 0.35);
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

  // Head
  const head = mbox(0.2, 0.18, 0.18, fur);
  head.position.set(0, 0.38, -0.12);
  group.add(head);

  // Ears (tall)
  const learOuter = mbox(0.06, 0.2, 0.04, fur);
  learOuter.position.set(-0.06, 0.58, -0.1);
  learOuter.rotation.z = 0.15;
  group.add(learOuter);
  const learInner = mbox(0.04, 0.16, 0.02, earInner);
  learInner.position.set(-0.06, 0.58, -0.11);
  learInner.rotation.z = 0.15;
  group.add(learInner);
  const rearOuter = mbox(0.06, 0.2, 0.04, fur);
  rearOuter.position.set(0.06, 0.58, -0.1);
  rearOuter.rotation.z = -0.15;
  group.add(rearOuter);
  const rearInner = mbox(0.04, 0.16, 0.02, earInner);
  rearInner.position.set(0.06, 0.58, -0.11);
  rearInner.rotation.z = -0.15;
  group.add(rearInner);

  // Eyes
  const le = mbox(0.04, 0.04, 0.02, 0xcc2222);
  le.position.set(-0.06, 0.4, -0.22);
  group.add(le);
  const re = mbox(0.04, 0.04, 0.02, 0xcc2222);
  re.position.set(0.06, 0.4, -0.22);
  group.add(re);

  // Nose
  const nose = mbox(0.04, 0.03, 0.02, 0xdd8888);
  nose.position.set(0, 0.36, -0.22);
  group.add(nose);

  // Body
  const body = mbox(0.2, 0.2, 0.3, fur);
  body.position.set(0, 0.25, 0.08);
  group.add(body);

  // Belly
  const bellyMesh = mbox(0.14, 0.1, 0.2, belly);
  bellyMesh.position.set(0, 0.18, 0.08);
  group.add(bellyMesh);

  // Tail (fluffy puff)
  const tail = mbox(0.1, 0.1, 0.08, belly);
  tail.position.set(0, 0.28, 0.28);
  group.add(tail);

  // Legs (short back legs, tiny front)
  const frontLeftLeg = limb(0.06, 0.12, 0.06, fur, 0.15, -0.06, -0.05);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.06, 0.12, 0.06, fur, 0.15, 0.06, -0.05);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.08, 0.15, 0.1, fur, 0.15, -0.08, 0.18);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.08, 0.15, 0.1, fur, 0.15, 0.08, 0.18);
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

  // Head
  const head = mbox(0.28, 0.22, 0.28, gray);
  head.position.set(0, 0.62, -0.28);
  group.add(head);

  // Snout
  const snout = mbox(0.14, 0.1, 0.15, belly);
  snout.position.set(0, 0.56, -0.48);
  group.add(snout);

  // Nose
  const nose = mbox(0.05, 0.04, 0.02, 0x222222);
  nose.position.set(0, 0.58, -0.56);
  group.add(nose);

  // Ears
  const lear = mbox(0.08, 0.12, 0.06, darkGray);
  lear.position.set(-0.1, 0.78, -0.25);
  group.add(lear);
  const rear = mbox(0.08, 0.12, 0.06, darkGray);
  rear.position.set(0.1, 0.78, -0.25);
  group.add(rear);

  // Eyes
  const le = mbox(0.05, 0.04, 0.02, 0x884400);
  le.position.set(-0.08, 0.65, -0.42);
  group.add(le);
  const re = mbox(0.05, 0.04, 0.02, 0x884400);
  re.position.set(0.08, 0.65, -0.42);
  group.add(re);

  // Body
  const body = mbox(0.3, 0.28, 0.5, gray);
  body.position.set(0, 0.45, 0.05);
  group.add(body);

  // Belly
  const bellyMesh = mbox(0.2, 0.14, 0.35, belly);
  bellyMesh.position.set(0, 0.35, 0.05);
  group.add(bellyMesh);

  // Tail (bushy, angled up)
  const tail = mbox(0.08, 0.08, 0.25, gray);
  tail.position.set(0, 0.55, 0.4);
  tail.rotation.x = -0.6;
  group.add(tail);
  const tailTip = mbox(0.06, 0.06, 0.1, belly);
  tailTip.position.set(0, 0.65, 0.5);
  tailTip.rotation.x = -0.8;
  group.add(tailTip);

  // Legs
  const frontLeftLeg = limb(0.1, 0.3, 0.1, darkGray, 0.31, -0.1, -0.15);
  group.add(frontLeftLeg);
  const frontRightLeg = limb(0.1, 0.3, 0.1, darkGray, 0.31, 0.1, -0.15);
  group.add(frontRightLeg);
  const backLeftLeg = limb(0.1, 0.3, 0.1, darkGray, 0.31, -0.1, 0.22);
  group.add(backLeftLeg);
  const backRightLeg = limb(0.1, 0.3, 0.1, darkGray, 0.31, 0.1, 0.22);
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
    case 'slime': return createSlime();
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
  geoCache.clear();
  matCache.clear();
  gltfCache.clear();
  gltfAttempted.clear();
}
