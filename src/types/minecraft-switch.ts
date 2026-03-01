// =============================================================================
// Minecraft: Nintendo Switch Edition — Master Type Definitions
// マインクラフト：ニンテンドースイッチエディション
// =============================================================================
// Foundational types for a web-based Minecraft clone targeting Nintendo Switch
// Edition parity. Defines the complete block registry (200+), item system,
// entity/mob framework, biome & world generation, player state, crafting,
// redstone, enchantments, multiplayer protocol, and game configuration.
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

// =============================================================================
// 4. ITEM SYSTEM
// =============================================================================

// ---------------------------------------------------------------------------
// 4a. Item Categories
// ---------------------------------------------------------------------------

export type ItemCategory =
  | 'block'           // Placeable block items
  | 'tool'            // Pickaxe, axe, shovel, hoe
  | 'weapon'          // Sword, bow, crossbow, trident
  | 'armor'           // Helmet, chestplate, leggings, boots
  | 'food'            // Edible items
  | 'material'        // Crafting materials (ingots, sticks, string, etc.)
  | 'potion'          // Potions and splash/lingering variants
  | 'redstone'        // Redstone components as items
  | 'decoration'      // Dyes, paintings, banners
  | 'transport'       // Boats, minecarts
  | 'combat'          // Arrows, shields
  | 'misc';           // Everything else (maps, clocks, compass, etc.)

export type ArmorSlot = 'helmet' | 'chestplate' | 'leggings' | 'boots';

export type EquipSlot = 'mainhand' | 'offhand' | ArmorSlot;

// ---------------------------------------------------------------------------
// 4b. Tool / Weapon Definitions
// ---------------------------------------------------------------------------

export interface ToolStats {
  /** Material tier (wood, stone, iron, diamond, netherite). */
  tier: MaterialTier;
  /** Damage added on top of base player damage. */
  attackDamage: number;
  /** Attacks per second. */
  attackSpeed: number;
  /** Total durability before breaking. */
  durability: number;
  /** Mining speed multiplier. */
  miningSpeed: number;
  /** Tool category for block harvesting. */
  toolType: ToolCategory;
  /** Enchantability (higher = better enchantments). */
  enchantability: number;
}

export interface ArmorStats {
  slot: ArmorSlot;
  tier: MaterialTier;
  defense: number;
  toughness: number;
  durability: number;
  knockbackResistance: number;
  enchantability: number;
}

// ---------------------------------------------------------------------------
// 4c. Food Properties
// ---------------------------------------------------------------------------

export interface FoodProperties {
  /** Hunger points restored (each shank = 2 points). */
  hunger: number;
  /** Saturation modifier (controls how fast hunger depletes after eating). */
  saturation: number;
  /** Time in ticks to consume. */
  eatTime: number;
  /** Whether the item can be eaten when hunger is full. */
  alwaysEdible: boolean;
  /** Status effects applied on consumption. */
  effects: StatusEffectInstance[];
}

// ---------------------------------------------------------------------------
// 4d. Item Definition
// ---------------------------------------------------------------------------

export interface ItemDefinition {
  /** Unique string ID (e.g. 'diamond_pickaxe'). */
  id: string;
  /** Display name in English. */
  name: string;
  /** Display name in Japanese. */
  nameJa: string;
  /** Category for inventory/creative menu sorting. */
  category: ItemCategory;
  /** Maximum stack size (1, 16, or 64). */
  maxStack: 1 | 16 | 64;
  /** If this item places a block, which block ID. */
  placesBlock?: BlockId;
  /** Tool stats (if this is a tool). */
  tool?: ToolStats;
  /** Armor stats (if this is armor). */
  armor?: ArmorStats;
  /** Food properties (if edible). */
  food?: FoodProperties;
  /** Base durability (for tools, armor, shields, etc.). 0 = no durability. */
  durability: number;
  /** Rarity tier for display color. */
  rarity: ItemRarity;
  /** Whether this item is fireproof (netherite items). */
  fireproof: boolean;
  /** Hex color used for inventory icon tinting. */
  color: string;
  /** Emoji or icon character for text-mode rendering. */
  icon: string;
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export const ITEM_RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#FFFFFF',
  uncommon: '#FFFF55',
  rare: '#55FFFF',
  epic: '#FF55FF',
};

// =============================================================================
// 5. ENTITY & MOB SYSTEM
// =============================================================================

// ---------------------------------------------------------------------------
// 5a. Entity Categories
// ---------------------------------------------------------------------------

export type EntityCategory = 'passive' | 'neutral' | 'hostile' | 'boss' | 'utility' | 'projectile' | 'vehicle' | 'item';

/** Every mob/entity type in Switch Edition. */
export type MobType =
  // Passive
  | 'bat' | 'cat' | 'chicken' | 'cod' | 'cow' | 'donkey' | 'fox'
  | 'horse' | 'mooshroom' | 'mule' | 'ocelot' | 'parrot' | 'pig'
  | 'pufferfish' | 'rabbit' | 'salmon' | 'sheep' | 'skeleton_horse'
  | 'squid' | 'strider' | 'tropical_fish' | 'turtle' | 'villager'
  | 'wandering_trader'
  // Neutral
  | 'bee' | 'dolphin' | 'enderman' | 'iron_golem' | 'llama'
  | 'panda' | 'piglin' | 'polar_bear' | 'snow_golem' | 'spider'
  | 'wolf' | 'zombified_piglin'
  // Hostile
  | 'blaze' | 'cave_spider' | 'creeper' | 'drowned' | 'elder_guardian'
  | 'endermite' | 'evoker' | 'ghast' | 'guardian' | 'hoglin'
  | 'husk' | 'magma_cube' | 'phantom' | 'piglin_brute' | 'pillager'
  | 'ravager' | 'shulker' | 'silverfish' | 'skeleton' | 'slime'
  | 'stray' | 'vex' | 'vindicator' | 'witch' | 'wither_skeleton'
  | 'zoglin' | 'zombie' | 'zombie_villager'
  // Boss
  | 'ender_dragon' | 'wither';

export interface MobStats {
  maxHealth: number;
  attackDamage: number;
  movementSpeed: number;     // blocks per second
  knockbackResistance: number; // 0-1
  followRange: number;       // blocks
  armor: number;
  armorToughness: number;
  spawnWeight: number;        // relative spawn probability
  experienceDrop: number;
}

export interface MobDropEntry {
  item: string;
  countMin: number;
  countMax: number;
  chance: number;
  lootingBonus: number;      // extra chance per Looting level
}

export interface MobDefinition {
  type: MobType;
  name: string;
  nameJa: string;
  category: EntityCategory;
  stats: MobStats;
  drops: MobDropEntry[];
  /** Biomes where this mob naturally spawns. */
  spawnBiomes: BiomeType[];
  /** Whether this mob is affected by daylight. */
  burnsInDaylight: boolean;
  /** Whether this mob can swim. */
  canSwim: boolean;
  /** Whether the mob is tameable. */
  tameable: boolean;
  /** Whether the mob is breedable. */
  breedable: boolean;
  /** Items used to breed (if breedable). */
  breedingItems: string[];
  /** Hex color for map/minimap dot. */
  color: string;
  /** Text-mode icon. */
  icon: string;
}

// =============================================================================
// 6. BIOME & WORLD GENERATION
// =============================================================================

