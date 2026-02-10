'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { PR_UPDATES, getRecentUpdates, getUpdatesByCategory, getUpdateStats, type PRUpdate } from '@/lib/updates/changelog';
import styles from './UpdatesPanel.module.css';

interface UpdatesPanelProps {
  maxItems?: number;
  showCategories?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  feature: '✨',
  enhancement: '⚡',
  fix: '🐛',
  refactor: '♻️',
  docs: '📝',
  i18n: '🌍',
};

const CATEGORY_COLORS: Record<string, string> = {
  feature: '#4ade80',
  enhancement: '#60a5fa',
  fix: '#f87171',
  refactor: '#a78bfa',
  docs: '#fbbf24',
  i18n: '#34d399',
};

export default function UpdatesPanel({ maxItems = 10, showCategories = true }: UpdatesPanelProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Detect locale
  const locale = t('lobby.play') === 'PLAY' ? 'en' : 'ja';

  const stats = getUpdateStats();
  const recentUpdates = getRecentUpdates(maxItems);
  const categorizedUpdates = getUpdatesByCategory();

  const displayUpdates = selectedCategory
    ? (categorizedUpdates.get(selectedCategory) || []).slice(0, maxItems)
    : recentUpdates;

  const categoryLabels = {
    feature: locale === 'ja' ? '新機能' : 'Features',
    enhancement: locale === 'ja' ? '改善' : 'Enhancements',
    fix: locale === 'ja' ? '修正' : 'Fixes',
    refactor: locale === 'ja' ? 'リファクタ' : 'Refactors',
    docs: locale === 'ja' ? 'ドキュメント' : 'Documentation',
    i18n: locale === 'ja' ? '国際化' : 'Internationalization',
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {locale === 'ja' ? '📋 最新アップデート' : '📋 Recent Updates'}
        </h2>
        <div className={styles.stats}>
          <span className={styles.statBadge}>
            {stats.merged} {locale === 'ja' ? '件のPR' : 'PRs merged'}
          </span>
        </div>
      </div>

      {showCategories && (
        <div className={styles.categories}>
          <button
            className={`${styles.categoryBtn} ${!selectedCategory ? styles.active : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            {locale === 'ja' ? 'すべて' : 'All'}
          </button>
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <button
              key={category}
              className={`${styles.categoryBtn} ${selectedCategory === category ? styles.active : ''}`}
              onClick={() => setSelectedCategory(category)}
              style={{
                '--category-color': CATEGORY_COLORS[category],
              } as React.CSSProperties}
            >
              <span className={styles.categoryIcon}>{CATEGORY_ICONS[category]}</span>
              <span className={styles.categoryLabel}>
                {categoryLabels[category as keyof typeof categoryLabels]}
              </span>
              <span className={styles.categoryCount}>{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.updatesList}>
        <AnimatePresence mode="popLayout">
          {displayUpdates.map((update) => (
            <motion.div
              key={update.number}
              className={styles.updateCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              layout
            >
              <div className={styles.updateHeader}>
                <span
                  className={styles.categoryBadge}
                  style={{
                    backgroundColor: CATEGORY_COLORS[update.category],
                  }}
                >
                  {CATEGORY_ICONS[update.category]} {categoryLabels[update.category as keyof typeof categoryLabels]}
                </span>
                <span className={styles.prNumber}>#{update.number}</span>
              </div>
              
              <h3 className={styles.updateTitle}>{update.title}</h3>
              
              <p className={styles.updateDescription}>{update.description}</p>

              {update.highlights && update.highlights.length > 0 && (
                <ul className={styles.highlights}>
                  {update.highlights.map((highlight, idx) => (
                    <li key={idx} className={styles.highlightItem}>
                      {highlight}
                    </li>
                  ))}
                </ul>
              )}

              <div className={styles.updateFooter}>
                <span className={styles.updateDate}>
                  {new Date(update.date).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <a
                  href={`https://github.com/Azuretier/azuretier.net/pull/${update.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.prLink}
                >
                  {locale === 'ja' ? 'PRを見る' : 'View PR'} →
                </a>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {displayUpdates.length >= maxItems && (
        <div className={styles.footer}>
          <a
            href="https://github.com/Azuretier/azuretier.net/pulls?q=is%3Apr+is%3Amerged"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewAllBtn}
          >
            {locale === 'ja' ? 'すべてのPRを見る' : 'View all PRs'} →
          </a>
        </div>
      )}
    </div>
  );
}
