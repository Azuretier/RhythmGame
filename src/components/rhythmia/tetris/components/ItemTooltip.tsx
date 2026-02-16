'use client';

import React from 'react';
import type { ItemType, RogueCard } from '../types';
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

// ===== Attribute Display Names =====
const ATTRIBUTE_LABELS: Record<string, { label: string; icon: string }> = {
    combo_guard:   { label: 'Combo Guard',    icon: '🛡️' },
    terrain_surge: { label: 'Terrain Surge',  icon: '⛏️' },
    beat_extend:   { label: 'Beat Extend',    icon: '🎵' },
    score_boost:   { label: 'Score Boost',    icon: '💰' },
    gravity_slow:  { label: 'Gravity Slow',   icon: '🪶' },
    lucky_drops:   { label: 'Lucky Drops',    icon: '🍀' },
    combo_amplify: { label: 'Combo Amplify',  icon: '🔥' },
    shield:        { label: 'Shield',         icon: '🛡️' },
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
                            Collected from terrain blocks. Used as card currency.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ===== Rogue Card Tooltip =====
interface RogueCardTooltipProps {
    card: RogueCard;
    stackCount?: number;
}

export function RogueCardTooltip({ card, stackCount }: RogueCardTooltipProps) {
    const rarity = RARITY_CONFIG[card.rarity] || RARITY_CONFIG.common;
    const attr = ATTRIBUTE_LABELS[card.attribute];

    return (
        <div className={styles.tooltipContainer}>
            <div className={styles.borderOuter}>
                <div className={styles.borderInner}>
                    <div className={styles.tooltipBody}>
                        {/* Header: Card Name + Icon */}
                        <div className={styles.header}>
                            <span className={styles.itemName} style={{ color: card.color }}>
                                {card.icon} {card.name}
                            </span>
                            {stackCount && stackCount > 1 && (
                                <span className={styles.powerLevel} style={{ color: card.color }}>
                                    x{stackCount}
                                </span>
                            )}
                        </div>

                        {/* Japanese name */}
                        <span className={styles.nameJa}>{card.nameJa}</span>

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
                        </div>

                        {/* Divider */}
                        <div className={styles.divider} />

                        {/* Attribute info */}
                        <div className={styles.statsSection}>
                            {attr && (
                                <div className={styles.statRow}>
                                    <span className={styles.statIcon}>{attr.icon}</span>
                                    <span className={styles.statLabel}>{attr.label}</span>
                                    <span className={`${styles.statValue} ${styles.statValueEffect}`}>
                                        Active
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className={styles.divider} />

                        {/* Card description */}
                        <p className={styles.loreText}>
                            {card.description}
                        </p>
                        <p className={styles.loreText} style={{ opacity: 0.7 }}>
                            {card.descriptionJa}
                        </p>

                        {/* Cost */}
                        {card.baseCost.length > 0 && (
                            <>
                                <div className={styles.divider} />
                                <div className={styles.recipeSection}>
                                    <span className={styles.recipeSectionTitle}>Base Cost</span>
                                    {card.baseCost.map((req, i) => {
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
                            </>
                        )}
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
    rogueCard?: RogueCard;
    count?: number;
    stackCount?: number;
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
}

export function ItemTooltipWrapper({
    item,
    rogueCard,
    count,
    stackCount,
    children,
    side = 'right',
    sideOffset = 8,
}: ItemTooltipWrapperProps) {
    if (!item && !rogueCard) return <>{children}</>;

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
                        {rogueCard && <RogueCardTooltip card={rogueCard} stackCount={stackCount} />}
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}
