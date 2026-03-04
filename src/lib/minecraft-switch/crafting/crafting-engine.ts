// =============================================================================
// Minecraft: Nintendo Switch Edition — Crafting Engine
// =============================================================================
// Pattern-matching engine for shaped and shapeless crafting recipes.
// Handles 2x2 (player inventory) and 3x3 (crafting table) grids.
// Supports horizontal mirroring, pattern trimming, and recipe discovery.
// =============================================================================

import type { CraftingRecipe } from '@/types/minecraft-switch';
import { RECIPES, RECIPE_CATEGORIES, type RecipeCategory } from './recipes';

// =============================================================================
// TYPES
// =============================================================================

/** A crafting grid cell: item ID string or null for empty. */
export type GridCell = string | null;

/** The result of a successful recipe match. */
export interface CraftResult {
  recipe: CraftingRecipe;
  item: string;
  count: number;
}

/** A recipe grouped by category for the recipe book. */
export interface RecipeBookCategory {
  category: string;
  recipes: CraftingRecipe[];
}

// =============================================================================
// PATTERN UTILITIES
// =============================================================================

/**
 * Trim empty rows and columns from a grid, returning the effective
 * (compacted) grid as a 2D string array plus its dimensions.
 *
 * An "empty" cell is null (in the grid) or a space character (in patterns).
 */
function trimGrid(grid: GridCell[][], rows: number, cols: number): { trimmed: GridCell[][]; width: number; height: number } {
  // Find bounding box of non-empty cells
  let minRow = rows, maxRow = -1, minCol = cols, maxCol = -1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== null) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  // Grid is entirely empty
  if (maxRow === -1) {
    return { trimmed: [], width: 0, height: 0 };
  }

  const height = maxRow - minRow + 1;
  const width = maxCol - minCol + 1;
  const trimmed: GridCell[][] = [];

  for (let r = minRow; r <= maxRow; r++) {
    const row: GridCell[] = [];
    for (let c = minCol; c <= maxCol; c++) {
      row.push(grid[r][c]);
    }
    trimmed.push(row);
  }

  return { trimmed, width, height };
}

/**
 * Parse a recipe pattern (array of strings with char keys) into a 2D array
 * of item IDs using the recipe's key map.
 * Spaces in the pattern represent empty cells (null).
 */
function parsePattern(pattern: string[], key: Record<string, string>): { grid: GridCell[][]; width: number; height: number } {
  const height = pattern.length;
  const width = Math.max(...pattern.map(row => row.length));
  const grid: GridCell[][] = [];

  for (let r = 0; r < height; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < width; c++) {
      const char = pattern[r][c];
      if (!char || char === ' ') {
        row.push(null);
      } else {
        row.push(key[char] ?? null);
      }
    }
    grid.push(row);
  }

  return { grid, width, height };
}

/**
 * Horizontally mirror a 2D grid (flip left-to-right).
 */
function mirrorGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map(row => [...row].reverse());
}

/**
 * Check if two trimmed grids are identical (same dimensions, same contents).
 */
function gridsMatch(a: GridCell[][], b: GridCell[][], width: number, height: number): boolean {
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cellA = a[r]?.[c] ?? null;
      const cellB = b[r]?.[c] ?? null;
      if (cellA !== cellB) return false;
    }
  }
  return true;
}

/**
 * Collect all non-null items from a 2D grid into a sorted array.
 * Used for shapeless recipe matching.
 */
function collectItems(grid: GridCell[][]): string[] {
  const items: string[] = [];
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== null) {
        items.push(cell);
      }
    }
  }
  return items.sort();
}

// =============================================================================
// CRAFTING ENGINE CLASS
// =============================================================================

export class CraftingEngine {
  /** All recipes that can be checked on a crafting grid (shaped + shapeless). */
  private readonly craftingRecipes: CraftingRecipe[];

  constructor() {
    // Only include shaped and shapeless recipes (not smelting, etc.)
    this.craftingRecipes = RECIPES.filter(
      r => r.type === 'shaped' || r.type === 'shapeless'
    );
  }

  // ===========================================================================
  // CORE MATCHING
  // ===========================================================================

