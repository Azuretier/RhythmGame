'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import styles from './TDControlsHint.module.css';

const AUTO_HIDE_DELAY = 10000; // 10 seconds

export default function TDControlsHint() {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_DELAY);
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleMouseLeave = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  return (
    <motion.div
      className={styles.controlsWrap}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <div className={styles.controlRow}>
        <span className={styles.keyPill}>1-7</span>
        <span className={styles.keyAction}>Select Tower</span>
        <span className={styles.keyPill}>Space</span>
        <span className={styles.keyAction}>Start Wave</span>
      </div>
      <div className={styles.controlRow}>
        <span className={styles.keyPill}>U</span>
        <span className={styles.keyAction}>Upgrade</span>
        <span className={styles.keyPill}>Del</span>
        <span className={styles.keyAction}>Sell</span>
        <span className={styles.keyPill}>Esc</span>
        <span className={styles.keyAction}>Deselect</span>
        <span className={styles.keyPill}>M</span>
        <span className={styles.keyAction}>Mute</span>
      </div>
      <div className={styles.controlRow}>
        <span className={styles.keyAction}>Click: Select</span>
        <span className={styles.keyAction}>Drag: Rotate</span>
        <span className={styles.keyAction}>Scroll: Zoom</span>
      </div>
    </motion.div>
  );
}
