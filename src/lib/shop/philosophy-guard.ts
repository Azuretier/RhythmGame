import type { ShopItem } from './types';

export const PHILOSOPHY_RULES = {
  principle: 'Cosmetic only — absolutely no pay-to-win',
  allowedCategories: ['crystal_pack', 'battle_pass', 'premium_skin', 'inventory_expansion'] as const,
  maxPriceJpy: 10_000,
  maxPriceCrystals: 5_000,
  bannedKeywords: [
    'damage', 'attack', 'defense', 'speed boost', 'stat boost',
    'power up', 'extra life', 'extra lives', 'advantage',
    'stronger', 'faster', 'bonus score', 'score multiplier',
  ],
} as const;

export function validateItem(item: ShopItem): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Category must be in allowed list
  if (!PHILOSOPHY_RULES.allowedCategories.includes(item.category)) {
    violations.push(`Invalid category: ${item.category}`);
  }

  // Price sanity checks
  if (item.priceJpy < 0) {
    violations.push('Price in JPY cannot be negative');
  }
  if (item.priceJpy > PHILOSOPHY_RULES.maxPriceJpy) {
    violations.push(`Price ¥${item.priceJpy} exceeds maximum ¥${PHILOSOPHY_RULES.maxPriceJpy}`);
  }
  if (item.priceInCrystals < 0) {
    violations.push('Price in crystals cannot be negative');
  }
  if (item.priceInCrystals > PHILOSOPHY_RULES.maxPriceCrystals) {
    violations.push(`Crystal price ${item.priceInCrystals} exceeds maximum ${PHILOSOPHY_RULES.maxPriceCrystals}`);
  }

  // Must have exactly one pricing method
  if (item.priceJpy === 0 && item.priceInCrystals === 0) {
    violations.push('Item must have a price (JPY or crystals)');
  }

  // Category-specific validation
  switch (item.category) {
    case 'crystal_pack':
      if (!item.crystalsGranted || item.crystalsGranted <= 0) {
        violations.push('Crystal pack must grant a positive number of crystals');
      }
      if (item.priceJpy <= 0) {
        violations.push('Crystal packs must be purchased with JPY');
      }
      break;
    case 'premium_skin':
      if (!item.skinId) {
        violations.push('Premium skin must reference a skinId');
      }
      break;
    case 'inventory_expansion':
      if (!item.inventorySlots || item.inventorySlots <= 0) {
        violations.push('Inventory expansion must grant a positive number of slots');
      }
      break;
  }

  // Check description for P2W language
  const textToCheck = `${item.name} ${item.description} ${item.nameJa} ${item.descriptionJa}`.toLowerCase();
  for (const keyword of PHILOSOPHY_RULES.bannedKeywords) {
    if (textToCheck.includes(keyword)) {
      violations.push(`Description contains banned P2W keyword: "${keyword}"`);
    }
  }

  return { valid: violations.length === 0, violations };
}

export function validateCatalog(items: ShopItem[]): { valid: boolean; violations: string[] } {
  const allViolations: string[] = [];

  // Check for duplicate IDs
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      allViolations.push(`Duplicate item ID: ${item.id}`);
    }
    ids.add(item.id);
  }

  // Validate each item
  for (const item of items) {
    const result = validateItem(item);
    if (!result.valid) {
      allViolations.push(...result.violations.map(v => `[${item.id}] ${v}`));
    }
  }

  return { valid: allViolations.length === 0, violations: allViolations };
}
