'use client';

import React from 'react';
import styles from '../VanillaGame.module.css';
import type { PreStageUpgrade } from '../types';

interface PreStageScreenProps {
  cycleCount: number;
  currentMaxHP: number;
  currentMaxMana: number;
  hpBonus: number;
  manaBonus: number;
  onChoose: (choice: PreStageUpgrade) => void;
}

/**
 * Pre-stage upgrade screen shown after clearing all 5 worlds in Mix Mode.
 * Allows the player to choose between increasing max HP or max Mana
 * before starting the next cycle with increased difficulty.
 */
export function PreStageScreen({
  cycleCount,
  currentMaxHP,
  currentMaxMana,
  hpBonus,
  manaBonus,
  onChoose,
}: PreStageScreenProps) {
  return (
    <div className={styles.preStageOverlay}>
      <div className={styles.preStagePanel}>
        <div className={styles.preStageClear}>ALL WORLDS CLEARED</div>
        <div className={styles.preStageCycle}>CYCLE {cycleCount + 1} COMPLETE</div>
        <div className={styles.preStagePrompt}>Choose an upgrade before the next cycle</div>

        <div className={styles.preStageChoices}>
          <button
            className={`${styles.preStageBtn} ${styles.preStageBtnHp}`}
            onClick={() => onChoose('hp')}
          >
            <span className={styles.preStageBtnIcon}>❤️</span>
            <span className={styles.preStageBtnTitle}>MAX HP +{hpBonus}</span>
            <span className={styles.preStageBtnCurrent}>
              {currentMaxHP} → {currentMaxHP + hpBonus}
            </span>
            <span className={styles.preStageBtnDesc}>最大HPを増加</span>
          </button>

          <button
            className={`${styles.preStageBtn} ${styles.preStageBtnMana}`}
            onClick={() => onChoose('mana')}
          >
            <span className={styles.preStageBtnIcon}>💎</span>
            <span className={styles.preStageBtnTitle}>MAX MANA +{manaBonus}</span>
            <span className={styles.preStageBtnCurrent}>
              {currentMaxMana} → {currentMaxMana + manaBonus}
            </span>
            <span className={styles.preStageBtnDesc}>最大マナを増加</span>
          </button>
        </div>

        <div className={styles.preStageWarning}>
          Next cycle enemies are stronger
        </div>
      </div>
    </div>
  );
}
