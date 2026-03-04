// =============================================================================
// Texture Pack System — Runtime texture atlas swapping
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================
// Provides a texture pack swapping system that allows overriding specific
// block textures and palette colors. Ships with built-in packs: default,
// classic (saturated), smooth (less grain), high contrast (accessibility),
// plastic (flat/toy), and natural (detailed/organic).
// =============================================================================

import { Block } from '@/types/minecraft-switch';
import { TEX } from '../texture-registry';

// =============================================================================
// Types
// =============================================================================

/**
 * Function signature for drawing a block texture onto a canvas context.
 * @param ctx - Canvas 2D rendering context
 * @param x - X offset on the atlas
 * @param y - Y offset on the atlas
 * @param size - Tile size in pixels (typically 16)
 */
export type TextureDrawFn = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => void;

/**
 * A single texture override for a specific atlas slot.
 */
export interface TextureOverride {
  texIndex: number;
  drawFunction: TextureDrawFn;
}

/**
 * A complete texture pack definition.
 */
export interface TexturePack {
  /** Unique pack identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Short description. */
  description: string;
  /** Author name. */
  author: string;
  /** Representative color for the pack thumbnail. */
  thumbnailColor: string;
  /**
   * Map of texture indices to custom texture draw functions.
   * Only listed textures are overridden; all others use the default atlas.
   */
  textureOverrides: Map<number, TextureOverride>;
  /**
   * Map of palette color names to hex color values.
   * Override specific palette colors used during atlas generation.
   */
  colorOverrides: Record<string, string>;
  /** Whether this pack is currently active. */
  isActive: boolean;
}

/**
 * Listener invoked when the active texture pack changes.
 */
export type TexturePackChangeListener = (pack: TexturePack | null) => void;

// =============================================================================
// Pixel Drawing Helpers
// =============================================================================

function fillSolid(
  ctx: CanvasRenderingContext2D, x: number, y: number, size: number,
  r: number, g: number, b: number, a = 1,
) {
  ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
  ctx.fillRect(x, y, size, size);
}

function setPixelCtx(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  r: number, g: number, b: number, a = 1,
) {
  ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
  ctx.fillRect(x, y, 1, 1);
}

/** Simple seeded PRNG for deterministic texture generation (mulberry32). */
function seededRng(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// =============================================================================
// Atlas Constants
// =============================================================================

const ATLAS_COLS = 32;
const TILE = 16;

// =============================================================================
// Built-in Pack: Default — no overrides
// =============================================================================

function createDefaultPack(): TexturePack {
  return {
    id: 'default',
    name: 'Default',
    description: 'Standard Minecraft textures with the classic look.',
    author: 'Mojang',
    thumbnailColor: '#5B8731',
    textureOverrides: new Map(),
    colorOverrides: {},
    isActive: false,
  };
}

// =============================================================================
// Built-in Pack: Classic — more saturated colors
// =============================================================================

function createClassicPack(): TexturePack {
  return {
    id: 'classic',
    name: 'Classic',
    description: 'Saturated colors reminiscent of early Minecraft versions.',
    author: 'Mojang',
    thumbnailColor: '#4A7A25',
    textureOverrides: new Map(),
    colorOverrides: {
      grass_top: '#4CAF50',
      grass_side_overlay: '#4CAF50',
      leaves_oak: '#3B9E42',
      leaves_birch: '#5EAF2B',
      leaves_spruce: '#2E7D32',
      water: '#2962FF',
      sky_day_top: '#5C9AFF',
      sky_day_bottom: '#B4D4FF',
      dirt: '#8B6914',
      stone: '#7A7A7A',
      sand: '#E8D68A',
      oak_planks: '#B8945F',
      cobblestone: '#6B6B6B',
    },
    isActive: false,
  };
}

// =============================================================================
// Built-in Pack: Smooth — reduced noise/grain
// =============================================================================

function createSmoothPack(): TexturePack {
  const overrides = new Map<number, TextureOverride>();

  overrides.set(TEX.STONE, {
    texIndex: TEX.STONE,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(3001);
      ctx.fillStyle = '#828282';
      ctx.fillRect(x, y, size, size);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const v = rand() * 8 - 4;
          const c = Math.round(130 + v);
          ctx.fillStyle = `rgb(${c},${c},${c})`;
          ctx.fillRect(x + px, y + py, 1, 1);
        }
      }
    },
  });

  overrides.set(TEX.DIRT, {
    texIndex: TEX.DIRT,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(3002);
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(x, y, size, size);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const v = rand() * 6 - 3;
          const r = Math.round(139 + v);
          const g = Math.round(105 + v * 0.8);
          const b = Math.round(20 + v * 0.3);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x + px, y + py, 1, 1);
        }
      }
    },
  });

  overrides.set(TEX.SAND, {
    texIndex: TEX.SAND,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(3003);
      ctx.fillStyle = '#E8D68A';
      ctx.fillRect(x, y, size, size);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const v = rand() * 4 - 2;
          const r = Math.round(232 + v);
          const g = Math.round(214 + v);
          const b = Math.round(138 + v * 0.5);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x + px, y + py, 1, 1);
        }
      }
    },
  });

  return {
    id: 'smooth',
    name: 'Smooth',
    description: 'Cleaner textures with less visual noise for a polished look.',
    author: 'Community',
    thumbnailColor: '#6B9E3A',
    textureOverrides: overrides,
    colorOverrides: {},
    isActive: false,
  };
}

