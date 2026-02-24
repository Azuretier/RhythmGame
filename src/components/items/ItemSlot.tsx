'use client';

import React from 'react';
import type { InventoryEntry } from '@/lib/items/types';
import { ITEM_REGISTRY } from '@/lib/items/registry';
import { ItemTexture } from './ItemTexture';
import styles from './ItemSlot.module.css';

interface ItemSlotProps {
    item?: InventoryEntry;
    size?: number;
    selected?: boolean;
    onClick?: () => void;
    className?: string;
}

const RARITY_CLASS: Record<string, string> = {
    common: styles.slotCommon,
    uncommon: styles.slotUncommon,
    rare: styles.slotRare,
    epic: styles.slotEpic,
    legendary: styles.slotLegendary,
};

/**
 * Square inventory slot with item texture, count badge, and rarity-colored border.
 */
export function ItemSlot({ item, size = 48, selected, onClick, className }: ItemSlotProps) {
    const def = item ? ITEM_REGISTRY[item.itemId] : undefined;
    const isEmpty = !item || !def;
    const textureSize = Math.round(size * 0.65);

    return (
        <div
            className={[
                styles.slot,
                isEmpty ? styles.slotEmpty : (RARITY_CLASS[def.rarity] || ''),
                selected ? styles.slotSelected : '',
                onClick ? styles.slotClickable : '',
                className || '',
            ].filter(Boolean).join(' ')}
            style={{
                width: size,
                height: size,
                '--slot-color': def?.color,
                '--slot-glow': def?.glowColor,
            } as React.CSSProperties}
            onClick={onClick}
        >
            {def && (
                <>
                    {/* Top accent line */}
                    <div className={styles.accentLine} style={{ background: def.color }} />

                    {/* Item texture */}
                    <ItemTexture
                        itemId={item!.itemId}
                        size={textureSize}
                        glow={def.rarity !== 'common'}
                    />

                    {/* Count badge */}
                    {item!.count > 1 && (
                        <span className={styles.countBadge}>{item!.count}</span>
                    )}
                </>
            )}
        </div>
    );
}

export default ItemSlot;
