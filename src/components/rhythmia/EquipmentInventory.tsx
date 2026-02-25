'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEquipment } from '@/lib/equipment/context';
import type { EquipmentSlot, EquipmentInstance } from '@/lib/equipment/types';
import { ALL_EQUIPMENT_SLOTS, SLOT_CONFIG } from '@/lib/equipment/types';
import { EQUIPMENT_REGISTRY, ENCHANTMENTS } from '@/lib/equipment/definitions';
import { RARITY_CONFIG } from '@/lib/items/types';
import type { ItemRarity } from '@/lib/items/types';
import { compareEquipmentPower } from '@/lib/equipment/engine';
import { cn } from '@/lib/utils';

interface EquipmentInventoryProps {
    onClose: () => void;
}

type FilterType = 'all' | EquipmentSlot;
type SortType = 'rarity' | 'power' | 'recent';

/** Rarity sort order (higher = rarer) */
const RARITY_ORDER: Record<ItemRarity, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
};

/** Readable labels for stat types */
const STAT_LABELS: Record<string, string> = {
    scorePercent: 'Score',
    comboDuration: 'Combo Duration',
    beatWindow: 'Beat Window',
    terrainDamage: 'Terrain DMG',
    dropRate: 'Drop Rate',
    elementalAffinity: 'Elem. Affinity',
    reactionPower: 'Reaction Power',
    gravityReduce: 'Gravity Reduce',
    comboAmplify: 'Combo Amplify',
};

/** Format stat value with appropriate suffix */
function formatStatValue(stat: string, value: number): string {
    switch (stat) {
        case 'comboDuration':
            return `+${Math.round(value)}ms`;
        case 'scorePercent':
        case 'beatWindow':
        case 'terrainDamage':
        case 'dropRate':
        case 'elementalAffinity':
        case 'reactionPower':
        case 'gravityReduce':
        case 'comboAmplify':
            return `+${Math.round(value * 10) / 10}%`;
        default:
            return `+${Math.round(value * 10) / 10}`;
    }
}

/** Filter buttons configuration */
const FILTER_BUTTONS: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '📦' },
    { key: 'weapon', label: 'Weapons', icon: '⚔️' },
    { key: 'armor', label: 'Armor', icon: '🛡️' },
    { key: 'accessory', label: 'Accessories', icon: '💍' },
    { key: 'charm', label: 'Charms', icon: '🔮' },
];

/** Sort buttons configuration */
const SORT_BUTTONS: { key: SortType; label: string }[] = [
    { key: 'rarity', label: 'Rarity' },
    { key: 'power', label: 'Power' },
    { key: 'recent', label: 'Recent' },
];

/**
 * Full-page equipment inventory management screen for the lobby.
 * Displays all owned equipment in a grid, allows equipping / scrapping,
 * and shows the current loadout at the top.
 */
