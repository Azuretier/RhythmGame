'use client';

import React from 'react';
import PuzzleCard from './PuzzleCard';
import type { PuzzleGameState, PuzzleDifficulty } from '@/types/puzzle';
import { PUZZLE_DIFFICULTIES } from '@/types/puzzle';
import styles from './PuzzleGame.module.css';

interface PuzzleBoardProps {
  gameState: PuzzleGameState;
  playerId: string;
  difficulty: PuzzleDifficulty;
  onFlipCard: (cardId: number) => void;
}

export default function PuzzleBoard({ gameState, playerId, difficulty, onFlipCard }: PuzzleBoardProps) {
  const config = PUZZLE_DIFFICULTIES[difficulty];
  const isMyTurn = gameState.currentTurnPlayerId === playerId;
  const isWaitingForFlipBack = gameState.flippedCardIds.length >= 2;

  return (
    <div
      className={styles.board}
      style={{
        gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
        gridTemplateRows: `repeat(${config.rows}, 1fr)`,
      }}
    >
      {gameState.cards.map(card => (
        <PuzzleCard
          key={card.id}
          id={card.id}
          symbolIndex={card.symbolIndex}
          faceUp={card.faceUp}
          matchedBy={card.matchedBy}
          disabled={!isMyTurn || isWaitingForFlipBack}
          isMyMatch={card.matchedBy === playerId}
          isOpponentMatch={card.matchedBy !== null && card.matchedBy !== playerId}
          onClick={() => onFlipCard(card.id)}
        />
      ))}
    </div>
  );
}
