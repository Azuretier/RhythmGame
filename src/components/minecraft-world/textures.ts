// Procedural 16x16 Minecraft texture atlas generation
// Generates pixel-art textures and packs them into a single atlas

const TILE = 16;
const ATLAS_COLS = 8;
const ATLAS_ROWS = 8;
export const ATLAS_SIZE = ATLAS_COLS * TILE; // 128x128

// Block type enum (used as index into world data array)
export const Block = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3,
  Sand: 4,
  Water: 5,
  OakLog: 6,
  OakLeaves: 7,
  Bedrock: 8,
  CoalOre: 9,
  IronOre: 10,
  GoldOre: 11,
  DiamondOre: 12,
  Gravel: 13,
  SnowGrass: 14,
  Sandstone: 15,
  Snow: 16,
  Ice: 17,
  Cactus: 18,
  OakPlanks: 19,
  Cobblestone: 20,
  Glass: 21,
  BirchLog: 22,
  Pumpkin: 23,
  Clay: 24,
} as const;

export type BlockType = (typeof Block)[keyof typeof Block];

// Texture atlas indices
const TEX = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  OAK_LOG_TOP: 6,
  OAK_LOG_SIDE: 7,
  OAK_LEAVES: 8,
  SNOW: 9,
  SNOW_SIDE: 10,
  BEDROCK: 11,
  COAL_ORE: 12,
  IRON_ORE: 13,
  GOLD_ORE: 14,
  DIAMOND_ORE: 15,
  GRAVEL: 16,
  COBBLESTONE: 17,
  OAK_PLANKS: 18,
  SANDSTONE: 19,
  ICE: 20,
  CACTUS_SIDE: 21,
  CACTUS_TOP: 22,
  GLASS: 23,
  BIRCH_LOG_SIDE: 24,
  PUMPKIN_SIDE: 25,
  PUMPKIN_TOP: 26,
  CLAY: 27,
};

// Block transparency
export const BLOCK_TRANSPARENT = new Set<number>([Block.Air, Block.Water, Block.Glass]);
export const BLOCK_LIQUID = new Set<number>([Block.Water]);

// Block face texture mapping: { top, bottom, side }
export const BLOCK_FACES: Record<number, { top: number; bottom: number; side: number }> = {
  [Block.Grass]: { top: TEX.GRASS_TOP, side: TEX.GRASS_SIDE, bottom: TEX.DIRT },
  [Block.Dirt]: { top: TEX.DIRT, side: TEX.DIRT, bottom: TEX.DIRT },
  [Block.Stone]: { top: TEX.STONE, side: TEX.STONE, bottom: TEX.STONE },
  [Block.Sand]: { top: TEX.SAND, side: TEX.SAND, bottom: TEX.SAND },
  [Block.Water]: { top: TEX.WATER, side: TEX.WATER, bottom: TEX.WATER },
  [Block.OakLog]: { top: TEX.OAK_LOG_TOP, side: TEX.OAK_LOG_SIDE, bottom: TEX.OAK_LOG_TOP },
  [Block.OakLeaves]: { top: TEX.OAK_LEAVES, side: TEX.OAK_LEAVES, bottom: TEX.OAK_LEAVES },
  [Block.Bedrock]: { top: TEX.BEDROCK, side: TEX.BEDROCK, bottom: TEX.BEDROCK },
  [Block.CoalOre]: { top: TEX.COAL_ORE, side: TEX.COAL_ORE, bottom: TEX.COAL_ORE },
  [Block.IronOre]: { top: TEX.IRON_ORE, side: TEX.IRON_ORE, bottom: TEX.IRON_ORE },
  [Block.GoldOre]: { top: TEX.GOLD_ORE, side: TEX.GOLD_ORE, bottom: TEX.GOLD_ORE },
  [Block.DiamondOre]: { top: TEX.DIAMOND_ORE, side: TEX.DIAMOND_ORE, bottom: TEX.DIAMOND_ORE },
  [Block.Gravel]: { top: TEX.GRAVEL, side: TEX.GRAVEL, bottom: TEX.GRAVEL },
  [Block.SnowGrass]: { top: TEX.SNOW, side: TEX.SNOW_SIDE, bottom: TEX.DIRT },
  [Block.Sandstone]: { top: TEX.SANDSTONE, side: TEX.SANDSTONE, bottom: TEX.SANDSTONE },
  [Block.Snow]: { top: TEX.SNOW, side: TEX.SNOW, bottom: TEX.SNOW },
  [Block.Ice]: { top: TEX.ICE, side: TEX.ICE, bottom: TEX.ICE },
  [Block.Cactus]: { top: TEX.CACTUS_TOP, side: TEX.CACTUS_SIDE, bottom: TEX.CACTUS_TOP },
  [Block.OakPlanks]: { top: TEX.OAK_PLANKS, side: TEX.OAK_PLANKS, bottom: TEX.OAK_PLANKS },
  [Block.Cobblestone]: { top: TEX.COBBLESTONE, side: TEX.COBBLESTONE, bottom: TEX.COBBLESTONE },
  [Block.Glass]: { top: TEX.GLASS, side: TEX.GLASS, bottom: TEX.GLASS },
  [Block.BirchLog]: { top: TEX.OAK_LOG_TOP, side: TEX.BIRCH_LOG_SIDE, bottom: TEX.OAK_LOG_TOP },
  [Block.Pumpkin]: { top: TEX.PUMPKIN_TOP, side: TEX.PUMPKIN_SIDE, bottom: TEX.PUMPKIN_TOP },
  [Block.Clay]: { top: TEX.CLAY, side: TEX.CLAY, bottom: TEX.CLAY },
};