// =============================================================================
// Built-in Pack: High Contrast — accessibility
// =============================================================================

function createHighContrastPack(): TexturePack {
  return {
    id: 'high_contrast',
    name: 'High Contrast',
    description: 'Higher contrast colors for improved visibility and accessibility.',
    author: 'Community',
    thumbnailColor: '#00FF00',
    textureOverrides: new Map(),
    colorOverrides: {
      grass_top: '#00CC00',
      grass_side_overlay: '#00CC00',
      leaves_oak: '#00AA00',
      leaves_birch: '#55CC00',
      leaves_spruce: '#007700',
      water: '#0044FF',
      lava: '#FF4400',
      dirt: '#AA7700',
      stone: '#666666',
      sand: '#FFDD66',
      coal_ore_vein: '#111111',
      iron_ore_vein: '#FFCC99',
      gold_ore_vein: '#FFFF00',
      diamond_ore_vein: '#00FFFF',
      emerald_ore_vein: '#00FF44',
      redstone_ore_vein: '#FF0000',
      lapis_ore_vein: '#0000FF',
      cobblestone: '#555555',
      oak_planks: '#CC9955',
      bedrock: '#222222',
    },
    isActive: false,
  };
}

// =============================================================================
// Built-in Pack: Plastic — flat/toy-like
// =============================================================================

