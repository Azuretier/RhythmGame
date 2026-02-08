'use client';

import React, { useEffect, useState, useRef } from 'react';
import styles from '../VanillaGame.module.css';
import { MAX_HEALTH } from '../constants';

interface HealthHUDProps {
  health: number;
}

/**
 * Vertical HP bar placed to the right of the game board.
 * Red vignette flashes when the tower takes damage.
 */
export function HealthManaHUD({ health }: HealthHUDProps) {
  const healthPct = Math.max(0, Math.min(100, (health / MAX_HEALTH) * 100));

  const isLow = healthPct < 30;

  // Damage vignette: flash when health decreases
  const [showVignette, setShowVignette] = useState(false);
  const prevHealthRef = useRef(health);

  useEffect(() => {
    if (health < prevHealthRef.current) {
      setShowVignette(true);
      const timer = setTimeout(() => setShowVignette(false), 400);
      return () => clearTimeout(timer);
    }
    prevHealthRef.current = health;
  }, [health]);

  return (
    <>
      {/* Red vignette overlay on damage */}
      {showVignette && <div className={styles.damageVignette} />}
      {/* Persistent low-health vignette */}
      {isLow && !showVignette && <div className={styles.lowHealthVignette} />}

      <div className={styles.verticalBars}>
        {/* HP Bar */}
        <div className={styles.vBar}>
          <div className={styles.vBarLabel}>HP</div>
          <div className={`${styles.vBarTrack} ${styles.vBarHpTrack}`}>
            <div
              className={`${styles.vBarFill} ${styles.vBarHpFill} ${isLow ? styles.vBarHpLow : ''}`}
              style={{ height: `${healthPct}%` }}
            />
            {/* Tick marks */}
            <div className={styles.vBarTicks}>
              <div className={styles.vBarTick} style={{ bottom: '25%' }} />
              <div className={styles.vBarTick} style={{ bottom: '50%' }} />
              <div className={styles.vBarTick} style={{ bottom: '75%' }} />
            </div>
          </div>
          <div className={styles.vBarValue}>{Math.ceil(health)}</div>
        </div>
      </div>
    </>
  );
}
