'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ADVANCEMENTS } from '@/lib/advancements/definitions';
import { loadAdvancementState } from '@/lib/advancements/storage';
import type { AdvancementState, AdvancementCategory } from '@/lib/advancements/types';
import styles from './Advancements.module.css';

interface Props {
  onClose: () => void;
}

const CATEGORY_ORDER: AdvancementCategory[] = ['general', 'lines', 'score', 'tspin', 'combo', 'multiplayer'];

const CATEGORY_LABELS: Record<string, Record<AdvancementCategory, string>> = {
  en: {
    general: 'General',
    lines: 'Lines',
    score: 'Score',
    tspin: 'T-Spin',
    combo: 'Combo',
    multiplayer: 'Multiplayer',
  },
  ja: {
    general: '全般',
    lines: 'ライン',
    score: 'スコア',
    tspin: 'Tスピン',
    combo: 'コンボ',
    multiplayer: 'マルチプレイ',
  },
};

function formatNumber(n: number): string {
  if (n >= 10000000) return `${(n / 1000000).toFixed(0)}M`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export const Advancements: React.FC<Props> = ({ onClose }) => {
  const [state, setState] = useState<AdvancementState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AdvancementCategory>('general');
  const t = useTranslations();

  useEffect(() => {
    setState(loadAdvancementState());
  }, []);

  if (!state) return null;

  const unlockedCount = state.unlockedIds.length;
  const totalCount = ADVANCEMENTS.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  const filteredAdvancements = ADVANCEMENTS.filter(a => a.category === selectedCategory);

  // Detect locale from translations
  const locale = t('lobby.play') === 'PLAY' ? 'en' : 'ja';
  const categoryLabels = CATEGORY_LABELS[locale] || CATEGORY_LABELS.en;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className={styles.panel}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{t('advancements.title')}</h2>
            <div className={styles.progressLabel}>
              {unlockedCount} / {totalCount} ({progressPercent}%)
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            {t('lobby.back')}
          </button>
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Category tabs */}
        <div className={styles.tabs}>
          {CATEGORY_ORDER.map(cat => {
            const catAdvancements = ADVANCEMENTS.filter(a => a.category === cat);
            const catUnlocked = catAdvancements.filter(a => state.unlockedIds.includes(a.id)).length;
            return (
              <button
                key={cat}
                className={`${styles.tab} ${selectedCategory === cat ? styles.activeTab : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <span className={styles.tabLabel}>{categoryLabels[cat]}</span>
                <span className={styles.tabCount}>{catUnlocked}/{catAdvancements.length}</span>
              </button>
            );
          })}
        </div>

        {/* Advancement list */}
        <div className={styles.list}>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {filteredAdvancements.map(adv => {
                const unlocked = state.unlockedIds.includes(adv.id);
                const currentValue = state.stats[adv.statKey];
                const progress = Math.min(1, currentValue / adv.threshold);
                const displayName = t(`advancements.${adv.id}.name`);
                const displayDesc = t(`advancements.${adv.id}.desc`);

                return (
                  <div
                    key={adv.id}
                    className={`${styles.advItem} ${unlocked ? styles.unlocked : styles.locked}`}
                  >
                    <div className={styles.advIcon}>
                      {unlocked ? adv.icon : '🔒'}
                    </div>
                    <div className={styles.advInfo}>
                      <div className={styles.advName}>{displayName}</div>
                      <div className={styles.advDesc}>{displayDesc}</div>
                      <div className={styles.advProgressBar}>
                        <div
                          className={styles.advProgressFill}
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <div className={styles.advProgressText}>
                        {formatNumber(currentValue)} / {formatNumber(adv.threshold)}
                      </div>
                    </div>
                    {unlocked && <div className={styles.advCheck}>✓</div>}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Advancements;