function createPlasticPack(): TexturePack {
  const overrides = new Map<number, TextureOverride>();

  overrides.set(TEX.GRASS_TOP, {
    texIndex: TEX.GRASS_TOP,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(1001);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const r = 80 + (rand() - 0.5) * 6;
          const g = 170 + (rand() - 0.5) * 6;
          const b = 55 + (rand() - 0.5) * 4;
          const sheen = ((px + py) % 8 === 0) ? 15 : 0;
          setPixelCtx(ctx, x + px, y + py, r + sheen, g + sheen, b + sheen);
        }
      }
    },
  });

  overrides.set(TEX.GRASS_SIDE, {
    texIndex: TEX.GRASS_SIDE,
    drawFunction: (ctx, x, y, size) => {
      ctx.fillStyle = 'rgb(80,170,55)';
      ctx.fillRect(x, y, size, 3);
      ctx.fillStyle = 'rgb(160,120,80)';
      ctx.fillRect(x, y + 3, size, size - 3);
    },
  });

  overrides.set(TEX.DIRT, {
    texIndex: TEX.DIRT,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 160, 120, 80);
      const rand = seededRng(1002);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          if (rand() < 0.05) {
            setPixelCtx(ctx, x + px, y + py, 145, 108, 70);
          }
        }
      }
    },
  });

  overrides.set(TEX.STONE, {
    texIndex: TEX.STONE,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 140, 140, 140);
      ctx.fillStyle = 'rgb(125,125,125)';
      for (let i = 0; i < size; i += 4) {
        ctx.fillRect(x + i, y, 1, size);
        ctx.fillRect(x, y + i, size, 1);
      }
    },
  });

  overrides.set(TEX.SAND, {
    texIndex: TEX.SAND,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 230, 210, 140);
      const rand = seededRng(1003);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          if (rand() < 0.03) {
            setPixelCtx(ctx, x + px, y + py, 220, 200, 130);
          }
        }
      }
    },
  });

  overrides.set(TEX.COBBLESTONE, {
    texIndex: TEX.COBBLESTONE,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 120, 120, 120);
      const tileW = 4;
      const tileH = 4;
      for (let ty = 0; ty < size; ty += tileH) {
        const offset = (Math.floor(ty / tileH) % 2) * 2;
        for (let tx = 0; tx < size; tx += tileW) {
          const shade = ((tx + ty) % 8 < 4) ? 145 : 135;
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
          ctx.fillRect(x + ((tx + offset) % size), y + ty, tileW - 1, tileH - 1);
        }
      }
    },
  });

  overrides.set(TEX.OAK_PLANKS, {
    texIndex: TEX.OAK_PLANKS,
    drawFunction: (ctx, x, y, size) => {
      for (let py = 0; py < size; py++) {
        const plankIndex = Math.floor(py / 4);
        const shade = (plankIndex % 2 === 0) ? 0 : 10;
        ctx.fillStyle = `rgb(${185 + shade},${150 + shade},${95 + shade})`;
        ctx.fillRect(x, y + py, size, 1);
      }
      ctx.fillStyle = 'rgb(160,125,75)';
      for (let i = 0; i < size; i += 4) {
        ctx.fillRect(x, y + i, size, 1);
      }
    },
  });

  overrides.set(TEX.OAK_LOG_SIDE, {
    texIndex: TEX.OAK_LOG_SIDE,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 110, 85, 50);
      ctx.fillStyle = 'rgb(95,72,42)';
      for (let px = 0; px < size; px += 3) {
        ctx.fillRect(x + px, y, 1, size);
      }
    },
  });

  overrides.set(TEX.WATER, {
    texIndex: TEX.WATER,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 50, 100, 210, 0.78);
      ctx.fillStyle = 'rgba(80,130,240,0.4)';
      for (let py = 0; py < size; py += 4) {
        ctx.fillRect(x, y + py, size, 1);
      }
    },
  });

  overrides.set(TEX.DIAMOND_ORE, {
    texIndex: TEX.DIAMOND_ORE,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 140, 140, 140);
      const positions = [[3, 4], [10, 3], [6, 10], [12, 11], [2, 13]];
      ctx.fillStyle = 'rgb(80,220,230)';
      for (const [dx, dy] of positions) {
        ctx.fillRect(x + dx, y + dy, 2, 2);
      }
    },
  });

  overrides.set(TEX.IRON_ORE, {
    texIndex: TEX.IRON_ORE,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 140, 140, 140);
      const positions = [[2, 3], [9, 2], [5, 9], [13, 7], [3, 13]];
      ctx.fillStyle = 'rgb(210,190,170)';
      for (const [dx, dy] of positions) {
        ctx.fillRect(x + dx, y + dy, 2, 2);
      }
    },
  });

  overrides.set(TEX.GOLD_ORE, {
    texIndex: TEX.GOLD_ORE,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 140, 140, 140);
      const positions = [[4, 2], [11, 5], [7, 11], [1, 8], [13, 13]];
      ctx.fillStyle = 'rgb(250,210,50)';
      for (const [dx, dy] of positions) {
        ctx.fillRect(x + dx, y + dy, 2, 2);
      }
    },
  });

  overrides.set(TEX.COAL_ORE, {
    texIndex: TEX.COAL_ORE,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 140, 140, 140);
      const positions = [[3, 3], [10, 4], [6, 10], [12, 12], [1, 12]];
      ctx.fillStyle = 'rgb(40,40,40)';
      for (const [dx, dy] of positions) {
        ctx.fillRect(x + dx, y + dy, 3, 2);
      }
    },
  });

  return {
    id: 'plastic',
    name: 'Plastic',
    description: 'Smoother, flatter colors with minimal noise. Clean and modern look inspired by toy blocks.',
    author: 'Built-in',
    thumbnailColor: '#88CC55',
    textureOverrides: overrides,
    colorOverrides: {},
    isActive: false,
  };
}

// =============================================================================
// Built-in Pack: Natural — detailed, organic
// =============================================================================

