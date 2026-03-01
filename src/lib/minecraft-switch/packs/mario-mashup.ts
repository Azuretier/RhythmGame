// =============================================================================
// Super Mario Mash-up Pack
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================
// Complete Mario-themed content pack including texture overrides for blocks,
// a skin pack with 8 Mario franchise characters, a pre-built Mushroom Kingdom
// world template, and music references for the UI.
// =============================================================================

import { Block } from '@/types/minecraft-switch';
import { TEX } from '../texture-registry';
import type { TexturePack, TextureOverride } from './texture-pack';
import type { PlayerSkin, SkinPack } from './skin-pack';

// =============================================================================
// MARIO WORLD TEMPLATE
// =============================================================================

export interface MarioWorldTemplate {
  spawnPoint: { x: number; y: number; z: number };
  structures: MarioStructure[];
}

export interface MarioStructure {
  name: string;
  position: { x: number; y: number; z: number };
  blocks: { dx: number; dy: number; dz: number; blockId: number }[];
}

// =============================================================================
// HELPER: Canvas pixel drawing utilities
// =============================================================================

function setPixelCtx(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  r: number, g: number, b: number, a = 1,
) {
  ctx.fillStyle = `rgba(${Math.round(Math.max(0, Math.min(255, r)))},${Math.round(Math.max(0, Math.min(255, g)))},${Math.round(Math.max(0, Math.min(255, b)))},${a})`;
  ctx.fillRect(x, y, 1, 1);
}

function fillSolid(
  ctx: CanvasRenderingContext2D, x: number, y: number, size: number,
  r: number, g: number, b: number,
) {
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(x, y, size, size);
}

function seededRng(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// =============================================================================
// MARIO TEXTURE OVERRIDES — Draw functions for Mario-themed blocks
// =============================================================================

/** Question Block — yellow with brown border and "?" mark */
function drawQuestionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Yellow base
  fillSolid(ctx, x, y, size, 230, 180, 30);
  // Brown border (top, bottom, left, right edges)
  ctx.fillStyle = 'rgb(140,90,20)';
  ctx.fillRect(x, y, size, 1); // top
  ctx.fillRect(x, y + size - 1, size, 1); // bottom
  ctx.fillRect(x, y, 1, size); // left
  ctx.fillRect(x + size - 1, y, 1, size); // right
  // Inner border highlight
  ctx.fillStyle = 'rgb(255,220,80)';
  ctx.fillRect(x + 1, y + 1, size - 2, 1);
  ctx.fillRect(x + 1, y + 1, 1, size - 2);
  // Inner shadow
  ctx.fillStyle = 'rgb(180,130,20)';
  ctx.fillRect(x + 1, y + size - 2, size - 2, 1);
  ctx.fillRect(x + size - 2, y + 1, 1, size - 2);
  // Question mark "?" — pixel art centered
  ctx.fillStyle = 'rgb(255,255,255)';
  // Top of "?"
  ctx.fillRect(x + 5, y + 3, 6, 1);
  ctx.fillRect(x + 4, y + 4, 2, 1);
  ctx.fillRect(x + 10, y + 4, 2, 1);
  ctx.fillRect(x + 10, y + 5, 2, 1);
  ctx.fillRect(x + 9, y + 6, 2, 1);
  ctx.fillRect(x + 7, y + 7, 3, 1);
  ctx.fillRect(x + 7, y + 8, 2, 1);
  ctx.fillRect(x + 7, y + 9, 2, 1);
  // Dot of "?"
  ctx.fillRect(x + 7, y + 11, 2, 2);
}

