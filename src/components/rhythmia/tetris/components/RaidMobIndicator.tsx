import React from 'react';
import styles from '../SideBoard.module.css';

interface RaidMobIndicatorProps {
    x: number;
    y: number;
    alive: boolean;
}

/**
 * Enemy indicator dot on the terrain minimap.
 * Renders a small red pulsing dot at the given position.
 */
export function RaidMobIndicator({ alive }: RaidMobIndicatorProps) {
    if (!alive) return null;
    return <div className={styles.minimapEnemy} />;
}
