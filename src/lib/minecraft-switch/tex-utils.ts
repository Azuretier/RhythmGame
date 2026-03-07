// =============================================================================
// Texture Utilities — Pixel drawing helpers, RNG, UV calculation
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================

import { TILE, ATLAS_COLS, ATLAS_ROWS, ATLAS_SIZE } from './tex-constants';

// Shorthand types used by all draw functions
export type D = Uint8ClampedArray;
export type R = () => number;
export type DrawFn = (d: D, w: number, ox: number, oy: number, rand: R) => void;

/** Seeded PRNG (mulberry32) — deterministic random from integer seed. */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Set a single pixel in the atlas image data. */
export function setPixel(
  data: Uint8ClampedArray, w: number,
  ox: number, oy: number,
  px: number, py: number,
  r: number, g: number, b: number, a = 255,
) {
  const i = ((oy + py) * w + (ox + px)) * 4;
  data[i] = clamp(Math.round(r), 0, 255);
  data[i + 1] = clamp(Math.round(g), 0, 255);
  data[i + 2] = clamp(Math.round(b), 0, 255);
  data[i + 3] = clamp(Math.round(a), 0, 255);
}

/** Fill a 16x16 tile with base color + per-pixel noise. */
export function fillNoise(
  data: Uint8ClampedArray, w: number,
  ox: number, oy: number,
  r: number, g: number, b: number,
  noise: number, rand: () => number, a = 255,
) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      const nr = (rand() - 0.5) * noise * 2;
      const ng = (rand() - 0.5) * noise * 2;
      const nb = (rand() - 0.5) * noise * 2;
      setPixel(data, w, ox, oy, px, py, r + nr, g + ng, b + nb, a);
    }
  }
}

/** Draw ore clusters (3 blobs of 3-5 pixels) over an existing stone base. */
export function drawOreClusters(
  data: Uint8ClampedArray, w: number,
  ox: number, oy: number,
  oreR: number, oreG: number, oreB: number,
  rand: () => number,
) {
  for (let c = 0; c < 3; c++) {
    const cx = Math.floor(rand() * 12) + 2;
    const cy = Math.floor(rand() * 12) + 2;
    const size = Math.floor(rand() * 3) + 3;
    for (let i = 0; i < size; i++) {
      const dx = Math.floor(rand() * 3) - 1;
      const dy = Math.floor(rand() * 3) - 1;
      const px = clamp(cx + dx, 0, 15);
      const py = clamp(cy + dy, 0, 15);
      const n = (rand() - 0.5) * 20;
      setPixel(data, w, ox, oy, px, py, oreR + n, oreG + n, oreB + n);
    }
  }
}

/** Convert atlas slot index to pixel offset. Adapted for 32-column grid. */
export function tileOffset(index: number): [number, number] {
  const col = index % ATLAS_COLS;
  const row = Math.floor(index / ATLAS_COLS);
  return [col * TILE, row * TILE];
}

/** Get UV coordinates for a texture slot in the 32x32 atlas. */
export function getTexUV(texIndex: number): { u0: number; v0: number; u1: number; v1: number } {
  const col = texIndex % ATLAS_COLS;
  const row = Math.floor(texIndex / ATLAS_COLS);
  const pad = 0.0005;
  return {
    u0: col / ATLAS_COLS + pad,
    v0: 1 - (row + 1) / ATLAS_ROWS + pad,
    u1: (col + 1) / ATLAS_COLS - pad,
    v1: 1 - row / ATLAS_ROWS - pad,
  };
}

// Re-export TILE and ATLAS_SIZE for internal use by draw modules
export { TILE, ATLAS_SIZE };
