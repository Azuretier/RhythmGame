'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { ServerMessage } from '@/types/multiplayer';
import { getUnlockedCount } from '@/lib/advancements/storage';
import { ADVANCEMENTS, BATTLE_ARENA_REQUIRED_ADVANCEMENTS } from '@/lib/advancements/definitions';
import rhythmiaConfig from '../../../rhythmia.config.json';
import styles from '../../components/rhythmia/rhythmia.module.css';
import VanillaGame from '../../components/rhythmia/tetris';
import MultiplayerGame from '../../components/rhythmia/MultiplayerGame';
import Advancements from '../../components/rhythmia/Advancements';
import LocaleSwitcher from '../../components/LocaleSwitcher';

type GameMode = 'lobby' | 'vanilla' | 'multiplayer';

export default function RhythmiaPage() {
    const [gameMode, setGameMode] = useState<GameMode>('lobby');
    const [isLoading, setIsLoading] = useState(true);
    const [onlineCount, setOnlineCount] = useState(0);
    const [showAdvancements, setShowAdvancements] = useState(false);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);

    const t = useTranslations();

    const isArenaLocked = unlockedCount < BATTLE_ARENA_REQUIRED_ADVANCEMENTS;

    useEffect(() => {
        setUnlockedCount(getUnlockedCount());
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    // Refresh unlocked count when returning to lobby
    useEffect(() => {
        if (gameMode === 'lobby' && !showAdvancements) {
            setUnlockedCount(getUnlockedCount());
        }
    }, [gameMode, showAdvancements]);

    // Connect to multiplayer WebSocket at page load for accurate online count
    const connectMultiplayerWs = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

        const wsUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const message: ServerMessage = JSON.parse(event.data);
                if (message.type === 'online_count') {
                    setOnlineCount(message.count);
                } else if (message.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
            } catch {}
        };

        ws.onclose = () => {
            wsRef.current = null;
        };

        wsRef.current = ws;
    }, []);

    useEffect(() => {
        connectMultiplayerWs();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connectMultiplayerWs]);

    const launchGame = (mode: GameMode) => {
        if (mode === 'multiplayer' && isArenaLocked) return;
        // Close lobby WebSocket when entering multiplayer to avoid double-counting
        if (mode === 'multiplayer' && wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setGameMode(mode);
    };

    const closeGame = () => {
        setGameMode('lobby');
        // Re-establish lobby WebSocket for online count when returning from multiplayer
        connectMultiplayerWs();
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
                    <span className={styles.gameTitle}>{t('vanilla.gameTitle')}</span>
                    <button className={styles.backButton} onClick={closeGame}>
                        {t('lobby.back')}
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
                    <span className={styles.gameTitle}>{t('multiplayer.gameTitle')}</span>
                    <button className={styles.backButton} onClick={closeGame}>
                        {t('lobby.back')}
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
                        <div className={styles.loadingText}>{t('lobby.loading')}</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Advancements panel */}
            <AnimatePresence>
                {showAdvancements && (
                    <Advancements onClose={() => setShowAdvancements(false)} />
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
                        <button
                            className={styles.advButton}
                            onClick={() => setShowAdvancements(true)}
                        >
                            {t('advancements.button', { count: unlockedCount, total: ADVANCEMENTS.length })}
                        </button>
                        <div className={styles.statusItem}>
                            <span className={styles.statusDot}></span>
                            <span>{t('lobby.onlineCount', { count: onlineCount })}</span>
                        </div>
                        <div className={styles.statusItem}>
                            <span>v{rhythmiaConfig.version}</span>
                        </div>
                        <LocaleSwitcher />
                    </div>
                </motion.header>

                <main className={styles.main}>
                    <motion.div
                        className={styles.heroText}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 30 : 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                    >
                        <h1>{t('lobby.selectServer')}</h1>
                        <p>{t('lobby.chooseMode')}</p>
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
                            <span className={styles.cardBadge}>{t('vanilla.badge')}</span>
                            <h2 className={styles.cardTitle}>{t('vanilla.title')}</h2>
                            <p className={styles.cardSubtitle}>{t('vanilla.subtitle')}</p>
                            <p className={styles.cardDescription}>
                                {t('vanilla.description')}
                            </p>
                            <div className={styles.cardFeatures}>
                                <span className={styles.featureTag}>{t('vanilla.features.worlds')}</span>
                                <span className={styles.featureTag}>{t('vanilla.features.rhythm')}</span>
                                <span className={styles.featureTag}>{t('vanilla.features.solo')}</span>
                            </div>
                            <div className={styles.cardStats}>
                                <div className={styles.stat}>
                                    <div className={styles.statValue}>100</div>
                                    <div className={styles.statLabel}>{t('vanilla.stats.bpmStart')}</div>
                                </div>
                                <div className={styles.stat}>
                                    <div className={styles.statValue}>160</div>
                                    <div className={styles.statLabel}>{t('vanilla.stats.bpmMax')}</div>
                                </div>
                                <div className={styles.stat}>
                                    <div className={styles.statValue}>∞</div>
                                    <div className={styles.statLabel}>{t('vanilla.stats.levels')}</div>
                                </div>
                            </div>
                            <button className={styles.playButton}>{t('lobby.play')}</button>
                        </motion.div>

                        {/* Multiplayer Server (locked until 3 advancements) */}
                        <motion.div
                            className={`${styles.serverCard} ${styles.multiplayer} ${isArenaLocked ? styles.lockedCard : ''}`}
                            onClick={() => launchGame('multiplayer')}
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 40 : 0 }}
                            transition={{ duration: 0.6, delay: 0.45 }}
                            whileHover={isArenaLocked ? {} : { y: -8, transition: { duration: 0.25 } }}
                        >
                            {isArenaLocked && (
                                <div className={styles.lockOverlay}>
                                    <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <div className={styles.lockText}>
                                        {t('advancements.lockMessage', {
                                            current: unlockedCount,
                                            required: BATTLE_ARENA_REQUIRED_ADVANCEMENTS,
                                        })}
                                    </div>
                                </div>
                            )}
                            <span className={`${styles.cardBadge} ${styles.new}`}>{t('multiplayer.badge')}</span>
                            <h2 className={styles.cardTitle}>{t('multiplayer.title')}</h2>
                            <p className={styles.cardSubtitle}>{t('multiplayer.subtitle')}</p>
                            <p className={styles.cardDescription}>
                                {t('multiplayer.description')}
                            </p>
                            <div className={styles.cardFeatures}>
                                <span className={styles.featureTag}>{t('multiplayer.features.vs')}</span>
                                <span className={styles.featureTag}>{t('multiplayer.features.websocket')}</span>
                                <span className={styles.featureTag}>{t('multiplayer.features.ranked')}</span>
                            </div>
                            <div className={styles.cardStats}>
                                <div className={styles.stat}>
                                    <div className={styles.statValue}>VS</div>
                                    <div className={styles.statLabel}>{t('multiplayer.stats.mode')}</div>
                                </div>
                                <div className={styles.stat}>
                                    <div className={styles.statValue}>1v1</div>
                                    <div className={styles.statLabel}>{t('multiplayer.stats.battle')}</div>
                                </div>
                                <div className={styles.stat}>
                                    <div className={styles.statValue}>LIVE</div>
                                    <div className={styles.statLabel}>{t('multiplayer.stats.status')}</div>
                                </div>
                            </div>
                            <button className={`${styles.playButton} ${isArenaLocked ? styles.lockedButton : ''}`} disabled={isArenaLocked}>
                                {isArenaLocked ? t('advancements.locked') : t('lobby.battle')}
                            </button>
                        </motion.div>
                    </div>
                </main>

                <motion.footer
                    className={styles.footer}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isLoading ? 0 : 0.4 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                >
                    {t('footer.copyright')}
                </motion.footer>
            </div>
        </div>
    );
}
