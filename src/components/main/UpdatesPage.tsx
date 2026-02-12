'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PR_UPDATES, getUpdateStats, type PRUpdate } from '@/lib/updates/changelog';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import styles from './UpdatesPage.module.css';

const CATEGORY_COLORS: Record<string, string> = {
  feature: '#4ade80',
  enhancement: '#60a5fa',
  fix: '#f87171',
  refactor: '#a78bfa',
  docs: '#fbbf24',
  i18n: '#34d399',
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  feature: 'Feature',
  enhancement: 'Enhancement',
  fix: 'Fix',
  refactor: 'Refactor',
  docs: 'Docs',
  i18n: 'i18n',
};

const CATEGORY_LABELS_JA: Record<string, string> = {
  feature: '新機能',
  enhancement: '改善',
  fix: '修正',
  refactor: 'リファクタ',
  docs: 'ドキュメント',
  i18n: '国際化',
};

// Group updates by date
function groupByDate(updates: PRUpdate[]): Map<string, PRUpdate[]> {
  const grouped = new Map<string, PRUpdate[]>();
  for (const u of updates) {
    if (!grouped.has(u.date)) {
      grouped.set(u.date, []);
    }
    grouped.get(u.date)!.push(u);
  }
  return grouped;
}

export default function UpdatesPage() {
  const locale = useLocale();
  const router = useRouter();
  const ja = locale === 'ja';
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const stats = getUpdateStats();

  const filteredUpdates = selectedCategory
    ? PR_UPDATES.filter((u) => u.merged && u.category === selectedCategory)
    : PR_UPDATES.filter((u) => u.merged);

  const sortedUpdates = [...filteredUpdates].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.number - a.number;
  });

  const dateGroups = groupByDate(sortedUpdates);
  const categoryLabels = ja ? CATEGORY_LABELS_JA : CATEGORY_LABELS_EN;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => router.push('/')}>
            {ja ? '← ロビー' : '← Lobby'}
          </button>
          <span className={styles.logo}>azuretier.net</span>
          <span className={styles.updatesLabel}>{ja ? 'アップデート' : 'UPDATES'}</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.navLink} onClick={() => router.push('/wiki')}>
            Wiki
          </button>
          <LocaleSwitcher />
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero */}
        <motion.div
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className={styles.heroTitle}>
            {ja ? '開発アップデート' : 'Development Updates'}
          </h1>
          <p className={styles.heroSubtitle}>
            {ja
              ? 'RHYTHMIAの最新の変更と改善をご覧ください'
              : 'Follow the latest changes and improvements to RHYTHMIA'}
          </p>
          <div className={styles.statsRow}>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{stats.merged}</span>
              <span className={styles.statText}>{ja ? 'マージ済' : 'Merged'}</span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{stats.byCategory.feature}</span>
              <span className={styles.statText}>{ja ? '新機能' : 'Features'}</span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{stats.byCategory.enhancement}</span>
              <span className={styles.statText}>{ja ? '改善' : 'Enhancements'}</span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{stats.byCategory.fix}</span>
              <span className={styles.statText}>{ja ? '修正' : 'Fixes'}</span>
            </div>
          </div>
        </motion.div>

        {/* Category Filters */}
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${!selectedCategory ? styles.filterActive : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            {ja ? 'すべて' : 'All'}
          </button>
          {Object.entries(stats.byCategory).map(([cat, count]) => (
            count > 0 && (
              <button
                key={cat}
                className={`${styles.filterBtn} ${selectedCategory === cat ? styles.filterActive : ''}`}
                onClick={() => setSelectedCategory(cat)}
                style={{ '--filter-color': CATEGORY_COLORS[cat] } as React.CSSProperties}
              >
                {categoryLabels[cat]}
                <span className={styles.filterCount}>{count}</span>
              </button>
            )
          ))}
        </div>

        {/* Timeline */}
        <div className={styles.timeline}>
          <AnimatePresence mode="popLayout">
            {Array.from(dateGroups.entries()).map(([date, updates]) => (
              <motion.div
                key={date}
                className={styles.dateGroup}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                layout
              >
                <div className={styles.dateHeader}>
                  <div className={styles.dateDot} />
                  <span className={styles.dateText}>
                    {new Date(date).toLocaleDateString(ja ? 'ja-JP' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span className={styles.dateCount}>
                    {updates.length} {ja ? '件' : updates.length === 1 ? 'change' : 'changes'}
                  </span>
                </div>

                <div className={styles.dateUpdates}>
                  {updates.map((update) => (
                    <div key={update.number} className={styles.updateCard}>
                      <div className={styles.updateTop}>
                        <span
                          className={styles.categoryTag}
                          style={{ color: CATEGORY_COLORS[update.category], borderColor: CATEGORY_COLORS[update.category] }}
                        >
                          {categoryLabels[update.category]}
                        </span>
                        <span className={styles.prNum}>#{update.number}</span>
                      </div>
                      <h3 className={styles.updateTitle}>{update.title}</h3>
                      <p className={styles.updateDesc}>{update.description}</p>
                      {update.highlights && update.highlights.length > 0 && (
                        <ul className={styles.highlights}>
                          {update.highlights.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      )}
                      <a
                        href={`https://github.com/Azuretier/azuretier.net/pull/${update.number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.prLink}
                      >
                        {ja ? 'PRを見る' : 'View PR'} &rarr;
                      </a>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer link */}
        <div className={styles.footerLink}>
          <a
            href="https://github.com/Azuretier/azuretier.net/pulls?q=is%3Apr+is%3Amerged"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewAllBtn}
          >
            {ja ? 'GitHubですべてのPRを見る' : 'View all PRs on GitHub'} &rarr;
          </a>
        </div>
      </main>
    </div>
  );
}
