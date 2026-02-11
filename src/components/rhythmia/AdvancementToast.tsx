'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  const prevLengthRef = useRef(unlockedIds.length);
  const t = useTranslations();

  // Stable ref so the timer never resets due to parent re-renders
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Reset currentIndex when transitioning from empty to non-empty array
  // or if currentIndex becomes out of bounds
  useEffect(() => {
    if (unlockedIds.length === 0) {
      prevLengthRef.current = 0;
      return;
    }

    // If we went from empty (0) to non-empty, reset currentIndex
    if (prevLengthRef.current === 0 && unlockedIds.length > 0) {
      setCurrentIndex(0);
    }
    // If currentIndex is out of bounds, reset
    else if (currentIndex >= unlockedIds.length) {
      setCurrentIndex(0);
    }

    prevLengthRef.current = unlockedIds.length;
  }, [unlockedIds.length, currentIndex]);

  useEffect(() => {
    if (unlockedIds.length === 0) return;

    const timer = setTimeout(() => {
      if (currentIndex < unlockedIds.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onDismissRef.current();
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentIndex, unlockedIds.length]);

  if (unlockedIds.length === 0) return null;

  const id = unlockedIds[currentIndex];
  const adv = ADVANCEMENTS.find(a => a.id === id);
  if (!adv) return null;

  const name = t(`advancements.${adv.id}.name`);
  const desc = t(`advancements.${adv.id}.desc`);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        className={styles.toast}
        initial={{ opacity: 0, y: -60, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.9 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          mass: 0.8,
        }}
      >
        <div className={styles.toastIconFrame}>
          <div className={styles.toastIcon}>{adv.icon}</div>
        </div>
        <div className={styles.toastContent}>
          <div className={styles.toastLabel}>{t('advancements.unlocked')}</div>
          <div className={styles.toastName}>{name}</div>
          <div className={styles.toastDesc}>{desc}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdvancementToast;