/** Mario Brick Block — brown brick pattern */
function drawMarioBrick(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Dark mortar base
  fillSolid(ctx, x, y, size, 60, 40, 20);
  // Brick colors
  const brickR = 180, brickG = 80, brickB = 40;
  const brickH = 4; // height of each brick row
  for (let row = 0; row < 4; row++) {
    const by = y + row * brickH;
    const offset = (row % 2) * 8; // stagger every other row
    for (let col = -1; col < 3; col++) {
      const bx = x + col * 8 + offset;
      // Only draw visible portion
      const clippedX = Math.max(bx + 1, x);
      const clippedW = Math.min(bx + 7, x + size) - clippedX;
      if (clippedW > 0) {
        // Brick face
        ctx.fillStyle = `rgb(${brickR},${brickG},${brickB})`;
        ctx.fillRect(clippedX, by + 1, clippedW, brickH - 1);
        // Brick highlight (top edge)
        ctx.fillStyle = `rgb(${brickR + 30},${brickG + 20},${brickB + 15})`;
        const hlX = Math.max(bx + 1, x);
        const hlW = Math.min(bx + 7, x + size) - hlX;
        if (hlW > 0) {
          ctx.fillRect(hlX, by + 1, hlW, 1);
        }
      }
    }
  }
}

/** Pipe Side — green pipe with highlight and shadow */
function drawPipeSide(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Dark green base
  fillSolid(ctx, x, y, size, 30, 120, 30);
  // Gradient left to right: shadow -> highlight -> base -> shadow
  for (let px = 0; px < size; px++) {
    const t = px / (size - 1);
    let shade: number;
    if (t < 0.15) shade = -30;
    else if (t < 0.35) shade = 30;
    else if (t < 0.5) shade = 50; // highlight stripe
    else if (t < 0.65) shade = 30;
    else if (t < 0.85) shade = 0;
    else shade = -30;
    ctx.fillStyle = `rgb(${30 + shade},${120 + shade},${30 + shade})`;
    ctx.fillRect(x + px, y, 1, size);
  }
  // Horizontal line details
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(x, y + 4, size, 1);
  ctx.fillRect(x, y + 11, size, 1);
}

/** Pipe Top — circular opening on green */
function drawPipeTop(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Green base
  fillSolid(ctx, x, y, size, 40, 140, 40);
  // Dark circular opening (center)
  ctx.fillStyle = 'rgb(10,40,10)';
  ctx.fillRect(x + 3, y + 3, 10, 10);
  // Inner ring highlight
  ctx.fillStyle = 'rgb(60,160,60)';
  ctx.fillRect(x + 2, y + 2, 12, 1);
  ctx.fillRect(x + 2, y + 2, 1, 12);
  ctx.fillRect(x + 2, y + 13, 12, 1);
  ctx.fillRect(x + 13, y + 2, 1, 12);
  // Outer ring
  ctx.fillStyle = 'rgb(20,100,20)';
  ctx.fillRect(x + 1, y + 1, 14, 1);
  ctx.fillRect(x + 1, y + 1, 1, 14);
  ctx.fillRect(x + 1, y + 14, 14, 1);
  ctx.fillRect(x + 14, y + 1, 1, 14);
}

/** Mario-themed stone — castle block with cross-hatch pattern */
function drawCastleBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  fillSolid(ctx, x, y, size, 160, 160, 160);
  // Stone block borders
  ctx.fillStyle = 'rgb(120,120,120)';
  ctx.fillRect(x, y, size, 1);
  ctx.fillRect(x, y, 1, size);
  ctx.fillRect(x + 8, y, 1, size);
  ctx.fillRect(x, y + 8, size, 1);
  // Highlight
  ctx.fillStyle = 'rgb(190,190,190)';
  ctx.fillRect(x + 1, y + 1, 7, 1);
  ctx.fillRect(x + 1, y + 1, 1, 7);
  ctx.fillRect(x + 9, y + 9, 6, 1);
  ctx.fillRect(x + 9, y + 9, 1, 6);
}

/** Mario ground block — tan/brown earth with pixel detail */
function drawMarioGround(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const rand = seededRng(5001);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 195, g = 140, b = 70;
      const n = (rand() - 0.5) * 18;
      r += n; g += n * 0.7; b += n * 0.5;
      if (rand() < 0.08) { r -= 20; g -= 15; b -= 10; }
      setPixelCtx(ctx, x + px, y + py, r, g, b);
    }
  }
}

