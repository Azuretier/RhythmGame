'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import styles from './AnimeCharacter3D.module.css';

interface AnimeCharacter3DProps {
  size?: number;
  className?: string;
}

// === Material helpers ===
function mat(color: number, opts?: Partial<THREE.MeshStandardMaterialParameters>): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, ...opts });
}

function emissiveMat(color: number, emissive: number, intensity = 0.3): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity });
}

// === Character builder ===
function buildCharacter(): THREE.Group {
  const character = new THREE.Group();

  // -- Color palette --
  const WHITE_HAIR = 0xf0e8e8;
  const HAIR_SHADOW = 0xd8ccd0;
  const SKIN = 0xffe8d6;
  const SKIN_SHADOW = 0xffdbc4;
  const RED_OUTFIT = 0xcc2233;
  const RED_DARK = 0x881420;
  const BLACK_OUTFIT = 0x1a1018;
  const DARK_OUTFIT = 0x2a2030;
  const GLOVE_RED = 0xdd3344;
  const GOLD = 0xddc060;
  const WHITE = 0xffffff;
  const PINK_EYE = 0xe8308c;
  const PINK_BRIGHT = 0xff6eb4;
  const MOUTH_DARK = 0x8b2040;
  const TONGUE_PINK = 0xff7090;
  const TEAL = 0x60d0d0;

  const hairMat = mat(WHITE_HAIR);
  const hairShadowMat = mat(HAIR_SHADOW);
  const skinMat = mat(SKIN);
  const skinShadowMat = mat(SKIN_SHADOW);
  const redMat = mat(RED_OUTFIT);
  const redDarkMat = mat(RED_DARK);
  const blackMat = mat(BLACK_OUTFIT);
  const darkMat = mat(DARK_OUTFIT);
  const gloveMat = mat(GLOVE_RED);
  const goldMat = emissiveMat(GOLD, GOLD, 0.2);
  const whiteMat = mat(WHITE);
  const pinkEyeMat = emissiveMat(PINK_EYE, PINK_BRIGHT, 0.4);
  const mouthMat = mat(MOUTH_DARK);
  const tongueMat = mat(TONGUE_PINK);
  const tealMat = mat(TEAL);

  // ==========================================
  //  HEAD (large chibi sphere)
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.8, 0);

  // Face sphere
  const headGeo = new THREE.SphereGeometry(1.35, 32, 32);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.scale.set(1, 0.95, 0.92);
  headGroup.add(head);

  // Chin (slightly elongated sphere for anime face shape)
  const chinGeo = new THREE.SphereGeometry(0.65, 16, 16);
  const chin = new THREE.Mesh(chinGeo, skinMat);
  chin.position.set(0, -0.9, 0.15);
  chin.scale.set(0.8, 0.6, 0.7);
  headGroup.add(chin);

  // ---- RIGHT EYE (open, large pink) ----
  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.position.set(-0.42, 0.05, 1.05);

  // Eye white
  const eyeWhiteGeo = new THREE.SphereGeometry(0.32, 24, 24);
  const eyeWhite = new THREE.Mesh(eyeWhiteGeo, whiteMat);
  eyeWhite.scale.set(0.75, 1, 0.4);
  rightEyeGroup.add(eyeWhite);

  // Iris
  const irisGeo = new THREE.SphereGeometry(0.22, 24, 24);
  const iris = new THREE.Mesh(irisGeo, pinkEyeMat);
  iris.position.set(0, -0.02, 0.08);
  iris.scale.set(0.75, 1, 0.5);
  rightEyeGroup.add(iris);

  // Pupil
  const pupilGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const pupilMat = mat(0x2a0020);
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.set(0, -0.02, 0.14);
  pupil.scale.set(0.75, 1, 0.5);
  rightEyeGroup.add(pupil);

  // Eye shine
  const shineGeo = new THREE.SphereGeometry(0.08, 12, 12);
  const shineMat = new THREE.MeshStandardMaterial({ color: WHITE, emissive: WHITE, emissiveIntensity: 0.8 });
  const shine1 = new THREE.Mesh(shineGeo, shineMat);
  shine1.position.set(0.08, 0.1, 0.16);
  rightEyeGroup.add(shine1);
  const shine2Geo = new THREE.SphereGeometry(0.04, 8, 8);
  const shine2 = new THREE.Mesh(shine2Geo, shineMat);
  shine2.position.set(-0.08, -0.08, 0.16);
  rightEyeGroup.add(shine2);

  headGroup.add(rightEyeGroup);

  // ---- LEFT EYE (winking - curved line) ----
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(0.42, 0.05, 1.05);

  // Wink line using a torus arc
  const winkGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 16, Math.PI);
  const winkMat = mat(0x3a2030);
  const wink = new THREE.Mesh(winkGeo, winkMat);
  wink.rotation.set(0, 0, Math.PI);
  wink.position.set(0, -0.05, 0.05);
  leftEyeGroup.add(wink);

  // Small eyelashes on wink
  const lashGeo = new THREE.CylinderGeometry(0.008, 0.015, 0.1, 4);
  const lashMat = mat(0x3a2030);
  const lashL = new THREE.Mesh(lashGeo, lashMat);
  lashL.position.set(-0.17, 0.02, 0.05);
  lashL.rotation.z = 0.3;
  leftEyeGroup.add(lashL);
  const lashR = new THREE.Mesh(lashGeo.clone(), lashMat);
  lashR.position.set(0.17, 0.02, 0.05);
  lashR.rotation.z = -0.3;
  leftEyeGroup.add(lashR);

  headGroup.add(leftEyeGroup);

  // ---- Heart above wink eye ----
  const heartGroup = new THREE.Group();
  heartGroup.position.set(0.42, 0.45, 1.0);
  heartGroup.name = 'heart';

  const heartMat = emissiveMat(0xff4488, 0xff4488, 0.6);
  // Heart made of 2 spheres + a cone
  const heartSphereGeo = new THREE.SphereGeometry(0.06, 12, 12);
  const hs1 = new THREE.Mesh(heartSphereGeo, heartMat);
  hs1.position.set(-0.04, 0.03, 0);
  heartGroup.add(hs1);
  const hs2 = new THREE.Mesh(heartSphereGeo.clone(), heartMat);
  hs2.position.set(0.04, 0.03, 0);
  heartGroup.add(hs2);
  const heartConeGeo = new THREE.ConeGeometry(0.07, 0.1, 8);
  const heartCone = new THREE.Mesh(heartConeGeo, heartMat);
  heartCone.position.set(0, -0.03, 0);
  heartCone.rotation.z = Math.PI;
  heartGroup.add(heartCone);

  headGroup.add(heartGroup);

  // ---- Mouth (open, with tongue and fang) ----
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.55, 1.0);

  // Open mouth
  const mouthGeo = new THREE.SphereGeometry(0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.rotation.x = Math.PI;
  mouth.scale.set(1, 0.6, 0.5);
  mouthGroup.add(mouth);

  // Tongue
  const tongueGeo = new THREE.SphereGeometry(0.1, 12, 12);
  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.position.set(0, -0.06, 0.02);
  tongue.scale.set(1, 0.5, 0.6);
  mouthGroup.add(tongue);

  // Fang
  const fangGeo = new THREE.ConeGeometry(0.025, 0.06, 6);
  const fang = new THREE.Mesh(fangGeo, whiteMat);
  fang.position.set(0.1, 0.02, 0.05);
  fang.rotation.z = Math.PI;
  mouthGroup.add(fang);

  headGroup.add(mouthGroup);

  // ---- Nose (tiny) ----
  const noseGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const nose = new THREE.Mesh(noseGeo, skinShadowMat);
  nose.position.set(0, -0.25, 1.15);
  headGroup.add(nose);

  // ---- Blush circles ----
  const blushGeo = new THREE.CircleGeometry(0.15, 16);
  const blushMat = new THREE.MeshStandardMaterial({
    color: 0xff8a8a, transparent: true, opacity: 0.25, side: THREE.DoubleSide,
  });
  const blushL = new THREE.Mesh(blushGeo, blushMat);
  blushL.position.set(0.6, -0.25, 0.95);
  blushL.lookAt(0.6, -0.25, 2);
  headGroup.add(blushL);
  const blushR = new THREE.Mesh(blushGeo.clone(), blushMat);
  blushR.position.set(-0.6, -0.25, 0.95);
  blushR.lookAt(-0.6, -0.25, 2);
  headGroup.add(blushR);

  // ---- Eyebrows ----
  const browGeo = new THREE.CylinderGeometry(0.015, 0.01, 0.25, 6);
  const browMat = mat(HAIR_SHADOW);
  const browL = new THREE.Mesh(browGeo, browMat);
  browL.position.set(0.42, 0.35, 1.0);
  browL.rotation.z = 0.15;
  browL.rotation.x = -0.1;
  headGroup.add(browL);
  const browR = new THREE.Mesh(browGeo.clone(), browMat);
  browR.position.set(-0.42, 0.35, 1.0);
  browR.rotation.z = -0.15;
  browR.rotation.x = -0.1;
  headGroup.add(browR);

  character.add(headGroup);

  // ==========================================
  //  HAIR
  // ==========================================
  const hairGroup = new THREE.Group();
  hairGroup.position.set(0, 2.8, 0);
  hairGroup.name = 'hair';

  // Top hair mass (covers top of head)
  const topHairGeo = new THREE.SphereGeometry(1.42, 32, 32);
  const topHair = new THREE.Mesh(topHairGeo, hairMat);
  topHair.scale.set(1.02, 0.85, 0.96);
  topHair.position.set(0, 0.15, -0.05);
  hairGroup.add(topHair);

  // Bangs (front fringe - multiple overlapping shapes)
  const bangGeo = new THREE.SphereGeometry(0.3, 12, 12);
  const bangPositions = [
    { x: 0, y: 0.25, z: 1.15, sx: 1.2, sy: 1.5, sz: 0.6 },
    { x: 0.35, y: 0.2, z: 1.1, sx: 1, sy: 1.4, sz: 0.5 },
    { x: -0.35, y: 0.2, z: 1.1, sx: 1, sy: 1.4, sz: 0.5 },
    { x: 0.65, y: 0.1, z: 0.95, sx: 0.8, sy: 1.5, sz: 0.5 },
    { x: -0.65, y: 0.1, z: 0.95, sx: 0.8, sy: 1.5, sz: 0.5 },
  ];
  bangPositions.forEach(b => {
    const bang = new THREE.Mesh(bangGeo, hairMat);
    bang.position.set(b.x, b.y, b.z);
    bang.scale.set(b.sx, b.sy, b.sz);
    hairGroup.add(bang);
  });

  // Side hair (framing face, goes down)
  const sideHairGeo = new THREE.CapsuleGeometry(0.2, 1.2, 8, 16);
  const sideHairL = new THREE.Mesh(sideHairGeo, hairMat);
  sideHairL.position.set(0.95, -0.5, 0.4);
  sideHairL.rotation.z = 0.15;
  sideHairL.rotation.x = 0.1;
  hairGroup.add(sideHairL);
  const sideHairR = new THREE.Mesh(sideHairGeo.clone(), hairMat);
  sideHairR.position.set(-0.95, -0.5, 0.4);
  sideHairR.rotation.z = -0.15;
  sideHairR.rotation.x = 0.1;
  hairGroup.add(sideHairR);

  // Twin tails
  const twinTailGeo = new THREE.CapsuleGeometry(0.25, 2.5, 8, 16);

  const twinTailL = new THREE.Group();
  twinTailL.position.set(1.1, -0.1, -0.2);
  twinTailL.name = 'twinTailL';
  const ttlMesh = new THREE.Mesh(twinTailGeo, hairMat);
  ttlMesh.rotation.z = 0.4;
  ttlMesh.rotation.x = -0.15;
  twinTailL.add(ttlMesh);
  // Tip wisp
  const wispGeo = new THREE.CapsuleGeometry(0.15, 0.8, 6, 8);
  const wispL = new THREE.Mesh(wispGeo, hairShadowMat);
  wispL.position.set(0.8, -1.5, 0);
  wispL.rotation.z = 0.6;
  twinTailL.add(wispL);
  hairGroup.add(twinTailL);

  const twinTailR = new THREE.Group();
  twinTailR.position.set(-1.1, -0.1, -0.2);
  twinTailR.name = 'twinTailR';
  const ttrMesh = new THREE.Mesh(twinTailGeo.clone(), hairMat);
  ttrMesh.rotation.z = -0.4;
  ttrMesh.rotation.x = -0.15;
  twinTailR.add(ttrMesh);
  const wispR = new THREE.Mesh(wispGeo.clone(), hairShadowMat);
  wispR.position.set(-0.8, -1.5, 0);
  wispR.rotation.z = -0.6;
  twinTailR.add(wispR);
  hairGroup.add(twinTailR);

  // Back hair mass
  const backHairGeo = new THREE.SphereGeometry(1.2, 24, 24);
  const backHair = new THREE.Mesh(backHairGeo, hairShadowMat);
  backHair.position.set(0, -0.3, -0.5);
  backHair.scale.set(1, 1.3, 0.8);
  hairGroup.add(backHair);

  // Ahoge (antenna tufts)
  const ahogeGeo = new THREE.ConeGeometry(0.06, 0.6, 6);
  const ahoge1 = new THREE.Mesh(ahogeGeo, hairMat);
  ahoge1.position.set(0.1, 1.15, 0.2);
  ahoge1.rotation.z = -0.3;
  ahoge1.rotation.x = 0.3;
  ahoge1.name = 'ahoge1';
  hairGroup.add(ahoge1);
  const ahoge2 = new THREE.Mesh(ahogeGeo.clone(), hairMat);
  ahoge2.position.set(-0.05, 1.2, 0.15);
  ahoge2.rotation.z = 0.2;
  ahoge2.rotation.x = 0.4;
  ahoge2.name = 'ahoge2';
  hairGroup.add(ahoge2);

  // Twin tail ribbons
  const ribbonGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 12, Math.PI * 1.5);
  const ribbonMat = mat(RED_OUTFIT);
  const ribbonL = new THREE.Mesh(ribbonGeo, ribbonMat);
  ribbonL.position.set(1.1, 0.1, -0.2);
  ribbonL.rotation.y = Math.PI * 0.5;
  hairGroup.add(ribbonL);
  const ribbonDotGeoL = new THREE.SphereGeometry(0.06, 8, 8);
  const ribbonDotL = new THREE.Mesh(ribbonDotGeoL, redMat);
  ribbonDotL.position.set(1.1, 0.1, -0.2);
  hairGroup.add(ribbonDotL);

  const ribbonR = new THREE.Mesh(ribbonGeo.clone(), ribbonMat);
  ribbonR.position.set(-1.1, 0.1, -0.2);
  ribbonR.rotation.y = -Math.PI * 0.5;
  hairGroup.add(ribbonR);
  const ribbonDotR = new THREE.Mesh(ribbonDotGeoL.clone(), redMat);
  ribbonDotR.position.set(-1.1, 0.1, -0.2);
  hairGroup.add(ribbonDotR);

  character.add(hairGroup);

  // ==========================================
  //  TOP HAT
  // ==========================================
  const hatGroup = new THREE.Group();
  hatGroup.position.set(0.3, 4.35, 0.1);
  hatGroup.rotation.z = 0.15;
  hatGroup.name = 'hat';

  // Hat body
  const hatBodyGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.6, 24);
  const hatBody = new THREE.Mesh(hatBodyGeo, darkMat);
  hatGroup.add(hatBody);

  // Hat brim
  const hatBrimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24);
  const hatBrim = new THREE.Mesh(hatBrimGeo, darkMat);
  hatBrim.position.y = -0.3;
  hatGroup.add(hatBrim);

  // Hat top
  const hatTopGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.04, 24);
  const hatTop = new THREE.Mesh(hatTopGeo, blackMat);
  hatTop.position.y = 0.32;
  hatGroup.add(hatTop);

  // Red band
  const bandGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.1, 24);
  const band = new THREE.Mesh(bandGeo, redMat);
  band.position.y = -0.1;
  hatGroup.add(band);

  // Gold buckle
  const buckleGeo = new THREE.SphereGeometry(0.06, 12, 12);
  const buckle = new THREE.Mesh(buckleGeo, goldMat);
  buckle.position.set(0, -0.1, 0.4);
  hatGroup.add(buckle);

  // Spade charm dangling
  const spadeStemGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4);
  const spadeStem = new THREE.Mesh(spadeStemGeo, goldMat);
  spadeStem.position.set(0.2, -0.45, 0.2);
  hatGroup.add(spadeStem);
  const spadeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const spade = new THREE.Mesh(spadeGeo, blackMat);
  spade.position.set(0.2, -0.58, 0.2);
  spade.scale.set(0.8, 1.1, 0.5);
  hatGroup.add(spade);

  character.add(hatGroup);

  // ==========================================
  //  NECK
  // ==========================================
  const neckGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.35, 12);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.set(0, 1.55, 0);
  character.add(neck);

  // ==========================================
  //  BODY (red gothic lolita dress)
  // ==========================================
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.6, 0);

  // Torso
  const torsoGeo = new THREE.CylinderGeometry(0.55, 0.5, 1.2, 16);
  const torso = new THREE.Mesh(torsoGeo, redMat);
  torso.position.y = 0.3;
  bodyGroup.add(torso);

  // White lace collar
  const collarGeo = new THREE.TorusGeometry(0.42, 0.06, 8, 24);
  const collar = new THREE.Mesh(collarGeo, whiteMat);
  collar.position.set(0, 0.85, 0.05);
  collar.rotation.x = Math.PI * 0.5;
  bodyGroup.add(collar);

  // Black trim band at chest
  const trimGeo = new THREE.CylinderGeometry(0.54, 0.53, 0.06, 16);
  const trim1 = new THREE.Mesh(trimGeo, blackMat);
  trim1.position.y = 0.15;
  bodyGroup.add(trim1);

  // Center line
  const lineGeo = new THREE.BoxGeometry(0.02, 0.8, 0.02);
  const centerLine = new THREE.Mesh(lineGeo, blackMat);
  centerLine.position.set(0, 0.3, 0.5);
  bodyGroup.add(centerLine);

  // Cross lacing
  const laceGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.35, 4);
  const laceMat = mat(BLACK_OUTFIT);
  for (let i = 0; i < 3; i++) {
    const y = 0.55 - i * 0.2;
    const lace1 = new THREE.Mesh(laceGeo, laceMat);
    lace1.position.set(0, y, 0.5);
    lace1.rotation.z = 0.6;
    lace1.rotation.y = 0;
    bodyGroup.add(lace1);
    const lace2 = new THREE.Mesh(laceGeo.clone(), laceMat);
    lace2.position.set(0, y, 0.5);
    lace2.rotation.z = -0.6;
    bodyGroup.add(lace2);
  }

  // Bunny charm at waist
  const bunnyGroup = new THREE.Group();
  bunnyGroup.position.set(0, -0.05, 0.55);
  bunnyGroup.name = 'bunny';
  // Body
  const bunnyBodyGeo = new THREE.SphereGeometry(0.08, 10, 10);
  const bunnyBody = new THREE.Mesh(bunnyBodyGeo, whiteMat);
  bunnyBody.scale.set(0.8, 1, 0.7);
  bunnyGroup.add(bunnyBody);
  // Ears
  const earGeo = new THREE.CapsuleGeometry(0.015, 0.08, 4, 6);
  const earL = new THREE.Mesh(earGeo, whiteMat);
  earL.position.set(-0.03, 0.1, 0);
  earL.rotation.z = 0.2;
  bunnyGroup.add(earL);
  const earR = new THREE.Mesh(earGeo.clone(), whiteMat);
  earR.position.set(0.03, 0.1, 0);
  earR.rotation.z = -0.2;
  bunnyGroup.add(earR);
  // Eyes
  const bunnyEyeGeo = new THREE.SphereGeometry(0.015, 6, 6);
  const bunnyEyeMat = mat(BLACK_OUTFIT);
  const bEyeL = new THREE.Mesh(bunnyEyeGeo, bunnyEyeMat);
  bEyeL.position.set(-0.025, 0.02, 0.06);
  bunnyGroup.add(bEyeL);
  const bEyeR = new THREE.Mesh(bunnyEyeGeo.clone(), bunnyEyeMat);
  bEyeR.position.set(0.025, 0.02, 0.06);
  bunnyGroup.add(bEyeR);
  // Bow
  const bowGeo = new THREE.SphereGeometry(0.03, 6, 6);
  const bowL = new THREE.Mesh(bowGeo, tealMat);
  bowL.position.set(-0.04, 0, 0.05);
  bowL.scale.set(1.3, 0.7, 0.5);
  bunnyGroup.add(bowL);
  const bowR = new THREE.Mesh(bowGeo.clone(), tealMat);
  bowR.position.set(0.04, 0, 0.05);
  bowR.scale.set(1.3, 0.7, 0.5);
  bunnyGroup.add(bowR);
  bodyGroup.add(bunnyGroup);

  // Belt / waist trim
  const beltGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.06, 16);
  const belt = new THREE.Mesh(beltGeo, blackMat);
  belt.position.y = -0.25;
  bodyGroup.add(belt);

  character.add(bodyGroup);

  // ==========================================
  //  SKIRT (black with red trim)
  // ==========================================
  const skirtGroup = new THREE.Group();
  skirtGroup.position.set(0, -0.05, 0);

  // Main skirt - flared cone
  const skirtGeo = new THREE.CylinderGeometry(0.5, 0.9, 0.8, 20, 1, true);
  const skirtMainMat = new THREE.MeshStandardMaterial({
    color: BLACK_OUTFIT, side: THREE.DoubleSide,
  });
  const skirt = new THREE.Mesh(skirtGeo, skirtMainMat);
  skirt.position.y = -0.1;
  skirtGroup.add(skirt);

  // Skirt bottom cap (disc)
  const skirtBottomGeo = new THREE.RingGeometry(0.15, 0.9, 20);
  const skirtBottom = new THREE.Mesh(skirtBottomGeo, skirtMainMat);
  skirtBottom.rotation.x = -Math.PI * 0.5;
  skirtBottom.position.y = -0.5;
  skirtGroup.add(skirtBottom);

  // Red trim ring at skirt bottom
  const skirtTrimGeo = new THREE.TorusGeometry(0.88, 0.03, 8, 32);
  const skirtTrim = new THREE.Mesh(skirtTrimGeo, redMat);
  skirtTrim.position.y = -0.48;
  skirtTrim.rotation.x = Math.PI * 0.5;
  skirtGroup.add(skirtTrim);

  // White lace trim at bottom
  const laceTrimGeo = new THREE.TorusGeometry(0.9, 0.015, 8, 48);
  const laceTrimMesh = new THREE.Mesh(laceTrimGeo, whiteMat);
  laceTrimMesh.position.y = -0.52;
  laceTrimMesh.rotation.x = Math.PI * 0.5;
  skirtGroup.add(laceTrimMesh);

  character.add(skirtGroup);

  // ==========================================
  //  ARMS (with oversized red gloves)
  // ==========================================
  // Left arm (reaching forward / pointing)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(0.7, 1.15, 0);
  leftArmGroup.name = 'leftArm';

  const upperArmGeo = new THREE.CapsuleGeometry(0.12, 0.5, 6, 8);
  const upperArmL = new THREE.Mesh(upperArmGeo, redDarkMat);
  upperArmL.rotation.z = -0.8;
  upperArmL.rotation.x = 0.6;
  leftArmGroup.add(upperArmL);

  // Forearm - pointing forward
  const forearmL = new THREE.Mesh(upperArmGeo.clone(), redMat);
  forearmL.position.set(-0.3, -0.25, 0.5);
  forearmL.rotation.z = 0.2;
  forearmL.rotation.x = 1.0;
  leftArmGroup.add(forearmL);

  // Big red glove (pointing)
  const gloveGeo = new THREE.SphereGeometry(0.2, 16, 16);
  const gloveL = new THREE.Mesh(gloveGeo, gloveMat);
  gloveL.position.set(-0.4, -0.35, 0.95);
  gloveL.scale.set(0.9, 0.8, 1.2);
  leftArmGroup.add(gloveL);

  // Gold cuff
  const cuffGeo = new THREE.TorusGeometry(0.14, 0.03, 8, 16);
  const cuffL = new THREE.Mesh(cuffGeo, goldMat);
  cuffL.position.set(-0.35, -0.25, 0.7);
  cuffL.rotation.x = 0.6;
  leftArmGroup.add(cuffL);

  // Pointing finger
  const fingerGeo = new THREE.CapsuleGeometry(0.04, 0.2, 6, 6);
  const fingerL = new THREE.Mesh(fingerGeo, gloveMat);
  fingerL.position.set(-0.4, -0.3, 1.15);
  fingerL.rotation.x = 0.2;
  leftArmGroup.add(fingerL);

  character.add(leftArmGroup);

  // Right arm (down/relaxed)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-0.7, 1.15, 0);
  rightArmGroup.name = 'rightArm';

  const upperArmR = new THREE.Mesh(upperArmGeo.clone(), redDarkMat);
  upperArmR.rotation.z = 0.4;
  rightArmGroup.add(upperArmR);

  const forearmR = new THREE.Mesh(upperArmGeo.clone(), redMat);
  forearmR.position.set(0.15, -0.55, 0);
  forearmR.rotation.z = 0.2;
  rightArmGroup.add(forearmR);

  const gloveR = new THREE.Mesh(gloveGeo.clone(), gloveMat);
  gloveR.position.set(0.2, -0.85, 0.05);
  gloveR.scale.set(0.9, 0.8, 1);
  rightArmGroup.add(gloveR);

  const cuffR = new THREE.Mesh(cuffGeo.clone(), goldMat);
  cuffR.position.set(0.18, -0.6, 0);
  rightArmGroup.add(cuffR);

  character.add(rightArmGroup);

  // ==========================================
  //  LEGS (short, chibi + black stockings)
  // ==========================================
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.4, 6, 8);

  const legL = new THREE.Mesh(legGeo, blackMat);
  legL.position.set(0.2, -0.85, 0);
  character.add(legL);

  const legR = new THREE.Mesh(legGeo.clone(), blackMat);
  legR.position.set(-0.2, -0.85, 0);
  character.add(legR);

  // Shoes
  const shoeGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const shoeL = new THREE.Mesh(shoeGeo, darkMat);
  shoeL.position.set(0.2, -1.15, 0.04);
  shoeL.scale.set(0.85, 0.6, 1.2);
  character.add(shoeL);
  const shoeR = new THREE.Mesh(shoeGeo.clone(), darkMat);
  shoeR.position.set(-0.2, -1.15, 0.04);
  shoeR.scale.set(0.85, 0.6, 1.2);
  character.add(shoeR);

  // ==========================================
  //  FLOATING PINK DIAMONDS
  // ==========================================
  const diamondGeo = new THREE.OctahedronGeometry(0.12, 0);
  const diamondMat = emissiveMat(PINK_BRIGHT, PINK_BRIGHT, 0.5);
  diamondMat.transparent = true;
  diamondMat.opacity = 0.6;

  const diamondPositions = [
    { x: 2.0, y: 2.5, z: 0.5 },
    { x: -1.8, y: 1.8, z: 0.8 },
    { x: 1.5, y: 0.5, z: -0.5 },
    { x: -2.2, y: 3.2, z: -0.3 },
    { x: 2.3, y: -0.3, z: 0.2 },
  ];

  diamondPositions.forEach((pos, i) => {
    const d = new THREE.Mesh(diamondGeo, diamondMat);
    d.position.set(pos.x, pos.y, pos.z);
    d.scale.setScalar(0.6 + (i % 3) * 0.3);
    d.name = `diamond_${i}`;
    character.add(d);
  });

  // Small sparkle spheres
  const sparkleMat = emissiveMat(WHITE, 0xff80c0, 0.8);
  sparkleMat.transparent = true;
  sparkleMat.opacity = 0.5;
  const sparkleGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const sparklePositions = [
    { x: 1.6, y: 3.5, z: 0.3 },
    { x: -1.5, y: 0.8, z: 1.0 },
    { x: 2.0, y: 1.2, z: -0.4 },
  ];
  sparklePositions.forEach((pos, i) => {
    const s = new THREE.Mesh(sparkleGeo, sparkleMat);
    s.position.set(pos.x, pos.y, pos.z);
    s.name = `sparkle_${i}`;
    character.add(s);
  });

  return character;
}

