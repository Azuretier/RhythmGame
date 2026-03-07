/**
 * Hostile mob builders: Zombie, Skeleton, Creeper, Spider, Enderman
 */
import * as THREE from 'three';
import type { MobMeshData, MatOpts } from './mob-mesh-utils';
import { mbox, limb } from './mob-mesh-utils';

export function createZombie(): MobMeshData {
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

export function createSkeleton(): MobMeshData {
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

export function createCreeper(): MobMeshData {
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

export function createSpider(): MobMeshData {
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
  for (const [ex, ey, ez] of eyePositions) {
    const eye = mbox(0.06, 0.06, 0.02, eyeColor, eyeColor, 2.0);
    eye.position.set(ex, ey, ez);
    group.add(eye);
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

export function createEnderman(): MobMeshData {
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
