// =============================================================================
// Minecraft: Nintendo Switch Edition — Complete Crafting Recipe Registry
// =============================================================================
// Barrel file that aggregates all recipe modules into the unified RECIPES array.
// Individual recipe categories are split into separate files for maintainability:
//   - recipes-basic.ts      — Planks, sticks, torches, tools (5 tiers)
//   - recipes-combat.ts     — Armor (4 tiers), bow, arrow, crossbow, shield
//   - recipes-building.ts   — Slabs, stairs, fences, doors, walls, bricks, etc.
//   - recipes-functional.ts — Functional blocks, redstone, transportation, food
//   - recipes-misc.ts       — Mineral blocks, dyes, decoration, shapeless, smelting
// =============================================================================

import type { CraftingRecipe } from '@/types/minecraft-switch';
import { BASIC_RECIPES } from './recipes-basic';
import { COMBAT_RECIPES } from './recipes-combat';
import { BUILDING_RECIPES } from './recipes-building';
import { FUNCTIONAL_RECIPES } from './recipes-functional';
import { MISC_RECIPES } from './recipes-misc';

// =============================================================================
// UNIFIED RECIPE REGISTRY
// =============================================================================

export const RECIPES: CraftingRecipe[] = [
  ...BASIC_RECIPES,
  ...COMBAT_RECIPES,
  ...BUILDING_RECIPES,
  ...FUNCTIONAL_RECIPES,
  ...MISC_RECIPES,
];

// =============================================================================
// CATEGORY CONSTANTS
// =============================================================================

export const RECIPE_CATEGORIES = [
  'all',
  'building',
  'decoration',
  'redstone',
  'transportation',
  'tools',
  'combat',
  'food',
  'misc',
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Filter recipes by category. Returns all recipes if category is 'all'.
 * Only returns shaped and shapeless recipes (not smelting) by default.
 */
export function getRecipesByCategory(category: RecipeCategory, includeSmelting = false): CraftingRecipe[] {
  const filtered = includeSmelting
    ? RECIPES
    : RECIPES.filter(r => r.type === 'shaped' || r.type === 'shapeless');

  if (category === 'all') return filtered;
  return filtered.filter(r => r.category === category);
}

/**
 * Find a recipe by its unique ID.
 */
export function getRecipeById(id: string): CraftingRecipe | undefined {
  return RECIPES.find(r => r.id === id);
}

/**
 * Get all unique categories that have at least one recipe.
 */
export function getActiveCategories(): string[] {
  const cats = new Set(RECIPES.map(r => r.category));
  return Array.from(cats).sort();
}

/**
 * Get only crafting table recipes (shaped + shapeless, not smelting).
 */
export function getCraftingTableRecipes(): CraftingRecipe[] {
  return RECIPES.filter(r => r.type === 'shaped' || r.type === 'shapeless');
}

/**
 * Get only smelting recipes.
 */
export function getSmeltingRecipes(): CraftingRecipe[] {
  return RECIPES.filter(r => r.type === 'smelting');
}
