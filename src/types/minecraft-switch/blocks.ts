// =============================================================================
// Minecraft: Nintendo Switch Edition — Block System Types
// =============================================================================
// Block enum, block IDs, block metadata, block properties, and face texturing.
// =============================================================================

// =============================================================================
// 1. BLOCK SYSTEM — 200+ Blocks
// =============================================================================

/**
 * Block registry — numeric IDs for every placeable/natural block.
 * IDs are stable and used as indices in chunk data arrays.
 * Organized by category, matching Minecraft: Nintendo Switch Edition content.
 */
export const Block = {
  // --- Basic Terrain (0-9) ---
  Air: 0,
  Stone: 1,
  Granite: 2,
  Diorite: 3,
  Andesite: 4,
  Grass: 5,
  Dirt: 6,
  CoarseDirt: 7,
  Podzol: 8,
  Cobblestone: 9,

  // --- Stone Variants (10-19) ---
  PolishedGranite: 10,
  PolishedDiorite: 11,
  PolishedAndesite: 12,
  Bedrock: 13,
  Sand: 14,
  RedSand: 15,
  Gravel: 16,
  Clay: 17,
  Sandstone: 18,
  RedSandstone: 19,

  // --- Ores (20-29) ---
  CoalOre: 20,
  IronOre: 21,
  GoldOre: 22,
  DiamondOre: 23,
  EmeraldOre: 24,
  LapisOre: 25,
  RedstoneOre: 26,
  NetherQuartzOre: 27,
  NetherGoldOre: 28,
  AncientDebris: 29,

  // --- Mineral Blocks (30-39) ---
  CoalBlock: 30,
  IronBlock: 31,
  GoldBlock: 32,
  DiamondBlock: 33,
  EmeraldBlock: 34,
  LapisBlock: 35,
  RedstoneBlock: 36,
  NetheriteBlock: 37,
  QuartzBlock: 38,
  CopperBlock: 39,

  // --- Wood: Oak (40-49) ---
  OakLog: 40,
  OakPlanks: 41,
  OakSlab: 42,
  OakStairs: 43,
  OakFence: 44,
  OakFenceGate: 45,
  OakDoor: 46,
  OakTrapdoor: 47,
  OakButton: 48,
  OakPressurePlate: 49,

  // --- Wood: Spruce (50-59) ---
  SpruceLog: 50,
  SprucePlanks: 51,
  SpruceSlab: 52,
  SpruceStairs: 53,
  SpruceFence: 54,
  SpruceFenceGate: 55,
  SpruceDoor: 56,
  SpruceTrapdoor: 57,
  SpruceButton: 58,
  SprucePressurePlate: 59,

  // --- Wood: Birch (60-69) ---
  BirchLog: 60,
  BirchPlanks: 61,
  BirchSlab: 62,
  BirchStairs: 63,
  BirchFence: 64,
  BirchFenceGate: 65,
  BirchDoor: 66,
  BirchTrapdoor: 67,
  BirchButton: 68,
  BirchPressurePlate: 69,

  // --- Wood: Jungle (70-79) ---
  JungleLog: 70,
  JunglePlanks: 71,
  JungleSlab: 72,
  JungleStairs: 73,
  JungleFence: 74,
  JungleFenceGate: 75,
  JungleDoor: 76,
  JungleTrapdoor: 77,
  JungleButton: 78,
  JunglePressurePlate: 79,

  // --- Wood: Acacia (80-89) ---
  AcaciaLog: 80,
  AcaciaPlanks: 81,
  AcaciaSlab: 82,
  AcaciaStairs: 83,
  AcaciaFence: 84,
  AcaciaFenceGate: 85,
  AcaciaDoor: 86,
  AcaciaTrapdoor: 87,
  AcaciaButton: 88,
  AcaciaPressurePlate: 89,

  // --- Wood: Dark Oak (90-99) ---
  DarkOakLog: 90,
  DarkOakPlanks: 91,
  DarkOakSlab: 92,
  DarkOakStairs: 93,
  DarkOakFence: 94,
  DarkOakFenceGate: 95,
  DarkOakDoor: 96,
  DarkOakTrapdoor: 97,
  DarkOakButton: 98,
  DarkOakPressurePlate: 99,

  // --- Leaves (100-105) ---
  OakLeaves: 100,
  SpruceLeaves: 101,
  BirchLeaves: 102,
  JungleLeaves: 103,
  AcaciaLeaves: 104,
  DarkOakLeaves: 105,

  // --- Liquids (106-109) ---
  Water: 106,
  Lava: 107,
  StillWater: 108,
  StillLava: 109,

  // --- Glass (110-126) ---
  Glass: 110,
  WhiteStainedGlass: 111,
  OrangeStainedGlass: 112,
  MagentaStainedGlass: 113,
  LightBlueStainedGlass: 114,
  YellowStainedGlass: 115,
  LimeStainedGlass: 116,
  PinkStainedGlass: 117,
  GrayStainedGlass: 118,
  LightGrayStainedGlass: 119,
  CyanStainedGlass: 120,
  PurpleStainedGlass: 121,
  BlueStainedGlass: 122,
  BrownStainedGlass: 123,
  GreenStainedGlass: 124,
  RedStainedGlass: 125,
  BlackStainedGlass: 126,

  // --- Wool (127-142) ---
  WhiteWool: 127,
  OrangeWool: 128,
  MagentaWool: 129,
  LightBlueWool: 130,
  YellowWool: 131,
  LimeWool: 132,
  PinkWool: 133,
  GrayWool: 134,
  LightGrayWool: 135,
  CyanWool: 136,
  PurpleWool: 137,
  BlueWool: 138,
  BrownWool: 139,
  GreenWool: 140,
  RedWool: 141,
  BlackWool: 142,

  // --- Terracotta (143-158) ---
  Terracotta: 143,
  WhiteTerracotta: 144,
  OrangeTerracotta: 145,
  MagentaTerracotta: 146,
  LightBlueTerracotta: 147,
  YellowTerracotta: 148,
  LimeTerracotta: 149,
  PinkTerracotta: 150,
  GrayTerracotta: 151,
  LightGrayTerracotta: 152,
  CyanTerracotta: 153,
  PurpleTerracotta: 154,
  BlueTerracotta: 155,
  BrownTerracotta: 156,
  GreenTerracotta: 157,
  RedTerracotta: 158,
  BlackTerracotta: 159,

  // --- Concrete (160-175) ---
  WhiteConcrete: 160,
  OrangeConcrete: 161,
  MagentaConcrete: 162,
  LightBlueConcrete: 163,
  YellowConcrete: 164,
  LimeConcrete: 165,
  PinkConcrete: 166,
  GrayConcrete: 167,
  LightGrayConcrete: 168,
  CyanConcrete: 169,
  PurpleConcrete: 170,
  BlueConcrete: 171,
  BrownConcrete: 172,
  GreenConcrete: 173,
  RedConcrete: 174,
  BlackConcrete: 175,

  // --- Plants & Vegetation (176-195) ---
  TallGrass: 176,
  Fern: 177,
  DeadBush: 178,
  Dandelion: 179,
  Poppy: 180,
  BlueOrchid: 181,
  Allium: 182,
  AzureBluet: 183,
  RedTulip: 184,
  OrangeTulip: 185,
  WhiteTulip: 186,
  PinkTulip: 187,
  OxeyeDaisy: 188,
  Sunflower: 189,
  Lilac: 190,
  Peony: 191,
  RoseBush: 192,
  Cactus: 193,
  SugarCane: 194,
  Vine: 195,

  // --- Crops & Farmland (196-205) ---
  Farmland: 196,
  Wheat: 197,
  Carrots: 198,
  Potatoes: 199,
  Beetroots: 200,
  MelonBlock: 201,
  PumpkinBlock: 202,
  Cocoa: 203,
  NetherWart: 204,
  SweetBerryBush: 205,

  // --- Mushrooms & Fungi (206-211) ---
  BrownMushroom: 206,
  RedMushroom: 207,
  BrownMushroomBlock: 208,
  RedMushroomBlock: 209,
  MushroomStem: 210,
  Mycelium: 211,

  // --- Utility Blocks (212-229) ---
  CraftingTable: 212,
  Furnace: 213,
  BlastFurnace: 214,
  Smoker: 215,
  Anvil: 216,
  ChippedAnvil: 217,
  DamagedAnvil: 218,
  EnchantingTable: 219,
  BrewingStand: 220,
  Cauldron: 221,
  Grindstone: 222,
  Stonecutter: 223,
  Loom: 224,
  CartographyTable: 225,
  FletchingTable: 226,
  SmithingTable: 227,
  Composter: 228,
  Barrel: 229,

  // --- Storage & Containers (230-237) ---
  Chest: 230,
  TrappedChest: 231,
  EnderChest: 232,
  ShulkerBox: 233,
  Hopper: 234,
  Dispenser: 235,
  Dropper: 236,
  Jukebox: 237,

  // --- Redstone (238-255) ---
  RedstoneDust: 238,
  RedstoneTorch: 239,
  RedstoneRepeater: 240,
  RedstoneComparator: 241,
  Lever: 242,
  StoneButton: 243,
  StonePressurePlate: 244,
  WeightedPressurePlateLight: 245,
  WeightedPressurePlateHeavy: 246,
  TripwireHook: 247,
  DaylightDetector: 248,
  Observer: 249,
  Piston: 250,
  StickyPiston: 251,
  TNT: 252,
  NoteBlock: 253,
  Target: 254,
  RedstoneBlock_: 255,  // Alias (also at 36), used for redstone grouping

  // --- Lighting (256-259) ---
  Torch: 256,
  RedstoneTorch_Wall: 257,
  Lantern: 258,
  SoulLantern: 259,

  // --- Rails (260-263) ---
  Rail: 260,
  PoweredRail: 261,
  DetectorRail: 262,
  ActivatorRail: 263,

  // --- Stone Bricks (264-271) ---
  StoneBricks: 264,
  MossyStoneBricks: 265,
  CrackedStoneBricks: 266,
  ChiseledStoneBricks: 267,
  StoneBrickSlab: 268,
  StoneBrickStairs: 269,
  StoneBrickWall: 270,
  MossyCobblestone: 271,

  // --- Nether Blocks (272-289) ---
  Netherrack: 272,
  SoulSand: 273,
  SoulSoil: 274,
  Glowstone: 275,
  NetherBricks: 276,
  NetherBrickFence: 277,
  NetherBrickStairs: 278,
  NetherBrickSlab: 279,
  RedNetherBricks: 280,
  Basalt: 281,
  PolishedBasalt: 282,
  Blackstone: 283,
  PolishedBlackstone: 284,
  PolishedBlackstoneBricks: 285,
  CrimsonPlanks: 286,
  WarpedPlanks: 287,
  CrimsonStem: 288,
  WarpedStem: 289,

  // --- End Blocks (290-295) ---
  EndStone: 290,
  EndStoneBricks: 291,
  PurpurBlock: 292,
  PurpurPillar: 293,
  PurpurStairs: 294,
  PurpurSlab: 295,

  // --- Prismarine (296-299) ---
  Prismarine: 296,
  PrismarineBricks: 297,
  DarkPrismarine: 298,
  SeaLantern: 299,

  // --- Ice Variants (300-303) ---
  Ice: 300,
  PackedIce: 301,
  BlueIce: 302,
  Snow: 303,

  // --- Snow & Ice Terrain (304-307) ---
  SnowBlock: 304,
  SnowLayer: 305,
  FrostedIce: 306,
  PowderSnow: 307,

  // --- Decoration (308-329) ---
  Cobweb: 308,
  Bookshelf: 309,
  Ladder: 310,
  IronBars: 311,
  GlassPane: 312,
  Sign: 313,
  WallSign: 314,
  ItemFrame: 315,
  Painting: 316,
  ArmorStand: 317,
  FlowerPot: 318,
  Cake: 319,
  Bed: 320,
  Carpet: 321,
  Banner: 322,
  MobHead: 323,
  EndRod: 324,
  ChorusPlant: 325,
  ChorusFlower: 326,
  DragonEgg: 327,
  Beacon: 328,
  Conduit: 329,

  // --- Slabs (330-339) ---
  StoneSlab: 330,
  SandstoneSlab: 331,
  CobblestoneSlab: 332,
  BrickSlab: 333,
  QuartzSlab: 334,
  NetherBrickSlab_: 335,
  RedSandstoneSlab: 336,
  PrismarineSlab: 337,
  PrismarineBrickSlab: 338,
  DarkPrismarineSlab: 339,

  // --- Stairs (340-347) ---
  StoneStairs: 340,
  SandstoneStairs: 341,
  CobblestoneStairs: 342,
  BrickStairs: 343,
  QuartzStairs: 344,
  RedSandstoneStairs: 345,
  PrismarineStairs: 346,
  PrismarineBrickStairs: 347,

  // --- Walls (348-354) ---
  CobblestoneWall: 348,
  MossyCobblestoneWall: 349,
  StoneBrickWall_: 350,
  BrickWall: 351,
  NetherBrickWall: 352,
  SandstoneWall: 353,
  RedSandstoneWall: 354,

  // --- Building Blocks (355-369) ---
  Bricks: 355,
  SmoothStone: 356,
  SmoothSandstone: 357,
  SmoothRedSandstone: 358,
  SmoothQuartz: 359,
  ChiseledSandstone: 360,
  CutSandstone: 361,
  ChiseledRedSandstone: 362,
  CutRedSandstone: 363,
  ChiseledQuartz: 364,
  QuartzPillar: 365,
  HayBale: 366,
  BoneBlock: 367,
  Obsidian: 368,
  CryingObsidian: 369,

  // --- Glazed Terracotta (370-385) ---
  WhiteGlazedTerracotta: 370,
  OrangeGlazedTerracotta: 371,
  MagentaGlazedTerracotta: 372,
  LightBlueGlazedTerracotta: 373,
  YellowGlazedTerracotta: 374,
  LimeGlazedTerracotta: 375,
  PinkGlazedTerracotta: 376,
  GrayGlazedTerracotta: 377,
  LightGrayGlazedTerracotta: 378,
  CyanGlazedTerracotta: 379,
  PurpleGlazedTerracotta: 380,
  BlueGlazedTerracotta: 381,
  BrownGlazedTerracotta: 382,
  GreenGlazedTerracotta: 383,
  RedGlazedTerracotta: 384,
  BlackGlazedTerracotta: 385,

  // --- Concrete Powder (386-401) ---
  WhiteConcretePowder: 386,
  OrangeConcretePowder: 387,
  MagentaConcretePowder: 388,
  LightBlueConcretePowder: 389,
  YellowConcretePowder: 390,
  LimeConcretePowder: 391,
  PinkConcretePowder: 392,
  GrayConcretePowder: 393,
  LightGrayConcretePowder: 394,
  CyanConcretePowder: 395,
  PurpleConcretePowder: 396,
  BlueConcretePowder: 397,
  BrownConcretePowder: 398,
  GreenConcretePowder: 399,
  RedConcretePowder: 400,
  BlackConcretePowder: 401,

  // --- Portal & Structure (402-409) ---
  NetherPortal: 402,
  EndPortalFrame: 403,
  EndPortal: 404,
  EndGateway: 405,
  Spawner: 406,
  CommandBlock: 407,
  StructureBlock: 408,
  Barrier: 409,

  // --- Coral Blocks (410-419) ---
  TubeCoralBlock: 410,
  BrainCoralBlock: 411,
  BubbleCoralBlock: 412,
  FireCoralBlock: 413,
  HornCoralBlock: 414,
  DeadTubeCoralBlock: 415,
  DeadBrainCoralBlock: 416,
  DeadBubbleCoralBlock: 417,
  DeadFireCoralBlock: 418,
  DeadHornCoralBlock: 419,

  // --- Coral Fans & Plants (420-429) ---
  TubeCoral: 420,
  BrainCoral: 421,
  BubbleCoral: 422,
  FireCoral: 423,
  HornCoral: 424,
  Kelp: 425,
  SeaGrass: 426,
  TallSeaGrass: 427,
  SeaPickle: 428,
  DriedKelpBlock: 429,

  // --- Miscellaneous (430-449) ---
  Sponge: 430,
  WetSponge: 431,
  SlimeBlock: 432,
  HoneyBlock: 433,
  HoneycombBlock: 434,
  BeeNest: 435,
  Beehive: 436,
  TurtleEgg: 437,
  Scaffolding: 438,
  Bell: 439,
  Campfire: 440,
  SoulCampfire: 441,
  Lodestone: 442,
  RespawnAnchor: 443,
  ShroomLight: 444,
  WarpedWartBlock: 445,
  NetherWartBlock: 446,
  CrimsonNylium: 447,
  WarpedNylium: 448,
  LilyPad: 449,
  MagmaBlock: 450,
} as const;