/** Used question block — dark/spent appearance */
function drawUsedQuestionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  fillSolid(ctx, x, y, size, 100, 70, 30);
  // Border
  ctx.fillStyle = 'rgb(70,50,20)';
  ctx.fillRect(x, y, size, 1);
  ctx.fillRect(x, y + size - 1, size, 1);
  ctx.fillRect(x, y, 1, size);
  ctx.fillRect(x + size - 1, y, 1, size);
  // Rivets / corner dots
  ctx.fillStyle = 'rgb(130,95,45)';
  ctx.fillRect(x + 2, y + 2, 2, 2);
  ctx.fillRect(x + 12, y + 2, 2, 2);
  ctx.fillRect(x + 2, y + 12, 2, 2);
  ctx.fillRect(x + 12, y + 12, 2, 2);
}

/** Coin block — golden with coin symbol */
function drawCoinBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  fillSolid(ctx, x, y, size, 255, 200, 50);
  // Coin circle center
  ctx.fillStyle = 'rgb(255,230,100)';
  ctx.fillRect(x + 4, y + 3, 8, 10);
  // Inner coin outline
  ctx.fillStyle = 'rgb(200,150,30)';
  ctx.fillRect(x + 5, y + 3, 6, 1);
  ctx.fillRect(x + 5, y + 12, 6, 1);
  ctx.fillRect(x + 4, y + 4, 1, 8);
  ctx.fillRect(x + 11, y + 4, 1, 8);
  // "C" letter
  ctx.fillStyle = 'rgb(200,150,30)';
  ctx.fillRect(x + 7, y + 5, 3, 1);
  ctx.fillRect(x + 6, y + 6, 1, 4);
  ctx.fillRect(x + 7, y + 10, 3, 1);
}

/** Cloud block — white fluffy block */
function drawCloudBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  fillSolid(ctx, x, y, size, 200, 220, 255);
  const rand = seededRng(5002);
  // White cloud puffs
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const n = (rand() - 0.5) * 15;
      const r = 235 + n;
      const g = 245 + n;
      const b = 255;
      if (rand() < 0.3) {
        setPixelCtx(ctx, x + px, y + py, r, g, b);
      }
    }
  }
}

// =============================================================================
// MARIO TEXTURE PACK — Combined overrides
// =============================================================================

function createMarioTextureOverrides(): Map<number, TextureOverride> {
  const overrides = new Map<number, TextureOverride>();

  // Question Block replaces Gold Block texture
  overrides.set(TEX.GOLD_BLOCK, {
    texIndex: TEX.GOLD_BLOCK,
    drawFunction: drawQuestionBlock,
  });

  // Mario Brick replaces normal Bricks texture
  overrides.set(TEX.BRICKS, {
    texIndex: TEX.BRICKS,
    drawFunction: drawMarioBrick,
  });

  // Pipe Side replaces Lime Wool
  overrides.set(TEX.LIME_WOOL, {
    texIndex: TEX.LIME_WOOL,
    drawFunction: drawPipeSide,
  });

  // Pipe Top replaces Lime Concrete
  overrides.set(TEX.LIME_CONCRETE, {
    texIndex: TEX.LIME_CONCRETE,
    drawFunction: drawPipeTop,
  });

  // Castle Stone replaces Stone Bricks
  overrides.set(TEX.STONE_BRICKS, {
    texIndex: TEX.STONE_BRICKS,
    drawFunction: drawCastleBlock,
  });

  // Mario Ground replaces Sandstone Side
  overrides.set(TEX.SANDSTONE_SIDE, {
    texIndex: TEX.SANDSTONE_SIDE,
    drawFunction: drawMarioGround,
  });

  // Used Question Block replaces Brown Wool
  overrides.set(TEX.BROWN_WOOL, {
    texIndex: TEX.BROWN_WOOL,
    drawFunction: drawUsedQuestionBlock,
  });

  // Coin Block replaces Yellow Wool
  overrides.set(TEX.YELLOW_WOOL, {
    texIndex: TEX.YELLOW_WOOL,
    drawFunction: drawCoinBlock,
  });

  // Cloud Block replaces Snow Block
  overrides.set(TEX.SNOW_BLOCK, {
    texIndex: TEX.SNOW_BLOCK,
    drawFunction: drawCloudBlock,
  });

  // Grass becomes Super Mario green
  overrides.set(TEX.GRASS_TOP, {
    texIndex: TEX.GRASS_TOP,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(5010);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          let r = 50, g = 180, b = 50;
          const n = (rand() - 0.5) * 12;
          r += n * 0.5; g += n; b += n * 0.4;
          setPixelCtx(ctx, x + px, y + py, r, g, b);
        }
      }
    },
  });

  // Dirt becomes Mario underground brown
  overrides.set(TEX.DIRT, {
    texIndex: TEX.DIRT,
    drawFunction: (ctx, x, y, size) => {
      const rand = seededRng(5011);
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          let r = 170, g = 110, b = 55;
          const n = (rand() - 0.5) * 14;
          r += n; g += n * 0.7; b += n * 0.5;
          setPixelCtx(ctx, x + px, y + py, r, g, b);
        }
      }
    },
  });

  // Sky/water becomes Mario blue
  overrides.set(TEX.WATER, {
    texIndex: TEX.WATER,
    drawFunction: (ctx, x, y, size) => {
      fillSolid(ctx, x, y, size, 92, 148, 252);
    },
  });

  return overrides;
}

