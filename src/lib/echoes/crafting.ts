// =============================================================
// Echoes of Eternity — Crafting System
// Inspired by Minecraft + Terraria item crafting
// =============================================================

import type {
  CraftingRecipe,
  ResourceType,
  Equipment,
  EquipSlot,
  Rarity,
  CharacterStats,
} from '@/types/echoes';

// === Crafting Recipes ===

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // === Weapons ===
  {
    id: 'iron_blade',
    name: 'Iron Blade',
    category: 'weapon',
    result: { type: 'iron_blade', quantity: 1 },
    ingredients: [
      { resource: 'iron_ore', quantity: 5 },
      { resource: 'wood', quantity: 2 },
    ],
    station: 'forge',
    craftingLevel: 1,
  },
  {
    id: 'mythril_sword',
    name: 'Mythril Sword',
    category: 'weapon',
    result: { type: 'mythril_sword', quantity: 1 },
    ingredients: [
      { resource: 'mythril_ore', quantity: 8 },
      { resource: 'soul_fragment', quantity: 3 },
      { resource: 'ancient_wood', quantity: 4 },
    ],
    station: 'forge',
    craftingLevel: 15,
  },
  {
    id: 'adamantite_greatsword',
    name: 'Adamantite Greatsword',
    category: 'weapon',
    result: { type: 'adamantite_greatsword', quantity: 1 },
    ingredients: [
      { resource: 'adamantite_ore', quantity: 12 },
      { resource: 'void_essence', quantity: 5 },
      { resource: 'rift_crystal', quantity: 3 },
    ],
    station: 'divine',
    craftingLevel: 30,
  },
  {
    id: 'eternium_staff',
    name: 'Eternium Staff',
    category: 'weapon',
    result: { type: 'eternium_staff', quantity: 1 },
    ingredients: [
      { resource: 'eternium', quantity: 15 },
      { resource: 'chrono_shard', quantity: 8 },
      { resource: 'starbloom', quantity: 5 },
    ],
    station: 'divine',
    craftingLevel: 40,
  },
  // === Armor ===
  {
    id: 'iron_armor',
    name: 'Iron Chainmail',
    category: 'armor',
    result: { type: 'iron_armor', quantity: 1 },
    ingredients: [
      { resource: 'iron_ore', quantity: 8 },
    ],
    station: 'forge',
    craftingLevel: 3,
  },
  {
    id: 'mythril_plate',
    name: 'Mythril Plate',
    category: 'armor',
    result: { type: 'mythril_plate', quantity: 1 },
    ingredients: [
      { resource: 'mythril_ore', quantity: 12 },
      { resource: 'elemental_dust', quantity: 6 },
    ],
    station: 'forge',
    craftingLevel: 18,
  },
  {
    id: 'void_cloak',
    name: 'Void Cloak',
    category: 'armor',
    result: { type: 'void_cloak', quantity: 1 },
    ingredients: [
      { resource: 'void_essence', quantity: 10 },
      { resource: 'soul_fragment', quantity: 8 },
      { resource: 'rift_crystal', quantity: 5 },
    ],
    station: 'divine',
    craftingLevel: 35,
  },
  // === Accessories ===
  {
    id: 'elemental_ring',
    name: 'Elemental Ring',
    category: 'accessory',
    result: { type: 'elemental_ring', quantity: 1 },
    ingredients: [
      { resource: 'elemental_dust', quantity: 10 },
      { resource: 'gold', quantity: 500 },
    ],
    station: 'arcane',
    craftingLevel: 10,
  },
  {
    id: 'chrono_pendant',
    name: 'Chrono Pendant',
    category: 'accessory',
    result: { type: 'chrono_pendant', quantity: 1 },
    ingredients: [
      { resource: 'chrono_shard', quantity: 6 },
      { resource: 'eternium', quantity: 4 },
      { resource: 'gold', quantity: 2000 },
    ],
    station: 'arcane',
    craftingLevel: 25,
  },
  // === Consumables ===
  {
    id: 'health_potion',
    name: 'Health Potion',
    category: 'consumable',
    result: { type: 'health_potion', quantity: 3 },
    ingredients: [
      { resource: 'herb', quantity: 3 },
      { resource: 'gold', quantity: 50 },
    ],
    station: 'basic',
    craftingLevel: 1,
  },
  {
    id: 'mana_potion',
    name: 'Mana Potion',
    category: 'consumable',
    result: { type: 'mana_potion', quantity: 3 },
    ingredients: [
      { resource: 'moonflower', quantity: 2 },
      { resource: 'gold', quantity: 80 },
    ],
    station: 'basic',
    craftingLevel: 5,
  },
  {
    id: 'elixir_of_eternity',
    name: 'Elixir of Eternity',
    category: 'consumable',
    result: { type: 'elixir_of_eternity', quantity: 1 },
    ingredients: [
      { resource: 'starbloom', quantity: 3 },
      { resource: 'moonflower', quantity: 3 },
      { resource: 'chrono_shard', quantity: 2 },
      { resource: 'void_essence', quantity: 1 },
    ],
    station: 'divine',
    craftingLevel: 45,
  },
  // === Materials (refinement) ===
  {
    id: 'elemental_dust_refine',
    name: 'Elemental Dust',
    category: 'material',
    result: { type: 'elemental_dust', quantity: 5 },
    ingredients: [
      { resource: 'herb', quantity: 5 },
      { resource: 'moonflower', quantity: 1 },
    ],
    station: 'arcane',
    craftingLevel: 5,
  },
  {
    id: 'void_essence_refine',
    name: 'Void Essence',
    category: 'material',
    result: { type: 'void_essence', quantity: 1 },
    ingredients: [
      { resource: 'soul_fragment', quantity: 5 },
      { resource: 'rift_crystal', quantity: 2 },
    ],
    station: 'arcane',
    craftingLevel: 20,
  },
  // === Building ===
  {
    id: 'wooden_wall',
    name: 'Wooden Wall',
    category: 'building',
    result: { type: 'wooden_wall', quantity: 4 },
    ingredients: [
      { resource: 'wood', quantity: 4 },
    ],
    station: 'basic',
    craftingLevel: 1,
  },
  {
    id: 'stone_wall',
    name: 'Stone Wall',
    category: 'building',
    result: { type: 'stone_wall', quantity: 4 },
    ingredients: [
      { resource: 'iron_ore', quantity: 2 },
    ],
    station: 'forge',
    craftingLevel: 5,
  },
  {
    id: 'arcane_turret',
    name: 'Arcane Turret',
    category: 'building',
    result: { type: 'arcane_turret', quantity: 1 },
    ingredients: [
      { resource: 'mythril_ore', quantity: 5 },
      { resource: 'elemental_dust', quantity: 8 },
      { resource: 'rift_crystal', quantity: 2 },
    ],
    station: 'arcane',
    craftingLevel: 20,
  },
];

