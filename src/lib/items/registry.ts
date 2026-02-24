import type { ItemDefinition, ItemCategory } from './types';

// ===== Item Definitions =====

const ITEMS: ItemDefinition[] = [
    // ── Materials ──────────────────────────────────────────────
    {
        id: 'stone', name: 'Stone Fragment', nameJa: '石片',
        category: 'material', rarity: 'common',
        color: '#8B8B8B', glowColor: '#A0A0A0', maxStack: 999,
        description: 'A rough shard of terrain stone. The most basic crafting material.',
        descriptionJa: '地形から採れる粗い石片。最も基本的な素材。',
        dropWeight: 40,
    },
    {
        id: 'iron', name: 'Iron Ore', nameJa: '鉄鉱石',
        category: 'material', rarity: 'common',
        color: '#B87333', glowColor: '#D4956B', maxStack: 999,
        description: 'Dense metallic ore with a warm luster. Used in sturdy crafts.',
        descriptionJa: '温かみのある金属鉱石。頑丈な装備の素材。',
        dropWeight: 30,
    },
    {
        id: 'crystal', name: 'Crystal Shard', nameJa: '水晶片',
        category: 'material', rarity: 'uncommon',
        color: '#4FC3F7', glowColor: '#81D4FA', maxStack: 999,
        description: 'A translucent crystal humming with faint resonance.',
        descriptionJa: '微かな共鳴を帯びた半透明の水晶。',
        dropWeight: 15,
    },
    {
        id: 'gold', name: 'Gold Nugget', nameJa: '金塊',
        category: 'material', rarity: 'rare',
        color: '#FFD700', glowColor: '#FFECB3', maxStack: 999,
        description: 'A gleaming nugget of pure gold, warm to the touch.',
        descriptionJa: '触れると温かい、純金の塊。',
        dropWeight: 8,
    },
    {
        id: 'obsidian', name: 'Obsidian Core', nameJa: '黒曜核',
        category: 'material', rarity: 'epic',
        color: '#9C27B0', glowColor: '#CE93D8', maxStack: 999,
        description: 'A dense core of volcanic glass pulsing with dark energy.',
        descriptionJa: '暗黒エネルギーが脈動する火山ガラスの核。',
        dropWeight: 5,
    },
    {
        id: 'star', name: 'Star Fragment', nameJa: '星の欠片',
        category: 'material', rarity: 'legendary',
        color: '#E0E0E0', glowColor: '#FFFFFF', maxStack: 999,
        description: 'A shard of fallen starlight. Radiates celestial warmth.',
        descriptionJa: '降り注いだ星の光の欠片。天の温もりを放つ。',
        dropWeight: 2,
    },

    // ── Consumables ────────────────────────────────────────────
    {
        id: 'health_potion', name: 'Health Potion', nameJa: '回復薬',
        category: 'consumable', rarity: 'common',
        color: '#EF5350', glowColor: '#EF9A9A', maxStack: 10,
        description: 'Restores a small amount of health when consumed.',
        descriptionJa: '使用すると体力を少し回復する。',
    },
    {
        id: 'tempo_scroll', name: 'Tempo Scroll', nameJa: 'テンポの巻物',
        category: 'consumable', rarity: 'uncommon',
        color: '#AB47BC', glowColor: '#CE93D8', maxStack: 5,
        description: 'Briefly slows the tempo, widening the beat window.',
        descriptionJa: '一時的にテンポを遅くし、ビート判定を広げる。',
    },
    {
        id: 'shield_charm', name: 'Shield Charm', nameJa: '守護のお守り',
        category: 'consumable', rarity: 'rare',
        color: '#42A5F5', glowColor: '#90CAF9', maxStack: 3,
        description: 'Grants a one-time shield that absorbs the next combo break.',
        descriptionJa: '次のコンボ途切れを一度だけ防ぐシールドを付与。',
    },

    // ── Equipment ──────────────────────────────────────────────
    {
        id: 'rhythm_gauntlet', name: 'Rhythm Gauntlet', nameJa: 'リズムの篭手',
        category: 'equipment', rarity: 'rare',
        color: '#FF7043', glowColor: '#FFAB91', maxStack: 1,
        description: 'A gauntlet that amplifies combo damage when worn.',
        descriptionJa: '装備するとコンボダメージが増幅される篭手。',
    },
    {
        id: 'beat_visor', name: 'Beat Visor', nameJa: 'ビートバイザー',
        category: 'equipment', rarity: 'epic',
        color: '#26C6DA', glowColor: '#80DEEA', maxStack: 1,
        description: 'A visor that visualizes incoming beats with precision.',
        descriptionJa: 'ビートのタイミングを精密に可視化するバイザー。',
    },
    {
        id: 'combo_ring', name: 'Combo Ring', nameJa: 'コンボリング',
        category: 'equipment', rarity: 'uncommon',
        color: '#AB47BC', glowColor: '#CE93D8', maxStack: 1,
        description: 'A ring that makes combo multiplier grow faster.',
        descriptionJa: 'コンボ倍率の成長を加速するリング。',
    },

    // ── Relics ─────────────────────────────────────────────────
    {
        id: 'ancient_metronome', name: 'Ancient Metronome', nameJa: '古代のメトロノーム',
        category: 'relic', rarity: 'epic',
        color: '#8D6E63', glowColor: '#BCAAA4', maxStack: 1,
        description: 'An ancient device that syncs your rhythm to the world pulse.',
        descriptionJa: '世界の脈動とリズムを同期させる古代の装置。',
    },
    {
        id: 'dragon_scale', name: 'Dragon Scale', nameJa: '龍鱗',
        category: 'relic', rarity: 'legendary',
        color: '#FF8C00', glowColor: '#FFB300', maxStack: 1,
        description: 'A scale from the Mandarin Dragon. Burns with eternal flame.',
        descriptionJa: '蜜柑龍の鱗。永遠の炎で燃え続ける。',
    },
    {
        id: 'celestial_shard', name: 'Celestial Shard', nameJa: '天球の破片',
        category: 'relic', rarity: 'legendary',
        color: '#B388FF', glowColor: '#D1C4E9', maxStack: 1,
        description: 'A fragment of the celestial sphere. Distorts time and space.',
        descriptionJa: '天球の断片。時空を歪める力を秘める。',
    },

    // ── Currency ───────────────────────────────────────────────
    {
        id: 'beat_coin', name: 'Beat Coin', nameJa: 'ビートコイン',
        category: 'currency', rarity: 'common',
        color: '#FFC107', glowColor: '#FFE082', maxStack: 99999,
        description: 'Standard currency earned from gameplay. Spend at shops.',
        descriptionJa: 'ゲームプレイで獲得する標準通貨。ショップで使用。',
    },
    {
        id: 'star_dust', name: 'Star Dust', nameJa: '星屑',
        category: 'currency', rarity: 'rare',
        color: '#E1BEE7', glowColor: '#F3E5F5', maxStack: 99999,
        description: 'Premium currency from rare achievements. Used for special items.',
        descriptionJa: 'レア実績で獲得するプレミアム通貨。特別なアイテムに使用。',
    },
];

// ===== Registry Lookups =====

/** All item definitions indexed by ID. */
export const ITEM_REGISTRY: Record<string, ItemDefinition> = Object.fromEntries(
    ITEMS.map(item => [item.id, item])
);

/** Get an item definition by ID, or undefined if not found. */
export function getItem(id: string): ItemDefinition | undefined {
    return ITEM_REGISTRY[id];
}

/** All items grouped by category. */
export const ITEMS_BY_CATEGORY: Record<ItemCategory, ItemDefinition[]> = {
    material: ITEMS.filter(i => i.category === 'material'),
    consumable: ITEMS.filter(i => i.category === 'consumable'),
    equipment: ITEMS.filter(i => i.category === 'equipment'),
    relic: ITEMS.filter(i => i.category === 'relic'),
    currency: ITEMS.filter(i => i.category === 'currency'),
};

/** All items as a flat array. */
export const ALL_ITEMS = ITEMS;

/** Material items only (for backward compat with tetris item system). */
export const MATERIAL_ITEMS = ITEMS_BY_CATEGORY.material;

/** Total drop weight for material probability calculation. */
export const TOTAL_DROP_WEIGHT = MATERIAL_ITEMS.reduce(
    (sum, item) => sum + (item.dropWeight ?? 0), 0
);