// =============================================================================
// MARIO SKIN PACK — 8 Mario franchise characters
// =============================================================================

function createMarioSkinPack(): SkinPack {
  const skins: PlayerSkin[] = [
    {
      id: 'mario_mario',
      name: 'Mario',
      pack: 'mario_mashup',
      category: 'pack',
      headColor: '#FFDAAE',
      bodyColor: '#E52521',
      armColor: '#E52521',
      legColor: '#0051A8',
      isSlim: false,
    },
    {
      id: 'mario_luigi',
      name: 'Luigi',
      pack: 'mario_mashup',
      category: 'pack',
      headColor: '#FFDAAE',
      bodyColor: '#3BB54A',
      armColor: '#3BB54A',
      legColor: '#0051A8',
      isSlim: false,
    },
    {
      id: 'mario_peach',
      name: 'Princess Peach',
      pack: 'mario_mashup',
      category: 'pack',
      headColor: '#FFD700',
      bodyColor: '#FFB6C1',
      armColor: '#FFB6C1',
      legColor: '#FFB6C1',
      isSlim: true,
    },
    {
      id: 'mario_toad',
      name: 'Toad',
      pack: 'mario_mashup',
      category: 'pack',
      headColor: '#FFFFFF',
      bodyColor: '#4169E1',
      armColor: '#FFDAAE',
      legColor: '#FFFFFF',
      isSlim: false,
    },
    {
      id: 'mario_bowser',
      name: 'Bowser',
      pack: 'mario_mashup',
      category: 'pack',
      headColor: '#4A8C3C',
      bodyColor: '#DAA520',
      armColor: '#4A8C3C',
      legColor: '#4A8C3C',
      isSlim: false,
    },
    {
      id: 'mario_yoshi',
      name: 'Yoshi',
      pack: 'mario_mashup',
      category: 'pack',
      headColor: '#3BB54A',
      bodyColor: '#FFFFFF',
      armColor: '#3BB54A',
      legColor: '#FF8C00',
      isSlim: false,
    },
    {
      id: 'mario_wario',
      name: 'Wario',
      pack: 'mario_mashup',
      category: 'pack',
      headColor: '#FFDAAE',
      bodyColor: '#FFD700',
      armColor: '#FFD700',
      legColor: '#6B1F76',
      isSlim: false,
    },
    {
      id: 'mario_rosalina',
      name: 'Rosalina',
      pack: 'mario_mashup',
      category: 'pack',
      headColor: '#FFFACD',
      bodyColor: '#87CEEB',
      armColor: '#87CEEB',
      legColor: '#87CEEB',
      isSlim: true,
    },
  ];

  return {
    id: 'mario_mashup',
    name: 'Super Mario Mash-up',
    description: 'Classic characters from the Mushroom Kingdom. Play as Mario, Luigi, Peach, and more!',
    skins,
    icon: '#E52521',
  };
}

// =============================================================================
// MARIO WORLD TEMPLATE — Pre-built Mushroom Kingdom structures
// =============================================================================

