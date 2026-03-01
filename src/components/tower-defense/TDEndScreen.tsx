'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Tower } from '@/types/tower-defense';
import styles from './TDEndScreen.module.css';

interface TDEndScreenProps {
  phase: 'won' | 'lost';
  score: number;
  currentWave: number;
  totalWaves: number;
  towers: Tower[];
  lives: number;
  maxLives: number;
  onRestart: () => void;
  onMenu: () => void;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`${styles.star} ${filled ? styles.starFilled : styles.starEmpty}`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// Individual stat card with count-up
function StatCard({ icon, value, label, delay }: { icon: string; value: number; label: string; delay: number }) {
  const elRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const duration = 1500;
    let start = 0;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * value);

      if (elRef.current) {
        elRef.current.textContent = current.toLocaleString();
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    // Delay start to sync with stagger animation
    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate);
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [value, delay]);

  return (
    <motion.div
      className={styles.statCard}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <span className={styles.statIcon}>{icon}</span>
      <span className={styles.statValue} ref={elRef}>0</span>
      <span className={styles.statLabel}>{label}</span>
    </motion.div>
  );
}

export default function TDEndScreen({
  phase,
  score,
  currentWave,
  totalWaves,
  towers,
  lives,
  maxLives,
  onRestart,
  onMenu,
}: TDEndScreenProps) {
  const isVictory = phase === 'won';
  const totalKills = towers.reduce((sum, t) => sum + t.kills, 0);
  const totalDamage = towers.reduce((sum, t) => sum + Math.round(t.totalDamage), 0);
  const estimatedGold = score * 10;

  // Star rating: only for victory
  let starCount = 0;
  if (isVictory) {
    const lifeRatio = lives / maxLives;
    if (lifeRatio >= 0.75) starCount = 3;
    else if (lifeRatio >= 0.4) starCount = 2;
    else starCount = 1;
  }

  const stats = [
    { icon: '\u2605', value: score, label: 'Score' },
    { icon: '\u223F', value: isVictory ? totalWaves : currentWave, label: 'Waves Cleared' },
    { icon: '\u25B2', value: towers.length, label: 'Towers Built' },
    { icon: '\u2020', value: totalKills, label: 'Total Kills' },
    { icon: '\u26A1', value: totalDamage, label: 'Total Damage' },
    { icon: '\u25C6', value: estimatedGold, label: 'Gold Earned' },
  ];

  return (
    <div className={`${styles.endOverlay} ${isVictory ? styles.endOverlayWon : styles.endOverlayLost}`}>
      {/* Star Rating */}
      {isVictory && (
        <div className={styles.stars}>
          {[1, 2, 3].map((n) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, scale: 0, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{
                duration: 0.45,
                delay: 0.2 + n * 0.2,
                type: 'spring',
                stiffness: 200,
                damping: 12,
              }}
            >
              <StarIcon filled={n <= starCount} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Title */}
      <motion.h1
        className={`${styles.endTitle} ${isVictory ? styles.endTitleWon : styles.endTitleLost}`}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 150, damping: 14 }}
      >
        {isVictory ? 'Victory' : 'Defeated'}
      </motion.h1>

      {/* Defeat subtitle */}
      {!isVictory && (
        <motion.p
          className={styles.endSubtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          Reached Wave {currentWave}/{totalWaves}
        </motion.p>
      )}

      {isVictory && <div style={{ marginBottom: 24 }} />}

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {stats.map((stat, i) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            delay={0.5 + i * 0.1}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <motion.button
          className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
          onClick={onRestart}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          Play Again
        </motion.button>
        <motion.button
          className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
          onClick={onMenu}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          Menu
        </motion.button>
      </div>
    </div>
  );
}
