'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import type { ServerMessage, OnlineUser } from '@/types/multiplayer';
import type { UserProfile } from '@/lib/profile/types';
import { getUnlockedCount } from '@/lib/advancements/storage';
import { ADVANCEMENTS, BATTLE_ARENA_REQUIRED_ADVANCEMENTS } from '@/lib/advancements/definitions';
import { useProfile } from '@/lib/profile/context';
import Advancements from '@/components/rhythmia/Advancements';
import ForYouTab from '@/components/rhythmia/ForYouTab';
import ProfileSetup from '@/components/profile/ProfileSetup';
import OnlineUsers from '@/components/profile/OnlineUsers';
import SkinCustomizer from '@/components/profile/SkinCustomizer';
import SkillTree from '@/components/profile/SkillTree';
import rhythmiaConfig from '../../../rhythmia.config.json';
import styles from '@/components/rhythmia/rhythmia.module.css';
import onlineStyles from '@/components/profile/OnlineUsers.module.css';
import VanillaGame from '@/components/rhythmia/tetris';
import MultiplayerGame from '@/components/rhythmia/MultiplayerGame';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import LoyaltyWidget from '@/components/loyalty/LoyaltyWidget';
import AnimatedLogo from '@/components/rhythmia/AnimatedLogo';
import { useRouter } from '@/i18n/navigation';
import { useSlideScroll } from '@/hooks/useSlideScroll';
import SkinAmbientEffects from '@/components/profile/SkinAmbientEffects';
import GameModeMap from '@/components/rhythmia/GameModeMap';

type GameMode = 'lobby' | 'vanilla' | 'multiplayer';

