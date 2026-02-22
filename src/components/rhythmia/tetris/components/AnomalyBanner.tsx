import React from 'react';
import type { SideBoardSide } from '../types';
import styles from '../SideBoard.module.css';

interface AnomalyBannerProps {
    active: boolean;
    side: SideBoardSide | null;
}

/**
 * Alert banner displayed when an anomaly is active.
 * Pulsing red/purple gradient with the affected side indicated.
 */
export function AnomalyBanner({ active, side }: AnomalyBannerProps) {
    return (
        <div className={active ? styles.anomalyBannerActive : styles.anomalyBanner}>
            <div className={styles.anomalyAlert}>
                ANOMALY — {side ?? 'unknown'} board
            </div>
        </div>
    );
}
