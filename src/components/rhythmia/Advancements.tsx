'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { ADVANCEMENTS } from '@/lib/advancements/definitions';
import { loadAdvancementState } from '@/lib/advancements/storage';
import type { AdvancementState, AdvancementCategory } from '@/lib/advancements/types';
import { PixelIcon } from './PixelIcon';
import styles from './Advancements.module.css';

interface Props {
  onClose: () => void;
}

const CATEGORY_ORDER: AdvancementCategory[] = ['general', 'lines', 'score', 'tspin', 'combo', 'multiplayer', 'loyalty', 'treasure', 'elemental', 'equipment'];

const CATEGORY_LABELS: Record<string, Record<AdvancementCategory, string>> = {
  en: {
    general: 'General',
    lines: 'Lines',
    score: 'Score',
    tspin: 'T-Spin',
    combo: 'Combo',
    multiplayer: 'Multiplayer',
    loyalty: 'Loyalty',
    treasure: 'Treasure',
    elemental: 'Elemental',
    equipment: 'Equipment',
  },
  ja: {
    general: '全般',
    lines: 'ライン',
    score: 'スコア',
    tspin: 'Tスピン',
    combo: 'コンボ',
    multiplayer: 'マルチプレイ',
    loyalty: 'ロイヤルティ',
    treasure: '金銀財宝',
    elemental: 'エレメンタル',
    equipment: '装備',
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

  // Get locale from next-intl — must be called before any conditional return
  const locale = useLocale();

  // Build a Set of unlocked IDs for O(1) lookups instead of O(n) Array.includes
  const unlockedSet = useMemo(
    () => new Set(state?.unlockedIds ?? []),
    [state]
  );

  // Pre-group advancements by category so tabs never re-filter the full array
  const advancementsByCategory = useMemo(
    () =>
      ADVANCEMENTS.reduce<Record<string, typeof ADVANCEMENTS>>((acc, adv) => {
        (acc[adv.category] ??= []).push(adv);
        return acc;
      }, {}),
    []
  );

  if (!state) return null;

  const unlockedCount = state.unlockedIds.length;
  const totalCount = ADVANCEMENTS.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  const filteredAdvancements = advancementsByCategory[selectedCategory] ?? [];

  const categoryLabels = CATEGORY_LABELS[locale] || CATEGORY_LABELS.en;

  return (
    <div className={styles.panel}>
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
          const catAdvancements = advancementsByCategory[cat] ?? [];
          const catUnlocked = catAdvancements.filter(a => unlockedSet.has(a.id)).length;
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
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {filteredAdvancements.map(adv => {
              const unlocked = unlockedSet.has(adv.id);
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
                    <PixelIcon name={unlocked ? adv.icon : 'lock'} size={24} />
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
                  {unlocked && <div className={styles.advCheck}>★</div>}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Advancements;