export type BlockId = (typeof Block)[keyof typeof Block];

// =============================================================================
// 2. BLOCK METADATA & PROPERTIES
// =============================================================================

/** Minecraft dye/color palette used across wool, glass, terracotta, concrete, etc. */
export type DyeColor =
  | 'white' | 'orange' | 'magenta' | 'light_blue'
  | 'yellow' | 'lime' | 'pink' | 'gray'
  | 'light_gray' | 'cyan' | 'purple' | 'blue'
  | 'brown' | 'green' | 'red' | 'black';

/** Tool type best suited for mining a block. */
export type ToolCategory = 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'sword' | 'shears' | 'none';

/** Material tier governing what blocks can be mined. */
export type MaterialTier = 'hand' | 'wood' | 'stone' | 'iron' | 'diamond' | 'netherite';

/** Block shape for rendering and collision. */
export type BlockShape = 'full' | 'slab' | 'stairs' | 'fence' | 'wall' | 'cross' | 'thin' | 'none' | 'custom';

/** Sound set played when placing/breaking a block. */
export type BlockSoundType = 'stone' | 'wood' | 'gravel' | 'grass' | 'sand' | 'metal' | 'glass' | 'wool' | 'snow' | 'coral' | 'nether' | 'honey' | 'bone' | 'netherite' | 'soul' | 'crop' | 'wet_grass' | 'lily_pad' | 'slime';

