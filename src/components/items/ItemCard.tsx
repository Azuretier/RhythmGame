'use client';

import React from 'react';
import { ITEM_REGISTRY } from '@/lib/items/registry';
import { CATEGORY_CONFIG } from '@/lib/items/types';
import { ItemTexture } from './ItemTexture';
import { RarityBadge } from './RarityBadge';
import styles from './ItemCard.module.css';

interface ItemCardProps {
    itemId: string;
    count?: number;
    compact?: boolean;
    className?: string;
}

/**
 * Card-style item display with pixel art texture, name, rarity, and description.
 * Supports compact mode for inline use.
 */
export function ItemCard({ itemId, count, compact, className }: ItemCardProps) {
    const item = ITEM_REGISTRY[itemId];
    if (!item) return null;

    const categoryConf = CATEGORY_CONFIG[item.category];

    return (
        <div
            className={`${styles.card} ${compact ? styles.compact : ''} ${className || ''}`}
        >
            {/* Accent line */}
            <div className={styles.accentLine} style={{ background: item.color }} />

            {/* Header */}
            <div className={styles.header}>
                <div
                    className={styles.textureWrap}
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${item.glowColor}15, transparent)`,
                    }}
                >
                    <ItemTexture
                        itemId={itemId}
                        size={compact ? 22 : 36}
                        glow={item.rarity !== 'common'}
                    />
                </div>

                <div className={styles.info}>
                    <span className={styles.name} style={{ color: item.color }}>
                        {item.name}
                    </span>
                    {!compact && (
                        <span className={styles.nameJa}>{item.nameJa}</span>
                    )}
                    {!compact && (
                        <div className={styles.badges}>
                            <RarityBadge rarity={item.rarity} size="sm" />
                            <span className={styles.categoryTag}>
                                {categoryConf.label}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Count */}
            {count !== undefined && (
                <span className={styles.count}>
                    <span className={styles.countPrefix}>x</span>{count}
                </span>
            )}

            {/* Description */}
            {!compact && (
                <p className={styles.description}>{item.description}</p>
            )}
        </div>
    );
}

export default ItemCard;
