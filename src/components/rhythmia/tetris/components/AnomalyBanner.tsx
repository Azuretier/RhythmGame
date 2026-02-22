import React from 'react';
import styles from '../SideBoard.module.css';

interface AnomalyBannerProps {
    active: boolean;
}

/**
 * Alert banner displayed when terrain corruption reaches anomaly threshold.
 * Pulsing red/purple gradient overlay.
 */
export function AnomalyBanner({ active }: AnomalyBannerProps) {
    return (
        <div className={active ? styles.anomalyBannerActive : styles.anomalyBanner}>
            <div className={styles.anomalyAlert}>
                ANOMALY DETECTED
            </div>
        </div>
    );
}