// Get UV coordinates for a texture index
export function getTexUV(texIndex: number): { u0: number; v0: number; u1: number; v1: number } {
  const col = texIndex % ATLAS_COLS;
  const row = Math.floor(texIndex / ATLAS_COLS);
  const pad = 0.001; // small padding to avoid texture bleeding
  return {
    u0: col / ATLAS_COLS + pad,
    v0: 1 - (row + 1) / ATLAS_ROWS + pad,
    u1: (col + 1) / ATLAS_COLS - pad,
    v1: 1 - row / ATLAS_ROWS - pad,
  };
}

// Seeded PRNG (mulberry32)
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

type RGBA = [number, number, number, number];

function setPixel(
  data: Uint8ClampedArray,
  w: number,
  ox: number,
  oy: number,
  px: number,
  py: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  const i = ((oy + py) * w + (ox + px)) * 4;
  data[i] = clamp(Math.round(r), 0, 255);
  data[i + 1] = clamp(Math.round(g), 0, 255);
  data[i + 2] = clamp(Math.round(b), 0, 255);
  data[i + 3] = clamp(Math.round(a), 0, 255);
}

// Fill a tile with a base color + noise
function fillNoise(
  data: Uint8ClampedArray,
  w: number,
  ox: number,
  oy: number,
  r: number,
  g: number,
  b: number,
  noise: number,
  rand: () => number,
  a = 255,
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

// Draw ore clusters on top of stone texture
function drawOreClusters(
  data: Uint8ClampedArray,
  w: number,
  ox: number,
  oy: number,
  oreR: number,
  oreG: number,
  oreB: number,
  rand: () => number,
) {
  // 3 clusters of 3-5 pixels
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

// Individual texture drawing functions
function drawGrassTop(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 93, g = 155, b = 60;
      const n = (rand() - 0.5) * 24;
      r += n * 0.8;
      g += n;
      b += n * 0.6;
      if (rand() < 0.12) { r -= 15; g -= 15; b -= 10; }
      if (rand() < 0.06) { r += 10; g += 12; b += 6; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawGrassSide(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      if (py < 3) {
        // Green grass top
        let r = 93, g = 155, b = 60;
        const n = (rand() - 0.5) * 20;
        r += n * 0.7; g += n; b += n * 0.5;
        setPixel(d, w, ox, oy, px, py, r, g, b);
      } else if (py === 3) {
        // Transition
        if (rand() < 0.5) {
          setPixel(d, w, ox, oy, px, py, 93 + (rand() - 0.5) * 20, 140 + (rand() - 0.5) * 20, 55 + (rand() - 0.5) * 15);
        } else {
          setPixel(d, w, ox, oy, px, py, 139 + (rand() - 0.5) * 15, 104 + (rand() - 0.5) * 15, 71 + (rand() - 0.5) * 15);
        }
      } else {
        // Dirt
        let r = 139, g = 104, b = 71;
        const n = (rand() - 0.5) * 18;
        r += n; g += n * 0.8; b += n * 0.6;
        if (rand() < 0.1) { r -= 20; g -= 15; b -= 12; }
        setPixel(d, w, ox, oy, px, py, r, g, b);
      }
    }
  }
}

function drawDirt(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 139, g = 104, b = 71;
      const n = (rand() - 0.5) * 20;
      r += n; g += n * 0.8; b += n * 0.6;
      if (rand() < 0.12) { r -= 22; g -= 18; b -= 14; }
      if (rand() < 0.06) { r += 15; g += 12; b += 8; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawStone(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 128, g = 128, b = 128;
      const n = (rand() - 0.5) * 24;
      r += n; g += n; b += n;
      // Occasional crack
      if ((px + py * 3) % 7 === 0 && rand() < 0.3) { r -= 25; g -= 25; b -= 25; }
      // Light patches
      if (rand() < 0.08) { r += 18; g += 18; b += 18; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawSand(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 219, g = 196, b = 120;
      const n = (rand() - 0.5) * 14;
      r += n; g += n * 0.9; b += n * 0.7;
      if (rand() < 0.05) { r -= 12; g -= 10; b -= 8; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawWater(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 40, g = 80, b = 190;
      const n = (rand() - 0.5) * 16;
      r += n * 0.5; g += n * 0.7; b += n;
      // Horizontal ripple highlights
      if (py % 4 === 0) { r += 15; g += 15; b += 20; }
      setPixel(d, w, ox, oy, px, py, r, g, b, 200);
    }
  }
}

function drawOakLogTop(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  const cx = 7.5, cy = 7.5;
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      const n = (rand() - 0.5) * 10;
      if (dist < 2) {
        setPixel(d, w, ox, oy, px, py, 100 + n, 70 + n, 40 + n); // dark center
      } else if (dist < 5) {
        const ring = Math.floor(dist) % 2 === 0;
        if (ring) {
          setPixel(d, w, ox, oy, px, py, 170 + n, 133 + n, 83 + n);
        } else {
          setPixel(d, w, ox, oy, px, py, 145 + n, 110 + n, 65 + n);
        }
      } else if (dist < 7) {
        setPixel(d, w, ox, oy, px, py, 120 + n, 85 + n, 50 + n); // bark edge
      } else {
        setPixel(d, w, ox, oy, px, py, 107 + n, 76 + n, 38 + n); // outer bark
      }
    }
  }
}

function drawOakLogSide(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 107, g = 76, b = 38;
      const n = (rand() - 0.5) * 14;
      r += n; g += n * 0.8; b += n * 0.5;
      // Vertical bark lines
      if (px % 4 === 0) { r -= 15; g -= 12; b -= 8; }
      if (px % 4 === 1 && rand() < 0.3) { r -= 10; g -= 8; b -= 5; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawOakLeaves(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 58, g = 125, b = 34;
      const n = (rand() - 0.5) * 36;
      r += n * 0.6; g += n; b += n * 0.5;
      if (rand() < 0.15) { r -= 20; g -= 25; b -= 15; } // shadow
      if (rand() < 0.1) { r += 15; g += 20; b += 10; } // highlight
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawSnow(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 244, g = 244, b = 248;
      const n = (rand() - 0.5) * 8;
      r += n; g += n; b += n;
      if (rand() < 0.05) { r -= 8; g -= 8; b -= 4; } // subtle shadow
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawSnowSide(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      if (py < 3) {
        let r = 244, g = 244, b = 248;
        const n = (rand() - 0.5) * 8;
        setPixel(d, w, ox, oy, px, py, r + n, g + n, b + n);
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
}

function drawBedrock(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 60, g = 60, b = 60;
      const n = (rand() - 0.5) * 40;
      r += n; g += n; b += n;
      if (rand() < 0.15) { r -= 30; g -= 30; b -= 30; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawGravel(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 128, g = 124, b = 120;
      const n = (rand() - 0.5) * 35;
      r += n; g += n * 0.95; b += n * 0.9;
      if (rand() < 0.1) { r += 20; g += 18; b += 16; }
      if (rand() < 0.1) { r -= 25; g -= 22; b -= 20; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawCobblestone(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  // Draw irregular stone shapes
  fillNoise(d, w, ox, oy, 128, 128, 128, 12, rand);
  // Dark borders between stones
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      const gx = (px + py * 3) % 8;
      const gy = (py + px * 2) % 8;
      if (gx === 0 || gy === 0) {
        const n = (rand() - 0.5) * 10;
        setPixel(d, w, ox, oy, px, py, 85 + n, 85 + n, 85 + n);
      }
    }
  }
}

function drawOakPlanks(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 188, g = 145, b = 85;
      const n = (rand() - 0.5) * 14;
      r += n; g += n * 0.8; b += n * 0.6;
      // Horizontal plank lines
      if (py % 4 === 0) { r -= 18; g -= 14; b -= 10; }
      // Vertical grain
      if (px % 6 === 0 && rand() < 0.4) { r -= 8; g -= 6; b -= 4; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawSandstone(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 212, g = 184, b = 122;
      const n = (rand() - 0.5) * 10;
      r += n; g += n * 0.9; b += n * 0.7;
      // Horizontal layering
      if (py < 2 || py > 13) { r -= 10; g -= 8; b -= 5; }
      if (py % 3 === 0) { r -= 5; g -= 4; b -= 3; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawIce(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 165, g = 214, b = 245;
      const n = (rand() - 0.5) * 12;
      r += n; g += n; b += n * 0.5;
      // Crack lines
      if ((px + py * 2) % 11 === 0 && rand() < 0.5) { r += 20; g += 20; b += 15; }
      setPixel(d, w, ox, oy, px, py, r, g, b, 220);
    }
  }
}

function drawCactusSide(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 45, g = 122, b = 45;
      const n = (rand() - 0.5) * 14;
      r += n * 0.6; g += n; b += n * 0.6;
      // Lighter center stripe
      if (px > 5 && px < 10) { r += 10; g += 15; b += 10; }
      // Dark edges
      if (px < 2 || px > 13) { r -= 15; g -= 18; b -= 12; }
      // Thorn dots
      if (py % 4 === 2 && (px === 3 || px === 12)) {
        r += 30; g += 25; b += 15;
      }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawCactusTop(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  const cx = 7.5, cy = 7.5;
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      let r = 50, g = 130, b = 50;
      const n = (rand() - 0.5) * 10;
      if (dist < 4) {
        r += 15 + n; g += 20 + n; b += 12 + n; // lighter center
      } else if (dist > 6) {
        r -= 15 + n; g -= 18 + n; b -= 12 + n; // darker edge
      } else {
        r += n; g += n; b += n;
      }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawGlass(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  // Mostly transparent with a light frame
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      if (px === 0 || px === 15 || py === 0 || py === 15) {
        // Frame
        setPixel(d, w, ox, oy, px, py, 200, 210, 220, 200);
      } else if (px === 1 || px === 14 || py === 1 || py === 14) {
        // Inner frame
        setPixel(d, w, ox, oy, px, py, 210, 225, 235, 150);
      } else {
        // Transparent center with subtle tint
        const n = (rand() - 0.5) * 8;
        setPixel(d, w, ox, oy, px, py, 220 + n, 235 + n, 245 + n, 60);
      }
    }
  }
}

function drawBirchLogSide(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 215, g = 210, b = 200;
      const n = (rand() - 0.5) * 10;
      r += n; g += n; b += n;
      // Dark bark patches
      if ((px + py * 5) % 9 < 2 && rand() < 0.6) {
        r = 50 + (rand() - 0.5) * 20;
        g = 45 + (rand() - 0.5) * 15;
        b = 40 + (rand() - 0.5) * 15;
      }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawPumpkinSide(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 206, g = 126, b = 30;
      const n = (rand() - 0.5) * 16;
      r += n; g += n * 0.7; b += n * 0.3;
      // Vertical ridges
      if (px % 4 === 0) { r -= 25; g -= 18; b -= 8; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawPumpkinTop(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 190, g = 115, b = 25;
      const n = (rand() - 0.5) * 14;
      r += n; g += n * 0.7; b += n * 0.3;
      // Stem in center
      if (px >= 6 && px <= 9 && py >= 6 && py <= 9) {
        r = 80 + (rand() - 0.5) * 12;
        g = 100 + (rand() - 0.5) * 12;
        b = 40 + (rand() - 0.5) * 8;
      }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

function drawClay(d: Uint8ClampedArray, w: number, ox: number, oy: number, rand: () => number) {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      let r = 160, g = 166, b = 178;
      const n = (rand() - 0.5) * 12;
      r += n; g += n; b += n * 0.8;
      if (rand() < 0.08) { r -= 10; g -= 10; b -= 8; }
      setPixel(d, w, ox, oy, px, py, r, g, b);
    }
  }
}

// Atlas texture slot coordinates
function tileOffset(index: number): [number, number] {
  const col = index % ATLAS_COLS;
  const row = Math.floor(index / ATLAS_COLS);
  return [col * TILE, row * TILE];
}

export function createTextureAtlas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(ATLAS_SIZE, ATLAS_SIZE);
  const data = imageData.data;
  const w = ATLAS_SIZE;

  // Fill with transparent black
  data.fill(0);

  const rand = rng(42);

  const drawFns: [number, (d: Uint8ClampedArray, w: number, ox: number, oy: number, r: () => number) => void][] = [
    [TEX.GRASS_TOP, drawGrassTop],
    [TEX.GRASS_SIDE, drawGrassSide],
    [TEX.DIRT, drawDirt],
    [TEX.STONE, drawStone],
    [TEX.SAND, drawSand],
    [TEX.WATER, drawWater],
    [TEX.OAK_LOG_TOP, drawOakLogTop],
    [TEX.OAK_LOG_SIDE, drawOakLogSide],
    [TEX.OAK_LEAVES, drawOakLeaves],
    [TEX.SNOW, drawSnow],
    [TEX.SNOW_SIDE, drawSnowSide],
    [TEX.BEDROCK, drawBedrock],
    [TEX.GRAVEL, drawGravel],
    [TEX.COBBLESTONE, drawCobblestone],
    [TEX.OAK_PLANKS, drawOakPlanks],
    [TEX.SANDSTONE, drawSandstone],
    [TEX.ICE, drawIce],
    [TEX.CACTUS_SIDE, drawCactusSide],
    [TEX.CACTUS_TOP, drawCactusTop],
    [TEX.GLASS, drawGlass],
    [TEX.BIRCH_LOG_SIDE, drawBirchLogSide],
    [TEX.PUMPKIN_SIDE, drawPumpkinSide],
    [TEX.PUMPKIN_TOP, drawPumpkinTop],
    [TEX.CLAY, drawClay],
  ];

  // Draw all textures
  for (const [texIdx, drawFn] of drawFns) {
    const [ox, oy] = tileOffset(texIdx);
    drawFn(data, w, ox, oy, rand);
  }

  // Ore textures: stone base + ore clusters
  const ores: [number, number, number, number][] = [
    [TEX.COAL_ORE, 30, 30, 30],
    [TEX.IRON_ORE, 200, 180, 150],
    [TEX.GOLD_ORE, 218, 165, 32],
    [TEX.DIAMOND_ORE, 100, 220, 235],
  ];
  for (const [texIdx, oreR, oreG, oreB] of ores) {
    const [ox, oy] = tileOffset(texIdx);
    drawStone(data, w, ox, oy, rand);
    drawOreClusters(data, w, ox, oy, oreR, oreG, oreB, rand);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