export function EquipmentInventory({ onClose }: EquipmentInventoryProps) {
    const { state, equip, unequip, scrap } = useEquipment();

    const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [sort, setSort] = useState<SortType>('rarity');
    const [scrapConfirm, setScrapConfirm] = useState<string | null>(null);
    const [scrapResult, setScrapResult] = useState<{ itemId: string; count: number }[] | null>(null);

    // Filtered and sorted inventory
    const displayedItems = useMemo(() => {
        let items = [...state.inventory];

        // Filter by slot
        if (filter !== 'all') {
            items = items.filter(inst => {
                const def = EQUIPMENT_REGISTRY[inst.equipmentId];
                return def?.slot === filter;
            });
        }

        // Sort
        switch (sort) {
            case 'rarity':
                items.sort((a, b) => {
                    const defA = EQUIPMENT_REGISTRY[a.equipmentId];
                    const defB = EQUIPMENT_REGISTRY[b.equipmentId];
                    if (!defA || !defB) return 0;
                    return RARITY_ORDER[defB.rarity] - RARITY_ORDER[defA.rarity];
                });
                break;
            case 'power':
                items.sort((a, b) => compareEquipmentPower(b, a));
                break;
            case 'recent':
                items.sort((a, b) => b.obtainedAt - a.obtainedAt);
                break;
        }

        return items;
    }, [state.inventory, filter, sort]);

    // Selected item details
    const selectedInstance = useMemo(
        () => state.inventory.find(i => i.instanceId === selectedInstanceId),
        [state.inventory, selectedInstanceId],
    );
    const selectedDefinition = selectedInstance
        ? EQUIPMENT_REGISTRY[selectedInstance.equipmentId]
        : undefined;

    // Check if selected item is currently equipped
    const isSelectedEquipped = useMemo(() => {
        if (!selectedInstanceId) return false;
        return Object.values(state.loadout).includes(selectedInstanceId);
    }, [state.loadout, selectedInstanceId]);

    const handleEquip = useCallback(() => {
        if (!selectedInstanceId) return;
        equip(selectedInstanceId);
    }, [selectedInstanceId, equip]);

    const handleUnequip = useCallback(() => {
        if (!selectedDefinition) return;
        unequip(selectedDefinition.slot);
    }, [selectedDefinition, unequip]);

    const handleScrapConfirm = useCallback(() => {
        if (!scrapConfirm) return;
        const materials = scrap(scrapConfirm);
        setScrapResult(materials);
        setSelectedInstanceId(null);
        setScrapConfirm(null);

        // Auto-dismiss scrap result after 3 seconds
        setTimeout(() => setScrapResult(null), 3000);
    }, [scrapConfirm, scrap]);

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                className={cn(
                    'relative w-full max-w-4xl max-h-[90vh] mx-4',
                    'bg-gray-950/95 backdrop-blur-xl rounded-2xl',
                    'border border-white/10 shadow-2xl',
                    'flex flex-col overflow-hidden',
                )}
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <span className="text-lg">⚔️</span>
                        <h2 className="text-lg font-bold text-white tracking-wide">
                            EQUIPMENT
                        </h2>
                        <span className="text-xs text-white/40 font-mono">
                            {state.inventory.length}/{state.maxInventorySize}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            'bg-white/5 hover:bg-white/10 transition-colors',
                            'text-white/40 hover:text-white/80',
                        )}
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* ── Loadout Display ── */}
                <div className="px-6 py-4 border-b border-white/5">
                    <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2.5 font-semibold">
                        Current Loadout
                    </div>
                    <div className="flex items-center gap-3">
                        {ALL_EQUIPMENT_SLOTS.map((slot) => {
                            const instanceId = state.loadout[slot];
                            const instance = instanceId
                                ? state.inventory.find(i => i.instanceId === instanceId)
                                : undefined;
                            const definition = instance
                                ? EQUIPMENT_REGISTRY[instance.equipmentId]
                                : undefined;
                            const rarityConfig = definition
                                ? RARITY_CONFIG[definition.rarity]
                                : undefined;
                            const slotConfig = SLOT_CONFIG[slot];
                            const isActive = selectedInstanceId === instanceId;

                            return (
                                <button
                                    key={slot}
                                    onClick={() => {
                                        if (instanceId) {
                                            setSelectedInstanceId(
                                                selectedInstanceId === instanceId ? null : instanceId,
                                            );
                                        }
                                    }}
                                    className={cn(
                                        'group relative flex flex-col items-center gap-1 p-2 rounded-xl',
                                        'border-2 transition-all duration-200',
                                        'min-w-[72px]',
                                        definition
                                            ? 'bg-white/5 hover:bg-white/10 cursor-pointer'
                                            : 'bg-white/[0.02] cursor-default',
                                        isActive
                                            ? 'ring-2 ring-white/30'
                                            : '',
                                    )}
                                    style={{
                                        borderColor: rarityConfig
                                            ? `${rarityConfig.color}60`
                                            : 'rgba(255,255,255,0.05)',
                                        boxShadow: rarityConfig && rarityConfig.glowIntensity > 0
                                            ? `0 0 ${10 * rarityConfig.glowIntensity}px ${rarityConfig.color}30`
                                            : undefined,
                                    }}
                                >
                                    <span className="text-xl leading-none">
                                        {definition ? definition.icon : slotConfig.icon}
                                    </span>
                                    <span className={cn(
                                        'text-[9px] font-medium uppercase tracking-wider',
                                        definition ? 'text-white/60' : 'text-white/20',
                                    )}>
                                        {slotConfig.label}
                                    </span>
                                    {definition && (
                                        <span
                                            className="text-[8px] font-bold uppercase tracking-wider"
                                            style={{ color: rarityConfig?.color }}
                                        >
                                            {rarityConfig?.label}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Filters & Sort ── */}
                <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-white/5">
                    {/* Filter buttons */}
                    <div className="flex items-center gap-1.5">
                        {FILTER_BUTTONS.map(btn => (
                            <button
                                key={btn.key}
                                onClick={() => setFilter(btn.key)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                                    filter === btn.key
                                        ? 'bg-white/15 text-white'
                                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60',
                                )}
                            >
                                <span className="mr-1">{btn.icon}</span>
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {/* Separator */}
                    <div className="w-px h-5 bg-white/10" />

                    {/* Sort buttons */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/30 uppercase tracking-wider mr-1">Sort:</span>
                        {SORT_BUTTONS.map(btn => (
                            <button
                                key={btn.key}
                                onClick={() => setSort(btn.key)}
                                className={cn(
                                    'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150',
                                    sort === btn.key
                                        ? 'bg-white/15 text-white'
                                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60',
                                )}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Main Content Area ── */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* ── Item Grid ── */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {displayedItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-white/20">
                                <span className="text-3xl mb-3">📦</span>
                                <span className="text-sm">No equipment found</span>
                                <span className="text-xs mt-1">Play stages to earn equipment drops!</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                                <AnimatePresence mode="popLayout">
                                    {displayedItems.map(instance => {
                                        const definition = EQUIPMENT_REGISTRY[instance.equipmentId];
                                        if (!definition) return null;

                                        const rarityConfig = RARITY_CONFIG[definition.rarity];
                                        const isSelected = selectedInstanceId === instance.instanceId;
                                        const isEquipped = Object.values(state.loadout).includes(instance.instanceId);

                                        return (
                                            <motion.button
                                                key={instance.instanceId}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ duration: 0.15 }}
                                                onClick={() => setSelectedInstanceId(
                                                    isSelected ? null : instance.instanceId,
                                                )}
                                                className={cn(
                                                    'relative flex flex-col items-center p-2.5 rounded-xl',
                                                    'border-2 transition-all duration-150',
                                                    'hover:bg-white/10',
                                                    isSelected
                                                        ? 'bg-white/10 ring-2 ring-white/30'
                                                        : 'bg-white/[0.03]',
                                                )}
                                                style={{
                                                    borderColor: `${rarityConfig.color}${isSelected ? '80' : '30'}`,
                                                    boxShadow: isSelected && rarityConfig.glowIntensity > 0
                                                        ? `0 0 ${12 * rarityConfig.glowIntensity}px ${rarityConfig.color}40`
                                                        : undefined,
                                                }}
                                            >
                                                {/* Equipped indicator */}
                                                {isEquipped && (
                                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
                                                )}

                                                {/* Icon */}
                                                <span className="text-2xl leading-none mb-1.5">
                                                    {definition.icon}
                                                </span>

                                                {/* Name */}
                                                <span className="text-[10px] font-medium text-white/80 text-center leading-tight line-clamp-2 w-full">
                                                    {definition.name}
                                                </span>

                                                {/* Rarity + slot line */}
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span
                                                        className="text-[8px] font-bold uppercase tracking-wider"
                                                        style={{ color: rarityConfig.color }}
                                                    >
                                                        {rarityConfig.label}
                                                    </span>
                                                </div>

                                                {/* Quick stat summary */}
                                                <div className="text-[8px] text-white/30 mt-0.5">
                                                    {definition.baseStats.length} stat{definition.baseStats.length !== 1 ? 's' : ''}
                                                    {instance.enchantments.length > 0 && (
                                                        <span className="text-purple-400 ml-1">
                                                            +{instance.enchantments.length} ench.
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* ── Detail Panel ── */}
                    <AnimatePresence>
                        {selectedInstance && selectedDefinition && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 280, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="border-l border-white/10 overflow-hidden flex-shrink-0"
                            >
                                <div className="w-[280px] p-4 overflow-y-auto h-full">
                                    {/* Equipment header */}
                                    <div className="text-center mb-4">
                                        <motion.span
                                            className="text-4xl leading-none inline-block"
                                            initial={{ scale: 0.5 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        >
                                            {selectedDefinition.icon}
                                        </motion.span>
                                        <h3
                                            className="text-sm font-bold mt-2"
                                            style={{ color: RARITY_CONFIG[selectedDefinition.rarity].color }}
                                        >
                                            {selectedDefinition.name}
                                        </h3>
                                        <p className="text-[10px] text-white/40 mt-0.5">
                                            {selectedDefinition.nameJa}
                                        </p>

                                        {/* Rarity & slot badges */}
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <span
                                                className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                                                style={{
                                                    background: RARITY_CONFIG[selectedDefinition.rarity].badgeBg,
                                                    color: RARITY_CONFIG[selectedDefinition.rarity].color,
                                                }}
                                            >
                                                {RARITY_CONFIG[selectedDefinition.rarity].label}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-medium uppercase tracking-wider bg-white/5 text-white/50">
                                                {SLOT_CONFIG[selectedDefinition.slot].icon} {SLOT_CONFIG[selectedDefinition.slot].label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-[11px] text-white/50 leading-relaxed mb-4 italic">
                                        {selectedDefinition.description}
                                    </p>

                                    {/* Stat roll */}
                                    <div className="flex items-center justify-between text-[10px] text-white/30 mb-2 px-1">
                                        <span>Stat Roll</span>
                                        <span className={cn(
                                            'font-mono font-bold',
                                            selectedInstance.statRoll >= 1.1
                                                ? 'text-green-400'
                                                : selectedInstance.statRoll <= 0.9
                                                    ? 'text-red-400'
                                                    : 'text-white/60',
                                        )}>
                                            {Math.round(selectedInstance.statRoll * 100)}%
                                        </span>
                                    </div>

                                    {/* Stats */}
                                    <div className="bg-white/[0.03] rounded-lg p-3 mb-3">
                                        <div className="text-[9px] uppercase tracking-widest text-white/25 mb-2 font-semibold">
                                            Stats
                                        </div>
                                        <div className="space-y-1.5">
                                            {selectedDefinition.baseStats.map((stat, idx) => {
                                                const scaledValue = stat.value * selectedInstance.statRoll;
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <span className="text-[11px] text-white/60">
                                                            {STAT_LABELS[stat.stat] ?? stat.stat}
                                                            {stat.element && (
                                                                <span className="text-white/30 ml-1">
                                                                    ({stat.element})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-[11px] text-green-400 font-mono font-medium">
                                                            {formatStatValue(stat.stat, scaledValue)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Enchantments */}
                                    {selectedInstance.enchantments.length > 0 && (
                                        <div className="bg-white/[0.03] rounded-lg p-3 mb-3">
                                            <div className="text-[9px] uppercase tracking-widest text-white/25 mb-2 font-semibold">
                                                Enchantments
                                            </div>
                                            <div className="space-y-2">
                                                {selectedInstance.enchantments.map(enchType => {
                                                    const ench = ENCHANTMENTS[enchType];
                                                    if (!ench) return null;
                                                    return (
                                                        <div key={enchType}>
                                                            <div
                                                                className="text-[11px] font-semibold"
                                                                style={{ color: ench.color }}
                                                            >
                                                                {ench.name}
                                                            </div>
                                                            <div className="text-[10px] text-white/40 leading-relaxed">
                                                                {ench.description}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Source info */}
                                    <div className="text-[9px] text-white/20 mb-4 px-1">
                                        Source: {selectedInstance.source.replace(/_/g, ' ')}
                                        <span className="mx-1.5">|</span>
                                        {new Date(selectedInstance.obtainedAt).toLocaleDateString()}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2">
                                        {isSelectedEquipped ? (
                                            <button
                                                onClick={handleUnequip}
                                                className={cn(
                                                    'flex-1 py-2 rounded-lg text-xs font-semibold',
                                                    'bg-yellow-500/20 text-yellow-400',
                                                    'hover:bg-yellow-500/30 transition-colors',
                                                    'border border-yellow-500/30',
                                                )}
                                            >
                                                Unequip
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleEquip}
                                                className={cn(
                                                    'flex-1 py-2 rounded-lg text-xs font-semibold',
                                                    'bg-blue-500/20 text-blue-400',
                                                    'hover:bg-blue-500/30 transition-colors',
                                                    'border border-blue-500/30',
                                                )}
                                            >
                                                Equip
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setScrapConfirm(selectedInstance.instanceId)}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg text-xs font-semibold',
                                                'bg-red-500/15 text-red-400',
                                                'hover:bg-red-500/25 transition-colors',
                                                'border border-red-500/20',
                                            )}
                                        >
                                            Scrap
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Scrap Confirmation Modal ── */}
                <AnimatePresence>
                    {scrapConfirm && (() => {
                        const confirmInstance = state.inventory.find(i => i.instanceId === scrapConfirm);
                        const confirmDef = confirmInstance
                            ? EQUIPMENT_REGISTRY[confirmInstance.equipmentId]
                            : undefined;
                        if (!confirmInstance || !confirmDef) return null;

                        const rarityConfig = RARITY_CONFIG[confirmDef.rarity];

                        return (
                            <motion.div
                                key="scrap-confirm"
                                className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className="bg-gray-900/95 border border-white/10 rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.9 }}
                                >
                                    <h3 className="text-sm font-bold text-white mb-3">
                                        Scrap Equipment?
                                    </h3>
                                    <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-lg">
                                        <span className="text-2xl">{confirmDef.icon}</span>
                                        <div>
                                            <div
                                                className="text-sm font-semibold"
                                                style={{ color: rarityConfig.color }}
                                            >
                                                {confirmDef.name}
                                            </div>
                                            <div
                                                className="text-[10px] font-bold uppercase tracking-wider"
                                                style={{ color: rarityConfig.color }}
                                            >
                                                {rarityConfig.label}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/50 mb-4">
                                        This action cannot be undone. You will receive materials in return.
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setScrapConfirm(null)}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg text-xs font-semibold',
                                                'bg-white/5 text-white/60',
                                                'hover:bg-white/10 transition-colors',
                                            )}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleScrapConfirm}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg text-xs font-semibold',
                                                'bg-red-500/20 text-red-400',
                                                'hover:bg-red-500/30 transition-colors',
                                                'border border-red-500/30',
                                            )}
                                        >
                                            Confirm Scrap
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>

                {/* ── Scrap Result Toast ── */}
                <AnimatePresence>
                    {scrapResult && (
                        <motion.div
                            key="scrap-result"
                            className={cn(
                                'absolute bottom-4 left-1/2 -translate-x-1/2 z-20',
                                'bg-green-900/80 border border-green-500/30 rounded-lg',
                                'px-4 py-2.5 shadow-lg backdrop-blur-sm',
                            )}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm">⛏️</span>
                                <div className="text-xs text-green-300">
                                    Received:{' '}
                                    {scrapResult.map((mat, idx) => (
                                        <span key={mat.itemId}>
                                            {idx > 0 && ', '}
                                            <span className="font-semibold">{mat.count}x</span>{' '}
                                            {mat.itemId}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
