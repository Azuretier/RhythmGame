// =============================================================
// Minecraft Board Game - Crafting Recipes
// =============================================================

import type { ItemType, InventoryItem } from '@/types/minecraft-board';

// === Recipe Definition ===

export interface CraftingRecipe {
  id: string;
  name: string;
  nameJa: string;
  inputs: { item: ItemType; quantity: number }[];
  output: { item: ItemType; quantity: number };
  requiresCraftingTable: boolean;
  requiresFurnace: boolean;
  tier: number; // 0-5 for display ordering
}

// === Recipe Definitions ===

export const RECIPES: CraftingRecipe[] = [
  // Tier 0: Basic (no tools needed)
  {
    id: 'planks', name: 'Wooden Planks', nameJa: '木材',
    inputs: [{ item: 'wood', quantity: 1 }],
    output: { item: 'planks', quantity: 4 },
    requiresCraftingTable: false, requiresFurnace: false, tier: 0,
  },
  {
    id: 'sticks', name: 'Sticks', nameJa: '棒',
    inputs: [{ item: 'planks', quantity: 2 }],
    output: { item: 'stick', quantity: 4 },
    requiresCraftingTable: false, requiresFurnace: false, tier: 0,
  },
  {
    id: 'crafting_table', name: 'Crafting Table', nameJa: '作業台',
    inputs: [{ item: 'planks', quantity: 4 }],
    output: { item: 'crafting_table_item', quantity: 1 },
    requiresCraftingTable: false, requiresFurnace: false, tier: 0,
  },
  {
    id: 'torch', name: 'Torches', nameJa: 'たいまつ',
    inputs: [{ item: 'stick', quantity: 1 }, { item: 'coal', quantity: 1 }],
    output: { item: 'torch_item', quantity: 4 },
    requiresCraftingTable: false, requiresFurnace: false, tier: 0,
  },

  // Tier 1: Wooden Tools (need crafting table)
  {
    id: 'wooden_pickaxe', name: 'Wooden Pickaxe', nameJa: '木のつるはし',
    inputs: [{ item: 'planks', quantity: 3 }, { item: 'stick', quantity: 2 }],
    output: { item: 'wooden_pickaxe', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 1,
  },
  {
    id: 'wooden_sword', name: 'Wooden Sword', nameJa: '木の剣',
    inputs: [{ item: 'planks', quantity: 2 }, { item: 'stick', quantity: 1 }],
    output: { item: 'wooden_sword', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 1,
  },
  {
    id: 'wooden_axe', name: 'Wooden Axe', nameJa: '木の斧',
    inputs: [{ item: 'planks', quantity: 3 }, { item: 'stick', quantity: 2 }],
    output: { item: 'wooden_axe', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 1,
  },
  {
    id: 'chest', name: 'Chest', nameJa: 'チェスト',
    inputs: [{ item: 'planks', quantity: 8 }],
    output: { item: 'chest_item', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 1,
  },

  // Tier 2: Stone Tools
  {
    id: 'furnace', name: 'Furnace', nameJa: 'かまど',
    inputs: [{ item: 'cobblestone', quantity: 8 }],
    output: { item: 'furnace_item', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 2,
  },
  {
    id: 'stone_pickaxe', name: 'Stone Pickaxe', nameJa: '石のつるはし',
    inputs: [{ item: 'cobblestone', quantity: 3 }, { item: 'stick', quantity: 2 }],
    output: { item: 'stone_pickaxe', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 2,
  },
  {
    id: 'stone_sword', name: 'Stone Sword', nameJa: '石の剣',
    inputs: [{ item: 'cobblestone', quantity: 2 }, { item: 'stick', quantity: 1 }],
    output: { item: 'stone_sword', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 2,
  },
  {
    id: 'stone_axe', name: 'Stone Axe', nameJa: '石の斧',
    inputs: [{ item: 'cobblestone', quantity: 3 }, { item: 'stick', quantity: 2 }],
    output: { item: 'stone_axe', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 2,
  },

  // Tier 3: Smelting + Iron Tools
  {
    id: 'iron_ingot', name: 'Iron Ingot', nameJa: '鉄インゴット',
    inputs: [{ item: 'raw_iron', quantity: 1 }, { item: 'coal', quantity: 1 }],
    output: { item: 'iron_ingot', quantity: 1 },
    requiresCraftingTable: false, requiresFurnace: true, tier: 3,
  },
  {
    id: 'gold_ingot', name: 'Gold Ingot', nameJa: '金インゴット',
    inputs: [{ item: 'raw_gold', quantity: 1 }, { item: 'coal', quantity: 1 }],
    output: { item: 'gold_ingot', quantity: 1 },
    requiresCraftingTable: false, requiresFurnace: true, tier: 3,
  },
  {
    id: 'cooked_meat', name: 'Cooked Meat', nameJa: '焼き肉',
    inputs: [{ item: 'raw_meat', quantity: 1 }, { item: 'coal', quantity: 1 }],
    output: { item: 'cooked_meat', quantity: 1 },
    requiresCraftingTable: false, requiresFurnace: true, tier: 3,
  },
  {
    id: 'iron_pickaxe', name: 'Iron Pickaxe', nameJa: '鉄のつるはし',
    inputs: [{ item: 'iron_ingot', quantity: 3 }, { item: 'stick', quantity: 2 }],
    output: { item: 'iron_pickaxe', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 3,
  },
  {
    id: 'iron_sword', name: 'Iron Sword', nameJa: '鉄の剣',
    inputs: [{ item: 'iron_ingot', quantity: 2 }, { item: 'stick', quantity: 1 }],
    output: { item: 'iron_sword', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 3,
  },
  {
    id: 'iron_axe', name: 'Iron Axe', nameJa: '鉄の斧',
    inputs: [{ item: 'iron_ingot', quantity: 3 }, { item: 'stick', quantity: 2 }],
    output: { item: 'iron_axe', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 3,
  },
  {
    id: 'iron_armor', name: 'Iron Armor', nameJa: '鉄の防具',
    inputs: [{ item: 'iron_ingot', quantity: 5 }],
    output: { item: 'iron_armor', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 3,
  },
  {
    id: 'leather_armor', name: 'Leather Armor', nameJa: '革の防具',
    inputs: [{ item: 'leather', quantity: 5 }],
    output: { item: 'leather_armor', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 3,
  },
  {
    id: 'bread', name: 'Bread', nameJa: 'パン',
    inputs: [{ item: 'planks', quantity: 3 }],
    output: { item: 'bread', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 3,
  },

  // Tier 4: Diamond Tools
  {
    id: 'diamond_pickaxe', name: 'Diamond Pickaxe', nameJa: 'ダイヤのつるはし',
    inputs: [{ item: 'diamond', quantity: 3 }, { item: 'stick', quantity: 2 }],
    output: { item: 'diamond_pickaxe', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 4,
  },
  {
    id: 'diamond_sword', name: 'Diamond Sword', nameJa: 'ダイヤの剣',
    inputs: [{ item: 'diamond', quantity: 2 }, { item: 'stick', quantity: 1 }],
    output: { item: 'diamond_sword', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 4,
  },
  {
    id: 'diamond_axe', name: 'Diamond Axe', nameJa: 'ダイヤの斧',
    inputs: [{ item: 'diamond', quantity: 3 }, { item: 'stick', quantity: 2 }],
    output: { item: 'diamond_axe', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 4,
  },
  {
    id: 'diamond_armor', name: 'Diamond Armor', nameJa: 'ダイヤの防具',
    inputs: [{ item: 'diamond', quantity: 5 }],
    output: { item: 'diamond_armor', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 4,
  },

  // Tier 5: Win Condition
  {
    id: 'ender_portal_frame', name: 'Ender Portal Frame', nameJa: 'エンダーポータルフレーム',
    inputs: [
      { item: 'obsidian_item', quantity: 8 },
      { item: 'diamond', quantity: 2 },
      { item: 'gold_ingot', quantity: 1 },
      { item: 'ender_pearl', quantity: 1 },
    ],
    output: { item: 'ender_portal_frame', quantity: 1 },
    requiresCraftingTable: true, requiresFurnace: false, tier: 5,
  },
];

// === Recipe Helpers ===

export function canCraft(
  recipe: CraftingRecipe,
  inventory: (InventoryItem | null)[],
  nearCraftingTable: boolean,
  nearFurnace: boolean,
): boolean {
  if (recipe.requiresCraftingTable && !nearCraftingTable) return false;
  if (recipe.requiresFurnace && !nearFurnace) return false;

  for (const input of recipe.inputs) {
    const available = countItem(inventory, input.item);
    if (available < input.quantity) return false;
  }

  return true;
}

export function countItem(inventory: (InventoryItem | null)[], item: ItemType): number {
  let count = 0;
  for (const slot of inventory) {
    if (slot && slot.type === item) {
      count += slot.quantity;
    }
  }
  return count;
}

export function getAvailableRecipes(
  inventory: (InventoryItem | null)[],
  nearCraftingTable: boolean,
  nearFurnace: boolean,
): CraftingRecipe[] {
  return RECIPES.filter(r => canCraft(r, inventory, nearCraftingTable, nearFurnace));
}

export function getRecipeById(id: string): CraftingRecipe | undefined {
  return RECIPES.find(r => r.id === id);
}
