import type { ItemRarity } from '@/lib/items/types';
import type { ElementType } from '@/lib/elements/types';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'charm';

export type StatType =
    | 'scorePercent'       // +% score
    | 'comboDuration'      // +ms combo window
    | 'beatWindow'         // +% beat timing window
    | 'terrainDamage'      // +% terrain damage
    | 'dropRate'           // +% item drop rate
    | 'elementalAffinity'  // +% elemental orb generation for specific element
    | 'reactionPower'      // +% reaction effect intensity
    | 'gravityReduce'      // -% piece gravity speed
    | 'comboAmplify';      // +% combo multiplier growth

export interface StatBonus {
    stat: StatType;
    value: number;
    /** For elementalAffinity, which element benefits */
    element?: ElementType;
}

export type EnchantmentType =
    | 'auto_react'         // 10% chance to auto-trigger random reaction on line clear
    | 'orb_magnet'         // Orbs collected 50% faster
    | 'lucky_crit'         // 5% chance for 3x score on perfect beat
    | 'terrain_shatter'    // Line clears destroy +2 extra terrain blocks
    | 'combo_shield'       // First combo break per stage is ignored
    | 'element_surge'      // Reactions generate 1 extra orb of each consumed element
    | 'material_convert'   // 20% chance to upgrade material rarity on drop
    | 'beat_echo';         // PERFECT judgments count as 2 beats for gauge charging

export interface Enchantment {
    type: EnchantmentType;
    name: string;
    nameJa: string;
    description: string;
    descriptionJa: string;
    color: string;
}

export interface EquipmentDefinition {
    id: string;
    name: string;
    nameJa: string;
    slot: EquipmentSlot;
    rarity: ItemRarity;
    icon: string;
    color: string;
    glowColor: string;
    description: string;
    descriptionJa: string;
    baseStats: StatBonus[];
    /** How many random enchantment slots (0-2) */
    enchantmentSlots: number;
}

export interface EquipmentInstance {
    instanceId: string;
    equipmentId: string;
    enchantments: EnchantmentType[];
    /** Random stat roll multiplier (0.8-1.2) applied to base stats */
    statRoll: number;
    obtainedAt: number;
    source: 'line_clear' | 'world_complete' | 'boss_defeat' | 'reaction_bloom';
}

export interface EquipmentLoadout {
    weapon: string | null;     // instanceId
    armor: string | null;
    accessory: string | null;
    charm: string | null;
}

export interface EquipmentState {
    inventory: EquipmentInstance[];
    loadout: EquipmentLoadout;
    maxInventorySize: number;
    totalObtained: number;
    totalScrapped: number;
}

export interface LootTableEntry {
    equipmentId: string;
    weight: number;
}

export interface LootTable {
    worldIdx: number;
    entries: LootTableEntry[];
    /** Bonus drop weight per line cleared */
    lineCountBonus: number;
    /** Bonus drop weight per combo count */
    comboBonus: number;
}

// Aggregated bonuses from all equipped items
export interface EquipmentBonuses {
    scorePercent: number;
    comboDuration: number;
    beatWindow: number;
    terrainDamage: number;
    dropRate: number;
    elementalAffinities: { element: ElementType; bonus: number }[];
    reactionPower: number;
    gravityReduce: number;
    comboAmplify: number;
    enchantments: EnchantmentType[];
}

export const DEFAULT_EQUIPMENT_LOADOUT: EquipmentLoadout = {
    weapon: null,
    armor: null,
    accessory: null,
    charm: null,
};

export const DEFAULT_EQUIPMENT_STATE: EquipmentState = {
    inventory: [],
    loadout: DEFAULT_EQUIPMENT_LOADOUT,
    maxInventorySize: 30,
    totalObtained: 0,
    totalScrapped: 0,
};

export const DEFAULT_EQUIPMENT_BONUSES: EquipmentBonuses = {
    scorePercent: 0,
    comboDuration: 0,
    beatWindow: 0,
    terrainDamage: 0,
    dropRate: 0,
    elementalAffinities: [],
    reactionPower: 0,
    gravityReduce: 0,
    comboAmplify: 0,
    enchantments: [],
};

export const ALL_EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'accessory', 'charm'];

export const SLOT_CONFIG: Record<EquipmentSlot, { label: string; labelJa: string; icon: string }> = {
    weapon:    { label: 'Weapon',    labelJa: '武器',       icon: '⚔️' },
    armor:     { label: 'Armor',     labelJa: '防具',       icon: '🛡️' },
    accessory: { label: 'Accessory', labelJa: 'アクセサリー', icon: '💍' },
    charm:     { label: 'Charm',     labelJa: 'お守り',     icon: '🔮' },
};
