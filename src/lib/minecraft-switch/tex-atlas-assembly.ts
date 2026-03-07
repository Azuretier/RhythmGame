// =============================================================================
// Atlas Assembly — Draws all textures onto the 512x512 atlas canvas
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================

import { TEX, ATLAS_SIZE } from './tex-constants';
import { rng, drawOreClusters, tileOffset } from './tex-utils';
import type { DrawFn } from './tex-utils';

import {
  drawGrassTop, drawGrassSide, drawDirt, drawStone, drawSand,
  drawWater, drawLava, drawSnow, drawSnowSide, drawBedrock,
  drawGravel, drawCobblestone, drawClay, drawSandstone, drawSandstoneTop,
  drawIce, drawPackedIce, drawBlueIce, drawRedSand, drawRedSandstone,
  drawRedSandstoneTop, drawCoarseDirt, drawPodzolTop, drawPodzolSide,
  drawMyceliumTop, drawMyceliumSide, drawSmoothStone,
  drawGranite, drawDiorite, drawAndesite, drawPolishedStone,
  drawSmoothSandstone, drawSmoothRedSandstone, drawChiseledSandstone,
  drawCutSandstone, drawChiseledRedSandstone, drawCutRedSandstone,
} from './tex-draw-terrain';

import {
  drawOakLogTop, drawOakLogSide, drawOakPlanks, drawOakLeaves,
  drawSpruceLogSide, drawSpruceLogTop, drawSprucePlanks, drawSpruceLeaves,
  drawBirchLogSide, drawBirchLogTop, drawBirchPlanks, drawBirchLeaves,
  drawJungleLogSide, drawJungleLogTop, drawJunglePlanks, drawJungleLeaves,
  drawAcaciaLogSide, drawAcaciaLogTop, drawAcaciaPlanks, drawAcaciaLeaves,
  drawDarkOakLogSide, drawDarkOakLogTop, drawDarkOakPlanks, drawDarkOakLeaves,
  drawStoneBricks, drawMossyStoneBricks, drawCrackedStoneBricks,
  drawChiseledStoneBricks, drawMossyCobblestone,
  drawNetherrack, drawSoulSand, drawSoulSoil, drawGlowstone,
  drawNetherBricks, drawRedNetherBricks, drawBasaltSide, drawBasaltTop,
  drawBlackstone, drawPolishedBlackstone, drawPolishedBlackstoneBricks,
  drawCrimsonPlanks, drawWarpedPlanks, drawCrimsonStemSide, drawCrimsonStemTop,
  drawWarpedStemSide, drawWarpedStemTop, drawCrimsonNyliumTop, drawWarpedNyliumTop,
  drawShroomlight, drawNetherWartBlock, drawWarpedWartBlock,
  drawPolishedBasaltSide, drawPolishedBasaltTop,
  drawEndStone, drawEndStoneBricks, drawPurpurBlock,
  drawPurpurPillarSide, drawPurpurPillarTop,
  drawPrismarine, drawPrismarineBricks, drawDarkPrismarine, drawSeaLantern,
  drawCraftingTableTop, drawCraftingTableSide,
  drawFurnaceSide, drawFurnaceFront, drawFurnaceTop,
  drawChestSide, drawChestFront, drawChestTop,
  drawEnchantingTableTop, drawEnchantingTableSide, drawBookshelf, drawJukeboxTop,
  drawBarrelTop, drawBarrelSide, drawDispenserFront, drawDropperFront,
  drawMineralBlock,
  drawBricks, drawTntSide, drawTntTop, drawTntBottom,
  drawSponge, drawWetSponge, drawMelonSide, drawMelonTop,
  drawCactusSide, drawCactusTop, drawPumpkinSide, drawPumpkinTop,
  drawJackOLantern, drawHayBaleSide, drawHayBaleTop,
  drawBoneBlockSide, drawBoneBlockTop, drawObsidian, drawCryingObsidian,
  drawGlass, drawSnowBlock,
  drawWheatStage0, drawWheatStage7, drawFarmlandTop, drawFarmlandSide,
  drawQuartzBlockSide, drawQuartzBlockTop, drawSmoothQuartz,
  drawChiseledQuartz, drawQuartzPillarSide,
  drawMagmaBlock, drawSlimeBlock, drawHoneyBlock, drawHoneycombBlock,
  drawDriedKelpBlock, drawCopperBlock, drawAncientDebrisSide, drawAncientDebrisTop,
  drawEndRod, drawCobweb,
  drawRedstoneDust, drawRepeaterTop, drawComparatorTop,
  drawPistonSide, drawPistonTop, drawPistonBottom,
  drawObserverFront, drawObserverSide, drawNoteBlock, drawTarget,
} from './tex-draw-structures';

import {
  DYE_COLORS, TERRACOTTA_COLORS, GLAZED_COLORS, CORAL_COLORS,
  drawWool, drawConcrete, drawTerracotta, drawGlazedTerracotta,
  drawStainedGlass, drawConcretePowder, drawCoralBlock,
} from './tex-draw-colored';

// =============================================================================
// ATLAS CREATION
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
