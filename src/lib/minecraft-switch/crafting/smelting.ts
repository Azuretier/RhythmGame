// =============================================================================
// Smelting System — Minecraft: Nintendo Switch Edition
// =============================================================================
// Furnace smelting recipes and fuel values. Each recipe maps an input item to
// an output item with an experience reward. Fuel values are measured in ticks
// where 200 ticks smelt one item.
// =============================================================================

// =============================================================================
// SMELTING RECIPE TYPE
// =============================================================================

export interface SmeltingRecipe {
  /** Input item ID (consumed). */
  input: string;
  /** Output item ID (produced). */
  output: string;
  /** Experience awarded per smelt. */
  experience: number;
}

// =============================================================================
// SMELTING RECIPES
// =============================================================================

/**
 * Complete smelting recipe registry.
 * Each entry defines what a furnace can convert along with XP reward.
 */
export const SMELTING_RECIPES: SmeltingRecipe[] = [
  // -------------------------------------------------------------------------
  // Ores -> Ingots / Materials
  // -------------------------------------------------------------------------
  { input: 'iron_ore',        output: 'iron_ingot',      experience: 0.7 },
  { input: 'gold_ore',        output: 'gold_ingot',      experience: 1.0 },
  { input: 'raw_copper',      output: 'copper_ingot',    experience: 0.7 },
  { input: 'raw_iron',        output: 'iron_ingot',      experience: 0.7 },
  { input: 'raw_gold',        output: 'gold_ingot',      experience: 1.0 },
  { input: 'copper_ore',      output: 'copper_ingot',    experience: 0.7 },
  { input: 'nether_gold_ore', output: 'gold_ingot',      experience: 1.0 },
  { input: 'ancient_debris',  output: 'netherite_scrap', experience: 2.0 },

  // -------------------------------------------------------------------------
  // Stone & Mineral Processing
  // -------------------------------------------------------------------------
  { input: 'cobblestone',          output: 'stone',            experience: 0.1 },
  { input: 'stone',                output: 'smooth_stone',     experience: 0.1 },
  { input: 'sand',                 output: 'glass',            experience: 0.1 },
  { input: 'red_sand',             output: 'glass',            experience: 0.1 },
  { input: 'sandstone',            output: 'smooth_sandstone', experience: 0.1 },
  { input: 'red_sandstone',        output: 'smooth_red_sandstone', experience: 0.1 },
  { input: 'clay_ball',            output: 'brick',            experience: 0.3 },
  { input: 'clay',                 output: 'terracotta',       experience: 0.35 },
  { input: 'netherrack',           output: 'nether_brick',     experience: 0.1 },
  { input: 'stone_bricks',         output: 'cracked_stone_bricks', experience: 0.1 },
  { input: 'quartz_block',         output: 'smooth_quartz',    experience: 0.1 },
  { input: 'basalt',               output: 'smooth_basalt',    experience: 0.1 },
  { input: 'cobbled_deepslate',    output: 'deepslate',        experience: 0.1 },

  // -------------------------------------------------------------------------
  // Ore -> Gem / Dust (secondary ores)
  // -------------------------------------------------------------------------
  { input: 'coal_ore',             output: 'coal',             experience: 0.1 },
  { input: 'diamond_ore',          output: 'diamond',          experience: 1.0 },
  { input: 'emerald_ore',          output: 'emerald',          experience: 1.0 },
  { input: 'lapis_ore',            output: 'lapis_lazuli',     experience: 0.2 },
  { input: 'redstone_ore',         output: 'redstone',         experience: 0.3 },
  { input: 'nether_quartz_ore',    output: 'quartz',           experience: 0.2 },

  // -------------------------------------------------------------------------
  // Food — Raw Meats
  // -------------------------------------------------------------------------
  { input: 'raw_beef',      output: 'cooked_beef',      experience: 0.35 },
  { input: 'raw_porkchop',  output: 'cooked_porkchop',  experience: 0.35 },
  { input: 'raw_chicken',   output: 'cooked_chicken',    experience: 0.35 },
  { input: 'raw_mutton',    output: 'cooked_mutton',     experience: 0.35 },
  { input: 'raw_rabbit',    output: 'cooked_rabbit',     experience: 0.35 },
  { input: 'raw_cod',       output: 'cooked_cod',        experience: 0.35 },
  { input: 'raw_salmon',    output: 'cooked_salmon',     experience: 0.35 },
  { input: 'potato',        output: 'baked_potato',      experience: 0.35 },

  // -------------------------------------------------------------------------
  // Miscellaneous
  // -------------------------------------------------------------------------
  { input: 'oak_log',        output: 'charcoal',    experience: 0.15 },
  { input: 'spruce_log',     output: 'charcoal',    experience: 0.15 },
  { input: 'birch_log',      output: 'charcoal',    experience: 0.15 },
  { input: 'jungle_log',     output: 'charcoal',    experience: 0.15 },
  { input: 'acacia_log',     output: 'charcoal',    experience: 0.15 },
  { input: 'dark_oak_log',   output: 'charcoal',    experience: 0.15 },
  { input: 'crimson_stem',   output: 'charcoal',    experience: 0.15 },
  { input: 'warped_stem',    output: 'charcoal',    experience: 0.15 },
  { input: 'cactus',         output: 'green_dye',   experience: 0.2 },
  { input: 'kelp',           output: 'dried_kelp',  experience: 0.1 },
  { input: 'wet_sponge',     output: 'sponge',      experience: 0.15 },
  { input: 'chorus_fruit',   output: 'popped_chorus_fruit', experience: 0.1 },
  { input: 'sea_pickle',     output: 'lime_dye',    experience: 0.1 },
];