export type BiomeType =
  // Overworld
  | 'plains' | 'sunflower_plains'
  | 'forest' | 'flower_forest' | 'birch_forest' | 'dark_forest'
  | 'taiga' | 'snowy_taiga' | 'giant_tree_taiga'
  | 'jungle' | 'bamboo_jungle'
  | 'desert'
  | 'savanna' | 'savanna_plateau'
  | 'mountains' | 'snowy_mountains' | 'gravelly_mountains'
  | 'swamp'
  | 'beach' | 'snowy_beach' | 'stone_shore'
  | 'river' | 'frozen_river'
  | 'ocean' | 'deep_ocean' | 'warm_ocean' | 'lukewarm_ocean'
  | 'cold_ocean' | 'frozen_ocean' | 'deep_frozen_ocean'
  | 'mushroom_fields'
  | 'badlands' | 'eroded_badlands' | 'wooded_badlands'
  | 'snowy_plains' | 'ice_spikes'
  // Nether
  | 'nether_wastes' | 'crimson_forest' | 'warped_forest'
  | 'soul_sand_valley' | 'basalt_deltas'
  // End
  | 'the_end' | 'end_highlands' | 'end_midlands' | 'end_barrens';

export type Dimension = 'overworld' | 'nether' | 'the_end';

export interface BiomeDefinition {
  type: BiomeType;
  name: string;
  nameJa: string;
  dimension: Dimension;
  /** Base terrain height (0-255). */
  baseHeight: number;
  /** Height variation scale. */
  heightVariation: number;
  /** Temperature (affects grass/foliage color, snow generation). */
  temperature: number;
  /** Rainfall (affects grass/foliage color, water features). */
  rainfall: number;
  /** Grass tint color. */
  grassColor: string;
  /** Foliage tint color. */
  foliageColor: string;
  /** Water tint color. */
  waterColor: string;
  /** Sky color. */
  skyColor: string;
  /** Fog color. */
  fogColor: string;
  /** Whether it rains (false = snow or nothing). */
  canRain: boolean;
  /** Whether it snows. */
  canSnow: boolean;
  /** Surface block ID. */
  topBlock: BlockId;
  /** Sub-surface block ID (1-3 blocks deep). */
  fillerBlock: BlockId;
  /** Tree types and densities. */
  trees: BiomeTreeConfig[];
  /** Mob spawn entries. */
  spawns: BiomeSpawnEntry[];
  /** Structures that can generate. */
  structures: StructureType[];
  /** Map display color. */
  mapColor: string;
}

export interface BiomeTreeConfig {
  /** Tree type (oak, birch, spruce, jungle, acacia, dark_oak). */
  type: TreeType;
  /** Spawns per chunk (average). */
  density: number;
}

export type TreeType = 'oak' | 'birch' | 'spruce' | 'jungle' | 'acacia' | 'dark_oak' | 'huge_mushroom' | 'chorus';

export interface BiomeSpawnEntry {
  mob: MobType;
  weight: number;
  minGroup: number;
  maxGroup: number;
}

// =============================================================================
// 7. STRUCTURES
// =============================================================================

export type StructureType =
  | 'village' | 'pillager_outpost' | 'desert_temple' | 'jungle_temple'
  | 'witch_hut' | 'woodland_mansion' | 'ocean_monument' | 'shipwreck'
  | 'ocean_ruins' | 'buried_treasure' | 'mineshaft' | 'stronghold'
  | 'dungeon' | 'igloo' | 'ruined_portal' | 'nether_fortress'
  | 'bastion_remnant' | 'end_city' | 'end_ship' | 'end_fountain';

export interface StructureDefinition {
  type: StructureType;
  name: string;
  nameJa: string;
  dimension: Dimension;
  /** Biomes where this structure can generate. */
  validBiomes: BiomeType[];
  /** Minimum spacing between structures (in chunks). */
  spacing: number;
  /** Randomization offset within spacing grid. */
  separation: number;
  /** Loot tables applied to chests. */
  lootTables: string[];
  /** Whether a boss spawns within. */
  hasBoss: boolean;
}

// =============================================================================
// 8. WORLD CHUNK & TERRAIN
// =============================================================================

export const CHUNK_WIDTH = 16;
export const CHUNK_DEPTH = 16;
export const CHUNK_HEIGHT = 256;  // Switch Edition world height

export interface ChunkCoord {
  x: number;
  z: number;
}

export interface BlockCoord {
  x: number;
  y: number;
  z: number;
}

/**
 * A chunk is a 16x256x16 column of blocks.
 * `blocks` is a flat Uint16Array indexed as blocks[y * 256 + z * 16 + x].
 * `blockLight` and `skyLight` use nibble packing (4 bits per block).
 */
export interface Chunk {
  coord: ChunkCoord;
  /** 16 x 256 x 16 = 65536 block IDs. */
  blocks: Uint16Array;
  /** Nibble-packed block light (half the block array length). */
  blockLight: Uint8Array;
  /** Nibble-packed sky light. */
  skyLight: Uint8Array;
  /** Biome at each x,z column (16x16 = 256 entries). */
  biomes: Uint8Array;
  /** Highest non-air block at each x,z column. */
  heightMap: Uint8Array;
  /** Whether the chunk has been fully generated. */
  generated: boolean;
  /** Whether the chunk has been modified since generation. */
  dirty: boolean;
  /** Tick of last modification. */
  lastModified: number;
}

/**
 * Noise parameters for terrain generation.
 */
export interface TerrainNoiseConfig {
  /** Frequency for base continent shape. */
  continentalness: number;
  /** Frequency for erosion patterns. */
  erosion: number;
  /** Frequency for peaks and valleys. */
  peaksAndValleys: number;
  /** 3D noise frequency for cave carving. */
  caveFrequency: number;
  /** Threshold for cave air. */
  caveThreshold: number;
  /** Scale of overall terrain height. */
  heightScale: number;
  /** Sea level Y coordinate. */
  seaLevel: number;
}

export const DEFAULT_TERRAIN_NOISE: TerrainNoiseConfig = {
  continentalness: 0.003,
  erosion: 0.006,
  peaksAndValleys: 0.01,
  caveFrequency: 0.05,
  caveThreshold: 0.55,
  heightScale: 64,
  seaLevel: 63,
};

// =============================================================================
// 9. PLAYER STATE
// =============================================================================

export type GameMode = 'survival' | 'creative' | 'adventure' | 'spectator';

export interface PlayerPosition {
  x: number;
  y: number;
  z: number;
  yaw: number;     // horizontal rotation (0-360)
  pitch: number;   // vertical rotation (-90 to 90)
}

export interface InventorySlot {
  item: string;     // item ID
  count: number;
  durability?: number;
  enchantments?: EnchantmentInstance[];
  nbt?: Record<string, unknown>;
}

export interface PlayerInventory {
  /** Main inventory: 27 slots (indices 0-26). */
  main: (InventorySlot | null)[];
  /** Hotbar: 9 slots (indices 0-8). */
  hotbar: (InventorySlot | null)[];
  /** Armor: 4 slots [helmet, chestplate, leggings, boots]. */
  armor: (InventorySlot | null)[];
  /** Offhand: 1 slot. */
  offhand: InventorySlot | null;
  /** Currently selected hotbar slot (0-8). */
  selectedSlot: number;
}

