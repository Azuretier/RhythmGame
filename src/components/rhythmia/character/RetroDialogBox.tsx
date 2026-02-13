'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DialogLine } from '@/types/dialog';
import styles from './RetroDialogBox.module.css';

interface RetroDialogBoxProps {
  /** Current dialog line to display */
  line: DialogLine | null;
  /** Called when the current line finishes typing and user advances */
  onAdvance?: () => void;
  /** Called when typing starts for a new line */
  onTypingStart?: () => void;
  /** Called when typing completes for the current line */
  onTypingComplete?: () => void;
  /** Whether the dialog box is visible */
  visible?: boolean;
}

export default function RetroDialogBox({
  line,
  onAdvance,
  onTypingStart,
  onTypingComplete,
  visible = true,
}: RetroDialogBoxProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const charIndexRef = useRef(0);
  const fullTextRef = useRef('');

  // Clear any ongoing typing
  const clearTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  // Start typewriter effect for a new line
  useEffect(() => {
    if (!line) {
      setDisplayedText('');
      setIsTyping(false);
      setIsComplete(false);
      clearTyping();
      return;
    }

    const text = line.text;
    const speed = line.typingSpeed ?? 30;

    fullTextRef.current = text;
    charIndexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);
    setIsComplete(false);
    onTypingStart?.();
    clearTyping();

    typingTimerRef.current = setInterval(() => {
      charIndexRef.current++;

      if (charIndexRef.current >= text.length) {
        setDisplayedText(text);
        setIsTyping(false);
        setIsComplete(true);
        clearTyping();
        onTypingComplete?.();
      } else {
        setDisplayedText(text.slice(0, charIndexRef.current));
      }
    }, speed);

    return clearTyping;
  }, [line, clearTyping, onTypingStart, onTypingComplete]);

  // Handle click/tap to advance or skip typing
  const handleClick = useCallback(() => {
    if (isTyping) {
      // Skip to end of current line
      clearTyping();
      setDisplayedText(fullTextRef.current);
      setIsTyping(false);
      setIsComplete(true);
      onTypingComplete?.();
    } else if (isComplete) {
      onAdvance?.();
    }
  }, [isTyping, isComplete, clearTyping, onAdvance, onTypingComplete]);

  // Keyboard: Space or Enter to advance
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClick]);

  return (
    <AnimatePresence>
      {visible && line && (
        <motion.div
          className={styles.dialogContainer}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={handleClick}
        >
          {/* Speaker name plate */}
          {line.speaker && (
            <div className={styles.speakerTag}>
              <span className={styles.speakerName}>{line.speaker}</span>
            </div>
          )}

          {/* Dialog box */}
          <div className={styles.dialogBox}>
            {/* Corner decorations */}
            <div className={`${styles.corner} ${styles.cornerTL}`} />
            <div className={`${styles.corner} ${styles.cornerTR}`} />
            <div className={`${styles.corner} ${styles.cornerBL}`} />
            <div className={`${styles.corner} ${styles.cornerBR}`} />

            {/* Text content */}
            <div className={styles.textContent}>
              <span className={styles.dialogText}>{displayedText}</span>
              {isTyping && <span className={styles.cursor}>|</span>}
            </div>

            {/* Advance indicator */}
            {isComplete && (
              <motion.div
                className={styles.advanceIndicator}
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
              >
                ▼
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
