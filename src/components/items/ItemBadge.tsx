'use client';

import React from 'react';
import { ITEM_REGISTRY } from '@/lib/items/registry';
import { ItemTexture } from './ItemTexture';
import { cn } from '@/lib/utils';

interface ItemBadgeProps {
    itemId: string;
    count?: number;
    showName?: boolean;
    className?: string;
}

/**
 * Compact inline badge showing item texture icon + count.
 * Designed for use in card costs, recipe displays, and inline text.
 */
export function ItemBadge({ itemId, count, showName, className }: ItemBadgeProps) {
    const item = ITEM_REGISTRY[itemId];
    if (!item) return null;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded px-1 py-0.5',
                'text-[11px] font-semibold leading-none',
                'bg-white/5 border border-white/8',
                className
            )}
        >
            <ItemTexture itemId={itemId} size={14} />
            {showName && (
                <span className="text-white/60">{item.name}</span>
            )}
            {count !== undefined && (
                <span className="text-white/80 font-mono">
                    {showName ? `x${count}` : count}
                </span>
            )}
        </span>
    );
}

export default ItemBadge;