/** Render layer determines draw order and transparency behavior. */
export type RenderLayer = 'opaque' | 'transparent' | 'cutout' | 'translucent';

/**
 * Block material category — affects blast resistance grouping
 * and determines which tool is effective.
 */
export type BlockMaterial =
  | 'air' | 'stone' | 'dirt' | 'wood' | 'plant' | 'metal'
  | 'water' | 'lava' | 'sand' | 'wool' | 'glass' | 'ice'
  | 'clay' | 'coral' | 'nether' | 'end' | 'misc';

export interface BlockDrop {
  /** Item ID to drop. */
  item: string;
  /** Base quantity. */
  count: number;
  /** Probability (0-1) of this drop. */
  chance: number;
  /** If true, requires Silk Touch to drop the item. */
  requiresSilkTouch?: boolean;
  /** If set, Fortune enchantment multiplier applies. */
  fortuneMultiplier?: number;
}

export interface BlockProperties {
  /** Numeric block ID from the Block const. */
  id: BlockId;
  /** Human-readable name. */
  name: string;
  /** Japanese localized name. */
  nameJa: string;
  /** Block material category. */
  material: BlockMaterial;
  /** Time in ticks to mine with bare hands (-1 = unbreakable). */
  hardness: number;
  /** Explosion resistance. */
  blastResistance: number;
  /** Best tool to mine this block. */
  preferredTool: ToolCategory;
  /** Minimum tier required to mine (drops nothing if too low). */
  requiredTier: MaterialTier;
  /** Items dropped when broken. */
  drops: BlockDrop[];
  /** Whether the block has full collision. */
  solid: boolean;
  /** Whether entities can walk through this block. */
  passable: boolean;
  /** Whether light passes through. */
  transparent: boolean;
  /** Light level emitted (0-15). */
  luminance: number;
  /** Whether gravity applies (sand, gravel, concrete powder). */
  gravity: boolean;
  /** Whether fire can spread to/from this block. */
  flammable: boolean;
  /** Collision/render shape. */
  shape: BlockShape;
  /** Sound set for place/break/step. */
  sound: BlockSoundType;
  /** Rendering layer. */
  renderLayer: RenderLayer;
  /** Whether the block can be waterlogged. */
  waterloggable: boolean;
  /** Hex color for map/minimap rendering. */
  mapColor: string;
  /** Whether this block can be pushed by pistons. */
  pushable: boolean;
  /** Redstone signal strength emitted (0-15), 0 = none. */
  redstoneSignal: number;
  /** Whether redstone connects to this block. */
  redstoneConnectable: boolean;
  /** Silk Touch drops the block itself instead of `drops`. */
  silkTouchable: boolean;
}