export interface PlayerState {
  id: string;
  name: string;
  position: PlayerPosition;
  velocity: { x: number; y: number; z: number };
  /** Health points (0-20, each heart = 2). */
  health: number;
  maxHealth: number;
  /** Hunger points (0-20, each shank = 2). */
  hunger: number;
  /** Saturation level. */
  saturation: number;
  /** Experience points in the current level. */
  experience: number;
  /** Current level. */
  level: number;
  /** Total accumulated experience. */
  totalExperience: number;
  /** Armor defense points. */
  armorPoints: number;
  /** Game mode. */
  gameMode: GameMode;
  /** Whether the player is on the ground. */
  onGround: boolean;
  /** Whether the player is sprinting. */
  sprinting: boolean;
  /** Whether the player is sneaking. */
  sneaking: boolean;
  /** Whether the player is swimming. */
  swimming: boolean;
  /** Whether the player is flying (creative mode). */
  flying: boolean;
  /** Whether the player is dead. */
  dead: boolean;
  /** Active status effects. */
  statusEffects: StatusEffectInstance[];
  /** Current dimension. */
  dimension: Dimension;
  /** Spawn point. */
  spawnPoint: BlockCoord;
  /** Inventory. */
  inventory: PlayerInventory;
  /** Whether the player is connected. */
  connected: boolean;
  /** Player display color (multiplayer). */
  color: string;
  /** Ticks since last damage (for damage immunity). */
  invulnerabilityTicks: number;
  /** Fire ticks remaining. */
  fireTicks: number;
  /** Air supply ticks (drowning). */
  airSupply: number;
  /** Maximum air supply. */
  maxAirSupply: number;
}

// =============================================================================
// 10. STATUS EFFECTS (Potion Effects)
// =============================================================================

export type StatusEffectType =
  | 'speed' | 'slowness' | 'haste' | 'mining_fatigue'
  | 'strength' | 'instant_health' | 'instant_damage'
  | 'jump_boost' | 'nausea' | 'regeneration' | 'resistance'
  | 'fire_resistance' | 'water_breathing' | 'invisibility'
  | 'blindness' | 'night_vision' | 'hunger' | 'weakness'
  | 'poison' | 'wither' | 'health_boost' | 'absorption'
  | 'saturation' | 'levitation' | 'slow_falling'
  | 'conduit_power' | 'bad_omen' | 'hero_of_the_village';

export interface StatusEffectDefinition {
  type: StatusEffectType;
  name: string;
  nameJa: string;
  /** Whether this effect is beneficial. */
  beneficial: boolean;
  /** Whether this effect is applied instantly (instant_health, instant_damage). */
  instant: boolean;
  /** Base color for particles. */
  color: string;
  /** Icon index in the effect spritesheet. */
  iconIndex: number;
}

export interface StatusEffectInstance {
  type: StatusEffectType;
  /** Amplifier level (0 = Level I, 1 = Level II, etc.). */
  amplifier: number;
  /** Duration in ticks (-1 = infinite). */
  duration: number;
  /** Whether particles are visible. */
  showParticles: boolean;
  /** Whether the effect icon is shown in the HUD. */
  showIcon: boolean;
}

// =============================================================================
// 11. ENCHANTMENT SYSTEM
// =============================================================================

export type EnchantmentType =
  // Armor
  | 'protection' | 'fire_protection' | 'blast_protection' | 'projectile_protection'
  | 'thorns' | 'respiration' | 'aqua_affinity' | 'depth_strider'
  | 'frost_walker' | 'feather_falling' | 'soul_speed'
  // Weapon
  | 'sharpness' | 'smite' | 'bane_of_arthropods' | 'knockback'
  | 'fire_aspect' | 'looting' | 'sweeping_edge'
  // Tool
  | 'efficiency' | 'silk_touch' | 'fortune' | 'unbreaking'
  // Bow
  | 'power' | 'punch' | 'flame' | 'infinity'
  // Crossbow
  | 'multishot' | 'piercing' | 'quick_charge'
  // Trident
  | 'loyalty' | 'impaling' | 'riptide' | 'channeling'
  // General
  | 'mending' | 'vanishing_curse' | 'binding_curse';

export interface EnchantmentDefinition {
  type: EnchantmentType;
  name: string;
  nameJa: string;
  maxLevel: number;
  /** Item categories this enchantment can be applied to. */
  applicableTo: ItemCategory[];
  /** Enchantments that conflict with this one. */
  incompatible: EnchantmentType[];
  /** Whether this is a treasure enchantment (only found, not obtainable from enchanting table). */
  treasure: boolean;
  /** Whether this is a curse. */
  curse: boolean;
  /** Rarity weight for enchanting table. */
  weight: number;
  /** Minimum enchanting power required per level. */
  minPowerPerLevel: number[];
}

export interface EnchantmentInstance {
  type: EnchantmentType;
  level: number;
}

// =============================================================================
// 12. CRAFTING SYSTEM
// =============================================================================

export type RecipeType = 'shaped' | 'shapeless' | 'smelting' | 'blasting' | 'smoking' | 'campfire' | 'stonecutting' | 'smithing';

export interface CraftingRecipe {
  id: string;
  type: RecipeType;
  /** For shaped recipes: 3x3 grid pattern using single-char keys. */
  pattern?: string[];
  /** Key mapping characters to item IDs. */
  key?: Record<string, string>;
  /** For shapeless recipes: list of ingredient item IDs. */
  ingredients?: string[];
  /** Output item ID. */
  result: string;
  /** Output quantity. */
  resultCount: number;
  /** For smelting: input item ID. */
  input?: string;
  /** Experience reward (smelting recipes). */
  experience?: number;
  /** Cooking time in ticks (smelting recipes). */
  cookingTime?: number;
  /** Category for recipe book grouping. */
  category: string;
}

// =============================================================================
// 13. REDSTONE SYSTEM
// =============================================================================

export type RedstoneComponentType =
  | 'wire' | 'torch' | 'repeater' | 'comparator'
  | 'lever' | 'button' | 'pressure_plate' | 'tripwire'
  | 'daylight_detector' | 'observer' | 'target'
  | 'piston' | 'sticky_piston' | 'dispenser' | 'dropper'
  | 'hopper' | 'note_block' | 'tnt' | 'redstone_lamp'
  | 'door' | 'trapdoor' | 'fence_gate' | 'command_block';

export interface RedstoneState {
  /** Signal strength at this position (0-15). */
  power: number;
  /** Whether this component is providing strong power. */
  strongPower: boolean;
  /** Whether this component is providing weak power. */
  weakPower: boolean;
  /** Delay in ticks (for repeaters). */
  delay: number;
  /** Mode (for comparators: 'compare' or 'subtract'). */
  mode: 'compare' | 'subtract' | 'none';
  /** Whether the component is locked. */
  locked: boolean;
  /** Connected faces for wire routing. */
  connections: Record<string, boolean>;
}

// =============================================================================
// 14. PARTICLE SYSTEM
// =============================================================================

export type ParticleType =
  | 'block_break' | 'block_dust' | 'bubble' | 'campfire'
  | 'cloud' | 'crit' | 'damage' | 'drip_lava' | 'drip_water'
  | 'dust' | 'enchant' | 'explosion' | 'flame' | 'heart'
  | 'item_break' | 'lava' | 'note' | 'portal' | 'rain'
  | 'redstone' | 'smoke' | 'snow' | 'soul' | 'soul_fire'
  | 'spark' | 'splash' | 'totem' | 'villager_happy'
  | 'villager_angry' | 'witch';

export interface ParticleEmitter {
  type: ParticleType;
  position: BlockCoord;
  velocity: { x: number; y: number; z: number };
  count: number;
  spread: { x: number; y: number; z: number };
  /** Lifetime in ticks. */
  lifetime: number;
  /** Color override (for dust/redstone particles). */
  color?: string;
  /** Size multiplier. */
  scale: number;
}

// =============================================================================
// 15. SOUND SYSTEM
// =============================================================================

export type SoundCategory = 'master' | 'music' | 'record' | 'weather' | 'block' | 'hostile' | 'neutral' | 'player' | 'ambient' | 'voice';

