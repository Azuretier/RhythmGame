'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { usePuzzleSocket } from '@/hooks/usePuzzleSocket';
import PuzzleMenu from './PuzzleMenu';
import PuzzleBoard from './PuzzleBoard';
import PuzzleScoreboard from './PuzzleScoreboard';
import styles from './PuzzleGame.module.css';

export default function PuzzleGame() {
  const t = useTranslations('puzzle');
  const router = useRouter();
  const {
    connectionStatus,
    connectWebSocket,
    playerId,
    phase,
    roomState,
    gameState,
    error,
    setError,
    countdownNumber,
    publicRooms,
    gameOverResult,
    currentTurnPlayerId,
    createRoom,
    joinRoom,
    getRooms,
    leaveRoom,
    setReady,
    setDifficulty,
    startGame,
    flipCard,
  } = usePuzzleSocket();

  const isMyTurn = currentTurnPlayerId === playerId;

  return (
    <div className={styles.page}>
      <AnimatePresence mode="wait">
        {/* Menu / Lobby */}
        {(phase === 'menu' || phase === 'lobby') && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.centerBox}
          >
            <PuzzleMenu
              phase={phase}
              roomState={roomState}
              publicRooms={publicRooms}
              playerId={playerId}
              connectionStatus={connectionStatus}
              error={error}
              onConnect={connectWebSocket}
              onCreateRoom={createRoom}
              onJoinRoom={joinRoom}
              onGetRooms={getRooms}
              onSetReady={setReady}
              onSetDifficulty={setDifficulty}
              onStartGame={startGame}
              onLeave={leaveRoom}
            />
          </motion.div>
        )}

        {/* Countdown */}
        {phase === 'countdown' && countdownNumber !== null && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={styles.countdownOverlay}
          >
            <motion.div
              key={countdownNumber}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={styles.countdownNumber}
            >
              {countdownNumber}
            </motion.div>
          </motion.div>
        )}

        {/* Playing */}
        {phase === 'playing' && gameState && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.gameContainer}
          >
            <div className={styles.gameHeader}>
              <h2 className={styles.gameTitle}>{t('title')}</h2>
              <div className={styles.turnBanner}>
                {isMyTurn ? (
                  <span className={styles.myTurn}>{t('yourTurn')}</span>
                ) : (
                  <span className={styles.opponentTurn}>{t('opponentTurn')}</span>
                )}
              </div>
            </div>

            <PuzzleScoreboard
              players={gameState.players}
              currentTurnPlayerId={currentTurnPlayerId}
              playerId={playerId}
            />

            <PuzzleBoard
              gameState={gameState}
              playerId={playerId}
              difficulty={roomState?.difficulty || 'medium'}
              onFlipCard={flipCard}
            />

            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(gameState.matchedPairs / gameState.totalPairs) * 100}%` }}
              />
              <span className={styles.progressText}>
                {gameState.matchedPairs}/{gameState.totalPairs} {t('pairsFound')}
              </span>
            </div>
          </motion.div>
        )}

        {/* Game Over */}
        {phase === 'ended' && gameOverResult && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={styles.gameOverContainer}
          >
            <div className={styles.gameOverCard}>
              <h2 className={styles.gameOverTitle}>
                {gameOverResult.isDraw
                  ? t('draw')
                  : gameOverResult.winnerId === playerId
                    ? t('youWin')
                    : t('youLose')}
              </h2>

              <div className={styles.gameOverScores}>
                {gameOverResult.players.map(p => (
                  <div key={p.id} className={`${styles.gameOverPlayer} ${p.id === gameOverResult.winnerId ? styles.winner : ''}`}>
                    <span className={styles.gameOverName}>{p.name}</span>
                    <span className={styles.gameOverScore}>{p.score} pts</span>
                    <span className={styles.gameOverPairs}>{p.pairs} {t('pairs')}</span>
                  </div>
                ))}
              </div>

              <div className={styles.gameOverActions}>
                <motion.button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={leaveRoom}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('playAgain')}
                </motion.button>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => {
                    leaveRoom();
                    router.push('/');
                  }}
                >
                  {t('backToLobby')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
