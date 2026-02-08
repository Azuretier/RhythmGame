'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useNotifications } from '@/lib/notifications';
import { ADVANCEMENTS } from '@/lib/advancements/definitions';
import styles from './NotificationCenter.module.css';

function formatRelativeTime(timestamp: number, locale: string): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (locale === 'ja') {
    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return 'たった今';
  }

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export default function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    isOpen,
    isLoading,
    toggleOpen,
    close,
    markRead,
    markAllRead,
  } = useNotifications();
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect locale from translations
  const locale = t('lobby.play') === 'PLAY' ? 'en' : 'ja';

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.bellButton}
        onClick={toggleOpen}
        aria-label={locale === 'ja' ? '通知' : 'Notifications'}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className={styles.backdrop} onClick={close} />
            <motion.div
              className={styles.dropdown}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownTitle}>
                  {locale === 'ja' ? '進捗通知' : 'Advancements'}
                </span>
                {unreadCount > 0 && (
                  <button className={styles.markAllBtn} onClick={markAllRead}>
                    {locale === 'ja' ? 'すべて既読' : 'Mark all read'}
                  </button>
                )}
              </div>

              <div className={styles.notifList}>
                {isLoading ? (
                  <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.3"
                      >
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>
                    <span className={styles.emptyText}>
                      {locale === 'ja'
                        ? 'まだ通知はありません'
                        : 'No notifications yet'}
                    </span>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const adv = ADVANCEMENTS.find(
                      (a) => a.id === notif.advancementId
                    );
                    if (!adv) return null;

                    let name: string;
                    try {
                      name = t(`advancements.${adv.id}.name`);
                    } catch {
                      name = adv.id;
                    }

                    return (
                      <button
                        key={notif.id}
                        className={
                          notif.read
                            ? styles.notifItemRead
                            : styles.notifItemUnread
                        }
                        onClick={() => {
                          if (!notif.read) markRead(notif.id);
                        }}
                      >
                        <div className={styles.notifIcon}>{adv.icon}</div>
                        <div className={styles.notifContent}>
                          <div className={styles.notifLabel}>
                            {locale === 'ja' ? '実績解除' : 'Unlocked'}
                          </div>
                          <div className={styles.notifName}>{name}</div>
                        </div>
                        <span className={styles.notifTime}>
                          {formatRelativeTime(notif.timestamp, locale)}
                        </span>
                        {!notif.read && <div className={styles.unreadDot} />}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
