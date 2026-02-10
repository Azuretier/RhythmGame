/**
 * GLB Export Script - Generates the chibi anime character as a .glb file.
 *
 * Run: node --experimental-vm-modules scripts/export-character-glb.mjs
 *
 * The character matches the reference: white-haired twin-tail girl with
 * black top hat, pink eyes (one winking), red & black gothic lolita outfit,
 * oversized red gloves, bunny charm, and floating pink diamonds.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Blob } from 'buffer';

// Polyfill browser globals needed by Three.js GLTFExporter in Node.js
globalThis.Blob = Blob;
globalThis.FileReader = class NodeFileReader {
  constructor() {
    this.result = null;
    this.onload = null;
    this.onloadend = null;
    this.onerror = null;
    this.readyState = 0; // EMPTY
  }
  readAsArrayBuffer(blob) {
    this.readyState = 1; // LOADING
    blob.arrayBuffer().then((buf) => {
      this.readyState = 2; // DONE
      this.result = buf;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }).catch((err) => {
      if (this.onerror) this.onerror(err);
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
  readAsDataURL(blob) {
    this.readyState = 1;
    blob.arrayBuffer().then((buf) => {
      this.readyState = 2;
      const b64 = Buffer.from(buf).toString('base64');
      this.result = 'data:application/octet-stream;base64,' + b64;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }).catch((err) => {
      if (this.onerror) this.onerror(err);
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
};
globalThis.document = {
  createElementNS: () => ({ setAttribute: () => {}, style: {} }),
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 0, height: 0,
        getContext: () => ({
          fillRect: () => {},
          drawImage: () => {},
          getImageData: () => ({ data: new Uint8ClampedArray(0) }),
          putImageData: () => {},
          createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        }),
        toDataURL: () => '',
      };
    }
    return { style: {} };
  },
};
globalThis.self = globalThis;

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Material helpers
// ============================================================
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, ...opts });
}

function emissiveMat(color, emissive, intensity = 0.3) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
  });
}

// ============================================================
// Color palette
// ============================================================
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

// ============================================================
// Reusable materials
// ============================================================
const hairMat = mat(WHITE_HAIR, { name: 'Hair' });
const hairShadowMat = mat(HAIR_SHADOW, { name: 'HairShadow' });
const skinMat = mat(SKIN, { name: 'Skin', roughness: 0.6 });
const skinShadowMat = mat(SKIN_SHADOW, { name: 'SkinShadow' });
const redMat = mat(RED_OUTFIT, { name: 'RedOutfit' });
const redDarkMat = mat(RED_DARK, { name: 'RedDark' });
const blackMat = mat(BLACK_OUTFIT, { name: 'BlackOutfit' });
const darkMat = mat(DARK_OUTFIT, { name: 'DarkOutfit' });
const gloveMat = mat(GLOVE_RED, { name: 'GloveRed' });
const goldMat = emissiveMat(GOLD, GOLD, 0.2);
goldMat.name = 'Gold';
const whiteMat = mat(WHITE, { name: 'White' });
const pinkEyeMat = emissiveMat(PINK_EYE, PINK_BRIGHT, 0.4);
pinkEyeMat.name = 'PinkEye';
const mouthMat = mat(MOUTH_DARK, { name: 'Mouth' });
const tongueMat = mat(TONGUE_PINK, { name: 'Tongue' });
const tealMat = mat(TEAL, { name: 'Teal' });
const heartMat = emissiveMat(0xff4488, 0xff4488, 0.6);
heartMat.name = 'Heart';
const pupilMat = mat(0x2a0020, { name: 'Pupil' });
const winkMat = mat(0x3a2030, { name: 'WinkLine' });
const browMat = mat(HAIR_SHADOW, { name: 'Brow' });
const blushMat = mat(0xff8a8a, { name: 'Blush', transparent: true, opacity: 0.25, side: THREE.DoubleSide });
const laceMat = mat(BLACK_OUTFIT, { name: 'Lace' });
const bunnyEyeMat = mat(BLACK_OUTFIT, { name: 'BunnyEye' });
const ribbonMat = mat(RED_OUTFIT, { name: 'Ribbon' });
const shineMat = new THREE.MeshStandardMaterial({ color: WHITE, emissive: WHITE, emissiveIntensity: 0.8, name: 'EyeShine' });
const skirtMainMat = mat(BLACK_OUTFIT, { name: 'Skirt', side: THREE.DoubleSide });
const diamondMat = emissiveMat(PINK_BRIGHT, PINK_BRIGHT, 0.5);
diamondMat.transparent = true;
diamondMat.opacity = 0.6;
diamondMat.name = 'Diamond';
const sparkleMat = emissiveMat(WHITE, 0xff80c0, 0.8);
sparkleMat.transparent = true;
sparkleMat.opacity = 0.5;
sparkleMat.name = 'Sparkle';

// ============================================================
// Build the character model
// ============================================================
function buildCharacter() {
  const root = new THREE.Group();
  root.name = 'CharacterRoot';

  // ----------------------------------------------------------
  // HEAD
  // ----------------------------------------------------------
  const headGroup = new THREE.Group();
  headGroup.name = 'Head';
  headGroup.position.set(0, 2.8, 0);

  // Face
  const headGeo = new THREE.SphereGeometry(1.35, 32, 32);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.name = 'Face';
  head.scale.set(1, 0.95, 0.92);
  headGroup.add(head);

  // Chin
  const chinGeo = new THREE.SphereGeometry(0.65, 16, 16);
  const chin = new THREE.Mesh(chinGeo, skinMat);
  chin.name = 'Chin';
  chin.position.set(0, -0.9, 0.15);
  chin.scale.set(0.8, 0.6, 0.7);
  headGroup.add(chin);

  // --- RIGHT EYE (open) ---
  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.name = 'RightEye';
  rightEyeGroup.position.set(-0.42, 0.05, 1.05);

  const eyeWhiteGeo = new THREE.SphereGeometry(0.32, 24, 24);
  const eyeWhite = new THREE.Mesh(eyeWhiteGeo, whiteMat);
  eyeWhite.name = 'EyeWhite_R';
  eyeWhite.scale.set(0.75, 1, 0.4);
  rightEyeGroup.add(eyeWhite);

  const irisGeo = new THREE.SphereGeometry(0.22, 24, 24);
  const iris = new THREE.Mesh(irisGeo, pinkEyeMat);
  iris.name = 'Iris_R';
  iris.position.set(0, -0.02, 0.08);
  iris.scale.set(0.75, 1, 0.5);
  rightEyeGroup.add(iris);

  const pupilGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.name = 'Pupil_R';
  pupil.position.set(0, -0.02, 0.14);
  pupil.scale.set(0.75, 1, 0.5);
  rightEyeGroup.add(pupil);

  const shineGeo = new THREE.SphereGeometry(0.08, 12, 12);
  const shine1 = new THREE.Mesh(shineGeo, shineMat);
  shine1.name = 'EyeShine_R1';
  shine1.position.set(0.08, 0.1, 0.16);
  rightEyeGroup.add(shine1);

  const shine2Geo = new THREE.SphereGeometry(0.04, 8, 8);
  const shine2 = new THREE.Mesh(shine2Geo, shineMat);
  shine2.name = 'EyeShine_R2';
  shine2.position.set(-0.08, -0.08, 0.16);
  rightEyeGroup.add(shine2);

  headGroup.add(rightEyeGroup);

  // --- LEFT EYE (winking) ---
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.name = 'LeftEye';
  leftEyeGroup.position.set(0.42, 0.05, 1.05);

  const winkGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 16, Math.PI);
  const wink = new THREE.Mesh(winkGeo, winkMat);
  wink.name = 'WinkLine';
  wink.rotation.set(0, 0, Math.PI);
  wink.position.set(0, -0.05, 0.05);
  leftEyeGroup.add(wink);

  const lashGeo = new THREE.CylinderGeometry(0.008, 0.015, 0.1, 4);
  const lashL = new THREE.Mesh(lashGeo, winkMat);
  lashL.name = 'Lash_L1';
  lashL.position.set(-0.17, 0.02, 0.05);
  lashL.rotation.z = 0.3;
  leftEyeGroup.add(lashL);
  const lashR = new THREE.Mesh(lashGeo.clone(), winkMat);
  lashR.name = 'Lash_L2';
  lashR.position.set(0.17, 0.02, 0.05);
  lashR.rotation.z = -0.3;
  leftEyeGroup.add(lashR);

  headGroup.add(leftEyeGroup);

  // --- Heart above wink ---
  const heartGroup = new THREE.Group();
  heartGroup.name = 'Heart';
  heartGroup.position.set(0.42, 0.45, 1.0);

  const heartSphGeo = new THREE.SphereGeometry(0.06, 12, 12);
  const hs1 = new THREE.Mesh(heartSphGeo, heartMat);
  hs1.name = 'HeartL';
  hs1.position.set(-0.04, 0.03, 0);
  heartGroup.add(hs1);
  const hs2 = new THREE.Mesh(heartSphGeo.clone(), heartMat);
  hs2.name = 'HeartR';
  hs2.position.set(0.04, 0.03, 0);
  heartGroup.add(hs2);
  const heartConeGeo = new THREE.ConeGeometry(0.07, 0.1, 8);
  const heartCone = new THREE.Mesh(heartConeGeo, heartMat);
  heartCone.name = 'HeartCone';
  heartCone.position.set(0, -0.03, 0);
  heartCone.rotation.z = Math.PI;
  heartGroup.add(heartCone);

  headGroup.add(heartGroup);

  // --- Mouth ---
  const mouthGroup = new THREE.Group();
  mouthGroup.name = 'Mouth';
  mouthGroup.position.set(0, -0.55, 1.0);

  const mouthGeo = new THREE.SphereGeometry(0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.name = 'MouthShape';
  mouth.rotation.x = Math.PI;
  mouth.scale.set(1, 0.6, 0.5);
  mouthGroup.add(mouth);

  const tongueGeo = new THREE.SphereGeometry(0.1, 12, 12);
  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.name = 'Tongue';
  tongue.position.set(0, -0.06, 0.02);
  tongue.scale.set(1, 0.5, 0.6);
  mouthGroup.add(tongue);

  const fangGeo = new THREE.ConeGeometry(0.025, 0.06, 6);
  const fang = new THREE.Mesh(fangGeo, whiteMat);
  fang.name = 'Fang';
  fang.position.set(0.1, 0.02, 0.05);
  fang.rotation.z = Math.PI;
  mouthGroup.add(fang);

  headGroup.add(mouthGroup);

  // Nose
  const noseGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const nose = new THREE.Mesh(noseGeo, skinShadowMat);
  nose.name = 'Nose';
  nose.position.set(0, -0.25, 1.15);
  headGroup.add(nose);

  // Blush
  const blushGeo = new THREE.CircleGeometry(0.15, 16);
  const blushL = new THREE.Mesh(blushGeo, blushMat);
  blushL.name = 'BlushL';
  blushL.position.set(0.6, -0.25, 0.95);
  blushL.lookAt(0.6, -0.25, 2);
  headGroup.add(blushL);
  const blushR = new THREE.Mesh(blushGeo.clone(), blushMat);
  blushR.name = 'BlushR';
  blushR.position.set(-0.6, -0.25, 0.95);
  blushR.lookAt(-0.6, -0.25, 2);
  headGroup.add(blushR);

  // Eyebrows
  const browGeo = new THREE.CylinderGeometry(0.015, 0.01, 0.25, 6);
  const browL = new THREE.Mesh(browGeo, browMat);
  browL.name = 'BrowL';
  browL.position.set(0.42, 0.35, 1.0);
  browL.rotation.z = 0.15;
  browL.rotation.x = -0.1;
  headGroup.add(browL);
  const browR = new THREE.Mesh(browGeo.clone(), browMat);
  browR.name = 'BrowR';
  browR.position.set(-0.42, 0.35, 1.0);
  browR.rotation.z = -0.15;
  browR.rotation.x = -0.1;
  headGroup.add(browR);

  root.add(headGroup);

  // ----------------------------------------------------------
  // HAIR
  // ----------------------------------------------------------
  const hairGroup = new THREE.Group();
  hairGroup.name = 'Hair';
  hairGroup.position.set(0, 2.8, 0);

  // Top hair mass
  const topHairGeo = new THREE.SphereGeometry(1.42, 32, 32);
  const topHair = new THREE.Mesh(topHairGeo, hairMat);
  topHair.name = 'TopHair';
  topHair.scale.set(1.02, 0.85, 0.96);
  topHair.position.set(0, 0.15, -0.05);
  hairGroup.add(topHair);

  // Bangs
  const bangGeo = new THREE.SphereGeometry(0.3, 12, 12);
  const bangData = [
    { x: 0, y: 0.25, z: 1.15, sx: 1.2, sy: 1.5, sz: 0.6 },
    { x: 0.35, y: 0.2, z: 1.1, sx: 1, sy: 1.4, sz: 0.5 },
    { x: -0.35, y: 0.2, z: 1.1, sx: 1, sy: 1.4, sz: 0.5 },
    { x: 0.65, y: 0.1, z: 0.95, sx: 0.8, sy: 1.5, sz: 0.5 },
    { x: -0.65, y: 0.1, z: 0.95, sx: 0.8, sy: 1.5, sz: 0.5 },
  ];
  bangData.forEach((b, i) => {
    const bang = new THREE.Mesh(bangGeo, hairMat);
    bang.name = `Bang_${i}`;
    bang.position.set(b.x, b.y, b.z);
    bang.scale.set(b.sx, b.sy, b.sz);
    hairGroup.add(bang);
  });

  // Side hair
  const sideHairGeo = new THREE.CapsuleGeometry(0.2, 1.2, 8, 16);
  const sideHairL = new THREE.Mesh(sideHairGeo, hairMat);
  sideHairL.name = 'SideHairL';
  sideHairL.position.set(0.95, -0.5, 0.4);
  sideHairL.rotation.z = 0.15;
  sideHairL.rotation.x = 0.1;
  hairGroup.add(sideHairL);
  const sideHairR = new THREE.Mesh(sideHairGeo.clone(), hairMat);
  sideHairR.name = 'SideHairR';
  sideHairR.position.set(-0.95, -0.5, 0.4);
  sideHairR.rotation.z = -0.15;
  sideHairR.rotation.x = 0.1;
  hairGroup.add(sideHairR);

  // Twin tails
  const twinTailGeo = new THREE.CapsuleGeometry(0.25, 2.5, 8, 16);
  const wispGeo = new THREE.CapsuleGeometry(0.15, 0.8, 6, 8);

  const twinTailL = new THREE.Group();
  twinTailL.name = 'TwinTailL';
  twinTailL.position.set(1.1, -0.1, -0.2);
  const ttlMesh = new THREE.Mesh(twinTailGeo, hairMat);
  ttlMesh.name = 'TwinTailL_Main';
  ttlMesh.rotation.z = 0.4;
  ttlMesh.rotation.x = -0.15;
  twinTailL.add(ttlMesh);
  const wispL = new THREE.Mesh(wispGeo, hairShadowMat);
  wispL.name = 'TwinTailL_Wisp';
  wispL.position.set(0.8, -1.5, 0);
  wispL.rotation.z = 0.6;
  twinTailL.add(wispL);
  hairGroup.add(twinTailL);

  const twinTailR = new THREE.Group();
  twinTailR.name = 'TwinTailR';
  twinTailR.position.set(-1.1, -0.1, -0.2);
  const ttrMesh = new THREE.Mesh(twinTailGeo.clone(), hairMat);
  ttrMesh.name = 'TwinTailR_Main';
  ttrMesh.rotation.z = -0.4;
  ttrMesh.rotation.x = -0.15;
  twinTailR.add(ttrMesh);
  const wispR = new THREE.Mesh(wispGeo.clone(), hairShadowMat);
  wispR.name = 'TwinTailR_Wisp';
  wispR.position.set(-0.8, -1.5, 0);
  wispR.rotation.z = -0.6;
  twinTailR.add(wispR);
  hairGroup.add(twinTailR);

  // Back hair
  const backHairGeo = new THREE.SphereGeometry(1.2, 24, 24);
  const backHair = new THREE.Mesh(backHairGeo, hairShadowMat);
  backHair.name = 'BackHair';
  backHair.position.set(0, -0.3, -0.5);
  backHair.scale.set(1, 1.3, 0.8);
  hairGroup.add(backHair);

  // Ahoge
  const ahogeGeo = new THREE.ConeGeometry(0.06, 0.6, 6);
  const ahoge1 = new THREE.Mesh(ahogeGeo, hairMat);
  ahoge1.name = 'Ahoge1';
  ahoge1.position.set(0.1, 1.15, 0.2);
  ahoge1.rotation.z = -0.3;
  ahoge1.rotation.x = 0.3;
  hairGroup.add(ahoge1);
  const ahoge2 = new THREE.Mesh(ahogeGeo.clone(), hairMat);
  ahoge2.name = 'Ahoge2';
  ahoge2.position.set(-0.05, 1.2, 0.15);
  ahoge2.rotation.z = 0.2;
  ahoge2.rotation.x = 0.4;
  hairGroup.add(ahoge2);

  // Ribbons at twin tails
  const ribbonGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 12, Math.PI * 1.5);
  const ribbonL = new THREE.Mesh(ribbonGeo, ribbonMat);
  ribbonL.name = 'RibbonL';
  ribbonL.position.set(1.1, 0.1, -0.2);
  ribbonL.rotation.y = Math.PI * 0.5;
  hairGroup.add(ribbonL);
  const ribbonDotGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const ribbonDotL = new THREE.Mesh(ribbonDotGeo, redMat);
  ribbonDotL.name = 'RibbonDotL';
  ribbonDotL.position.set(1.1, 0.1, -0.2);
  hairGroup.add(ribbonDotL);
  const ribbonR = new THREE.Mesh(ribbonGeo.clone(), ribbonMat);
  ribbonR.name = 'RibbonR';
  ribbonR.position.set(-1.1, 0.1, -0.2);
  ribbonR.rotation.y = -Math.PI * 0.5;
  hairGroup.add(ribbonR);
  const ribbonDotR = new THREE.Mesh(ribbonDotGeo.clone(), redMat);
  ribbonDotR.name = 'RibbonDotR';
  ribbonDotR.position.set(-1.1, 0.1, -0.2);
  hairGroup.add(ribbonDotR);

  root.add(hairGroup);

  // ----------------------------------------------------------
  // TOP HAT
  // ----------------------------------------------------------
  const hatGroup = new THREE.Group();
  hatGroup.name = 'Hat';
  hatGroup.position.set(0.3, 4.35, 0.1);
  hatGroup.rotation.z = 0.15;

  const hatBodyGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.6, 24);
  const hatBody = new THREE.Mesh(hatBodyGeo, darkMat);
  hatBody.name = 'HatBody';
  hatGroup.add(hatBody);

  const hatBrimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24);
  const hatBrim = new THREE.Mesh(hatBrimGeo, darkMat);
  hatBrim.name = 'HatBrim';
  hatBrim.position.y = -0.3;
  hatGroup.add(hatBrim);

  const hatTopGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.04, 24);
  const hatTop = new THREE.Mesh(hatTopGeo, blackMat);
  hatTop.name = 'HatTop';
  hatTop.position.y = 0.32;
  hatGroup.add(hatTop);

  const bandGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.1, 24);
  const band = new THREE.Mesh(bandGeo, redMat);
  band.name = 'HatBand';
  band.position.y = -0.1;
  hatGroup.add(band);

  const buckleGeo = new THREE.SphereGeometry(0.06, 12, 12);
  const buckle = new THREE.Mesh(buckleGeo, goldMat);
  buckle.name = 'HatBuckle';
  buckle.position.set(0, -0.1, 0.4);
  hatGroup.add(buckle);

  const spadeStemGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4);
  const spadeStem = new THREE.Mesh(spadeStemGeo, goldMat);
  spadeStem.name = 'SpadeStem';
  spadeStem.position.set(0.2, -0.45, 0.2);
  hatGroup.add(spadeStem);
  const spadeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const spade = new THREE.Mesh(spadeGeo, blackMat);
  spade.name = 'SpadeCharm';
  spade.position.set(0.2, -0.58, 0.2);
  spade.scale.set(0.8, 1.1, 0.5);
  hatGroup.add(spade);

  root.add(hatGroup);

  // ----------------------------------------------------------
  // NECK
  // ----------------------------------------------------------
  const neckGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.35, 12);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.name = 'Neck';
  neck.position.set(0, 1.55, 0);
  root.add(neck);

  // ----------------------------------------------------------
  // BODY (torso)
  // ----------------------------------------------------------
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'Body';
  bodyGroup.position.set(0, 0.6, 0);

  const torsoGeo = new THREE.CylinderGeometry(0.55, 0.5, 1.2, 16);
  const torso = new THREE.Mesh(torsoGeo, redMat);
  torso.name = 'Torso';
  torso.position.y = 0.3;
  bodyGroup.add(torso);

  // White collar
  const collarGeo = new THREE.TorusGeometry(0.42, 0.06, 8, 24);
  const collar = new THREE.Mesh(collarGeo, whiteMat);
  collar.name = 'Collar';
  collar.position.set(0, 0.85, 0.05);
  collar.rotation.x = Math.PI * 0.5;
  bodyGroup.add(collar);

  // Black trim
  const trimGeo = new THREE.CylinderGeometry(0.54, 0.53, 0.06, 16);
  const trim1 = new THREE.Mesh(trimGeo, blackMat);
  trim1.name = 'ChestTrim';
  trim1.position.y = 0.15;
  bodyGroup.add(trim1);

  // Center line
  const lineGeo = new THREE.BoxGeometry(0.02, 0.8, 0.02);
  const centerLine = new THREE.Mesh(lineGeo, blackMat);
  centerLine.name = 'CenterLine';
  centerLine.position.set(0, 0.3, 0.5);
  bodyGroup.add(centerLine);

  // Cross lacing
  const laceGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.35, 4);
  for (let i = 0; i < 3; i++) {
    const y = 0.55 - i * 0.2;
    const lace1 = new THREE.Mesh(laceGeo, laceMat);
    lace1.name = `LaceX_${i}_A`;
    lace1.position.set(0, y, 0.5);
    lace1.rotation.z = 0.6;
    bodyGroup.add(lace1);
    const lace2 = new THREE.Mesh(laceGeo.clone(), laceMat);
    lace2.name = `LaceX_${i}_B`;
    lace2.position.set(0, y, 0.5);
    lace2.rotation.z = -0.6;
    bodyGroup.add(lace2);
  }

  // Bunny charm
  const bunnyGroup = new THREE.Group();
  bunnyGroup.name = 'BunnyCharm';
  bunnyGroup.position.set(0, -0.05, 0.55);
  const bunnyBodyGeo = new THREE.SphereGeometry(0.08, 10, 10);
  const bunnyBody = new THREE.Mesh(bunnyBodyGeo, whiteMat);
  bunnyBody.name = 'BunnyBody';
  bunnyBody.scale.set(0.8, 1, 0.7);
  bunnyGroup.add(bunnyBody);
  const earGeo = new THREE.CapsuleGeometry(0.015, 0.08, 4, 6);
  const earL = new THREE.Mesh(earGeo, whiteMat);
  earL.name = 'BunnyEarL';
  earL.position.set(-0.03, 0.1, 0);
  earL.rotation.z = 0.2;
  bunnyGroup.add(earL);
  const earR = new THREE.Mesh(earGeo.clone(), whiteMat);
  earR.name = 'BunnyEarR';
  earR.position.set(0.03, 0.1, 0);
  earR.rotation.z = -0.2;
  bunnyGroup.add(earR);
  const bEyeGeo = new THREE.SphereGeometry(0.015, 6, 6);
  const bEyeL = new THREE.Mesh(bEyeGeo, bunnyEyeMat);
  bEyeL.name = 'BunnyEyeL';
  bEyeL.position.set(-0.025, 0.02, 0.06);
  bunnyGroup.add(bEyeL);
  const bEyeR = new THREE.Mesh(bEyeGeo.clone(), bunnyEyeMat);
  bEyeR.name = 'BunnyEyeR';
  bEyeR.position.set(0.025, 0.02, 0.06);
  bunnyGroup.add(bEyeR);
  const bowGeo = new THREE.SphereGeometry(0.03, 6, 6);
  const bowL = new THREE.Mesh(bowGeo, tealMat);
  bowL.name = 'BunnyBowL';
  bowL.position.set(-0.04, 0, 0.05);
  bowL.scale.set(1.3, 0.7, 0.5);
  bunnyGroup.add(bowL);
  const bowR = new THREE.Mesh(bowGeo.clone(), tealMat);
  bowR.name = 'BunnyBowR';
  bowR.position.set(0.04, 0, 0.05);
  bowR.scale.set(1.3, 0.7, 0.5);
  bunnyGroup.add(bowR);
  bodyGroup.add(bunnyGroup);

  // Belt
  const beltGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.06, 16);
  const belt = new THREE.Mesh(beltGeo, blackMat);
  belt.name = 'Belt';
  belt.position.y = -0.25;
  bodyGroup.add(belt);

  root.add(bodyGroup);

  // ----------------------------------------------------------
  // SKIRT
  // ----------------------------------------------------------
  const skirtGroup = new THREE.Group();
  skirtGroup.name = 'Skirt';
  skirtGroup.position.set(0, -0.05, 0);

  const skirtGeo = new THREE.CylinderGeometry(0.5, 0.9, 0.8, 20, 1, true);
  const skirt = new THREE.Mesh(skirtGeo, skirtMainMat);
  skirt.name = 'SkirtCone';
  skirt.position.y = -0.1;
  skirtGroup.add(skirt);

  const skirtBottomGeo = new THREE.RingGeometry(0.15, 0.9, 20);
  const skirtBottom = new THREE.Mesh(skirtBottomGeo, skirtMainMat);
  skirtBottom.name = 'SkirtBottom';
  skirtBottom.rotation.x = -Math.PI * 0.5;
  skirtBottom.position.y = -0.5;
  skirtGroup.add(skirtBottom);

  const skirtTrimGeo = new THREE.TorusGeometry(0.88, 0.03, 8, 32);
  const skirtTrim = new THREE.Mesh(skirtTrimGeo, redMat);
  skirtTrim.name = 'SkirtRedTrim';
  skirtTrim.position.y = -0.48;
  skirtTrim.rotation.x = Math.PI * 0.5;
  skirtGroup.add(skirtTrim);

  const laceTrimGeo = new THREE.TorusGeometry(0.9, 0.015, 8, 48);
  const laceTrimMesh = new THREE.Mesh(laceTrimGeo, whiteMat);
  laceTrimMesh.name = 'SkirtLaceTrim';
  laceTrimMesh.position.y = -0.52;
  laceTrimMesh.rotation.x = Math.PI * 0.5;
  skirtGroup.add(laceTrimMesh);

  root.add(skirtGroup);

  // ----------------------------------------------------------
  // ARMS
  // ----------------------------------------------------------
  const upperArmGeo = new THREE.CapsuleGeometry(0.12, 0.5, 6, 8);

  // Left arm (pointing)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.name = 'LeftArm';
  leftArmGroup.position.set(0.7, 1.15, 0);

  const upperArmL = new THREE.Mesh(upperArmGeo, redDarkMat);
  upperArmL.name = 'UpperArmL';
  upperArmL.rotation.z = -0.8;
  upperArmL.rotation.x = 0.6;
  leftArmGroup.add(upperArmL);

  const forearmL = new THREE.Mesh(upperArmGeo.clone(), redMat);
  forearmL.name = 'ForearmL';
  forearmL.position.set(-0.3, -0.25, 0.5);
  forearmL.rotation.z = 0.2;
  forearmL.rotation.x = 1.0;
  leftArmGroup.add(forearmL);

  const gloveGeo = new THREE.SphereGeometry(0.2, 16, 16);
  const gloveL = new THREE.Mesh(gloveGeo, gloveMat);
  gloveL.name = 'GloveL';
  gloveL.position.set(-0.4, -0.35, 0.95);
  gloveL.scale.set(0.9, 0.8, 1.2);
  leftArmGroup.add(gloveL);

  const cuffGeo = new THREE.TorusGeometry(0.14, 0.03, 8, 16);
  const cuffL = new THREE.Mesh(cuffGeo, goldMat);
  cuffL.name = 'CuffL';
  cuffL.position.set(-0.35, -0.25, 0.7);
  cuffL.rotation.x = 0.6;
  leftArmGroup.add(cuffL);

  const fingerGeo = new THREE.CapsuleGeometry(0.04, 0.2, 6, 6);
  const fingerL = new THREE.Mesh(fingerGeo, gloveMat);
  fingerL.name = 'FingerL';
  fingerL.position.set(-0.4, -0.3, 1.15);
  fingerL.rotation.x = 0.2;
  leftArmGroup.add(fingerL);

  root.add(leftArmGroup);

  // Right arm (relaxed)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.name = 'RightArm';
  rightArmGroup.position.set(-0.7, 1.15, 0);

  const upperArmR = new THREE.Mesh(upperArmGeo.clone(), redDarkMat);
  upperArmR.name = 'UpperArmR';
  upperArmR.rotation.z = 0.4;
  rightArmGroup.add(upperArmR);

  const forearmR = new THREE.Mesh(upperArmGeo.clone(), redMat);
  forearmR.name = 'ForearmR';
  forearmR.position.set(0.15, -0.55, 0);
  forearmR.rotation.z = 0.2;
  rightArmGroup.add(forearmR);

  const gloveR = new THREE.Mesh(gloveGeo.clone(), gloveMat);
  gloveR.name = 'GloveR';
  gloveR.position.set(0.2, -0.85, 0.05);
  gloveR.scale.set(0.9, 0.8, 1);
  rightArmGroup.add(gloveR);

  const cuffR = new THREE.Mesh(cuffGeo.clone(), goldMat);
  cuffR.name = 'CuffR';
  cuffR.position.set(0.18, -0.6, 0);
  rightArmGroup.add(cuffR);

  root.add(rightArmGroup);

  // ----------------------------------------------------------
  // LEGS
  // ----------------------------------------------------------
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.4, 6, 8);
  const legL = new THREE.Mesh(legGeo, blackMat);
  legL.name = 'LegL';
  legL.position.set(0.2, -0.85, 0);
  root.add(legL);
  const legR = new THREE.Mesh(legGeo.clone(), blackMat);
  legR.name = 'LegR';
  legR.position.set(-0.2, -0.85, 0);
  root.add(legR);

  // Shoes
  const shoeGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const shoeL = new THREE.Mesh(shoeGeo, darkMat);
  shoeL.name = 'ShoeL';
  shoeL.position.set(0.2, -1.15, 0.04);
  shoeL.scale.set(0.85, 0.6, 1.2);
  root.add(shoeL);
  const shoeR = new THREE.Mesh(shoeGeo.clone(), darkMat);
  shoeR.name = 'ShoeR';
  shoeR.position.set(-0.2, -1.15, 0.04);
  shoeR.scale.set(0.85, 0.6, 1.2);
  root.add(shoeR);

  // ----------------------------------------------------------
  // FLOATING DIAMONDS
  // ----------------------------------------------------------
  const diamondGeo = new THREE.OctahedronGeometry(0.12, 0);
  const diamondPositions = [
    { x: 2.0, y: 2.5, z: 0.5, s: 0.6 },
    { x: -1.8, y: 1.8, z: 0.8, s: 0.9 },
    { x: 1.5, y: 0.5, z: -0.5, s: 1.2 },
    { x: -2.2, y: 3.2, z: -0.3, s: 0.7 },
    { x: 2.3, y: -0.3, z: 0.2, s: 1.0 },
  ];
  diamondPositions.forEach((pos, i) => {
    const d = new THREE.Mesh(diamondGeo, diamondMat);
    d.name = `Diamond_${i}`;
    d.position.set(pos.x, pos.y, pos.z);
    d.scale.setScalar(pos.s);
    root.add(d);
  });

  // Sparkle spheres
  const sparkleGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const sparklePositions = [
    { x: 1.6, y: 3.5, z: 0.3 },
    { x: -1.5, y: 0.8, z: 1.0 },
    { x: 2.0, y: 1.2, z: -0.4 },
  ];
  sparklePositions.forEach((pos, i) => {
    const s = new THREE.Mesh(sparkleGeo, sparkleMat);
    s.name = `Sparkle_${i}`;
    s.position.set(pos.x, pos.y, pos.z);
    root.add(s);
  });

  return root;
}

// ============================================================
// Export to GLB
// ============================================================
function exportToGLB() {
  const character = buildCharacter();

  // Update world matrices before export
  character.updateMatrixWorld(true);

  // Count meshes
  let meshCount = 0;
  character.traverse((child) => {
    if (child.isMesh) meshCount++;
  });

  const exporter = new GLTFExporter();

  console.log(`Building GLB with ${meshCount} meshes...`);

  exporter.parse(
    character,
    (glb) => {
      const outputPath = path.resolve(__dirname, '..', 'public', 'models', 'mascot.glb');
      const buffer = Buffer.from(glb);
      fs.writeFileSync(outputPath, buffer);

      console.log(`GLB exported successfully: ${outputPath}`);
      console.log(`File size: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
      console.log(`Total meshes: ${meshCount}`);
      process.exit(0);
    },
    (error) => {
      console.error('Export failed:', error);
      process.exit(1);
    },
    {
      binary: true,
      maxTextureSize: 1024,
    }
  );
}

exportToGLB();
// Keep process alive for async FileReader chains
setTimeout(() => {
  console.error('Export timed out after 30s');
  process.exit(1);
}, 30000);
