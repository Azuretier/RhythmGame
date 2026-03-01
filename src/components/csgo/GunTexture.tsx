'use client';

import React from 'react';
import { CSGO_WEAPON_TEXTURES, type ItemTextureData } from './textures';
import { CSGO_WEAPON_REGISTRY } from '@/lib/csgo/registry';
import { lightenColor, darkenColor } from '@/lib/items/color-utils';
import styles from './GunTexture.module.css';

interface GunTextureProps {
    weaponId: string;
    size?: number;
    glow?: boolean;
    className?: string;
}

const GRID_SIZE = 16;

function renderPixelGrid(texture: ItemTextureData): React.ReactElement[] {
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
 * Renders a 16x16 pixel art texture for a CS:GO weapon.
 * Supports skin-grade–based glow animations.
 */
export function GunTexture({ weaponId, size = 32, glow = false, className }: GunTextureProps) {
    const texture = CSGO_WEAPON_TEXTURES[weaponId];
    const weapon = CSGO_WEAPON_REGISTRY[weaponId];

    if (!texture) {
        const half = size / 2;
        const color = weapon?.color || '#666';
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

    const grade = weapon?.skinGrade;
    const glowColor = weapon?.glowColor || texture.palette.accent;

    let animClass = '';
    if (glow && grade === 'contraband') animClass = styles.shimmer;
    else if (glow && (grade === 'covert' || grade === 'classified')) animClass = styles.pulse;
    else if (glow && (grade === 'restricted' || grade === 'mil_spec')) animClass = styles.glow;

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
                aria-label={weapon?.name || weaponId}
            >
                {renderPixelGrid(texture)}
            </svg>
        </span>
    );
}

export default GunTexture;
