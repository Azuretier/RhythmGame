// ===== Item Categories =====
export type ItemCategory = 'material' | 'consumable' | 'equipment' | 'relic' | 'currency';

// ===== Item Rarity =====
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// ===== Item Definition =====
export interface ItemDefinition {
    id: string;
    name: string;
    nameJa: string;
    category: ItemCategory;
    rarity: ItemRarity;
    color: string;
    glowColor: string;
    maxStack: number;
    description: string;
    descriptionJa: string;
    dropWeight?: number;
}

// ===== Inventory Entry =====
export interface InventoryEntry {
    itemId: string;
    count: number;
}

// ===== Rarity Visual Config =====
export interface RarityConfig {
    label: string;
    labelJa: string;
    color: string;
    badgeBg: string;
    glowIntensity: number;
}

export const RARITY_CONFIG: Record<ItemRarity, RarityConfig> = {
    common: {
        label: 'Common',
        labelJa: 'コモン',
        color: '#8B8B8B',
        badgeBg: 'rgba(139,139,139,0.15)',
        glowIntensity: 0,
    },
    uncommon: {
        label: 'Uncommon',
        labelJa: 'アンコモン',
        color: '#4FC3F7',
        badgeBg: 'rgba(79,195,247,0.15)',
        glowIntensity: 0.3,
    },
    rare: {
        label: 'Rare',
        labelJa: 'レア',
        color: '#FFD700',
        badgeBg: 'rgba(255,215,0,0.15)',
        glowIntensity: 0.5,
    },
    epic: {
        label: 'Epic',
        labelJa: 'エピック',
        color: '#9C27B0',
        badgeBg: 'rgba(156,39,176,0.15)',
        glowIntensity: 0.7,
    },
    legendary: {
        label: 'Legendary',
        labelJa: 'レジェンダリー',
        color: '#FFFFFF',
        badgeBg: 'rgba(255,255,255,0.15)',
        glowIntensity: 1.0,
    },
};

// ===== Category Visual Config =====
export interface CategoryConfig {
    label: string;
    labelJa: string;
    icon: string;
}

export const CATEGORY_CONFIG: Record<ItemCategory, CategoryConfig> = {
    material:    { label: 'Material',    labelJa: '素材',   icon: '⛏️' },
    consumable:  { label: 'Consumable',  labelJa: '消耗品', icon: '🧪' },
    equipment:   { label: 'Equipment',   labelJa: '装備',   icon: '⚔️' },
    relic:       { label: 'Relic',       labelJa: '遺物',   icon: '🏛️' },
    currency:    { label: 'Currency',    labelJa: '通貨',   icon: '💰' },
};
