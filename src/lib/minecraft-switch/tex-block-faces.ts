// =============================================================================
// Block Face Textures — Maps block IDs to atlas texture indices,
// transparency and liquid sets
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================

import { Block } from '@/types/minecraft-switch';
import { TEX } from './tex-constants';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Shorthand for blocks that use the same texture on all faces. */
function allFaces(t: number) { return { top: t, bottom: t, side: t }; }

/** top/bottom same, side different. */
function _tbSide(tb: number, s: number) { return { top: tb, bottom: tb, side: s }; }

/** Log-style: top/bottom rings, side bark. */
function logFaces(topBottom: number, side: number) { return { top: topBottom, bottom: topBottom, side }; }

// =============================================================================
// BLOCK FACE TEXTURE MAPPING
// =============================================================================

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
