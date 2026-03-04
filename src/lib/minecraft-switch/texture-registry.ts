// =============================================================================
// Expanded Texture Registry & Atlas System
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================
// Procedural 16x16 pixel-art textures packed into a 32x32 grid atlas (512x512).
// Each texture is drawn pixel-by-pixel with seeded RNG for determinism.
// =============================================================================

import { Block } from '@/types/minecraft-switch';

const TILE = 16;
const ATLAS_COLS = 32;
const ATLAS_ROWS = 32;
export const ATLAS_SIZE = ATLAS_COLS * TILE; // 512

// =============================================================================
// TEXTURE INDEX ENUM — Unique atlas slot for each texture face
// =============================================================================

export const TEX = {
  // --- Existing base textures (0-27) ---
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
  SANDSTONE_SIDE: 19,
  ICE: 20,
  CACTUS_SIDE: 21,
  CACTUS_TOP: 22,
  GLASS: 23,
  BIRCH_LOG_SIDE: 24,
  PUMPKIN_SIDE: 25,
  PUMPKIN_TOP: 26,
  CLAY: 27,

  // --- Stone variants (28-33) ---
  GRANITE: 28,
  DIORITE: 29,
  ANDESITE: 30,
  POLISHED_GRANITE: 31,
  POLISHED_DIORITE: 32,
  POLISHED_ANDESITE: 33,

  // --- Additional terrain (34-39) ---
  COARSE_DIRT: 34,
  PODZOL_TOP: 35,
  PODZOL_SIDE: 36,
  RED_SAND: 37,
  RED_SANDSTONE_SIDE: 38,
  SANDSTONE_TOP: 39,

  // --- Wood: Spruce (40-42) ---
  SPRUCE_LOG_SIDE: 40,
  SPRUCE_LOG_TOP: 41,
  SPRUCE_PLANKS: 42,

  // --- Wood: Birch (43-44) ---
  BIRCH_LOG_TOP: 43,
  BIRCH_PLANKS: 44,

  // --- Wood: Jungle (45-47) ---
  JUNGLE_LOG_SIDE: 45,
  JUNGLE_LOG_TOP: 46,
  JUNGLE_PLANKS: 47,

  // --- Wood: Acacia (48-50) ---
  ACACIA_LOG_SIDE: 48,
  ACACIA_LOG_TOP: 49,
  ACACIA_PLANKS: 50,

  // --- Wood: Dark Oak (51-53) ---
  DARK_OAK_LOG_SIDE: 51,
  DARK_OAK_LOG_TOP: 52,
  DARK_OAK_PLANKS: 53,

  // --- Leaves (54-58) ---
  SPRUCE_LEAVES: 54,
  BIRCH_LEAVES: 55,
  JUNGLE_LEAVES: 56,
  ACACIA_LEAVES: 57,
  DARK_OAK_LEAVES: 58,

  // --- Stone bricks (59-63) ---
  STONE_BRICKS: 59,
  MOSSY_STONE_BRICKS: 60,
  CRACKED_STONE_BRICKS: 61,
  CHISELED_STONE_BRICKS: 62,
  MOSSY_COBBLESTONE: 63,

  // --- Nether (64-76) ---
  NETHERRACK: 64,
  SOUL_SAND: 65,
  SOUL_SOIL: 66,
  GLOWSTONE: 67,
  NETHER_BRICKS: 68,
  RED_NETHER_BRICKS: 69,
  BASALT_SIDE: 70,
  BASALT_TOP: 71,
  BLACKSTONE: 72,
  POLISHED_BLACKSTONE: 73,
  POLISHED_BLACKSTONE_BRICKS: 74,
  CRIMSON_PLANKS: 75,
  WARPED_PLANKS: 76,

  // --- Nether stems (77-80) ---
  CRIMSON_STEM_SIDE: 77,
  CRIMSON_STEM_TOP: 78,
  WARPED_STEM_SIDE: 79,
  WARPED_STEM_TOP: 80,

  // --- Nether nylium (81-82) ---
  CRIMSON_NYLIUM_TOP: 81,
  WARPED_NYLIUM_TOP: 82,

  // --- Nether misc (83-85) ---
  SHROOMLIGHT: 83,
  NETHER_WART_BLOCK: 84,
  WARPED_WART_BLOCK: 85,

  // --- End blocks (86-90) ---
  END_STONE: 86,
  END_STONE_BRICKS: 87,
  PURPUR_BLOCK: 88,
  PURPUR_PILLAR_SIDE: 89,
  PURPUR_PILLAR_TOP: 90,

  // --- Prismarine (91-94) ---
  PRISMARINE: 91,
  PRISMARINE_BRICKS: 92,
  DARK_PRISMARINE: 93,
  SEA_LANTERN: 94,

  // --- Functional blocks (95-106) ---
  CRAFTING_TABLE_TOP: 95,
  CRAFTING_TABLE_SIDE: 96,
  FURNACE_SIDE: 97,
  FURNACE_FRONT: 98,
  FURNACE_TOP: 99,
  CHEST_SIDE: 100,
  CHEST_FRONT: 101,
  CHEST_TOP: 102,
  ENCHANTING_TABLE_TOP: 103,
  ENCHANTING_TABLE_SIDE: 104,
  BOOKSHELF: 105,
  JUKEBOX_TOP: 106,

  // --- Mineral blocks (107-115) ---
  COAL_BLOCK: 107,
  IRON_BLOCK: 108,
  GOLD_BLOCK: 109,
  DIAMOND_BLOCK: 110,
  EMERALD_BLOCK: 111,
  LAPIS_BLOCK: 112,
  REDSTONE_BLOCK: 113,
  NETHERITE_BLOCK: 114,
  QUARTZ_BLOCK_SIDE: 115,

  // --- Quartz variants (116-119) ---
  QUARTZ_BLOCK_TOP: 116,
  SMOOTH_QUARTZ: 117,
  CHISELED_QUARTZ: 118,
  QUARTZ_PILLAR_SIDE: 119,

  // --- Ores continued (120-124) ---
  EMERALD_ORE: 120,
  LAPIS_ORE: 121,
  REDSTONE_ORE: 122,
  NETHER_QUARTZ_ORE: 123,
  NETHER_GOLD_ORE: 124,

  // --- Redstone components (125-129) ---
  REDSTONE_DUST: 125,
  REPEATER_TOP: 126,
  COMPARATOR_TOP: 127,
  PISTON_SIDE: 128,
  OBSERVER_FRONT: 129,

  // --- Crops (130-133) ---
  WHEAT_STAGE_0: 130,
  WHEAT_STAGE_7: 131,
  FARMLAND_TOP: 132,
  FARMLAND_SIDE: 133,

  // --- Building blocks (134-143) ---
  BRICKS: 134,
  TNT_SIDE: 135,
  TNT_TOP: 136,
  TNT_BOTTOM: 137,
  SPONGE: 138,
  WET_SPONGE: 139,
  MELON_SIDE: 140,
  MELON_TOP: 141,
  JACK_O_LANTERN: 142,
  HAY_BALE_SIDE: 143,

  // --- Building blocks continued (144-149) ---
  HAY_BALE_TOP: 144,
  BONE_BLOCK_SIDE: 145,
  BONE_BLOCK_TOP: 146,
  OBSIDIAN: 147,
  CRYING_OBSIDIAN: 148,
  SMOOTH_STONE: 149,

  // --- Lava (150) ---
  LAVA: 150,

  // --- Mycelium (151-152) ---
  MYCELIUM_TOP: 151,
  MYCELIUM_SIDE: 152,

  // --- Ice variants (153-154) ---
  PACKED_ICE: 153,
  BLUE_ICE: 154,

  // --- Ancient debris (155) ---
  ANCIENT_DEBRIS_SIDE: 155,
  ANCIENT_DEBRIS_TOP: 156,

  // --- Copper (157) ---
  COPPER_BLOCK: 157,

  // --- Misc (158-161) ---
  MAGMA_BLOCK: 158,
  SLIME_BLOCK: 159,
  HONEY_BLOCK: 160,
  HONEYCOMB_BLOCK: 161,

  // --- Dried kelp (162) ---
  DRIED_KELP_BLOCK: 162,

  // --- Polished basalt (163) ---
  POLISHED_BASALT_SIDE: 163,
  POLISHED_BASALT_TOP: 164,

  // --- Smooth sandstone (165-167) ---
  SMOOTH_SANDSTONE: 165,
  SMOOTH_RED_SANDSTONE: 166,
  RED_SANDSTONE_TOP: 167,

  // --- Chiseled/Cut sandstone (168-171) ---
  CHISELED_SANDSTONE: 168,
  CUT_SANDSTONE: 169,
  CHISELED_RED_SANDSTONE: 170,
  CUT_RED_SANDSTONE: 171,

  // --- Wool base (172-187) ---
  WHITE_WOOL: 172,
  ORANGE_WOOL: 173,
  MAGENTA_WOOL: 174,
  LIGHT_BLUE_WOOL: 175,
  YELLOW_WOOL: 176,
  LIME_WOOL: 177,
  PINK_WOOL: 178,
  GRAY_WOOL: 179,
  LIGHT_GRAY_WOOL: 180,
  CYAN_WOOL: 181,
  PURPLE_WOOL: 182,
  BLUE_WOOL: 183,
  BROWN_WOOL: 184,
  GREEN_WOOL: 185,
  RED_WOOL: 186,
  BLACK_WOOL: 187,

  // --- Concrete (188-203) ---
  WHITE_CONCRETE: 188,
  ORANGE_CONCRETE: 189,
  MAGENTA_CONCRETE: 190,
  LIGHT_BLUE_CONCRETE: 191,
  YELLOW_CONCRETE: 192,
  LIME_CONCRETE: 193,
  PINK_CONCRETE: 194,
  GRAY_CONCRETE: 195,
  LIGHT_GRAY_CONCRETE: 196,
  CYAN_CONCRETE: 197,
  PURPLE_CONCRETE: 198,
  BLUE_CONCRETE: 199,
  BROWN_CONCRETE: 200,
  GREEN_CONCRETE: 201,
  RED_CONCRETE: 202,
  BLACK_CONCRETE: 203,

  // --- Terracotta (204-220) ---
  TERRACOTTA: 204,
  WHITE_TERRACOTTA: 205,
  ORANGE_TERRACOTTA: 206,
  MAGENTA_TERRACOTTA: 207,
  LIGHT_BLUE_TERRACOTTA: 208,
  YELLOW_TERRACOTTA: 209,
  LIME_TERRACOTTA: 210,
  PINK_TERRACOTTA: 211,
  GRAY_TERRACOTTA: 212,
  LIGHT_GRAY_TERRACOTTA: 213,
  CYAN_TERRACOTTA: 214,
  PURPLE_TERRACOTTA: 215,
  BLUE_TERRACOTTA: 216,
  BROWN_TERRACOTTA: 217,
  GREEN_TERRACOTTA: 218,
  RED_TERRACOTTA: 219,
  BLACK_TERRACOTTA: 220,

  // --- Glazed Terracotta (221-236) ---
  WHITE_GLAZED: 221,
  ORANGE_GLAZED: 222,
  MAGENTA_GLAZED: 223,
  LIGHT_BLUE_GLAZED: 224,
  YELLOW_GLAZED: 225,
  LIME_GLAZED: 226,
  PINK_GLAZED: 227,
  GRAY_GLAZED: 228,
  LIGHT_GRAY_GLAZED: 229,
  CYAN_GLAZED: 230,
  PURPLE_GLAZED: 231,
  BLUE_GLAZED: 232,
  BROWN_GLAZED: 233,
  GREEN_GLAZED: 234,
  RED_GLAZED: 235,
  BLACK_GLAZED: 236,

  // --- Stained Glass (237-252) ---
  WHITE_STAINED_GLASS: 237,
  ORANGE_STAINED_GLASS: 238,
  MAGENTA_STAINED_GLASS: 239,
  LIGHT_BLUE_STAINED_GLASS: 240,
  YELLOW_STAINED_GLASS: 241,
  LIME_STAINED_GLASS: 242,
  PINK_STAINED_GLASS: 243,
  GRAY_STAINED_GLASS: 244,
  LIGHT_GRAY_STAINED_GLASS: 245,
  CYAN_STAINED_GLASS: 246,
  PURPLE_STAINED_GLASS: 247,
  BLUE_STAINED_GLASS: 248,
  BROWN_STAINED_GLASS: 249,
  GREEN_STAINED_GLASS: 250,
  RED_STAINED_GLASS: 251,
  BLACK_STAINED_GLASS: 252,

  // --- Concrete Powder (253-268) ---
  WHITE_CONCRETE_POWDER: 253,
  ORANGE_CONCRETE_POWDER: 254,
  MAGENTA_CONCRETE_POWDER: 255,
  LIGHT_BLUE_CONCRETE_POWDER: 256,
  YELLOW_CONCRETE_POWDER: 257,
  LIME_CONCRETE_POWDER: 258,
  PINK_CONCRETE_POWDER: 259,
  GRAY_CONCRETE_POWDER: 260,
  LIGHT_GRAY_CONCRETE_POWDER: 261,
  CYAN_CONCRETE_POWDER: 262,
  PURPLE_CONCRETE_POWDER: 263,
  BLUE_CONCRETE_POWDER: 264,
  BROWN_CONCRETE_POWDER: 265,
  GREEN_CONCRETE_POWDER: 266,
  RED_CONCRETE_POWDER: 267,
  BLACK_CONCRETE_POWDER: 268,

  // --- Coral blocks (269-278) ---
  TUBE_CORAL_BLOCK: 269,
  BRAIN_CORAL_BLOCK: 270,
  BUBBLE_CORAL_BLOCK: 271,
  FIRE_CORAL_BLOCK: 272,
  HORN_CORAL_BLOCK: 273,
  DEAD_TUBE_CORAL_BLOCK: 274,
  DEAD_BRAIN_CORAL_BLOCK: 275,
  DEAD_BUBBLE_CORAL_BLOCK: 276,
  DEAD_FIRE_CORAL_BLOCK: 277,
  DEAD_HORN_CORAL_BLOCK: 278,

  // --- Misc blocks (279-290) ---
  END_ROD: 279,
  SNOW_BLOCK: 280,
  COBWEB: 281,
  BARREL_TOP: 282,
  BARREL_SIDE: 283,
  DISPENSER_FRONT: 284,
  DROPPER_FRONT: 285,
  OBSERVER_SIDE: 286,
  PISTON_TOP: 287,
  PISTON_BOTTOM: 288,
  NOTE_BLOCK: 289,
  TARGET: 290,
} as const;