export interface SoundEvent {
  id: string;
  category: SoundCategory;
  volume: number;      // 0.0 - 1.0
  pitch: number;       // 0.5 - 2.0
  /** Whether the sound should attenuate with distance. */
  attenuate: boolean;
  /** Maximum distance at which the sound is audible (blocks). */
  maxDistance: number;
}

// =============================================================================
// 16. WEATHER & TIME
// =============================================================================

export type WeatherType = 'clear' | 'rain' | 'thunder';

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface WorldTime {
  /** Total ticks since world creation. */
  totalTicks: number;
  /** Time of day in ticks (0-24000). */
  dayTime: number;
  /** Current day number. */
  day: number;
  /** Current moon phase (0-7). */
  moonPhase: number;
  /** Current day phase. */
  phase: DayPhase;
  /** Sun angle (radians). */
  sunAngle: number;
}

export interface WeatherState {
  type: WeatherType;
  /** Ticks until weather changes. */
  duration: number;
  /** Whether lightning is active (during thunder). */
  lightning: boolean;
  /** Rain/snow intensity (0-1). */
  intensity: number;
}

// =============================================================================
// 17. DAMAGE SYSTEM
// =============================================================================

export type DamageSource =
  | 'player_attack' | 'mob_attack' | 'projectile' | 'explosion'
  | 'fire' | 'lava' | 'drowning' | 'fall' | 'void' | 'starving'
  | 'suffocation' | 'cactus' | 'berry_bush' | 'wither_effect'
  | 'poison' | 'magic' | 'thorns' | 'lightning' | 'anvil'
  | 'falling_block' | 'ender_pearl' | 'dragon_breath' | 'generic';

export interface DamageEvent {
  source: DamageSource;
  amount: number;
  /** ID of the entity that caused the damage (if applicable). */
  attackerId?: string;
  /** Whether the damage bypasses armor. */
  bypassArmor: boolean;
  /** Whether the damage bypasses invulnerability frames. */
  bypassInvulnerability: boolean;
  /** Whether the damage bypasses magic protection. */
  bypassMagic: boolean;
  /** Knockback vector. */
  knockback: { x: number; y: number; z: number };
}

// =============================================================================
// 18. MULTIPLAYER — ROOM & LOBBY
// =============================================================================

export const MS_PLAYER_COLORS = [
  '#FF4444', '#44CC44', '#4488FF', '#FFDD44',
  '#FF44FF', '#44DDDD', '#FF8844', '#8844FF', '#44FF88',
] as const;

export interface MSPlayer {
  id: string;
  name: string;
  color: string;
  ready: boolean;
  connected: boolean;
  gameMode: GameMode;
  ping: number;
}

