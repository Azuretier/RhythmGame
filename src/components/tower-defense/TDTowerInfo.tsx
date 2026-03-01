'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Tower } from '@/types/tower-defense';
import { TOWER_DEFS } from '@/types/tower-defense';
import { TowerIcon } from './td-icons';
import styles from './TDTowerInfo.module.css';

interface TDTowerInfoProps {
  tower: Tower;
  gold: number;
  onUpgrade: () => void;
  onSell: () => void;
  onDeselect: () => void;
}

export default function TDTowerInfo({ tower, gold, onUpgrade, onSell, onDeselect }: TDTowerInfoProps) {
  const def = TOWER_DEFS[tower.type];
  const levelIndex = tower.level - 1;
  const isMaxLevel = tower.level >= def.maxLevel;
  const upgradeCost = !isMaxLevel ? def.upgradeCosts[tower.level - 1] : 0;
  const canUpgrade = !isMaxLevel && gold >= upgradeCost;

  const currentDamage = def.damagePerLevel[levelIndex];
  const currentRange = def.rangePerLevel[levelIndex];
  const nextDamage = !isMaxLevel ? def.damagePerLevel[tower.level] : 0;
  const nextRange = !isMaxLevel ? def.rangePerLevel[tower.level] : 0;

  const sellValue = useMemo(() => {
    let invested = def.cost;
    for (let i = 0; i < tower.level - 1; i++) {
      invested += def.upgradeCosts[i];
    }
    return Math.floor(invested * 0.7);
  }, [def, tower.level]);

  return (
    <motion.div
      className={styles.panel}
      style={{ borderLeftColor: def.color }}
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 30, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className={styles.header}>
        <TowerIcon type={tower.type} size={38} />
        <div className={styles.headerInfo}>
          <span className={styles.towerName}>{def.name}</span>
          <span className={styles.levelBadge} style={{ color: def.color, borderColor: `${def.color}40` }}>
            Lv. {tower.level}
          </span>
        </div>
        <button className={styles.closeBtn} onClick={onDeselect} aria-label="Close tower info">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className={styles.statsSection}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Damage</span>
          <span className={styles.statValue}>
            {currentDamage}
            {!isMaxLevel && (
              <span className={styles.upgradePreview}>+{nextDamage - currentDamage}</span>
            )}
          </span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Range</span>
          <span className={styles.statValue}>
            {currentRange}
            {!isMaxLevel && (
              <span className={styles.upgradePreview}>+{(nextRange - currentRange).toFixed(1)}</span>
            )}
          </span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Fire Rate</span>
          <span className={styles.statValue}>{def.fireRate}/s</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.statRow}>
          <span className={styles.statLabel}>Kills</span>
          <span className={styles.statValue}>{tower.kills}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Total Damage</span>
          <span className={styles.statValue}>{tower.totalDamage.toLocaleString()}</span>
        </div>
      </div>

      {def.special && (
        <div className={styles.specialBox}>{def.special}</div>
      )}

      <div className={styles.actions}>
        {isMaxLevel ? (
          <div className={styles.maxLevelBadge}>Max Level</div>
        ) : (
          <button
            className={canUpgrade ? styles.upgradeBtn : styles.upgradeBtnDisabled}
            onClick={canUpgrade ? onUpgrade : undefined}
            disabled={!canUpgrade}
          >
            Upgrade ({upgradeCost}g)
          </button>
        )}
        <button className={styles.sellBtn} onClick={onSell}>
          Sell ({sellValue}g)
        </button>
      </div>
    </motion.div>
  );
}
