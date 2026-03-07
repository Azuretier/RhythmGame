/**
 * Animal mob builders: Pig, Chicken, Cow, Bee, Cat, Horse, Rabbit, Wolf
 */
import * as THREE from 'three';
import type { MobMeshData, MatOpts } from './mob-mesh-utils';
import { mbox, mboxPhys, limb, getGeo, getPhysicalMat } from './mob-mesh-utils';

export function createPig(): MobMeshData {
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

export function createChicken(): MobMeshData {
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

export function createCow(): MobMeshData {
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

export function createBee(): MobMeshData {
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

export function createCat(): MobMeshData {
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

export function createHorse(): MobMeshData {
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

export function createRabbit(): MobMeshData {
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

export function createWolf(): MobMeshData {
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
