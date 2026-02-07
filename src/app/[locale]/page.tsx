'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { ServerMessage } from '@/types/multiplayer';
import rhythmiaConfig from '../../../rhythmia.config.json';
import styles from '../../components/rhythmia/rhythmia.module.css';
import VanillaGame from '../../components/rhythmia/tetris';
import MultiplayerGame from '../../components/rhythmia/MultiplayerGame';
import LocaleSwitcher from '../../components/LocaleSwitcher';

type GameMode = 'lobby' | 'vanilla' | 'multiplayer';

export default function RhythmiaPage() {
    const [gameMode, setGameMode] = useState<GameMode>('lobby');
    const [isLoading, setIsLoading] = useState(true);
    const [onlineCount, setOnlineCount] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);

    const t = useTranslations();

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

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
                            <span>{t('lobby.online')}</span>
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

                        {/* Multiplayer Server */}
                        <motion.div
                            className={`${styles.serverCard} ${styles.multiplayer}`}
                            onClick={() => launchGame('multiplayer')}
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 40 : 0 }}
                            transition={{ duration: 0.6, delay: 0.45 }}
                            whileHover={{ y: -8, transition: { duration: 0.25 } }}
                        >
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
                            <div className={styles.onlineCount}>
                                <span className={styles.onlineDot}></span>
                                <span>{t('lobby.onlineCount', { count: onlineCount })}</span>
                            </div>
                            <button className={styles.playButton}>{t('lobby.battle')}</button>
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