function createNaturalPack(): TexturePack {
  const overrides = new Map<number, TextureOverride>();

  overrides.set(TEX.GRASS_TOP, {
    texIndex: TEX.GRASS_TOP,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(2001);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          let r = 75, g = 145, b = 50;
          const n = (rand() - 0.5) * 35;
          r += n * 0.7; g += n; b += n * 0.5;
          if (rand() < 0.15) { r -= 20; g += 10; b -= 15; }
          if (rand() < 0.08) { r -= 25; g -= 20; b -= 15; }
          if (rand() < 0.05) { r += 15; g += 25; b += 10; }
          setPixelCtx(ctx, x + px, y + py, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
        }
      }
    },
  });

  overrides.set(TEX.GRASS_SIDE, {
    texIndex: TEX.GRASS_SIDE,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(2002);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          if (py < 3) {
            let r = 70, g = 150, b = 45;
            const n = (rand() - 0.5) * 28;
            r += n * 0.6; g += n; b += n * 0.4;
            if (rand() < 0.1) { g += 15; }
            setPixelCtx(ctx, x + px, y + py, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
          } else if (py < 5) {
            const grassChance = 0.6 - (py - 3) * 0.3;
            if (rand() < grassChance) {
              const n = (rand() - 0.5) * 20;
              setPixelCtx(ctx, x + px, y + py, clamp(80 + n, 0, 255), clamp(135 + n, 0, 255), clamp(50 + n, 0, 255));
            } else {
              const n = (rand() - 0.5) * 25;
              setPixelCtx(ctx, x + px, y + py, clamp(130 + n, 0, 255), clamp(95 + n, 0, 255), clamp(62 + n, 0, 255));
            }
          } else {
            let r = 130, g = 95, b = 62;
            const n = (rand() - 0.5) * 28;
            r += n; g += n * 0.75; b += n * 0.5;
            if (rand() < 0.12) { r -= 30; g -= 22; b -= 18; }
            if (rand() < 0.06) { r += 25; g += 20; b += 15; }
            if (rand() < 0.04) { r -= 15; g += 5; b -= 10; }
            setPixelCtx(ctx, x + px, y + py, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
          }
        }
      }
    },
  });

  overrides.set(TEX.DIRT, {
    texIndex: TEX.DIRT,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(2003);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          let r = 135, g = 100, b = 65;
          const n = (rand() - 0.5) * 30;
          r += n; g += n * 0.8; b += n * 0.55;
          if (rand() < 0.1) { r -= 28; g -= 22; b -= 18; }
          if (rand() < 0.04) { r += 30; g += 25; b += 20; }
          if (rand() < 0.03) { r += 40; g += 40; b += 40; }
          if (rand() < 0.02) { r -= 40; g -= 30; b -= 25; }
          setPixelCtx(ctx, x + px, y + py, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
        }
      }
    },
  });

  overrides.set(TEX.STONE, {
    texIndex: TEX.STONE,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(2004);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          let r = 125, g = 125, b = 125;
          const n = (rand() - 0.5) * 35;
          r += n; g += n; b += n;
          if ((px + py * 5) % 11 === 0 && rand() < 0.5) { r -= 35; g -= 35; b -= 35; }
          if (rand() < 0.04) { r += 15; g += 10; b -= 5; }
          if (rand() < 0.03) { r += 30; g += 30; b += 35; }
          if (rand() < 0.05) { r -= 20; g -= 20; b -= 20; }
          setPixelCtx(ctx, x + px, y + py, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
        }
      }
    },
  });

  overrides.set(TEX.WATER, {
    texIndex: TEX.WATER,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(2008);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          let r = 30, g = 70, b = 180;
          const n = (rand() - 0.5) * 22;
          r += n * 0.4; g += n * 0.6; b += n;
          if (py % 4 === 0) { r += 20; g += 22; b += 25; }
          if (rand() < 0.04) { r += 40; g += 45; b += 50; }
          if (rand() < 0.06) { r -= 10; g -= 10; b -= 5; }
          ctx.fillStyle = `rgba(${clamp(Math.round(r), 0, 255)},${clamp(Math.round(g), 0, 255)},${clamp(Math.round(b), 0, 255)},0.82)`;
          ctx.fillRect(x + px, y + py, 1, 1);
        }
      }
    },
  });

  overrides.set(TEX.OAK_LEAVES, {
    texIndex: TEX.OAK_LEAVES,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(2010);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          let r = 55, g = 120, b = 35;
          const n = (rand() - 0.5) * 40;
          r += n * 0.6; g += n; b += n * 0.4;
          if (rand() < 0.08) { r += 30; g += 35; b += 15; }
          if (rand() < 0.1) { r -= 25; g -= 20; b -= 15; }
          if (rand() < 0.02) { r = 140; g = 180; b = 220; }
          setPixelCtx(ctx, x + px, y + py, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
        }
      }
    },
  });

  return {
    id: 'natural',
    name: 'Natural',
    description: 'More detailed, organic textures with extra depth. Features moss, cracks, and natural lighting effects.',
    author: 'Built-in',
    thumbnailColor: '#3D7A1E',
    textureOverrides: overrides,
    colorOverrides: {},
    isActive: false,
  };
}

// =============================================================================
// TexturePackManager
// =============================================================================

export class TexturePackManager {
  activePack: TexturePack | null = null;
  defaultAtlas: HTMLCanvasElement | null = null;
  currentAtlas: HTMLCanvasElement | null = null;
  private packs: Map<string, TexturePack> = new Map();
  private listeners: TexturePackChangeListener[] = [];

  constructor() {
    // Register all built-in packs
    this.registerPack(createDefaultPack());
    this.registerPack(createClassicPack());
    this.registerPack(createSmoothPack());
    this.registerPack(createHighContrastPack());
    this.registerPack(createPlasticPack());
    this.registerPack(createNaturalPack());
  }