export interface MSRoomState {
  code: string;
  name: string;
  hostId: string;
  players: MSPlayer[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  seed?: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  worldType: WorldType;
}

export interface MSPublicRoom {
  code: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing';
  gameMode: GameMode;
}

export type Difficulty = 'peaceful' | 'easy' | 'normal' | 'hard';
export type WorldType = 'default' | 'superflat' | 'large_biomes' | 'amplified';

export type MSGamePhase = 'menu' | 'lobby' | 'countdown' | 'loading' | 'playing';

// =============================================================================
// 19. MULTIPLAYER — CLIENT -> SERVER MESSAGES
// =============================================================================

export type MSClientMessage =
  // Room management
  | { type: 'ms_create_room'; playerName: string; roomName?: string; gameMode?: GameMode; difficulty?: Difficulty; worldType?: WorldType }
  | { type: 'ms_join_room'; roomCode: string; playerName: string }
  | { type: 'ms_get_rooms' }
  | { type: 'ms_leave' }
  | { type: 'ms_ready'; ready: boolean }
  | { type: 'ms_start' }
  // Movement & position
  | { type: 'ms_position'; x: number; y: number; z: number; yaw: number; pitch: number; onGround: boolean }
  | { type: 'ms_sprint'; sprinting: boolean }
  | { type: 'ms_sneak'; sneaking: boolean }
  | { type: 'ms_jump' }
  | { type: 'ms_swim'; swimming: boolean }
  // Block interaction
  | { type: 'ms_break_block'; x: number; y: number; z: number }
  | { type: 'ms_start_breaking'; x: number; y: number; z: number }
  | { type: 'ms_cancel_breaking' }
  | { type: 'ms_place_block'; x: number; y: number; z: number; blockId: BlockId; face: BlockFace }
  | { type: 'ms_interact_block'; x: number; y: number; z: number }
  // Inventory & items
  | { type: 'ms_select_slot'; slot: number }
  | { type: 'ms_swap_items'; fromSlot: number; toSlot: number; fromContainer: InventoryContainer; toContainer: InventoryContainer }
  | { type: 'ms_drop_item'; slot: number; count: number }
  | { type: 'ms_craft'; recipeId: string }
  | { type: 'ms_eat'; slot: number }
  // Combat
  | { type: 'ms_attack_entity'; entityId: string }
  | { type: 'ms_use_item' }
  // Chat
  | { type: 'ms_chat'; message: string }
  // Settings
  | { type: 'ms_change_gamemode'; gameMode: GameMode }
  | { type: 'ms_change_difficulty'; difficulty: Difficulty };

export type BlockFace = 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';

export type InventoryContainer = 'hotbar' | 'main' | 'armor' | 'offhand' | 'crafting' | 'chest' | 'furnace';

// =============================================================================
// 20. MULTIPLAYER — SERVER -> CLIENT MESSAGES
// =============================================================================

export type MSServerMessage =
  // Room lifecycle
  | { type: 'ms_room_created'; roomCode: string; playerId: string; reconnectToken: string }
  | { type: 'ms_joined_room'; roomCode: string; playerId: string; roomState: MSRoomState; reconnectToken: string }
  | { type: 'ms_room_state'; roomState: MSRoomState }
  | { type: 'ms_room_list'; rooms: MSPublicRoom[] }
  | { type: 'ms_player_joined'; player: MSPlayer }
  | { type: 'ms_player_left'; playerId: string }
  | { type: 'ms_player_ready'; playerId: string; ready: boolean }
  | { type: 'ms_countdown'; count: number }
  | { type: 'ms_game_started'; seed: number; worldType: WorldType }
  | { type: 'ms_reconnected'; roomCode: string; playerId: string; roomState: MSRoomState; reconnectToken: string }
  // World state
  | { type: 'ms_chunk_data'; chunkX: number; chunkZ: number; blocks: number[]; biomes: number[]; heightMap: number[] }
  | { type: 'ms_block_update'; x: number; y: number; z: number; blockId: BlockId }
  | { type: 'ms_multi_block_update'; updates: { x: number; y: number; z: number; blockId: BlockId }[] }
  // Player updates
  | { type: 'ms_player_position'; playerId: string; x: number; y: number; z: number; yaw: number; pitch: number; onGround: boolean }
  | { type: 'ms_player_state'; playerId: string; health: number; hunger: number; armor: number; gameMode: GameMode }
  | { type: 'ms_player_sprint'; playerId: string; sprinting: boolean }
  | { type: 'ms_player_sneak'; playerId: string; sneaking: boolean }
  | { type: 'ms_player_animation'; playerId: string; animation: PlayerAnimation }
  // Block events
  | { type: 'ms_block_broken'; x: number; y: number; z: number; playerId: string; newBlockId: BlockId }
  | { type: 'ms_block_placed'; x: number; y: number; z: number; blockId: BlockId; playerId: string }
  | { type: 'ms_breaking_progress'; playerId: string; x: number; y: number; z: number; progress: number }
  // Entity events
  | { type: 'ms_entity_spawn'; entity: EntityState }
  | { type: 'ms_entity_move'; entityId: string; x: number; y: number; z: number; yaw: number; pitch: number }
  | { type: 'ms_entity_despawn'; entityId: string }
  | { type: 'ms_entity_damage'; entityId: string; damage: number; sourceId?: string; newHealth: number }
  | { type: 'ms_entity_death'; entityId: string; killerId?: string }
  // Item events
  | { type: 'ms_item_drop'; entityId: string; item: string; count: number; x: number; y: number; z: number }
  | { type: 'ms_item_pickup'; playerId: string; entityId: string; item: string; count: number }
  | { type: 'ms_inventory_update'; inventory: PlayerInventory }
  | { type: 'ms_crafted'; recipeId: string; result: string; count: number }
  // Combat
  | { type: 'ms_damage'; targetId: string; damage: number; source: DamageSource; attackerId?: string; newHealth: number }
  | { type: 'ms_player_died'; playerId: string; deathMessage: string; killerId?: string }
  | { type: 'ms_player_respawned'; playerId: string; x: number; y: number; z: number }
  // Effects
  | { type: 'ms_status_effect'; playerId: string; effect: StatusEffectInstance; action: 'add' | 'remove' | 'update' }
  | { type: 'ms_particle'; particle: ParticleEmitter }
  | { type: 'ms_sound'; sound: SoundEvent; x: number; y: number; z: number }
  | { type: 'ms_explosion'; x: number; y: number; z: number; radius: number; blocksDestroyed: BlockCoord[] }
  // World events
  | { type: 'ms_time_update'; totalTicks: number; dayTime: number }
  | { type: 'ms_weather_change'; weather: WeatherType; duration: number }
  | { type: 'ms_day_phase'; phase: DayPhase }
  // Chat & UI
  | { type: 'ms_chat_message'; playerId: string; playerName: string; message: string }
  | { type: 'ms_system_message'; message: string; color?: string }
  | { type: 'ms_title'; title: string; subtitle?: string; fadeIn: number; stay: number; fadeOut: number }
  | { type: 'ms_actionbar'; message: string }
  // Error
  | { type: 'ms_error'; message: string; code?: string };

export type PlayerAnimation = 'swing_arm' | 'hurt' | 'critical_hit' | 'eat' | 'wake_up';

// =============================================================================
// 21. ENTITY STATE (for network sync)
// =============================================================================

export interface EntityState {
  id: string;
  type: MobType | 'item' | 'arrow' | 'experience_orb' | 'falling_block' | 'tnt';
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  health: number;
  maxHealth: number;
  /** Custom name (name tag). */
  customName?: string;
  /** Whether the entity is on fire. */
  onFire: boolean;
  /** Whether the entity is invisible. */
  invisible: boolean;
  /** Additional data depending on entity type. */
  metadata: Record<string, unknown>;
}

// =============================================================================
// 22. GAME CONFIGURATION
// =============================================================================

export const MS_CONFIG = {
  // World
  WORLD_HEIGHT: 256,
  CHUNK_SIZE: 16,
  SEA_LEVEL: 63,
  RENDER_DISTANCE: 8,           // chunks
  SIMULATION_DISTANCE: 4,      // chunks
  TICK_RATE: 20,                // ticks per second (standard Minecraft)

  // Players
  MAX_PLAYERS: 8,               // Switch Edition max
  MIN_PLAYERS: 1,
  PLAYER_REACH: 4.5,            // block interaction range (blocks)
  PLAYER_ATTACK_REACH: 3.0,
  PLAYER_EYE_HEIGHT: 1.62,
  PLAYER_HEIGHT: 1.8,
  PLAYER_WIDTH: 0.6,
  PLAYER_BASE_SPEED: 4.317,     // blocks per second (walking)
  PLAYER_SPRINT_SPEED: 5.612,   // blocks per second (sprinting)
  PLAYER_SNEAK_SPEED: 1.295,    // blocks per second (sneaking)
  PLAYER_SWIM_SPEED: 2.2,
  PLAYER_FLY_SPEED: 10.89,     // creative flight
  PLAYER_JUMP_VELOCITY: 0.42,  // blocks per tick
  GRAVITY: 0.08,               // blocks per tick^2

  // Health & Hunger
  MAX_HEALTH: 20,
  MAX_HUNGER: 20,
  MAX_SATURATION: 20,
  NATURAL_REGEN_THRESHOLD: 18,  // hunger level for natural regen
  SPRINT_THRESHOLD: 6,          // minimum hunger to sprint
  STARVATION_DAMAGE_INTERVAL: 80, // ticks between starvation damage
  FOOD_EXHAUSTION_WALK: 0.01,
  FOOD_EXHAUSTION_SPRINT: 0.1,
  FOOD_EXHAUSTION_JUMP: 0.05,
  FOOD_EXHAUSTION_ATTACK: 0.1,
  FOOD_EXHAUSTION_MINE: 0.005,
  FOOD_EXHAUSTION_REGEN: 6.0,

  // Combat
  ATTACK_COOLDOWN_TICKS: 10,    // ticks between attacks
  INVULNERABILITY_TICKS: 10,    // after taking damage
  KNOCKBACK_BASE: 0.4,
  CRITICAL_HIT_MULTIPLIER: 1.5,

  // Experience
  MAX_LEVEL: 100,
  XP_ORB_PICKUP_RANGE: 7.5,    // blocks

  // Drowning
  MAX_AIR_SUPPLY: 300,          // ticks (15 seconds)
  DROWNING_DAMAGE_INTERVAL: 20, // ticks

  // Fire
  FIRE_DAMAGE_INTERVAL: 20,    // ticks
  FIRE_DURATION_DEFAULT: 160,   // ticks (8 seconds)
  LAVA_FIRE_DURATION: 300,      // ticks (15 seconds)

  // Mining
  INSTANT_BREAK_THRESHOLD: 0.0, // hardness at which a block breaks instantly

  // Network
  POSITION_BROADCAST_RATE: 50,  // ms between position broadcasts (20Hz)
  STATE_UPDATE_INTERVAL: 1,     // ticks between state snapshots
  MAX_CHAT_LENGTH: 256,
  ROOM_NAME_MAX: 32,
  PLAYER_NAME_MAX: 16,

  // Day/Night cycle
  DAY_LENGTH: 24000,            // ticks per full day
  DAWN_START: 0,
  DAY_START: 1000,
  DUSK_START: 12000,
  NIGHT_START: 13000,
  MIDNIGHT: 18000,

  // Mob spawning
  MOB_SPAWN_RANGE: 24,         // blocks from player min
  MOB_DESPAWN_RANGE: 128,      // blocks from player
  HOSTILE_CAP: 70,             // per world
  PASSIVE_CAP: 10,             // per chunk
  MOB_SPAWN_INTERVAL: 1,      // ticks (checked every tick with random chance)

  // Redstone
  REDSTONE_MAX_POWER: 15,
  REDSTONE_TICK: 2,            // game ticks per redstone tick
  PISTON_PUSH_LIMIT: 12,

  // Explosion
  TNT_FUSE_TICKS: 80,          // 4 seconds
  CREEPER_FUSE_TICKS: 30,      // 1.5 seconds
  CREEPER_EXPLOSION_RADIUS: 3,
  TNT_EXPLOSION_RADIUS: 4,

  // Colors
  PLAYER_COLORS: [
    '#FF4444', '#4488FF', '#44DD44', '#FFDD44', '#DD44DD',
    '#44DDDD', '#FF8844', '#FF88AA',
  ] as readonly string[],
} as const;

// =============================================================================
// 23. TOOL TIER SYSTEM
// =============================================================================

export const MATERIAL_TIER_LEVEL: Record<MaterialTier, number> = {
  hand: 0,
  wood: 1,
  stone: 2,
  iron: 3,
  diamond: 4,
  netherite: 5,
};

export interface MaterialTierConfig {
  tier: MaterialTier;
  level: number;
  durability: number;
  miningSpeed: number;
  attackDamageBonus: number;
  enchantability: number;
  repairMaterial: string;
  color: string;
}

export const MATERIAL_TIER_CONFIG: Record<MaterialTier, MaterialTierConfig> = {
  hand:      { tier: 'hand',      level: 0, durability: 0,    miningSpeed: 1.0,  attackDamageBonus: 0, enchantability: 0,  repairMaterial: '',              color: '#A0A0A0' },
  wood:      { tier: 'wood',      level: 1, durability: 59,   miningSpeed: 2.0,  attackDamageBonus: 0, enchantability: 15, repairMaterial: 'oak_planks',    color: '#B8935A' },
  stone:     { tier: 'stone',     level: 2, durability: 131,  miningSpeed: 4.0,  attackDamageBonus: 1, enchantability: 5,  repairMaterial: 'cobblestone',   color: '#808080' },
  iron:      { tier: 'iron',      level: 3, durability: 250,  miningSpeed: 6.0,  attackDamageBonus: 2, enchantability: 14, repairMaterial: 'iron_ingot',    color: '#D4D4D4' },
  diamond:   { tier: 'diamond',   level: 4, durability: 1561, miningSpeed: 8.0,  attackDamageBonus: 3, enchantability: 10, repairMaterial: 'diamond',       color: '#4AEDD9' },
  netherite: { tier: 'netherite', level: 5, durability: 2031, miningSpeed: 9.0,  attackDamageBonus: 4, enchantability: 15, repairMaterial: 'netherite_ingot', color: '#4D3D37' },
};

export const ARMOR_TIER_CONFIG: Record<MaterialTier, { helmet: number; chestplate: number; leggings: number; boots: number; toughness: number; knockbackResistance: number }> = {
  hand:      { helmet: 0, chestplate: 0, leggings: 0, boots: 0, toughness: 0, knockbackResistance: 0 },
  wood:      { helmet: 0, chestplate: 0, leggings: 0, boots: 0, toughness: 0, knockbackResistance: 0 },
  stone:     { helmet: 0, chestplate: 0, leggings: 0, boots: 0, toughness: 0, knockbackResistance: 0 },
  iron:      { helmet: 2, chestplate: 6, leggings: 5, boots: 2, toughness: 0, knockbackResistance: 0 },
  diamond:   { helmet: 3, chestplate: 8, leggings: 6, boots: 3, toughness: 2, knockbackResistance: 0 },
  netherite: { helmet: 3, chestplate: 8, leggings: 6, boots: 3, toughness: 3, knockbackResistance: 0.1 },
};

// =============================================================================
// 24. LOOT TABLE
// =============================================================================

export interface LootEntry {
  item: string;
  countMin: number;
  countMax: number;
  weight: number;
  enchantments?: EnchantmentInstance[];
}

export interface LootPool {
  rolls: number;
  rollsMax: number;
  entries: LootEntry[];
}

export interface LootTable {
  id: string;
  pools: LootPool[];
}

// =============================================================================
// 25. ACHIEVEMENTS / ADVANCEMENTS
// =============================================================================

export type AdvancementCategory = 'story' | 'nether' | 'end' | 'adventure' | 'husbandry';

export interface AdvancementCriteria {
  type: string;
  /** Conditions vary by criteria type. */
  conditions: Record<string, unknown>;
}

export interface AdvancementDefinition {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  category: AdvancementCategory;
  /** Parent advancement ID (null for root). */
  parent: string | null;
  /** Icon item ID. */
  icon: string;
  /** Frame type determines border style. */
  frame: 'task' | 'goal' | 'challenge';
  /** Criteria to complete this advancement. */
  criteria: Record<string, AdvancementCriteria>;
  /** Whether all criteria must be met (AND) or any (OR). */
  requireAll: boolean;
  /** Experience reward. */
  experienceReward: number;
  /** Item rewards. */
  itemRewards: { item: string; count: number }[];
}

// =============================================================================
// 26. GAME STATE UPDATE (periodic snapshot sent to clients)
// =============================================================================

export interface MSGameStateUpdate {
  /** Server tick. */
  tick: number;
  /** Player's own state. */
  self: PlayerState;
  /** Other visible players. */
  players: MSVisiblePlayer[];
  /** Visible entities (mobs, items, etc.). */
  entities: EntityState[];
  /** Block updates since last snapshot. */
  blockUpdates: { x: number; y: number; z: number; blockId: BlockId }[];
  /** Time of day (0-24000). */
  dayTime: number;
  /** Current day phase. */
  dayPhase: DayPhase;
  /** Current weather. */
  weather: WeatherType;
  /** System/game messages. */
  messages: MSChatEntry[];
}

export interface MSVisiblePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  color: string;
  sneaking: boolean;
  sprinting: boolean;
  swimming: boolean;
  gameMode: GameMode;
  heldItem?: string;
  armorSet?: string[];
  animation?: PlayerAnimation;
}

