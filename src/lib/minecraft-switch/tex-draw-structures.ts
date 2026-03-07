// =============================================================================
// Structure Draw Functions — Wood, leaves, stone bricks, nether, end,
// prismarine, functional blocks, mineral blocks, building blocks
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================

import type { D, R } from './tex-utils';
import { TILE, setPixel, fillNoise } from './tex-utils';
import { drawStone, drawPolishedStone, drawSnow } from './tex-draw-terrain';

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Wood Types
// =============================================================================

/** Generic log top with rings. cx/cy = center, inner/outer colors. */
function drawLogTop(d: D, w: number, ox: number, oy: number, rand: R,
  innerR: number, innerG: number, innerB: number,
  outerR: number, outerG: number, outerB: number) {
  const cx = 7.5, cy = 7.5;
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    const n = (rand() - 0.5) * 10;
    if (dist < 2) {
      setPixel(d, w, ox, oy, px, py, innerR * 0.7 + n, innerG * 0.7 + n, innerB * 0.7 + n);
    } else if (dist < 5) {
      const ring = Math.floor(dist) % 2 === 0;
      if (ring) {
        setPixel(d, w, ox, oy, px, py, innerR + n, innerG + n, innerB + n);
      } else {
        setPixel(d, w, ox, oy, px, py, innerR * 0.85 + n, innerG * 0.85 + n, innerB * 0.85 + n);
      }
    } else if (dist < 7) {
      setPixel(d, w, ox, oy, px, py, outerR * 0.95 + n, outerG * 0.95 + n, outerB * 0.95 + n);
    } else {
      setPixel(d, w, ox, oy, px, py, outerR + n, outerG + n, outerB + n);
    }
  }
}

