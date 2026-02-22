import React from 'react';
import type { SideBoardRaidMob } from '../types';
import styles from '../SideBoard.module.css';

interface RaidMobIndicatorProps {
    mob: SideBoardRaidMob;
}

/**
 * Renders a raid mob indicator within a side board tile.
 * Shows a magenta pulsing circle with a health bar.
 */
export function RaidMobIndicator({ mob }: RaidMobIndicatorProps) {
    if (!mob.alive) return null;

    const walkClass = mob.side === 'left' ? styles.raidMobWalkLeft : styles.raidMobWalkRight;
    const healthPct = (mob.health / mob.maxHealth) * 100;

    return (
        <div className={styles.raidMob}>
            <div className={`${styles.raidMobBody} ${walkClass}`} />
            <div className={styles.raidMobHealthBar}>
                <div
                    className={styles.raidMobHealthFill}
                    style={{ width: `${healthPct}%` }}
                />
            </div>
        </div>
    );
}
