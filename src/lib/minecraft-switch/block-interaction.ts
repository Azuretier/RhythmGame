// =============================================================================
// Block Interaction System — Breaking, Placing, Raycasting, and Properties
// =============================================================================
// Implements the core block interaction mechanics for Minecraft: Nintendo Switch
// Edition clone. Covers break-time calculation, harvest checks, drop tables,
// placement validation, voxel raycasting (DDA/Amanatides), and block property
// lookups (hardness, preferred tool, required tier).
// =============================================================================

import {
  Block,
  BlockId,
  BlockFace,
  ToolCategory,
  MaterialTier,
  MATERIAL_TIER_LEVEL,
  MATERIAL_TIER_CONFIG,
  MS_CONFIG,
} from '@/types/minecraft-switch';
import type { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';

// =============================================================================
// Block Drop Result
// =============================================================================

export interface BlockDropResult {
  itemId: string;
  count: number;
}

// =============================================================================
// Raycast Hit Result
// =============================================================================

export interface RaycastHit {
  x: number;
  y: number;
  z: number;
  face: BlockFace;
  distance: number;
}

// =============================================================================
// Block Placement Result
// =============================================================================

export interface PlaceResult {
  blockId: BlockId;
  /** Metadata/rotation state for directional blocks. */
  rotation: number;
}

// =============================================================================
// BLOCK HARDNESS TABLE
// =============================================================================
// Hardness values in ticks to break with bare hands (at 20 tps).
// -1 = unbreakable (bedrock, barriers, command blocks).
// 0 = instant break (torches, flowers, crops, tall grass).

export const BLOCK_HARDNESS: Partial<Record<number, number>> = {
  // Terrain
  [Block.Stone]: 30,
  [Block.Granite]: 30,
  [Block.Diorite]: 30,
  [Block.Andesite]: 30,
  [Block.Grass]: 12,
  [Block.Dirt]: 10,
  [Block.CoarseDirt]: 10,
  [Block.Podzol]: 10,
  [Block.Cobblestone]: 40,
  [Block.PolishedGranite]: 30,
  [Block.PolishedDiorite]: 30,
  [Block.PolishedAndesite]: 30,
  [Block.Bedrock]: -1,
  [Block.Sand]: 10,
  [Block.RedSand]: 10,
  [Block.Gravel]: 12,
  [Block.Clay]: 12,
  [Block.Sandstone]: 16,
  [Block.RedSandstone]: 16,

  // Ores
  [Block.CoalOre]: 60,
  [Block.IronOre]: 60,
  [Block.GoldOre]: 60,
  [Block.DiamondOre]: 60,
  [Block.EmeraldOre]: 60,
  [Block.LapisOre]: 60,
  [Block.RedstoneOre]: 60,
  [Block.NetherQuartzOre]: 60,
  [Block.NetherGoldOre]: 60,
  [Block.AncientDebris]: 600,

  // Mineral Blocks
  [Block.CoalBlock]: 100,
  [Block.IronBlock]: 100,
  [Block.GoldBlock]: 60,
  [Block.DiamondBlock]: 100,
  [Block.EmeraldBlock]: 100,
  [Block.LapisBlock]: 60,
  [Block.RedstoneBlock]: 100,
  [Block.NetheriteBlock]: 1000,
  [Block.QuartzBlock]: 16,
  [Block.CopperBlock]: 60,

  // Wood (all variants share the same base hardness)
  [Block.OakLog]: 40,
  [Block.SpruceLog]: 40,
  [Block.BirchLog]: 40,
  [Block.JungleLog]: 40,
  [Block.AcaciaLog]: 40,
  [Block.DarkOakLog]: 40,
  [Block.OakPlanks]: 40,
  [Block.SprucePlanks]: 40,
  [Block.BirchPlanks]: 40,
  [Block.JunglePlanks]: 40,
  [Block.AcaciaPlanks]: 40,
  [Block.DarkOakPlanks]: 40,

  // Slabs / Stairs / Fences (wood)
  [Block.OakSlab]: 40,
  [Block.OakStairs]: 40,
  [Block.OakFence]: 40,
  [Block.OakFenceGate]: 40,
  [Block.OakDoor]: 60,
  [Block.OakTrapdoor]: 60,
  [Block.OakButton]: 0,
  [Block.OakPressurePlate]: 10,

  // Leaves
  [Block.OakLeaves]: 4,
  [Block.SpruceLeaves]: 4,
  [Block.BirchLeaves]: 4,
  [Block.JungleLeaves]: 4,
  [Block.AcaciaLeaves]: 4,
  [Block.DarkOakLeaves]: 4,

  // Liquids (unbreakable via normal means)
  [Block.Water]: -1,
  [Block.Lava]: -1,
  [Block.StillWater]: -1,
  [Block.StillLava]: -1,

  // Glass
  [Block.Glass]: 6,

  // Wool
  [Block.WhiteWool]: 16,

  // Plants
  [Block.TallGrass]: 0,
  [Block.Fern]: 0,
  [Block.DeadBush]: 0,
  [Block.Dandelion]: 0,
  [Block.Poppy]: 0,
  [Block.BlueOrchid]: 0,
  [Block.Allium]: 0,
  [Block.AzureBluet]: 0,
  [Block.RedTulip]: 0,
  [Block.Cactus]: 8,
  [Block.SugarCane]: 0,
  [Block.Vine]: 4,

  // Crops
  [Block.Farmland]: 12,
  [Block.Wheat]: 0,
  [Block.Carrots]: 0,
  [Block.Potatoes]: 0,
  [Block.Beetroots]: 0,
  [Block.MelonBlock]: 20,
  [Block.PumpkinBlock]: 20,

  // Utility
  [Block.CraftingTable]: 50,
  [Block.Furnace]: 70,
  [Block.BlastFurnace]: 70,
  [Block.Smoker]: 70,
  [Block.Anvil]: 100,
  [Block.ChippedAnvil]: 100,
  [Block.DamagedAnvil]: 100,
  [Block.EnchantingTable]: 100,
  [Block.BrewingStand]: 10,
  [Block.Grindstone]: 40,
  [Block.Stonecutter]: 70,

  // Storage
  [Block.Chest]: 50,
  [Block.TrappedChest]: 50,
  [Block.EnderChest]: 450,
  [Block.ShulkerBox]: 40,
  [Block.Hopper]: 60,
  [Block.Barrel]: 50,

  // Redstone
  [Block.RedstoneDust]: 0,
  [Block.RedstoneTorch]: 0,
  [Block.Lever]: 0,
  [Block.StoneButton]: 0,
  [Block.TNT]: 0,
  [Block.NoteBlock]: 16,
  [Block.Observer]: 70,
  [Block.Piston]: 30,
  [Block.StickyPiston]: 30,

  // Lighting
  [Block.Torch]: 0,
  [Block.Lantern]: 70,
  [Block.SoulLantern]: 70,

  // Stone Bricks
  [Block.StoneBricks]: 30,
  [Block.MossyStoneBricks]: 30,
  [Block.CrackedStoneBricks]: 30,
  [Block.ChiseledStoneBricks]: 30,
  [Block.MossyCobblestone]: 40,

  // Nether
  [Block.Netherrack]: 8,
  [Block.SoulSand]: 10,
  [Block.SoulSoil]: 10,
  [Block.Glowstone]: 6,
  [Block.NetherBricks]: 40,
  [Block.Basalt]: 25,
  [Block.Blackstone]: 30,
  [Block.CrimsonPlanks]: 40,
  [Block.WarpedPlanks]: 40,
  [Block.CrimsonStem]: 40,
  [Block.WarpedStem]: 40,

  // End
  [Block.EndStone]: 60,
  [Block.EndStoneBricks]: 60,
  [Block.PurpurBlock]: 30,

  // Prismarine
  [Block.Prismarine]: 30,
  [Block.PrismarineBricks]: 30,
  [Block.DarkPrismarine]: 30,
  [Block.SeaLantern]: 6,

  // Ice
  [Block.Ice]: 10,
  [Block.PackedIce]: 10,
  [Block.BlueIce]: 56,
  [Block.Snow]: 2,
  [Block.SnowBlock]: 4,
  [Block.SnowLayer]: 2,

  // Decoration
  [Block.Cobweb]: 80,
  [Block.Bookshelf]: 30,
  [Block.Ladder]: 8,
  [Block.IronBars]: 100,
  [Block.Sign]: 20,
  [Block.Bed]: 4,
  [Block.Cake]: 10,
  [Block.Carpet]: 2,
  [Block.DragonEgg]: 60,
  [Block.Beacon]: 60,

  // Building
  [Block.Bricks]: 40,
  [Block.SmoothStone]: 40,
  [Block.Obsidian]: 1000,
  [Block.CryingObsidian]: 1000,
  [Block.HayBale]: 10,
  [Block.BoneBlock]: 40,

  // Sponge
  [Block.Sponge]: 12,
  [Block.WetSponge]: 12,
  [Block.SlimeBlock]: 0,
  [Block.HoneyBlock]: 0,

  // Terracotta
  [Block.Terracotta]: 25,

  // Concrete
  [Block.WhiteConcrete]: 36,

  // Portal / Special
  [Block.NetherPortal]: -1,
  [Block.EndPortalFrame]: -1,
  [Block.EndPortal]: -1,
  [Block.Spawner]: 100,
  [Block.CommandBlock]: -1,
  [Block.StructureBlock]: -1,
  [Block.Barrier]: -1,

  // Campfire
  [Block.Campfire]: 40,
  [Block.SoulCampfire]: 40,
  [Block.MagmaBlock]: 10,
};

// =============================================================================
// BLOCK TOOL REQUIREMENTS
// =============================================================================
// Maps block IDs to { tool, minTier }. If a block is not in this map,
// it can be harvested with any tool or bare hands.

export interface BlockToolReq {
  tool: ToolCategory;
  minTier: number; // 0=hand, 1=wood, 2=stone, 3=iron, 4=diamond, 5=netherite
}

export const BLOCK_TOOL_REQUIREMENTS: Partial<Record<number, BlockToolReq>> = {
  // Stone family — pickaxe required, hand tier okay for drops
  [Block.Stone]: { tool: 'pickaxe', minTier: 1 },
  [Block.Cobblestone]: { tool: 'pickaxe', minTier: 1 },
  [Block.Granite]: { tool: 'pickaxe', minTier: 1 },
  [Block.Diorite]: { tool: 'pickaxe', minTier: 1 },
  [Block.Andesite]: { tool: 'pickaxe', minTier: 1 },
  [Block.PolishedGranite]: { tool: 'pickaxe', minTier: 1 },
  [Block.PolishedDiorite]: { tool: 'pickaxe', minTier: 1 },
  [Block.PolishedAndesite]: { tool: 'pickaxe', minTier: 1 },
  [Block.StoneBricks]: { tool: 'pickaxe', minTier: 1 },
  [Block.MossyStoneBricks]: { tool: 'pickaxe', minTier: 1 },
  [Block.CrackedStoneBricks]: { tool: 'pickaxe', minTier: 1 },
  [Block.ChiseledStoneBricks]: { tool: 'pickaxe', minTier: 1 },
  [Block.MossyCobblestone]: { tool: 'pickaxe', minTier: 1 },
  [Block.Sandstone]: { tool: 'pickaxe', minTier: 1 },
  [Block.RedSandstone]: { tool: 'pickaxe', minTier: 1 },
  [Block.SmoothStone]: { tool: 'pickaxe', minTier: 1 },
  [Block.Bricks]: { tool: 'pickaxe', minTier: 1 },

  // Ores
  [Block.CoalOre]: { tool: 'pickaxe', minTier: 1 },
  [Block.IronOre]: { tool: 'pickaxe', minTier: 2 },
  [Block.GoldOre]: { tool: 'pickaxe', minTier: 3 },
  [Block.DiamondOre]: { tool: 'pickaxe', minTier: 3 },
  [Block.EmeraldOre]: { tool: 'pickaxe', minTier: 3 },
  [Block.LapisOre]: { tool: 'pickaxe', minTier: 2 },
  [Block.RedstoneOre]: { tool: 'pickaxe', minTier: 3 },
  [Block.NetherQuartzOre]: { tool: 'pickaxe', minTier: 1 },
  [Block.NetherGoldOre]: { tool: 'pickaxe', minTier: 1 },
  [Block.AncientDebris]: { tool: 'pickaxe', minTier: 4 },

  // Mineral Blocks
  [Block.CoalBlock]: { tool: 'pickaxe', minTier: 1 },
  [Block.IronBlock]: { tool: 'pickaxe', minTier: 2 },
  [Block.GoldBlock]: { tool: 'pickaxe', minTier: 3 },
  [Block.DiamondBlock]: { tool: 'pickaxe', minTier: 3 },
  [Block.EmeraldBlock]: { tool: 'pickaxe', minTier: 3 },
  [Block.LapisBlock]: { tool: 'pickaxe', minTier: 2 },
  [Block.RedstoneBlock]: { tool: 'pickaxe', minTier: 3 },
  [Block.NetheriteBlock]: { tool: 'pickaxe', minTier: 4 },
  [Block.QuartzBlock]: { tool: 'pickaxe', minTier: 1 },
  [Block.CopperBlock]: { tool: 'pickaxe', minTier: 2 },

  // Obsidian
  [Block.Obsidian]: { tool: 'pickaxe', minTier: 4 },
  [Block.CryingObsidian]: { tool: 'pickaxe', minTier: 4 },

  // Nether stone-type
  [Block.Netherrack]: { tool: 'pickaxe', minTier: 1 },
  [Block.NetherBricks]: { tool: 'pickaxe', minTier: 1 },
  [Block.Basalt]: { tool: 'pickaxe', minTier: 1 },
  [Block.Blackstone]: { tool: 'pickaxe', minTier: 1 },
  [Block.PolishedBasalt]: { tool: 'pickaxe', minTier: 1 },
  [Block.PolishedBlackstone]: { tool: 'pickaxe', minTier: 1 },
  [Block.PolishedBlackstoneBricks]: { tool: 'pickaxe', minTier: 1 },

  // End stone-type
  [Block.EndStone]: { tool: 'pickaxe', minTier: 1 },
  [Block.EndStoneBricks]: { tool: 'pickaxe', minTier: 1 },
  [Block.PurpurBlock]: { tool: 'pickaxe', minTier: 1 },

  // Prismarine
  [Block.Prismarine]: { tool: 'pickaxe', minTier: 1 },
  [Block.PrismarineBricks]: { tool: 'pickaxe', minTier: 1 },
  [Block.DarkPrismarine]: { tool: 'pickaxe', minTier: 1 },

  // Utility blocks with pickaxe
  [Block.Furnace]: { tool: 'pickaxe', minTier: 1 },
  [Block.BlastFurnace]: { tool: 'pickaxe', minTier: 1 },
  [Block.Smoker]: { tool: 'pickaxe', minTier: 1 },
  [Block.Anvil]: { tool: 'pickaxe', minTier: 1 },
  [Block.ChippedAnvil]: { tool: 'pickaxe', minTier: 1 },
  [Block.DamagedAnvil]: { tool: 'pickaxe', minTier: 1 },
  [Block.EnchantingTable]: { tool: 'pickaxe', minTier: 1 },
  [Block.Stonecutter]: { tool: 'pickaxe', minTier: 1 },
  [Block.Grindstone]: { tool: 'pickaxe', minTier: 1 },
  [Block.Hopper]: { tool: 'pickaxe', minTier: 1 },
  [Block.Lantern]: { tool: 'pickaxe', minTier: 1 },
  [Block.SoulLantern]: { tool: 'pickaxe', minTier: 1 },
  [Block.IronBars]: { tool: 'pickaxe', minTier: 1 },
  [Block.Beacon]: { tool: 'pickaxe', minTier: 1 },
  [Block.Observer]: { tool: 'pickaxe', minTier: 1 },

  // Spawner
  [Block.Spawner]: { tool: 'pickaxe', minTier: 1 },

  // EnderChest
  [Block.EnderChest]: { tool: 'pickaxe', minTier: 1 },

  // Terracotta / Concrete (pickaxe)
  [Block.Terracotta]: { tool: 'pickaxe', minTier: 1 },
  [Block.WhiteConcrete]: { tool: 'pickaxe', minTier: 1 },

  // Dirt family — shovel
  [Block.Dirt]: { tool: 'shovel', minTier: 0 },
  [Block.CoarseDirt]: { tool: 'shovel', minTier: 0 },
  [Block.Podzol]: { tool: 'shovel', minTier: 0 },
  [Block.Grass]: { tool: 'shovel', minTier: 0 },
  [Block.Sand]: { tool: 'shovel', minTier: 0 },
  [Block.RedSand]: { tool: 'shovel', minTier: 0 },
  [Block.Gravel]: { tool: 'shovel', minTier: 0 },
  [Block.Clay]: { tool: 'shovel', minTier: 0 },
  [Block.SoulSand]: { tool: 'shovel', minTier: 0 },
  [Block.SoulSoil]: { tool: 'shovel', minTier: 0 },
  [Block.Snow]: { tool: 'shovel', minTier: 0 },
  [Block.SnowBlock]: { tool: 'shovel', minTier: 1 },
  [Block.SnowLayer]: { tool: 'shovel', minTier: 0 },
  [Block.Farmland]: { tool: 'shovel', minTier: 0 },
  [Block.Mycelium]: { tool: 'shovel', minTier: 0 },

  // Wood — axe
  [Block.OakLog]: { tool: 'axe', minTier: 0 },
  [Block.SpruceLog]: { tool: 'axe', minTier: 0 },
  [Block.BirchLog]: { tool: 'axe', minTier: 0 },
  [Block.JungleLog]: { tool: 'axe', minTier: 0 },
  [Block.AcaciaLog]: { tool: 'axe', minTier: 0 },
  [Block.DarkOakLog]: { tool: 'axe', minTier: 0 },
  [Block.OakPlanks]: { tool: 'axe', minTier: 0 },
  [Block.SprucePlanks]: { tool: 'axe', minTier: 0 },
  [Block.BirchPlanks]: { tool: 'axe', minTier: 0 },
  [Block.JunglePlanks]: { tool: 'axe', minTier: 0 },
  [Block.AcaciaPlanks]: { tool: 'axe', minTier: 0 },
  [Block.DarkOakPlanks]: { tool: 'axe', minTier: 0 },
  [Block.CraftingTable]: { tool: 'axe', minTier: 0 },
  [Block.Chest]: { tool: 'axe', minTier: 0 },
  [Block.TrappedChest]: { tool: 'axe', minTier: 0 },
  [Block.Barrel]: { tool: 'axe', minTier: 0 },
  [Block.Bookshelf]: { tool: 'axe', minTier: 0 },
  [Block.NoteBlock]: { tool: 'axe', minTier: 0 },
  [Block.Jukebox]: { tool: 'axe', minTier: 0 },
  [Block.CrimsonPlanks]: { tool: 'axe', minTier: 0 },
  [Block.WarpedPlanks]: { tool: 'axe', minTier: 0 },
  [Block.CrimsonStem]: { tool: 'axe', minTier: 0 },
  [Block.WarpedStem]: { tool: 'axe', minTier: 0 },
  [Block.Campfire]: { tool: 'axe', minTier: 0 },
  [Block.SoulCampfire]: { tool: 'axe', minTier: 0 },
  [Block.HayBale]: { tool: 'axe', minTier: 0 },

  // Shears
  [Block.Cobweb]: { tool: 'shears', minTier: 0 },
  [Block.Vine]: { tool: 'shears', minTier: 0 },

  // Hoe
  [Block.MelonBlock]: { tool: 'hoe', minTier: 0 },
  [Block.PumpkinBlock]: { tool: 'hoe', minTier: 0 },
};

// =============================================================================
// DEFAULT DROP TABLE
// =============================================================================
// Maps block IDs to their normal drops. Blocks not in this map drop themselves.

const DEFAULT_DROPS: Partial<Record<number, BlockDropResult[]>> = {
  [Block.Stone]: [{ itemId: 'cobblestone', count: 1 }],
  [Block.Grass]: [{ itemId: 'dirt', count: 1 }],
  [Block.CoalOre]: [{ itemId: 'coal', count: 1 }],
  [Block.DiamondOre]: [{ itemId: 'diamond', count: 1 }],
  [Block.EmeraldOre]: [{ itemId: 'emerald', count: 1 }],
  [Block.LapisOre]: [{ itemId: 'lapis_lazuli', count: 4 }],
  [Block.RedstoneOre]: [{ itemId: 'redstone_dust', count: 4 }],
  [Block.NetherQuartzOre]: [{ itemId: 'nether_quartz', count: 1 }],
  [Block.NetherGoldOre]: [{ itemId: 'gold_nugget', count: 4 }],
  [Block.Glowstone]: [{ itemId: 'glowstone_dust', count: 3 }],
  [Block.SeaLantern]: [{ itemId: 'prismarine_crystals', count: 3 }],
  [Block.Bookshelf]: [{ itemId: 'book', count: 3 }],
  [Block.Glass]: [], // Glass drops nothing without silk touch
  [Block.Ice]: [], // Ice drops nothing without silk touch
  [Block.OakLeaves]: [{ itemId: 'oak_sapling', count: 1 }], // simplified
  [Block.SpruceLeaves]: [{ itemId: 'spruce_sapling', count: 1 }],
  [Block.BirchLeaves]: [{ itemId: 'birch_sapling', count: 1 }],
  [Block.JungleLeaves]: [{ itemId: 'jungle_sapling', count: 1 }],
  [Block.AcaciaLeaves]: [{ itemId: 'acacia_sapling', count: 1 }],
  [Block.DarkOakLeaves]: [{ itemId: 'dark_oak_sapling', count: 1 }],
  [Block.Clay]: [{ itemId: 'clay_ball', count: 4 }],
  [Block.SnowBlock]: [{ itemId: 'snowball', count: 4 }],
  [Block.SnowLayer]: [{ itemId: 'snowball', count: 1 }],
  [Block.MelonBlock]: [{ itemId: 'melon_slice', count: 4 }],
  [Block.Wheat]: [{ itemId: 'wheat', count: 1 }],
  [Block.Carrots]: [{ itemId: 'carrot', count: 1 }],
  [Block.Potatoes]: [{ itemId: 'potato', count: 1 }],
  [Block.Beetroots]: [{ itemId: 'beetroot', count: 1 }],
  [Block.Gravel]: [{ itemId: 'gravel', count: 1 }], // 10% chance flint, simplified
  [Block.TallGrass]: [], // Chance of seeds, simplified
  [Block.Fern]: [],
  [Block.DeadBush]: [{ itemId: 'stick', count: 1 }],
  [Block.Cobweb]: [{ itemId: 'string', count: 1 }],
  [Block.Bed]: [{ itemId: 'bed', count: 1 }],
  [Block.Cake]: [], // Cake cannot be recovered
  [Block.Spawner]: [], // Spawner drops nothing
};

// =============================================================================
// SILK TOUCH BLOCKS
// =============================================================================
// Blocks that can be obtained with Silk Touch (normally drop something else).

const SILK_TOUCH_BLOCKS: Set<number> = new Set([
  Block.Stone,
  Block.Grass,
  Block.Glass,
  Block.Ice,
  Block.PackedIce,
  Block.BlueIce,
  Block.CoalOre,
  Block.DiamondOre,
  Block.EmeraldOre,
  Block.LapisOre,
  Block.RedstoneOre,
  Block.NetherQuartzOre,
  Block.NetherGoldOre,
  Block.Glowstone,
  Block.SeaLantern,
  Block.Bookshelf,
  Block.Cobweb,
  Block.MelonBlock,
  Block.OakLeaves,
  Block.SpruceLeaves,
  Block.BirchLeaves,
  Block.JungleLeaves,
  Block.AcaciaLeaves,
  Block.DarkOakLeaves,
  Block.Clay,
  Block.SnowBlock,
  Block.Mycelium,
]);

// =============================================================================
// FORTUNE-APPLICABLE ORES
// =============================================================================
// Ores whose drop count is multiplied by Fortune enchantment.

const FORTUNE_ORES: Set<number> = new Set([
  Block.CoalOre,
  Block.DiamondOre,
  Block.EmeraldOre,
  Block.LapisOre,
  Block.RedstoneOre,
  Block.NetherQuartzOre,
  Block.NetherGoldOre,
]);

// =============================================================================
// NON-SOLID BLOCKS (cannot be targeted for adjacent placement)
// =============================================================================

const NON_SOLID_BLOCKS: Set<number> = new Set([
  Block.Air,
  Block.Water,
  Block.Lava,
  Block.StillWater,
  Block.StillLava,
  Block.TallGrass,
  Block.Fern,
  Block.DeadBush,
  Block.Dandelion,
  Block.Poppy,
  Block.BlueOrchid,
  Block.Allium,
  Block.AzureBluet,
  Block.RedTulip,
  Block.OrangeTulip,
  Block.WhiteTulip,
  Block.PinkTulip,
  Block.OxeyeDaisy,
  Block.Sunflower,
  Block.Lilac,
  Block.Peony,
  Block.RoseBush,
  Block.SugarCane,
  Block.Vine,
  Block.Wheat,
  Block.Carrots,
  Block.Potatoes,
  Block.Beetroots,
  Block.NetherWart,
  Block.SweetBerryBush,
  Block.RedstoneDust,
  Block.RedstoneTorch,
  Block.Torch,
  Block.SnowLayer,
  Block.Rail,
  Block.PoweredRail,
  Block.DetectorRail,
  Block.ActivatorRail,
  Block.Carpet,
  Block.LilyPad,
  Block.Kelp,
  Block.SeaGrass,
  Block.TallSeaGrass,
]);

// =============================================================================
// Block-to-item ID mapping (block name to corresponding item string ID).
// Used when a block drops itself.
// =============================================================================

function blockIdToItemId(blockId: number): string {
  const blockEntries = Object.entries(Block);
  for (const [name, id] of blockEntries) {
    if (id === blockId) {
      // Convert PascalCase to snake_case
      return name.replace(/([A-Z])/g, (match, p1, offset) =>
        (offset > 0 ? '_' : '') + p1.toLowerCase()
      );
    }
  }
  return 'air';
}

// =============================================================================
// BLOCK PROPERTY LOOKUPS
// =============================================================================

/**
 * Get the hardness of a block in ticks (at 20 tps).
 * Returns -1 for unbreakable blocks and 0 for instant-break blocks.
 * Defaults to 15 ticks if the block is not in the hardness table.
 */
export function getBlockHardness(blockId: number): number {
  return BLOCK_HARDNESS[blockId] ?? 15;
}

/**
 * Get the preferred tool category for mining a block.
 * Returns 'none' if any tool works equally well.
 */
export function getBlockPreferredTool(blockId: number): ToolCategory {
  return BLOCK_TOOL_REQUIREMENTS[blockId]?.tool ?? 'none';
}

/**
 * Get the minimum material tier required to harvest a block's drops.
 * Returns 0 (hand) if no tool requirement is specified.
 */
export function getBlockRequiredTier(blockId: number): number {
  return BLOCK_TOOL_REQUIREMENTS[blockId]?.minTier ?? 0;
}

/**
 * Check if a block is solid (has full collision).
 */
export function isBlockSolid(blockId: number): boolean {
  return !NON_SOLID_BLOCKS.has(blockId) && blockId !== Block.Air;
}

// =============================================================================
// TOOL ITEM PARSING
// =============================================================================

/** Parse tool category and tier from an item ID string (e.g., 'diamond_pickaxe'). */
function parseToolItem(toolItemId: string | null): { category: ToolCategory; tier: MaterialTier } {
  if (!toolItemId) return { category: 'none', tier: 'hand' };

  const toolCategories: ToolCategory[] = ['pickaxe', 'axe', 'shovel', 'hoe', 'sword', 'shears'];
  const tiers: MaterialTier[] = ['netherite', 'diamond', 'iron', 'stone', 'wood'];

  let category: ToolCategory = 'none';
  let tier: MaterialTier = 'hand';

  for (const tc of toolCategories) {
    if (toolItemId.includes(tc)) {
      category = tc;
      break;
    }
  }

  if (toolItemId === 'shears') {
    return { category: 'shears', tier: 'iron' };
  }

  for (const t of tiers) {
    if (toolItemId.startsWith(t)) {
      tier = t;
      break;
    }
  }

  return { category, tier };
}

// =============================================================================
// BLOCK BREAKING
// =============================================================================

/**
 * Calculate the number of ticks required to break a block.
 *
 * @param blockId - The block being broken.
 * @param toolItemId - Item ID of the tool being used (e.g., 'diamond_pickaxe'), or null for bare hands.
 * @param toolTier - Override tier if known; otherwise parsed from toolItemId.
 * @param inWater - Whether the player is submerged in water.
 * @param onGround - Whether the player is standing on solid ground.
 * @param hasteLevel - Haste potion effect level (0 = none, 1 = Haste I, 2 = Haste II).
 * @param miningFatigueLevel - Mining Fatigue effect level (0 = none).
 * @returns Number of ticks to break the block. -1 if the block is unbreakable.
 */
export function getBreakTime(
  blockId: number,
  toolItemId: string | null = null,
  toolTier: MaterialTier | null = null,
  inWater: boolean = false,
  onGround: boolean = true,
  hasteLevel: number = 0,
  miningFatigueLevel: number = 0,
): number {
  const hardness = getBlockHardness(blockId);

  // Unbreakable blocks
  if (hardness < 0) return -1;

  // Instant-break blocks
  if (hardness === 0) return 0;

  const { category: toolCategory, tier: parsedTier } = parseToolItem(toolItemId);
  const effectiveTier = toolTier ?? parsedTier;
  const tierConfig = MATERIAL_TIER_CONFIG[effectiveTier];

  const requirement = BLOCK_TOOL_REQUIREMENTS[blockId];
  const preferredTool = requirement?.tool ?? 'none';

  // Calculate base speed multiplier
  let speedMultiplier = 1.0;

  if (preferredTool !== 'none' && toolCategory === preferredTool) {
    // Correct tool — use tier mining speed
    speedMultiplier = tierConfig.miningSpeed;
  } else if (toolCategory !== 'none' && toolCategory !== preferredTool) {
    // Wrong tool — default hand speed
    speedMultiplier = 1.0;
  }

  // Haste modifier: +20% speed per level (multiplicative with base)
  if (hasteLevel > 0) {
    speedMultiplier *= (1.0 + 0.2 * hasteLevel);
  }

  // Mining Fatigue modifier: multiply by 0.3^level
  if (miningFatigueLevel > 0) {
    speedMultiplier *= Math.pow(0.3, miningFatigueLevel);
  }

  // Calculate damage per tick
  let damage = speedMultiplier / hardness;

  // Check if the tool can harvest this block
  if (requirement) {
    const tierLevel = MATERIAL_TIER_LEVEL[effectiveTier];
    if (toolCategory !== requirement.tool || tierLevel < requirement.minTier) {
      // Cannot harvest with this tool — mining is 3.33x slower
      damage /= 3.333;
    }
  }

  // Penalties
  if (inWater) {
    damage /= 5.0; // 5x slower underwater (unless Aqua Affinity)
  }
  if (!onGround) {
    damage /= 5.0; // 5x slower while airborne
  }

  // Calculate ticks needed
  if (damage >= 1.0) return 0; // Instant break

  const ticks = Math.ceil(1.0 / damage);
  return ticks;
}

/**
 * Determine whether a tool can harvest a block's drops.
 * If false, the block breaks but drops nothing.
 */
export function canHarvest(
  blockId: number,
  toolItemId: string | null = null,
  toolTier: MaterialTier | null = null,
): boolean {
  const requirement = BLOCK_TOOL_REQUIREMENTS[blockId];

  // No requirement — any tool (or bare hands) can harvest
  if (!requirement) return true;

  const { category: toolCategory, tier: parsedTier } = parseToolItem(toolItemId);
  const effectiveTier = toolTier ?? parsedTier;
  const tierLevel = MATERIAL_TIER_LEVEL[effectiveTier];

  // Must use the correct tool category and meet the minimum tier
  if (toolCategory !== requirement.tool) return false;
  if (tierLevel < requirement.minTier) return false;

  return true;
}

/**
 * Get the items dropped when a block is broken.
 *
 * @param blockId - The block being broken.
 * @param toolItemId - Item ID of the tool used.
 * @param fortuneLevel - Fortune enchantment level (0 = none).
 * @param silkTouch - Whether Silk Touch is applied.
 * @returns Array of dropped items with counts.
 */
export function getBlockDrops(
  blockId: number,
  toolItemId: string | null = null,
  fortuneLevel: number = 0,
  silkTouch: boolean = false,
): BlockDropResult[] {
  // Air and unbreakable blocks drop nothing
  if (blockId === Block.Air || getBlockHardness(blockId) < 0) return [];

  // Check harvest permission
  if (!canHarvest(blockId, toolItemId)) return [];

  // Silk Touch: drop the block itself if applicable
  if (silkTouch && SILK_TOUCH_BLOCKS.has(blockId)) {
    const itemId = blockIdToItemId(blockId);
    return [{ itemId, count: 1 }];
  }

  // Custom drop table
  const customDrops = DEFAULT_DROPS[blockId];
  if (customDrops !== undefined) {
    if (customDrops.length === 0) return [];

    // Apply Fortune to applicable ores
    return customDrops.map(drop => {
      let count = drop.count;
      if (fortuneLevel > 0 && FORTUNE_ORES.has(blockId)) {
        // Fortune formula: multiply drops by 1 + random(0, fortuneLevel)
        // Simplified: on average, fortune adds ~(fortuneLevel * 0.5) extra drops
        const bonus = Math.floor(Math.random() * (fortuneLevel + 1));
        count = count * (1 + bonus);
      }
      return { itemId: drop.itemId, count };
    });
  }

  // Default: drop the block itself
  const itemId = blockIdToItemId(blockId);
  return [{ itemId, count: 1 }];
}

// =============================================================================
// BLOCK PLACEMENT
// =============================================================================

/**
 * Validate whether a block can be placed at the target position.
 *
 * @param blockId - The block to place.
 * @param targetX - World X coordinate of placement.
 * @param targetY - World Y coordinate of placement.
 * @param targetZ - World Z coordinate of placement.
 * @param faceDirection - Which face of the adjacent block was clicked.
 * @param world - The ChunkedWorld instance for neighbor lookups.
 * @returns True if placement is valid.
 */
export function canPlaceBlock(
  blockId: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  faceDirection: BlockFace,
  world: ChunkedWorld,
): boolean {
  // Cannot place outside world bounds
  if (targetY < 0 || targetY >= MS_CONFIG.WORLD_HEIGHT) return false;

  // Target position must be air or a replaceable block (water, lava, tall grass, etc.)
  const existingBlock = world.getBlock(targetX, targetY, targetZ);
  const replaceableBlocks = new Set<number>([
    Block.Air, Block.Water, Block.StillWater,
    Block.Lava, Block.StillLava,
    Block.TallGrass, Block.Fern, Block.DeadBush,
    Block.SnowLayer,
  ]);
  if (!replaceableBlocks.has(existingBlock)) return false;

  // Must have at least one adjacent solid block (support)
  const neighbors = [
    [targetX + 1, targetY, targetZ],
    [targetX - 1, targetY, targetZ],
    [targetX, targetY + 1, targetZ],
    [targetX, targetY - 1, targetZ],
    [targetX, targetY, targetZ + 1],
    [targetX, targetY, targetZ - 1],
  ];

  let hasSupport = false;
  for (const [nx, ny, nz] of neighbors) {
    const neighbor = world.getBlock(nx, ny, nz);
    if (isBlockSolid(neighbor)) {
      hasSupport = true;
      break;
    }
  }

  if (!hasSupport) return false;

  // Special placement rules
  // Torches need a wall or floor
  if (blockId === Block.Torch || blockId === Block.RedstoneTorch) {
    if (faceDirection === 'bottom') return false; // Cannot place torch on ceiling
    if (faceDirection !== 'top') {
      // Wall torch — the face block must be solid
      const supportPos = getAdjacentPosition(targetX, targetY, targetZ, oppositeFace(faceDirection));
      const supportBlock = world.getBlock(supportPos.x, supportPos.y, supportPos.z);
      if (!isBlockSolid(supportBlock)) return false;
    } else {
      // Floor torch — block below must be solid
      const below = world.getBlock(targetX, targetY - 1, targetZ);
      if (!isBlockSolid(below)) return false;
    }
  }

  // Doors need 2 blocks of vertical space
  if (isDoorBlock(blockId)) {
    if (targetY + 1 >= MS_CONFIG.WORLD_HEIGHT) return false;
    const above = world.getBlock(targetX, targetY + 1, targetZ);
    if (!replaceableBlocks.has(above)) return false;
    // Must be placed on a solid floor
    const below = world.getBlock(targetX, targetY - 1, targetZ);
    if (!isBlockSolid(below)) return false;
  }

  // Beds need 2 horizontal blocks
  if (blockId === Block.Bed) {
    const nextPos = getDirectionalNeighbor(targetX, targetZ, faceDirection);
    const nextBlock = world.getBlock(nextPos.x, targetY, nextPos.z);
    if (!replaceableBlocks.has(nextBlock)) return false;
    // Must be on solid floor
    const below = world.getBlock(targetX, targetY - 1, targetZ);
    if (!isBlockSolid(below)) return false;
  }

  // Cactus needs sand below and no adjacent solid blocks
  if (blockId === Block.Cactus) {
    const below = world.getBlock(targetX, targetY - 1, targetZ);
    if (below !== Block.Sand && below !== Block.RedSand && below !== Block.Cactus) return false;
    // No solid neighbors on horizontal sides
    const horizontalNeighbors = [
      world.getBlock(targetX + 1, targetY, targetZ),
      world.getBlock(targetX - 1, targetY, targetZ),
      world.getBlock(targetX, targetY, targetZ + 1),
      world.getBlock(targetX, targetY, targetZ - 1),
    ];
    for (const nb of horizontalNeighbors) {
      if (isBlockSolid(nb)) return false;
    }
  }

  // Sugar cane needs water-adjacent and dirt/sand/grass below
  if (blockId === Block.SugarCane) {
    const below = world.getBlock(targetX, targetY - 1, targetZ);
    const validGround = new Set<number>([Block.Grass, Block.Dirt, Block.CoarseDirt, Block.Podzol, Block.Sand, Block.RedSand, Block.SugarCane]);
    if (!validGround.has(below)) return false;
  }

  return true;
}

/**
 * Get the resulting block and rotation when placing a block.
 * Handles directional blocks (logs, stairs, pistons, etc.).
 *
 * @param blockId - The block item being placed.
 * @param faceDirection - Which face of the adjacent block was clicked.
 * @param playerYaw - Player's horizontal rotation in degrees (0-360).
 * @returns The block to actually place with its rotation metadata.
 */
export function getPlaceResult(
  blockId: number,
  faceDirection: BlockFace,
  playerYaw: number,
): PlaceResult {
  // Logs rotate based on the face they are placed against
  if (isLogBlock(blockId)) {
    let rotation = 0; // 0 = Y-axis (up/down), 1 = X-axis (east/west), 2 = Z-axis (north/south)
    if (faceDirection === 'east' || faceDirection === 'west') {
      rotation = 1;
    } else if (faceDirection === 'north' || faceDirection === 'south') {
      rotation = 2;
    }
    return { blockId: blockId as BlockId, rotation };
  }

  // Stairs orient based on player direction
  if (isStairBlock(blockId)) {
    const rotation = yawToCardinalRotation(playerYaw);
    return { blockId: blockId as BlockId, rotation };
  }

  // Pistons/observers/dispensers face toward the player
  if (isDirectionalBlock(blockId)) {
    if (faceDirection === 'top' || faceDirection === 'bottom') {
      const rotation = faceDirection === 'top' ? 0 : 1;
      return { blockId: blockId as BlockId, rotation };
    }
    const rotation = faceToRotation(faceDirection);
    return { blockId: blockId as BlockId, rotation };
  }

  // Doors, signs, etc. face based on player yaw
  if (isDoorBlock(blockId) || blockId === Block.Sign) {
    const rotation = yawToCardinalRotation(playerYaw);
    return { blockId: blockId as BlockId, rotation };
  }

  return { blockId: blockId as BlockId, rotation: 0 };
}

// =============================================================================
// RAYCASTING (DDA / Amanatides & Woo Algorithm)
// =============================================================================

/**
 * Cast a ray through the voxel world to find the first solid block hit.
 * Uses the DDA (Digital Differential Analyzer) / Amanatides & Woo algorithm
 * for efficient voxel traversal.
 *
 * @param origin - Ray start position [x, y, z].
 * @param direction - Normalized ray direction [dx, dy, dz].
 * @param maxDistance - Maximum distance to trace (4.5 survival, 5 creative).
 * @param world - The ChunkedWorld instance for block lookups.
 * @returns Hit result with block coordinates, face, and distance, or null if no hit.
 */
export function raycastBlock(
  origin: [number, number, number],
  direction: [number, number, number],
  maxDistance: number,
  world: ChunkedWorld,
): RaycastHit | null {
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;

  // Avoid division by zero
  const epsilon = 1e-10;
  const dirX = Math.abs(dx) < epsilon ? epsilon : dx;
  const dirY = Math.abs(dy) < epsilon ? epsilon : dy;
  const dirZ = Math.abs(dz) < epsilon ? epsilon : dz;

  // Current voxel position (floor to get block coordinates)
  let voxelX = Math.floor(ox);
  let voxelY = Math.floor(oy);
  let voxelZ = Math.floor(oz);

  // Step direction (1 or -1)
  const stepX = dirX > 0 ? 1 : -1;
  const stepY = dirY > 0 ? 1 : -1;
  const stepZ = dirZ > 0 ? 1 : -1;

  // tDelta: how far along the ray (in t units) to cross one voxel in each axis
  const tDeltaX = Math.abs(1.0 / dirX);
  const tDeltaY = Math.abs(1.0 / dirY);
  const tDeltaZ = Math.abs(1.0 / dirZ);

  // tMax: distance along the ray to the next voxel boundary in each axis
  let tMaxX = stepX > 0
    ? (Math.ceil(ox) - ox) * tDeltaX
    : (ox - Math.floor(ox)) * tDeltaX;
  let tMaxY = stepY > 0
    ? (Math.ceil(oy) - oy) * tDeltaY
    : (oy - Math.floor(oy)) * tDeltaY;
  let tMaxZ = stepZ > 0
    ? (Math.ceil(oz) - oz) * tDeltaZ
    : (oz - Math.floor(oz)) * tDeltaZ;

  // Handle exact integer positions
  if (tMaxX === 0) tMaxX = tDeltaX;
  if (tMaxY === 0) tMaxY = tDeltaY;
  if (tMaxZ === 0) tMaxZ = tDeltaZ;

  let distance = 0;
  let lastFace: BlockFace = 'top';

  // Traverse voxels
  while (distance < maxDistance) {
    // Check the current voxel
    if (voxelY >= 0 && voxelY < MS_CONFIG.WORLD_HEIGHT) {
      const blockId = world.getBlock(voxelX, voxelY, voxelZ);
      if (blockId !== Block.Air && isBlockSolid(blockId)) {
        return {
          x: voxelX,
          y: voxelY,
          z: voxelZ,
          face: lastFace,
          distance,
        };
      }
    }

    // Advance to the next voxel boundary
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        distance = tMaxX;
        voxelX += stepX;
        tMaxX += tDeltaX;
        lastFace = stepX > 0 ? 'west' : 'east';
      } else {
        distance = tMaxZ;
        voxelZ += stepZ;
        tMaxZ += tDeltaZ;
        lastFace = stepZ > 0 ? 'north' : 'south';
      }
    } else {
      if (tMaxY < tMaxZ) {
        distance = tMaxY;
        voxelY += stepY;
        tMaxY += tDeltaY;
        lastFace = stepY > 0 ? 'bottom' : 'top';
      } else {
        distance = tMaxZ;
        voxelZ += stepZ;
        tMaxZ += tDeltaZ;
        lastFace = stepZ > 0 ? 'north' : 'south';
      }
    }
  }

  return null;
}