// === Collect all disposable resources from a group ===
function disposeGroup(group: THREE.Group) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
}

export default function AnimeCharacter3D({ size = 300, className }: AnimeCharacter3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef(0);
  const characterRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
  } | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const isHoveredRef = useRef(false);
  const clickTimeRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, []);

  const handleClick = useCallback(() => {
    clickTimeRef.current = performance.now();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 1.5, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff88cc, 0.4);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // Subtle point light for eye sparkle
    const eyeLight = new THREE.PointLight(0xffffff, 0.3, 5);
    eyeLight.position.set(0, 3.5, 4);
    scene.add(eyeLight);

    // Build character
    const character = buildCharacter();
    scene.add(character);
    characterRef.current = character;

    sceneRef.current = { renderer, scene, camera };

    // Resize handler
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

    // Mouse tracking
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', () => { isHoveredRef.current = true; });
    canvas.addEventListener('mouseleave', () => { isHoveredRef.current = false; });
    canvas.addEventListener('click', handleClick);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const char = characterRef.current;
      if (!char) return;

      // Idle floating
      char.position.y = Math.sin(t * 1.2) * 0.15;

      // Gentle rotation toward mouse when hovered, else slow idle spin
      const targetRotY = isHoveredRef.current
        ? mouseRef.current.x * 0.4
        : Math.sin(t * 0.3) * 0.15;
      char.rotation.y += (targetRotY - char.rotation.y) * 0.05;

      const targetRotX = isHoveredRef.current
        ? mouseRef.current.y * -0.1
        : 0;
      char.rotation.x += (targetRotX - char.rotation.x) * 0.05;

      // Hair sway
      const hair = char.getObjectByName('hair');
      if (hair) {
        const twinL = hair.getObjectByName('twinTailL');
        const twinR = hair.getObjectByName('twinTailR');
        if (twinL) {
          twinL.rotation.z = Math.sin(t * 1.5) * 0.08;
          twinL.rotation.x = Math.sin(t * 1.2 + 0.5) * 0.05;
        }
        if (twinR) {
          twinR.rotation.z = Math.sin(t * 1.5 + Math.PI) * 0.08;
          twinR.rotation.x = Math.sin(t * 1.2 + Math.PI + 0.5) * 0.05;
        }
        // Ahoge bounce
        const ah1 = hair.getObjectByName('ahoge1');
        const ah2 = hair.getObjectByName('ahoge2');
        if (ah1) ah1.rotation.z = -0.3 + Math.sin(t * 3) * 0.15;
        if (ah2) ah2.rotation.z = 0.2 + Math.sin(t * 2.5 + 1) * 0.12;
      }

      // Hat subtle wobble
      const hat = char.getObjectByName('hat');
      if (hat) {
        hat.rotation.z = 0.15 + Math.sin(t * 1.0) * 0.03;
        hat.rotation.x = Math.sin(t * 0.8) * 0.02;
      }

      // Heart pulse
      const heart = char.children[0]?.getObjectByName('heart');
      if (heart) {
        const pulse = 1 + Math.sin(t * 4) * 0.15;
        heart.scale.setScalar(pulse);
      }

      // Bunny charm sway
      const bunny = char.getObjectByName('bunny');
      if (bunny) {
        bunny.rotation.z = Math.sin(t * 2) * 0.1;
      }

      // Left arm subtle movement
      const leftArm = char.getObjectByName('leftArm');
      if (leftArm) {
        leftArm.rotation.x = Math.sin(t * 1.3) * 0.05;
      }

      // Floating diamonds rotation & bobbing
      for (let i = 0; i < 5; i++) {
        const d = char.getObjectByName(`diamond_${i}`);
        if (d) {
          d.rotation.y = t * (0.8 + i * 0.3);
          d.rotation.x = t * (0.5 + i * 0.2);
          d.position.y += Math.sin(t * (1 + i * 0.4) + i) * 0.002;
        }
      }

      // Sparkle twinkle
      for (let i = 0; i < 3; i++) {
        const s = char.getObjectByName(`sparkle_${i}`);
        if (s) {
          const sparkleScale = 0.5 + Math.sin(t * 3 + i * 2) * 0.5;
          s.scale.setScalar(Math.max(0, sparkleScale));
        }
      }

      // Click bounce reaction
      const clickAge = (performance.now() - clickTimeRef.current) / 1000;
      if (clickAge < 0.5) {
        const bounce = Math.sin(clickAge * Math.PI * 4) * 0.2 * (1 - clickAge * 2);
        char.position.y += bounce;
        char.scale.setScalar(1 + Math.sin(clickAge * Math.PI * 2) * 0.05);
      } else {
        char.scale.setScalar(1);
      }

      renderer.render(scene, camera);
    };
    animIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', updateSize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      disposeGroup(character);
      scene.remove(character);
      renderer.dispose();
      sceneRef.current = null;
      characterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`${styles.wrapper} ${className || ''}`}
      style={{ width: size, height: size * 1.2 }}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
      />
    </div>
  );
}