/**
 * Pre-built lookup map keyed by input item ID for O(1) recipe lookup.
 */
const SMELTING_RECIPE_MAP = new Map<string, SmeltingRecipe>();
for (const recipe of SMELTING_RECIPES) {
  SMELTING_RECIPE_MAP.set(recipe.input, recipe);
}

// =============================================================================
// FUEL VALUES
// =============================================================================

/**
 * Fuel burn durations in ticks. 200 ticks = 1 item smelted.
 *
 * Examples:
 *   Coal:        1600 ticks (8 items)
 *   Lava bucket: 20000 ticks (100 items)
 *   Stick:       100 ticks (0.5 items)
 */
export const FUEL_VALUES: ReadonlyMap<string, number> = new Map<string, number>([
  // --- High-value fuels ---
  ['lava_bucket',      20000],  // 100 items
  ['coal_block',       16000],  // 80 items
  ['dried_kelp_block', 4000],   // 20 items
  ['blaze_rod',        2400],   // 12 items

  // --- Standard fuels ---
  ['coal',     1600],   // 8 items
  ['charcoal', 1600],   // 8 items

  // --- Planks (all wood types) ---
  ['oak_planks',     300],
  ['spruce_planks',  300],
  ['birch_planks',   300],
  ['jungle_planks',  300],
  ['acacia_planks',  300],
  ['dark_oak_planks', 300],
  ['crimson_planks', 300],
  ['warped_planks',  300],

  // --- Logs (all wood types) ---
  ['oak_log',       300],
  ['spruce_log',    300],
  ['birch_log',     300],
  ['jungle_log',    300],
  ['acacia_log',    300],
  ['dark_oak_log',  300],
  ['crimson_stem',  300],
  ['warped_stem',   300],
  ['stripped_oak_log',       300],
  ['stripped_spruce_log',    300],
  ['stripped_birch_log',     300],
  ['stripped_jungle_log',    300],
  ['stripped_acacia_log',    300],
  ['stripped_dark_oak_log',  300],

  // --- Wooden tools & weapons (1 item each) ---
  ['wooden_pickaxe', 200],
  ['wooden_axe',     200],
  ['wooden_shovel',  200],
  ['wooden_hoe',     200],
  ['wooden_sword',   200],

  // --- Wood items ---
  ['bookshelf',  300],
  ['stick',      100],  // 0.5 items

  // --- Wool (all colors) ---
  ['white_wool',      100],
  ['orange_wool',     100],
  ['magenta_wool',    100],
  ['light_blue_wool', 100],
  ['yellow_wool',     100],
  ['lime_wool',       100],
  ['pink_wool',       100],
  ['gray_wool',       100],
  ['light_gray_wool', 100],
  ['cyan_wool',       100],
  ['purple_wool',     100],
  ['blue_wool',       100],
  ['brown_wool',      100],
  ['green_wool',      100],
  ['red_wool',        100],
  ['black_wool',      100],

  // --- Carpet ---
  ['white_carpet',      67],
  ['orange_carpet',     67],
  ['magenta_carpet',    67],
  ['light_blue_carpet', 67],
  ['yellow_carpet',     67],
  ['lime_carpet',       67],
  ['pink_carpet',       67],
  ['gray_carpet',       67],
  ['light_gray_carpet', 67],
  ['cyan_carpet',       67],
  ['purple_carpet',     67],
  ['blue_carpet',       67],
  ['brown_carpet',      67],
  ['green_carpet',      67],
  ['red_carpet',        67],
  ['black_carpet',      67],

  // --- Other combustibles ---
  ['bamboo',      50],   // 0.25 items
  ['scaffolding', 50],
  ['bow',         300],
  ['fishing_rod', 300],
  ['crossbow',    300],

  // --- Wooden slabs ---
  ['oak_slab',       150],
  ['spruce_slab',    150],
  ['birch_slab',     150],
  ['jungle_slab',    150],
  ['acacia_slab',    150],
  ['dark_oak_slab',  150],

  // --- Wooden fences & gates ---
  ['oak_fence',       300],
  ['spruce_fence',    300],
  ['birch_fence',     300],
  ['jungle_fence',    300],
  ['acacia_fence',    300],
  ['dark_oak_fence',  300],
  ['oak_fence_gate',       300],
  ['spruce_fence_gate',    300],
  ['birch_fence_gate',     300],
  ['jungle_fence_gate',    300],
  ['acacia_fence_gate',    300],
  ['dark_oak_fence_gate',  300],

  // --- Wooden doors & trapdoors ---
  ['oak_door',        200],
  ['spruce_door',     200],
  ['birch_door',      200],
  ['jungle_door',     200],
  ['acacia_door',     200],
  ['dark_oak_door',   200],
  ['oak_trapdoor',    300],
  ['spruce_trapdoor', 300],
  ['birch_trapdoor',  300],
  ['jungle_trapdoor', 300],
  ['acacia_trapdoor', 300],
  ['dark_oak_trapdoor', 300],

  // --- Boats ---
  ['oak_boat',       1200],
  ['spruce_boat',    1200],
  ['birch_boat',     1200],
  ['jungle_boat',    1200],
  ['acacia_boat',    1200],
  ['dark_oak_boat',  1200],

  // --- Wooden signs / buttons / pressure plates ---
  ['sign',           200],
  ['oak_button',     100],
  ['spruce_button',  100],
  ['birch_button',   100],
  ['jungle_button',  100],
  ['acacia_button',  100],
  ['dark_oak_button', 100],
  ['oak_pressure_plate',    300],
  ['spruce_pressure_plate', 300],
  ['birch_pressure_plate',  300],
  ['jungle_pressure_plate', 300],
  ['acacia_pressure_plate', 300],
  ['dark_oak_pressure_plate', 300],

  // --- Misc wooden items ---
  ['crafting_table', 300],
  ['chest',          300],
  ['trapped_chest',  300],
  ['jukebox',        300],
  ['note_block',     300],
  ['banner',         300],
  ['barrel',         300],
  ['cartography_table', 300],
  ['fletching_table',   300],
  ['loom',           300],
  ['composter',      300],
  ['lectern',        300],
  ['smithing_table', 300],
  ['bee_nest',       300],
  ['beehive',        300],
]);

