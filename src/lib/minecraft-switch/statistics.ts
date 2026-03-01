// =============================================================================
// Statistics Tracking System — GameStatistics & StatisticsManager
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================
// Comprehensive statistics tracking covering blocks, items, mobs, distances,
// combat, food, and general gameplay metrics. Supports serialization for
// world save persistence and formatted output for UI display.
// =============================================================================

import { Block } from '@/types/minecraft-switch';

// =============================================================================
// Block & Item Display Name Lookups
// =============================================================================

/**
 * Display names for the most common block IDs.
 * Used in statistics display to show human-readable names instead of raw IDs.
 */
const BLOCK_DISPLAY_NAMES: Record<number, string> = {
  [Block.Air]: 'Air',
  [Block.Stone]: 'Stone',
  [Block.Granite]: 'Granite',
  [Block.Diorite]: 'Diorite',
  [Block.Andesite]: 'Andesite',
  [Block.Grass]: 'Grass Block',
  [Block.Dirt]: 'Dirt',
  [Block.CoarseDirt]: 'Coarse Dirt',
  [Block.Cobblestone]: 'Cobblestone',
  [Block.Bedrock]: 'Bedrock',
  [Block.Sand]: 'Sand',
  [Block.RedSand]: 'Red Sand',
  [Block.Gravel]: 'Gravel',
  [Block.Clay]: 'Clay',
  [Block.Sandstone]: 'Sandstone',
  [Block.CoalOre]: 'Coal Ore',
  [Block.IronOre]: 'Iron Ore',
  [Block.GoldOre]: 'Gold Ore',
  [Block.DiamondOre]: 'Diamond Ore',
  [Block.EmeraldOre]: 'Emerald Ore',
  [Block.LapisOre]: 'Lapis Lazuli Ore',
  [Block.RedstoneOre]: 'Redstone Ore',
  [Block.NetherQuartzOre]: 'Nether Quartz Ore',
  [Block.AncientDebris]: 'Ancient Debris',
  [Block.CoalBlock]: 'Block of Coal',
  [Block.IronBlock]: 'Block of Iron',
  [Block.GoldBlock]: 'Block of Gold',
  [Block.DiamondBlock]: 'Block of Diamond',
  [Block.EmeraldBlock]: 'Block of Emerald',
  [Block.LapisBlock]: 'Block of Lapis Lazuli',
  [Block.RedstoneBlock]: 'Block of Redstone',
  [Block.NetheriteBlock]: 'Block of Netherite',
  [Block.OakLog]: 'Oak Log',
  [Block.OakPlanks]: 'Oak Planks',
  [Block.SpruceLog]: 'Spruce Log',
  [Block.SprucePlanks]: 'Spruce Planks',
  [Block.BirchLog]: 'Birch Log',
  [Block.BirchPlanks]: 'Birch Planks',
  [Block.JungleLog]: 'Jungle Log',
  [Block.JunglePlanks]: 'Jungle Planks',
  [Block.AcaciaLog]: 'Acacia Log',
  [Block.AcaciaPlanks]: 'Acacia Planks',
  [Block.DarkOakLog]: 'Dark Oak Log',
  [Block.DarkOakPlanks]: 'Dark Oak Planks',
  [Block.OakLeaves]: 'Oak Leaves',
  [Block.SpruceLeaves]: 'Spruce Leaves',
  [Block.BirchLeaves]: 'Birch Leaves',
  [Block.Glass]: 'Glass',
  [Block.Obsidian]: 'Obsidian',
  [Block.CraftingTable]: 'Crafting Table',
  [Block.Furnace]: 'Furnace',
  [Block.Chest]: 'Chest',
  [Block.TNT]: 'TNT',
  [Block.Torch]: 'Torch',
  [Block.Bookshelf]: 'Bookshelf',
  [Block.StoneBricks]: 'Stone Bricks',
  [Block.Netherrack]: 'Netherrack',
  [Block.Glowstone]: 'Glowstone',
  [Block.EndStone]: 'End Stone',
  [Block.Ice]: 'Ice',
  [Block.Snow]: 'Snow',
  [Block.Farmland]: 'Farmland',
  [Block.Wheat]: 'Wheat',
  [Block.MelonBlock]: 'Melon',
  [Block.PumpkinBlock]: 'Pumpkin',
  [Block.Bricks]: 'Bricks',
  [Block.SmoothStone]: 'Smooth Stone',
  [Block.Water]: 'Water',
  [Block.Lava]: 'Lava',
  [Block.Cactus]: 'Cactus',
  [Block.SugarCane]: 'Sugar Cane',
};