function createMarioWorldTemplate(): MarioWorldTemplate {
  const structures: MarioStructure[] = [];

  // -------------------------------------------------------------------------
  // Peach's Castle — 30x30x25 block structure with towers
  // Uses QuartzBlock (38), WhiteWool (127), GoldBlock (32),
  // PinkWool (133), RedWool (141), Glass (110)
  // -------------------------------------------------------------------------
  const peachsCastle: MarioStructure = {
    name: "Peach's Castle",
    position: { x: 0, y: 64, z: 0 },
    blocks: [],
  };

  // Castle foundation platform (30x1x30)
  for (let dx = 0; dx < 30; dx++) {
    for (let dz = 0; dz < 30; dz++) {
      peachsCastle.blocks.push({ dx, dy: 0, dz, blockId: Block.QuartzBlock });
    }
  }

  // Castle walls (outer shell, 30x12x30, hollow)
  for (let dy = 1; dy <= 12; dy++) {
    for (let dx = 0; dx < 30; dx++) {
      for (let dz = 0; dz < 30; dz++) {
        const isWall = dx === 0 || dx === 29 || dz === 0 || dz === 29;
        if (isWall) {
          // Window openings on second floor
          const isWindow = dy >= 7 && dy <= 9 &&
            ((dx > 4 && dx < 8) || (dx > 12 && dx < 16) || (dx > 20 && dx < 24)) &&
            (dz === 0 || dz === 29);
          const isWindowSide = dy >= 7 && dy <= 9 &&
            ((dz > 4 && dz < 8) || (dz > 12 && dz < 16) || (dz > 20 && dz < 24)) &&
            (dx === 0 || dx === 29);
          if (isWindow || isWindowSide) {
            peachsCastle.blocks.push({ dx, dy, dz, blockId: Block.Glass });
          } else {
            peachsCastle.blocks.push({ dx, dy, dz, blockId: Block.WhiteWool });
          }
        }
      }
    }
  }

  // Door opening (front, dz=0)
  for (let dy = 1; dy <= 4; dy++) {
    for (let dx = 13; dx <= 16; dx++) {
      // Remove wall blocks at door position (they won't be overwritten, but placed as Air)
      peachsCastle.blocks.push({ dx, dy, dz: 0, blockId: Block.Air });
    }
  }

  // Roof (flat with slight peak)
  for (let dx = 0; dx < 30; dx++) {
    for (let dz = 0; dz < 30; dz++) {
      peachsCastle.blocks.push({ dx, dy: 13, dz, blockId: Block.PinkWool });
    }
  }
  // Roof edge trim
  for (let dx = 0; dx < 30; dx++) {
    peachsCastle.blocks.push({ dx, dy: 13, dz: 0, blockId: Block.RedWool });
    peachsCastle.blocks.push({ dx, dy: 13, dz: 29, blockId: Block.RedWool });
  }
  for (let dz = 0; dz < 30; dz++) {
    peachsCastle.blocks.push({ dx: 0, dy: 13, dz, blockId: Block.RedWool });
    peachsCastle.blocks.push({ dx: 29, dy: 13, dz, blockId: Block.RedWool });
  }

  // Corner towers (4 towers at each corner, 5x5x25)
  const towerCorners = [
    { cx: 0, cz: 0 },
    { cx: 25, cz: 0 },
    { cx: 0, cz: 25 },
    { cx: 25, cz: 25 },
  ];
  for (const { cx, cz } of towerCorners) {
    for (let dy = 1; dy <= 18; dy++) {
      for (let dx = 0; dx < 5; dx++) {
        for (let dz = 0; dz < 5; dz++) {
          const isEdge = dx === 0 || dx === 4 || dz === 0 || dz === 4;
          if (isEdge) {
            peachsCastle.blocks.push({ dx: cx + dx, dy, dz: cz + dz, blockId: Block.WhiteWool });
          }
        }
      }
    }
    // Tower roof cones (simplified pyramid)
    for (let layer = 0; layer < 3; layer++) {
      const offset = layer;
      const layerSize = 5 - layer * 2;
      if (layerSize <= 0) break;
      for (let dx = 0; dx < layerSize; dx++) {
        for (let dz = 0; dz < layerSize; dz++) {
          peachsCastle.blocks.push({
            dx: cx + offset + dx,
            dy: 19 + layer,
            dz: cz + offset + dz,
            blockId: Block.RedWool,
          });
        }
      }
    }
    // Tower top spire
    peachsCastle.blocks.push({ dx: cx + 2, dy: 22, dz: cz + 2, blockId: Block.GoldBlock });
    peachsCastle.blocks.push({ dx: cx + 2, dy: 23, dz: cz + 2, blockId: Block.GoldBlock });
    peachsCastle.blocks.push({ dx: cx + 2, dy: 24, dz: cz + 2, blockId: Block.YellowWool });
  }

  // Central tower (above entrance, 8x20x8)
  for (let dy = 13; dy <= 20; dy++) {
    for (let dx = 11; dx <= 18; dx++) {
      for (let dz = 11; dz <= 18; dz++) {
        const isEdge = dx === 11 || dx === 18 || dz === 11 || dz === 18;
        if (isEdge) {
          peachsCastle.blocks.push({ dx, dy, dz, blockId: Block.WhiteWool });
        }
      }
    }
  }
  // Central tower roof
  for (let dx = 11; dx <= 18; dx++) {
    for (let dz = 11; dz <= 18; dz++) {
      peachsCastle.blocks.push({ dx, dy: 21, dz, blockId: Block.PinkWool });
    }
  }
  // Star on top
  peachsCastle.blocks.push({ dx: 14, dy: 22, dz: 14, blockId: Block.GoldBlock });
  peachsCastle.blocks.push({ dx: 15, dy: 22, dz: 14, blockId: Block.GoldBlock });
  peachsCastle.blocks.push({ dx: 14, dy: 22, dz: 15, blockId: Block.GoldBlock });
  peachsCastle.blocks.push({ dx: 15, dy: 22, dz: 15, blockId: Block.GoldBlock });
  peachsCastle.blocks.push({ dx: 14, dy: 23, dz: 14, blockId: Block.YellowWool });
  peachsCastle.blocks.push({ dx: 15, dy: 23, dz: 15, blockId: Block.YellowWool });

  structures.push(peachsCastle);

  // -------------------------------------------------------------------------
  // Pipe System — Green wool tubes connecting areas (4 pipes)
  // -------------------------------------------------------------------------
  const pipePositions = [
    { x: 40, z: 5 },
    { x: 50, z: 15 },
    { x: -15, z: 10 },
    { x: -25, z: 20 },
  ];
  for (let i = 0; i < pipePositions.length; i++) {
    const pipe: MarioStructure = {
      name: `Warp Pipe ${i + 1}`,
      position: { x: pipePositions[i].x, y: 64, z: pipePositions[i].z },
      blocks: [],
    };

    // Pipe column: 4-wide, 6-tall green columns
    const height = 6;
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        for (let dz = 0; dz < 4; dz++) {
          const isShell = dx === 0 || dx === 3 || dz === 0 || dz === 3;
          if (isShell) {
            pipe.blocks.push({ dx, dy, dz, blockId: Block.LimeWool });
          } else {
            // Hollow inside — darker green
            pipe.blocks.push({ dx, dy, dz, blockId: Block.GreenWool });
          }
        }
      }
    }

    // Pipe lip (wider top ring, 6x1x6)
    for (let dx = -1; dx <= 4; dx++) {
      for (let dz = -1; dz <= 4; dz++) {
        if (dx >= 0 && dx <= 3 && dz >= 0 && dz <= 3) continue; // Skip inner area
        pipe.blocks.push({ dx, dy: height, dz, blockId: Block.LimeWool });
      }
    }
    // Top of lip
    for (let dx = -1; dx <= 4; dx++) {
      for (let dz = -1; dz <= 4; dz++) {
        pipe.blocks.push({ dx, dy: height + 1, dz, blockId: Block.LimeWool });
      }
    }

    structures.push(pipe);
  }

  // -------------------------------------------------------------------------
  // Question Blocks — floating question block rows
  // -------------------------------------------------------------------------
  const questionBlockRow: MarioStructure = {
    name: 'Question Block Row',
    position: { x: 35, y: 68, z: -10 },
    blocks: [],
  };
  // Row of 5 question blocks with brick blocks between them
  for (let dx = 0; dx < 9; dx++) {
    if (dx % 2 === 0) {
      questionBlockRow.blocks.push({ dx, dy: 0, dz: 0, blockId: Block.GoldBlock }); // question block texture
    } else {
      questionBlockRow.blocks.push({ dx, dy: 0, dz: 0, blockId: Block.BrownWool }); // brick texture
    }
  }
  structures.push(questionBlockRow);

  // Second row higher up
  const questionBlockRow2: MarioStructure = {
    name: 'Question Block Row High',
    position: { x: 45, y: 72, z: -10 },
    blocks: [],
  };
  for (let dx = 0; dx < 5; dx++) {
    questionBlockRow2.blocks.push({ dx, dy: 0, dz: 0, blockId: Block.GoldBlock });
  }
  structures.push(questionBlockRow2);

  // -------------------------------------------------------------------------
  // Mushroom Houses — Red/white wool domes (2 houses)
  // -------------------------------------------------------------------------
  const mushroomHousePositions = [
    { x: -10, z: -15 },
    { x: 20, z: -20 },
  ];
  for (let i = 0; i < mushroomHousePositions.length; i++) {
    const house: MarioStructure = {
      name: `Mushroom House ${i + 1}`,
      position: { x: mushroomHousePositions[i].x, y: 64, z: mushroomHousePositions[i].z },
      blocks: [],
    };

    // House base (6x4x6) — white walls
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 6; dx++) {
        for (let dz = 0; dz < 6; dz++) {
          const isWall = dx === 0 || dx === 5 || dz === 0 || dz === 5;
          if (isWall) {
            house.blocks.push({ dx, dy, dz, blockId: Block.WhiteWool });
          }
        }
      }
    }

    // Door opening
    house.blocks.push({ dx: 2, dy: 0, dz: 0, blockId: Block.Air });
    house.blocks.push({ dx: 3, dy: 0, dz: 0, blockId: Block.Air });
    house.blocks.push({ dx: 2, dy: 1, dz: 0, blockId: Block.Air });
    house.blocks.push({ dx: 3, dy: 1, dz: 0, blockId: Block.Air });

    // Mushroom cap dome — red wool with white spots
    // Layer 1 (widest, 8x8)
    for (let dx = -1; dx <= 6; dx++) {
      for (let dz = -1; dz <= 6; dz++) {
        const isSpot = (dx === 0 && dz === 0) || (dx === 5 && dz === 0) ||
          (dx === 0 && dz === 5) || (dx === 5 && dz === 5) ||
          (dx === 2 && dz === 3) || (dx === 3 && dz === 2);
        house.blocks.push({
          dx, dy: 4, dz,
          blockId: isSpot ? Block.WhiteWool : Block.RedWool,
        });
      }
    }
    // Layer 2 (6x6)
    for (let dx = 0; dx < 6; dx++) {
      for (let dz = 0; dz < 6; dz++) {
        const isSpot = (dx === 1 && dz === 1) || (dx === 4 && dz === 4);
        house.blocks.push({
          dx, dy: 5, dz,
          blockId: isSpot ? Block.WhiteWool : Block.RedWool,
        });
      }
    }
    // Layer 3 (4x4, top)
    for (let dx = 1; dx <= 4; dx++) {
      for (let dz = 1; dz <= 4; dz++) {
        house.blocks.push({ dx, dy: 6, dz, blockId: Block.RedWool });
      }
    }
    // Layer 4 (2x2, peak)
    for (let dx = 2; dx <= 3; dx++) {
      for (let dz = 2; dz <= 3; dz++) {
        house.blocks.push({ dx, dy: 7, dz, blockId: Block.WhiteWool });
      }
    }

    structures.push(house);
  }

  return {
    spawnPoint: { x: 15, y: 66, z: -5 },
    structures,
  };
}

