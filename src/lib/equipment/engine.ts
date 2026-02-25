import type {
    EquipmentInstance, EquipmentLoadout, EquipmentBonuses,
    EnchantmentType, StatType, EquipmentDefinition,
} from './types';
import { DEFAULT_EQUIPMENT_BONUSES } from './types';
import type { ElementType } from '@/lib/elements/types';
import type { ItemRarity } from '@/lib/items/types';
import { EQUIPMENT_REGISTRY, getLootTable, ALL_ENCHANTMENT_TYPES } from './definitions';

// ===== Constants =====

/** Base % chance of equipment dropping per line clear event */
const BASE_DROP_CHANCE = 0.05;

/** Additional drop chance per line cleared in a single event */
const LINE_COUNT_BONUS = 0.01;

/** Additional drop chance per current combo count */
const COMBO_BONUS = 0.005;

/** Stat roll range: multiplied against base stats */
const STAT_ROLL_MIN = 0.8;
const STAT_ROLL_MAX = 1.2;

// ===== Scrap Material Returns by Rarity =====

const SCRAP_RETURNS: Record<ItemRarity, { itemId: string; count: number }[]> = {
    common: [{ itemId: 'stone', count: 2 }],
    uncommon: [
        { itemId: 'stone', count: 3 },
        { itemId: 'iron', count: 1 },
    ],
    rare: [
        { itemId: 'iron', count: 3 },
        { itemId: 'crystal', count: 1 },
    ],
    epic: [
        { itemId: 'crystal', count: 3 },
        { itemId: 'gold', count: 1 },
        { itemId: 'obsidian', count: 1 },
    ],
    legendary: [
        { itemId: 'gold', count: 3 },
        { itemId: 'obsidian', count: 2 },
        { itemId: 'star', count: 1 },
    ],
};

// ===== ID Generation =====

/**
 * Generate a UUID-like instance ID for equipment.
 */
export function generateInstanceId(): string {
    const hex = (n: number) =>
        Math.floor(Math.random() * Math.pow(16, n))
            .toString(16)
            .padStart(n, '0');
    return `eq-${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`;
}

// ===== Equipment Drop Rolling =====

/**
 * Roll whether an equipment item drops and which one.
 *
 * @param worldIdx     Current world index (0-based)
 * @param lineCount    Number of lines cleared in this event
 * @param combo        Current combo count
 * @param dropRateBonus  Bonus from equipment stats (e.g. 25 means +25%)
 * @param source       How this drop was triggered
 * @returns An EquipmentInstance if the roll succeeds, or null
 */
export function rollEquipmentDrop(
    worldIdx: number,
    lineCount: number,
    combo: number,
    dropRateBonus: number = 0,
    source: EquipmentInstance['source'] = 'line_clear',
): EquipmentInstance | null {
    const lootTable = getLootTable(worldIdx);

    // Calculate drop chance
    let chance = BASE_DROP_CHANCE;
    chance += (lineCount - 1) * LINE_COUNT_BONUS;
    chance += combo * COMBO_BONUS;
    chance += lootTable.lineCountBonus * lineCount;
    chance += lootTable.comboBonus * combo;

    // Apply drop rate bonus from equipment
    chance *= 1 + dropRateBonus / 100;

    // Clamp to [0, 1]
    chance = Math.max(0, Math.min(1, chance));

    // Roll the dice
    if (Math.random() > chance) return null;

    // Pick which equipment from the loot table
    const totalWeight = lootTable.entries.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;

    let equipmentId = lootTable.entries[0].equipmentId;
    for (const entry of lootTable.entries) {
        roll -= entry.weight;
        if (roll <= 0) {
            equipmentId = entry.equipmentId;
            break;
        }
    }

    const definition = EQUIPMENT_REGISTRY[equipmentId];
    if (!definition) return null;

    // Roll enchantments
    const enchantments = rollEnchantments(definition.enchantmentSlots);

    // Roll stat multiplier
    const statRoll = STAT_ROLL_MIN + Math.random() * (STAT_ROLL_MAX - STAT_ROLL_MIN);

    return {
        instanceId: generateInstanceId(),
        equipmentId,
        enchantments,
        statRoll: Math.round(statRoll * 100) / 100, // Round to 2 decimals
        obtainedAt: Date.now(),
        source,
    };
}

// ===== Enchantment Rolling =====

/**
 * Roll random enchantments for the given number of slots.
 * No duplicate enchantments are allowed.
 */
export function rollEnchantments(slotCount: number): EnchantmentType[] {
    if (slotCount <= 0) return [];

    const available = [...ALL_ENCHANTMENT_TYPES];
    const result: EnchantmentType[] = [];

    for (let i = 0; i < slotCount && available.length > 0; i++) {
        const idx = Math.floor(Math.random() * available.length);
        result.push(available[idx]);
        available.splice(idx, 1);
    }

    return result;
}