/**
 * Display names for common item string IDs.
 * These correspond to the item string IDs used in InventorySlot.
 */
const ITEM_DISPLAY_NAMES: Record<string, string> = {
  // Tools
  wooden_pickaxe: 'Wooden Pickaxe',
  stone_pickaxe: 'Stone Pickaxe',
  iron_pickaxe: 'Iron Pickaxe',
  diamond_pickaxe: 'Diamond Pickaxe',
  netherite_pickaxe: 'Netherite Pickaxe',
  wooden_axe: 'Wooden Axe',
  stone_axe: 'Stone Axe',
  iron_axe: 'Iron Axe',
  diamond_axe: 'Diamond Axe',
  netherite_axe: 'Netherite Axe',
  wooden_shovel: 'Wooden Shovel',
  stone_shovel: 'Stone Shovel',
  iron_shovel: 'Iron Shovel',
  diamond_shovel: 'Diamond Shovel',
  netherite_shovel: 'Netherite Shovel',
  wooden_hoe: 'Wooden Hoe',
  stone_hoe: 'Stone Hoe',
  iron_hoe: 'Iron Hoe',
  diamond_hoe: 'Diamond Hoe',
  netherite_hoe: 'Netherite Hoe',
  // Weapons
  wooden_sword: 'Wooden Sword',
  stone_sword: 'Stone Sword',
  iron_sword: 'Iron Sword',
  diamond_sword: 'Diamond Sword',
  netherite_sword: 'Netherite Sword',
  bow: 'Bow',
  crossbow: 'Crossbow',
  trident: 'Trident',
  shield: 'Shield',
  // Armor
  leather_helmet: 'Leather Cap',
  leather_chestplate: 'Leather Tunic',
  leather_leggings: 'Leather Pants',
  leather_boots: 'Leather Boots',
  iron_helmet: 'Iron Helmet',
  iron_chestplate: 'Iron Chestplate',
  iron_leggings: 'Iron Leggings',
  iron_boots: 'Iron Boots',
  diamond_helmet: 'Diamond Helmet',
  diamond_chestplate: 'Diamond Chestplate',
  diamond_leggings: 'Diamond Leggings',
  diamond_boots: 'Diamond Boots',
  netherite_helmet: 'Netherite Helmet',
  netherite_chestplate: 'Netherite Chestplate',
  netherite_leggings: 'Netherite Leggings',
  netherite_boots: 'Netherite Boots',
  // Materials
  stick: 'Stick',
  coal: 'Coal',
  charcoal: 'Charcoal',
  iron_ingot: 'Iron Ingot',
  gold_ingot: 'Gold Ingot',
  diamond: 'Diamond',
  emerald: 'Emerald',
  netherite_ingot: 'Netherite Ingot',
  netherite_scrap: 'Netherite Scrap',
  lapis_lazuli: 'Lapis Lazuli',
  redstone: 'Redstone',
  string: 'String',
  leather: 'Leather',
  feather: 'Feather',
  flint: 'Flint',
  bone: 'Bone',
  bone_meal: 'Bone Meal',
  // Food
  apple: 'Apple',
  golden_apple: 'Golden Apple',
  bread: 'Bread',
  cooked_beef: 'Steak',
  raw_beef: 'Raw Beef',
  cooked_porkchop: 'Cooked Porkchop',
  raw_porkchop: 'Raw Porkchop',
  cooked_chicken: 'Cooked Chicken',
  raw_chicken: 'Raw Chicken',
  cooked_mutton: 'Cooked Mutton',
  raw_mutton: 'Raw Mutton',
  cooked_salmon: 'Cooked Salmon',
  raw_salmon: 'Raw Salmon',
  cooked_cod: 'Cooked Cod',
  raw_cod: 'Raw Cod',
  baked_potato: 'Baked Potato',
  potato: 'Potato',
  carrot: 'Carrot',
  golden_carrot: 'Golden Carrot',
  melon_slice: 'Melon Slice',
  sweet_berries: 'Sweet Berries',
  cookie: 'Cookie',
  cake: 'Cake',
  pumpkin_pie: 'Pumpkin Pie',
  mushroom_stew: 'Mushroom Stew',
  beetroot_soup: 'Beetroot Soup',
  spider_eye: 'Spider Eye',
  rotten_flesh: 'Rotten Flesh',
  // Misc
  arrow: 'Arrow',
  bucket: 'Bucket',
  water_bucket: 'Water Bucket',
  lava_bucket: 'Lava Bucket',
  fishing_rod: 'Fishing Rod',
  shears: 'Shears',
  flint_and_steel: 'Flint and Steel',
  torch: 'Torch',
  crafting_table: 'Crafting Table',
  furnace: 'Furnace',
  chest: 'Chest',
};

