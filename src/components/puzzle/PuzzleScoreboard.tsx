'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { PuzzlePlayerState } from '@/types/puzzle';
import styles from './PuzzleGame.module.css';

interface PuzzleScoreboardProps {
  players: PuzzlePlayerState[];
  currentTurnPlayerId: string;
  playerId: string;
}

export default function PuzzleScoreboard({ players, currentTurnPlayerId, playerId }: PuzzleScoreboardProps) {
  const t = useTranslations('puzzle');

  return (
    <div className={styles.scoreboard}>
      {players.map(player => {
        const isMe = player.id === playerId;
        const isTurn = player.id === currentTurnPlayerId;

        return (
          <div
            key={player.id}
            className={`${styles.playerScore} ${isTurn ? styles.playerActive : ''} ${isMe ? styles.playerMe : ''}`}
          >
            <div className={styles.playerName}>
              {player.name}
              {isMe && <span className={styles.youTag}>{t('you')}</span>}
            </div>
            <div className={styles.playerStats}>
              <span className={styles.statScore}>{player.score}</span>
              <span className={styles.statPairs}>{player.pairs} {t('pairs')}</span>
              {player.consecutiveMatches > 1 && (
                <span className={styles.statCombo}>{player.consecutiveMatches}x {t('combo')}</span>
              )}
            </div>
            {isTurn && <div className={styles.turnIndicator}>{t('currentTurn')}</div>}
          </div>
        );
      })}
    </div>
  );
}
