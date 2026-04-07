'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import SkinCustomizer from '@/components/profile/SkinCustomizer';
import { loadTetris99ShowAllAttackTrails, saveTetris99ShowAllAttackTrails } from '@/lib/tetris99-settings';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const t = useTranslations('nav');
  const [showAllAttackTrails, setShowAllAttackTrails] = useState(() => loadTetris99ShowAllAttackTrails());

  function toggleAttackTrails() {
    const next = !showAllAttackTrails;
    setShowAllAttackTrails(next);
    saveTetris99ShowAllAttackTrails(next);
  }

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className={styles.title}>{t('settings')}</h1>
      </motion.div>

      <motion.div
        className={styles.settingsCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
      >
        <div className={styles.settingsCopy}>
          <span className={styles.eyebrow}>TETRIS 99</span>
          <h2 className={styles.cardTitle}>Attack Trail Visibility</h2>
          <p className={styles.cardBody}>
            Keep garbage-send effects limited to your own incoming and outgoing battles, or enable the all-lobby version to see every attack relationship.
          </p>
        </div>
        <button
          type="button"
          className={`${styles.toggleButton} ${showAllAttackTrails ? styles.toggleButtonOn : ''}`}
          onClick={toggleAttackTrails}
          aria-pressed={showAllAttackTrails}
        >
          <span className={styles.toggleLabel}>Show all battle trails</span>
          <span className={styles.toggleState}>{showAllAttackTrails ? 'On' : 'Off'}</span>
        </button>
      </motion.div>

      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
      >
        <SkinCustomizer inline />
      </motion.div>
    </div>
  );
}
