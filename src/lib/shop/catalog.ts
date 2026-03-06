import { PREMIUM_SKIN_PRESETS } from '@/lib/skin/types';
import type { ShopItem, ShopItemCategory } from './types';

export const SHOP_CATALOG: ShopItem[] = [
  // ── Crystal Packs (purchased with JPY) ──
  {
    id: 'crystal-300',
    name: '300 Eternity Crystals',
    nameJa: '永遠の結晶 ×300',
    description: 'A small pouch of Eternity Crystals',
    descriptionJa: '永遠の結晶の小さな袋',
    category: 'crystal_pack',
    priceJpy: 120,
    priceInCrystals: 0,
    crystalsGranted: 300,
    rarity: 'common',
    tags: ['crystals', 'starter'],
  },
  {
    id: 'crystal-980',
    name: '980 Eternity Crystals',
    nameJa: '永遠の結晶 ×980',
    description: 'A generous bundle of Eternity Crystals',
    descriptionJa: '永遠の結晶のお得なセット',
    category: 'crystal_pack',
    priceJpy: 480,
    priceInCrystals: 0,
    crystalsGranted: 980,
    rarity: 'rare',
    tags: ['crystals', 'popular'],
  },
  {
    id: 'crystal-3280',
    name: '3280 Eternity Crystals',
    nameJa: '永遠の結晶 ×3280',
    description: 'A massive chest of Eternity Crystals — best value',
    descriptionJa: '永遠の結晶の大量セット — 最もお得',
    category: 'crystal_pack',
    priceJpy: 1600,
    priceInCrystals: 0,
    crystalsGranted: 3280,
    rarity: 'epic',
    tags: ['crystals', 'best-value'],
  },

  // ── Battle Pass (purchased with JPY) ──
  {
    id: 'battle-pass',
    name: 'Battle Pass',
    nameJa: 'バトルパス',
    description: 'Unlock premium rewards for the current season',
    descriptionJa: '今シーズンのプレミアム報酬をアンロック',
    category: 'battle_pass',
    priceJpy: 480,
    priceInCrystals: 0,
    rarity: 'epic',
    tags: ['battle-pass', 'season'],
  },

  // ── Premium Skins (purchased with crystals) ──
  ...PREMIUM_SKIN_PRESETS.map((skin): ShopItem => ({
    id: `skin-${skin.id}`,
    name: `${skin.name} Skin`,
    nameJa: `${skin.nameJa}スキン`,
    description: skin.description || `Premium ${skin.name} skin`,
    descriptionJa: skin.descriptionJa || `プレミアム${skin.nameJa}スキン`,
    category: 'premium_skin',
    priceJpy: 0,
    priceInCrystals: skin.priceInCrystals || 300,
    skinId: skin.id,
    rarity: skin.rarity || 'rare',
    tags: [skin.colors.accent, skin.colors.accentLight, skin.rarity || 'rare'],
  })),

  // ── Inventory Expansion (purchased with crystals) ──
  {
    id: 'inventory-expansion-10',
    name: '+10 Inventory Slots',
    nameJa: 'インベントリ拡張 +10',
    description: 'Expand your inventory by 10 slots',
    descriptionJa: 'インベントリを10スロット拡張',
    category: 'inventory_expansion',
    priceJpy: 0,
    priceInCrystals: 200,
    inventorySlots: 10,
    rarity: 'common',
    tags: ['inventory', 'qol'],
  },
];

export function getItemById(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find(item => item.id === id);
}

export function getItemsByCategory(category: ShopItemCategory): ShopItem[] {
  return SHOP_CATALOG.filter(item => item.category === category);
}
