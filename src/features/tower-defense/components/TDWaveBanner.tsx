'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ENEMY_DEFS, type WaveGroup, type EnemyType } from '@/types/tower-defense';
import styles from './TDWaveBanner.module.css';

interface TDWaveBannerProps {
  waveNumber: number;
  totalWaves: number;
  groups: WaveGroup[];
  isBossWave: boolean;
  onDismiss: () => void;
}

export default function TDWaveBanner({
  waveNumber,
  totalWaves,
  groups,
  isBossWave,
  onDismiss,
}: TDWaveBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onDismiss]);

  // Aggregate groups by enemy type
  const enemyCounts = new Map<EnemyType, number>();
  for (const group of groups) {
    const existing = enemyCounts.get(group.enemyType) || 0;
    enemyCounts.set(group.enemyType, existing + group.count);
  }

  return (
    <motion.div
      className={`${styles.banner} ${isBossWave ? styles.bannerBoss : ''}`}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <div className={styles.waveInfo}>
        <span className={`${styles.waveLabel} ${isBossWave ? styles.waveLabelBoss : ''}`}>
          {isBossWave ? 'BOSS WAVE' : 'WAVE'}
        </span>
        <span className={styles.waveNumber}>
          {waveNumber}
          <span className={styles.waveTotal}>/{totalWaves}</span>
        </span>
      </div>

      <div className={styles.divider} />

      <div className={styles.enemyPreview}>
        {Array.from(enemyCounts.entries()).map(([enemyType, count]) => {
          const def = ENEMY_DEFS[enemyType];
          return (
            <div key={enemyType} className={styles.enemyItem}>
              <div
                className={styles.enemyDot}
                style={{ backgroundColor: def.color }}
                title={def.name}
              />
              <span className={styles.enemyCount}>{count}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} />
      </div>
    </motion.div>
  );
}