export interface MSChatEntry {
  playerId?: string;
  playerName?: string;
  message: string;
  timestamp: number;
  color?: string;
  system: boolean;
}

// =============================================================================
// 27. PHYSICS CONSTANTS
// =============================================================================

export const PHYSICS = {
  GRAVITY: 0.08,
  DRAG: 0.98,                  // air resistance per tick
  WATER_DRAG: 0.8,
  TERMINAL_VELOCITY: 3.92,
  JUMP_FORCE: 0.42,
  SPRINT_JUMP_BOOST: 0.2,      // forward velocity bonus
  STEP_HEIGHT: 0.6,            // max block height auto-climb
  SWIM_FORCE: 0.04,
  KNOCKBACK_HORIZONTAL: 0.4,
  KNOCKBACK_VERTICAL: 0.4,
  FALL_DAMAGE_THRESHOLD: 3,    // blocks (fall > 3 blocks = damage)
  FALL_DAMAGE_PER_BLOCK: 1,    // half-heart per block after threshold
  SLIME_BOUNCE_FACTOR: 1.0,    // velocity retention on slime block
  ICE_FRICTION: 0.98,
  NORMAL_FRICTION: 0.6,
  SOUL_SAND_SPEED: 0.4,
  HONEY_SPEED: 0.4,
  LADDER_SPEED: 0.15,
  LADDER_MAX_FALL: 0.15,
  WATER_BUOYANCY: 0.02,
  LAVA_BUOYANCY: 0.02,
  LAVA_SPEED_MULTIPLIER: 0.5,
} as const;

// =============================================================================
// 28. RENDERING CONSTANTS
// =============================================================================

export const RENDER_CONFIG = {
  /** Texture atlas tile size in pixels. */
  TILE_SIZE: 16,
  /** Atlas columns. */
  ATLAS_COLS: 32,
  /** Atlas rows. */
  ATLAS_ROWS: 32,
  /** Total atlas size in pixels. */
  ATLAS_SIZE: 512,
  /** FOV in degrees. */
  DEFAULT_FOV: 70,
  /** Near clipping plane. */
  NEAR_CLIP: 0.1,
  /** Far clipping plane. */
  FAR_CLIP: 1000,
  /** Ambient occlusion strength. */
  AO_STRENGTH: 0.25,
  /** Skybox gradient colors. */
  SKY_DAY_TOP: '#78A7FF',
  SKY_DAY_BOTTOM: '#C8E0FF',
  SKY_NIGHT_TOP: '#0C1445',
  SKY_NIGHT_BOTTOM: '#1A2355',
  SKY_SUNSET_TOP: '#2244AA',
  SKY_SUNSET_BOTTOM: '#FF6633',
  /** Block highlight color (when looking at a block). */
  BLOCK_HIGHLIGHT_COLOR: 'rgba(255, 255, 255, 0.3)',
  /** Crosshair color. */
  CROSSHAIR_COLOR: '#FFFFFF',
  /** Maximum particle count for performance. */
  MAX_PARTICLES: 2000,
} as const;

