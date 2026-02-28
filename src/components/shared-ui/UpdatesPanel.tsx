'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { PR_UPDATES, getRecentUpdates, getUpdatesByCategory, getUpdateStats, getLocalizedPRContent, type PRUpdate } from '@/lib/updates/changelog';
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
  const locale = useLocale();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const stats = getUpdateStats();
  const recentUpdates = getRecentUpdates(maxItems);
  const categorizedUpdates = getUpdatesByCategory();

  const displayUpdates = selectedCategory
    ? (categorizedUpdates.get(selectedCategory) || []).slice(0, maxItems)
    : recentUpdates;

  // Get category labels from translations
  const getCategoryLabel = (category: string): string => {
    return t(`updates.categories.${category}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          📋 {t('updates.title')}
        </h2>
        <div className={styles.stats}>
          <span className={styles.statBadge}>
            {stats.merged} {t('updates.prsMerged')}
          </span>
        </div>
      </div>

      {showCategories && (
        <div className={styles.categories}>
          <button
            className={`${styles.categoryBtn} ${!selectedCategory ? styles.active : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            {t('updates.all')}
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
                {getCategoryLabel(category)}
              </span>
              <span className={styles.categoryCount}>{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.updatesList}>
        <AnimatePresence mode="popLayout">
          {displayUpdates.map((update) => {
            const localizedContent = getLocalizedPRContent(update, locale);
            
            return (
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
                    {CATEGORY_ICONS[update.category]} {getCategoryLabel(update.category)}
                  </span>
                  <span className={styles.prNumber}>#{update.number}</span>
                </div>
                
                <h3 className={styles.updateTitle}>{localizedContent.title}</h3>
                
                <p className={styles.updateDescription}>{localizedContent.description}</p>

                {localizedContent.highlights && localizedContent.highlights.length > 0 && (
                  <ul className={styles.highlights}>
                    {localizedContent.highlights.map((highlight, idx) => (
                      <li key={idx} className={styles.highlightItem}>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                )}

                <div className={styles.updateFooter}>
                  <span className={styles.updateDate}>
                    {new Date(update.date).toLocaleDateString({ ja: 'ja-JP', en: 'en-US', th: 'th-TH', es: 'es-ES', fr: 'fr-FR' }[locale] || 'en-US', {
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
                    {t('updates.viewPR')} →
                  </a>
                </div>
              </motion.div>
            );
          })}
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
            {t('updates.viewAllPRs')} →
          </a>
        </div>
      )}
    </div>
  );
}
