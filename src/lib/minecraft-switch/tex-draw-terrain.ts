// =============================================================================
// Terrain Draw Functions — Grass, dirt, stone, sand, water, lava, etc.
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================

import type { D, R } from './tex-utils';
import { TILE, setPixel, fillNoise } from './tex-utils';

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Base Terrain
// =============================================================================

export function drawGrassTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 93, g = 155, b = 60;
    const n = (rand() - 0.5) * 24;
    r += n * 0.8; g += n; b += n * 0.6;
    if (rand() < 0.12) { r -= 15; g -= 15; b -= 10; }
    if (rand() < 0.06) { r += 10; g += 12; b += 6; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawGrassSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if (py < 3) {
      let r = 93, g = 155, b = 60;
      const n = (rand() - 0.5) * 20;
      r += n * 0.7; g += n; b += n * 0.5;
      setPixel(d, w, ox, oy, px, py, r, g, b);
    } else if (py === 3) {
      if (rand() < 0.5) {
        setPixel(d, w, ox, oy, px, py, 93 + (rand() - 0.5) * 20, 140 + (rand() - 0.5) * 20, 55 + (rand() - 0.5) * 15);
      } else {
        setPixel(d, w, ox, oy, px, py, 139 + (rand() - 0.5) * 15, 104 + (rand() - 0.5) * 15, 71 + (rand() - 0.5) * 15);
      }
    } else {
      let r = 139, g = 104, b = 71;
      const n = (rand() - 0.5) * 18;
      r += n; g += n * 0.8; b += n * 0.6;
      if (rand() < 0.1) { r -= 20; g -= 15; b -= 12; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

export function drawDirt(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 139, g = 104, b = 71;
    const n = (rand() - 0.5) * 20;
    r += n; g += n * 0.8; b += n * 0.6;
    if (rand() < 0.12) { r -= 22; g -= 18; b -= 14; }
    if (rand() < 0.06) { r += 15; g += 12; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawStone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 24;
    r += n; g += n; b += n;
    if ((px + py * 3) % 7 === 0 && rand() < 0.3) { r -= 25; g -= 25; b -= 25; }
    if (rand() < 0.08) { r += 18; g += 18; b += 18; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSand(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 219, g = 196, b = 120;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.9; b += n * 0.7;
    if (rand() < 0.05) { r -= 12; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawWater(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 40, g = 80, b = 190;
    const n = (rand() - 0.5) * 16;
    r += n * 0.5; g += n * 0.7; b += n;
    if (py % 4 === 0) { r += 15; g += 15; b += 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b, 200);
  }
}

export function drawLava(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 220, g = 100, b = 20;
    const n = (rand() - 0.5) * 30;
    r += n * 0.5; g += n * 0.8; b += n * 0.3;
    if (py % 3 === 0 && rand() < 0.4) { r += 30; g += 40; b += 10; }
    if (rand() < 0.1) { r += 20; g -= 20; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b, 240);
  }
}

export function drawBedrock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 60, g = 60, b = 60;
    const n = (rand() - 0.5) * 40;
    r += n; g += n; b += n;
    if (rand() < 0.15) { r -= 30; g -= 30; b -= 30; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawGravel(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 124, b = 120;
    const n = (rand() - 0.5) * 35;
    r += n; g += n * 0.95; b += n * 0.9;
    if (rand() < 0.1) { r += 20; g += 18; b += 16; }
    if (rand() < 0.1) { r -= 25; g -= 22; b -= 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawClay(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 166, b = 178;
    const n = (rand() - 0.5) * 12;
    r += n; g += n; b += n * 0.8;
    if (rand() < 0.08) { r -= 10; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCobblestone(d: D, w: number, ox: number, oy: number, rand: R) {
  fillNoise(d, w, ox, oy, 128, 128, 128, 12, rand);
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    const gx = (px + py * 3) % 8;
    const gy = (py + px * 2) % 8;
    if (gx === 0 || gy === 0) {
      const n = (rand() - 0.5) * 10;
      setPixel(d, w, ox, oy, px, py, 85 + n, 85 + n, 85 + n);
    }
  }
}

export function drawSnow(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 244, g = 244, b = 248;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    if (rand() < 0.05) { r -= 8; g -= 8; b -= 4; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSnowSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if (py < 3) {
      const n = (rand() - 0.5) * 8;
      setPixel(d, w, ox, oy, px, py, 244 + n, 244 + n, 248 + n);
    } else if (py === 3) {
      if (rand() < 0.5) {
        setPixel(d, w, ox, oy, px, py, 230 + (rand() - 0.5) * 10, 230 + (rand() - 0.5) * 10, 234 + (rand() - 0.5) * 10);
      } else {
        setPixel(d, w, ox, oy, px, py, 139 + (rand() - 0.5) * 15, 104 + (rand() - 0.5) * 15, 71 + (rand() - 0.5) * 15);
      }
    } else {
      let r = 139, g = 104, b = 71;
      const n = (rand() - 0.5) * 18;
      r += n; g += n * 0.8; b += n * 0.6;
      if (rand() < 0.1) { r -= 20; g -= 15; b -= 12; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

export function drawIce(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 165, g = 214, b = 245;
    const n = (rand() - 0.5) * 12;
    r += n; g += n; b += n * 0.5;
    if ((px + py * 2) % 11 === 0 && rand() < 0.5) { r += 20; g += 20; b += 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b, 220);
  }
}

export function drawPackedIce(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 140, g = 180, b = 225;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n * 0.5;
    if ((px * 3 + py) % 9 === 0) { r += 15; g += 10; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawBlueIce(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 100, g = 150, b = 220;
    const n = (rand() - 0.5) * 10;
    r += n * 0.5; g += n * 0.7; b += n;
    if ((px + py) % 7 === 0) { r += 12; g += 15; b += 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 212, g = 184, b = 122;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.9; b += n * 0.7;
    if (py < 2 || py > 13) { r -= 10; g -= 8; b -= 5; }
    if (py % 3 === 0) { r -= 5; g -= 4; b -= 3; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSandstoneTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 219, g = 196, b = 130;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.9; b += n * 0.7;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawRedSand(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 190, g = 100, b = 40;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.6; b += n * 0.4;
    if (rand() < 0.05) { r -= 12; g -= 8; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawRedSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 180, g = 95, b = 35;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.7; b += n * 0.5;
    if (py < 2 || py > 13) { r -= 10; g -= 6; b -= 4; }
    if (py % 3 === 0) { r -= 5; g -= 3; b -= 2; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawRedSandstoneTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 190, g = 105, b = 42;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.7; b += n * 0.5;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// --- Stone Variants ---

export function drawGranite(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 158, g = 107, b = 80;
    const n = (rand() - 0.5) * 20;
    r += n; g += n * 0.8; b += n * 0.6;
    if (rand() < 0.1) { r += 15; g += 10; b += 8; }
    if ((px + py * 2) % 9 === 0 && rand() < 0.3) { r -= 15; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawDiorite(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 188, g = 188, b = 190;
    const n = (rand() - 0.5) * 22;
    r += n; g += n; b += n;
    if (rand() < 0.12) { r -= 20; g -= 18; b -= 16; }
    if (rand() < 0.08) { r += 15; g += 15; b += 18; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawAndesite(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 136, g = 136, b = 136;
    const n = (rand() - 0.5) * 18;
    r += n; g += n; b += n;
    if (rand() < 0.1) { r += 12; g += 12; b += 10; }
    if ((px * 2 + py) % 7 === 0 && rand() < 0.25) { r -= 12; g -= 12; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPolishedStone(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    if (px % 8 === 0 || py % 8 === 0) { r -= 8; g -= 8; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCoarseDirt(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 120, g = 85, b = 55;
    const n = (rand() - 0.5) * 25;
    r += n; g += n * 0.7; b += n * 0.5;
    if (rand() < 0.15) { r -= 18; g -= 14; b -= 10; }
    if (rand() < 0.08) { r += 20; g += 15; b += 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPodzolTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 110, g = 80, b = 30;
    const n = (rand() - 0.5) * 18;
    r += n; g += n * 0.7; b += n * 0.4;
    if (rand() < 0.1) { r += 12; g += 8; b += 4; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPodzolSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if (py < 3) {
      let r = 110, g = 80, b = 30;
      const n = (rand() - 0.5) * 14;
      r += n; g += n * 0.7; b += n * 0.4;
      setPixel(d, w, ox, oy, px, py, r, g, b);
    } else {
      let r = 139, g = 104, b = 71;
      const n = (rand() - 0.5) * 18;
      r += n; g += n * 0.8; b += n * 0.6;
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

export function drawMyceliumTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 140, g = 120, b = 140;
    const n = (rand() - 0.5) * 16;
    r += n; g += n * 0.8; b += n;
    if (rand() < 0.1) { r += 15; g += 10; b += 15; }
    if (rand() < 0.08) { r -= 12; g -= 12; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawMyceliumSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if (py < 3) {
      let r = 140, g = 120, b = 140;
      const n = (rand() - 0.5) * 14;
      r += n; g += n * 0.8; b += n;
      setPixel(d, w, ox, oy, px, py, r, g, b);
    } else {
      let r = 139, g = 104, b = 71;
      const n = (rand() - 0.5) * 18;
      r += n; g += n * 0.8; b += n * 0.6;
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

// --- Smooth Stone ---

export function drawSmoothStone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 160, b = 160;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    if (py === 0 || py === 15) { r -= 15; g -= 15; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// --- Sandstone Variants ---

export function drawSmoothSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 216, g = 188, b = 126;
    const n = (rand() - 0.5) * 6;
    r += n; g += n * 0.9; b += n * 0.7;
    if (py === 15) { r -= 8; g -= 6; b -= 4; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSmoothRedSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 185, g = 100, b = 38;
    const n = (rand() - 0.5) * 6;
    r += n; g += n * 0.7; b += n * 0.4;
    if (py === 15) { r -= 8; g -= 5; b -= 3; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawChiseledSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 212, g = 184, b = 122;
    const n = (rand() - 0.5) * 8;
    r += n; g += n * 0.9; b += n * 0.7;
    if (py < 2 || py > 13) { r -= 12; g -= 10; b -= 7; }
    if (px >= 3 && px <= 12 && py >= 3 && py <= 12) {
      if (px === 3 || px === 12 || py === 3 || py === 12) { r -= 18; g -= 15; b -= 10; }
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCutSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 215, g = 188, b = 125;
    const n = (rand() - 0.5) * 6;
    r += n; g += n * 0.9; b += n * 0.7;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 12; g -= 10; b -= 7; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawChiseledRedSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 180, g = 95, b = 35;
    const n = (rand() - 0.5) * 8;
    r += n; g += n * 0.7; b += n * 0.4;
    if (py < 2 || py > 13) { r -= 12; g -= 8; b -= 5; }
    if (px >= 3 && px <= 12 && py >= 3 && py <= 12) {
      if (px === 3 || px === 12 || py === 3 || py === 12) { r -= 18; g -= 12; b -= 8; }
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCutRedSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 183, g = 98, b = 38;
    const n = (rand() - 0.5) * 6;
    r += n; g += n * 0.7; b += n * 0.4;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 12; g -= 8; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}