// =============================================================================
// MUSIC REFERENCES — Mario-themed track names for UI display
// =============================================================================

const MARIO_MUSIC_REFERENCES = [
  'Overworld Theme (Super Mario Bros.)',
  'Underground Theme (Super Mario Bros.)',
  'Underwater Theme (Super Mario Bros.)',
  'Castle Theme (Super Mario Bros.)',
  'Star Theme (Invincibility)',
  'Athletic Theme (Super Mario Bros. 3)',
  'Slide Theme (Super Mario 64)',
  'Bob-omb Battlefield (Super Mario 64)',
  'Dire Dire Docks (Super Mario 64)',
  'Gusty Garden Galaxy (Super Mario Galaxy)',
  'Good Egg Galaxy (Super Mario Galaxy)',
  'Fossil Falls (Super Mario Odyssey)',
];

// =============================================================================
// COMBINED PACK FACTORY
// =============================================================================

export interface MarioMashupPack {
  texturePack: TexturePack;
  skinPack: SkinPack;
  worldTemplate: MarioWorldTemplate;
  musicReferences: string[];
}

export function createMarioMashupPack(): MarioMashupPack {
  const textureOverrides = createMarioTextureOverrides();
  const skinPack = createMarioSkinPack();
  const worldTemplate = createMarioWorldTemplate();

  const texturePack: TexturePack = {
    id: 'mario_mashup',
    name: 'Super Mario Mash-up',
    description: 'Transform your world into the Mushroom Kingdom! Themed blocks, characters, and a pre-built castle world.',
    author: 'Built-in (Nintendo tribute)',
    thumbnailColor: '#E52521',
    textureOverrides,
    colorOverrides: {
      grass_top: '#32B832',
      grass_side_overlay: '#32B832',
      leaves_oak: '#2D9E2D',
      water: '#5C94FC',
      sky_day_top: '#5C94FC',
      sky_day_bottom: '#9CC4FC',
      dirt: '#AA6E28',
      sand: '#E8C870',
    },
    isActive: false,
  };

  return {
    texturePack,
    skinPack,
    worldTemplate,
    musicReferences: MARIO_MUSIC_REFERENCES,
  };
}