// =============================================================================
// 29. HUD & UI TYPES
// =============================================================================

export interface HUDState {
  health: number;
  maxHealth: number;
  hunger: number;
  saturation: number;
  armorPoints: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  selectedSlot: number;
  hotbar: (InventorySlot | null)[];
  offhand: InventorySlot | null;
  statusEffects: StatusEffectInstance[];
  gameMode: GameMode;
  /** Coordinates display (F3 style). */
  coordinates: PlayerPosition;
  /** Direction the player is facing. */
  facing: string;
  /** Current biome name. */
  biome: string;
  /** FPS counter. */
  fps: number;
  /** Ping in ms. */
  ping: number;
}

export type ScreenType =
  | 'none' | 'inventory' | 'crafting_table' | 'furnace'
  | 'blast_furnace' | 'smoker' | 'enchanting' | 'anvil'
  | 'brewing_stand' | 'chest' | 'double_chest' | 'ender_chest'
  | 'shulker_box' | 'hopper' | 'dispenser' | 'dropper'
  | 'villager_trade' | 'stonecutter' | 'loom' | 'cartography_table'
  | 'grindstone' | 'smithing_table' | 'beacon'
  | 'creative_inventory' | 'death_screen' | 'pause_menu' | 'settings';

// =============================================================================
// 30. FIRESTORE ROOM DOCUMENT (for server-side room persistence)
// =============================================================================