// === Equipment Generation ===

const WEAPON_NAMES: Record<Rarity, string[]> = {
  common: ['Rusty Blade', 'Worn Staff', 'Cracked Bow'],
  rare: ['Steel Longsword', 'Crystal Wand', 'Hunter\'s Bow'],
  epic: ['Mythril Katana', 'Arcane Scepter', 'Shadow Bow'],
  legendary: ['Dragonslayer', 'Staff of Eternity', 'Void Piercer'],
  mythic: ['Echoblade', 'Temporal Codex', 'Arrowhead of Fate'],
};

const ARMOR_NAMES: Record<Rarity, string[]> = {
  common: ['Leather Vest', 'Cloth Robe', 'Padded Tunic'],
  rare: ['Iron Chainmail', 'Mage\'s Robe', 'Reinforced Armor'],
  epic: ['Mythril Plate', 'Arcane Vestments', 'Shadow Cloak'],
  legendary: ['Dragonscale Armor', 'Eternal Robe', 'Void Mantle'],
  mythic: ['Chrono Aegis', 'Tapestry of Time', 'Nullfield Shroud'],
};

export function generateRandomEquipment(level: number, rarity?: Rarity): Equipment {
  const actualRarity = rarity || rollRarity();
  const slot: EquipSlot = (['weapon', 'armor', 'accessory', 'rune'] as EquipSlot[])[Math.floor(Math.random() * 4)];

  const names = slot === 'weapon' ? WEAPON_NAMES : ARMOR_NAMES;
  const namePool = names[actualRarity] || names.common;
  const name = namePool[Math.floor(Math.random() * namePool.length)];

  const rarityMultiplier: Record<Rarity, number> = {
    common: 1, rare: 1.5, epic: 2.2, legendary: 3.0, mythic: 4.0,
  };

  const mult = rarityMultiplier[actualRarity];
  const stats: Partial<CharacterStats> = {};

  if (slot === 'weapon') {
    stats.atk = Math.round((10 + level * 3) * mult);
    if (Math.random() > 0.5) stats.critRate = Math.round(3 * mult);
    if (Math.random() > 0.7) stats.critDmg = Math.round(10 * mult);
  } else if (slot === 'armor') {
    stats.hp = Math.round((50 + level * 10) * mult);
    stats.def = Math.round((5 + level * 2) * mult);
  } else if (slot === 'accessory') {
    stats.spd = Math.round(3 * mult);
    stats.elementalMastery = Math.round(10 * mult);
    if (Math.random() > 0.5) stats.critRate = Math.round(4 * mult);
  } else {
    // Rune
    stats.elementalMastery = Math.round(15 * mult);
    stats.atk = Math.round((5 + level * 1) * mult);
  }

  const maxEnchants = actualRarity === 'common' ? 1 : actualRarity === 'rare' ? 2 : actualRarity === 'epic' ? 3 : 4;

  return {
    id: `equip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    slot,
    rarity: actualRarity,
    level: 1,
    stats,
    enchantments: [],
    maxEnchantments: maxEnchants,
  };
}

function rollRarity(): Rarity {
  const roll = Math.random();
  if (roll < 0.01) return 'mythic';
  if (roll < 0.05) return 'legendary';
  if (roll < 0.15) return 'epic';
  if (roll < 0.40) return 'rare';
  return 'common';
}

// === Crafting Logic ===

export function canCraft(
  recipe: CraftingRecipe,
  playerResources: Partial<Record<ResourceType, number>>,
  craftingLevel: number,
): boolean {
  if (craftingLevel < recipe.craftingLevel) return false;

  for (const ingredient of recipe.ingredients) {
    const available = playerResources[ingredient.resource] || 0;
    if (available < ingredient.quantity) return false;
  }

  return true;
}

export function performCraft(
  recipe: CraftingRecipe,
  playerResources: Partial<Record<ResourceType, number>>,
): Partial<Record<ResourceType, number>> {
  const updated = { ...playerResources };

  for (const ingredient of recipe.ingredients) {
    const current = updated[ingredient.resource] || 0;
    updated[ingredient.resource] = current - ingredient.quantity;
  }

  return updated;
}

/**
 * Get available recipes for a given crafting level and station.
 */
export function getAvailableRecipes(
  craftingLevel: number,
  station?: string,
): CraftingRecipe[] {
  return CRAFTING_RECIPES.filter(r => {
    if (r.craftingLevel > craftingLevel) return false;
    if (station && r.station !== station) return false;
    return true;
  });
}

/**
 * Get recipe by ID.
 */
export function getRecipe(id: string): CraftingRecipe | undefined {
  return CRAFTING_RECIPES.find(r => r.id === id);
}

/**
 * Calculate crafting XP gained from a recipe.
 */
export function getCraftingXp(recipe: CraftingRecipe): number {
  const stationMultiplier: Record<string, number> = {
    basic: 1,
    forge: 2,
    arcane: 3,
    divine: 5,
  };

  return recipe.craftingLevel * (stationMultiplier[recipe.station] || 1) * 10;
}
