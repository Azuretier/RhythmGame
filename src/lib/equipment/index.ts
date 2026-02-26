// ===== Equipment System — Barrel Export =====

export type {
    EquipmentSlot, StatType, StatBonus, EnchantmentType, Enchantment,
    EquipmentDefinition, EquipmentInstance, EquipmentLoadout, EquipmentState,
    LootTableEntry, LootTable, EquipmentBonuses,
} from './types';

export {
    DEFAULT_EQUIPMENT_LOADOUT, DEFAULT_EQUIPMENT_STATE, DEFAULT_EQUIPMENT_BONUSES,
    ALL_EQUIPMENT_SLOTS, SLOT_CONFIG,
} from './types';

export {
    ENCHANTMENTS, ALL_ENCHANTMENTS, ALL_ENCHANTMENT_TYPES,
    EQUIPMENT_REGISTRY, getEquipment, ALL_EQUIPMENT, EQUIPMENT_BY_SLOT,
    LOOT_TABLES, getLootTable,
} from './definitions';

export {
    generateInstanceId,
    rollEquipmentDrop, rollEnchantments,
    computeEquipmentBonuses, scrapEquipment,
    resolveDefinition, compareEquipmentPower,
} from './engine';

export { loadEquipmentState, saveEquipmentState } from './storage';

export { syncEquipmentToFirestore, loadEquipmentFromFirestore } from './firestore';

export { EquipmentProvider, useEquipment } from './context';
