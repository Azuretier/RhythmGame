'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
    Music, Swords, Users, BookOpen, Pickaxe, Trophy,
    Play, ExternalLink,
} from 'lucide-react';
import { ADVANCEMENTS, BATTLE_ARENA_REQUIRED_ADVANCEMENTS } from '@/lib/advancements/definitions';
import { useHomepageLogic } from '@/hooks/useHomepageLogic';
import Advancements from '@/components/rhythmia/Advancements';
import ProfileSetup from '@/components/profile/ProfileSetup';
import OnlineUsers from '@/components/profile/OnlineUsers';
import SkinCustomizer from '@/components/profile/SkinCustomizer';
import SkillTree from '@/components/profile/SkillTree';
import VanillaGame from '@/components/rhythmia/tetris';
import MultiplayerGame from '@/components/rhythmia/MultiplayerGame';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import AnimatedLogo from '@/components/rhythmia/AnimatedLogo';
import { useRouter } from '@/i18n/navigation';
import PixelDitherBackground from './PixelDitherBackground';
import styles from './PixelArtHomepage.module.css';

const FEATURES = [
    { id: 'vanilla', icon: Music, action: 'vanilla' },
    { id: 'multiplayer', icon: Swords, action: 'multiplayer' },
    { id: 'arena', icon: Users, action: 'arena' },
    { id: 'stories', icon: BookOpen, action: 'stories' },
    { id: 'minecraft', icon: Pickaxe, action: 'minecraft-board' },
    { id: 'advancements', icon: Trophy, action: 'advancements' },
] as const;

const LOADING_BLOCKS = 8;

export default function PixelArtHomepage() {
    const {
        gameMode,
        isLoading,
        onlineCount,
        onlineUsers,
        showAdvancements, setShowAdvancements,
        showOnlineUsers, setShowOnlineUsers,
        showSkinCustomizer, setShowSkinCustomizer,
        showSkillTree, setShowSkillTree,
        showLogoAnimation,
        unlockedCount,
        isArenaLocked,
        handleFeatureClick,
        requestOnlineUsers,
        handleLogoComplete,
        showProfileSetup,
        launchGame,
        closeGame,
    } = useHomepageLogic();

    const t = useTranslations();
    const router = useRouter();

    // ---- Game full-screen views ----
    if (gameMode === 'vanilla') {
        return (
            <motion.div
                className={styles.gameContainer}
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
                className={styles.gameContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
            >
                <MultiplayerGame onQuit={closeGame} />
            </motion.div>
        );
    }

    // ---- Landing page ----
    return (
        <>
            {/* Cinematic logo animation overlay */}
            <AnimatePresence>
                {showLogoAnimation && (
                    <AnimatedLogo onComplete={handleLogoComplete} />
                )}
            </AnimatePresence>

            <div className={styles.page}>
                <PixelDitherBackground />

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
                            <div className={styles.loadingBar}>
                                {Array.from({ length: LOADING_BLOCKS }).map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className={`${styles.loadingBlock} ${styles.loadingBlockFilled}`}
                                        initial={{ opacity: 0.2 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.08, duration: 0.15 }}
                                    />
                                ))}
                            </div>
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

                {/* Advancements overlay */}
                <AnimatePresence>
                    {showAdvancements && (
                        <motion.div
                            className={styles.overlay}
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
                            className={styles.overlay}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            <SkillTree onClose={() => setShowSkillTree(false)} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ---- Navbar ---- */}
                <motion.nav
                    className={styles.navbar}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? -20 : 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <div className={styles.navBorderInner} />
                    <div className={styles.navInner}>
                        <div className={styles.navLogo}>
                            azuretier<span className={styles.navLogoAccent}>.net</span>
                        </div>

                        <div className={styles.navLinks}>
                            <button className={styles.navLink} onClick={() => router.push('/wiki')}>
                                Wiki
                            </button>
                            <button className={styles.navLink} onClick={() => router.push('/updates')}>
                                {t('nav.updates')}
                            </button>
                            <button className={styles.navLink} onClick={() => setShowAdvancements(true)}>
                                {t('advancements.button', { count: unlockedCount, total: ADVANCEMENTS.length })}
                            </button>
                            <button className={styles.navLink} onClick={() => setShowSkinCustomizer(true)}>
                                {t('skin.profileButton')}
                            </button>

                            <div className={styles.navDivider} />

                            <button className={styles.navOnline} onClick={requestOnlineUsers}>
                                <span className={styles.onlineDot} />
                                {t('lobby.onlineCount', { count: onlineCount })}
                            </button>

                            <div className={styles.navDivider} />

                            <LocaleSwitcher />
                        </div>
                    </div>
                </motion.nav>

                {/* ---- Content (above dither bg) ---- */}
                <div className={styles.content}>
                    {/* ---- Hero ---- */}
                    <motion.section
                        className={styles.hero}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 30 : 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                    >
                        <div className={styles.heroPanel}>
                            <h1 className={styles.heroTitle}>RHYTHMIA</h1>
                            <p className={styles.heroSubtitle}>
                                {t('home.hero.description')}
                            </p>
                            <div className={styles.heroCta}>
                                <button
                                    className={styles.pixelBtnPrimary}
                                    onClick={() => launchGame('vanilla')}
                                >
                                    <Play size={16} />
                                    {t('home.hero.play')}
                                </button>
                                <button
                                    className={styles.pixelBtn}
                                    onClick={() => router.push('/wiki')}
                                >
                                    <ExternalLink size={14} />
                                    {t('home.hero.wiki')}
                                </button>
                            </div>
                        </div>
                    </motion.section>

                    {/* ---- Features ---- */}
                    <motion.section
                        className={styles.features}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 40 : 0 }}
                        transition={{ duration: 0.7, delay: 0.35 }}
                    >
                        <div className={styles.featuresHeader}>
                            <h2 className={styles.featuresTitle}>{t('home.features.title')}</h2>
                            <p className={styles.featuresSubtitle}>{t('home.features.subtitle')}</p>
                        </div>

                        <div className={styles.featureGrid}>
                            {FEATURES.map((feature) => {
                                const Icon = feature.icon;
                                const isLocked = feature.id === 'multiplayer' && isArenaLocked;

                                return (
                                    <div
                                        key={feature.id}
                                        className={`${styles.featureCard} ${isLocked ? styles.featureCardLocked : ''}`}
                                        onClick={() => !isLocked && handleFeatureClick(feature.action)}
                                    >
                                        <div className={styles.featureIcon}>
                                            <Icon size={24} strokeWidth={2} color="#4a9d9e" />
                                        </div>
                                        {feature.id === 'arena' && (
                                            <span className={styles.featureBadge}>9P</span>
                                        )}
                                        <div className={styles.featureTitle}>
                                            {t(`home.features.${feature.id}.title`)}
                                        </div>
                                        <div className={styles.featureDesc}>
                                            {t(`home.features.${feature.id}.description`)}
                                        </div>
                                        {isLocked && (
                                            <div className={styles.featureDesc} style={{ fontStyle: 'italic', fontSize: '10px' }}>
                                                {t('advancements.lockMessage', { count: BATTLE_ARENA_REQUIRED_ADVANCEMENTS })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.section>

                    {/* ---- Footer ---- */}
                    <motion.footer
                        className={styles.footer}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isLoading ? 0 : 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        {t('footer.copyright')}
                    </motion.footer>
                </div>
            </div>
        </>
    );
}