/** Generic log side with vertical bark lines. */
function drawLogSide(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.8; b += n * 0.5;
    if (px % 4 === 0) { r -= 15; g -= 12; b -= 8; }
    if (px % 4 === 1 && rand() < 0.3) { r -= 10; g -= 8; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

/** Generic planks with horizontal plank lines and grain. */
export function drawPlanks(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.8; b += n * 0.6;
    if (py % 4 === 0) { r -= 18; g -= 14; b -= 10; }
    if (px % 6 === 0 && rand() < 0.4) { r -= 8; g -= 6; b -= 4; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// Oak
export function drawOakLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 170, 133, 83, 107, 76, 38);
}
export function drawOakLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 107, 76, 38);
}
export function drawOakPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 188, 145, 85);
}
export function drawOakLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 58, g = 125, b = 34;
    const n = (rand() - 0.5) * 36;
    r += n * 0.6; g += n; b += n * 0.5;
    if (rand() < 0.15) { r -= 20; g -= 25; b -= 15; }
    if (rand() < 0.1) { r += 15; g += 20; b += 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// Spruce (dark brown bark, dark wood)
export function drawSpruceLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 58, 37, 16);
}
export function drawSpruceLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 140, 110, 60, 58, 37, 16);
}
export function drawSprucePlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 115, 85, 48);
}
export function drawSpruceLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 42, g = 90, b = 42;
    const n = (rand() - 0.5) * 28;
    r += n * 0.4; g += n * 0.8; b += n * 0.4;
    if (rand() < 0.15) { r -= 15; g -= 18; b -= 12; }
    if (rand() < 0.08) { r += 10; g += 14; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// Birch (white bark with dark patches)
export function drawBirchLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 215, g = 210, b = 200;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    if ((px + py * 5) % 9 < 2 && rand() < 0.6) {
      r = 50 + (rand() - 0.5) * 20;
      g = 45 + (rand() - 0.5) * 15;
      b = 40 + (rand() - 0.5) * 15;
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}
export function drawBirchLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 190, 175, 130, 215, 210, 200);
}
export function drawBirchPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 215, 200, 155);
}
export function drawBirchLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 70, g = 140, b = 50;
    const n = (rand() - 0.5) * 30;
    r += n * 0.5; g += n; b += n * 0.4;
    if (rand() < 0.12) { r -= 15; g -= 20; b -= 12; }
    if (rand() < 0.1) { r += 12; g += 18; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// Jungle (brownish bark, slightly reddish)
export function drawJungleLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 86, 68, 30);
}
export function drawJungleLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 160, 120, 70, 86, 68, 30);
}
export function drawJunglePlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 160, 115, 70);
}
export function drawJungleLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 35, g = 110, b = 20;
    const n = (rand() - 0.5) * 34;
    r += n * 0.5; g += n; b += n * 0.4;
    if (rand() < 0.18) { r -= 15; g -= 22; b -= 12; }
    if (rand() < 0.08) { r += 12; g += 18; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// Acacia (orange-red bark)
export function drawAcaciaLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 105, g = 90, b = 70;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.7; b += n * 0.5;
    if (px % 4 === 0) { r -= 12; g -= 10; b -= 8; }
    if (py % 5 < 2 && rand() < 0.3) { r += 8; g -= 5; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}
export function drawAcaciaLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 170, 100, 50, 105, 90, 70);
}
export function drawAcaciaPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 175, 95, 40);
}
export function drawAcaciaLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 60, g = 130, b = 25;
    const n = (rand() - 0.5) * 32;
    r += n * 0.5; g += n; b += n * 0.4;
    if (rand() < 0.14) { r -= 18; g -= 22; b -= 12; }
    if (rand() < 0.1) { r += 14; g += 18; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// Dark Oak (dark brown)
export function drawDarkOakLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 50, 30, 12);
}
export function drawDarkOakLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 130, 95, 50, 50, 30, 12);
}
export function drawDarkOakPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 67, 43, 20);
}
export function drawDarkOakLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 30, g = 90, b = 15;
    const n = (rand() - 0.5) * 30;
    r += n * 0.5; g += n * 0.9; b += n * 0.4;
    if (rand() < 0.16) { r -= 15; g -= 22; b -= 10; }
    if (rand() < 0.08) { r += 10; g += 16; b += 6; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Stone Bricks
// =============================================================================

export function drawStoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 130, g = 130, b = 130;
    const n = (rand() - 0.5) * 12;
    r += n; g += n; b += n;
    // Brick pattern: 8x4 offset bricks
    const brickRow = Math.floor(py / 4);
    const offset = brickRow % 2 === 0 ? 0 : 4;
    const bx = (px + offset) % 8;
    if (bx === 0 || py % 4 === 0) { r -= 25; g -= 25; b -= 25; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawMossyStoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 130, g = 130, b = 130;
    const n = (rand() - 0.5) * 12;
    r += n; g += n; b += n;
    const brickRow = Math.floor(py / 4);
    const offset = brickRow % 2 === 0 ? 0 : 4;
    const bx = (px + offset) % 8;
    if (bx === 0 || py % 4 === 0) { r -= 25; g -= 25; b -= 25; }
    // Moss patches
    if (rand() < 0.2) { r = 70 + (rand() - 0.5) * 20; g = 120 + (rand() - 0.5) * 20; b = 50 + (rand() - 0.5) * 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCrackedStoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 130, g = 130, b = 130;
    const n = (rand() - 0.5) * 12;
    r += n; g += n; b += n;
    const brickRow = Math.floor(py / 4);
    const offset = brickRow % 2 === 0 ? 0 : 4;
    const bx = (px + offset) % 8;
    if (bx === 0 || py % 4 === 0) { r -= 25; g -= 25; b -= 25; }
    // Cracks
    if ((px + py * 2) % 11 < 2 && rand() < 0.4) { r -= 35; g -= 35; b -= 35; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawChiseledStoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 130, g = 130, b = 130;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    // Border frame
    if (px < 2 || px > 13 || py < 2 || py > 13) { r -= 15; g -= 15; b -= 15; }
    // Inner carved pattern
    if (px >= 4 && px <= 11 && py >= 4 && py <= 11) {
      if (px === 4 || px === 11 || py === 4 || py === 11) { r -= 20; g -= 20; b -= 20; }
      else { r += 5; g += 5; b += 5; }
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawMossyCobblestone(d: D, w: number, ox: number, oy: number, rand: R) {
  fillNoise(d, w, ox, oy, 128, 128, 128, 12, rand);
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    const gx = (px + py * 3) % 8;
    const gy = (py + px * 2) % 8;
    if (gx === 0 || gy === 0) {
      const n = (rand() - 0.5) * 10;
      setPixel(d, w, ox, oy, px, py, 85 + n, 85 + n, 85 + n);
    }
    // Moss
    if (rand() < 0.15) {
      const n = (rand() - 0.5) * 15;
      setPixel(d, w, ox, oy, px, py, 65 + n, 115 + n, 45 + n);
    }
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Nether Blocks
// =============================================================================

export function drawNetherrack(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 100, g = 35, b = 35;
    const n = (rand() - 0.5) * 22;
    r += n; g += n * 0.5; b += n * 0.5;
    if (rand() < 0.12) { r += 15; g -= 5; b -= 5; }
    if ((px + py * 3) % 6 === 0 && rand() < 0.3) { r -= 20; g -= 8; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSoulSand(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 82, g = 62, b = 42;
    const n = (rand() - 0.5) * 16;
    r += n; g += n * 0.8; b += n * 0.6;
    // Face-like dark spots
    if (((px - 4) ** 2 + (py - 6) ** 2 < 3) || ((px - 11) ** 2 + (py - 6) ** 2 < 3)) {
      r -= 25; g -= 20; b -= 15;
    }
    if (px >= 6 && px <= 9 && py >= 9 && py <= 11 && rand() < 0.5) {
      r -= 20; g -= 15; b -= 10;
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSoulSoil(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 75, g = 56, b = 38;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.8; b += n * 0.6;
    if (rand() < 0.1) { r -= 12; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawGlowstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 210, g = 180, b = 80;
    const n = (rand() - 0.5) * 30;
    r += n * 0.6; g += n * 0.7; b += n * 0.4;
    if (rand() < 0.15) { r += 25; g += 20; b += 10; }
    if ((px + py) % 5 === 0) { r -= 15; g -= 12; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawNetherBricks(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 45, g = 22, b = 27;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.6; b += n * 0.7;
    const brickRow = Math.floor(py / 4);
    const offset = brickRow % 2 === 0 ? 0 : 4;
    const bx = (px + offset) % 8;
    if (bx === 0 || py % 4 === 0) { r -= 12; g -= 8; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawRedNetherBricks(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 70, g = 10, b = 10;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.4; b += n * 0.4;
    const brickRow = Math.floor(py / 4);
    const offset = brickRow % 2 === 0 ? 0 : 4;
    const bx = (px + offset) % 8;
    if (bx === 0 || py % 4 === 0) { r -= 15; g -= 5; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawBasaltSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 75, g = 75, b = 80;
    const n = (rand() - 0.5) * 14;
    r += n; g += n; b += n;
    if (px % 4 === 0) { r -= 10; g -= 10; b -= 12; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawBasaltTop(d: D, w: number, ox: number, oy: number, rand: R) {
  const cx = 7.5, cy = 7.5;
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    let r = 80, g = 80, b = 85;
    const n = (rand() - 0.5) * 10;
    if (dist < 4) { r += 10 + n; g += 10 + n; b += 12 + n; }
    else { r += n; g += n; b += n; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawBlackstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 32, g = 28, b = 30;
    const n = (rand() - 0.5) * 14;
    r += n; g += n; b += n;
    if ((px + py * 2) % 7 === 0 && rand() < 0.3) { r += 10; g += 8; b += 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPolishedBlackstone(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPolishedStone(d, w, ox, oy, rand, 38, 34, 36);
}

export function drawPolishedBlackstoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 40, g = 36, b = 38;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    const brickRow = Math.floor(py / 4);
    const offset = brickRow % 2 === 0 ? 0 : 4;
    const bx = (px + offset) % 8;
    if (bx === 0 || py % 4 === 0) { r -= 10; g -= 10; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCrimsonPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 120, 50, 70);
}

export function drawWarpedPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 40, 120, 115);
}

export function drawCrimsonStemSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 100, 30, 50);
}

export function drawCrimsonStemTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 140, 50, 70, 100, 30, 50);
}

export function drawWarpedStemSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 25, 90, 85);
}

export function drawWarpedStemTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 40, 130, 120, 25, 90, 85);
}

export function drawCrimsonNyliumTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 140, g = 25, b = 25;
    const n = (rand() - 0.5) * 20;
    r += n; g += n * 0.4; b += n * 0.4;
    if (rand() < 0.1) { r += 20; g += 5; b += 5; }
    if (rand() < 0.08) { r -= 30; g -= 5; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawWarpedNyliumTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 25, g = 140, b = 130;
    const n = (rand() - 0.5) * 20;
    r += n * 0.4; g += n; b += n * 0.9;
    if (rand() < 0.1) { r += 5; g += 20; b += 18; }
    if (rand() < 0.08) { r -= 5; g -= 25; b -= 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawShroomlight(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 220, g = 165, b = 50;
    const n = (rand() - 0.5) * 25;
    r += n * 0.5; g += n * 0.6; b += n * 0.3;
    if (rand() < 0.12) { r += 20; g += 15; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawNetherWartBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 120, g = 10, b = 10;
    const n = (rand() - 0.5) * 18;
    r += n; g += n * 0.3; b += n * 0.3;
    if (rand() < 0.1) { r += 15; g += 3; b += 3; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawWarpedWartBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 15, g = 120, b = 110;
    const n = (rand() - 0.5) * 18;
    r += n * 0.3; g += n; b += n * 0.9;
    if (rand() < 0.1) { r += 3; g += 15; b += 12; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — End Blocks
// =============================================================================

export function drawEndStone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 222, g = 225, b = 165;
    const n = (rand() - 0.5) * 16;
    r += n; g += n; b += n * 0.7;
    if ((px + py * 2) % 7 === 0 && rand() < 0.3) { r -= 15; g -= 12; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawEndStoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 222, g = 225, b = 165;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n * 0.7;
    const brickRow = Math.floor(py / 4);
    const offset = brickRow % 2 === 0 ? 0 : 4;
    const bx = (px + offset) % 8;
    if (bx === 0 || py % 4 === 0) { r -= 20; g -= 18; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPurpurBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 165, g = 120, b = 165;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.7; b += n;
    if ((px + py) % 4 === 0) { r -= 10; g -= 8; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPurpurPillarSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 170, g = 125, b = 170;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.7; b += n;
    if (px % 4 === 0) { r -= 12; g -= 8; b -= 12; }
    if (py < 2 || py > 13) { r -= 10; g -= 8; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPurpurPillarTop(d: D, w: number, ox: number, oy: number, rand: R) {
  const cx = 7.5, cy = 7.5;
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    let r = 170, g = 125, b = 170;
    const n = (rand() - 0.5) * 8;
    if (dist < 5) { r += 10 + n; g += 8 + n; b += 10 + n; }
    else { r += n; g += n * 0.7; b += n; }
    if (dist > 6.5) { r -= 10; g -= 8; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Prismarine
// =============================================================================

export function drawPrismarine(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 85, g = 155, b = 140;
    const n = (rand() - 0.5) * 20;
    r += n * 0.5; g += n; b += n * 0.8;
    if ((px * 2 + py) % 7 === 0 && rand() < 0.3) { r -= 20; g -= 15; b -= 12; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPrismarineBricks(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 80, g = 150, b = 135;
    const n = (rand() - 0.5) * 10;
    r += n * 0.5; g += n; b += n * 0.8;
    const brickRow = Math.floor(py / 4);
    const offset = brickRow % 2 === 0 ? 0 : 4;
    const bx = (px + offset) % 8;
    if (bx === 0 || py % 4 === 0) { r -= 18; g -= 15; b -= 12; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawDarkPrismarine(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 40, g = 80, b = 70;
    const n = (rand() - 0.5) * 14;
    r += n * 0.4; g += n; b += n * 0.8;
    if ((px + py) % 5 === 0) { r -= 8; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSeaLantern(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 180, g = 215, b = 210;
    const n = (rand() - 0.5) * 20;
    r += n * 0.6; g += n; b += n * 0.9;
    if (rand() < 0.1) { r += 20; g += 20; b += 18; }
    if ((px + py) % 6 === 0) { r -= 15; g -= 12; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Functional Blocks
// =============================================================================

export function drawCraftingTableTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 115, b = 65;
    const n = (rand() - 0.5) * 8;
    r += n; g += n * 0.8; b += n * 0.5;
    // Grid lines (3x3 crafting grid)
    if ((px === 3 || px === 7 || px === 11) && py >= 2 && py <= 13) { r -= 30; g -= 25; b -= 18; }
    if ((py === 3 || py === 7 || py === 11) && px >= 2 && px <= 13) { r -= 30; g -= 25; b -= 18; }
    // Border
    if (px < 2 || px > 13 || py < 2 || py > 13) { r -= 15; g -= 12; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCraftingTableSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 115, b = 65;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.8; b += n * 0.5;
    // Saw pattern
    if (px >= 3 && px <= 6 && py >= 4 && py <= 12) { r -= 20; g -= 15; b -= 10; }
    // Plank base
    if (py % 4 === 0) { r -= 12; g -= 10; b -= 6; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawFurnaceSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 12;
    r += n; g += n; b += n;
    if ((px + py * 3) % 8 === 0 || (py + px * 2) % 8 === 0) { r -= 15; g -= 15; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawFurnaceFront(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    // Furnace opening
    if (px >= 4 && px <= 11 && py >= 5 && py <= 12) {
      r = 30 + (rand() - 0.5) * 10; g = 25 + (rand() - 0.5) * 8; b = 20 + (rand() - 0.5) * 8;
      if (py >= 9) { r += 30; g += 10; b = 5; } // fire glow
    }
    if ((px + py * 3) % 8 === 0 || (py + px * 2) % 8 === 0) {
      if (!(px >= 4 && px <= 11 && py >= 5 && py <= 12)) { r -= 15; g -= 15; b -= 15; }
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawFurnaceTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 140, g = 140, b = 140;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 15; g -= 15; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawChestSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 115, b = 55;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.8; b += n * 0.5;
    if (py % 4 === 0) { r -= 12; g -= 10; b -= 6; }
    if (px === 0 || px === 15) { r -= 15; g -= 12; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawChestFront(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 115, b = 55;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.8; b += n * 0.5;
    if (py % 4 === 0) { r -= 12; g -= 10; b -= 6; }
    if (px === 0 || px === 15) { r -= 15; g -= 12; b -= 8; }
    // Latch
    if (px >= 7 && px <= 8 && py >= 6 && py <= 8) {
      r = 50 + (rand() - 0.5) * 10; g = 50 + (rand() - 0.5) * 10; b = 50 + (rand() - 0.5) * 10;
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawChestTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 155, g = 110, b = 50;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.8; b += n * 0.5;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 15; g -= 12; b -= 8; }
    // Latch on front edge
    if (px >= 7 && px <= 8 && py === 0) { r = 50; g = 50; b = 50; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawEnchantingTableTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 140, g = 30, b = 30;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.3; b += n * 0.3;
    // Diamond border
    if (px < 2 || px > 13 || py < 2 || py > 13) {
      r = 40 + (rand() - 0.5) * 8; g = 25 + (rand() - 0.5) * 6; b = 50 + (rand() - 0.5) * 8;
    }
    // Book in center
    if (px >= 5 && px <= 10 && py >= 5 && py <= 10) {
      r = 180 + (rand() - 0.5) * 10; g = 170 + (rand() - 0.5) * 10; b = 130 + (rand() - 0.5) * 10;
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawEnchantingTableSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 30, g = 20, b = 45;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.6; b += n;
    if ((px + py) % 6 === 0) { r += 8; g += 4; b += 12; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawBookshelf(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    // Plank frame top/bottom
    if (py < 2 || py > 13) {
      const r = 188, g = 145, b = 85;
      const n = (rand() - 0.5) * 10;
      setPixel(d, w, ox, oy, px, py, r + n, g + n * 0.8, b + n * 0.6);
    } else {
      // Books area
      const bookCol = Math.floor(px / 3);
      const bookColors: [number, number, number][] = [
        [130, 40, 40], [40, 60, 130], [60, 120, 50], [140, 100, 30], [100, 40, 100],
      ];
      const [br, bg, bb] = bookColors[bookCol % bookColors.length];
      let r = br, g = bg, b = bb;
      const n = (rand() - 0.5) * 12;
      r += n; g += n; b += n;
      // Book spine lines
      if (px % 3 === 0) { r -= 20; g -= 20; b -= 20; }
      // Book page tops
      if (py === 2 || py === 8) { r = 210; g = 200; b = 180; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

export function drawJukeboxTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 107, g = 76, b = 38;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.8; b += n * 0.5;
    // Record slot in center
    const cx = 7.5, cy = 7.5;
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    if (dist < 3) { r = 30; g = 30; b = 30; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Mineral Blocks
// =============================================================================

export function drawMineralBlock(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 16;
    r += n; g += n; b += n;
    // Shine highlights
    if ((px + py) % 5 === 0 && rand() < 0.3) { r += 25; g += 25; b += 25; }
    // Edge lines
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 20; g -= 20; b -= 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Building Blocks
// =============================================================================

export function drawBricks(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 150, g = 85, b = 60;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.6; b += n * 0.4;
    const brickRow = Math.floor(py / 4);
    const offset = brickRow % 2 === 0 ? 0 : 4;
    const bx = (px + offset) % 8;
    if (bx === 0 || py % 4 === 0) {
      r = 180 + (rand() - 0.5) * 10;
      g = 175 + (rand() - 0.5) * 10;
      b = 165 + (rand() - 0.5) * 10;
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawTntSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 180, g = 35, b = 25;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.3; b += n * 0.3;
    // White band in middle
    if (py >= 5 && py <= 10) {
      r = 220 + (rand() - 0.5) * 10; g = 215 + (rand() - 0.5) * 10; b = 200 + (rand() - 0.5) * 10;
      // "TNT" letters simplified (dark pixels)
      if (py >= 6 && py <= 9) {
        // T
        if ((px === 2 || px === 3 || px === 4) && py === 6) { r = 30; g = 30; b = 30; }
        if (px === 3 && py >= 7 && py <= 9) { r = 30; g = 30; b = 30; }
        // N
        if (px === 6 && py >= 6 && py <= 9) { r = 30; g = 30; b = 30; }
        if (px === 9 && py >= 6 && py <= 9) { r = 30; g = 30; b = 30; }
        if (px === 7 && py === 7) { r = 30; g = 30; b = 30; }
        if (px === 8 && py === 8) { r = 30; g = 30; b = 30; }
        // T
        if ((px === 11 || px === 12 || px === 13) && py === 6) { r = 30; g = 30; b = 30; }
        if (px === 12 && py >= 7 && py <= 9) { r = 30; g = 30; b = 30; }
      }
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawTntTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 180, g = 35, b = 25;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.3; b += n * 0.3;
    // Fuse in center
    if (px >= 7 && px <= 8 && py >= 7 && py <= 8) {
      r = 50 + (rand() - 0.5) * 10; g = 50 + (rand() - 0.5) * 10; b = 40 + (rand() - 0.5) * 8;
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawTntBottom(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 130, b = 50;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.8; b += n * 0.4;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSponge(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 195, g = 195, b = 60;
    const n = (rand() - 0.5) * 20;
    r += n; g += n; b += n * 0.5;
    // Pores
    if ((px * 3 + py * 5) % 7 < 2 && rand() < 0.5) { r -= 30; g -= 30; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawWetSponge(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 170, g = 175, b = 60;
    const n = (rand() - 0.5) * 18;
    r += n; g += n; b += n * 0.5;
    if ((px * 3 + py * 5) % 7 < 2 && rand() < 0.5) { r -= 30; g -= 20; b += 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawMelonSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 110, g = 145, b = 30;
    const n = (rand() - 0.5) * 14;
    r += n * 0.7; g += n; b += n * 0.4;
    // Vertical stripes
    if (px % 4 === 0) { r -= 18; g -= 20; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawMelonTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 95, g = 125, b = 25;
    const n = (rand() - 0.5) * 12;
    r += n * 0.6; g += n; b += n * 0.3;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCactusSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 45, g = 122, b = 45;
    const n = (rand() - 0.5) * 14;
    r += n * 0.6; g += n; b += n * 0.6;
    if (px > 5 && px < 10) { r += 10; g += 15; b += 10; }
    if (px < 2 || px > 13) { r -= 15; g -= 18; b -= 12; }
    if (py % 4 === 2 && (px === 3 || px === 12)) { r += 30; g += 25; b += 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCactusTop(d: D, w: number, ox: number, oy: number, rand: R) {
  const cx = 7.5, cy = 7.5;
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    let r = 50, g = 130, b = 50;
    const n = (rand() - 0.5) * 10;
    if (dist < 4) { r += 15 + n; g += 20 + n; b += 12 + n; }
    else if (dist > 6) { r -= 15 + n; g -= 18 + n; b -= 12 + n; }
    else { r += n; g += n; b += n; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPumpkinSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 206, g = 126, b = 30;
    const n = (rand() - 0.5) * 16;
    r += n; g += n * 0.7; b += n * 0.3;
    if (px % 4 === 0) { r -= 25; g -= 18; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPumpkinTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 190, g = 115, b = 25;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.7; b += n * 0.3;
    if (px >= 6 && px <= 9 && py >= 6 && py <= 9) {
      r = 80 + (rand() - 0.5) * 12; g = 100 + (rand() - 0.5) * 12; b = 40 + (rand() - 0.5) * 8;
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawJackOLantern(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 206, g = 126, b = 30;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.7; b += n * 0.3;
    if (px % 4 === 0) { r -= 20; g -= 15; b -= 6; }
    // Carved face — eyes
    if (((px >= 3 && px <= 5) || (px >= 10 && px <= 12)) && py >= 4 && py <= 7) {
      r = 240; g = 200; b = 50;
    }
    // Mouth
    if (px >= 4 && px <= 11 && py >= 10 && py <= 13) {
      if ((px + py) % 2 === 0) { r = 240; g = 200; b = 50; }
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawHayBaleSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 185, g = 160, b = 50;
    const n = (rand() - 0.5) * 16;
    r += n; g += n * 0.8; b += n * 0.4;
    // Horizontal bands
    if (py === 2 || py === 3 || py === 12 || py === 13) { r -= 30; g -= 20; b += 5; }
    // Vertical straw lines
    if (px % 3 === 0 && rand() < 0.3) { r -= 10; g -= 8; b -= 4; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawHayBaleTop(d: D, w: number, ox: number, oy: number, rand: R) {
  const cx = 7.5, cy = 7.5;
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    let r = 185, g = 160, b = 50;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.8; b += n * 0.4;
    if (dist > 6) { r -= 15; g -= 12; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawBoneBlockSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 220, g = 215, b = 195;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n * 0.8;
    if (px % 4 === 0) { r -= 12; g -= 12; b -= 10; }
    if (py < 2 || py > 13) { r -= 10; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawBoneBlockTop(d: D, w: number, ox: number, oy: number, rand: R) {
  const cx = 7.5, cy = 7.5;
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    let r = 220, g = 215, b = 195;
    const n = (rand() - 0.5) * 8;
    if (dist < 3) { r -= 10 + n; g -= 10 + n; b -= 8 + n; }
    else if (dist < 6) {
      const ring = Math.floor(dist) % 2;
      if (ring) { r += n; g += n; b += n; }
      else { r -= 5 + n; g -= 5 + n; b -= 4 + n; }
    }
    else { r -= 8 + n; g -= 8 + n; b -= 6 + n; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawObsidian(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 15, g = 10, b = 25;
    const n = (rand() - 0.5) * 12;
    r += n * 0.5; g += n * 0.3; b += n;
    if (rand() < 0.08) { r += 15; g += 5; b += 25; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCryingObsidian(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 15, g = 10, b = 25;
    const n = (rand() - 0.5) * 12;
    r += n * 0.5; g += n * 0.3; b += n;
    if (rand() < 0.08) { r += 15; g += 5; b += 25; }
    // Purple crying streaks
    if (rand() < 0.06) { r = 120 + (rand() - 0.5) * 20; g = 40; b = 180 + (rand() - 0.5) * 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawGlass(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if (px === 0 || px === 15 || py === 0 || py === 15) {
      setPixel(d, w, ox, oy, px, py, 200, 210, 220, 200);
    } else if (px === 1 || px === 14 || py === 1 || py === 14) {
      setPixel(d, w, ox, oy, px, py, 210, 225, 235, 150);
    } else {
      const n = (rand() - 0.5) * 8;
      setPixel(d, w, ox, oy, px, py, 220 + n, 235 + n, 245 + n, 60);
    }
  }
}

// --- Crops & Farmland ---

export function drawWheatStage0(d: D, w: number, ox: number, oy: number, rand: R) {
  // Small green sprouts on brown
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if (py < 10) {
      setPixel(d, w, ox, oy, px, py, 0, 0, 0, 0);
    } else {
      let r = 60, g = 120, b = 30;
      const n = (rand() - 0.5) * 14;
      r += n * 0.5; g += n; b += n * 0.3;
      if (px % 4 !== 1) { setPixel(d, w, ox, oy, px, py, 0, 0, 0, 0); }
      else { setPixel(d, w, ox, oy, px, py, r, g, b); }
    }
  }
}

export function drawWheatStage7(d: D, w: number, ox: number, oy: number, rand: R) {
  // Tall golden wheat
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if (py < 2) {
      // Tips
      const r = 200, g = 170, b = 50;
      const n = (rand() - 0.5) * 12;
      if (px % 2 === 0) { setPixel(d, w, ox, oy, px, py, r + n, g + n, b + n * 0.4); }
      else { setPixel(d, w, ox, oy, px, py, 0, 0, 0, 0); }
    } else if (py < 12) {
      let r = 190, g = 160, b = 45;
      const n = (rand() - 0.5) * 14;
      r += n; g += n * 0.8; b += n * 0.3;
      if (px % 2 !== 0) { setPixel(d, w, ox, oy, px, py, 0, 0, 0, 0); }
      else { setPixel(d, w, ox, oy, px, py, r, g, b); }
    } else {
      const r = 80, g = 120, b = 30;
      const n = (rand() - 0.5) * 10;
      if (px % 2 !== 0) { setPixel(d, w, ox, oy, px, py, 0, 0, 0, 0); }
      else { setPixel(d, w, ox, oy, px, py, r + n, g + n, b + n * 0.3); }
    }
  }
}

export function drawFarmlandTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 110, g = 70, b = 40;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.7; b += n * 0.5;
    // Furrow lines
    if (py % 4 === 0) { r -= 15; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawFarmlandSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 139, g = 104, b = 71;
    const n = (rand() - 0.5) * 18;
    r += n; g += n * 0.8; b += n * 0.6;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// --- Quartz Variants ---

export function drawQuartzBlockSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 232, g = 228, b = 220;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    if (py < 2 || py > 13) { r -= 10; g -= 10; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawQuartzBlockTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 235, g = 230, b = 222;
    const n = (rand() - 0.5) * 6;
    r += n; g += n; b += n;
    // Border
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 12; g -= 12; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSmoothQuartz(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 235, g = 230, b = 222;
    const n = (rand() - 0.5) * 5;
    r += n; g += n; b += n;
    if (py === 15) { r -= 8; g -= 8; b -= 6; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawChiseledQuartz(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 232, g = 228, b = 220;
    const n = (rand() - 0.5) * 6;
    r += n; g += n; b += n;
    if (px < 2 || px > 13 || py < 2 || py > 13) { r -= 12; g -= 12; b -= 10; }
    if (px >= 4 && px <= 11 && py >= 4 && py <= 11) {
      if (px === 4 || px === 11 || py === 4 || py === 11) { r -= 18; g -= 18; b -= 15; }
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawQuartzPillarSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 232, g = 228, b = 220;
    const n = (rand() - 0.5) * 6;
    r += n; g += n; b += n;
    if (px % 4 === 0) { r -= 10; g -= 10; b -= 8; }
    if (py < 2 || py > 13) { r -= 10; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// --- Misc Blocks ---

export function drawMagmaBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 55, g = 25, b = 10;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.5; b += n * 0.3;
    // Lava cracks
    if ((px + py * 3) % 5 < 2 && rand() < 0.35) {
      r = 220 + (rand() - 0.5) * 20; g = 120 + (rand() - 0.5) * 30; b = 20;
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawSlimeBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 100, g = 190, b = 80;
    const n = (rand() - 0.5) * 14;
    r += n * 0.5; g += n; b += n * 0.5;
    if (px < 2 || px > 13 || py < 2 || py > 13) { r -= 20; g -= 25; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b, 200);
  }
}

export function drawHoneyBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 230, g = 160, b = 30;
    const n = (rand() - 0.5) * 12;
    r += n * 0.5; g += n * 0.7; b += n * 0.3;
    if (px < 2 || px > 13 || py < 2 || py > 13) { r -= 15; g -= 10; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b, 220);
  }
}

export function drawHoneycombBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 220, g = 150, b = 25;
    const n = (rand() - 0.5) * 12;
    r += n * 0.5; g += n * 0.6; b += n * 0.3;
    // Hexagonal pattern
    if ((px + py * 2) % 6 === 0 || (px * 2 + py) % 6 === 0) { r -= 20; g -= 15; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawDriedKelpBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 50, g = 65, b = 30;
    const n = (rand() - 0.5) * 14;
    r += n * 0.6; g += n; b += n * 0.5;
    if (rand() < 0.1) { r -= 10; g -= 12; b -= 6; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawCopperBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 190, g = 110, b = 70;
    const n = (rand() - 0.5) * 16;
    r += n; g += n * 0.7; b += n * 0.5;
    if ((px + py) % 5 === 0 && rand() < 0.3) { r += 20; g += 15; b += 10; }
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 15; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawAncientDebrisSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 95, g = 65, b = 55;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.7; b += n * 0.6;
    if ((px * 2 + py) % 7 === 0 && rand() < 0.3) { r += 15; g += 10; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawAncientDebrisTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 100, g = 70, b = 60;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.7; b += n * 0.6;
    // Spiral/circular pattern
    const cx = 7.5, cy = 7.5;
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    if (Math.floor(dist) % 3 === 0) { r += 10; g += 8; b += 6; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// Polished basalt
export function drawPolishedBasaltSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPolishedStone(d, w, ox, oy, rand, 80, 80, 85);
}

export function drawPolishedBasaltTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawBasaltTop(d, w, ox, oy, rand);
}

// --- Redstone Components ---

export function drawRedstoneDust(d: D, w: number, ox: number, oy: number, rand: R) {
  // Stone base with red wiring
  drawStone(d, w, ox, oy, rand);
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if ((px === 7 || px === 8) || (py === 7 || py === 8)) {
      if (px >= 3 && px <= 12 && py >= 3 && py <= 12) {
        const n = (rand() - 0.5) * 15;
        setPixel(d, w, ox, oy, px, py, 180 + n, 10 + n * 0.2, 10 + n * 0.2);
      }
    }
  }
}

export function drawRepeaterTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 150, g = 150, b = 150;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    // Red torches
    if (px >= 3 && px <= 4 && py >= 6 && py <= 9) { r = 180; g = 20; b = 20; }
    if (px >= 11 && px <= 12 && py >= 6 && py <= 9) { r = 180; g = 20; b = 20; }
    // Red line
    if (py === 7 || py === 8) { r = 140 + n; g = 10; b = 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawComparatorTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 150, g = 150, b = 150;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    // Triangle arrangement of torches
    if (px >= 7 && px <= 8 && py >= 2 && py <= 5) { r = 180; g = 20; b = 20; }
    if (px >= 3 && px <= 4 && py >= 10 && py <= 13) { r = 180; g = 20; b = 20; }
    if (px >= 11 && px <= 12 && py >= 10 && py <= 13) { r = 180; g = 20; b = 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPistonSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 12;
    if (py < 4) {
      // Piston head (wood)
      r = 170 + n; g = 130 + n * 0.8; b = 80 + n * 0.5;
    } else {
      // Stone body
      r += n; g += n; b += n;
      if ((px + py * 2) % 6 === 0) { r -= 10; g -= 10; b -= 10; }
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPistonTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 170, g = 130, b = 80;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.8; b += n * 0.5;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 15; g -= 12; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawPistonBottom(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 12; g -= 12; b -= 12; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawObserverFront(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    // Face with eyes and mouth
    if (((px >= 3 && px <= 5) || (px >= 10 && px <= 12)) && py >= 5 && py <= 7) {
      r = 30; g = 30; b = 30;
    }
    if (px >= 6 && px <= 9 && py >= 10 && py <= 11) { r = 30; g = 30; b = 30; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawObserverSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    // Arrow pattern
    if (py >= 6 && py <= 9 && px === 7) { r -= 30; g -= 30; b -= 30; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawNoteBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 107, 76, 38);
  // Note symbol in center
  for (let py = 5; py <= 11; py++) for (let px = 6; px <= 10; px++) {
    if ((px === 7 || px === 8) && py >= 5 && py <= 9) {
      setPixel(d, w, ox, oy, px, py, 30, 30, 30);
    }
    if ((px === 6 || px === 7) && py === 10) { setPixel(d, w, ox, oy, px, py, 30, 30, 30); }
    if ((px === 9 || px === 10) && py === 10) { setPixel(d, w, ox, oy, px, py, 30, 30, 30); }
  }
}

export function drawTarget(d: D, w: number, ox: number, oy: number, rand: R) {
  const cx = 7.5, cy = 7.5;
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    const n = (rand() - 0.5) * 8;
    if (dist < 2) { setPixel(d, w, ox, oy, px, py, 200 + n, 40 + n * 0.2, 40 + n * 0.2); }
    else if (dist < 4) { setPixel(d, w, ox, oy, px, py, 220 + n, 210 + n, 190 + n); }
    else if (dist < 6) { setPixel(d, w, ox, oy, px, py, 200 + n, 40 + n * 0.2, 40 + n * 0.2); }
    else { setPixel(d, w, ox, oy, px, py, 220 + n, 210 + n, 190 + n); }
  }
}

// --- Barrel, Dispenser, Dropper ---

export function drawBarrelTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 150, g = 110, b = 60;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.8; b += n * 0.5;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 20; g -= 16; b -= 10; }
    // Cross brace
    if (px === 7 || px === 8 || py === 7 || py === 8) { r -= 15; g -= 12; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawBarrelSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 140, g = 100, b = 50;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.8; b += n * 0.5;
    if (py % 4 === 0) { r -= 12; g -= 10; b -= 6; }
    // Metal bands
    if (py === 3 || py === 12) { r = 120 + n; g = 120 + n; b = 120 + n; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawDispenserFront(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    // Face opening
    if (px >= 5 && px <= 10 && py >= 5 && py <= 10) {
      r = 40 + (rand() - 0.5) * 10; g = 40 + (rand() - 0.5) * 10; b = 40 + (rand() - 0.5) * 10;
      // Triangular teeth
      if (py === 5 && px % 2 === 0) { r = 128; g = 128; b = 128; }
    }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawDropperFront(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    // Simple circular opening
    const cx = 7.5, cy = 7.5;
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    if (dist < 3) { r = 40 + (rand() - 0.5) * 10; g = 40; b = 40; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

export function drawEndRod(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if (px >= 6 && px <= 9) {
      let r = 230, g = 225, b = 210;
      const n = (rand() - 0.5) * 8;
      r += n; g += n; b += n * 0.8;
      if (px === 6 || px === 9) { r -= 15; g -= 15; b -= 12; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    } else {
      setPixel(d, w, ox, oy, px, py, 0, 0, 0, 0);
    }
  }
}

export function drawCobweb(d: D, w: number, ox: number, oy: number, rand: R) {
  // Mostly transparent with white strands
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    const onDiag1 = Math.abs(px - py) < 2;
    const onDiag2 = Math.abs(px - (15 - py)) < 2;
    const onCross = px === 7 || px === 8 || py === 7 || py === 8;
    if (onDiag1 || onDiag2 || onCross) {
      const n = (rand() - 0.5) * 10;
      setPixel(d, w, ox, oy, px, py, 220 + n, 220 + n, 220 + n, 150);
    } else {
      setPixel(d, w, ox, oy, px, py, 0, 0, 0, 0);
    }
  }
}

export function drawSnowBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  drawSnow(d, w, ox, oy, rand);
}
