'use client';

import React, { useEffect, useState, useRef } from 'react';
import type { TreasureWallet } from '../types';
import { TREASURE_MAP } from '../constants';
import styles from '../VanillaGame.module.css';

interface TreasureHUDProps {
    wallet: TreasureWallet;
    /** ID of the last collected treasure (for flash animation) */
    lastCollectedId?: string | null;
}

/**
 * Compact gold/silver treasure display on the right sidebar.
 * Shows total gold earned, with a coin-collect flash on pickup.
 */
export function TreasureHUD({ wallet, lastCollectedId }: TreasureHUDProps) {
    const [showFlash, setShowFlash] = useState(false);
    const [flashTreasure, setFlashTreasure] = useState<string | null>(null);
    const prevGoldRef = useRef(wallet.gold);

    // Flash animation when gold increases
    useEffect(() => {
        if (wallet.gold > prevGoldRef.current) {
            setShowFlash(true);
            if (lastCollectedId) {
                setFlashTreasure(lastCollectedId);
            }
            const timer = setTimeout(() => {
                setShowFlash(false);
                setFlashTreasure(null);
            }, 600);
            prevGoldRef.current = wallet.gold;
            return () => clearTimeout(timer);
        }
        prevGoldRef.current = wallet.gold;
    }, [wallet.gold, lastCollectedId]);

    const flashItem = flashTreasure ? TREASURE_MAP[flashTreasure] : null;

    return (
        <div className={styles.treasureHUD}>
            {/* Gold display */}
            <div className={`${styles.treasureRow} ${styles.treasureGold}`}>
                <span className={styles.treasureIcon}>🪙</span>
                <span className={`${styles.treasureValue} ${showFlash ? styles.treasureFlash : ''}`}>
                    {wallet.gold.toLocaleString()}
                </span>
            </div>

            {/* Collected treasures count */}
            <div className={styles.treasureRow}>
                <span className={styles.treasureIcon}>💎</span>
                <span className={styles.treasureValueSmall}>
                    {wallet.totalTreasuresCollected}
                </span>
            </div>

            {/* Flash pickup indicator */}
            {showFlash && flashItem && (
                <div
                    className={styles.treasurePickup}
                    style={{ color: flashItem.color, textShadow: `0 0 8px ${flashItem.glowColor}` }}
                >
                    {flashItem.icon} +{flashItem.value}
                </div>
            )}
        </div>
    );
}
