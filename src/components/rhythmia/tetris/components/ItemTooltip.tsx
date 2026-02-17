'use client';

import React from 'react';
import type { ItemType, WeaponCard } from '../types';
import { ITEM_MAP } from '../constants';
import { ItemIcon } from './ItemIcon';
import styles from './ItemTooltip.module.css';

// ===== Rarity Config =====
const RARITY_CONFIG: Record<string, { label: string; color: string; badgeBg: string }> = {
    common:    { label: 'Common',    color: '#8B8B8B', badgeBg: 'rgba(139,139,139,0.15)' },
    uncommon:  { label: 'Uncommon',  color: '#4FC3F7', badgeBg: 'rgba(79,195,247,0.15)' },
    rare:      { label: 'Rare',      color: '#FFD700', badgeBg: 'rgba(255,215,0,0.15)' },
    epic:      { label: 'Epic',      color: '#9C27B0', badgeBg: 'rgba(156,39,176,0.15)' },
    legendary: { label: 'Legendary', color: '#FFFFFF', badgeBg: 'rgba(255,255,255,0.15)' },
};

// ===== Special Effect Display Names =====
const EFFECT_LABELS: Record<string, { label: string; icon: string }> = {
    wide_beat: { label: 'Wider Beat Window', icon: '🎵' },
    shatter:   { label: 'Shatter Effect',    icon: '💥' },
    burst:     { label: 'Burst Particles',   icon: '✨' },
};

// ===== Material Item Tooltip =====
interface MaterialTooltipProps {
    item: ItemType;
    count?: number;
}