export default function RhythmiaLobby() {
    const [gameMode, setGameMode] = useState<GameMode>('lobby');
    const [isLoading, setIsLoading] = useState(true);
    const [onlineCount, setOnlineCount] = useState(0);
    const [showAdvancements, setShowAdvancements] = useState(false);
    const [showOnlineUsers, setShowOnlineUsers] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [showSkinCustomizer, setShowSkinCustomizer] = useState(false);
    const [showSkillTree, setShowSkillTree] = useState(false);
    const [showLogoAnimation, setShowLogoAnimation] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const profileSentRef = useRef(false);
    const profileRef = useRef<UserProfile | null>(null);

    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const { profile, showProfileSetup } = useProfile();

    // Keep profileRef in sync so connectMultiplayerWs can read latest profile without dependency
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const isArenaLocked = unlockedCount < BATTLE_ARENA_REQUIRED_ADVANCEMENTS;

    const TOTAL_SLIDES = 3;
    const { currentSlide, goToSlide, containerRef, slideStyle } = useSlideScroll({
        totalSlides: TOTAL_SLIDES,
        enabled: gameMode === 'lobby' && !isLoading && !showProfileSetup && !showAdvancements && !showSkinCustomizer && !showSkillTree && !showOnlineUsers && !showLogoAnimation,
    });

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

    // Send profile to WebSocket server when profile is available
    const sendProfileToWs = useCallback(() => {
        if (profile && wsRef.current?.readyState === WebSocket.OPEN && !profileSentRef.current) {
            wsRef.current.send(JSON.stringify({
                type: 'set_profile',
                name: profile.name,
                icon: profile.icon,
                isPrivate: profile.isPrivate,
            }));
            profileSentRef.current = true;
        }
    }, [profile]);

    // Connect to multiplayer WebSocket at page load for accurate online count
    const connectMultiplayerWs = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

        const wsUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
        const ws = new WebSocket(wsUrl);
        profileSentRef.current = false;

        ws.onopen = () => {
            // Send profile info once connected (use ref to avoid stale closure)
            const currentProfile = profileRef.current;
            if (currentProfile) {
                ws.send(JSON.stringify({
                    type: 'set_profile',
                    name: currentProfile.name,
                    icon: currentProfile.icon,
                    isPrivate: currentProfile.isPrivate,
                }));
                profileSentRef.current = true;
            }
        };

        ws.onmessage = (event) => {
            try {
                const message: ServerMessage = JSON.parse(event.data);
                if (message.type === 'online_count') {
                    setOnlineCount(message.count);
                } else if (message.type === 'online_users') {
                    setOnlineUsers(message.users);
                } else if (message.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
            } catch { }
        };

        ws.onclose = () => {
            wsRef.current = null;
            profileSentRef.current = false;
        };

        wsRef.current = ws;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        connectMultiplayerWs();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connectMultiplayerWs]);

    // Send profile when it becomes available after WS is already connected
    useEffect(() => {
        sendProfileToWs();
    }, [sendProfileToWs]);

    // Re-send profile to WS when privacy setting changes
    useEffect(() => {
        if (profile && wsRef.current?.readyState === WebSocket.OPEN && profileSentRef.current) {
            wsRef.current.send(JSON.stringify({
                type: 'set_profile',
                name: profile.name,
                icon: profile.icon,
                isPrivate: profile.isPrivate,
            }));
        }
    }, [profile?.isPrivate]); // eslint-disable-line react-hooks/exhaustive-deps

    const requestOnlineUsers = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'get_online_users' }));
        }
        setShowOnlineUsers(true);
    };

    const launchGame = (mode: GameMode) => {
        if (mode === 'multiplayer' && isArenaLocked) return;
        // Close lobby WebSocket when entering multiplayer to avoid double-counting
        if (mode === 'multiplayer' && wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        // Show cinematic logo animation before entering singleplayer
        if (mode === 'vanilla') {
            setShowLogoAnimation(true);
            return;
        }
        setGameMode(mode);
    };

    const handleLogoComplete = () => {
        setGameMode('vanilla');
        // Keep logo overlay visible while game mounts underneath,
        // then remove it — its exit animation reveals the game
        requestAnimationFrame(() => {
            setShowLogoAnimation(false);
        });
    };

    const closeGame = () => {
        setGameMode('lobby');
        // Re-establish lobby WebSocket for online count when returning from multiplayer
        connectMultiplayerWs();
    };

    const handleMapSelect = (action: string) => {
        switch (action) {
            case 'vanilla':
                launchGame('vanilla');
                break;
            case 'multiplayer':
                launchGame('multiplayer');
                break;
            case 'arena':
                router.push('/arena');
                break;
            case 'stories':
                router.push('/stories');
                break;
            case 'td':
                router.push('/td');
                break;
        }
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
                <VanillaGame onQuit={closeGame} />
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
                <MultiplayerGame onQuit={closeGame} />
            </motion.div>
        );
    }

    const slidesEnabled = gameMode === 'lobby' && !isLoading && !showProfileSetup && !showAdvancements && !showSkinCustomizer && !showSkillTree && !showOnlineUsers && !showLogoAnimation;

    return (
        <>
            {/* Cinematic logo animation overlay — always on top, independent of game mode */}
            <AnimatePresence>
                {showLogoAnimation && (
                    <AnimatedLogo onComplete={handleLogoComplete} />
                )}
            </AnimatePresence>

            {gameMode === 'lobby' && (
                <div className={styles.page}>
                    {/* Skin-specific ambient effects (sakura petals, sunset embers) */}
                    <SkinAmbientEffects intensity="idle" />

                    {/* Profile setup overlay */}
                    <AnimatePresence>
                        {showProfileSetup && <ProfileSetup />}
                    </AnimatePresence>

                    {/* Loading overlay */}
                    <AnimatePresence>
                        {isLoading && !showProfileSetup && (
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

                    {/* Online users panel */}
                    <AnimatePresence>
                        {showOnlineUsers && (
                            <OnlineUsers
                                users={onlineUsers}
                                onClose={() => setShowOnlineUsers(false)}
                            />
                        )}
                    </AnimatePresence>

                    {/* Advancements panel */}
                    <AnimatePresence>
                        {showAdvancements && (
                            <motion.div
                                className={styles.advOverlay}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                <Advancements onClose={() => setShowAdvancements(false)} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Skin customizer panel */}
                    <AnimatePresence>
                        {showSkinCustomizer && (
                            <SkinCustomizer onClose={() => setShowSkinCustomizer(false)} />
                        )}
                    </AnimatePresence>

                    {/* Skill tree panel */}
                    <AnimatePresence>
                        {showSkillTree && (
                            <motion.div
                                className={styles.advOverlay}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                <SkillTree onClose={() => setShowSkillTree(false)} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Slide container */}
                    <div
                        className={styles.slideContainer}
                        ref={containerRef}
                        style={slideStyle}
                    >
                        {/* Slide 0: Landing — Header + Hero + Server Grid */}
                        <section className={`${styles.slideSection} ${styles.slideSectionLanding}`}>
                            <motion.header
                                className={styles.header}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? -20 : 0 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                            >
                                <div className={styles.logo}>azuretier<span className={styles.logoAccent}>.net</span></div>
                                <div className={styles.statusBar}>
                                    <button
                                        className={styles.advButton}
                                        onClick={() => setShowAdvancements(true)}
                                    >
                                        {t('advancements.button', { count: unlockedCount, total: ADVANCEMENTS.length })}
                                    </button>
                                    <button
                                        className={styles.advButton}
                                        onClick={() => setShowSkillTree(true)}
                                    >
                                        {t('skillTree.title')}
                                    </button>
                                    <button
                                        className={onlineStyles.onlineButton}
                                        onClick={requestOnlineUsers}
                                    >
                                        <span className={styles.statusDot}></span>
                                        <span>{t('lobby.onlineCount', { count: onlineCount })}</span>
                                    </button>
                                    <div className={styles.statusItem}>
                                        <span>v{rhythmiaConfig.version}</span>
                                    </div>
                                    <button
                                        className={styles.advButton}
                                        onClick={() => router.push('/wiki')}
                                    >
                                        Wiki
                                    </button>
                                    <button
                                        className={styles.advButton}
                                        onClick={() => router.push('/updates')}
                                    >
                                        {t('nav.updates')}
                                    </button>
                                    <button
                                        className={styles.advButton}
                                        onClick={() => setShowSkinCustomizer(true)}
                                    >
                                        {t('skin.profileButton')}
                                    </button>
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
                                    <p className={styles.heroTagline}>{t('lobby.tagline')}</p>
                                </motion.div>

                                <GameModeMap
                                    isArenaLocked={isArenaLocked}
                                    unlockedCount={unlockedCount}
                                    requiredAdvancements={BATTLE_ARENA_REQUIRED_ADVANCEMENTS}
                                    onlineCount={onlineCount}
                                    onSelectMode={handleMapSelect}
                                    locale={locale}
                                />
                            </main>

                            {/* Scroll hint — only visible on first slide */}
                            <AnimatePresence>
                                {currentSlide === 0 && slidesEnabled && (
                                    <motion.div
                                        className={styles.scrollHint}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <svg className={styles.scrollHintIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M7 13l5 5 5-5" />
                                            <path d="M7 6l5 5 5-5" />
                                        </svg>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </section>

                        {/* Slide 1: For You */}
                        <section
                            className={`${styles.slideSection} ${styles.slideSectionPlay}`}
                            data-slide-scrollable
                        >
                            <motion.div
                                className={styles.forYouSection}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 30 : 0 }}
                                transition={{ duration: 0.6, delay: 0.7 }}
                            >
                                <ForYouTab
                                    locale={locale}
                                    unlockedAdvancements={unlockedCount}
                                    totalAdvancements={ADVANCEMENTS.length}
                                />
                            </motion.div>
                        </section>

                        {/* Slide 2: Loyalty + Footer */}
                        <section className={`${styles.slideSection} ${styles.slideSectionBottom}`}>
                            <LoyaltyWidget />
                            <motion.footer
                                className={styles.footer}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: isLoading ? 0 : 0.4 }}
                                transition={{ duration: 0.6, delay: 0.6 }}
                            >
                                {t('footer.copyright')}
                            </motion.footer>
                        </section>
                    </div>

                    {/* Dot navigation */}
                    <nav className={`${styles.slideNav} ${!slidesEnabled ? styles.slideNavHidden : ''}`}>
                        {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
                            <button
                                key={i}
                                className={`${styles.slideDot} ${currentSlide === i ? styles.slideDotActive : ''}`}
                                onClick={() => goToSlide(i)}
                                aria-label={`Go to slide ${i + 1}`}
                            />
                        ))}
                    </nav>
                </div>
            )}
        </>
    );
}
