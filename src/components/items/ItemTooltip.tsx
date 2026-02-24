'use client';

import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ItemDefinition } from '@/lib/items/types';
import { RARITY_CONFIG, CATEGORY_CONFIG } from '@/lib/items/types';
import { ITEM_REGISTRY } from '@/lib/items/registry';
import { ItemTexture } from './ItemTexture';
import styles from './ItemTooltip.module.css';

// ===== ItemTooltipContent =====

interface ItemTooltipContentProps {
    item: ItemDefinition;
    count?: number;
}

export function ItemTooltipContent({ item, count }: ItemTooltipContentProps) {
    const rarity = RARITY_CONFIG[item.rarity];
    const category = CATEGORY_CONFIG[item.category];

    return (
        <div className={styles.tooltipContainer}>
            <div className={styles.borderOuter}>
                <div className={styles.borderInner}>
                    <div className={styles.tooltipBody}>
                        {/* Header: Texture + Name */}
                        <div className={styles.header}>
                            <div className={styles.headerTextureWrap}>
                                <ItemTexture itemId={item.id} size={24} />
                            </div>
                            <div className={styles.headerInfo}>
                                <span className={styles.itemName} style={{ color: rarity.color }}>
                                    {item.name}
                                </span>
                                <span className={styles.nameJa}>{item.nameJa}</span>
                            </div>
                            {count !== undefined && (
                                <span className={styles.count}>x{count}</span>
                            )}
                        </div>

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
                            <span className={`${styles.badge} ${styles.categoryBadge}`}>
                                {category.label}
                            </span>
                        </div>

                        {/* Divider */}
                        <div className={styles.divider} />

                        {/* Stats */}
                        <div className={styles.statsSection}>
                            <div className={styles.statRow}>
                                <span className={styles.statIcon}>{category.icon}</span>
                                <span className={styles.statLabel}>Type</span>
                                <span className={styles.statValue}>{category.label}</span>
                            </div>
                            {item.maxStack > 1 && (
                                <div className={styles.statRow}>
                                    <span className={styles.statIcon}>📦</span>
                                    <span className={styles.statLabel}>Max Stack</span>
                                    <span className={styles.statValue}>{item.maxStack}</span>
                                </div>
                            )}
                            {item.dropWeight !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statIcon}>🎲</span>
                                    <span className={styles.statLabel}>Drop Rate</span>
                                    <span className={styles.statValue}>{item.dropWeight}%</span>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className={styles.divider} />

                        {/* Description */}
                        <p className={styles.loreText}>{item.description}</p>
                        <p className={styles.loreTextJa}>{item.descriptionJa}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ===== ItemTooltipWrapper =====

interface ItemTooltipWrapperProps {
    itemId: string;
    count?: number;
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
}

/**
 * Wraps any trigger element and shows an item tooltip on hover.
 * Looks up the item from the shared registry by ID.
 */
export function ItemTooltipWrapper({
    itemId,
    count,
    children,
    side = 'right',
    sideOffset = 8,
}: ItemTooltipWrapperProps) {
    const item = ITEM_REGISTRY[itemId];
    if (!item) return <>{children}</>;

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
                        <ItemTooltipContent item={item} count={count} />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}
