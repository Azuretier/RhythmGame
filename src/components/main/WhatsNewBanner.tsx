'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { getRecentUpdates, getLocalizedPRContent } from '@/lib/updates';
import styles from './WhatsNewBanner.module.css';

interface WhatsNewBannerProps {
  autoShow?: boolean;
  dismissible?: boolean;
}

const DISMISSED_KEY = 'rhythmia_updates_dismissed';
const LAST_SEEN_VERSION = 'rhythmia_last_seen_update';

export default function WhatsNewBanner({ autoShow = true, dismissible = true }: WhatsNewBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const t = useTranslations();
  const locale = useLocale();

  useEffect(() => {
    if (!autoShow) return;

    // Check if user has already dismissed or seen the latest update
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const lastSeenUpdate = localStorage.getItem(LAST_SEEN_VERSION);
    const latestUpdate = getRecentUpdates(1)[0];

    if (latestUpdate && (!lastSeenUpdate || parseInt(lastSeenUpdate) < latestUpdate.number)) {
      if (!dismissed || dismissed !== latestUpdate.number.toString()) {
        setIsDismissed(false);
        setIsVisible(true);
      }
    }
  }, [autoShow]);

  const handleDismiss = () => {
    const latestUpdate = getRecentUpdates(1)[0];
    if (latestUpdate) {
      localStorage.setItem(DISMISSED_KEY, latestUpdate.number.toString());
      localStorage.setItem(LAST_SEEN_VERSION, latestUpdate.number.toString());
    }
    setIsVisible(false);
    setTimeout(() => setIsDismissed(true), 300);
  };

  const handleViewUpdates = () => {
    const latestUpdate = getRecentUpdates(1)[0];
    if (latestUpdate) {
      localStorage.setItem(LAST_SEEN_VERSION, latestUpdate.number.toString());
    }
    window.location.href = `/${locale === 'ja' ? '' : `${locale}/`}updates`;
  };

  if (isDismissed) return null;

  const recentUpdates = getRecentUpdates(3);
  const latestLocalized = recentUpdates[0] ? getLocalizedPRContent(recentUpdates[0], locale) : null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles.banner}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.content}>
            <div className={styles.icon}>✨</div>
            <div className={styles.text}>
              <h3 className={styles.title}>
                {t('updates.whatsNewTitle')}
              </h3>
              {latestLocalized?.title && (
                <p className={styles.description}>
                  {latestLocalized.title}
                </p>
              )}
            </div>
            <div className={styles.actions}>
              <button onClick={handleViewUpdates} className={styles.viewBtn}>
                {t('updates.viewDetails')}
              </button>
              {dismissible && (
                <button onClick={handleDismiss} className={styles.dismissBtn}>
                  {t('updates.dismiss')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
