import React, { useRef } from 'react';
import type { FloatingItem } from '../types';
import { ITEM_MAP } from '../constants';
import { ItemIcon } from './ItemIcon';
import styles from '../VanillaGame.module.css';

interface FloatingItemsProps {
    items: FloatingItem[];
}

/**
 * Renders floating items that rise from terrain destruction
 * and arc toward the player's inventory with a smooth absorption animation
 */
export function FloatingItems({ items }: FloatingItemsProps) {
    return (
        <div className={styles.floatingItemsContainer}>
            {items.map(item => (
                <FloatingItemEl key={item.id} item={item} />
            ))}
        </div>
    );
}

function FloatingItemEl({ item }: { item: FloatingItem }) {
    const elRef = useRef<HTMLDivElement>(null);
    const itemDef = ITEM_MAP[item.itemId];
    if (!itemDef) return null;

    const now = Date.now();
    const elapsed = now - item.startTime;
    const progress = Math.min(1, Math.max(0, elapsed / item.duration));

    // Easing function: ease-in-out cubic
    const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    // Arc path: item rises up then curves toward target
    const startX = item.x;
    const startY = item.y;
    const midY = Math.min(startY, item.targetY) - 60 - Math.random() * 40;

    // Quadratic bezier
    const t = eased;
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ((startX + item.targetX) / 2) + t * t * item.targetX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * item.targetY;

    const scale = item.collected ? 0 : 0.6 + Math.sin(progress * Math.PI) * 0.4;
    const opacity = item.collected ? 0 : Math.min(1, progress * 3) * (1 - Math.max(0, (progress - 0.7) / 0.3));

    const rarityGlow = {
        common: '0 0 8px rgba(139,139,139,0.5)',
        uncommon: '0 0 12px rgba(79,195,247,0.6)',
        rare: '0 0 16px rgba(255,215,0,0.7)',
        epic: '0 0 20px rgba(156,39,176,0.8)',
        legendary: '0 0 24px rgba(255,255,255,0.9)',
    }[itemDef.rarity];

    return (
        <div
            ref={elRef}
            className={`${styles.floatingItem} ${item.collected ? styles.floatingItemCollected : ''}`}
            style={{
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                opacity,
                boxShadow: rarityGlow,
                borderColor: itemDef.color,
                background: `radial-gradient(circle at 30% 30%, ${itemDef.glowColor}40, ${itemDef.color}20)`,
            }}
        >
            <ItemIcon itemId={item.itemId} size={16} />
        </div>
    );
}