  // ---------------------------------------------------------------------------
  // Pack Registration
  // ---------------------------------------------------------------------------

  registerPack(pack: TexturePack): void {
    this.packs.set(pack.id, pack);
  }

  // ---------------------------------------------------------------------------
  // Pack Access
  // ---------------------------------------------------------------------------

  getAvailablePacks(): TexturePack[] {
    return Array.from(this.packs.values());
  }

  getActivePack(): TexturePack | null {
    return this.activePack;
  }

  getPack(packId: string): TexturePack | undefined {
    return this.packs.get(packId);
  }

  // ---------------------------------------------------------------------------
  // Default Atlas Management
  // ---------------------------------------------------------------------------

  /**
   * Store the default (unmodified) atlas canvas.
   * Must be called before activating any pack.
   */
  setDefaultAtlas(canvas: HTMLCanvasElement): void {
    const clone = document.createElement('canvas');
    clone.width = canvas.width;
    clone.height = canvas.height;
    const ctx = clone.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);
    this.defaultAtlas = clone;

    if (!this.currentAtlas) {
      const current = document.createElement('canvas');
      current.width = canvas.width;
      current.height = canvas.height;
      const currentCtx = current.getContext('2d')!;
      currentCtx.drawImage(canvas, 0, 0);
      this.currentAtlas = current;
    }
  }

  // ---------------------------------------------------------------------------
  // Pack Activation
  // ---------------------------------------------------------------------------

  /**
   * Activate a texture pack by ID. Generates a modified atlas with overrides applied.
   * Returns the new atlas canvas.
   */
  setActivePack(packId: string): HTMLCanvasElement {
    const pack = this.packs.get(packId);
    if (!pack) {
      throw new Error(`Texture pack "${packId}" not found`);
    }
    if (!this.defaultAtlas) {
      throw new Error('Default atlas not set. Call setDefaultAtlas() first.');
    }

    // Deactivate previous pack
    if (this.activePack) {
      this.activePack.isActive = false;
    }

    pack.isActive = true;
    this.activePack = pack;
    this.currentAtlas = this.applyPack(pack);

    // Notify listeners
    for (const listener of this.listeners) {
      listener(pack);
    }

    return this.currentAtlas;
  }

  /**
   * Reset to default textures (no pack active).
   */
  resetToDefault(): HTMLCanvasElement {
    if (this.activePack) {
      this.activePack.isActive = false;
      this.activePack = null;
    }
    if (!this.defaultAtlas) {
      throw new Error('Default atlas not set.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.defaultAtlas.width;
    canvas.height = this.defaultAtlas.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.defaultAtlas, 0, 0);
    this.currentAtlas = canvas;

    // Notify listeners
    for (const listener of this.listeners) {
      listener(null);
    }

    return this.currentAtlas;
  }

  // ---------------------------------------------------------------------------
  // Atlas Generation
  // ---------------------------------------------------------------------------

  /**
   * Apply a texture pack's overrides to a clone of the default atlas.
   * Returns a new canvas with the modified atlas.
   */
  applyPack(pack: TexturePack): HTMLCanvasElement {
    if (!this.defaultAtlas) {
      throw new Error('Default atlas not set.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.defaultAtlas.width;
    canvas.height = this.defaultAtlas.height;
    const ctx = canvas.getContext('2d')!;

    // Start from the default atlas
    ctx.drawImage(this.defaultAtlas, 0, 0);

    // Apply each texture override
    for (const [texIndex, override] of pack.textureOverrides) {
      const col = texIndex % ATLAS_COLS;
      const row = Math.floor(texIndex / ATLAS_COLS);
      const x = col * TILE;
      const y = row * TILE;

      // Clear the tile slot
      ctx.clearRect(x, y, TILE, TILE);

      // Draw the override
      override.drawFunction(ctx, x, y, TILE);
    }

    return canvas;
  }

  // ---------------------------------------------------------------------------
  // Change Listeners
  // ---------------------------------------------------------------------------

  /**
   * Register a listener for pack changes. Returns an unsubscribe function.
   */
  onPackChange(listener: TexturePackChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

let _instance: TexturePackManager | null = null;

export function getTexturePackManager(): TexturePackManager {
  if (!_instance) {
    _instance = new TexturePackManager();
  }
  return _instance;
}

// =============================================================================
// Exports for individual pack creation (used by mario-mashup.ts etc.)
// =============================================================================

export { createPlasticPack, createNaturalPack, createClassicPack, createSmoothPack, createHighContrastPack };
