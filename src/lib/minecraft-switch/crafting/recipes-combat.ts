// =============================================================================
// Minecraft: Nintendo Switch Edition — Armor & Combat Recipes
// =============================================================================
// All 4 armor tiers (leather, iron, golden, diamond) x 4 pieces = 16 recipes,
// plus combat items: bow, arrow, crossbow, shield, spectral arrow.
// =============================================================================

import type { CraftingRecipe } from '@/types/minecraft-switch';

export const COMBAT_RECIPES: CraftingRecipe[] = [

  // ===========================================================================
  // ARMOR — 4 tiers x 4 pieces = 16 recipes
  // ===========================================================================

  // --- Leather Armor ---

  {
    id: 'leather_helmet',
    type: 'shaped',
    pattern: ['###', '# #'],
    key: { '#': 'leather' },
    result: 'leather_helmet',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'leather_chestplate',
    type: 'shaped',
    pattern: ['# #', '###', '###'],
    key: { '#': 'leather' },
    result: 'leather_chestplate',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'leather_leggings',
    type: 'shaped',
    pattern: ['###', '# #', '# #'],
    key: { '#': 'leather' },
    result: 'leather_leggings',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'leather_boots',
    type: 'shaped',
    pattern: ['# #', '# #'],
    key: { '#': 'leather' },
    result: 'leather_boots',
    resultCount: 1,
    category: 'combat',
  },

  // --- Iron Armor ---

  {
    id: 'iron_helmet',
    type: 'shaped',
    pattern: ['###', '# #'],
    key: { '#': 'iron_ingot' },
    result: 'iron_helmet',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'iron_chestplate',
    type: 'shaped',
    pattern: ['# #', '###', '###'],
    key: { '#': 'iron_ingot' },
    result: 'iron_chestplate',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'iron_leggings',
    type: 'shaped',
    pattern: ['###', '# #', '# #'],
    key: { '#': 'iron_ingot' },
    result: 'iron_leggings',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'iron_boots',
    type: 'shaped',
    pattern: ['# #', '# #'],
    key: { '#': 'iron_ingot' },
    result: 'iron_boots',
    resultCount: 1,
    category: 'combat',
  },

  // --- Golden Armor ---

  {
    id: 'golden_helmet',
    type: 'shaped',
    pattern: ['###', '# #'],
    key: { '#': 'gold_ingot' },
    result: 'golden_helmet',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'golden_chestplate',
    type: 'shaped',
    pattern: ['# #', '###', '###'],
    key: { '#': 'gold_ingot' },
    result: 'golden_chestplate',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'golden_leggings',
    type: 'shaped',
    pattern: ['###', '# #', '# #'],
    key: { '#': 'gold_ingot' },
    result: 'golden_leggings',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'golden_boots',
    type: 'shaped',
    pattern: ['# #', '# #'],
    key: { '#': 'gold_ingot' },
    result: 'golden_boots',
    resultCount: 1,
    category: 'combat',
  },

  // --- Diamond Armor ---

  {
    id: 'diamond_helmet',
    type: 'shaped',
    pattern: ['###', '# #'],
    key: { '#': 'diamond' },
    result: 'diamond_helmet',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'diamond_chestplate',
    type: 'shaped',
    pattern: ['# #', '###', '###'],
    key: { '#': 'diamond' },
    result: 'diamond_chestplate',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'diamond_leggings',
    type: 'shaped',
    pattern: ['###', '# #', '# #'],
    key: { '#': 'diamond' },
    result: 'diamond_leggings',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'diamond_boots',
    type: 'shaped',
    pattern: ['# #', '# #'],
    key: { '#': 'diamond' },
    result: 'diamond_boots',
    resultCount: 1,
    category: 'combat',
  },

  // --- Other Combat Items ---

  {
    id: 'bow',
    type: 'shaped',
    pattern: [' |S', '| S', ' |S'],
    key: { '|': 'stick', 'S': 'string' },
    result: 'bow',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'arrow',
    type: 'shaped',
    pattern: ['F', '|', 'E'],
    key: { 'F': 'flint', '|': 'stick', 'E': 'feather' },
    result: 'arrow',
    resultCount: 4,
    category: 'combat',
  },
  {
    id: 'crossbow',
    type: 'shaped',
    pattern: ['|I|', 'STS', ' | '],
    key: { '|': 'stick', 'I': 'iron_ingot', 'S': 'string', 'T': 'tripwire_hook' },
    result: 'crossbow',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'shield',
    type: 'shaped',
    pattern: ['#I#', '###', ' # '],
    key: { '#': 'oak_planks', 'I': 'iron_ingot' },
    result: 'shield',
    resultCount: 1,
    category: 'combat',
  },
  {
    id: 'spectral_arrow',
    type: 'shaped',
    pattern: [' G ', 'GAG', ' G '],
    key: { 'G': 'glowstone_dust', 'A': 'arrow' },
    result: 'spectral_arrow',
    resultCount: 2,
    category: 'combat',
  },
];