/**
 * Factory for creating BlockProperties with sensible defaults.
 * Most blocks are solid, opaque, non-flammable, hand-mineable stone.
 */
function blkProps(overrides: Partial<BlockProperties> & { id: BlockId; name: string; nameJa: string }): BlockProperties {
  return {
    material: 'stone',
    hardness: 15,
    blastResistance: 6,
    preferredTool: 'pickaxe',
    requiredTier: 'hand',
    drops: [],
    solid: true,
    passable: false,
    transparent: false,
    luminance: 0,
    gravity: false,
    flammable: false,
    shape: 'full',
    sound: 'stone',
    renderLayer: 'opaque',
    waterloggable: false,
    mapColor: '#808080',
    pushable: true,
    redstoneSignal: 0,
    redstoneConnectable: false,
    silkTouchable: false,
    ...overrides,
  };
}

// Export blkProps for external use
export { blkProps };

// =============================================================================
// 3. BLOCK FACE TEXTURING
// =============================================================================

/** Per-face texture mapping for blocks with directional textures. */
export interface BlockFaceTextures {
  top: string;
  bottom: string;
  north: string;
  south: string;
  east: string;
  west: string;
}

/** Simplified face mapping for blocks with top/bottom/side symmetry. */
export interface BlockFaceSimple {
  top: string;
  bottom: string;
  side: string;
}

export type BlockTextureMap = BlockFaceTextures | BlockFaceSimple | string;