/**
 * Get the display name for a block ID.
 * Falls back to "Block #<id>" if not in the lookup table.
 */
export function getBlockDisplayName(blockId: number): string {
  return BLOCK_DISPLAY_NAMES[blockId] ?? `Block #${blockId}`;
}

/**
 * Get the display name for an item string ID.
 * Falls back to formatting the ID as a title case string.
 */
export function getItemDisplayName(itemId: string): string {
  if (ITEM_DISPLAY_NAMES[itemId]) return ITEM_DISPLAY_NAMES[itemId];
  // Convert snake_case to Title Case
  return itemId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get the display name for an item numeric ID.
 * For items stored as numbers (crafted/used/broken/food), we check
 * the block name map first, then fall back to generic.
 */
export function getItemDisplayNameById(itemId: number): string {
  if (BLOCK_DISPLAY_NAMES[itemId]) return BLOCK_DISPLAY_NAMES[itemId];
  return `Item #${itemId}`;
}

// =============================================================================
// Statistics Data Types
// =============================================================================

export interface GeneralStatistics {
  /** Total time played in seconds. */
  playTime: number;
  /** Seconds since the player last died. */
  timeSinceLastDeath: number;
  /** Distance walked in blocks. */
  distanceWalked: number;
  /** Distance sprinted in blocks. */
  distanceSprinted: number;
  /** Distance swum in blocks. */
  distanceSwum: number;
  /** Distance flown (elytra) in blocks. */
  distanceFlown: number;
  /** Distance climbed (ladders/vines) in blocks. */
  distanceClimbed: number;
  /** Distance fallen in blocks. */
  distanceFallen: number;
  /** Total number of jumps. */
  jumps: number;
  /** Total damage dealt to entities (half-hearts). */
  damageDealt: number;
  /** Total damage taken from all sources (half-hearts). */
  damageTaken: number;
  /** Total number of deaths. */
  deaths: number;
  /** Total mobs killed (all types combined). */
  mobsKilled: number;
  /** Total players killed (in multiplayer). */
  playersKilled: number;
  /** Total fish caught with a fishing rod. */
  fishCaught: number;
  /** Total animals bred. */
  animalsBred: number;
  /** Seconds since the player last slept in a bed. */
  timeSinceLastRest: number;
}

export interface GameStatistics {
  /** General gameplay counters. */
  general: GeneralStatistics;
  /** Count of each block type mined (blockId -> count). */
  blocksMined: Record<number, number>;
  /** Count of each block type placed (blockId -> count). */
  blocksPlaced: Record<number, number>;
  /** Count of each item type crafted (itemId -> count). */
  itemsCrafted: Record<number, number>;
  /** Count of each item type used (itemId -> count). */
  itemsUsed: Record<number, number>;
  /** Count of tools/weapons broken (itemId -> count). */
  itemsBroken: Record<number, number>;
  /** Count of each mob type killed (mobType string -> count). */
  mobsKilledByType: Record<string, number>;
  /** Count of each food item eaten (itemId -> count). */
  foodEaten: Record<number, number>;
}

/** Stat entry for UI display. */
export interface StatDisplayEntry {
  label: string;
  value: string | number;
}

/** Category of stats for UI display. */
export interface StatDisplayCategory {
  category: string;
  entries: StatDisplayEntry[];
}

// =============================================================================
// Statistics Manager
// =============================================================================

/**
 * Tracks all gameplay statistics for a single world/session.
 *
 * Usage:
 * 1. Create a new StatisticsManager (or deserialize from a saved world)
 * 2. Call increment/add/record methods during gameplay
 * 3. Call tick(dt) each frame/game tick to update time-based counters
 * 4. Serialize to JSON for persistence with world saves
 * 5. Use getTopX / getAllStats for UI display
 */
export class StatisticsManager {
  private state: GameStatistics;

  constructor() {
    this.state = StatisticsManager.createEmpty();
  }

  /**
   * Create a fresh, zeroed-out statistics object.
   */
  private static createEmpty(): GameStatistics {
    return {
      general: {
        playTime: 0,
        timeSinceLastDeath: 0,
        distanceWalked: 0,
        distanceSprinted: 0,
        distanceSwum: 0,
        distanceFlown: 0,
        distanceClimbed: 0,
        distanceFallen: 0,
        jumps: 0,
        damageDealt: 0,
        damageTaken: 0,
        deaths: 0,
        mobsKilled: 0,
        playersKilled: 0,
        fishCaught: 0,
        animalsBred: 0,
        timeSinceLastRest: 0,
      },
      blocksMined: {},
      blocksPlaced: {},
      itemsCrafted: {},
      itemsUsed: {},
      itemsBroken: {},
      mobsKilledByType: {},
      foodEaten: {},
    };
  }

  /**
   * Reset all statistics to zero.
   */
  reset(): void {
    this.state = StatisticsManager.createEmpty();
  }

  // ---------------------------------------------------------------------------
  // Block Statistics
  // ---------------------------------------------------------------------------

  /**
   * Increment a block statistic (mined or placed) by 1.
   * @param category - 'mined' for blocks broken, 'placed' for blocks placed
   * @param blockId  - numeric block ID from the Block const
   */
  incrementBlock(category: 'mined' | 'placed', blockId: number): void {
    const record = category === 'mined' ? this.state.blocksMined : this.state.blocksPlaced;
    record[blockId] = (record[blockId] ?? 0) + 1;
  }

  // ---------------------------------------------------------------------------
  // Item Statistics
  // ---------------------------------------------------------------------------

  /**
   * Increment an item statistic by 1.
   * @param category - 'crafted', 'used' (consumed/activated), or 'broken' (tools that broke)
   * @param itemId   - numeric item ID
   */
  incrementItem(category: 'crafted' | 'used' | 'broken', itemId: number): void {
    let record: Record<number, number>;
    switch (category) {
      case 'crafted':
        record = this.state.itemsCrafted;
        break;
      case 'used':
        record = this.state.itemsUsed;
        break;
      case 'broken':
        record = this.state.itemsBroken;
        break;
    }
    record[itemId] = (record[itemId] ?? 0) + 1;
  }

  // ---------------------------------------------------------------------------
  // Mob Kill Statistics
  // ---------------------------------------------------------------------------

  /**
   * Record a mob kill, incrementing both the per-type counter and the
   * general mobsKilled total.
   * @param mobType - string identifier for the mob type (e.g. 'zombie', 'creeper')
   */
  incrementMobKill(mobType: string): void {
    this.state.mobsKilledByType[mobType] = (this.state.mobsKilledByType[mobType] ?? 0) + 1;
    this.state.general.mobsKilled++;
  }

  // ---------------------------------------------------------------------------
  // Food Statistics
  // ---------------------------------------------------------------------------

  /**
   * Record a food item being eaten.
   * @param itemId - numeric item ID of the food consumed
   */
  incrementFood(itemId: number): void {
    this.state.foodEaten[itemId] = (this.state.foodEaten[itemId] ?? 0) + 1;
  }

  // ---------------------------------------------------------------------------
  // Distance Statistics
  // ---------------------------------------------------------------------------

  /**
   * Add distance traveled to a specific movement type.
   * @param type   - movement category
   * @param amount - distance in blocks (can be fractional)
   */
  addDistance(
    type: 'walked' | 'sprinted' | 'swum' | 'flown' | 'climbed' | 'fallen',
    amount: number
  ): void {
    if (amount <= 0) return;

    switch (type) {
      case 'walked':
        this.state.general.distanceWalked += amount;
        break;
      case 'sprinted':
        this.state.general.distanceSprinted += amount;
        break;
      case 'swum':
        this.state.general.distanceSwum += amount;
        break;
      case 'flown':
        this.state.general.distanceFlown += amount;
        break;
      case 'climbed':
        this.state.general.distanceClimbed += amount;
        break;
      case 'fallen':
        this.state.general.distanceFallen += amount;
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Combat Statistics
  // ---------------------------------------------------------------------------

  /**
   * Add damage dealt or taken.
   * @param type   - 'dealt' for outgoing damage, 'taken' for incoming damage
   * @param amount - raw damage points (half-hearts)
   */
  addDamage(type: 'dealt' | 'taken', amount: number): void {
    if (amount <= 0) return;

    if (type === 'dealt') {
      this.state.general.damageDealt += amount;
    } else {
      this.state.general.damageTaken += amount;
    }
  }

  /**
   * Record a player death. Resets the timeSinceLastDeath counter and
   * increments the death count.
   */
  recordDeath(): void {
    this.state.general.deaths++;
    this.state.general.timeSinceLastDeath = 0;
  }

  /**
   * Record a jump.
   */
  recordJump(): void {
    this.state.general.jumps++;
  }

  /**
   * Record a player kill (PvP).
   */
  recordPlayerKill(): void {
    this.state.general.playersKilled++;
  }

  /**
   * Record a fish caught.
   */
  recordFishCaught(): void {
    this.state.general.fishCaught++;
  }

  /**
   * Record an animal bred.
   */
  recordAnimalBred(): void {
    this.state.general.animalsBred++;
  }

  /**
   * Record the player sleeping in a bed (resets timeSinceLastRest).
   */
  recordRest(): void {
    this.state.general.timeSinceLastRest = 0;
  }

  // ---------------------------------------------------------------------------
  // Time-Based Updates
  // ---------------------------------------------------------------------------

  /**
   * Update time-based statistics. Should be called each game tick or frame.
   * @param dt - delta time in seconds since last tick
   */
  tick(dt: number): void {
    if (dt <= 0) return;

    this.state.general.playTime += dt;
    this.state.general.timeSinceLastDeath += dt;
    this.state.general.timeSinceLastRest += dt;
  }

  // ---------------------------------------------------------------------------
  // Query Methods — Top N
  // ---------------------------------------------------------------------------

  /**
   * Get the top N most-mined blocks, sorted by count descending.
   * @param count - number of results to return
   */
  getTopBlocksMined(count: number): { blockId: number; count: number; name: string }[] {
    return getTopEntries(this.state.blocksMined, count).map(([id, cnt]) => ({
      blockId: id,
      count: cnt,
      name: getBlockDisplayName(id),
    }));
  }

  /**
   * Get the top N most-killed mob types, sorted by count descending.
   * @param count - number of results to return
   */
  getTopMobsKilled(count: number): { mobType: string; count: number }[] {
    return Object.entries(this.state.mobsKilledByType)
      .map(([mobType, cnt]) => ({ mobType, count: cnt }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
  }

  /**
   * Get the top N most-crafted items, sorted by count descending.
   * @param count - number of results to return
   */
  getTopItemsCrafted(count: number): { itemId: number; count: number; name: string }[] {
    return getTopEntries(this.state.itemsCrafted, count).map(([id, cnt]) => ({
      itemId: id,
      count: cnt,
      name: getItemDisplayNameById(id),
    }));
  }

  /**
   * Get the top N most-placed blocks, sorted by count descending.
   * @param count - number of results to return
   */
  getTopBlocksPlaced(count: number): { blockId: number; count: number; name: string }[] {
    return getTopEntries(this.state.blocksPlaced, count).map(([id, cnt]) => ({
      blockId: id,
      count: cnt,
      name: getBlockDisplayName(id),
    }));
  }

  /**
   * Get the top N most-eaten food items, sorted by count descending.
   * @param count - number of results to return
   */
  getTopFoodEaten(count: number): { itemId: number; count: number; name: string }[] {
    return getTopEntries(this.state.foodEaten, count).map(([id, cnt]) => ({
      itemId: id,
      count: cnt,
      name: getItemDisplayNameById(id),
    }));
  }

  // ---------------------------------------------------------------------------
  // Query Methods — Totals
  // ---------------------------------------------------------------------------

  /**
   * Get the total number of blocks mined across all block types.
   */
  getTotalBlocksMined(): number {
    return sumRecord(this.state.blocksMined);
  }

  /**
   * Get the total number of blocks placed across all block types.
   */
  getTotalBlocksPlaced(): number {
    return sumRecord(this.state.blocksPlaced);
  }

  /**
   * Get the total number of mobs killed across all mob types.
   */
  getTotalMobsKilled(): number {
    return this.state.general.mobsKilled;
  }

  /**
   * Get the total number of items crafted across all item types.
   */
  getTotalItemsCrafted(): number {
    return sumRecord(this.state.itemsCrafted);
  }

  /**
   * Get the total number of items used across all item types.
   */
  getTotalItemsUsed(): number {
    return sumRecord(this.state.itemsUsed);
  }

  /**
   * Get the total number of tools broken across all tool types.
   */
  getTotalItemsBroken(): number {
    return sumRecord(this.state.itemsBroken);
  }

  /**
   * Get the total distance traveled (sum of all movement types).
   */
  getTotalDistance(): number {
    const g = this.state.general;
    return (
      g.distanceWalked +
      g.distanceSprinted +
      g.distanceSwum +
      g.distanceFlown +
      g.distanceClimbed +
      g.distanceFallen
    );
  }

  // ---------------------------------------------------------------------------
  // Formatted Output
  // ---------------------------------------------------------------------------

  /**
   * Get the play time formatted as a human-readable string.
   * Examples: "0:00:00", "1:23:45", "100:05:30"
   */
  getFormattedPlayTime(): string {
    return formatDuration(this.state.general.playTime);
  }

  /**
   * Get all statistics organized by category for UI display.
   * Each category contains an array of { label, value } pairs.
   */
  getAllStats(): StatDisplayCategory[] {
    const g = this.state.general;

    const categories: StatDisplayCategory[] = [
      {
        category: 'General',
        entries: [
          { label: 'Play Time', value: formatDuration(g.playTime) },
          { label: 'Time Since Last Death', value: formatDuration(g.timeSinceLastDeath) },
          { label: 'Time Since Last Rest', value: formatDuration(g.timeSinceLastRest) },
          { label: 'Deaths', value: g.deaths },
          { label: 'Jumps', value: g.jumps },
        ],
      },
      {
        category: 'Distance',
        entries: [
          { label: 'Distance Walked', value: formatDistance(g.distanceWalked) },
          { label: 'Distance Sprinted', value: formatDistance(g.distanceSprinted) },
          { label: 'Distance Swum', value: formatDistance(g.distanceSwum) },
          { label: 'Distance Flown', value: formatDistance(g.distanceFlown) },
          { label: 'Distance Climbed', value: formatDistance(g.distanceClimbed) },
          { label: 'Distance Fallen', value: formatDistance(g.distanceFallen) },
        ],
      },
      {
        category: 'Combat',
        entries: [
          { label: 'Damage Dealt', value: formatHearts(g.damageDealt) },
          { label: 'Damage Taken', value: formatHearts(g.damageTaken) },
          { label: 'Mobs Killed', value: g.mobsKilled },
          { label: 'Players Killed', value: g.playersKilled },
        ],
      },
      {
        category: 'Gathering',
        entries: [
          { label: 'Blocks Mined', value: this.getTotalBlocksMined() },
          { label: 'Blocks Placed', value: this.getTotalBlocksPlaced() },
          { label: 'Items Crafted', value: this.getTotalItemsCrafted() },
          { label: 'Items Used', value: this.getTotalItemsUsed() },
          { label: 'Tools Broken', value: this.getTotalItemsBroken() },
          { label: 'Fish Caught', value: g.fishCaught },
          { label: 'Animals Bred', value: g.animalsBred },
        ],
      },
      {
        category: 'Blocks Mined',
        entries: this.getTopBlocksMined(10).map((entry) => ({
          label: entry.name,
          value: entry.count,
        })),
      },
      {
        category: 'Blocks Placed',
        entries: this.getTopBlocksPlaced(10).map((entry) => ({
          label: entry.name,
          value: entry.count,
        })),
      },
      {
        category: 'Items Crafted',
        entries: this.getTopItemsCrafted(10).map((entry) => ({
          label: entry.name,
          value: entry.count,
        })),
      },
      {
        category: 'Mobs Killed',
        entries: this.getTopMobsKilled(10).map((entry) => ({
          label: formatMobName(entry.mobType),
          value: entry.count,
        })),
      },
      {
        category: 'Food Eaten',
        entries: this.getTopFoodEaten(10).map((entry) => ({
          label: entry.name,
          value: entry.count,
        })),
      },
    ];

    // Filter out empty per-item categories (keep fixed categories always)
    return categories.filter(
      (cat) =>
        cat.entries.length > 0 ||
        cat.category === 'General' ||
        cat.category === 'Distance' ||
        cat.category === 'Combat' ||
        cat.category === 'Gathering'
    );
  }

  // ---------------------------------------------------------------------------
  // Serialization / Deserialization
  // ---------------------------------------------------------------------------

  /**
   * Serialize all statistics to a JSON string for persistence.
   */
  serialize(): string {
    return JSON.stringify(this.state);
  }

  /**
   * Deserialize statistics from a JSON string.
   * Gracefully handles missing fields by keeping them at zero.
   * @param json - JSON string produced by serialize()
   */
  deserialize(json: string): void {
    try {
      const parsed = JSON.parse(json) as Partial<GameStatistics>;

      // Create a fresh empty state and merge in parsed data
      const empty = StatisticsManager.createEmpty();

      // Merge general stats
      if (parsed.general) {
        for (const key of Object.keys(empty.general) as (keyof GeneralStatistics)[]) {
          if (typeof parsed.general[key] === 'number') {
            (empty.general as unknown as Record<string, number>)[key] = parsed.general[key] as number;
          }
        }
      }

      // Merge record-based stats
      if (parsed.blocksMined && typeof parsed.blocksMined === 'object') {
        empty.blocksMined = mergeNumericRecord(parsed.blocksMined);
      }
      if (parsed.blocksPlaced && typeof parsed.blocksPlaced === 'object') {
        empty.blocksPlaced = mergeNumericRecord(parsed.blocksPlaced);
      }
      if (parsed.itemsCrafted && typeof parsed.itemsCrafted === 'object') {
        empty.itemsCrafted = mergeNumericRecord(parsed.itemsCrafted);
      }
      if (parsed.itemsUsed && typeof parsed.itemsUsed === 'object') {
        empty.itemsUsed = mergeNumericRecord(parsed.itemsUsed);
      }
      if (parsed.itemsBroken && typeof parsed.itemsBroken === 'object') {
        empty.itemsBroken = mergeNumericRecord(parsed.itemsBroken);
      }
      if (parsed.foodEaten && typeof parsed.foodEaten === 'object') {
        empty.foodEaten = mergeNumericRecord(parsed.foodEaten);
      }
      if (parsed.mobsKilledByType && typeof parsed.mobsKilledByType === 'object') {
        empty.mobsKilledByType = mergeStringRecord(parsed.mobsKilledByType);
      }

      this.state = empty;
    } catch (err) {
      console.error('[StatisticsManager] Failed to deserialize statistics:', err);
      // Keep current state on parse error
    }
  }

  // ---------------------------------------------------------------------------
  // Direct State Access (for advanced use cases)
  // ---------------------------------------------------------------------------

  /**
   * Get a readonly snapshot of the current statistics state.
   */
  getState(): Readonly<GameStatistics> {
    return this.state;
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Get the top N entries from a numeric record, sorted by value descending.
 */
function getTopEntries(record: Record<number, number>, count: number): [number, number][] {
  return Object.entries(record)
    .map(([key, value]) => [Number(key), value] as [number, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, count);
}

/**
 * Sum all values in a numeric record.
 */
function sumRecord(record: Record<number, number>): number {
  let total = 0;
  for (const value of Object.values(record)) {
    total += value;
  }
  return total;
}

/**
 * Merge a parsed object into a clean Record<number, number>,
 * validating that all values are positive numbers.
 */
function mergeNumericRecord(source: Record<string | number, unknown>): Record<number, number> {
  const result: Record<number, number> = {};
  for (const [key, value] of Object.entries(source)) {
    const numKey = Number(key);
    if (!isNaN(numKey) && typeof value === 'number' && value > 0) {
      result[numKey] = value;
    }
  }
  return result;
}

/**
 * Merge a parsed object into a clean Record<string, number>,
 * validating that all values are positive numbers.
 */
function mergeStringRecord(source: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'number' && value > 0) {
      result[key] = value;
    }
  }
  return result;
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Format a duration in seconds to "H:MM:SS" format.
 * For durations over 24 hours, shows total hours (e.g. "100:05:30").
 */
function formatDuration(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format a distance in blocks to a readable string.
 * - Under 1000: "X.X m" (blocks)
 * - 1000+: "X.XX km"
 */
function formatDistance(blocks: number): string {
  if (blocks < 1000) {
    return `${blocks.toFixed(1)} m`;
  }
  return `${(blocks / 1000).toFixed(2)} km`;
}

/**
 * Format damage in half-hearts to a readable string showing hearts.
 * Each heart = 2 damage points.
 */
function formatHearts(halfHearts: number): string {
  const hearts = halfHearts / 2;
  return `${hearts.toFixed(1)} hearts`;
}

/**
 * Format a mob type identifier to a display-friendly name.
 * Converts snake_case to Title Case.
 */
function formatMobName(mobType: string): string {
  return mobType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