export function MaterialTooltip({ item, count }: MaterialTooltipProps) {
    const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

    return (
        <div className={styles.tooltipContainer}>
            {/* Beveled border layers (Java Edition style) */}
            <div className={styles.borderOuter}>
                <div className={styles.borderInner}>
                    <div className={styles.tooltipBody}>
                        {/* Header: Name + Power Level */}
                        <div className={styles.header}>
                            <span className={styles.itemName} style={{ color: rarity.color }}>
                                {item.name}
                            </span>
                            {count !== undefined && (
                                <span className={styles.powerLevel}>x{count}</span>
                            )}
                        </div>

                        {/* Japanese name subtitle */}
                        <span className={styles.nameJa}>{item.nameJa}</span>

                        {/* Rarity badge */}
                        <div className={styles.badges}>
                            <span
                                className={styles.badge}
                                style={{
                                    color: rarity.color,
                                    background: rarity.badgeBg,
                                    borderColor: `${rarity.color}40`,
                                }}
                            >
                                {rarity.label}
                            </span>
                        </div>

                        {/* Divider */}
                        <div className={styles.divider} />

                        {/* Stat rows with icons */}
                        <div className={styles.statsSection}>
                            <div className={styles.statRow}>
                                <span className={styles.statIcon}>📦</span>
                                <span className={styles.statLabel}>Type</span>
                                <span className={styles.statValue}>Material</span>
                            </div>
                            <div className={styles.statRow}>
                                <span className={styles.statIcon}>🎲</span>
                                <span className={styles.statLabel}>Drop Rate</span>
                                <span className={styles.statValue}>{item.dropWeight}%</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className={styles.divider} />

                        {/* Flavor text */}
                        <p className={styles.loreText}>
                            Collected from terrain blocks. Used in weapon forging recipes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ===== Weapon Card Tooltip =====
interface WeaponTooltipProps {
    weapon: WeaponCard;
    equipped?: boolean;
}

export function WeaponTooltip({ weapon, equipped }: WeaponTooltipProps) {
    // Derive rarity from recipe complexity
    const rarityKey = deriveWeaponRarity(weapon);
    const rarity = RARITY_CONFIG[rarityKey];
    const damagePercent = Math.round((weapon.damageMultiplier - 1) * 100);
    const effect = weapon.specialEffect ? EFFECT_LABELS[weapon.specialEffect] : null;

    return (
        <div className={styles.tooltipContainer}>
            <div className={styles.borderOuter}>
                <div className={styles.borderInner}>
                    <div className={styles.tooltipBody}>
                        {/* Header: Weapon Name + Damage Power */}
                        <div className={styles.header}>
                            <span className={styles.itemName} style={{ color: rarity.color }}>
                                {weapon.name}
                            </span>
                            <span className={styles.powerLevel} style={{ color: rarity.color }}>
                                +{damagePercent}%
                            </span>
                        </div>

                        {/* Japanese name */}
                        <span className={styles.nameJa}>{weapon.nameJa}</span>

                        {/* Badges */}
                        <div className={styles.badges}>
                            <span
                                className={styles.badge}
                                style={{
                                    color: rarity.color,
                                    background: rarity.badgeBg,
                                    borderColor: `${rarity.color}40`,
                                }}
                            >
                                {rarity.label}
                            </span>
                            {weapon.specialEffect && (
                                <span className={`${styles.badge} ${styles.badgeGolden}`}>
                                    Special
                                </span>
                            )}
                            {equipped && (
                                <span className={`${styles.badge} ${styles.badgeEquipped}`}>
                                    Equipped
                                </span>
                            )}
                        </div>

                        {/* Divider */}
                        <div className={styles.divider} />

                        {/* Stats section */}
                        <div className={styles.statsSection}>
                            <div className={styles.statRow}>
                                <span className={styles.statIcon}>⚔️</span>
                                <span className={styles.statLabel}>Terrain Damage</span>
                                <span className={`${styles.statValue} ${styles.statValueDamage}`}>
                                    x{weapon.damageMultiplier.toFixed(1)}
                                </span>
                            </div>

                            {effect && (
                                <div className={styles.statRow}>
                                    <span className={styles.statIcon}>{effect.icon}</span>
                                    <span className={styles.statLabel}>{effect.label}</span>
                                    <span className={`${styles.statValue} ${styles.statValueEffect}`}>
                                        Active
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className={styles.divider} />

                        {/* Recipe cost */}
                        <div className={styles.recipeSection}>
                            <span className={styles.recipeSectionTitle}>Recipe</span>
                            {weapon.recipe.map((req, i) => {
                                const mat = ITEM_MAP[req.itemId];
                                if (!mat) return null;
                                return (
                                    <div key={i} className={styles.recipeRow}>
                                        <div className={styles.recipeIconWrap}>
                                            <ItemIcon itemId={req.itemId} size={14} />
                                        </div>
                                        <span className={styles.recipeMatName}>{mat.name}</span>
                                        <span className={styles.recipeMatCount}>x{req.count}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Divider */}
                        <div className={styles.divider} />

                        {/* Flavor text */}
                        <p className={styles.loreText}>
                            {weapon.description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ===== Unified Tooltip Wrapper (Radix-based) =====
// This wraps any trigger element and shows the appropriate tooltip on hover

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface ItemTooltipWrapperProps {
    item?: ItemType;
    weapon?: WeaponCard;
    count?: number;
    equipped?: boolean;
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
}

export function ItemTooltipWrapper({
    item,
    weapon,
    count,
    equipped,
    children,
    side = 'right',
    sideOffset = 8,
}: ItemTooltipWrapperProps) {
    if (!item && !weapon) return <>{children}</>;

    return (
        <TooltipPrimitive.Provider delayDuration={200}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    {children}
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        sideOffset={sideOffset}
                        className={styles.tooltipContent}
                        avoidCollisions
                    >
                        {item && <MaterialTooltip item={item} count={count} />}
                        {weapon && <WeaponTooltip weapon={weapon} equipped={equipped} />}
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}

// ===== Helpers =====
function deriveWeaponRarity(weapon: WeaponCard): string {
    if (weapon.damageMultiplier >= 1.7) return 'legendary';
    if (weapon.damageMultiplier >= 1.5) return 'epic';
    if (weapon.damageMultiplier >= 1.3) return 'rare';
    if (weapon.damageMultiplier >= 1.15) return 'uncommon';
    return 'common';
}
