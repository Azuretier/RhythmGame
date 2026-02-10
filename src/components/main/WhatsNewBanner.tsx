'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { getRecentUpdates } from '@/lib/updates';
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
  
  // Detect locale
  const locale = t('lobby.play') === 'PLAY' ? 'en' : 'ja';

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
    window.location.href = `/${locale === 'en' ? 'en/' : ''}updates`;
  };

  if (isDismissed) return null;

  const recentUpdates = getRecentUpdates(3);

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
                {locale === 'ja' ? '新しいアップデート！' : "What's New!"}
              </h3>
              <p className={styles.description}>
                {recentUpdates.length > 0 && recentUpdates[0].title}
              </p>
            </div>
            <div className={styles.actions}>
              <button onClick={handleViewUpdates} className={styles.viewBtn}>
                {locale === 'ja' ? '詳細を見る' : 'View Details'}
              </button>
              {dismissible && (
                <button onClick={handleDismiss} className={styles.dismissBtn}>
                  {locale === 'ja' ? '閉じる' : 'Dismiss'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
