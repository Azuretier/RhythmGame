'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PUZZLE_SYMBOLS } from '@/types/puzzle';
import styles from './PuzzleGame.module.css';

interface PuzzleCardProps {
  id: number;
  symbolIndex: number;
  faceUp: boolean;
  matchedBy: string | null;
  disabled: boolean;
  isMyMatch: boolean;
  isOpponentMatch: boolean;
  onClick: () => void;
}

export default function PuzzleCard({
  symbolIndex,
  faceUp,
  matchedBy,
  disabled,
  isMyMatch,
  isOpponentMatch,
  onClick,
}: PuzzleCardProps) {
  const isMatched = matchedBy !== null;
  const symbol = symbolIndex >= 0 ? PUZZLE_SYMBOLS[symbolIndex] : '?';

  return (
    <motion.button
      className={`${styles.card} ${faceUp ? styles.cardFlipped : ''} ${isMatched ? styles.cardMatched : ''} ${isMyMatch ? styles.cardMyMatch : ''} ${isOpponentMatch ? styles.cardOpponentMatch : ''}`}
      onClick={onClick}
      disabled={disabled || isMatched || faceUp}
      whileHover={!disabled && !isMatched && !faceUp ? { scale: 1.05 } : {}}
      whileTap={!disabled && !isMatched && !faceUp ? { scale: 0.95 } : {}}
    >
      <div className={styles.cardInner}>
        <div className={styles.cardFront}>
          <span className={styles.cardSymbol}>?</span>
        </div>
        <div className={styles.cardBack}>
          <span className={styles.cardSymbol}>{symbol}</span>
        </div>
      </div>
    </motion.button>
  );
}
