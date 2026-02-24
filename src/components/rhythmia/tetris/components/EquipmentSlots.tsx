'use client';

import React, { useState } from 'react';
import type { EquipmentLoadout, EquipmentInstance, EquipmentSlot } from '@/lib/equipment/types';
import { ALL_EQUIPMENT_SLOTS, SLOT_CONFIG } from '@/lib/equipment/types';
import { EQUIPMENT_REGISTRY, ENCHANTMENTS } from '@/lib/equipment/definitions';
import { RARITY_CONFIG } from '@/lib/items/types';
import { cn } from '@/lib/utils';

interface EquipmentSlotsProps {
    loadout: EquipmentLoadout;
    inventory: EquipmentInstance[];
}

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

/**
 * Compact equipment slots display for the gameplay HUD.
 * Shows 4 small squares in a horizontal row (weapon / armor / accessory / charm).
 * Each slot shows the equipment icon with a rarity-colored border.
 * Hovering reveals a tooltip with the equipment name and stat summary.
 */
export function EquipmentSlots({ loadout, inventory }: EquipmentSlotsProps) {
    const [hoveredSlot, setHoveredSlot] = useState<EquipmentSlot | null>(null);

    return (
        <div className="flex items-center gap-1.5">
            {ALL_EQUIPMENT_SLOTS.map((slot) => {
                const instanceId = loadout[slot];
                const instance = instanceId
                    ? inventory.find(i => i.instanceId === instanceId)
                    : undefined;
                const definition = instance
                    ? EQUIPMENT_REGISTRY[instance.equipmentId]
                    : undefined;
                const rarityConfig = definition
                    ? RARITY_CONFIG[definition.rarity]
                    : undefined;
                const slotConfig = SLOT_CONFIG[slot];

                return (
                    <div
                        key={slot}
                        className="relative"
                        onMouseEnter={() => setHoveredSlot(slot)}
                        onMouseLeave={() => setHoveredSlot(null)}
                    >
                        {/* Slot square */}
                        <div
                            className={cn(
                                'w-9 h-9 rounded-md flex items-center justify-center',
                                'border-2 transition-all duration-200 cursor-default',
                                'bg-black/40 backdrop-blur-sm',
                                definition
                                    ? 'border-opacity-80'
                                    : 'border-white/10 opacity-50',
                            )}
                            style={{
                                borderColor: rarityConfig
                                    ? rarityConfig.color
                                    : undefined,
                                boxShadow: rarityConfig && rarityConfig.glowIntensity > 0
                                    ? `0 0 ${6 * rarityConfig.glowIntensity}px ${rarityConfig.color}40, inset 0 0 ${4 * rarityConfig.glowIntensity}px ${rarityConfig.color}20`
                                    : undefined,
                            }}
                        >
                            <span className="text-base leading-none select-none">
                                {definition ? definition.icon : slotConfig.icon}
                            </span>
                        </div>

                        {/* Tooltip on hover */}
                        {hoveredSlot === slot && definition && instance && (
                            <div
                                className={cn(
                                    'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
                                    'w-48 p-2.5 rounded-lg',
                                    'bg-gray-900/95 backdrop-blur-md border border-white/10',
                                    'shadow-xl pointer-events-none',
                                )}
                            >
                                {/* Equipment name */}
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="text-sm leading-none">{definition.icon}</span>
                                    <span
                                        className="text-xs font-bold leading-tight truncate"
                                        style={{ color: rarityConfig?.color ?? '#fff' }}
                                    >
                                        {definition.name}
                                    </span>
                                </div>

                                {/* Rarity badge */}
                                <div
                                    className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                                    style={{
                                        background: rarityConfig?.badgeBg,
                                        color: rarityConfig?.color,
                                    }}
                                >
                                    {rarityConfig?.label}
                                </div>

                                {/* Stat roll quality */}
                                <div className="text-[10px] text-white/40 mb-1">
                                    Roll: {Math.round(instance.statRoll * 100)}%
                                </div>

                                {/* Stats list */}
                                <div className="space-y-0.5">
                                    {definition.baseStats.map((stat, idx) => {
                                        const scaledValue = stat.value * instance.statRoll;
                                        return (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between text-[10px]"
                                            >
                                                <span className="text-white/60">
                                                    {STAT_LABELS[stat.stat] ?? stat.stat}
                                                    {stat.element ? ` (${stat.element})` : ''}
                                                </span>
                                                <span className="text-green-400 font-mono">
                                                    {formatStatValue(stat.stat, scaledValue)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Enchantments */}
                                {instance.enchantments.length > 0 && (
                                    <div className="mt-1.5 pt-1.5 border-t border-white/10">
                                        {instance.enchantments.map((enchType) => {
                                            const ench = ENCHANTMENTS[enchType];
                                            if (!ench) return null;
                                            return (
                                                <div
                                                    key={enchType}
                                                    className="text-[10px] font-medium"
                                                    style={{ color: ench.color }}
                                                >
                                                    {ench.name}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Tooltip arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900/95" />
                            </div>
                        )}

                        {/* Empty slot tooltip */}
                        {hoveredSlot === slot && !definition && (
                            <div
                                className={cn(
                                    'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
                                    'px-2 py-1 rounded-md',
                                    'bg-gray-900/90 backdrop-blur-sm border border-white/10',
                                    'shadow-lg pointer-events-none whitespace-nowrap',
                                )}
                            >
                                <span className="text-[10px] text-white/40">
                                    {slotConfig.label} - Empty
                                </span>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900/90" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
