'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ADVANCEMENTS } from '@/lib/advancements/definitions';
import styles from './AdvancementToast.module.css';

interface Props {
  unlockedIds: string[];
  onDismiss: () => void;
}

export const AdvancementToast: React.FC<Props> = ({ unlockedIds, onDismiss }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const t = useTranslations();

  useEffect(() => {
    if (unlockedIds.length === 0) return;

    const timer = setTimeout(() => {
      if (currentIndex < unlockedIds.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onDismiss();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentIndex, unlockedIds.length, onDismiss]);

  if (unlockedIds.length === 0) return null;

  const id = unlockedIds[currentIndex];
  const adv = ADVANCEMENTS.find(a => a.id === id);
  if (!adv) return null;

  const name = t(`advancements.${adv.id}.name`);

  return (
    <AnimatePresence>
      <motion.div
        key={id}
        className={styles.toast}
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className={styles.toastIcon}>{adv.icon}</div>
        <div className={styles.toastContent}>
          <div className={styles.toastLabel}>{t('advancements.unlocked')}</div>
          <div className={styles.toastName}>{name}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdvancementToast;