// ===== Bonus Computation =====

/**
 * Compute aggregated bonuses from all equipped items in a loadout.
 */
export function computeEquipmentBonuses(
    loadout: EquipmentLoadout,
    inventory: EquipmentInstance[],
): EquipmentBonuses {
    const bonuses: EquipmentBonuses = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT_BONUSES));
    const affinityMap = new Map<ElementType, number>();

    const equippedIds = [loadout.weapon, loadout.armor, loadout.accessory, loadout.charm].filter(
        (id): id is string => id !== null,
    );

    for (const instanceId of equippedIds) {
        const instance = inventory.find(i => i.instanceId === instanceId);
        if (!instance) continue;

        const definition = EQUIPMENT_REGISTRY[instance.equipmentId];
        if (!definition) continue;

        // Apply base stats with stat roll multiplier
        for (const stat of definition.baseStats) {
            const scaledValue = stat.value * instance.statRoll;

            switch (stat.stat) {
                case 'scorePercent':
                    bonuses.scorePercent += scaledValue;
                    break;
                case 'comboDuration':
                    bonuses.comboDuration += scaledValue;
                    break;
                case 'beatWindow':
                    bonuses.beatWindow += scaledValue;
                    break;
                case 'terrainDamage':
                    bonuses.terrainDamage += scaledValue;
                    break;
                case 'dropRate':
                    bonuses.dropRate += scaledValue;
                    break;
                case 'elementalAffinity':
                    if (stat.element) {
                        const current = affinityMap.get(stat.element) ?? 0;
                        affinityMap.set(stat.element, current + scaledValue);
                    }
                    break;
                case 'reactionPower':
                    bonuses.reactionPower += scaledValue;
                    break;
                case 'gravityReduce':
                    bonuses.gravityReduce += scaledValue;
                    break;
                case 'comboAmplify':
                    bonuses.comboAmplify += scaledValue;
                    break;
            }
        }

        // Collect enchantments
        for (const enchantment of instance.enchantments) {
            if (!bonuses.enchantments.includes(enchantment)) {
                bonuses.enchantments.push(enchantment);
            }
        }
    }

    // Convert affinity map to sorted array
    bonuses.elementalAffinities = Array.from(affinityMap.entries())
        .map(([element, bonus]) => ({ element, bonus }))
        .sort((a, b) => b.bonus - a.bonus);

    // Round all numeric values to 2 decimal places
    bonuses.scorePercent = Math.round(bonuses.scorePercent * 100) / 100;
    bonuses.comboDuration = Math.round(bonuses.comboDuration * 100) / 100;
    bonuses.beatWindow = Math.round(bonuses.beatWindow * 100) / 100;
    bonuses.terrainDamage = Math.round(bonuses.terrainDamage * 100) / 100;
    bonuses.dropRate = Math.round(bonuses.dropRate * 100) / 100;
    bonuses.reactionPower = Math.round(bonuses.reactionPower * 100) / 100;
    bonuses.gravityReduce = Math.round(bonuses.gravityReduce * 100) / 100;
    bonuses.comboAmplify = Math.round(bonuses.comboAmplify * 100) / 100;

    return bonuses;
}

// ===== Scrap System =====

/**
 * Scrap an equipment instance and return materials based on rarity.
 */
export function scrapEquipment(instance: EquipmentInstance): { itemId: string; count: number }[] {
    const definition = EQUIPMENT_REGISTRY[instance.equipmentId];
    if (!definition) return [];

    const baseReturns = SCRAP_RETURNS[definition.rarity] ?? SCRAP_RETURNS.common;

    // Scale returns slightly by stat roll — better rolled items give more materials
    const rollBonus = instance.statRoll >= 1.1 ? 1 : 0;

    return baseReturns.map(r => ({
        itemId: r.itemId,
        count: r.count + rollBonus,
    }));
}

// ===== Utility =====

/**
 * Resolve an equipment instance to its full definition.
 * Returns undefined if the definition no longer exists.
 */
export function resolveDefinition(instance: EquipmentInstance): EquipmentDefinition | undefined {
    return EQUIPMENT_REGISTRY[instance.equipmentId];
}

/**
 * Compare two equipment instances by effective stat power.
 * Returns positive if a is stronger than b.
 */
export function compareEquipmentPower(a: EquipmentInstance, b: EquipmentInstance): number {
    const defA = EQUIPMENT_REGISTRY[a.equipmentId];
    const defB = EQUIPMENT_REGISTRY[b.equipmentId];
    if (!defA || !defB) return 0;

    const powerA = defA.baseStats.reduce((sum, s) => sum + s.value, 0) * a.statRoll + a.enchantments.length * 10;
    const powerB = defB.baseStats.reduce((sum, s) => sum + s.value, 0) * b.statRoll + b.enchantments.length * 10;

    return powerA - powerB;
}
