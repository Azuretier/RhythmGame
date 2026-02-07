'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/game';
import styles from '../components/rhythmia/rhythmia.module.css';
import VanillaGame from '../components/rhythmia/tetris';
import MultiplayerGame from '../components/rhythmia/MultiplayerGame';

type GameMode = 'lobby' | 'vanilla' | 'multiplayer';

export default function RhythmiaPage() {
  const [gameMode, setGameMode] = useState<GameMode>('lobby');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const socket = io({ path: '/socket.io' }) as import('socket.io-client').Socket<ServerToClientEvents, ClientToServerEvents>;

    socket.on('online:count', (count) => {
      setOnlineCount(count);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const launchGame = (mode: GameMode) => {
    setGameMode(mode);
  };

  const closeGame = () => {
    setGameMode('lobby');
  };

  if (gameMode === 'vanilla') {
    return (
      <motion.div
        className={styles.gameContainer + ' ' + styles.active}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.gameHeader}>
          <span className={styles.gameTitle}>RHYTHMIA — VANILLA</span>
          <button className={styles.backButton} onClick={closeGame}>
            ← Back
          </button>
        </div>
        <VanillaGame />
      </motion.div>
    );
  }

  if (gameMode === 'multiplayer') {
    return (
      <motion.div
        className={styles.gameContainer + ' ' + styles.active}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.gameHeader}>
          <span className={styles.gameTitle}>BATTLE ARENA — 1v1</span>
          <button className={styles.backButton} onClick={closeGame}>
            ← Back
          </button>
        </div>
        <MultiplayerGame />
      </motion.div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className={styles.loadingOverlay}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.loader}></div>
            <div className={styles.loadingText}>LOADING</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.container}>
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? -20 : 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className={styles.logo}>RHYTHMIA</div>
          <div className={styles.statusBar}>
            <div className={styles.statusItem}>
              <span className={styles.statusDot}></span>
              <span>Online</span>
            </div>
            <div className={styles.statusItem}>
              <span>v2.5.0</span>
            </div>
          </div>
        </motion.header>

        <main className={styles.main}>
          <motion.div
            className={styles.heroText}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 30 : 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <h1>SELECT SERVER</h1>
            <p>Choose your mode</p>
          </motion.div>

          <div className={styles.serverGrid}>
            {/* Vanilla Server */}
            <motion.div
              className={`${styles.serverCard} ${styles.vanilla}`}
              onClick={() => launchGame('vanilla')}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 40 : 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
            >
              <span className={styles.cardBadge}>OFFICIAL</span>
              <h2 className={styles.cardTitle}>VANILLA</h2>
              <p className={styles.cardSubtitle}>Original Experience</p>
              <p className={styles.cardDescription}>
                Classic RHYTHMIA gameplay. Stack blocks to the rhythm and conquer worlds.
              </p>
              <div className={styles.cardFeatures}>
                <span className={styles.featureTag}>5 Worlds</span>
                <span className={styles.featureTag}>Rhythm</span>
                <span className={styles.featureTag}>Solo</span>
              </div>
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>100</div>
                  <div className={styles.statLabel}>BPM Start</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>160</div>
                  <div className={styles.statLabel}>BPM Max</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>∞</div>
                  <div className={styles.statLabel}>Levels</div>
                </div>
              </div>
              <button className={styles.playButton}>PLAY</button>
            </motion.div>

            {/* Multiplayer Server */}
            <motion.div
              className={`${styles.serverCard} ${styles.multiplayer}`}
              onClick={() => launchGame('multiplayer')}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 40 : 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
            >
              <span className={`${styles.cardBadge} ${styles.new}`}>1v1</span>
              <h2 className={styles.cardTitle}>BATTLE ARENA</h2>
              <p className={styles.cardSubtitle}>Multiplayer 1v1</p>
              <p className={styles.cardDescription}>
                Real-time 1v1 battles. Send garbage lines to your opponent. Last one standing wins.
              </p>
              <div className={styles.cardFeatures}>
                <span className={styles.featureTag}>1v1</span>
                <span className={styles.featureTag}>WebSocket</span>
                <span className={styles.featureTag}>Ranked</span>
              </div>
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>VS</div>
                  <div className={styles.statLabel}>Mode</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>1v1</div>
                  <div className={styles.statLabel}>Battle</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>LIVE</div>
                  <div className={styles.statLabel}>Status</div>
                </div>
              </div>
              <div className={styles.onlineCount}>
                <span className={styles.onlineDot}></span>
                <span>{onlineCount} online</span>
              </div>
              <button className={styles.playButton}>BATTLE</button>
            </motion.div>
          </div>
        </main>

        <motion.footer
          className={styles.footer}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 0.4 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          RHYTHMIA &copy; 2025
        </motion.footer>
      </div>
    </div>
  );
}
