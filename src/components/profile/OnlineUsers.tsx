'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { getIconById } from '@/lib/profile/types';
import type { OnlineUser } from '@/types/multiplayer';
import styles from './OnlineUsers.module.css';

interface OnlineUsersProps {
  users: OnlineUser[];
  onClose: () => void;
}

export default function OnlineUsers({ users, onClose }: OnlineUsersProps) {
  const t = useTranslations('profile');

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.panel}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <div className={styles.headerTitle}>{t('onlineTitle')}</div>
            <div className={styles.headerCount}>
              {t('onlineCount', { count: users.length })}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className={styles.list}>
          {users.length === 0 ? (
            <div className={styles.emptyState}>{t('noOnlineUsers')}</div>
          ) : (
            users.map((user, i) => {
              const iconData = getIconById(user.icon);
              return (
                <div key={`${user.name}-${i}`} className={styles.userRow}>
                  <div
                    className={styles.userIcon}
                    style={{
                      backgroundColor: iconData?.bgColor || '#444',
                      color: iconData?.color || '#fff',
                    }}
                  >
                    {iconData?.emoji || '?'}
                  </div>
                  <span className={styles.userName}>{user.name}</span>
                  <div className={styles.onlineDot} />
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
