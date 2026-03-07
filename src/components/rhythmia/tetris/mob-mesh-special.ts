/**
 * Special mob builders: Slime, Magma Cube
 */
import * as THREE from 'three';
import type { MobMeshData, MatOpts } from './mob-mesh-utils';
import { mbox, mboxPhys } from './mob-mesh-utils';

// ========== Slime ==========

export function createSlime(segments = 3): MobMeshData {
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

export function createMagmaCube(segments = 3): MobMeshData {
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

  // Segment widths and heights — flat slabs (height ~ 50% of width)
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