export type TexIndex = (typeof TEX)[keyof typeof TEX];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Seeded PRNG (mulberry32) — deterministic random from integer seed. */
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

/** Set a single pixel in the atlas image data. */
function setPixel(
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
function fillNoise(
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
function drawOreClusters(
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
function tileOffset(index: number): [number, number] {
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

// Shorthand types
type D = Uint8ClampedArray;
type R = () => number;
type DrawFn = (d: D, w: number, ox: number, oy: number, rand: R) => void;

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Base Terrain
// =============================================================================

function drawGrassTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 93, g = 155, b = 60;
    const n = (rand() - 0.5) * 24;
    r += n * 0.8; g += n; b += n * 0.6;
    if (rand() < 0.12) { r -= 15; g -= 15; b -= 10; }
    if (rand() < 0.06) { r += 10; g += 12; b += 6; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawGrassSide(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawDirt(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 139, g = 104, b = 71;
    const n = (rand() - 0.5) * 20;
    r += n; g += n * 0.8; b += n * 0.6;
    if (rand() < 0.12) { r -= 22; g -= 18; b -= 14; }
    if (rand() < 0.06) { r += 15; g += 12; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawStone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 24;
    r += n; g += n; b += n;
    if ((px + py * 3) % 7 === 0 && rand() < 0.3) { r -= 25; g -= 25; b -= 25; }
    if (rand() < 0.08) { r += 18; g += 18; b += 18; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawSand(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 219, g = 196, b = 120;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.9; b += n * 0.7;
    if (rand() < 0.05) { r -= 12; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawWater(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 40, g = 80, b = 190;
    const n = (rand() - 0.5) * 16;
    r += n * 0.5; g += n * 0.7; b += n;
    if (py % 4 === 0) { r += 15; g += 15; b += 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b, 200);
  }
}

function drawLava(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 220, g = 100, b = 20;
    const n = (rand() - 0.5) * 30;
    r += n * 0.5; g += n * 0.8; b += n * 0.3;
    if (py % 3 === 0 && rand() < 0.4) { r += 30; g += 40; b += 10; }
    if (rand() < 0.1) { r += 20; g -= 20; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b, 240);
  }
}

function drawBedrock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 60, g = 60, b = 60;
    const n = (rand() - 0.5) * 40;
    r += n; g += n; b += n;
    if (rand() < 0.15) { r -= 30; g -= 30; b -= 30; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawGravel(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 124, b = 120;
    const n = (rand() - 0.5) * 35;
    r += n; g += n * 0.95; b += n * 0.9;
    if (rand() < 0.1) { r += 20; g += 18; b += 16; }
    if (rand() < 0.1) { r -= 25; g -= 22; b -= 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawClay(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 166, b = 178;
    const n = (rand() - 0.5) * 12;
    r += n; g += n; b += n * 0.8;
    if (rand() < 0.08) { r -= 10; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawCobblestone(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawSnow(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 244, g = 244, b = 248;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    if (rand() < 0.05) { r -= 8; g -= 8; b -= 4; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawSnowSide(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawIce(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 165, g = 214, b = 245;
    const n = (rand() - 0.5) * 12;
    r += n; g += n; b += n * 0.5;
    if ((px + py * 2) % 11 === 0 && rand() < 0.5) { r += 20; g += 20; b += 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b, 220);
  }
}

function drawPackedIce(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 140, g = 180, b = 225;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n * 0.5;
    if ((px * 3 + py) % 9 === 0) { r += 15; g += 10; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawBlueIce(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 100, g = 150, b = 220;
    const n = (rand() - 0.5) * 10;
    r += n * 0.5; g += n * 0.7; b += n;
    if ((px + py) % 7 === 0) { r += 12; g += 15; b += 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 212, g = 184, b = 122;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.9; b += n * 0.7;
    if (py < 2 || py > 13) { r -= 10; g -= 8; b -= 5; }
    if (py % 3 === 0) { r -= 5; g -= 4; b -= 3; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawSandstoneTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 219, g = 196, b = 130;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.9; b += n * 0.7;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawRedSand(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 190, g = 100, b = 40;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.6; b += n * 0.4;
    if (rand() < 0.05) { r -= 12; g -= 8; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawRedSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 180, g = 95, b = 35;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.7; b += n * 0.5;
    if (py < 2 || py > 13) { r -= 10; g -= 6; b -= 4; }
    if (py % 3 === 0) { r -= 5; g -= 3; b -= 2; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawRedSandstoneTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 190, g = 105, b = 42;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.7; b += n * 0.5;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// --- Stone Variants ---

function drawGranite(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 158, g = 107, b = 80;
    const n = (rand() - 0.5) * 20;
    r += n; g += n * 0.8; b += n * 0.6;
    if (rand() < 0.1) { r += 15; g += 10; b += 8; }
    if ((px + py * 2) % 9 === 0 && rand() < 0.3) { r -= 15; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawDiorite(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 188, g = 188, b = 190;
    const n = (rand() - 0.5) * 22;
    r += n; g += n; b += n;
    if (rand() < 0.12) { r -= 20; g -= 18; b -= 16; }
    if (rand() < 0.08) { r += 15; g += 15; b += 18; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawAndesite(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 136, g = 136, b = 136;
    const n = (rand() - 0.5) * 18;
    r += n; g += n; b += n;
    if (rand() < 0.1) { r += 12; g += 12; b += 10; }
    if ((px * 2 + py) % 7 === 0 && rand() < 0.25) { r -= 12; g -= 12; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawPolishedStone(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    if (px % 8 === 0 || py % 8 === 0) { r -= 8; g -= 8; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawCoarseDirt(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 120, g = 85, b = 55;
    const n = (rand() - 0.5) * 25;
    r += n; g += n * 0.7; b += n * 0.5;
    if (rand() < 0.15) { r -= 18; g -= 14; b -= 10; }
    if (rand() < 0.08) { r += 20; g += 15; b += 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawPodzolTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 110, g = 80, b = 30;
    const n = (rand() - 0.5) * 18;
    r += n; g += n * 0.7; b += n * 0.4;
    if (rand() < 0.1) { r += 12; g += 8; b += 4; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawPodzolSide(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawMyceliumTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 140, g = 120, b = 140;
    const n = (rand() - 0.5) * 16;
    r += n; g += n * 0.8; b += n;
    if (rand() < 0.1) { r += 15; g += 10; b += 15; }
    if (rand() < 0.08) { r -= 12; g -= 12; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawMyceliumSide(d: D, w: number, ox: number, oy: number, rand: R) {
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
function drawPlanks(d: D, w: number, ox: number, oy: number, rand: R,
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
function drawOakLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 170, 133, 83, 107, 76, 38);
}
function drawOakLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 107, 76, 38);
}
function drawOakPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 188, 145, 85);
}
function drawOakLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
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
function drawSpruceLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 58, 37, 16);
}
function drawSpruceLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 140, 110, 60, 58, 37, 16);
}
function drawSprucePlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 115, 85, 48);
}
function drawSpruceLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
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
function drawBirchLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
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
function drawBirchLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 190, 175, 130, 215, 210, 200);
}
function drawBirchPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 215, 200, 155);
}
function drawBirchLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
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
function drawJungleLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 86, 68, 30);
}
function drawJungleLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 160, 120, 70, 86, 68, 30);
}
function drawJunglePlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 160, 115, 70);
}
function drawJungleLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
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
function drawAcaciaLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 105, g = 90, b = 70;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.7; b += n * 0.5;
    if (px % 4 === 0) { r -= 12; g -= 10; b -= 8; }
    if (py % 5 < 2 && rand() < 0.3) { r += 8; g -= 5; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}
function drawAcaciaLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 170, 100, 50, 105, 90, 70);
}
function drawAcaciaPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 175, 95, 40);
}
function drawAcaciaLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
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
function drawDarkOakLogSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 50, 30, 12);
}
function drawDarkOakLogTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 130, 95, 50, 50, 30, 12);
}
function drawDarkOakPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 67, 43, 20);
}
function drawDarkOakLeaves(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawStoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawMossyStoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawCrackedStoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawChiseledStoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawMossyCobblestone(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawSmoothStone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 160, b = 160;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    if (py === 0 || py === 15) { r -= 15; g -= 15; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Nether Blocks
// =============================================================================

function drawNetherrack(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 100, g = 35, b = 35;
    const n = (rand() - 0.5) * 22;
    r += n; g += n * 0.5; b += n * 0.5;
    if (rand() < 0.12) { r += 15; g -= 5; b -= 5; }
    if ((px + py * 3) % 6 === 0 && rand() < 0.3) { r -= 20; g -= 8; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawSoulSand(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawSoulSoil(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 75, g = 56, b = 38;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.8; b += n * 0.6;
    if (rand() < 0.1) { r -= 12; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawGlowstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 210, g = 180, b = 80;
    const n = (rand() - 0.5) * 30;
    r += n * 0.6; g += n * 0.7; b += n * 0.4;
    if (rand() < 0.15) { r += 25; g += 20; b += 10; }
    if ((px + py) % 5 === 0) { r -= 15; g -= 12; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawNetherBricks(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawRedNetherBricks(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawBasaltSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 75, g = 75, b = 80;
    const n = (rand() - 0.5) * 14;
    r += n; g += n; b += n;
    if (px % 4 === 0) { r -= 10; g -= 10; b -= 12; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawBasaltTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawBlackstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 32, g = 28, b = 30;
    const n = (rand() - 0.5) * 14;
    r += n; g += n; b += n;
    if ((px + py * 2) % 7 === 0 && rand() < 0.3) { r += 10; g += 8; b += 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawPolishedBlackstone(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPolishedStone(d, w, ox, oy, rand, 38, 34, 36);
}

function drawPolishedBlackstoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawCrimsonPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 120, 50, 70);
}

function drawWarpedPlanks(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPlanks(d, w, ox, oy, rand, 40, 120, 115);
}

function drawCrimsonStemSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 100, 30, 50);
}

function drawCrimsonStemTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 140, 50, 70, 100, 30, 50);
}

function drawWarpedStemSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogSide(d, w, ox, oy, rand, 25, 90, 85);
}

function drawWarpedStemTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawLogTop(d, w, ox, oy, rand, 40, 130, 120, 25, 90, 85);
}

function drawCrimsonNyliumTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 140, g = 25, b = 25;
    const n = (rand() - 0.5) * 20;
    r += n; g += n * 0.4; b += n * 0.4;
    if (rand() < 0.1) { r += 20; g += 5; b += 5; }
    if (rand() < 0.08) { r -= 30; g -= 5; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawWarpedNyliumTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 25, g = 140, b = 130;
    const n = (rand() - 0.5) * 20;
    r += n * 0.4; g += n; b += n * 0.9;
    if (rand() < 0.1) { r += 5; g += 20; b += 18; }
    if (rand() < 0.08) { r -= 5; g -= 25; b -= 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawShroomlight(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 220, g = 165, b = 50;
    const n = (rand() - 0.5) * 25;
    r += n * 0.5; g += n * 0.6; b += n * 0.3;
    if (rand() < 0.12) { r += 20; g += 15; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawNetherWartBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 120, g = 10, b = 10;
    const n = (rand() - 0.5) * 18;
    r += n; g += n * 0.3; b += n * 0.3;
    if (rand() < 0.1) { r += 15; g += 3; b += 3; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawWarpedWartBlock(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawEndStone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 222, g = 225, b = 165;
    const n = (rand() - 0.5) * 16;
    r += n; g += n; b += n * 0.7;
    if ((px + py * 2) % 7 === 0 && rand() < 0.3) { r -= 15; g -= 12; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawEndStoneBricks(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawPurpurBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 165, g = 120, b = 165;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.7; b += n;
    if ((px + py) % 4 === 0) { r -= 10; g -= 8; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawPurpurPillarSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 170, g = 125, b = 170;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.7; b += n;
    if (px % 4 === 0) { r -= 12; g -= 8; b -= 12; }
    if (py < 2 || py > 13) { r -= 10; g -= 8; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawPurpurPillarTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawPrismarine(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 85, g = 155, b = 140;
    const n = (rand() - 0.5) * 20;
    r += n * 0.5; g += n; b += n * 0.8;
    if ((px * 2 + py) % 7 === 0 && rand() < 0.3) { r -= 20; g -= 15; b -= 12; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawPrismarineBricks(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawDarkPrismarine(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 40, g = 80, b = 70;
    const n = (rand() - 0.5) * 14;
    r += n * 0.4; g += n; b += n * 0.8;
    if ((px + py) % 5 === 0) { r -= 8; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawSeaLantern(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawCraftingTableTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawCraftingTableSide(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawFurnaceSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 12;
    r += n; g += n; b += n;
    if ((px + py * 3) % 8 === 0 || (py + px * 2) % 8 === 0) { r -= 15; g -= 15; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawFurnaceFront(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawFurnaceTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 140, g = 140, b = 140;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 15; g -= 15; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawChestSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 115, b = 55;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.8; b += n * 0.5;
    if (py % 4 === 0) { r -= 12; g -= 10; b -= 6; }
    if (px === 0 || px === 15) { r -= 15; g -= 12; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawChestFront(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawChestTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawEnchantingTableTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawEnchantingTableSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 30, g = 20, b = 45;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.6; b += n;
    if ((px + py) % 6 === 0) { r += 8; g += 4; b += 12; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawBookshelf(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    // Plank frame top/bottom
    if (py < 2 || py > 13) {
      let r = 188, g = 145, b = 85;
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

function drawJukeboxTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawMineralBlock(d: D, w: number, ox: number, oy: number, rand: R,
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

function drawBricks(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawTntSide(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawTntTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawTntBottom(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 160, g = 130, b = 50;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.8; b += n * 0.4;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawSponge(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 195, g = 195, b = 60;
    const n = (rand() - 0.5) * 20;
    r += n; g += n; b += n * 0.5;
    // Pores
    if ((px * 3 + py * 5) % 7 < 2 && rand() < 0.5) { r -= 30; g -= 30; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawWetSponge(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 170, g = 175, b = 60;
    const n = (rand() - 0.5) * 18;
    r += n; g += n; b += n * 0.5;
    if ((px * 3 + py * 5) % 7 < 2 && rand() < 0.5) { r -= 30; g -= 20; b += 20; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawMelonSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 110, g = 145, b = 30;
    const n = (rand() - 0.5) * 14;
    r += n * 0.7; g += n; b += n * 0.4;
    // Vertical stripes
    if (px % 4 === 0) { r -= 18; g -= 20; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawMelonTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 95, g = 125, b = 25;
    const n = (rand() - 0.5) * 12;
    r += n * 0.6; g += n; b += n * 0.3;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawCactusSide(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawCactusTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawPumpkinSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 206, g = 126, b = 30;
    const n = (rand() - 0.5) * 16;
    r += n; g += n * 0.7; b += n * 0.3;
    if (px % 4 === 0) { r -= 25; g -= 18; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawPumpkinTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawJackOLantern(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawHayBaleSide(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawHayBaleTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawBoneBlockSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 220, g = 215, b = 195;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n * 0.8;
    if (px % 4 === 0) { r -= 12; g -= 12; b -= 10; }
    if (py < 2 || py > 13) { r -= 10; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawBoneBlockTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawObsidian(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 15, g = 10, b = 25;
    const n = (rand() - 0.5) * 12;
    r += n * 0.5; g += n * 0.3; b += n;
    if (rand() < 0.08) { r += 15; g += 5; b += 25; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawCryingObsidian(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawGlass(d: D, w: number, ox: number, oy: number, rand: R) {
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

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Crops & Farmland
// =============================================================================

function drawWheatStage0(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawWheatStage7(d: D, w: number, ox: number, oy: number, rand: R) {
  // Tall golden wheat
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    if (py < 2) {
      // Tips
      let r = 200, g = 170, b = 50;
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
      let r = 80, g = 120, b = 30;
      const n = (rand() - 0.5) * 10;
      if (px % 2 !== 0) { setPixel(d, w, ox, oy, px, py, 0, 0, 0, 0); }
      else { setPixel(d, w, ox, oy, px, py, r + n, g + n, b + n * 0.3); }
    }
  }
}

function drawFarmlandTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 110, g = 70, b = 40;
    const n = (rand() - 0.5) * 12;
    r += n; g += n * 0.7; b += n * 0.5;
    // Furrow lines
    if (py % 4 === 0) { r -= 15; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawFarmlandSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 139, g = 104, b = 71;
    const n = (rand() - 0.5) * 18;
    r += n; g += n * 0.8; b += n * 0.6;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Quartz Variants
// =============================================================================

function drawQuartzBlockSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 232, g = 228, b = 220;
    const n = (rand() - 0.5) * 8;
    r += n; g += n; b += n;
    if (py < 2 || py > 13) { r -= 10; g -= 10; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawQuartzBlockTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 235, g = 230, b = 222;
    const n = (rand() - 0.5) * 6;
    r += n; g += n; b += n;
    // Border
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 12; g -= 12; b -= 10; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawSmoothQuartz(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 235, g = 230, b = 222;
    const n = (rand() - 0.5) * 5;
    r += n; g += n; b += n;
    if (py === 15) { r -= 8; g -= 8; b -= 6; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawChiseledQuartz(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawQuartzPillarSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 232, g = 228, b = 220;
    const n = (rand() - 0.5) * 6;
    r += n; g += n; b += n;
    if (px % 4 === 0) { r -= 10; g -= 10; b -= 8; }
    if (py < 2 || py > 13) { r -= 10; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Sandstone Variants
// =============================================================================

function drawSmoothSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 216, g = 188, b = 126;
    const n = (rand() - 0.5) * 6;
    r += n; g += n * 0.9; b += n * 0.7;
    if (py === 15) { r -= 8; g -= 6; b -= 4; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawSmoothRedSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 185, g = 100, b = 38;
    const n = (rand() - 0.5) * 6;
    r += n; g += n * 0.7; b += n * 0.4;
    if (py === 15) { r -= 8; g -= 5; b -= 3; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawChiseledSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawCutSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 215, g = 188, b = 125;
    const n = (rand() - 0.5) * 6;
    r += n; g += n * 0.9; b += n * 0.7;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 12; g -= 10; b -= 7; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawChiseledRedSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawCutRedSandstone(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 183, g = 98, b = 38;
    const n = (rand() - 0.5) * 6;
    r += n; g += n * 0.7; b += n * 0.4;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 12; g -= 8; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Misc Blocks
// =============================================================================

function drawMagmaBlock(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawSlimeBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 100, g = 190, b = 80;
    const n = (rand() - 0.5) * 14;
    r += n * 0.5; g += n; b += n * 0.5;
    if (px < 2 || px > 13 || py < 2 || py > 13) { r -= 20; g -= 25; b -= 15; }
    setPixel(d, w, ox, oy, px, py, r, g, b, 200);
  }
}

function drawHoneyBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 230, g = 160, b = 30;
    const n = (rand() - 0.5) * 12;
    r += n * 0.5; g += n * 0.7; b += n * 0.3;
    if (px < 2 || px > 13 || py < 2 || py > 13) { r -= 15; g -= 10; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b, 220);
  }
}

function drawHoneycombBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 220, g = 150, b = 25;
    const n = (rand() - 0.5) * 12;
    r += n * 0.5; g += n * 0.6; b += n * 0.3;
    // Hexagonal pattern
    if ((px + py * 2) % 6 === 0 || (px * 2 + py) % 6 === 0) { r -= 20; g -= 15; b -= 5; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawDriedKelpBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 50, g = 65, b = 30;
    const n = (rand() - 0.5) * 14;
    r += n * 0.6; g += n; b += n * 0.5;
    if (rand() < 0.1) { r -= 10; g -= 12; b -= 6; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawCopperBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 190, g = 110, b = 70;
    const n = (rand() - 0.5) * 16;
    r += n; g += n * 0.7; b += n * 0.5;
    if ((px + py) % 5 === 0 && rand() < 0.3) { r += 20; g += 15; b += 10; }
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 15; g -= 10; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawAncientDebrisSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 95, g = 65, b = 55;
    const n = (rand() - 0.5) * 14;
    r += n; g += n * 0.7; b += n * 0.6;
    if ((px * 2 + py) % 7 === 0 && rand() < 0.3) { r += 15; g += 10; b += 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawAncientDebrisTop(d: D, w: number, ox: number, oy: number, rand: R) {
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
function drawPolishedBasaltSide(d: D, w: number, ox: number, oy: number, rand: R) {
  drawPolishedStone(d, w, ox, oy, rand, 80, 80, 85);
}

function drawPolishedBasaltTop(d: D, w: number, ox: number, oy: number, rand: R) {
  drawBasaltTop(d, w, ox, oy, rand);
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Redstone Components
// =============================================================================

function drawRedstoneDust(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawRepeaterTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawComparatorTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawPistonSide(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawPistonTop(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 170, g = 130, b = 80;
    const n = (rand() - 0.5) * 10;
    r += n; g += n * 0.8; b += n * 0.5;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 15; g -= 12; b -= 8; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawPistonBottom(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    if (px === 0 || px === 15 || py === 0 || py === 15) { r -= 12; g -= 12; b -= 12; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawObserverFront(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawObserverSide(d: D, w: number, ox: number, oy: number, rand: R) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = 128, g = 128, b = 128;
    const n = (rand() - 0.5) * 10;
    r += n; g += n; b += n;
    // Arrow pattern
    if (py >= 6 && py <= 9 && px === 7) { r -= 30; g -= 30; b -= 30; }
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

function drawNoteBlock(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawTarget(d: D, w: number, ox: number, oy: number, rand: R) {
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

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Barrel, Dispenser, Dropper
// =============================================================================

function drawBarrelTop(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawBarrelSide(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawDispenserFront(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawDropperFront(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawEndRod(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawCobweb(d: D, w: number, ox: number, oy: number, rand: R) {
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

function drawSnowBlock(d: D, w: number, ox: number, oy: number, rand: R) {
  drawSnow(d, w, ox, oy, rand);
}

// =============================================================================
// PROCEDURAL DRAW FUNCTIONS — Colored Blocks (Wool, Concrete, Terracotta, etc.)
// =============================================================================

/** 16 Minecraft dye colors as RGB tuples. */
const DYE_COLORS: [number, number, number][] = [
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
const TERRACOTTA_COLORS: [number, number, number][] = [
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
const GLAZED_COLORS: [number, number, number][] = [
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

/** Draw a solid wool texture with fluffy noise. */
function drawWool(d: D, w: number, ox: number, oy: number, rand: R,
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
function drawConcrete(d: D, w: number, ox: number, oy: number, rand: R,
  baseR: number, baseG: number, baseB: number) {
  for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
    let r = baseR, g = baseG, b = baseB;
    const n = (rand() - 0.5) * 6;
    r += n; g += n; b += n;
    setPixel(d, w, ox, oy, px, py, r, g, b);
  }
}

/** Draw a terracotta texture with earthy, slightly rough appearance. */
function drawTerracotta(d: D, w: number, ox: number, oy: number, rand: R,
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
function drawGlazedTerracotta(d: D, w: number, ox: number, oy: number, rand: R,
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
function drawStainedGlass(d: D, w: number, ox: number, oy: number, rand: R,
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
function drawConcretePowder(d: D, w: number, ox: number, oy: number, rand: R,
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
function drawCoralBlock(d: D, w: number, ox: number, oy: number, rand: R,
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

/** Coral block base RGB colors [tube, brain, bubble, fire, horn]. */
const CORAL_COLORS: [number, number, number][] = [
  [50, 90, 210],    // tube (blue)
  [200, 100, 150],  // brain (pink)
  [160, 40, 180],   // bubble (purple)
  [200, 50, 40],    // fire (red)
  [210, 200, 50],   // horn (yellow)
];

// =============================================================================
// ATLAS CREATION — Draws all textures onto the 512x512 atlas canvas
// =============================================================================

export function createExpandedTextureAtlas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(ATLAS_SIZE, ATLAS_SIZE);
  const data = imageData.data;
  const w = ATLAS_SIZE;
  data.fill(0);

  const rand = rng(42);

  // Helper to draw at a TEX slot
  const at = (idx: number, fn: DrawFn) => {
    const [ox, oy] = tileOffset(idx);
    fn(data, w, ox, oy, rand);
  };

  // Helper for stone base + ore overlay
  const ore = (idx: number, oR: number, oG: number, oB: number) => {
    const [ox, oy] = tileOffset(idx);
    drawStone(data, w, ox, oy, rand);
    drawOreClusters(data, w, ox, oy, oR, oG, oB, rand);
  };

  // --- Base terrain ---
  at(TEX.GRASS_TOP, drawGrassTop);
  at(TEX.GRASS_SIDE, drawGrassSide);
  at(TEX.DIRT, drawDirt);
  at(TEX.STONE, drawStone);
  at(TEX.SAND, drawSand);
  at(TEX.WATER, drawWater);
  at(TEX.SNOW, drawSnow);
  at(TEX.SNOW_SIDE, drawSnowSide);
  at(TEX.BEDROCK, drawBedrock);
  at(TEX.GRAVEL, drawGravel);
  at(TEX.COBBLESTONE, drawCobblestone);
  at(TEX.CLAY, drawClay);
  at(TEX.SANDSTONE_SIDE, drawSandstone);
  at(TEX.SANDSTONE_TOP, drawSandstoneTop);
  at(TEX.ICE, drawIce);
  at(TEX.PACKED_ICE, drawPackedIce);
  at(TEX.BLUE_ICE, drawBlueIce);
  at(TEX.LAVA, drawLava);
  at(TEX.RED_SAND, drawRedSand);
  at(TEX.RED_SANDSTONE_SIDE, drawRedSandstone);
  at(TEX.RED_SANDSTONE_TOP, drawRedSandstoneTop);
  at(TEX.COARSE_DIRT, drawCoarseDirt);
  at(TEX.PODZOL_TOP, drawPodzolTop);
  at(TEX.PODZOL_SIDE, drawPodzolSide);
  at(TEX.MYCELIUM_TOP, drawMyceliumTop);
  at(TEX.MYCELIUM_SIDE, drawMyceliumSide);
  at(TEX.SMOOTH_STONE, drawSmoothStone);

  // --- Stone variants ---
  at(TEX.GRANITE, drawGranite);
  at(TEX.DIORITE, drawDiorite);
  at(TEX.ANDESITE, drawAndesite);
  { const [ox, oy] = tileOffset(TEX.POLISHED_GRANITE); drawPolishedStone(data, w, ox, oy, rand, 158, 107, 80); }
  { const [ox, oy] = tileOffset(TEX.POLISHED_DIORITE); drawPolishedStone(data, w, ox, oy, rand, 195, 195, 198); }
  { const [ox, oy] = tileOffset(TEX.POLISHED_ANDESITE); drawPolishedStone(data, w, ox, oy, rand, 140, 140, 140); }

  // --- Ores ---
  ore(TEX.COAL_ORE, 30, 30, 30);
  ore(TEX.IRON_ORE, 200, 180, 150);
  ore(TEX.GOLD_ORE, 218, 165, 32);
  ore(TEX.DIAMOND_ORE, 100, 220, 235);
  ore(TEX.EMERALD_ORE, 65, 200, 85);
  ore(TEX.LAPIS_ORE, 40, 65, 180);
  ore(TEX.REDSTONE_ORE, 180, 30, 25);
  { const [ox, oy] = tileOffset(TEX.NETHER_QUARTZ_ORE);
    drawNetherrack(data, w, ox, oy, rand);
    drawOreClusters(data, w, ox, oy, 230, 220, 210, rand); }
  { const [ox, oy] = tileOffset(TEX.NETHER_GOLD_ORE);
    drawNetherrack(data, w, ox, oy, rand);
    drawOreClusters(data, w, ox, oy, 218, 165, 32, rand); }

  // --- Wood types ---
  at(TEX.OAK_LOG_TOP, drawOakLogTop);
  at(TEX.OAK_LOG_SIDE, drawOakLogSide);
  at(TEX.OAK_PLANKS, drawOakPlanks);
  at(TEX.OAK_LEAVES, drawOakLeaves);

  at(TEX.SPRUCE_LOG_SIDE, drawSpruceLogSide);
  at(TEX.SPRUCE_LOG_TOP, drawSpruceLogTop);
  at(TEX.SPRUCE_PLANKS, drawSprucePlanks);
  at(TEX.SPRUCE_LEAVES, drawSpruceLeaves);

  at(TEX.BIRCH_LOG_SIDE, drawBirchLogSide);
  at(TEX.BIRCH_LOG_TOP, drawBirchLogTop);
  at(TEX.BIRCH_PLANKS, drawBirchPlanks);
  at(TEX.BIRCH_LEAVES, drawBirchLeaves);

  at(TEX.JUNGLE_LOG_SIDE, drawJungleLogSide);
  at(TEX.JUNGLE_LOG_TOP, drawJungleLogTop);
  at(TEX.JUNGLE_PLANKS, drawJunglePlanks);
  at(TEX.JUNGLE_LEAVES, drawJungleLeaves);

  at(TEX.ACACIA_LOG_SIDE, drawAcaciaLogSide);
  at(TEX.ACACIA_LOG_TOP, drawAcaciaLogTop);
  at(TEX.ACACIA_PLANKS, drawAcaciaPlanks);
  at(TEX.ACACIA_LEAVES, drawAcaciaLeaves);

  at(TEX.DARK_OAK_LOG_SIDE, drawDarkOakLogSide);
  at(TEX.DARK_OAK_LOG_TOP, drawDarkOakLogTop);
  at(TEX.DARK_OAK_PLANKS, drawDarkOakPlanks);
  at(TEX.DARK_OAK_LEAVES, drawDarkOakLeaves);

  // --- Stone bricks ---
  at(TEX.STONE_BRICKS, drawStoneBricks);
  at(TEX.MOSSY_STONE_BRICKS, drawMossyStoneBricks);
  at(TEX.CRACKED_STONE_BRICKS, drawCrackedStoneBricks);
  at(TEX.CHISELED_STONE_BRICKS, drawChiseledStoneBricks);
  at(TEX.MOSSY_COBBLESTONE, drawMossyCobblestone);

  // --- Nether ---
  at(TEX.NETHERRACK, drawNetherrack);
  at(TEX.SOUL_SAND, drawSoulSand);
  at(TEX.SOUL_SOIL, drawSoulSoil);
  at(TEX.GLOWSTONE, drawGlowstone);
  at(TEX.NETHER_BRICKS, drawNetherBricks);
  at(TEX.RED_NETHER_BRICKS, drawRedNetherBricks);
  at(TEX.BASALT_SIDE, drawBasaltSide);
  at(TEX.BASALT_TOP, drawBasaltTop);
  at(TEX.BLACKSTONE, drawBlackstone);
  at(TEX.POLISHED_BLACKSTONE, drawPolishedBlackstone);
  at(TEX.POLISHED_BLACKSTONE_BRICKS, drawPolishedBlackstoneBricks);
  at(TEX.CRIMSON_PLANKS, drawCrimsonPlanks);
  at(TEX.WARPED_PLANKS, drawWarpedPlanks);
  at(TEX.CRIMSON_STEM_SIDE, drawCrimsonStemSide);
  at(TEX.CRIMSON_STEM_TOP, drawCrimsonStemTop);
  at(TEX.WARPED_STEM_SIDE, drawWarpedStemSide);
  at(TEX.WARPED_STEM_TOP, drawWarpedStemTop);
  at(TEX.CRIMSON_NYLIUM_TOP, drawCrimsonNyliumTop);
  at(TEX.WARPED_NYLIUM_TOP, drawWarpedNyliumTop);
  at(TEX.SHROOMLIGHT, drawShroomlight);
  at(TEX.NETHER_WART_BLOCK, drawNetherWartBlock);
  at(TEX.WARPED_WART_BLOCK, drawWarpedWartBlock);
  at(TEX.POLISHED_BASALT_SIDE, drawPolishedBasaltSide);
  at(TEX.POLISHED_BASALT_TOP, drawPolishedBasaltTop);

  // --- End ---
  at(TEX.END_STONE, drawEndStone);
  at(TEX.END_STONE_BRICKS, drawEndStoneBricks);
  at(TEX.PURPUR_BLOCK, drawPurpurBlock);
  at(TEX.PURPUR_PILLAR_SIDE, drawPurpurPillarSide);
  at(TEX.PURPUR_PILLAR_TOP, drawPurpurPillarTop);

  // --- Prismarine ---
  at(TEX.PRISMARINE, drawPrismarine);
  at(TEX.PRISMARINE_BRICKS, drawPrismarineBricks);
  at(TEX.DARK_PRISMARINE, drawDarkPrismarine);
  at(TEX.SEA_LANTERN, drawSeaLantern);

  // --- Functional blocks ---
  at(TEX.CRAFTING_TABLE_TOP, drawCraftingTableTop);
  at(TEX.CRAFTING_TABLE_SIDE, drawCraftingTableSide);
  at(TEX.FURNACE_SIDE, drawFurnaceSide);
  at(TEX.FURNACE_FRONT, drawFurnaceFront);
  at(TEX.FURNACE_TOP, drawFurnaceTop);
  at(TEX.CHEST_SIDE, drawChestSide);
  at(TEX.CHEST_FRONT, drawChestFront);
  at(TEX.CHEST_TOP, drawChestTop);
  at(TEX.ENCHANTING_TABLE_TOP, drawEnchantingTableTop);
  at(TEX.ENCHANTING_TABLE_SIDE, drawEnchantingTableSide);
  at(TEX.BOOKSHELF, drawBookshelf);
  at(TEX.JUKEBOX_TOP, drawJukeboxTop);
  at(TEX.BARREL_TOP, drawBarrelTop);
  at(TEX.BARREL_SIDE, drawBarrelSide);
  at(TEX.DISPENSER_FRONT, drawDispenserFront);
  at(TEX.DROPPER_FRONT, drawDropperFront);

  // --- Mineral blocks ---
  { const [ox, oy] = tileOffset(TEX.COAL_BLOCK); drawMineralBlock(data, w, ox, oy, rand, 30, 30, 30); }
  { const [ox, oy] = tileOffset(TEX.IRON_BLOCK); drawMineralBlock(data, w, ox, oy, rand, 210, 210, 210); }
  { const [ox, oy] = tileOffset(TEX.GOLD_BLOCK); drawMineralBlock(data, w, ox, oy, rand, 240, 195, 50); }
  { const [ox, oy] = tileOffset(TEX.DIAMOND_BLOCK); drawMineralBlock(data, w, ox, oy, rand, 100, 220, 230); }
  { const [ox, oy] = tileOffset(TEX.EMERALD_BLOCK); drawMineralBlock(data, w, ox, oy, rand, 65, 195, 80); }
  { const [ox, oy] = tileOffset(TEX.LAPIS_BLOCK); drawMineralBlock(data, w, ox, oy, rand, 35, 60, 170); }
  { const [ox, oy] = tileOffset(TEX.REDSTONE_BLOCK); drawMineralBlock(data, w, ox, oy, rand, 170, 25, 20); }
  { const [ox, oy] = tileOffset(TEX.NETHERITE_BLOCK); drawMineralBlock(data, w, ox, oy, rand, 55, 45, 45); }

  // --- Quartz ---
  at(TEX.QUARTZ_BLOCK_SIDE, drawQuartzBlockSide);
  at(TEX.QUARTZ_BLOCK_TOP, drawQuartzBlockTop);
  at(TEX.SMOOTH_QUARTZ, drawSmoothQuartz);
  at(TEX.CHISELED_QUARTZ, drawChiseledQuartz);
  at(TEX.QUARTZ_PILLAR_SIDE, drawQuartzPillarSide);

  // --- Building blocks ---
  at(TEX.BRICKS, drawBricks);
  at(TEX.TNT_SIDE, drawTntSide);
  at(TEX.TNT_TOP, drawTntTop);
  at(TEX.TNT_BOTTOM, drawTntBottom);
  at(TEX.SPONGE, drawSponge);
  at(TEX.WET_SPONGE, drawWetSponge);
  at(TEX.MELON_SIDE, drawMelonSide);
  at(TEX.MELON_TOP, drawMelonTop);
  at(TEX.CACTUS_SIDE, drawCactusSide);
  at(TEX.CACTUS_TOP, drawCactusTop);
  at(TEX.PUMPKIN_SIDE, drawPumpkinSide);
  at(TEX.PUMPKIN_TOP, drawPumpkinTop);
  at(TEX.JACK_O_LANTERN, drawJackOLantern);
  at(TEX.HAY_BALE_SIDE, drawHayBaleSide);
  at(TEX.HAY_BALE_TOP, drawHayBaleTop);
  at(TEX.BONE_BLOCK_SIDE, drawBoneBlockSide);
  at(TEX.BONE_BLOCK_TOP, drawBoneBlockTop);
  at(TEX.OBSIDIAN, drawObsidian);
  at(TEX.CRYING_OBSIDIAN, drawCryingObsidian);
  at(TEX.GLASS, drawGlass);
  at(TEX.SNOW_BLOCK, drawSnowBlock);

  // --- Sandstone variants ---
  at(TEX.SMOOTH_SANDSTONE, drawSmoothSandstone);
  at(TEX.SMOOTH_RED_SANDSTONE, drawSmoothRedSandstone);
  at(TEX.CHISELED_SANDSTONE, drawChiseledSandstone);
  at(TEX.CUT_SANDSTONE, drawCutSandstone);
  at(TEX.CHISELED_RED_SANDSTONE, drawChiseledRedSandstone);
  at(TEX.CUT_RED_SANDSTONE, drawCutRedSandstone);

  // --- Crops & Farmland ---
  at(TEX.WHEAT_STAGE_0, drawWheatStage0);
  at(TEX.WHEAT_STAGE_7, drawWheatStage7);
  at(TEX.FARMLAND_TOP, drawFarmlandTop);
  at(TEX.FARMLAND_SIDE, drawFarmlandSide);

  // --- Redstone ---
  at(TEX.REDSTONE_DUST, drawRedstoneDust);
  at(TEX.REPEATER_TOP, drawRepeaterTop);
  at(TEX.COMPARATOR_TOP, drawComparatorTop);
  at(TEX.PISTON_SIDE, drawPistonSide);
  at(TEX.PISTON_TOP, drawPistonTop);
  at(TEX.PISTON_BOTTOM, drawPistonBottom);
  at(TEX.OBSERVER_FRONT, drawObserverFront);
  at(TEX.OBSERVER_SIDE, drawObserverSide);
  at(TEX.NOTE_BLOCK, drawNoteBlock);
  at(TEX.TARGET, drawTarget);

  // --- Misc ---
  at(TEX.MAGMA_BLOCK, drawMagmaBlock);
  at(TEX.SLIME_BLOCK, drawSlimeBlock);
  at(TEX.HONEY_BLOCK, drawHoneyBlock);
  at(TEX.HONEYCOMB_BLOCK, drawHoneycombBlock);
  at(TEX.DRIED_KELP_BLOCK, drawDriedKelpBlock);
  at(TEX.COPPER_BLOCK, drawCopperBlock);
  at(TEX.ANCIENT_DEBRIS_SIDE, drawAncientDebrisSide);
  at(TEX.ANCIENT_DEBRIS_TOP, drawAncientDebrisTop);
  at(TEX.END_ROD, drawEndRod);
  at(TEX.COBWEB, drawCobweb);

  // --- Wool (16 colors) ---
  const woolTexStart = TEX.WHITE_WOOL;
  for (let i = 0; i < 16; i++) {
    const [cr, cg, cb] = DYE_COLORS[i];
    const [ox, oy] = tileOffset(woolTexStart + i);
    drawWool(data, w, ox, oy, rand, cr, cg, cb);
  }

  // --- Concrete (16 colors) ---
  const concreteTexStart = TEX.WHITE_CONCRETE;
  for (let i = 0; i < 16; i++) {
    const [cr, cg, cb] = DYE_COLORS[i];
    const [ox, oy] = tileOffset(concreteTexStart + i);
    drawConcrete(data, w, ox, oy, rand, cr, cg, cb);
  }

  // --- Terracotta (base + 16 colors) ---
  { const [ox, oy] = tileOffset(TEX.TERRACOTTA);
    drawTerracotta(data, w, ox, oy, rand, 152, 94, 67); }
  const terracottaTexStart = TEX.WHITE_TERRACOTTA;
  for (let i = 0; i < 16; i++) {
    const [cr, cg, cb] = TERRACOTTA_COLORS[i];
    const [ox, oy] = tileOffset(terracottaTexStart + i);
    drawTerracotta(data, w, ox, oy, rand, cr, cg, cb);
  }

  // --- Glazed Terracotta (16 colors) ---
  const glazedTexStart = TEX.WHITE_GLAZED;
  for (let i = 0; i < 16; i++) {
    const [cr, cg, cb] = GLAZED_COLORS[i];
    const [ox, oy] = tileOffset(glazedTexStart + i);
    drawGlazedTerracotta(data, w, ox, oy, rand, cr, cg, cb);
  }

  // --- Stained Glass (16 colors) ---
  const stainedGlassTexStart = TEX.WHITE_STAINED_GLASS;
  for (let i = 0; i < 16; i++) {
    const [cr, cg, cb] = DYE_COLORS[i];
    const [ox, oy] = tileOffset(stainedGlassTexStart + i);
    drawStainedGlass(data, w, ox, oy, rand, cr, cg, cb);
  }

  // --- Concrete Powder (16 colors) ---
  const concretePowderTexStart = TEX.WHITE_CONCRETE_POWDER;
  for (let i = 0; i < 16; i++) {
    const [cr, cg, cb] = DYE_COLORS[i];
    const [ox, oy] = tileOffset(concretePowderTexStart + i);
    drawConcretePowder(data, w, ox, oy, rand, cr, cg, cb);
  }

  // --- Coral Blocks (5 alive + 5 dead) ---
  for (let i = 0; i < 5; i++) {
    const [cr, cg, cb] = CORAL_COLORS[i];
    { const [ox, oy] = tileOffset(TEX.TUBE_CORAL_BLOCK + i);
      drawCoralBlock(data, w, ox, oy, rand, cr, cg, cb, false); }
    { const [ox, oy] = tileOffset(TEX.DEAD_TUBE_CORAL_BLOCK + i);
      drawCoralBlock(data, w, ox, oy, rand, cr, cg, cb, true); }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// =============================================================================
// BLOCK FACE TEXTURE MAPPING — Maps block IDs to atlas texture indices
// =============================================================================

/** Shorthand for blocks that use the same texture on all faces. */
function allFaces(t: number) { return { top: t, bottom: t, side: t }; }

/** top/bottom same, side different. */
function tbSide(tb: number, s: number) { return { top: tb, bottom: tb, side: s }; }

/** Log-style: top/bottom rings, side bark. */
function logFaces(topBottom: number, side: number) { return { top: topBottom, bottom: topBottom, side }; }

/**
 * Complete block face texture mapping.
 * Maps each block ID from the Block enum to { top, bottom, side } texture indices.
 */
export const BLOCK_FACE_TEXTURES: Record<number, { top: number; bottom: number; side: number }> = {
  // --- Basic Terrain ---
  [Block.Air]: allFaces(0), // never rendered
  [Block.Stone]: allFaces(TEX.STONE),
  [Block.Granite]: allFaces(TEX.GRANITE),
  [Block.Diorite]: allFaces(TEX.DIORITE),
  [Block.Andesite]: allFaces(TEX.ANDESITE),
  [Block.Grass]: { top: TEX.GRASS_TOP, bottom: TEX.DIRT, side: TEX.GRASS_SIDE },
  [Block.Dirt]: allFaces(TEX.DIRT),
  [Block.CoarseDirt]: allFaces(TEX.COARSE_DIRT),
  [Block.Podzol]: { top: TEX.PODZOL_TOP, bottom: TEX.DIRT, side: TEX.PODZOL_SIDE },
  [Block.Cobblestone]: allFaces(TEX.COBBLESTONE),

  // --- Stone Variants ---
  [Block.PolishedGranite]: allFaces(TEX.POLISHED_GRANITE),
  [Block.PolishedDiorite]: allFaces(TEX.POLISHED_DIORITE),
  [Block.PolishedAndesite]: allFaces(TEX.POLISHED_ANDESITE),
  [Block.Bedrock]: allFaces(TEX.BEDROCK),
  [Block.Sand]: allFaces(TEX.SAND),
  [Block.RedSand]: allFaces(TEX.RED_SAND),
  [Block.Gravel]: allFaces(TEX.GRAVEL),
  [Block.Clay]: allFaces(TEX.CLAY),
  [Block.Sandstone]: { top: TEX.SANDSTONE_TOP, bottom: TEX.SANDSTONE_TOP, side: TEX.SANDSTONE_SIDE },
  [Block.RedSandstone]: { top: TEX.RED_SANDSTONE_TOP, bottom: TEX.RED_SANDSTONE_TOP, side: TEX.RED_SANDSTONE_SIDE },

  // --- Ores ---
  [Block.CoalOre]: allFaces(TEX.COAL_ORE),
  [Block.IronOre]: allFaces(TEX.IRON_ORE),
  [Block.GoldOre]: allFaces(TEX.GOLD_ORE),
  [Block.DiamondOre]: allFaces(TEX.DIAMOND_ORE),
  [Block.EmeraldOre]: allFaces(TEX.EMERALD_ORE),
  [Block.LapisOre]: allFaces(TEX.LAPIS_ORE),
  [Block.RedstoneOre]: allFaces(TEX.REDSTONE_ORE),
  [Block.NetherQuartzOre]: allFaces(TEX.NETHER_QUARTZ_ORE),
  [Block.NetherGoldOre]: allFaces(TEX.NETHER_GOLD_ORE),
  [Block.AncientDebris]: { top: TEX.ANCIENT_DEBRIS_TOP, bottom: TEX.ANCIENT_DEBRIS_TOP, side: TEX.ANCIENT_DEBRIS_SIDE },

  // --- Mineral Blocks ---
  [Block.CoalBlock]: allFaces(TEX.COAL_BLOCK),
  [Block.IronBlock]: allFaces(TEX.IRON_BLOCK),
  [Block.GoldBlock]: allFaces(TEX.GOLD_BLOCK),
  [Block.DiamondBlock]: allFaces(TEX.DIAMOND_BLOCK),
  [Block.EmeraldBlock]: allFaces(TEX.EMERALD_BLOCK),
  [Block.LapisBlock]: allFaces(TEX.LAPIS_BLOCK),
  [Block.RedstoneBlock]: allFaces(TEX.REDSTONE_BLOCK),
  [Block.NetheriteBlock]: allFaces(TEX.NETHERITE_BLOCK),
  [Block.QuartzBlock]: { top: TEX.QUARTZ_BLOCK_TOP, bottom: TEX.QUARTZ_BLOCK_TOP, side: TEX.QUARTZ_BLOCK_SIDE },
  [Block.CopperBlock]: allFaces(TEX.COPPER_BLOCK),

  // --- Wood: Oak ---
  [Block.OakLog]: logFaces(TEX.OAK_LOG_TOP, TEX.OAK_LOG_SIDE),
  [Block.OakPlanks]: allFaces(TEX.OAK_PLANKS),
  [Block.OakSlab]: allFaces(TEX.OAK_PLANKS),
  [Block.OakStairs]: allFaces(TEX.OAK_PLANKS),
  [Block.OakFence]: allFaces(TEX.OAK_PLANKS),
  [Block.OakFenceGate]: allFaces(TEX.OAK_PLANKS),
  [Block.OakDoor]: allFaces(TEX.OAK_PLANKS),
  [Block.OakTrapdoor]: allFaces(TEX.OAK_PLANKS),
  [Block.OakButton]: allFaces(TEX.OAK_PLANKS),
  [Block.OakPressurePlate]: allFaces(TEX.OAK_PLANKS),

  // --- Wood: Spruce ---
  [Block.SpruceLog]: logFaces(TEX.SPRUCE_LOG_TOP, TEX.SPRUCE_LOG_SIDE),
  [Block.SprucePlanks]: allFaces(TEX.SPRUCE_PLANKS),
  [Block.SpruceSlab]: allFaces(TEX.SPRUCE_PLANKS),
  [Block.SpruceStairs]: allFaces(TEX.SPRUCE_PLANKS),
  [Block.SpruceFence]: allFaces(TEX.SPRUCE_PLANKS),
  [Block.SpruceFenceGate]: allFaces(TEX.SPRUCE_PLANKS),
  [Block.SpruceDoor]: allFaces(TEX.SPRUCE_PLANKS),
  [Block.SpruceTrapdoor]: allFaces(TEX.SPRUCE_PLANKS),
  [Block.SpruceButton]: allFaces(TEX.SPRUCE_PLANKS),
  [Block.SprucePressurePlate]: allFaces(TEX.SPRUCE_PLANKS),

  // --- Wood: Birch ---
  [Block.BirchLog]: logFaces(TEX.BIRCH_LOG_TOP, TEX.BIRCH_LOG_SIDE),
  [Block.BirchPlanks]: allFaces(TEX.BIRCH_PLANKS),
  [Block.BirchSlab]: allFaces(TEX.BIRCH_PLANKS),
  [Block.BirchStairs]: allFaces(TEX.BIRCH_PLANKS),
  [Block.BirchFence]: allFaces(TEX.BIRCH_PLANKS),
  [Block.BirchFenceGate]: allFaces(TEX.BIRCH_PLANKS),
  [Block.BirchDoor]: allFaces(TEX.BIRCH_PLANKS),
  [Block.BirchTrapdoor]: allFaces(TEX.BIRCH_PLANKS),
  [Block.BirchButton]: allFaces(TEX.BIRCH_PLANKS),
  [Block.BirchPressurePlate]: allFaces(TEX.BIRCH_PLANKS),

  // --- Wood: Jungle ---
  [Block.JungleLog]: logFaces(TEX.JUNGLE_LOG_TOP, TEX.JUNGLE_LOG_SIDE),
  [Block.JunglePlanks]: allFaces(TEX.JUNGLE_PLANKS),
  [Block.JungleSlab]: allFaces(TEX.JUNGLE_PLANKS),
  [Block.JungleStairs]: allFaces(TEX.JUNGLE_PLANKS),
  [Block.JungleFence]: allFaces(TEX.JUNGLE_PLANKS),
  [Block.JungleFenceGate]: allFaces(TEX.JUNGLE_PLANKS),
  [Block.JungleDoor]: allFaces(TEX.JUNGLE_PLANKS),
  [Block.JungleTrapdoor]: allFaces(TEX.JUNGLE_PLANKS),
  [Block.JungleButton]: allFaces(TEX.JUNGLE_PLANKS),
  [Block.JunglePressurePlate]: allFaces(TEX.JUNGLE_PLANKS),

  // --- Wood: Acacia ---
  [Block.AcaciaLog]: logFaces(TEX.ACACIA_LOG_TOP, TEX.ACACIA_LOG_SIDE),
  [Block.AcaciaPlanks]: allFaces(TEX.ACACIA_PLANKS),
  [Block.AcaciaSlab]: allFaces(TEX.ACACIA_PLANKS),
  [Block.AcaciaStairs]: allFaces(TEX.ACACIA_PLANKS),
  [Block.AcaciaFence]: allFaces(TEX.ACACIA_PLANKS),
  [Block.AcaciaFenceGate]: allFaces(TEX.ACACIA_PLANKS),
  [Block.AcaciaDoor]: allFaces(TEX.ACACIA_PLANKS),
  [Block.AcaciaTrapdoor]: allFaces(TEX.ACACIA_PLANKS),
  [Block.AcaciaButton]: allFaces(TEX.ACACIA_PLANKS),
  [Block.AcaciaPressurePlate]: allFaces(TEX.ACACIA_PLANKS),

  // --- Wood: Dark Oak ---
  [Block.DarkOakLog]: logFaces(TEX.DARK_OAK_LOG_TOP, TEX.DARK_OAK_LOG_SIDE),
  [Block.DarkOakPlanks]: allFaces(TEX.DARK_OAK_PLANKS),
  [Block.DarkOakSlab]: allFaces(TEX.DARK_OAK_PLANKS),
  [Block.DarkOakStairs]: allFaces(TEX.DARK_OAK_PLANKS),
  [Block.DarkOakFence]: allFaces(TEX.DARK_OAK_PLANKS),
  [Block.DarkOakFenceGate]: allFaces(TEX.DARK_OAK_PLANKS),
  [Block.DarkOakDoor]: allFaces(TEX.DARK_OAK_PLANKS),
  [Block.DarkOakTrapdoor]: allFaces(TEX.DARK_OAK_PLANKS),
  [Block.DarkOakButton]: allFaces(TEX.DARK_OAK_PLANKS),
  [Block.DarkOakPressurePlate]: allFaces(TEX.DARK_OAK_PLANKS),

  // --- Leaves ---
  [Block.OakLeaves]: allFaces(TEX.OAK_LEAVES),
  [Block.SpruceLeaves]: allFaces(TEX.SPRUCE_LEAVES),
  [Block.BirchLeaves]: allFaces(TEX.BIRCH_LEAVES),
  [Block.JungleLeaves]: allFaces(TEX.JUNGLE_LEAVES),
  [Block.AcaciaLeaves]: allFaces(TEX.ACACIA_LEAVES),
  [Block.DarkOakLeaves]: allFaces(TEX.DARK_OAK_LEAVES),

  // --- Liquids ---
  [Block.Water]: allFaces(TEX.WATER),
  [Block.Lava]: allFaces(TEX.LAVA),
  [Block.StillWater]: allFaces(TEX.WATER),
  [Block.StillLava]: allFaces(TEX.LAVA),

  // --- Glass ---
  [Block.Glass]: allFaces(TEX.GLASS),
  [Block.WhiteStainedGlass]: allFaces(TEX.WHITE_STAINED_GLASS),
  [Block.OrangeStainedGlass]: allFaces(TEX.ORANGE_STAINED_GLASS),
  [Block.MagentaStainedGlass]: allFaces(TEX.MAGENTA_STAINED_GLASS),
  [Block.LightBlueStainedGlass]: allFaces(TEX.LIGHT_BLUE_STAINED_GLASS),
  [Block.YellowStainedGlass]: allFaces(TEX.YELLOW_STAINED_GLASS),
  [Block.LimeStainedGlass]: allFaces(TEX.LIME_STAINED_GLASS),
  [Block.PinkStainedGlass]: allFaces(TEX.PINK_STAINED_GLASS),
  [Block.GrayStainedGlass]: allFaces(TEX.GRAY_STAINED_GLASS),
  [Block.LightGrayStainedGlass]: allFaces(TEX.LIGHT_GRAY_STAINED_GLASS),
  [Block.CyanStainedGlass]: allFaces(TEX.CYAN_STAINED_GLASS),
  [Block.PurpleStainedGlass]: allFaces(TEX.PURPLE_STAINED_GLASS),
  [Block.BlueStainedGlass]: allFaces(TEX.BLUE_STAINED_GLASS),
  [Block.BrownStainedGlass]: allFaces(TEX.BROWN_STAINED_GLASS),
  [Block.GreenStainedGlass]: allFaces(TEX.GREEN_STAINED_GLASS),
  [Block.RedStainedGlass]: allFaces(TEX.RED_STAINED_GLASS),
  [Block.BlackStainedGlass]: allFaces(TEX.BLACK_STAINED_GLASS),

  // --- Wool ---
  [Block.WhiteWool]: allFaces(TEX.WHITE_WOOL),
  [Block.OrangeWool]: allFaces(TEX.ORANGE_WOOL),
  [Block.MagentaWool]: allFaces(TEX.MAGENTA_WOOL),
  [Block.LightBlueWool]: allFaces(TEX.LIGHT_BLUE_WOOL),
  [Block.YellowWool]: allFaces(TEX.YELLOW_WOOL),
  [Block.LimeWool]: allFaces(TEX.LIME_WOOL),
  [Block.PinkWool]: allFaces(TEX.PINK_WOOL),
  [Block.GrayWool]: allFaces(TEX.GRAY_WOOL),
  [Block.LightGrayWool]: allFaces(TEX.LIGHT_GRAY_WOOL),
  [Block.CyanWool]: allFaces(TEX.CYAN_WOOL),
  [Block.PurpleWool]: allFaces(TEX.PURPLE_WOOL),
  [Block.BlueWool]: allFaces(TEX.BLUE_WOOL),
  [Block.BrownWool]: allFaces(TEX.BROWN_WOOL),
  [Block.GreenWool]: allFaces(TEX.GREEN_WOOL),
  [Block.RedWool]: allFaces(TEX.RED_WOOL),
  [Block.BlackWool]: allFaces(TEX.BLACK_WOOL),

  // --- Terracotta ---
  [Block.Terracotta]: allFaces(TEX.TERRACOTTA),
  [Block.WhiteTerracotta]: allFaces(TEX.WHITE_TERRACOTTA),
  [Block.OrangeTerracotta]: allFaces(TEX.ORANGE_TERRACOTTA),
  [Block.MagentaTerracotta]: allFaces(TEX.MAGENTA_TERRACOTTA),
  [Block.LightBlueTerracotta]: allFaces(TEX.LIGHT_BLUE_TERRACOTTA),
  [Block.YellowTerracotta]: allFaces(TEX.YELLOW_TERRACOTTA),
  [Block.LimeTerracotta]: allFaces(TEX.LIME_TERRACOTTA),
  [Block.PinkTerracotta]: allFaces(TEX.PINK_TERRACOTTA),
  [Block.GrayTerracotta]: allFaces(TEX.GRAY_TERRACOTTA),
  [Block.LightGrayTerracotta]: allFaces(TEX.LIGHT_GRAY_TERRACOTTA),
  [Block.CyanTerracotta]: allFaces(TEX.CYAN_TERRACOTTA),
  [Block.PurpleTerracotta]: allFaces(TEX.PURPLE_TERRACOTTA),
  [Block.BlueTerracotta]: allFaces(TEX.BLUE_TERRACOTTA),
  [Block.BrownTerracotta]: allFaces(TEX.BROWN_TERRACOTTA),
  [Block.GreenTerracotta]: allFaces(TEX.GREEN_TERRACOTTA),
  [Block.RedTerracotta]: allFaces(TEX.RED_TERRACOTTA),
  [Block.BlackTerracotta]: allFaces(TEX.BLACK_TERRACOTTA),

  // --- Concrete ---
  [Block.WhiteConcrete]: allFaces(TEX.WHITE_CONCRETE),
  [Block.OrangeConcrete]: allFaces(TEX.ORANGE_CONCRETE),
  [Block.MagentaConcrete]: allFaces(TEX.MAGENTA_CONCRETE),
  [Block.LightBlueConcrete]: allFaces(TEX.LIGHT_BLUE_CONCRETE),
  [Block.YellowConcrete]: allFaces(TEX.YELLOW_CONCRETE),
  [Block.LimeConcrete]: allFaces(TEX.LIME_CONCRETE),
  [Block.PinkConcrete]: allFaces(TEX.PINK_CONCRETE),
  [Block.GrayConcrete]: allFaces(TEX.GRAY_CONCRETE),
  [Block.LightGrayConcrete]: allFaces(TEX.LIGHT_GRAY_CONCRETE),
  [Block.CyanConcrete]: allFaces(TEX.CYAN_CONCRETE),
  [Block.PurpleConcrete]: allFaces(TEX.PURPLE_CONCRETE),
  [Block.BlueConcrete]: allFaces(TEX.BLUE_CONCRETE),
  [Block.BrownConcrete]: allFaces(TEX.BROWN_CONCRETE),
  [Block.GreenConcrete]: allFaces(TEX.GREEN_CONCRETE),
  [Block.RedConcrete]: allFaces(TEX.RED_CONCRETE),
  [Block.BlackConcrete]: allFaces(TEX.BLACK_CONCRETE),

  // --- Plants & Vegetation (use cross-shaped rendering — side texture only) ---
  [Block.TallGrass]: allFaces(TEX.GRASS_TOP),
  [Block.Fern]: allFaces(TEX.GRASS_TOP),
  [Block.DeadBush]: allFaces(TEX.COARSE_DIRT),
  [Block.Dandelion]: allFaces(TEX.GRASS_TOP),
  [Block.Poppy]: allFaces(TEX.GRASS_TOP),
  [Block.BlueOrchid]: allFaces(TEX.GRASS_TOP),
  [Block.Allium]: allFaces(TEX.GRASS_TOP),
  [Block.AzureBluet]: allFaces(TEX.GRASS_TOP),
  [Block.RedTulip]: allFaces(TEX.GRASS_TOP),
  [Block.OrangeTulip]: allFaces(TEX.GRASS_TOP),
  [Block.WhiteTulip]: allFaces(TEX.GRASS_TOP),
  [Block.PinkTulip]: allFaces(TEX.GRASS_TOP),
  [Block.OxeyeDaisy]: allFaces(TEX.GRASS_TOP),
  [Block.Sunflower]: allFaces(TEX.GRASS_TOP),
  [Block.Lilac]: allFaces(TEX.GRASS_TOP),
  [Block.Peony]: allFaces(TEX.GRASS_TOP),
  [Block.RoseBush]: allFaces(TEX.GRASS_TOP),
  [Block.Cactus]: { top: TEX.CACTUS_TOP, bottom: TEX.CACTUS_TOP, side: TEX.CACTUS_SIDE },
  [Block.SugarCane]: allFaces(TEX.GRASS_TOP),
  [Block.Vine]: allFaces(TEX.OAK_LEAVES),

  // --- Crops & Farmland ---
  [Block.Farmland]: { top: TEX.FARMLAND_TOP, bottom: TEX.DIRT, side: TEX.FARMLAND_SIDE },
  [Block.Wheat]: allFaces(TEX.WHEAT_STAGE_7),
  [Block.Carrots]: allFaces(TEX.WHEAT_STAGE_0),
  [Block.Potatoes]: allFaces(TEX.WHEAT_STAGE_0),
  [Block.Beetroots]: allFaces(TEX.WHEAT_STAGE_0),
  [Block.MelonBlock]: { top: TEX.MELON_TOP, bottom: TEX.MELON_TOP, side: TEX.MELON_SIDE },
  [Block.PumpkinBlock]: { top: TEX.PUMPKIN_TOP, bottom: TEX.PUMPKIN_TOP, side: TEX.PUMPKIN_SIDE },
  [Block.Cocoa]: allFaces(TEX.JUNGLE_PLANKS),
  [Block.NetherWart]: allFaces(TEX.NETHER_WART_BLOCK),
  [Block.SweetBerryBush]: allFaces(TEX.OAK_LEAVES),

  // --- Mushrooms & Fungi ---
  [Block.BrownMushroom]: allFaces(TEX.DIRT),
  [Block.RedMushroom]: allFaces(TEX.DIRT),
  [Block.BrownMushroomBlock]: allFaces(TEX.DIRT),
  [Block.RedMushroomBlock]: allFaces(TEX.REDSTONE_BLOCK),
  [Block.MushroomStem]: allFaces(TEX.SNOW),
  [Block.Mycelium]: { top: TEX.MYCELIUM_TOP, bottom: TEX.DIRT, side: TEX.MYCELIUM_SIDE },

  // --- Utility Blocks ---
  [Block.CraftingTable]: { top: TEX.CRAFTING_TABLE_TOP, bottom: TEX.OAK_PLANKS, side: TEX.CRAFTING_TABLE_SIDE },
  [Block.Furnace]: { top: TEX.FURNACE_TOP, bottom: TEX.FURNACE_TOP, side: TEX.FURNACE_FRONT },
  [Block.BlastFurnace]: { top: TEX.FURNACE_TOP, bottom: TEX.FURNACE_TOP, side: TEX.FURNACE_FRONT },
  [Block.Smoker]: { top: TEX.FURNACE_TOP, bottom: TEX.FURNACE_TOP, side: TEX.FURNACE_FRONT },
  [Block.Anvil]: allFaces(TEX.IRON_BLOCK),
  [Block.ChippedAnvil]: allFaces(TEX.IRON_BLOCK),
  [Block.DamagedAnvil]: allFaces(TEX.IRON_BLOCK),
  [Block.EnchantingTable]: { top: TEX.ENCHANTING_TABLE_TOP, bottom: TEX.OBSIDIAN, side: TEX.ENCHANTING_TABLE_SIDE },
  [Block.BrewingStand]: allFaces(TEX.STONE),
  [Block.Cauldron]: allFaces(TEX.IRON_BLOCK),
  [Block.Grindstone]: allFaces(TEX.STONE),
  [Block.Stonecutter]: allFaces(TEX.SMOOTH_STONE),
  [Block.Loom]: allFaces(TEX.OAK_PLANKS),
  [Block.CartographyTable]: { top: TEX.DARK_OAK_PLANKS, bottom: TEX.DARK_OAK_PLANKS, side: TEX.OAK_PLANKS },
  [Block.FletchingTable]: { top: TEX.BIRCH_PLANKS, bottom: TEX.BIRCH_PLANKS, side: TEX.OAK_PLANKS },
  [Block.SmithingTable]: { top: TEX.IRON_BLOCK, bottom: TEX.DARK_OAK_PLANKS, side: TEX.DARK_OAK_PLANKS },
  [Block.Composter]: allFaces(TEX.SPRUCE_PLANKS),
  [Block.Barrel]: { top: TEX.BARREL_TOP, bottom: TEX.BARREL_TOP, side: TEX.BARREL_SIDE },

  // --- Storage & Containers ---
  [Block.Chest]: { top: TEX.CHEST_TOP, bottom: TEX.CHEST_TOP, side: TEX.CHEST_FRONT },
  [Block.TrappedChest]: { top: TEX.CHEST_TOP, bottom: TEX.CHEST_TOP, side: TEX.CHEST_FRONT },
  [Block.EnderChest]: { top: TEX.OBSIDIAN, bottom: TEX.OBSIDIAN, side: TEX.OBSIDIAN },
  [Block.ShulkerBox]: allFaces(TEX.PURPUR_BLOCK),
  [Block.Hopper]: allFaces(TEX.IRON_BLOCK),
  [Block.Dispenser]: { top: TEX.FURNACE_TOP, bottom: TEX.FURNACE_TOP, side: TEX.DISPENSER_FRONT },
  [Block.Dropper]: { top: TEX.FURNACE_TOP, bottom: TEX.FURNACE_TOP, side: TEX.DROPPER_FRONT },
  [Block.Jukebox]: { top: TEX.JUKEBOX_TOP, bottom: TEX.OAK_PLANKS, side: TEX.NOTE_BLOCK },

  // --- Redstone ---
  [Block.RedstoneDust]: allFaces(TEX.REDSTONE_DUST),
  [Block.RedstoneTorch]: allFaces(TEX.REDSTONE_BLOCK),
  [Block.RedstoneRepeater]: { top: TEX.REPEATER_TOP, bottom: TEX.SMOOTH_STONE, side: TEX.SMOOTH_STONE },
  [Block.RedstoneComparator]: { top: TEX.COMPARATOR_TOP, bottom: TEX.SMOOTH_STONE, side: TEX.SMOOTH_STONE },
  [Block.Lever]: allFaces(TEX.COBBLESTONE),
  [Block.StoneButton]: allFaces(TEX.STONE),
  [Block.StonePressurePlate]: allFaces(TEX.STONE),
  [Block.WeightedPressurePlateLight]: allFaces(TEX.GOLD_BLOCK),
  [Block.WeightedPressurePlateHeavy]: allFaces(TEX.IRON_BLOCK),
  [Block.TripwireHook]: allFaces(TEX.OAK_PLANKS),
  [Block.DaylightDetector]: { top: TEX.GLASS, bottom: TEX.OAK_PLANKS, side: TEX.OAK_PLANKS },
  [Block.Observer]: { top: TEX.OBSERVER_SIDE, bottom: TEX.OBSERVER_SIDE, side: TEX.OBSERVER_FRONT },
  [Block.Piston]: { top: TEX.PISTON_TOP, bottom: TEX.PISTON_BOTTOM, side: TEX.PISTON_SIDE },
  [Block.StickyPiston]: { top: TEX.PISTON_TOP, bottom: TEX.PISTON_BOTTOM, side: TEX.PISTON_SIDE },
  [Block.TNT]: { top: TEX.TNT_TOP, bottom: TEX.TNT_BOTTOM, side: TEX.TNT_SIDE },
  [Block.NoteBlock]: allFaces(TEX.NOTE_BLOCK),
  [Block.Target]: allFaces(TEX.TARGET),
  [Block.RedstoneBlock_]: allFaces(TEX.REDSTONE_BLOCK),

  // --- Lighting ---
  [Block.Torch]: allFaces(TEX.OAK_PLANKS),
  [Block.RedstoneTorch_Wall]: allFaces(TEX.REDSTONE_BLOCK),
  [Block.Lantern]: allFaces(TEX.IRON_BLOCK),
  [Block.SoulLantern]: allFaces(TEX.IRON_BLOCK),

  // --- Rails ---
  [Block.Rail]: allFaces(TEX.IRON_BLOCK),
  [Block.PoweredRail]: allFaces(TEX.GOLD_BLOCK),
  [Block.DetectorRail]: allFaces(TEX.IRON_BLOCK),
  [Block.ActivatorRail]: allFaces(TEX.IRON_BLOCK),

  // --- Stone Bricks ---
  [Block.StoneBricks]: allFaces(TEX.STONE_BRICKS),
  [Block.MossyStoneBricks]: allFaces(TEX.MOSSY_STONE_BRICKS),
  [Block.CrackedStoneBricks]: allFaces(TEX.CRACKED_STONE_BRICKS),
  [Block.ChiseledStoneBricks]: allFaces(TEX.CHISELED_STONE_BRICKS),
  [Block.StoneBrickSlab]: allFaces(TEX.STONE_BRICKS),
  [Block.StoneBrickStairs]: allFaces(TEX.STONE_BRICKS),
  [Block.StoneBrickWall]: allFaces(TEX.STONE_BRICKS),
  [Block.MossyCobblestone]: allFaces(TEX.MOSSY_COBBLESTONE),

  // --- Nether Blocks ---
  [Block.Netherrack]: allFaces(TEX.NETHERRACK),
  [Block.SoulSand]: allFaces(TEX.SOUL_SAND),
  [Block.SoulSoil]: allFaces(TEX.SOUL_SOIL),
  [Block.Glowstone]: allFaces(TEX.GLOWSTONE),
  [Block.NetherBricks]: allFaces(TEX.NETHER_BRICKS),
  [Block.NetherBrickFence]: allFaces(TEX.NETHER_BRICKS),
  [Block.NetherBrickStairs]: allFaces(TEX.NETHER_BRICKS),
  [Block.NetherBrickSlab]: allFaces(TEX.NETHER_BRICKS),
  [Block.RedNetherBricks]: allFaces(TEX.RED_NETHER_BRICKS),
  [Block.Basalt]: { top: TEX.BASALT_TOP, bottom: TEX.BASALT_TOP, side: TEX.BASALT_SIDE },
  [Block.PolishedBasalt]: { top: TEX.POLISHED_BASALT_TOP, bottom: TEX.POLISHED_BASALT_TOP, side: TEX.POLISHED_BASALT_SIDE },
  [Block.Blackstone]: allFaces(TEX.BLACKSTONE),
  [Block.PolishedBlackstone]: allFaces(TEX.POLISHED_BLACKSTONE),
  [Block.PolishedBlackstoneBricks]: allFaces(TEX.POLISHED_BLACKSTONE_BRICKS),
  [Block.CrimsonPlanks]: allFaces(TEX.CRIMSON_PLANKS),
  [Block.WarpedPlanks]: allFaces(TEX.WARPED_PLANKS),
  [Block.CrimsonStem]: logFaces(TEX.CRIMSON_STEM_TOP, TEX.CRIMSON_STEM_SIDE),
  [Block.WarpedStem]: logFaces(TEX.WARPED_STEM_TOP, TEX.WARPED_STEM_SIDE),

  // --- End Blocks ---
  [Block.EndStone]: allFaces(TEX.END_STONE),
  [Block.EndStoneBricks]: allFaces(TEX.END_STONE_BRICKS),
  [Block.PurpurBlock]: allFaces(TEX.PURPUR_BLOCK),
  [Block.PurpurPillar]: { top: TEX.PURPUR_PILLAR_TOP, bottom: TEX.PURPUR_PILLAR_TOP, side: TEX.PURPUR_PILLAR_SIDE },
  [Block.PurpurStairs]: allFaces(TEX.PURPUR_BLOCK),
  [Block.PurpurSlab]: allFaces(TEX.PURPUR_BLOCK),

  // --- Prismarine ---
  [Block.Prismarine]: allFaces(TEX.PRISMARINE),
  [Block.PrismarineBricks]: allFaces(TEX.PRISMARINE_BRICKS),
  [Block.DarkPrismarine]: allFaces(TEX.DARK_PRISMARINE),
  [Block.SeaLantern]: allFaces(TEX.SEA_LANTERN),

  // --- Ice Variants ---
  [Block.Ice]: allFaces(TEX.ICE),
  [Block.PackedIce]: allFaces(TEX.PACKED_ICE),
  [Block.BlueIce]: allFaces(TEX.BLUE_ICE),
  [Block.Snow]: allFaces(TEX.SNOW),

  // --- Snow & Ice Terrain ---
  [Block.SnowBlock]: allFaces(TEX.SNOW_BLOCK),
  [Block.SnowLayer]: allFaces(TEX.SNOW),
  [Block.FrostedIce]: allFaces(TEX.ICE),
  [Block.PowderSnow]: allFaces(TEX.SNOW),

  // --- Decoration ---
  [Block.Cobweb]: allFaces(TEX.COBWEB),
  [Block.Bookshelf]: { top: TEX.OAK_PLANKS, bottom: TEX.OAK_PLANKS, side: TEX.BOOKSHELF },
  [Block.Ladder]: allFaces(TEX.OAK_PLANKS),
  [Block.IronBars]: allFaces(TEX.IRON_BLOCK),
  [Block.GlassPane]: allFaces(TEX.GLASS),
  [Block.Sign]: allFaces(TEX.OAK_PLANKS),
  [Block.WallSign]: allFaces(TEX.OAK_PLANKS),
  [Block.ItemFrame]: allFaces(TEX.OAK_PLANKS),
  [Block.Painting]: allFaces(TEX.OAK_PLANKS),
  [Block.ArmorStand]: allFaces(TEX.STONE),
  [Block.FlowerPot]: allFaces(TEX.BRICKS),
  [Block.Cake]: allFaces(TEX.SNOW),
  [Block.Bed]: allFaces(TEX.RED_WOOL),
  [Block.Carpet]: allFaces(TEX.WHITE_WOOL),
  [Block.Banner]: allFaces(TEX.WHITE_WOOL),
  [Block.MobHead]: allFaces(TEX.STONE),
  [Block.EndRod]: allFaces(TEX.END_ROD),
  [Block.ChorusPlant]: allFaces(TEX.PURPUR_BLOCK),
  [Block.ChorusFlower]: allFaces(TEX.PURPUR_BLOCK),
  [Block.DragonEgg]: allFaces(TEX.OBSIDIAN),
  [Block.Beacon]: allFaces(TEX.GLASS),
  [Block.Conduit]: allFaces(TEX.PRISMARINE),

  // --- Slabs ---
  [Block.StoneSlab]: allFaces(TEX.SMOOTH_STONE),
  [Block.SandstoneSlab]: allFaces(TEX.SANDSTONE_SIDE),
  [Block.CobblestoneSlab]: allFaces(TEX.COBBLESTONE),
  [Block.BrickSlab]: allFaces(TEX.BRICKS),
  [Block.QuartzSlab]: allFaces(TEX.QUARTZ_BLOCK_SIDE),
  [Block.NetherBrickSlab_]: allFaces(TEX.NETHER_BRICKS),
  [Block.RedSandstoneSlab]: allFaces(TEX.RED_SANDSTONE_SIDE),
  [Block.PrismarineSlab]: allFaces(TEX.PRISMARINE),
  [Block.PrismarineBrickSlab]: allFaces(TEX.PRISMARINE_BRICKS),
  [Block.DarkPrismarineSlab]: allFaces(TEX.DARK_PRISMARINE),

  // --- Stairs ---
  [Block.StoneStairs]: allFaces(TEX.STONE),
  [Block.SandstoneStairs]: allFaces(TEX.SANDSTONE_SIDE),
  [Block.CobblestoneStairs]: allFaces(TEX.COBBLESTONE),
  [Block.BrickStairs]: allFaces(TEX.BRICKS),
  [Block.QuartzStairs]: allFaces(TEX.QUARTZ_BLOCK_SIDE),
  [Block.RedSandstoneStairs]: allFaces(TEX.RED_SANDSTONE_SIDE),
  [Block.PrismarineStairs]: allFaces(TEX.PRISMARINE),
  [Block.PrismarineBrickStairs]: allFaces(TEX.PRISMARINE_BRICKS),

  // --- Walls ---
  [Block.CobblestoneWall]: allFaces(TEX.COBBLESTONE),
  [Block.MossyCobblestoneWall]: allFaces(TEX.MOSSY_COBBLESTONE),
  [Block.StoneBrickWall_]: allFaces(TEX.STONE_BRICKS),
  [Block.BrickWall]: allFaces(TEX.BRICKS),
  [Block.NetherBrickWall]: allFaces(TEX.NETHER_BRICKS),
  [Block.SandstoneWall]: allFaces(TEX.SANDSTONE_SIDE),
  [Block.RedSandstoneWall]: allFaces(TEX.RED_SANDSTONE_SIDE),

  // --- Building Blocks ---
  [Block.Bricks]: allFaces(TEX.BRICKS),
  [Block.SmoothStone]: allFaces(TEX.SMOOTH_STONE),
  [Block.SmoothSandstone]: allFaces(TEX.SMOOTH_SANDSTONE),
  [Block.SmoothRedSandstone]: allFaces(TEX.SMOOTH_RED_SANDSTONE),
  [Block.SmoothQuartz]: allFaces(TEX.SMOOTH_QUARTZ),
  [Block.ChiseledSandstone]: allFaces(TEX.CHISELED_SANDSTONE),
  [Block.CutSandstone]: allFaces(TEX.CUT_SANDSTONE),
  [Block.ChiseledRedSandstone]: allFaces(TEX.CHISELED_RED_SANDSTONE),
  [Block.CutRedSandstone]: allFaces(TEX.CUT_RED_SANDSTONE),
  [Block.ChiseledQuartz]: allFaces(TEX.CHISELED_QUARTZ),
  [Block.QuartzPillar]: { top: TEX.QUARTZ_BLOCK_TOP, bottom: TEX.QUARTZ_BLOCK_TOP, side: TEX.QUARTZ_PILLAR_SIDE },
  [Block.HayBale]: { top: TEX.HAY_BALE_TOP, bottom: TEX.HAY_BALE_TOP, side: TEX.HAY_BALE_SIDE },
  [Block.BoneBlock]: { top: TEX.BONE_BLOCK_TOP, bottom: TEX.BONE_BLOCK_TOP, side: TEX.BONE_BLOCK_SIDE },
  [Block.Obsidian]: allFaces(TEX.OBSIDIAN),
  [Block.CryingObsidian]: allFaces(TEX.CRYING_OBSIDIAN),

  // --- Glazed Terracotta ---
  [Block.WhiteGlazedTerracotta]: allFaces(TEX.WHITE_GLAZED),
  [Block.OrangeGlazedTerracotta]: allFaces(TEX.ORANGE_GLAZED),
  [Block.MagentaGlazedTerracotta]: allFaces(TEX.MAGENTA_GLAZED),
  [Block.LightBlueGlazedTerracotta]: allFaces(TEX.LIGHT_BLUE_GLAZED),
  [Block.YellowGlazedTerracotta]: allFaces(TEX.YELLOW_GLAZED),
  [Block.LimeGlazedTerracotta]: allFaces(TEX.LIME_GLAZED),
  [Block.PinkGlazedTerracotta]: allFaces(TEX.PINK_GLAZED),
  [Block.GrayGlazedTerracotta]: allFaces(TEX.GRAY_GLAZED),
  [Block.LightGrayGlazedTerracotta]: allFaces(TEX.LIGHT_GRAY_GLAZED),
  [Block.CyanGlazedTerracotta]: allFaces(TEX.CYAN_GLAZED),
  [Block.PurpleGlazedTerracotta]: allFaces(TEX.PURPLE_GLAZED),
  [Block.BlueGlazedTerracotta]: allFaces(TEX.BLUE_GLAZED),
  [Block.BrownGlazedTerracotta]: allFaces(TEX.BROWN_GLAZED),
  [Block.GreenGlazedTerracotta]: allFaces(TEX.GREEN_GLAZED),
  [Block.RedGlazedTerracotta]: allFaces(TEX.RED_GLAZED),
  [Block.BlackGlazedTerracotta]: allFaces(TEX.BLACK_GLAZED),

  // --- Concrete Powder ---
  [Block.WhiteConcretePowder]: allFaces(TEX.WHITE_CONCRETE_POWDER),
  [Block.OrangeConcretePowder]: allFaces(TEX.ORANGE_CONCRETE_POWDER),
  [Block.MagentaConcretePowder]: allFaces(TEX.MAGENTA_CONCRETE_POWDER),
  [Block.LightBlueConcretePowder]: allFaces(TEX.LIGHT_BLUE_CONCRETE_POWDER),
  [Block.YellowConcretePowder]: allFaces(TEX.YELLOW_CONCRETE_POWDER),
  [Block.LimeConcretePowder]: allFaces(TEX.LIME_CONCRETE_POWDER),
  [Block.PinkConcretePowder]: allFaces(TEX.PINK_CONCRETE_POWDER),
  [Block.GrayConcretePowder]: allFaces(TEX.GRAY_CONCRETE_POWDER),
  [Block.LightGrayConcretePowder]: allFaces(TEX.LIGHT_GRAY_CONCRETE_POWDER),
  [Block.CyanConcretePowder]: allFaces(TEX.CYAN_CONCRETE_POWDER),
  [Block.PurpleConcretePowder]: allFaces(TEX.PURPLE_CONCRETE_POWDER),
  [Block.BlueConcretePowder]: allFaces(TEX.BLUE_CONCRETE_POWDER),
  [Block.BrownConcretePowder]: allFaces(TEX.BROWN_CONCRETE_POWDER),
  [Block.GreenConcretePowder]: allFaces(TEX.GREEN_CONCRETE_POWDER),
  [Block.RedConcretePowder]: allFaces(TEX.RED_CONCRETE_POWDER),
  [Block.BlackConcretePowder]: allFaces(TEX.BLACK_CONCRETE_POWDER),

  // --- Portal & Structure ---
  [Block.NetherPortal]: allFaces(TEX.OBSIDIAN),
  [Block.EndPortalFrame]: { top: TEX.END_STONE, bottom: TEX.END_STONE, side: TEX.END_STONE_BRICKS },
  [Block.EndPortal]: allFaces(TEX.OBSIDIAN),
  [Block.EndGateway]: allFaces(TEX.OBSIDIAN),
  [Block.Spawner]: allFaces(TEX.IRON_BLOCK),
  [Block.CommandBlock]: allFaces(TEX.COPPER_BLOCK),
  [Block.StructureBlock]: allFaces(TEX.IRON_BLOCK),
  [Block.Barrier]: allFaces(TEX.GLASS),

  // --- Coral Blocks ---
  [Block.TubeCoralBlock]: allFaces(TEX.TUBE_CORAL_BLOCK),
  [Block.BrainCoralBlock]: allFaces(TEX.BRAIN_CORAL_BLOCK),
  [Block.BubbleCoralBlock]: allFaces(TEX.BUBBLE_CORAL_BLOCK),
  [Block.FireCoralBlock]: allFaces(TEX.FIRE_CORAL_BLOCK),
  [Block.HornCoralBlock]: allFaces(TEX.HORN_CORAL_BLOCK),
  [Block.DeadTubeCoralBlock]: allFaces(TEX.DEAD_TUBE_CORAL_BLOCK),
  [Block.DeadBrainCoralBlock]: allFaces(TEX.DEAD_BRAIN_CORAL_BLOCK),
  [Block.DeadBubbleCoralBlock]: allFaces(TEX.DEAD_BUBBLE_CORAL_BLOCK),
  [Block.DeadFireCoralBlock]: allFaces(TEX.DEAD_FIRE_CORAL_BLOCK),
  [Block.DeadHornCoralBlock]: allFaces(TEX.DEAD_HORN_CORAL_BLOCK),

  // --- Coral Fans & Plants (non-full blocks — use coral block textures) ---
  [Block.TubeCoral]: allFaces(TEX.TUBE_CORAL_BLOCK),
  [Block.BrainCoral]: allFaces(TEX.BRAIN_CORAL_BLOCK),
  [Block.BubbleCoral]: allFaces(TEX.BUBBLE_CORAL_BLOCK),
  [Block.FireCoral]: allFaces(TEX.FIRE_CORAL_BLOCK),
  [Block.HornCoral]: allFaces(TEX.HORN_CORAL_BLOCK),
  [Block.Kelp]: allFaces(TEX.DRIED_KELP_BLOCK),
  [Block.SeaGrass]: allFaces(TEX.GRASS_TOP),
  [Block.TallSeaGrass]: allFaces(TEX.GRASS_TOP),
  [Block.SeaPickle]: allFaces(TEX.GRASS_TOP),
  [Block.DriedKelpBlock]: allFaces(TEX.DRIED_KELP_BLOCK),

  // --- Miscellaneous ---
  [Block.Sponge]: allFaces(TEX.SPONGE),
  [Block.WetSponge]: allFaces(TEX.WET_SPONGE),
  [Block.SlimeBlock]: allFaces(TEX.SLIME_BLOCK),
  [Block.HoneyBlock]: allFaces(TEX.HONEY_BLOCK),
  [Block.HoneycombBlock]: allFaces(TEX.HONEYCOMB_BLOCK),
  [Block.BeeNest]: { top: TEX.HAY_BALE_TOP, bottom: TEX.HAY_BALE_TOP, side: TEX.HAY_BALE_SIDE },
  [Block.Beehive]: { top: TEX.OAK_PLANKS, bottom: TEX.OAK_PLANKS, side: TEX.BARREL_SIDE },
  [Block.TurtleEgg]: allFaces(TEX.SAND),
  [Block.Scaffolding]: allFaces(TEX.OAK_PLANKS),
  [Block.Bell]: allFaces(TEX.GOLD_BLOCK),
  [Block.Campfire]: allFaces(TEX.OAK_LOG_SIDE),
  [Block.SoulCampfire]: allFaces(TEX.SPRUCE_LOG_SIDE),
  [Block.Lodestone]: allFaces(TEX.CHISELED_STONE_BRICKS),
  [Block.RespawnAnchor]: allFaces(TEX.CRYING_OBSIDIAN),
  [Block.ShroomLight]: allFaces(TEX.SHROOMLIGHT),
  [Block.WarpedWartBlock]: allFaces(TEX.WARPED_WART_BLOCK),
  [Block.NetherWartBlock]: allFaces(TEX.NETHER_WART_BLOCK),
  [Block.CrimsonNylium]: { top: TEX.CRIMSON_NYLIUM_TOP, bottom: TEX.NETHERRACK, side: TEX.NETHERRACK },
  [Block.WarpedNylium]: { top: TEX.WARPED_NYLIUM_TOP, bottom: TEX.NETHERRACK, side: TEX.NETHERRACK },
  [Block.LilyPad]: allFaces(TEX.GRASS_TOP),
  [Block.MagmaBlock]: allFaces(TEX.MAGMA_BLOCK),
};

// =============================================================================
// BLOCK TRANSPARENCY & LIQUID SETS
// =============================================================================

/** Blocks that light passes through / are not fully opaque. */
export const BLOCK_TRANSPARENT = new Set<number>([
  Block.Air,
  Block.Water, Block.StillWater,
  Block.Lava, Block.StillLava,
  Block.Glass,
  Block.WhiteStainedGlass, Block.OrangeStainedGlass, Block.MagentaStainedGlass,
  Block.LightBlueStainedGlass, Block.YellowStainedGlass, Block.LimeStainedGlass,
  Block.PinkStainedGlass, Block.GrayStainedGlass, Block.LightGrayStainedGlass,
  Block.CyanStainedGlass, Block.PurpleStainedGlass, Block.BlueStainedGlass,
  Block.BrownStainedGlass, Block.GreenStainedGlass, Block.RedStainedGlass,
  Block.BlackStainedGlass,
  Block.GlassPane, Block.IronBars,
  Block.Ice, Block.FrostedIce,
  Block.SlimeBlock, Block.HoneyBlock,
  Block.OakLeaves, Block.SpruceLeaves, Block.BirchLeaves,
  Block.JungleLeaves, Block.AcaciaLeaves, Block.DarkOakLeaves,
  Block.TallGrass, Block.Fern, Block.DeadBush,
  Block.Dandelion, Block.Poppy, Block.BlueOrchid, Block.Allium,
  Block.AzureBluet, Block.RedTulip, Block.OrangeTulip, Block.WhiteTulip,
  Block.PinkTulip, Block.OxeyeDaisy, Block.Sunflower, Block.Lilac,
  Block.Peony, Block.RoseBush,
  Block.SugarCane, Block.Vine,
  Block.Wheat, Block.Carrots, Block.Potatoes, Block.Beetroots,
  Block.SweetBerryBush, Block.NetherWart,
  Block.BrownMushroom, Block.RedMushroom,
  Block.Cobweb,
  Block.Ladder, Block.Sign, Block.WallSign,
  Block.Torch, Block.RedstoneTorch, Block.RedstoneTorch_Wall,
  Block.Lantern, Block.SoulLantern,
  Block.Rail, Block.PoweredRail, Block.DetectorRail, Block.ActivatorRail,
  Block.RedstoneDust,
  Block.TripwireHook,
  Block.SnowLayer,
  Block.EndRod,
  Block.Scaffolding,
  Block.TubeCoral, Block.BrainCoral, Block.BubbleCoral, Block.FireCoral, Block.HornCoral,
  Block.Kelp, Block.SeaGrass, Block.TallSeaGrass, Block.SeaPickle,
  Block.LilyPad,
  Block.Barrier,
  Block.Campfire, Block.SoulCampfire,
  Block.Beacon,
  Block.EndPortal, Block.NetherPortal,
]);

/** Blocks that are liquid — special rendering and physics. */
export const BLOCK_LIQUID = new Set<number>([
  Block.Water,
  Block.StillWater,
  Block.Lava,
  Block.StillLava,
]);