/**
 * Given a hit block position and the face that was hit, compute the adjacent
 * position where a new block would be placed.
 */
export function getAdjacentPosition(
  hitX: number,
  hitY: number,
  hitZ: number,
  face: BlockFace,
): { x: number; y: number; z: number } {
  switch (face) {
    case 'top':    return { x: hitX, y: hitY + 1, z: hitZ };
    case 'bottom': return { x: hitX, y: hitY - 1, z: hitZ };
    case 'north':  return { x: hitX, y: hitY, z: hitZ - 1 };
    case 'south':  return { x: hitX, y: hitY, z: hitZ + 1 };
    case 'east':   return { x: hitX + 1, y: hitY, z: hitZ };
    case 'west':   return { x: hitX - 1, y: hitY, z: hitZ };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get the opposite face direction. */
function oppositeFace(face: BlockFace): BlockFace {
  switch (face) {
    case 'top':    return 'bottom';
    case 'bottom': return 'top';
    case 'north':  return 'south';
    case 'south':  return 'north';
    case 'east':   return 'west';
    case 'west':   return 'east';
  }
}

const LOG_BLOCKS = new Set<number>([
  Block.OakLog, Block.SpruceLog, Block.BirchLog,
  Block.JungleLog, Block.AcaciaLog, Block.DarkOakLog,
  Block.CrimsonStem, Block.WarpedStem,
  Block.BoneBlock, Block.HayBale, Block.QuartzPillar, Block.PurpurPillar,
  Block.Basalt, Block.PolishedBasalt,
]);

const STAIR_BLOCKS = new Set<number>([
  Block.OakStairs, Block.SpruceStairs, Block.BirchStairs,
  Block.JungleStairs, Block.AcaciaStairs, Block.DarkOakStairs,
  Block.StoneStairs, Block.CobblestoneStairs, Block.SandstoneStairs,
  Block.BrickStairs, Block.StoneBrickStairs, Block.NetherBrickStairs,
  Block.QuartzStairs, Block.RedSandstoneStairs,
  Block.PrismarineStairs, Block.PrismarineBrickStairs,
  Block.PurpurStairs,
]);

const DOOR_BLOCKS = new Set<number>([
  Block.OakDoor, Block.SpruceDoor, Block.BirchDoor,
  Block.JungleDoor, Block.AcaciaDoor, Block.DarkOakDoor,
]);

const DIRECTIONAL_BLOCKS = new Set<number>([
  Block.Piston, Block.StickyPiston, Block.Observer,
  Block.Dispenser, Block.Dropper, Block.Hopper,
]);

/** Check if a block ID is a log. */
function isLogBlock(blockId: number): boolean {
  return LOG_BLOCKS.has(blockId);
}

/** Check if a block ID is a stair. */
function isStairBlock(blockId: number): boolean {
  return STAIR_BLOCKS.has(blockId);
}

/** Check if a block ID is a door. */
function isDoorBlock(blockId: number): boolean {
  return DOOR_BLOCKS.has(blockId);
}

/** Check if a block is directional (faces toward player). */
function isDirectionalBlock(blockId: number): boolean {
  return DIRECTIONAL_BLOCKS.has(blockId);
}

/** Convert player yaw (degrees) to a cardinal rotation index (0-3). */
function yawToCardinalRotation(yaw: number): number {
  // Normalize yaw to 0-360
  const normalizedYaw = ((yaw % 360) + 360) % 360;
  // 0 = south, 1 = west, 2 = north, 3 = east (Minecraft convention)
  if (normalizedYaw >= 315 || normalizedYaw < 45) return 0;   // South
  if (normalizedYaw >= 45 && normalizedYaw < 135) return 1;   // West
  if (normalizedYaw >= 135 && normalizedYaw < 225) return 2;  // North
  return 3; // East
}

/** Convert a block face to a rotation index. */
function faceToRotation(face: BlockFace): number {
  switch (face) {
    case 'south': return 0;
    case 'west':  return 1;
    case 'north': return 2;
    case 'east':  return 3;
    case 'top':   return 0;
    case 'bottom': return 1;
  }
}

/** Get a neighboring position based on a cardinal face direction. */
function getDirectionalNeighbor(
  x: number,
  z: number,
  face: BlockFace,
): { x: number; z: number } {
  switch (face) {
    case 'north': return { x, z: z - 1 };
    case 'south': return { x, z: z + 1 };
    case 'east':  return { x: x + 1, z };
    case 'west':  return { x: x - 1, z };
    default:      return { x, z };
  }
}