// =============================================================================
// CONSTANTS
// =============================================================================

/** Ticks required to smelt one item. Standard for all furnace types. */
export const SMELT_TIME = 200;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Look up the smelting recipe for a given input item.
 *
 * @param inputItem - The item ID to look up.
 * @returns The matching smelting recipe, or null if no recipe exists.
 */
export function getSmeltingRecipe(inputItem: string): SmeltingRecipe | null {
  return SMELTING_RECIPE_MAP.get(inputItem) ?? null;
}

/**
 * Get the fuel burn duration in ticks for a given item.
 *
 * @param fuelItem - The item ID to check.
 * @returns Burn duration in ticks, or 0 if the item is not a fuel.
 */
export function getFuelValue(fuelItem: string): number {
  return FUEL_VALUES.get(fuelItem) ?? 0;
}

/**
 * Check whether a smelting operation can begin with the given input and fuel.
 * Returns true if there is a valid recipe for the input AND the fuel has a
 * non-zero burn value.
 *
 * @param input - The item ID to smelt.
 * @param fuel - The item ID to use as fuel.
 * @returns True if smelting can proceed.
 */
export function canSmelt(input: string, fuel: string): boolean {
  return SMELTING_RECIPE_MAP.has(input) && getFuelValue(fuel) > 0;
}

/**
 * Get the standard smelt time in ticks. This is constant for standard
 * furnaces. Blast furnaces and smokers halve this value externally.
 *
 * @returns 200 (ticks per item).
 */
export function getSmeltTime(): number {
  return SMELT_TIME;
}

/**
 * Check whether an item is a valid fuel source (can be placed in the fuel slot).
 *
 * @param itemId - The item ID to check.
 * @returns True if the item can be used as furnace fuel.
 */
export function isFuel(itemId: string): boolean {
  return FUEL_VALUES.has(itemId);
}

/**
 * Check whether an item is smeltable (can be placed in the input slot).
 *
 * @param itemId - The item ID to check.
 * @returns True if a smelting recipe exists for this item.
 */
export function isSmeltable(itemId: string): boolean {
  return SMELTING_RECIPE_MAP.has(itemId);
}

/**
 * Calculate how many items a single unit of fuel can smelt.
 *
 * @param fuelItem - The fuel item ID.
 * @returns Number of items this fuel can smelt (fractional if < 1).
 */
export function getFuelItemCount(fuelItem: string): number {
  const value = getFuelValue(fuelItem);
  if (value <= 0) return 0;
  return value / SMELT_TIME;
}
