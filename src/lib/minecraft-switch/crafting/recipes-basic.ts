// =============================================================================
// Minecraft: Nintendo Switch Edition — Basic Crafting & Tools Recipes
// =============================================================================
// Planks (6 wood types), sticks, torches, and all tool tiers (wooden, stone,
// iron, golden, diamond) plus utility tools (shears, flint & steel, etc.).
// =============================================================================

import type { CraftingRecipe } from '@/types/minecraft-switch';

export const BASIC_RECIPES: CraftingRecipe[] = [

  // ===========================================================================
  // BASIC CRAFTING — Planks, Sticks, Fundamental Materials
  // ===========================================================================

  // --- Planks (from logs) — 6 wood types, each yields 4 planks ---

  {
    id: 'oak_planks',
    type: 'shapeless',
    ingredients: ['oak_log'],
    result: 'oak_planks',
    resultCount: 4,
    category: 'building',
  },
  {
    id: 'spruce_planks',
    type: 'shapeless',
    ingredients: ['spruce_log'],
    result: 'spruce_planks',
    resultCount: 4,
    category: 'building',
  },
  {
    id: 'birch_planks',
    type: 'shapeless',
    ingredients: ['birch_log'],
    result: 'birch_planks',
    resultCount: 4,
    category: 'building',
  },
  {
    id: 'jungle_planks',
    type: 'shapeless',
    ingredients: ['jungle_log'],
    result: 'jungle_planks',
    resultCount: 4,
    category: 'building',
  },
  {
    id: 'acacia_planks',
    type: 'shapeless',
    ingredients: ['acacia_log'],
    result: 'acacia_planks',
    resultCount: 4,
    category: 'building',
  },
  {
    id: 'dark_oak_planks',
    type: 'shapeless',
    ingredients: ['dark_oak_log'],
    result: 'dark_oak_planks',
    resultCount: 4,
    category: 'building',
  },

  // --- Sticks ---

  {
    id: 'stick',
    type: 'shaped',
    pattern: ['#', '#'],
    key: { '#': 'oak_planks' },
    result: 'stick',
    resultCount: 4,
    category: 'misc',
  },
  {
    id: 'stick_from_spruce',
    type: 'shaped',
    pattern: ['#', '#'],
    key: { '#': 'spruce_planks' },
    result: 'stick',
    resultCount: 4,
    category: 'misc',
  },
  {
    id: 'stick_from_birch',
    type: 'shaped',
    pattern: ['#', '#'],
    key: { '#': 'birch_planks' },
    result: 'stick',
    resultCount: 4,
    category: 'misc',
  },
  {
    id: 'stick_from_jungle',
    type: 'shaped',
    pattern: ['#', '#'],
    key: { '#': 'jungle_planks' },
    result: 'stick',
    resultCount: 4,
    category: 'misc',
  },
  {
    id: 'stick_from_acacia',
    type: 'shaped',
    pattern: ['#', '#'],
    key: { '#': 'acacia_planks' },
    result: 'stick',
    resultCount: 4,
    category: 'misc',
  },
  {
    id: 'stick_from_dark_oak',
    type: 'shaped',
    pattern: ['#', '#'],
    key: { '#': 'dark_oak_planks' },
    result: 'stick',
    resultCount: 4,
    category: 'misc',
  },

  // --- Torches ---

  {
    id: 'torch',
    type: 'shaped',
    pattern: ['C', '|'],
    key: { 'C': 'coal', '|': 'stick' },
    result: 'torch',
    resultCount: 4,
    category: 'decoration',
  },
  {
    id: 'torch_from_charcoal',
    type: 'shaped',
    pattern: ['C', '|'],
    key: { 'C': 'charcoal', '|': 'stick' },
    result: 'torch',
    resultCount: 4,
    category: 'decoration',
  },

  // ===========================================================================
  // TOOLS — 5 tiers x 5 tool types = 25 recipes
  // ===========================================================================

  // --- Wooden Tools ---

  {
    id: 'wooden_pickaxe',
    type: 'shaped',
    pattern: ['###', ' | ', ' | '],
    key: { '#': 'oak_planks', '|': 'stick' },
    result: 'wooden_pickaxe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'wooden_axe',
    type: 'shaped',
    pattern: ['##', '#|', ' |'],
    key: { '#': 'oak_planks', '|': 'stick' },
    result: 'wooden_axe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'wooden_shovel',
    type: 'shaped',
    pattern: ['#', '|', '|'],
    key: { '#': 'oak_planks', '|': 'stick' },
    result: 'wooden_shovel',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'wooden_hoe',
    type: 'shaped',
    pattern: ['##', ' |', ' |'],
    key: { '#': 'oak_planks', '|': 'stick' },
    result: 'wooden_hoe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'wooden_sword',
    type: 'shaped',
    pattern: ['#', '#', '|'],
    key: { '#': 'oak_planks', '|': 'stick' },
    result: 'wooden_sword',
    resultCount: 1,
    category: 'combat',
  },

  // --- Stone Tools ---

  {
    id: 'stone_pickaxe',
    type: 'shaped',
    pattern: ['###', ' | ', ' | '],
    key: { '#': 'cobblestone', '|': 'stick' },
    result: 'stone_pickaxe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'stone_axe',
    type: 'shaped',
    pattern: ['##', '#|', ' |'],
    key: { '#': 'cobblestone', '|': 'stick' },
    result: 'stone_axe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'stone_shovel',
    type: 'shaped',
    pattern: ['#', '|', '|'],
    key: { '#': 'cobblestone', '|': 'stick' },
    result: 'stone_shovel',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'stone_hoe',
    type: 'shaped',
    pattern: ['##', ' |', ' |'],
    key: { '#': 'cobblestone', '|': 'stick' },
    result: 'stone_hoe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'stone_sword',
    type: 'shaped',
    pattern: ['#', '#', '|'],
    key: { '#': 'cobblestone', '|': 'stick' },
    result: 'stone_sword',
    resultCount: 1,
    category: 'combat',
  },

  // --- Iron Tools ---

  {
    id: 'iron_pickaxe',
    type: 'shaped',
    pattern: ['###', ' | ', ' | '],
    key: { '#': 'iron_ingot', '|': 'stick' },
    result: 'iron_pickaxe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'iron_axe',
    type: 'shaped',
    pattern: ['##', '#|', ' |'],
    key: { '#': 'iron_ingot', '|': 'stick' },
    result: 'iron_axe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'iron_shovel',
    type: 'shaped',
    pattern: ['#', '|', '|'],
    key: { '#': 'iron_ingot', '|': 'stick' },
    result: 'iron_shovel',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'iron_hoe',
    type: 'shaped',
    pattern: ['##', ' |', ' |'],
    key: { '#': 'iron_ingot', '|': 'stick' },
    result: 'iron_hoe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'iron_sword',
    type: 'shaped',
    pattern: ['#', '#', '|'],
    key: { '#': 'iron_ingot', '|': 'stick' },
    result: 'iron_sword',
    resultCount: 1,
    category: 'combat',
  },

  // --- Golden Tools ---

  {
    id: 'golden_pickaxe',
    type: 'shaped',
    pattern: ['###', ' | ', ' | '],
    key: { '#': 'gold_ingot', '|': 'stick' },
    result: 'golden_pickaxe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'golden_axe',
    type: 'shaped',
    pattern: ['##', '#|', ' |'],
    key: { '#': 'gold_ingot', '|': 'stick' },
    result: 'golden_axe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'golden_shovel',
    type: 'shaped',
    pattern: ['#', '|', '|'],
    key: { '#': 'gold_ingot', '|': 'stick' },
    result: 'golden_shovel',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'golden_hoe',
    type: 'shaped',
    pattern: ['##', ' |', ' |'],
    key: { '#': 'gold_ingot', '|': 'stick' },
    result: 'golden_hoe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'golden_sword',
    type: 'shaped',
    pattern: ['#', '#', '|'],
    key: { '#': 'gold_ingot', '|': 'stick' },
    result: 'golden_sword',
    resultCount: 1,
    category: 'combat',
  },

  // --- Diamond Tools ---

  {
    id: 'diamond_pickaxe',
    type: 'shaped',
    pattern: ['###', ' | ', ' | '],
    key: { '#': 'diamond', '|': 'stick' },
    result: 'diamond_pickaxe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'diamond_axe',
    type: 'shaped',
    pattern: ['##', '#|', ' |'],
    key: { '#': 'diamond', '|': 'stick' },
    result: 'diamond_axe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'diamond_shovel',
    type: 'shaped',
    pattern: ['#', '|', '|'],
    key: { '#': 'diamond', '|': 'stick' },
    result: 'diamond_shovel',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'diamond_hoe',
    type: 'shaped',
    pattern: ['##', ' |', ' |'],
    key: { '#': 'diamond', '|': 'stick' },
    result: 'diamond_hoe',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'diamond_sword',
    type: 'shaped',
    pattern: ['#', '#', '|'],
    key: { '#': 'diamond', '|': 'stick' },
    result: 'diamond_sword',
    resultCount: 1,
    category: 'combat',
  },

  // --- Other Tools ---

  {
    id: 'shears',
    type: 'shaped',
    pattern: [' #', '# '],
    key: { '#': 'iron_ingot' },
    result: 'shears',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'flint_and_steel',
    type: 'shaped',
    pattern: ['F ', ' I'],
    key: { 'F': 'flint', 'I': 'iron_ingot' },
    result: 'flint_and_steel',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'fishing_rod',
    type: 'shaped',
    pattern: ['  |', ' |S', '| S'],
    key: { '|': 'stick', 'S': 'string' },
    result: 'fishing_rod',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'compass',
    type: 'shaped',
    pattern: [' I ', 'IRI', ' I '],
    key: { 'I': 'iron_ingot', 'R': 'redstone' },
    result: 'compass',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'clock',
    type: 'shaped',
    pattern: [' G ', 'GRG', ' G '],
    key: { 'G': 'gold_ingot', 'R': 'redstone' },
    result: 'clock',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'spyglass',
    type: 'shaped',
    pattern: ['A', 'C', 'C'],
    key: { 'A': 'amethyst_shard', 'C': 'copper_ingot' },
    result: 'spyglass',
    resultCount: 1,
    category: 'tools',
  },
  {
    id: 'lead',
    type: 'shaped',
    pattern: ['SS ', 'SB ', '  S'],
    key: { 'S': 'string', 'B': 'slime_ball' },
    result: 'lead',
    resultCount: 2,
    category: 'tools',
  },
];
