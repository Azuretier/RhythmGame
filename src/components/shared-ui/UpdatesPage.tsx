'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PR_UPDATES, getLocalizedPRContent, type PRUpdate } from '@/lib/updates/changelog';
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

const GITHUB_OWNER = 'Azuretier';
const GITHUB_REPO = 'RhythmGame';
const MAX_GITHUB_PR_PAGES = 10;

type GitHubPullRequest = {
  number: number;
  title: string;
  merged_at: string | null;
};

function inferCategory(title: string): PRUpdate['category'] {
  const lower = title.toLowerCase();
  if (lower.includes('fix') || lower.includes('bug') || lower.includes('hotfix')) return 'fix';
  if (lower.includes('refactor') || lower.includes('chore') || lower.includes('cleanup')) return 'refactor';
  if (lower.includes('doc')) return 'docs';
  if (lower.includes('i18n') || lower.includes('translation') || lower.includes('locale')) return 'i18n';
  if (lower.includes('enhance') || lower.includes('improve') || lower.includes('optimiz') || lower.includes('upgrade')) return 'enhancement';
  return 'feature';
}

function getUpdateStatsFrom(updates: PRUpdate[]) {
  const merged = updates.filter((pr) => pr.merged);
  return {
    merged: merged.length,
    byCategory: {
      feature: merged.filter((pr) => pr.category === 'feature').length,
      enhancement: merged.filter((pr) => pr.category === 'enhancement').length,
      fix: merged.filter((pr) => pr.category === 'fix').length,
      refactor: merged.filter((pr) => pr.category === 'refactor').length,
      docs: merged.filter((pr) => pr.category === 'docs').length,
      i18n: merged.filter((pr) => pr.category === 'i18n').length,
    },
  };
}

async function fetchAllMergedPullRequests(): Promise<PRUpdate[]> {
  const merged: PRUpdate[] = [];
  for (let page = 1; page <= MAX_GITHUB_PR_PAGES; page += 1) {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls?state=closed&sort=created&direction=desc&per_page=100&page=${page}`
    );
    if (!response.ok) {
      console.warn(`Failed to fetch merged PR page ${page}: ${response.status} ${response.statusText}`);
      break;
    }

    const pulls = (await response.json()) as GitHubPullRequest[];
    if (!Array.isArray(pulls) || pulls.length === 0) break;

    const mergedPulls = pulls
      .filter((pr) => pr.merged_at)
      .map<PRUpdate>((pr) => ({
        number: pr.number,
        title: pr.title,
        titleJa: '',
        category: inferCategory(pr.title),
        date: new Date(pr.merged_at!).toISOString().slice(0, 10),
        merged: true,
        description: pr.title,
        descriptionJa: '',
      }));

    merged.push(...mergedPulls);
    if (pulls.length < 100) break;
  }

  return merged;
}



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
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [updates, setUpdates] = useState<PRUpdate[]>(PR_UPDATES);
  const dateLocale = Intl.getCanonicalLocales(locale)[0] ?? 'en-US';

  useEffect(() => {
    let active = true;

    fetchAllMergedPullRequests()
      .then((remoteUpdates) => {
        if (!active || remoteUpdates.length === 0) return;

        const combinedByNumber = new Map(PR_UPDATES.map((update) => [update.number, update]));
        for (const update of remoteUpdates) {
          if (!combinedByNumber.has(update.number)) {
            combinedByNumber.set(update.number, update);
          }
        }

        setUpdates(Array.from(combinedByNumber.values()).sort((a, b) => b.number - a.number));
      })
      .catch((error) => {
        console.warn('Failed to load merged PRs for updates page; using static fallback.', error);
        // Keep static fallback when network requests fail.
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = getUpdateStatsFrom(updates);

  const filteredUpdates = selectedCategory
    ? updates.filter((u) => u.merged && u.category === selectedCategory)
    : updates.filter((u) => u.merged);

  const sortedUpdates = [...filteredUpdates].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.number - a.number;
  });

  const dateGroups = groupByDate(sortedUpdates);

  // Get category labels from translations
  const getCategoryLabel = (category: string): string => {
    return t(`updates.categories.${category}`);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => router.push('/')}>
            ← {t('nav.lobby')}
          </button>
          <span className={styles.logo}>azuretier.net</span>
          <span className={styles.updatesLabel}>{t('nav.updates')}</span>
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
            {t('updates.pageTitle')}
          </h1>
          <p className={styles.heroSubtitle}>
            {t('updates.pageSubtitle')}
          </p>
          <div className={styles.statsRow}>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{stats.merged}</span>
              <span className={styles.statText}>{t('updates.merged')}</span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{stats.byCategory.feature}</span>
              <span className={styles.statText}>{t('updates.features')}</span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{stats.byCategory.enhancement}</span>
              <span className={styles.statText}>{t('updates.enhancements')}</span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{stats.byCategory.fix}</span>
              <span className={styles.statText}>{t('updates.fixes')}</span>
            </div>
          </div>
        </motion.div>

        {/* Featured Video — v0.0.2 */}
        <motion.div
          className={styles.videoSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h2 className={styles.videoHeading}>
            <span className={styles.versionBadge}>v0.0.2</span>
            {t('updates.videoTitle')}
          </h2>
          <div className={styles.videoWrapper}>
            <iframe
              src="https://www.youtube-nocookie.com/embed/bcwz2j6N_kA"
              title="azuretier.net v0.0.2 Update Overview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className={styles.videoIframe}
            />
          </div>
        </motion.div>

        {/* Category Filters */}
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${!selectedCategory ? styles.filterActive : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            {t('updates.all')}
          </button>
          {Object.entries(stats.byCategory).map(([cat, count]) => (
            count > 0 && (
              <button
                key={cat}
                className={`${styles.filterBtn} ${selectedCategory === cat ? styles.filterActive : ''}`}
                onClick={() => setSelectedCategory(cat)}
                style={{ '--filter-color': CATEGORY_COLORS[cat] } as React.CSSProperties}
              >
                {getCategoryLabel(cat)}
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
                    {new Date(date).toLocaleDateString(dateLocale, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span className={styles.dateCount}>
                    {updates.length} {updates.length === 1 ? t('updates.change') : t('updates.changes')}
                  </span>
                </div>

                <div className={styles.dateUpdates}>
                  {updates.map((update) => {
                    const localizedContent = getLocalizedPRContent(update, locale);

                    return (
                      <div key={update.number} className={styles.updateCard}>
                        <div className={styles.updateTop}>
                          <span
                            className={styles.categoryTag}
                            style={{ color: CATEGORY_COLORS[update.category], borderColor: CATEGORY_COLORS[update.category] }}
                          >
                            {getCategoryLabel(update.category)}
                          </span>
                          <span className={styles.prNum}>#{update.number}</span>
                        </div>
                        <h3 className={styles.updateTitle}>{localizedContent.title}</h3>
                        <p className={styles.updateDesc}>{localizedContent.description}</p>
                        {localizedContent.highlights && localizedContent.highlights.length > 0 && (
                          <ul className={styles.highlights}>
                            {localizedContent.highlights.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        )}
                        <a
                          href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/pull/${update.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.prLink}
                        >
                          {t('updates.viewPR')} &rarr;
                        </a>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer link */}
        <div className={styles.footerLink}>
          <a
            href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/pulls?q=is%3Apr+is%3Amerged`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewAllBtn}
          >
            {t('updates.viewAllPRsGithub')} &rarr;
          </a>
        </div>
      </main>
    </div>
  );
}