// =============================================================================
// CONVENIENCE GETTERS — Spec-required API surface
// =============================================================================

/**
 * Callback for placing a block at world coordinates.
 * Compatible with world.setBlock(x, y, z, blockId) pattern used
 * throughout the minecraft-switch world-gen system.
 */
export type SetBlockFn = (x: number, y: number, z: number, blockId: number) => void;

/**
 * Get the Mario Mash-up texture pack ready for registration with TexturePackManager.
 */
export function getMarioTexturePack(): TexturePack {
  const overrides = createMarioTextureOverrides();
  return {
    id: 'mario_mashup',
    name: 'Super Mario Mash-up',
    description: 'Transform your world into the Mushroom Kingdom! Themed blocks, characters, and a pre-built castle world.',
    author: 'Built-in (Nintendo tribute)',
    thumbnailColor: '#E52521',
    textureOverrides: overrides,
    colorOverrides: {
      grass_top: '#32B832',
      grass_side_overlay: '#32B832',
      leaves_oak: '#2D9E2D',
      water: '#5C94FC',
      sky_day_top: '#5C94FC',
      sky_day_bottom: '#9CC4FC',
      dirt: '#AA6E28',
      sand: '#E8C870',
    },
    isActive: false,
  };
}

/**
 * Get the Mario skin pack as an array of PlayerSkin entries.
 */
export function getMarioSkinPack(): PlayerSkin[] {
  return createMarioSkinPack().skins;
}

/**
 * Place all Mario Mash-up structures into a world at a given origin.
 *
 * Uses a SetBlockFn callback so this works with any world implementation
 * that supports block placement (ChunkWorld, VoxelEngine, etc.).
 *
 * @param setBlock - Function to place a block at absolute world coordinates
 * @param originX - World X origin for the Mario spawn area
 * @param originY - World Y origin (ground level, typically 64)
 * @param originZ - World Z origin for the Mario spawn area
 */
export function generateMarioSpawnArea(
  setBlock: SetBlockFn,
  originX: number,
  originY: number,
  originZ: number,
): void {
  const template = createMarioWorldTemplate();

  for (const structure of template.structures) {
    const sx = originX + structure.position.x;
    const sy = originY + (structure.position.y - 64); // Normalize relative to ground level
    const sz = originZ + structure.position.z;

    for (const block of structure.blocks) {
      setBlock(sx + block.dx, sy + block.dy, sz + block.dz, block.blockId);
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { createMarioSkinPack, createMarioWorldTemplate, MARIO_MUSIC_REFERENCES };
