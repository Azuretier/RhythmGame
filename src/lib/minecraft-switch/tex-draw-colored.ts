// =============================================================================
// Colored Block Draw Functions — Wool, concrete, terracotta, glazed,
// stained glass, concrete powder, coral
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================

import type { D, R } from './tex-utils';
import { TILE, setPixel } from './tex-utils';

// =============================================================================
// COLOR PALETTES
// =============================================================================

/** 16 Minecraft dye colors as RGB tuples. */
export const DYE_COLORS: [number, number, number][] = [
  [234, 236, 236],  // white
  [224, 121, 22],   // orange
  [180, 65, 185],   // magenta
  [100, 160, 220],  // light blue
  [240, 200, 40],   // yellow
  [100, 190, 30],   // lime
  [230, 140, 170],  // pink
  [64, 64, 64],     // gray
  [155, 155, 148],  // light gray
  [22, 140, 145],   // cyan
  [120, 42, 175],   // purple
  [50, 55, 165],    // blue
  [110, 70, 40],    // brown
  [75, 100, 30],    // green
  [160, 40, 35],    // red
  [20, 22, 26],     // black
];

/** Terracotta base tints (more muted / earthy). */
export const TERRACOTTA_COLORS: [number, number, number][] = [
  [210, 178, 160],  // white
  [162, 84, 38],    // orange
  [150, 88, 108],   // magenta
  [113, 108, 138],  // light blue
  [186, 133, 36],   // yellow
  [103, 118, 53],   // lime
  [162, 78, 79],    // pink
  [58, 42, 36],     // gray
  [135, 106, 97],   // light gray
  [87, 91, 91],     // cyan
  [118, 70, 86],    // purple
  [74, 60, 91],     // blue
  [77, 51, 36],     // brown
  [76, 83, 42],     // green
  [143, 61, 47],    // red
  [37, 22, 16],     // black
];

/** Glazed terracotta accent colors (brighter patterns). */
export const GLAZED_COLORS: [number, number, number][] = [
  [210, 220, 210],  // white
  [200, 100, 20],   // orange
  [200, 80, 180],   // magenta
  [70, 140, 200],   // light blue
  [230, 200, 80],   // yellow
  [90, 180, 50],    // lime
  [230, 130, 160],  // pink
  [80, 80, 80],     // gray
  [160, 165, 160],  // light gray
  [30, 145, 150],   // cyan
  [130, 50, 170],   // purple
  [55, 60, 170],    // blue
  [115, 80, 50],    // brown
  [80, 110, 40],    // green
  [170, 50, 45],    // red
  [30, 30, 35],     // black
];

/** Coral block base RGB colors [tube, brain, bubble, fire, horn]. */
export const CORAL_COLORS: [number, number, number][] = [
  [50, 90, 210],    // tube (blue)
  [200, 100, 150],  // brain (pink)
  [160, 40, 180],   // bubble (purple)
  [200, 50, 40],    // fire (red)
  [210, 200, 50],   // horn (yellow)
];

// =============================================================================
// DRAW FUNCTIONS
// =============================================================================

/** Draw a solid wool texture with fluffy noise. */
export function drawWool(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 18;
    r += n; g += n; b += n;
    // Fluffy texture - random lighter/darker patches
    if (rand() < 0.12) { r += 12; g += 12; b += 12; }
    if (rand() < 0.08) { r -= 10; g -= 10; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

/** Draw a smooth concrete texture. */
export function drawConcrete(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 6;
    r += n; g += n; b += n;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

/** Draw a terracotta texture with earthy, slightly rough appearance. */
export function drawTerracotta(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.8; b += n * 0.7;
    if (rand() < 0.06) { r -= 10; g -= 8; b -= 6; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

/** Draw glazed terracotta with decorative swirl pattern. */
export function drawGlazedTerracotta(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    // Swirl pattern using distance from corners
    const d1 = Math.sqrt(px * px + py * py);
    const d2 = Math.sqrt((15 - px) ** 2 + (15 - py) ** 2);
    const pattern = Math.floor(d1 + d2) % 4;
    if (pattern === 0) { r += 25; g += 25; b += 25; }
    else if (pattern === 2) { r -= 15; g -= 15; b -= 15; }
    // Border
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 20; g -= 20; b -= 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

/** Draw stained glass with tinted transparency. */
export function drawStainedGlass(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if (px === 0 || px === 15 || py === 0 || py === 15) {
      setPixel(d, w, ox, oy, px, py, baseR * 0.7, baseG * 0.7, baseB * 0.7, 200);
    } else if (px === 1 || px === 14 || py === 1 || py === 14) {
      setPixel(d, w, ox, oy, px, py, baseR * 0.85, baseG * 0.85, baseB * 0.85, 160);
    } else {
      const n = (rand() - 0.5) * 8;
      setPixel(d, w, ox, oy, px, py, baseR + n, baseG + n, baseB + n, 100);
    }
  }
}

/** Draw concrete powder with grainy texture. */
export function drawConcretePowder(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 16;
    r += n; g += n; b += n;
    if (rand() < 0.08) { r += 12; g += 12; b += 12; }
    if (rand() < 0.06) { r -= 10; g -= 10; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

/** Draw a coral block with organic texture. */
export function drawCoralBlock(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number, dead: boolean) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    if (dead) { r = r * 0.5 + 60; g = g * 0.5 + 55; b = b * 0.5 + 50; }
    const n = (rand() - 0.5) * 18;
    r += n; g += n; b += n;
    if ((px + py * 2) % 5 < 2 && rand() < 0.3) { r -= 15; g -= 12; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}