  /**
   * Match a crafting grid against all known recipes.
   *
   * @param grid - Flat array of item IDs or null. Length must be gridWidth^2.
   *               For 2x2: [0,1,2,3], for 3x3: [0,1,2,3,4,5,6,7,8].
   * @param gridWidth - 2 for player inventory crafting, 3 for crafting table.
   * @returns The matched CraftingRecipe, or null if no recipe matches.
   */
  matchRecipe(grid: GridCell[], gridWidth: number): CraftingRecipe | null {
    const gridHeight = grid.length / gridWidth;

    // Build 2D grid
    const grid2D: GridCell[][] = [];
    for (let r = 0; r < gridHeight; r++) {
      const row: GridCell[] = [];
      for (let c = 0; c < gridWidth; c++) {
        row.push(grid[r * gridWidth + c]);
      }
      grid2D.push(row);
    }

    // Trim the grid to get the effective pattern
    const { trimmed: inputTrimmed, width: inputWidth, height: inputHeight } = trimGrid(grid2D, gridHeight, gridWidth);

    // Empty grid matches nothing
    if (inputWidth === 0 || inputHeight === 0) return null;

    // Collect items for shapeless matching
    const inputItems = collectItems(inputTrimmed);
    const inputItemCount = inputItems.length;

    for (const recipe of this.craftingRecipes) {
      if (recipe.type === 'shaped') {
        if (this.matchShapedRecipe(recipe, inputTrimmed, inputWidth, inputHeight)) {
          return recipe;
        }
      } else if (recipe.type === 'shapeless') {
        if (this.matchShapelessRecipe(recipe, inputItems, inputItemCount)) {
          return recipe;
        }
      }
    }

    return null;
  }

  /**
   * Try to match a shaped recipe against the trimmed input grid.
   * Checks both the normal pattern and horizontally mirrored version.
   */
  private matchShapedRecipe(
    recipe: CraftingRecipe,
    inputTrimmed: GridCell[][],
    inputWidth: number,
    inputHeight: number,
  ): boolean {
    if (!recipe.pattern || !recipe.key) return false;

    // Parse the recipe pattern
    const { grid: recipeGrid, width: recipeWidth, height: recipeHeight } =
      parsePattern(recipe.pattern, recipe.key);

    // Trim the recipe pattern (remove empty rows/cols from pattern)
    const { trimmed: recipeTrimmed, width: trimmedRecipeWidth, height: trimmedRecipeHeight } =
      trimGrid(recipeGrid, recipeHeight, recipeWidth);

    // Dimensions must match
    if (trimmedRecipeWidth !== inputWidth || trimmedRecipeHeight !== inputHeight) {
      return false;
    }

    // Check normal orientation
    if (gridsMatch(inputTrimmed, recipeTrimmed, inputWidth, inputHeight)) {
      return true;
    }

    // Check mirrored orientation
    const mirrored = mirrorGrid(recipeTrimmed);
    if (gridsMatch(inputTrimmed, mirrored, inputWidth, inputHeight)) {
      return true;
    }

    return false;
  }

  /**
   * Try to match a shapeless recipe against the collected input items.
   * Checks that the grid contains exactly the right ingredients
   * (same items, same counts, order-independent).
   */
  private matchShapelessRecipe(
    recipe: CraftingRecipe,
    inputItems: string[],
    inputItemCount: number,
  ): boolean {
    if (!recipe.ingredients) return false;

    const recipeIngredients = [...recipe.ingredients].sort();

    // Must have exactly the same number of items
    if (recipeIngredients.length !== inputItemCount) return false;

    // Compare sorted arrays
    for (let i = 0; i < recipeIngredients.length; i++) {
      if (recipeIngredients[i] !== inputItems[i]) return false;
    }

    return true;
  }

  // ===========================================================================
  // CONVENIENCE METHODS
  // ===========================================================================

  /**
   * Check if any recipe matches the given grid.
   */
  canCraft(grid: GridCell[], gridWidth: number): boolean {
    return this.matchRecipe(grid, gridWidth) !== null;
  }

  /**
   * Get the craft result (item + count) if a recipe matches, or null.
   */
  getCraftResult(grid: GridCell[], gridWidth: number): CraftResult | null {
    const recipe = this.matchRecipe(grid, gridWidth);
    if (!recipe) return null;

    return {
      recipe,
      item: recipe.result,
      count: recipe.resultCount,
    };
  }

