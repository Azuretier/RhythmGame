'use client';

import React from 'react';
import type { InventoryEntry } from '@/lib/items/types';
import { ItemSlot } from './ItemSlot';
import { cn } from '@/lib/utils';

interface ItemGridProps {
    items: InventoryEntry[];
    columns?: number;
    slotSize?: number;
    emptySlots?: number;
    onItemClick?: (itemId: string) => void;
    selectedItemId?: string;
    className?: string;
}

/**
 * Grid layout for displaying multiple items as inventory slots.
 * Supports empty placeholder slots and item selection.
 */
export function ItemGrid({
    items,
    columns = 6,
    slotSize = 48,
    emptySlots = 0,
    onItemClick,
    selectedItemId,
    className,
}: ItemGridProps) {
    const totalSlots = Math.max(items.length, items.length + emptySlots);

    return (
        <div
            className={cn('grid gap-1.5', className)}
            style={{
                gridTemplateColumns: `repeat(${columns}, ${slotSize}px)`,
            }}
        >
            {items.map(entry => (
                <ItemSlot
                    key={entry.itemId}
                    item={entry}
                    size={slotSize}
                    selected={selectedItemId === entry.itemId}
                    onClick={onItemClick ? () => onItemClick(entry.itemId) : undefined}
                />
            ))}
            {/* Empty placeholder slots */}
            {Array.from({ length: totalSlots - items.length }).map((_, i) => (
                <ItemSlot key={`empty-${i}`} size={slotSize} />
            ))}
        </div>
    );
}

export default ItemGrid;