export interface MSFirestoreRoom {
  code: string;
  name: string;
  hostName: string;
  status: 'open' | 'playing' | 'closed';
  playerCount: number;
  maxPlayers: number;
  gameMode: GameMode;
  difficulty: Difficulty;
  worldType: WorldType;
  seed: number;
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// 31. UTILITY TYPES & HELPERS
// =============================================================================

/** Direction vectors for the 6 block faces. */
export const FACE_NORMALS: Record<BlockFace, BlockCoord> = {
  top:    { x: 0, y: 1, z: 0 },
  bottom: { x: 0, y: -1, z: 0 },
  north:  { x: 0, y: 0, z: -1 },
  south:  { x: 0, y: 0, z: 1 },
  east:   { x: 1, y: 0, z: 0 },
  west:   { x: -1, y: 0, z: 0 },
};

/** All six directions for neighbor iteration. */
export const ALL_FACES: BlockFace[] = ['top', 'bottom', 'north', 'south', 'east', 'west'];

/** Convert world coordinates to chunk coordinates. */
export function worldToChunk(x: number, z: number): ChunkCoord {
  return {
    x: Math.floor(x / CHUNK_WIDTH),
    z: Math.floor(z / CHUNK_DEPTH),
  };
}

/** Convert world coordinates to local chunk coordinates. */
export function worldToLocal(x: number, y: number, z: number): BlockCoord {
  return {
    x: ((x % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH,
    y,
    z: ((z % CHUNK_DEPTH) + CHUNK_DEPTH) % CHUNK_DEPTH,
  };
}

/** Index into a flat chunk block array. */
export function blockIndex(x: number, y: number, z: number): number {
  return y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x;
}

/** Check if a block ID represents a transparent block. */
export function isTransparent(blockId: BlockId): boolean {
  return blockId === Block.Air
    || blockId === Block.Water
    || blockId === Block.StillWater
    || blockId === Block.Glass
    || (blockId >= Block.WhiteStainedGlass && blockId <= Block.BlackStainedGlass)
    || blockId === Block.GlassPane
    || blockId === Block.IronBars
    || blockId === Block.OakLeaves
    || blockId === Block.SpruceLeaves
    || blockId === Block.BirchLeaves
    || blockId === Block.JungleLeaves
    || blockId === Block.AcaciaLeaves
    || blockId === Block.DarkOakLeaves
    || blockId === Block.Ice
    || blockId === Block.Vine
    || blockId === Block.Cobweb
    || blockId === Block.Torch
    || blockId === Block.Ladder
    || blockId === Block.TallGrass
    || blockId === Block.Fern
    || blockId === Block.DeadBush
    || (blockId >= Block.Dandelion && blockId <= Block.RoseBush);
}

/** Check if a block ID represents a liquid. */
export function isLiquid(blockId: BlockId): boolean {
  return blockId === Block.Water
    || blockId === Block.Lava
    || blockId === Block.StillWater
    || blockId === Block.StillLava;
}

/** Check if a block ID is a solid full cube. */
export function isSolidCube(blockId: BlockId): boolean {
  if (blockId === Block.Air) return false;
  if (isLiquid(blockId)) return false;
  if (isTransparent(blockId)) return false;
  // Slabs, stairs, fences, walls are not full cubes
  if (blockId >= Block.StoneSlab && blockId <= Block.DarkPrismarineSlab) return false;
  if (blockId >= Block.StoneStairs && blockId <= Block.PrismarineBrickStairs) return false;
  if (blockId >= Block.CobblestoneWall && blockId <= Block.RedSandstoneWall) return false;
  return true;
}

/** Check if a block emits light. */
export function getLuminance(blockId: BlockId): number {
  switch (blockId) {
    case Block.Glowstone: return 15;
    case Block.SeaLantern: return 15;
    case Block.Lantern: return 15;
    case Block.SoulLantern: return 10;
    case Block.Lava: return 15;
    case Block.StillLava: return 15;
    case Block.Torch: return 14;
    case Block.RedstoneTorch: return 7;
    case Block.RedstoneTorch_Wall: return 7;
    case Block.Campfire: return 15;
    case Block.SoulCampfire: return 10;
    case Block.ShroomLight: return 15;
    case Block.EndRod: return 14;
    case Block.Beacon: return 15;
    case Block.Conduit: return 15;
    case Block.EnchantingTable: return 7;
    case Block.BrewingStand: return 1;
    case Block.SeaPickle: return 6;
    case Block.MagmaBlock: return 3;
    case Block.RedstoneOre: return 9;
    case Block.RespawnAnchor: return 15;
    default: return 0;
  }
}

/** Dye color hex values for wool, terracotta, concrete, etc. */
export const DYE_COLORS: Record<DyeColor, string> = {
  white: '#F9FFFE',
  orange: '#F9801D',
  magenta: '#C74EBD',
  light_blue: '#3AB3DA',
  yellow: '#FED83D',
  lime: '#80C71F',
  pink: '#F38BAA',
  gray: '#474F52',
  light_gray: '#9D9D97',
  cyan: '#169C9C',
  purple: '#8932B8',
  blue: '#3C44AA',
  brown: '#835432',
  green: '#5E7C16',
  red: '#B02E26',
  black: '#1D1D21',
};

/** Block name lookup for common blocks (for UI display). */
export const BLOCK_NAMES: Partial<Record<BlockId, { en: string; ja: string }>> = {
  [Block.Air]: { en: 'Air', ja: '空気' },
  [Block.Stone]: { en: 'Stone', ja: '石' },
  [Block.Granite]: { en: 'Granite', ja: '花崗岩' },
  [Block.Diorite]: { en: 'Diorite', ja: '閃緑岩' },
  [Block.Andesite]: { en: 'Andesite', ja: '安山岩' },
  [Block.Grass]: { en: 'Grass Block', ja: '草ブロック' },
  [Block.Dirt]: { en: 'Dirt', ja: '土' },
  [Block.CoarseDirt]: { en: 'Coarse Dirt', ja: '粗い土' },
  [Block.Cobblestone]: { en: 'Cobblestone', ja: '丸石' },
  [Block.Bedrock]: { en: 'Bedrock', ja: '岩盤' },
  [Block.Sand]: { en: 'Sand', ja: '砂' },
  [Block.RedSand]: { en: 'Red Sand', ja: '赤い砂' },
  [Block.Gravel]: { en: 'Gravel', ja: '砂利' },
  [Block.CoalOre]: { en: 'Coal Ore', ja: '石炭鉱石' },
  [Block.IronOre]: { en: 'Iron Ore', ja: '鉄鉱石' },
  [Block.GoldOre]: { en: 'Gold Ore', ja: '金鉱石' },
  [Block.DiamondOre]: { en: 'Diamond Ore', ja: 'ダイヤモンド鉱石' },
  [Block.EmeraldOre]: { en: 'Emerald Ore', ja: 'エメラルド鉱石' },
  [Block.LapisOre]: { en: 'Lapis Lazuli Ore', ja: 'ラピスラズリ鉱石' },
  [Block.RedstoneOre]: { en: 'Redstone Ore', ja: 'レッドストーン鉱石' },
  [Block.OakLog]: { en: 'Oak Log', ja: 'オークの原木' },
  [Block.OakPlanks]: { en: 'Oak Planks', ja: 'オークの板材' },
  [Block.SpruceLog]: { en: 'Spruce Log', ja: 'トウヒの原木' },
  [Block.SprucePlanks]: { en: 'Spruce Planks', ja: 'トウヒの板材' },
  [Block.BirchLog]: { en: 'Birch Log', ja: 'シラカバの原木' },
  [Block.BirchPlanks]: { en: 'Birch Planks', ja: 'シラカバの板材' },
  [Block.JungleLog]: { en: 'Jungle Log', ja: 'ジャングルの原木' },
  [Block.JunglePlanks]: { en: 'Jungle Planks', ja: 'ジャングルの板材' },
  [Block.AcaciaLog]: { en: 'Acacia Log', ja: 'アカシアの原木' },
  [Block.AcaciaPlanks]: { en: 'Acacia Planks', ja: 'アカシアの板材' },
  [Block.DarkOakLog]: { en: 'Dark Oak Log', ja: 'ダークオークの原木' },
  [Block.DarkOakPlanks]: { en: 'Dark Oak Planks', ja: 'ダークオークの板材' },
  [Block.OakLeaves]: { en: 'Oak Leaves', ja: 'オークの葉' },
  [Block.Water]: { en: 'Water', ja: '水' },
  [Block.Lava]: { en: 'Lava', ja: '溶岩' },
  [Block.Glass]: { en: 'Glass', ja: 'ガラス' },
  [Block.WhiteWool]: { en: 'White Wool', ja: '白色の羊毛' },
  [Block.CraftingTable]: { en: 'Crafting Table', ja: '作業台' },
  [Block.Furnace]: { en: 'Furnace', ja: 'かまど' },
  [Block.Chest]: { en: 'Chest', ja: 'チェスト' },
  [Block.Torch]: { en: 'Torch', ja: '松明' },
  [Block.Obsidian]: { en: 'Obsidian', ja: '黒曜石' },
  [Block.DiamondBlock]: { en: 'Diamond Block', ja: 'ダイヤモンドブロック' },
  [Block.IronBlock]: { en: 'Iron Block', ja: '鉄ブロック' },
  [Block.GoldBlock]: { en: 'Gold Block', ja: '金ブロック' },
  [Block.Netherrack]: { en: 'Netherrack', ja: 'ネザーラック' },
  [Block.SoulSand]: { en: 'Soul Sand', ja: 'ソウルサンド' },
  [Block.Glowstone]: { en: 'Glowstone', ja: 'グロウストーン' },
  [Block.EndStone]: { en: 'End Stone', ja: 'エンドストーン' },
  [Block.Beacon]: { en: 'Beacon', ja: 'ビーコン' },
  [Block.TNT]: { en: 'TNT', ja: 'TNT' },
  [Block.Bookshelf]: { en: 'Bookshelf', ja: '本棚' },
};

/** Map color palette for minimap rendering. */
export const BLOCK_MAP_COLORS: Partial<Record<BlockId, string>> = {
  [Block.Air]: 'transparent',
  [Block.Stone]: '#7F7F7F',
  [Block.Granite]: '#9A6C50',
  [Block.Diorite]: '#B8B8B8',
  [Block.Andesite]: '#888888',
  [Block.Grass]: '#7CBD6B',
  [Block.Dirt]: '#866043',
  [Block.CoarseDirt]: '#6D4E35',
  [Block.Cobblestone]: '#6B6B6B',
  [Block.Sand]: '#DBD3A0',
  [Block.RedSand]: '#A55226',
  [Block.Gravel]: '#838383',
  [Block.Clay]: '#A4A8B8',
  [Block.Water]: '#3F76E4',
  [Block.Lava]: '#D4610A',
  [Block.OakLog]: '#6B4D2D',
  [Block.OakPlanks]: '#BC9862',
  [Block.OakLeaves]: '#3B6B22',
  [Block.SpruceLog]: '#3B2810',
  [Block.BirchLog]: '#D5CEA5',
  [Block.Ice]: '#A0D5F6',
  [Block.PackedIce]: '#8DB4D9',
  [Block.BlueIce]: '#74ADD5',
  [Block.Snow]: '#FAFAFA',
  [Block.SnowBlock]: '#F0F0F0',
  [Block.Obsidian]: '#0F0A18',
  [Block.Netherrack]: '#6B3535',
  [Block.SoulSand]: '#51392E',
  [Block.Glowstone]: '#F9D49C',
  [Block.EndStone]: '#DBD4A2',
  [Block.Bedrock]: '#343434',
  [Block.CoalOre]: '#636363',
  [Block.IronOre]: '#887768',
  [Block.GoldOre]: '#8A7443',
  [Block.DiamondOre]: '#5DECF5',
  [Block.EmeraldOre]: '#17DD62',
  [Block.LapisOre]: '#1E3C8E',
  [Block.RedstoneOre]: '#960000',
  [Block.Cactus]: '#0D6B1A',
  [Block.Bricks]: '#966B5B',
  [Block.StoneBricks]: '#7D7D7D',
  [Block.WhiteWool]: '#DBDBDB',
  [Block.OrangeWool]: '#D87F33',
  [Block.MagentaWool]: '#B24CD8',
  [Block.LightBlueWool]: '#6699D8',
  [Block.YellowWool]: '#E5E533',
  [Block.LimeWool]: '#7FCC19',
  [Block.PinkWool]: '#F27FA5',
  [Block.GrayWool]: '#4C4C4C',
  [Block.LightGrayWool]: '#999999',
  [Block.CyanWool]: '#4C7F99',
  [Block.PurpleWool]: '#7F3FB2',
  [Block.BlueWool]: '#334CB2',
  [Block.BrownWool]: '#664C33',
  [Block.GreenWool]: '#667F33',
  [Block.RedWool]: '#993333',
  [Block.BlackWool]: '#191919',
  [Block.Terracotta]: '#9E6246',
  [Block.TNT]: '#DB4C35',
  [Block.Bookshelf]: '#6B4D2D',
  [Block.CraftingTable]: '#825B2D',
  [Block.Furnace]: '#6B6B6B',
  [Block.Chest]: '#825B2D',
};