  /**
   * Consume ingredients from the crafting grid after a successful craft.
   * Removes one of each ingredient from the occupied grid slots.
   *
   * For items that leave a remainder (e.g., milk_bucket -> bucket),
   * the remainder item replaces the consumed slot.
   *
   * @param grid - The flat crafting grid (mutated in place).
   * @param gridWidth - Width of the grid (2 or 3).
   * @param recipe - The matched recipe.
   * @returns The modified grid with ingredients consumed.
   */
  consumeIngredients(grid: GridCell[], gridWidth: number, recipe: CraftingRecipe): GridCell[] {
    const result = [...grid];

    // Items that leave a remainder when consumed in crafting
    const REMAINDER_ITEMS: Record<string, string> = {
      'milk_bucket': 'bucket',
      'water_bucket': 'bucket',
      'lava_bucket': 'bucket',
      'honey_bottle': 'glass_bottle',
    };

    for (let i = 0; i < result.length; i++) {
      if (result[i] !== null) {
        const item = result[i]!;
        if (REMAINDER_ITEMS[item]) {
          // Replace with remainder item
          result[i] = REMAINDER_ITEMS[item];
        } else {
          // Remove the item
          result[i] = null;
        }
      }
    }

    return result;
  }

  /**
   * Consume ingredients from a grid that uses InventorySlot objects
   * with count tracking. Decrements count by 1 for each occupied slot.
   * Removes the slot entirely if count reaches 0.
   *
   * @param grid - Array of {item, count} or null (mutated in place).
   * @returns The modified grid.
   */
  consumeIngredientsWithCounts<T extends { item: string; count: number }>(
    grid: (T | null)[],
  ): (T | null)[] {
    const REMAINDER_ITEMS: Record<string, string> = {
      'milk_bucket': 'bucket',
      'water_bucket': 'bucket',
      'lava_bucket': 'bucket',
      'honey_bottle': 'glass_bottle',
    };

    const result = [...grid];

    for (let i = 0; i < result.length; i++) {
      const slot = result[i];
      if (slot !== null) {
        const remainder = REMAINDER_ITEMS[slot.item];
        if (remainder) {
          result[i] = { ...slot, item: remainder, count: 1 } as T;
        } else if (slot.count > 1) {
          result[i] = { ...slot, count: slot.count - 1 } as T;
        } else {
          result[i] = null;
        }
      }
    }

    return result;
  }

  // ===========================================================================
  // RECIPE DISCOVERY
  // ===========================================================================

  /**
   * Given a list of available items the player has, return all recipes
   * that could be crafted with those items.
   *
   * @param availableItems - Array of item IDs the player has in inventory.
   * @returns Array of craftable recipes.
   */
  discoverRecipes(availableItems: string[]): CraftingRecipe[] {
    const itemCounts = new Map<string, number>();
    for (const item of availableItems) {
      itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
    }

    return this.craftingRecipes.filter(recipe => {
      if (recipe.type === 'shaped') {
        return this.canCraftShaped(recipe, itemCounts);
      } else if (recipe.type === 'shapeless') {
        return this.canCraftShapeless(recipe, itemCounts);
      }
      return false;
    });
  }

  /**
   * Check if a shaped recipe can be crafted with the available items.
   */
  private canCraftShaped(recipe: CraftingRecipe, itemCounts: Map<string, number>): boolean {
    if (!recipe.pattern || !recipe.key) return false;

    // Count required items from pattern
    const required = new Map<string, number>();
    for (const row of recipe.pattern) {
      for (const char of row) {
        if (char !== ' ' && recipe.key[char]) {
          const item = recipe.key[char];
          required.set(item, (required.get(item) || 0) + 1);
        }
      }
    }

    // Check that player has enough of each required item
    for (const [item, count] of required) {
      if ((itemCounts.get(item) || 0) < count) return false;
    }

    return true;
  }

  /**
   * Check if a shapeless recipe can be crafted with the available items.
   */
  private canCraftShapeless(recipe: CraftingRecipe, itemCounts: Map<string, number>): boolean {
    if (!recipe.ingredients) return false;

    // Count required items from ingredients
    const required = new Map<string, number>();
    for (const item of recipe.ingredients) {
      required.set(item, (required.get(item) || 0) + 1);
    }

    // Check that player has enough of each required item
    for (const [item, count] of required) {
      if ((itemCounts.get(item) || 0) < count) return false;
    }

    return true;
  }

