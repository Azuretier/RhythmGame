'use client';

import React from 'react';
import { ITEM_TEXTURES, type ItemTextureData } from './textures';
import { ITEM_REGISTRY } from '@/lib/items/registry';
import { lightenColor, darkenColor } from '@/lib/items/color-utils';
import styles from './ItemTexture.module.css';

interface ItemTextureProps {
    itemId: string;
    size?: number;
    glow?: boolean;
    className?: string;
}

const GRID_SIZE = 16;

function renderPixelGrid(texture: ItemTextureData, size: number): React.ReactElement[] {
    const { grid, palette } = texture;
    const highlight = lightenColor(palette.base, 0.35);
    const shadow = darkenColor(palette.base, 0.35);

    const colorMap: Record<string, string> = {
        '#': palette.base,
        '1': palette.highlight || highlight,
        '2': palette.shadow || shadow,
        '3': palette.accent,
    };

    const rects: React.ReactElement[] = [];

    const isEmpty = (x: number, y: number) => {
        if (y < 0 || y >= grid.length) return true;
        if (x < 0 || x >= grid[y].length) return true;
        return grid[y][x] === '.';
    };

    for (let y = 0; y < grid.length; y++) {
        const row = grid[y];
        for (let x = 0; x < row.length; x++) {
            const ch = row[x];
            if (ch === '.') continue;

            let fillColor = colorMap[ch] || palette.base;

            // Apply edge-based shading for base color pixels
            if (ch === '#') {
                let score = 0;
                if (isEmpty(x, y - 1)) score += 1;
                if (isEmpty(x - 1, y)) score += 1;
                if (isEmpty(x, y + 1)) score -= 1;
                if (isEmpty(x + 1, y)) score -= 1;

                if (score > 0) fillColor = highlight;
                else if (score < 0) fillColor = shadow;
            }

            rects.push(
                <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fillColor} />
            );
        }
    }

    return rects;
}

/**
 * Renders a 16x16 pixel art texture for any registered item.
 * Supports rarity-based glow animations (shimmer, pulse).
 */
export function ItemTexture({ itemId, size = 32, glow = false, className }: ItemTextureProps) {
    const texture = ITEM_TEXTURES[itemId];
    const item = ITEM_REGISTRY[itemId];

    if (!texture) {
        // Fallback: colored circle for unknown items
        const half = size / 2;
        const color = item?.color || '#666';
        return (
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                fill="none"
                className={className}
                style={{ display: 'block' }}
            >
                <circle cx={half} cy={half} r={half * 0.6} fill={color} stroke="#888" strokeWidth="0.5" />
            </svg>
        );
    }

    const rarity = item?.rarity;
    const glowColor = item?.glowColor || texture.palette.accent;

    let animClass = '';
    if (glow && rarity === 'legendary') animClass = styles.shimmer;
    else if (glow && rarity === 'epic') animClass = styles.pulse;
    else if (glow && (rarity === 'rare' || rarity === 'uncommon')) animClass = styles.glow;

    return (
        <span
            className={`${styles.textureWrap} ${animClass} ${className || ''}`}
            style={{ '--glow-color': glowColor } as React.CSSProperties}
        >
            <svg
                viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
                width={size}
                height={size}
                style={{ imageRendering: 'pixelated', display: 'block' }}
                aria-label={item?.name || itemId}
            >
                {renderPixelGrid(texture, size)}
            </svg>
        </span>
    );
}

export default ItemTexture;
