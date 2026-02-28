'use client';

import React from 'react';
import type { ItemRarity } from '@/lib/items/types';
import { RARITY_CONFIG } from '@/lib/items/types';
import { cn } from '@/lib/utils';

interface RarityBadgeProps {
    rarity: ItemRarity;
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * Compact rarity indicator pill with color-coded styling.
 */
export function RarityBadge({ rarity, size = 'md', className }: RarityBadgeProps) {
    const config = RARITY_CONFIG[rarity];

    return (
        <span
            className={cn(
                'inline-flex items-center font-bold uppercase tracking-wider',
                'rounded-full border',
                size === 'sm'
                    ? 'px-1.5 py-0.5 text-[9px] leading-none'
                    : 'px-2 py-0.5 text-[10px] leading-none',
                className
            )}
            style={{
                color: config.color,
                background: config.badgeBg,
                borderColor: `${config.color}40`,
            }}
        >
            {config.label}
        </span>
    );
}

export default RarityBadge;