  // ===========================================================================
  // RECIPE BOOK
  // ===========================================================================

  /**
   * Return all crafting recipes grouped by category, for the recipe book UI.
   */
  getRecipeBook(): RecipeBookCategory[] {
    const groups: RecipeBookCategory[] = [];

    // "all" first, then individual categories
    groups.push({
      category: 'all',
      recipes: [...this.craftingRecipes],
    });

    for (const cat of RECIPE_CATEGORIES) {
      if (cat === 'all') continue;
      const recipes = this.craftingRecipes.filter(r => r.category === cat);
      if (recipes.length > 0) {
        groups.push({ category: cat, recipes });
      }
    }

    return groups;
  }

  /**
   * Get the number of times a recipe can be crafted given available items.
   *
   * @param recipe - The recipe to check.
   * @param itemCounts - Map of item ID to available count.
   * @returns Maximum number of times the recipe can be crafted.
   */
  getMaxCraftCount(recipe: CraftingRecipe, itemCounts: Map<string, number>): number {
    const required = this.getRequiredItems(recipe);
    if (required.size === 0) return 0;

    let maxCount = Infinity;
    for (const [item, count] of required) {
      const available = itemCounts.get(item) || 0;
      maxCount = Math.min(maxCount, Math.floor(available / count));
    }

    return maxCount === Infinity ? 0 : maxCount;
  }

  /**
   * Get a map of required items and their counts for a recipe.
   */
  getRequiredItems(recipe: CraftingRecipe): Map<string, number> {
    const required = new Map<string, number>();

    if (recipe.type === 'shaped' && recipe.pattern && recipe.key) {
      for (const row of recipe.pattern) {
        for (const char of row) {
          if (char !== ' ' && recipe.key[char]) {
            const item = recipe.key[char];
            required.set(item, (required.get(item) || 0) + 1);
          }
        }
      }
    } else if (recipe.type === 'shapeless' && recipe.ingredients) {
      for (const item of recipe.ingredients) {
        required.set(item, (required.get(item) || 0) + 1);
      }
    }

    return required;
  }

  /**
   * Get the pattern grid for a recipe as a 2D array of item IDs,
   * suitable for displaying in the UI. Returns null for shapeless recipes.
   *
   * @param recipe - The recipe to visualize.
   * @returns A 3x3 grid (or smaller) with item IDs, or null.
   */
  getPatternGrid(recipe: CraftingRecipe): GridCell[][] | null {
    if (recipe.type !== 'shaped' || !recipe.pattern || !recipe.key) {
      return null;
    }

    const { grid } = parsePattern(recipe.pattern, recipe.key);
    return grid;
  }

  /**
   * Get the pattern dimensions for a shaped recipe.
   * Returns {width, height} or null for shapeless recipes.
   */
  getPatternSize(recipe: CraftingRecipe): { width: number; height: number } | null {
    if (recipe.type !== 'shaped' || !recipe.pattern) return null;

    const height = recipe.pattern.length;
    const width = Math.max(...recipe.pattern.map(row => row.length));
    return { width, height };
  }

  /**
   * Check if a recipe requires a 3x3 crafting table grid
   * (i.e., it cannot fit in a 2x2 grid).
   */
  requiresCraftingTable(recipe: CraftingRecipe): boolean {
    if (recipe.type === 'shapeless') {
      // Shapeless recipes with more than 4 ingredients need a crafting table
      return (recipe.ingredients?.length || 0) > 4;
    }

    if (recipe.type === 'shaped' && recipe.pattern && recipe.key) {
      const { grid } = parsePattern(recipe.pattern, recipe.key);
      const { width, height } = trimGrid(grid, recipe.pattern.length, Math.max(...recipe.pattern.map(r => r.length)));

      // If the trimmed pattern is larger than 2x2, it needs a crafting table
      return width > 2 || height > 2;
    }

    return false;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Global crafting engine instance. */
let _engine: CraftingEngine | null = null;

/**
 * Get the global CraftingEngine singleton.
 * Lazily initialized on first access.
 */
export function getCraftingEngine(): CraftingEngine {
  if (!_engine) {
    _engine = new CraftingEngine();
  }
  return _engine;
}
