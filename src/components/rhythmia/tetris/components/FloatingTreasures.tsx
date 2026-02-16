import React from 'react';
import type { FloatingTreasure } from '../types';
import { TREASURE_MAP } from '../constants';
import styles from '../VanillaGame.module.css';

interface FloatingTreasuresProps {
    treasures: FloatingTreasure[];
}

/**
 * Renders floating treasure pickups (coins, gems, chests) that rise
 * from terrain destruction and arc upward with a sparkle effect.
 */
export function FloatingTreasures({ treasures }: FloatingTreasuresProps) {
    return (
        <div className={styles.floatingItemsContainer}>
            {treasures.map(t => (
                <FloatingTreasureEl key={t.id} treasure={t} />
            ))}
        </div>
    );
}

function FloatingTreasureEl({ treasure }: { treasure: FloatingTreasure }) {
    const def = TREASURE_MAP[treasure.treasureId];
    if (!def) return null;

    const now = Date.now();
    const elapsed = now - treasure.startTime;
    const progress = Math.min(1, Math.max(0, elapsed / treasure.duration));

    // Ease-in-out cubic
    const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    // Arc path rising upward
    const startX = treasure.x;
    const startY = treasure.y;
    const midY = Math.min(startY, treasure.targetY) - 80;

    const t = eased;
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ((startX + treasure.targetX) / 2) + t * t * treasure.targetX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * treasure.targetY;

    const scale = treasure.collected ? 0 : 0.7 + Math.sin(progress * Math.PI) * 0.5;
    const opacity = treasure.collected ? 0 : Math.min(1, progress * 4) * (1 - Math.max(0, (progress - 0.6) / 0.4));

    return (
        <div
            className={styles.floatingTreasure}
            style={{
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                opacity,
                filter: `drop-shadow(0 0 8px ${def.glowColor})`,
            }}
        >
            {def.icon}
        </div>
    );
}
